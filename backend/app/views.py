from __future__ import annotations
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.db.models import Count
from django.http import StreamingHttpResponse
from django.utils import timezone

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import AppSetting, Agent, RunLog, SystemLog
from .serializers import AppSettingSerializer, AgentSerializer, RunLogSerializer, SystemLogSerializer
from .services.groq_client import (
    MODEL_CATALOG,
    ChatMessage,
    chat_completion,
    stream_completion,
    validate_model,
)
from .services.stt_service import transcribe_audio_bytes as transcribe_audio

from .services.news_service import fetch_news, crawl_extract
from .services.make_service import trigger_make_webhook
from .services.scheduler_service import sync_scheduler_stub
from .services.openclaw_bridge import setup_openclaw
from .services.agent_translator import prompt_to_agent_payload


def log_system(source: str, level: str, message: str) -> None:
    SystemLog.objects.create(source=source, level=level, message=message[:5000])


def get_or_create_settings() -> AppSetting:
    obj = AppSetting.objects.first()
    if not obj:
        obj = AppSetting.objects.create(
            groq_api_key=settings.ENV_GROQ_API_KEY or "",
            groq_model=settings.DEFAULT_GROQ_MODEL,
            sandbox_default=True,
        )
    return obj


def resolve_api_key(app_setting: AppSetting) -> str:
    return (app_setting.groq_api_key or settings.ENV_GROQ_API_KEY or "").strip()


AGENT_TEMPLATES: list[dict[str, Any]] = [
    {
        "key": "trending_openclaw_daily",
        "name": "Trending OpenClaw Daily",
        "role": "trend scout",
        "goal": "Check latest OpenClaw discussions and summarize action points.",
        "action_type": "monitor",
        "schedule_cron": "0 9 * * *",
    },
    {
        "key": "hashtag_commenter_hourly",
        "name": "Hashtag Commenter Hourly",
        "role": "engagement assistant",
        "goal": "Find posts with target hashtags and draft contextual comments.",
        "action_type": "commenter",
        "schedule_cron": "0 * * * *",
    },
    {
        "key": "brand_monitoring",
        "name": "Brand Monitoring",
        "role": "brand analyst",
        "goal": "Track brand mentions and sentiment spikes across sources.",
        "action_type": "monitor",
        "schedule_cron": "*/30 * * * *",
    },
    {
        "key": "daily_calendar_brief",
        "name": "Daily Calendar Brief",
        "role": "briefing assistant",
        "goal": "Prepare concise daily brief from meetings and tasks.",
        "action_type": "briefing",
        "schedule_cron": "30 8 * * *",
    },
]


@api_view(["GET"])
def health(_request):
    return Response({"ok": True, "service": "personaliz-backend", "time": timezone.now().isoformat()})


@api_view(["GET"])
def models_catalog(_request):
    return Response({"catalog": MODEL_CATALOG})


@api_view(["GET"])
def get_settings(_request):
    s = get_or_create_settings()
    return Response(AppSettingSerializer(s).data)


