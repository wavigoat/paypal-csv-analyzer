import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()  # Must run before importing db.py, which reads DATABASE_URL at import time.

import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from analytics import clean_and_validate, compute_analytics, apply_filters
from reports import build_csv_report, build_pdf_report
from sessions import create_session, get_session
from db import Base, engine, get_db
from history import save_analysis_summary, list_history, get_run, delete_run

try:
    Base.metadata.create_all(bind=engine)
    DB_AVAILABLE = True
except Exception as e:
    # Don't let a missing/unreachable Postgres take down the whole API —
    # Versions 1 & 2 (upload, filter, reports) work fine without it.
    print(f"[startup] Could not connect to the database, history will be disabled: {e}")
    DB_AVAILABLE = False

app = FastAPI()

# CORS_ORIGINS is a comma-separated list, e.g. "https://d123.cloudfront.net,http://localhost:5173"
# Falls back to local Vite dev ports when unset, so local dev needs no .env changes.
_default_origins = "http://localhost:5173,http://localhost:5174"
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class FilterRequest(BaseModel):
    session_id: str
    start_date: Optional[str] = None  # "YYYY-MM-DD"
    end_date: Optional[str] = None
    categories: Optional[list[str]] = None


def _session_or_404(session_id: str) -> dict:
    session = get_session(session_id)
    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Session not found or expired — please re-upload the CSV.",
        )
    return session


@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")

    try:
        raw_df = pd.read_csv(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read the CSV: {str(e)}")

    try:
        cleaned_df, validation = clean_and_validate(raw_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

    session_id = create_session(cleaned_df, file.filename)
    analytics = compute_analytics(cleaned_df)

    history_id = None
    history_error = None
    if DB_AVAILABLE:
        try:
            db = next(get_db())
            try:
                run = save_analysis_summary(db, session_id, file.filename, validation, analytics)
                history_id = run.id
            finally:
                db.close()
        except Exception as e:
            # A history-logging failure should never block the user from seeing
            # their results — surface it as a soft warning instead of a 500.
            history_error = str(e)

    return {
        "status": "success",
        "session_id": session_id,
        "filename": file.filename,
        "validation": validation,
        "history_id": history_id,
        "history_error": history_error,
        **analytics,
    }


@app.post("/filter")
async def filter_analysis(req: FilterRequest):
    session = _session_or_404(req.session_id)
    df = session["df"]

    filtered = apply_filters(df, req.start_date, req.end_date, req.categories)
    if filtered.empty:
        raise HTTPException(status_code=400, detail="No transactions match that filter.")

    analytics = compute_analytics(filtered)
    return {
        "status": "success",
        "session_id": req.session_id,
        "filename": session["filename"],
        "filters_applied": {
            "start_date": req.start_date,
            "end_date": req.end_date,
            "categories": req.categories,
        },
        **analytics,
    }


@app.get("/compare")
async def compare_months(session_id: str, month_a: str, month_b: str):
    """Side-by-side comparison of two 'YYYY-MM' months."""
    session = _session_or_404(session_id)
    df = session["df"]

    def month_slice(month: str) -> dict:
        sub = df[df["Month"] == month]
        if sub.empty:
            return None
        return compute_analytics(sub)["metrics"]

    metrics_a = month_slice(month_a)
    metrics_b = month_slice(month_b)
    if metrics_a is None or metrics_b is None:
        raise HTTPException(status_code=400, detail="One or both months have no transactions.")

    def pct_change(a: float, b: float) -> Optional[float]:
        if a == 0:
            return None
        return round((b - a) / abs(a) * 100, 1)

    diff = {
        key: {
            "a": metrics_a[key],
            "b": metrics_b[key],
            "change_pct": pct_change(metrics_a[key], metrics_b[key]) if isinstance(metrics_a[key], (int, float)) else None,
        }
        for key in metrics_a
    }

    return {"month_a": month_a, "month_b": month_b, "metrics_a": metrics_a, "metrics_b": metrics_b, "diff": diff}


@app.get("/report/csv")
async def report_csv(session_id: str, start_date: Optional[str] = None,
                      end_date: Optional[str] = None, categories: Optional[str] = Query(None)):
    session = _session_or_404(session_id)
    cat_list = categories.split(",") if categories else None
    filtered = apply_filters(session["df"], start_date, end_date, cat_list)
    buf = build_csv_report(filtered)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{session["filename"].rsplit(".", 1)[0]}_transactions.csv"'},
    )


@app.get("/report/pdf")
async def report_pdf(session_id: str, start_date: Optional[str] = None,
                      end_date: Optional[str] = None, categories: Optional[str] = Query(None)):
    session = _session_or_404(session_id)
    cat_list = categories.split(",") if categories else None
    filtered = apply_filters(session["df"], start_date, end_date, cat_list)
    if filtered.empty:
        raise HTTPException(status_code=400, detail="No transactions match that filter.")

    analytics = compute_analytics(filtered)
    date_range = {
        "min": filtered["ParsedDate"].min().strftime("%Y-%m-%d"),
        "max": filtered["ParsedDate"].max().strftime("%Y-%m-%d"),
    }
    buf = build_pdf_report(analytics, session["filename"], date_range)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{session["filename"].rsplit(".", 1)[0]}_report.pdf"'},
    )


def _db_or_503() -> Session:
    if not DB_AVAILABLE:
        raise HTTPException(status_code=503, detail="History is unavailable — the database isn't reachable.")
    return next(get_db())


@app.get("/history")
async def get_history(limit: int = 50):
    db = _db_or_503()
    try:
        runs = list_history(db, limit=limit)
        return [r.to_summary_dict() for r in runs]
    finally:
        db.close()


@app.get("/history/{run_id}")
async def get_history_detail(run_id: int):
    db = _db_or_503()
    try:
        run = get_run(db, run_id)
        if run is None:
            raise HTTPException(status_code=404, detail="No history entry with that id.")
        return run.to_detail_dict()
    finally:
        db.close()


@app.delete("/history/{run_id}")
async def delete_history_entry(run_id: int):
    db = _db_or_503()
    try:
        deleted = delete_run(db, run_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="No history entry with that id.")
        return {"status": "deleted", "id": run_id}
    finally:
        db.close()