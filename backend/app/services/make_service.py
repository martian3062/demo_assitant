from __future__ import annotations
from typing import Any
import requests


def trigger_make_webhook(*, webhook_url: str, payload: dict[str, Any], timeout: int = 10) -> dict[str, Any]:
    if not webhook_url:
        return {"ok": False, "status_code": None, "error": "MAKE_WEBHOOK_URL is not configured"}

    try:
        resp = requests.post(webhook_url, json=payload, timeout=timeout)
        return {
            "ok": resp.ok,
            "status_code": resp.status_code,
            "body": resp.text[:5000],
        }
    except Exception as exc:
        return {"ok": False, "status_code": None, "error": str(exc)}
