from django.contrib import admin
from .models import AppSetting, Agent, RunLog, SystemLog


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "groq_model", "sandbox_default")


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "action_type", "active", "sandbox", "created_at")
    list_filter = ("active", "sandbox", "action_type")
    search_fields = ("name", "role", "goal")


@admin.register(RunLog)
class RunLogAdmin(admin.ModelAdmin):
    list_display = ("id", "agent", "status", "started_at", "ended_at")
    list_filter = ("status",)
    search_fields = ("message",)


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ("id", "source", "level", "created_at")
    list_filter = ("source", "level")
    search_fields = ("message",)
