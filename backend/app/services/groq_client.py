from __future__ import annotations

from dataclasses import dataclass
from typing import Generator, Iterable
import json
import requests


GROQ_API_BASE = "https://api.groq.com/openai/v1"

MODEL_CATALOG: dict[str, list[str]] = {
    "recommended": [
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    ],
    "reasoning": [
        "deepseek-r1-distill-llama-70b",
    ],
    "vision": [
        "llama-3.2-11b-vision-preview",
        "llama-3.2-90b-vision-preview",
    ],
}


def all_models() -> list[str]:
    out: list[str] = []
    for _, items in MODEL_CATALOG.items():
        for m in items:
            if m not in out:
                out.append(m)
    return out


def validate_model(model: str) -> bool:
    return model in all_models()


@dataclass
class ChatMessage:
    role: str
    content: str


def _headers(api_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def chat_completion(
    *,
    api_key: str,
    model: str,
    messages: Iterable[ChatMessage],
    temperature: float = 1.0,
    max_tokens: int = 2048,
    top_p: float = 1.0,
    reasoning_effort: str = "medium",
) -> str:
    payload = {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "stream": False,
    }

    # keep optional for compatible models
    payload["reasoning_effort"] = reasoning_effort

    r = requests.post(
        f"{GROQ_API_BASE}/chat/completions",
        headers=_headers(api_key),
        json=payload,
        timeout=60,
    )

    # retry once without reasoning_effort if model rejects it
    if r.status_code >= 400:
        try:
            err = r.json()
        except Exception:
            err = {"error": {"message": r.text}}
        msg = str(err.get("error", {}).get("message", ""))
        if "reasoning_effort" in msg:
            payload.pop("reasoning_effort", None)
            r = requests.post(
                f"{GROQ_API_BASE}/chat/completions",
                headers=_headers(api_key),
                json=payload,
                timeout=60,
            )

    r.raise_for_status()
    data = r.json()
    return (data.get("choices", [{}])[0].get("message", {}).get("content") or "").strip()


def stream_completion(
    *,
    api_key: str,
    model: str,
    messages: Iterable[ChatMessage],
    temperature: float = 1.0,
    max_tokens: int = 2048,
    top_p: float = 1.0,
    reasoning_effort: str = "medium",
) -> Generator[str, None, None]:
    payload = {
        "model": model,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "top_p": top_p,
        "stream": True,
        "reasoning_effort": reasoning_effort,
    }

    def _do_stream(p: dict):
        with requests.post(
            f"{GROQ_API_BASE}/chat/completions",
            headers=_headers(api_key),
            json=p,
            timeout=120,
            stream=True,
        ) as r:
            if r.status_code >= 400:
                # if reasoning_effort not supported, caller can retry
                try:
                    err = r.json()
                except Exception:
                    err = {"error": {"message": r.text}}
                raise RuntimeError(str(err.get("error", {}).get("message", r.text)))

            for line in r.iter_lines(decode_unicode=True):
                if not line:
                    continue
                if not line.startswith("data:"):
                    continue
                raw = line[len("data:"):].strip()
                if raw == "[DONE]":
                    break
                try:
                    obj = json.loads(raw)
                except Exception:
                    continue
                delta = (
                    obj.get("choices", [{}])[0]
                    .get("delta", {})
                    .get("content", "")
                )
                if delta:
                    yield delta

    try:
        yield from _do_stream(payload)
    except RuntimeError as e:
        if "reasoning_effort" in str(e):
            payload.pop("reasoning_effort", None)
            yield from _do_stream(payload)
        else:
            raise
