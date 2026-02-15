from __future__ import annotations
from typing import Any
import re


def prompt_to_agent_payload(prompt: str) -> dict[str, Any]:
    """
    Lightweight NL parser for MVP.
    Converts user prompt into agent payload.
    """
    text = (prompt or "").strip()
    if not text:
        return {
            "name": "Untitled Agent",
            "role": "assistant",
            "goal": "",
            "action_type": "custom",
            "schedule_cron": "",
            "active": True,
            "sandbox": True,
        }

    action_type = "custom"
    lowered = text.lower()
    if "comment" in lowered or "hashtag" in lowered:
        action_type = "commenter"
    elif "monitor" in lowered:
        action_type = "monitor"
    elif "calendar" in lowered or "brief" in lowered:
        action_type = "briefing"

    # naive cron detect
    cron = ""
    cron_match = re.search(r"\b(\*|[0-5]?\d)\s+(\*|[01]?\d|2[0-3])\s+(\*|[1-9]|[12]\d|3[01])\s+(\*|1[0-2]|0?[1-9])\s+(\*|[0-6])\b", text)
    if cron_match:
        cron = cron_match.group(0)

    return {
        "name": text[:60],
        "role": "automation assistant",
        "goal": text,
        "action_type": action_type,
        "schedule_cron": cron,
        "active": True,
        "sandbox": True,
    }
