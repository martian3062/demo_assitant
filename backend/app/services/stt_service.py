from __future__ import annotations
import requests

GROQ_API_BASE = "https://api.groq.com/openai/v1"


def transcribe_audio_bytes(
    *,
    api_key: str,
    audio_bytes: bytes,
    filename: str = "audio.webm",
    model: str = "whisper-large-v3-turbo",
    language: str | None = None,
) -> str:
    headers = {"Authorization": f"Bearer {api_key}"}
    files = {"file": (filename, audio_bytes, "audio/webm")}
    data = {"model": model}
    if language:
        data["language"] = language

    r = requests.post(
        f"{GROQ_API_BASE}/audio/transcriptions",
        headers=headers,
        data=data,
        files=files,
        timeout=120,
    )
    r.raise_for_status()
    payload = r.json()
    return (payload.get("text") or "").strip()


# Backward-compatible name used by views.py
def transcribe_audio(
    *,
    api_key: str,
    audio_bytes: bytes,
    filename: str = "audio.webm",
    model: str = "whisper-large-v3-turbo",
    language: str | None = None,
) -> str:
    return transcribe_audio_bytes(
        api_key=api_key,
        audio_bytes=audio_bytes,
        filename=filename,
        model=model,
        language=language,
    )
