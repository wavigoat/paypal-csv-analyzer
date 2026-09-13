"""
Tiny in-memory session store. Keeps a cleaned dataframe available for a
short window after upload so /filter, /compare, and /report can re-query
it without asking the user to re-upload the CSV.

This is intentionally NOT a database (that's Version 3) and intentionally
NOT written to disk, in keeping with the "don't persist raw financial
data" design decision from the project plan.
"""
import time
import uuid
from threading import Lock

import pandas as pd

SESSION_TTL_SECONDS = 60 * 60 * 2  # 2 hours

_store: dict[str, dict] = {}
_lock = Lock()


def _cleanup_expired() -> None:
    now = time.time()
    expired = [sid for sid, entry in _store.items() if now - entry["created_at"] > SESSION_TTL_SECONDS]
    for sid in expired:
        _store.pop(sid, None)


def create_session(df: pd.DataFrame, filename: str) -> str:
    with _lock:
        _cleanup_expired()
        session_id = uuid.uuid4().hex
        _store[session_id] = {"df": df, "filename": filename, "created_at": time.time()}
        return session_id


def get_session(session_id: str) -> dict | None:
    with _lock:
        _cleanup_expired()
        return _store.get(session_id)