from rest_framework import serializers
from .models import AppSetting, Agent, RunLog, SystemLog


class AppSettingSerializer(serializers.ModelSerializer):
    has_key = serializers.SerializerMethodField()

    class Meta:
        model = AppSetting
        fields = ("id", "groq_model", "sandbox_default", "has_key")

    def get_has_key(self, obj: AppSetting) -> bool:
        return bool((obj.groq_api_key or "").strip())


class AgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = "__all__"


class RunLogSerializer(serializers.ModelSerializer):
    agent_name = serializers.SerializerMethodField()

    class Meta:
        model = RunLog
        fields = ("id", "agent", "agent_name", "status", "message", "started_at", "ended_at")

    def get_agent_name(self, obj: RunLog) -> str | None:
        return obj.agent.name if obj.agent else None


class SystemLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemLog
        fields = "__all__"
