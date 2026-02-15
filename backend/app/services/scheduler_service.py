from __future__ import annotations
from typing import Any


def sync_scheduler_stub() -> dict[str, Any]:
    """
    APScheduler-compatible placeholder.
    You can later wire this to a BackgroundScheduler + job store.
    """
    return {
        "status": "ok",
        "message": "Scheduler stub synced.",
        "jobs": 0,
    }
