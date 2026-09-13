from sqlalchemy.orm import Session

from models import AnalysisRun


def save_analysis_summary(db: Session, session_id: str, filename: str,
                           validation: dict, analytics: dict) -> AnalysisRun:
    customers = analytics.get("customers")
    trends = analytics.get("trends", {})

    run = AnalysisRun(
        session_id=session_id,
        filename=filename,
        date_range_start=validation["date_range"]["min"],
        date_range_end=validation["date_range"]["max"],
        currencies=validation["currencies"],
        transaction_count=analytics["metrics"]["transaction_count"],
        total_gross=analytics["metrics"]["total_gross"],
        total_fees=analytics["metrics"]["total_fees"],
        total_net=analytics["metrics"]["total_net"],
        total_refunds=analytics["metrics"]["total_refunds"],
        avg_transaction=analytics["metrics"]["avg_transaction"],
        median_transaction=analytics["metrics"]["median_transaction"],
        largest_transaction=analytics["metrics"]["largest_transaction"],
        fee_pct=analytics["metrics"]["fee_pct"],
        avg_fee=analytics["metrics"]["avg_fee"],
        unique_customers=customers["unique_customers"] if customers else None,
        repeat_customers=customers["repeat_customers"] if customers else None,
        avg_customer_revenue=customers["avg_customer_revenue"] if customers else None,
        retention_rate=customers["retention_rate"] if customers else None,
        revenue_by_month=analytics["revenue_by_month"],
        categories_breakdown=analytics["categories_breakdown"],
        best_month=trends.get("best_month"),
        best_day_of_week=trends.get("best_day_of_week"),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def list_history(db: Session, limit: int = 50) -> list[AnalysisRun]:
    return (
        db.query(AnalysisRun)
        .order_by(AnalysisRun.uploaded_at.desc())
        .limit(limit)
        .all()
    )


def get_run(db: Session, run_id: int) -> AnalysisRun | None:
    return db.query(AnalysisRun).filter(AnalysisRun.id == run_id).first()


def delete_run(db: Session, run_id: int) -> bool:
    run = get_run(db, run_id)
    if run is None:
        return False
    db.delete(run)
    db.commit()
    return True