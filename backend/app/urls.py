from django.urls import path
from . import views

urlpatterns = [
    path("health", views.health, name="health"),
    path("models/catalog", views.models_catalog, name="models_catalog"),
    path("settings", views.get_settings, name="get_settings"),
    path("settings/groq-key", views.save_groq_settings, name="save_groq_settings"),
    path("chat", views.chat, name="chat"),
    path("chat/stream", views.chat_stream, name="chat_stream"),
    path("stt", views.stt, name="stt"),
    path("setup/openclaw", views.setup_openclaw_view, name="setup_openclaw_view"),

    path("agents", views.agents, name="agents"),
    path("agents/templates", views.agent_templates, name="agent_templates"),
    path("agents/create-from-template", views.create_agent_from_template, name="create_agent_from_template"),
    path("agents/create-from-chat", views.create_agent_from_chat, name="create_agent_from_chat"),
    path("agents/<int:agent_id>/run-now", views.run_agent_now, name="run_agent_now"),
    path("agents/<int:agent_id>/toggle-active", views.toggle_agent_active, name="toggle_agent_active"),
    path("agents/<int:agent_id>/toggle-sandbox", views.toggle_agent_sandbox, name="toggle_agent_sandbox"),

    path("runs", views.runs, name="runs"),
    path("system-logs", views.system_logs, name="system_logs"),
    path("analytics/summary", views.analytics_summary, name="analytics_summary"),

    path("news/search", views.news_search, name="news_search"),
    path("crawl/extract", views.crawl_extract_view, name="crawl_extract_view"),

    path("webhooks/make/run-status", views.webhook_make_run_status, name="webhook_make_run_status"),
]
