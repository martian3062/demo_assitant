from __future__ import annotations
import shutil
from typing import Any


def setup_openclaw(openclaw_bin: str = "openclaw") -> dict[str, Any]:
    path = shutil.which(openclaw_bin)
    if path:
        return {
            "ok": True,
            "installed": True,
            "path": path,
            "message": "OpenClaw binary found.",
        }
    return {
        "ok": False,
        "installed": False,
        "path": None,
        "message": f"OpenClaw binary '{openclaw_bin}' not found in PATH.",
    }