@api_view(["POST"])
def save_groq_settings(request):
    s = get_or_create_settings()
    body = request.data or {}

    incoming_key = (
        body.get("groq_api_key")
        or body.get("api_key")
        or body.get("groqKey")
        or body.get("groq_key")
        or ""
    )
    incoming_model = body.get("groq_model") or body.get("model") or s.groq_model
    sandbox_default = body.get("sandbox_default", s.sandbox_default)

    if incoming_model and not validate_model(incoming_model):
        return Response(
            {"ok": False, "error": f"Invalid model '{incoming_model}'", "allowed": MODEL_CATALOG},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(incoming_key, str) and incoming_key.strip():
        s.groq_api_key = incoming_key.strip()
    s.groq_model = incoming_model
    s.sandbox_default = bool(sandbox_default)
    s.save()

    log_system("settings", "info", "Groq settings updated.")
    return Response({"ok": True, "settings": AppSettingSerializer(s).data})


@api_view(["POST"])
def chat(request):
    s = get_or_create_settings()
    api_key = resolve_api_key(s)
    if not api_key:
        log_system("chat", "warning", "Chat attempted without API key.")
        return Response(
            {"ok": False, "error": "Groq API key missing. Please save it in Settings."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    body = request.data or {}
    user_message = str(body.get("message", "")).strip()
    history = body.get("history", [])

    if not user_message:
        return Response({"ok": False, "error": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        messages: list[ChatMessage] = []
        for h in history:
            role = str(h.get("role", "user"))
            content = str(h.get("content", ""))
            if content:
                messages.append(ChatMessage(role=role, content=content))
        messages.append(ChatMessage(role="user", content=user_message))

        answer = chat_completion(api_key=api_key, model=s.groq_model, messages=messages)
        log_system("chat", "info", "Chat completion success.")
        return Response({"ok": True, "reply": answer})
    except Exception as exc:
        log_system("chat", "error", f"Chat completion failed: {exc}")
        return Response({"ok": False, "error": f"Chat failed: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def chat_stream(request):
    s = get_or_create_settings()
    api_key = resolve_api_key(s)
    body = request.data or {}
    user_message = str(body.get("message", "")).strip()
    history = body.get("history", [])

    if not api_key:
        return Response(
            {"ok": False, "error": "Groq API key missing. Please save it in Settings."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user_message:
        return Response({"ok": False, "error": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

    def generate():
        try:
            messages: list[ChatMessage] = []
            for h in history:
                role = str(h.get("role", "user"))
                content = str(h.get("content", ""))
                if content:
                    messages.append(ChatMessage(role=role, content=content))
            messages.append(ChatMessage(role="user", content=user_message))

            for token in stream_completion(api_key=api_key, model=s.groq_model, messages=messages):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
            log_system("chat_stream", "info", "Stream completed.")
        except Exception as exc:
            log_system("chat_stream", "error", f"Stream failed: {exc}")
            yield f"data: [ERROR] {str(exc)}\n\n"
            yield "data: [DONE]\n\n"

    response = StreamingHttpResponse(generate(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["POST"])
def stt(request):
    s = get_or_create_settings()
    api_key = resolve_api_key(s)
    if not api_key:
        log_system("stt", "warning", "STT attempted without API key.")
        return Response(
            {"ok": False, "error": "Groq API key missing. Please save it in Settings."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    audio = request.FILES.get("audio")
    if not audio:
        return Response({"ok": False, "error": "Missing multipart file field: audio"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        text = transcribe_audio(api_key=api_key, audio_file=audio.file, filename=audio.name or "audio.webm")
        log_system("stt", "info", "STT success.")
        return Response({"ok": True, "text": text})
    except Exception as exc:
        log_system("stt", "error", f"STT failed: {exc}")
        return Response({"ok": False, "error": f"STT failed: {exc}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def setup_openclaw_view(_request):
    try:
        result = setup_openclaw(settings.OPENCLAW_BIN)
        sched = sync_scheduler_stub()
        level = "info" if result.get("ok") else "warning"
        log_system("setup_openclaw", level, result.get("message", "setup executed"))
        return Response({"ok": bool(result.get("ok")), "openclaw": result, "scheduler": sched})
    except Exception as exc:
        log_system("setup_openclaw", "error", str(exc))
        return Response({"ok": False, "error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
def agents(request):
    if request.method == "GET":
        qs = Agent.objects.all().order_by("-updated_at")
        return Response({"items": AgentSerializer(qs, many=True).data})

    serializer = AgentSerializer(data=request.data)
    if serializer.is_valid():
        agent = serializer.save()
        log_system("agents", "info", f"Agent created: {agent.name}")
        return Response({"ok": True, "item": AgentSerializer(agent).data}, status=status.HTTP_201_CREATED)
    return Response({"ok": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def agent_templates(_request):
    return Response({"items": AGENT_TEMPLATES})


@api_view(["POST"])
def create_agent_from_template(request):
    key = str((request.data or {}).get("key", "")).strip()
    found = next((t for t in AGENT_TEMPLATES if t["key"] == key), None)
    if not found:
        return Response({"ok": False, "error": "Template not found"}, status=status.HTTP_404_NOT_FOUND)

    s = get_or_create_settings()
    agent = Agent.objects.create(
        name=found["name"],
        role=found["role"],
        goal=found["goal"],
        action_type=found["action_type"],
        schedule_cron=found["schedule_cron"],
        active=True,
        sandbox=s.sandbox_default,
    )
    log_system("agents", "info", f"Agent created from template: {key}")
    return Response({"ok": True, "item": AgentSerializer(agent).data}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def create_agent_from_chat(request):
    prompt = str((request.data or {}).get("prompt", "")).strip()
    if not prompt:
        return Response({"ok": False, "error": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

    payload = prompt_to_agent_payload(prompt)
    s = get_or_create_settings()
    payload["sandbox"] = s.sandbox_default

    serializer = AgentSerializer(data=payload)
    if serializer.is_valid():
        agent = serializer.save()
        log_system("agents", "info", f"Agent created from chat: {agent.id}")
        return Response({"ok": True, "item": AgentSerializer(agent).data}, status=status.HTTP_201_CREATED)
    return Response({"ok": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def run_agent_now(request, agent_id: int):
    try:
        agent = Agent.objects.get(id=agent_id)
    except Agent.DoesNotExist:
        return Response({"ok": False, "error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)

    start = timezone.now()
    run_status = "sandboxed" if agent.sandbox else "success"
    msg = "Sandbox run (no external action)." if agent.sandbox else "Triggered."

    result_payload: dict[str, Any] = {}
    if not agent.sandbox:
        payload = {
            "agent_id": agent.id,
            "name": agent.name,
            "role": agent.role,
            "goal": agent.goal,
            "action_type": agent.action_type,
            "schedule_cron": agent.schedule_cron,
        }
        result_payload = trigger_make_webhook(
            webhook_url=settings.MAKE_WEBHOOK_URL,
            payload=payload,
        )
        if not result_payload.get("ok"):
            run_status = "failed"
            msg = result_payload.get("error") or "Webhook failed"
        else:
            msg = f"Webhook status {result_payload.get('status_code')}"

    end = timezone.now()
    run = RunLog.objects.create(
        agent=agent,
        status=run_status,
        message=msg,
        started_at=start,
        ended_at=end,
    )

    level = "info" if run_status in ("success", "sandboxed") else "error"
    log_system("run_now", level, f"Agent {agent.id} run -> {run_status}: {msg}")

    return Response({
        "ok": True,
        "run": RunLogSerializer(run).data,
        "webhook": result_payload,
    })


@api_view(["POST"])
def toggle_agent_active(_request, agent_id: int):
    try:
        agent = Agent.objects.get(id=agent_id)
    except Agent.DoesNotExist:
        return Response({"ok": False, "error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)

    agent.active = not agent.active
    agent.save(update_fields=["active", "updated_at"])
    log_system("agents", "info", f"Agent {agent.id} active={agent.active}")
    return Response({"ok": True, "item": AgentSerializer(agent).data})


@api_view(["POST"])
def toggle_agent_sandbox(_request, agent_id: int):
    try:
        agent = Agent.objects.get(id=agent_id)
    except Agent.DoesNotExist:
        return Response({"ok": False, "error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)

    agent.sandbox = not agent.sandbox
    agent.save(update_fields=["sandbox", "updated_at"])
    log_system("agents", "info", f"Agent {agent.id} sandbox={agent.sandbox}")
    return Response({"ok": True, "item": AgentSerializer(agent).data})


@api_view(["GET"])
def runs(_request):
    qs = RunLog.objects.select_related("agent").all().order_by("-started_at")[:200]
    return Response({"items": RunLogSerializer(qs, many=True).data})


@api_view(["GET"])
def system_logs(_request):
    qs = SystemLog.objects.all().order_by("-created_at")[:300]
    return Response({"items": SystemLogSerializer(qs, many=True).data})


@api_view(["GET"])
def analytics_summary(request):
    try:
        days = int(request.query_params.get("days", 14))
    except ValueError:
        days = 14
    days = 14 if days <= 0 else min(days, 90)

    now = timezone.now()
    start = now - timedelta(days=days - 1)

    qs = RunLog.objects.filter(started_at__date__gte=start.date(), started_at__date__lte=now.date())
    # Preload by date/status
    rows = (
        qs.values("started_at__date", "status")
        .annotate(c=Count("id"))
        .order_by("started_at__date")
    )

    date_map: dict[str, dict[str, int]] = {}
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        date_map[d] = {"date": d, "success": 0, "failed": 0, "sandboxed": 0, "total": 0}

    for r in rows:
        d = r["started_at__date"].isoformat()
        st = r["status"]
        c = int(r["c"])
        if d in date_map and st in ("success", "failed", "sandboxed"):
            date_map[d][st] += c
            date_map[d]["total"] += c

    trend = [date_map[k] for k in sorted(date_map.keys())]

    status_totals = {
        "success": qs.filter(status="success").count(),
        "failed": qs.filter(status="failed").count(),
        "sandboxed": qs.filter(status="sandboxed").count(),
    }

    top_agents_qs = (
        qs.exclude(agent__isnull=True)
        .values("agent__id", "agent__name")
        .annotate(total=Count("id"))
        .order_by("-total")[:5]
    )
    top_agents = [
        {"agent_id": a["agent__id"], "name": a["agent__name"], "total": a["total"]}
        for a in top_agents_qs
    ]

    return Response({
        "days": days,
        "trend": trend,
        "status_totals": status_totals,
        "top_agents": top_agents,
        "total_runs": qs.count(),
    })


@api_view(["GET"])
def news_search(request):
    q = str(request.query_params.get("q", "")).strip()
    try:
        limit = int(request.query_params.get("limit", 8))
    except ValueError:
        limit = 8
    limit = max(1, min(limit, 20))

    if not q:
        return Response({"ok": False, "error": "q is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        items = fetch_news(q, limit=limit)
        log_system("news_search", "info", f"News search ok for query='{q}'")
        return Response({"ok": True, "items": items})
    except Exception as exc:
        log_system("news_search", "error", str(exc))
        return Response({"ok": False, "error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def crawl_extract_view(request):
    url = str((request.data or {}).get("url", "")).strip()
    if not url:
        return Response({"ok": False, "error": "url is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        data = crawl_extract(url)
        log_system("crawl_extract", "info", f"Extracted: {url}")
        return Response({"ok": True, "item": data})
    except Exception as exc:
        log_system("crawl_extract", "error", f"{url}: {exc}")
        return Response({"ok": False, "error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def webhook_make_run_status(request):
    body = request.data or {}
    agent_id = body.get("agent_id")
    status_value = str(body.get("status", "success")).strip().lower()
    message = str(body.get("message", "Webhook run status received")).strip()

    if status_value not in ("success", "failed", "sandboxed"):
        status_value = "failed"

    agent = None
    if agent_id is not None:
        try:
            agent = Agent.objects.get(id=int(agent_id))
        except Exception:
            agent = None

    now = timezone.now()
    run = RunLog.objects.create(
        agent=agent,
        status=status_value,
        message=message,
        started_at=now,
        ended_at=now,
    )
    log_system("webhook_make", "info", f"Webhook run status: {status_value} agent={agent_id}")
    return Response({"ok": True, "run": RunLogSerializer(run).data})
