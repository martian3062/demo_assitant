from django.db import models


class AppSetting(models.Model):
    groq_api_key = models.TextField(blank=True, default="")
    groq_model = models.CharField(max_length=120, default="llama-3.3-70b-versatile")
    sandbox_default = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"AppSetting<{self.id}> model={self.groq_model}"


class Agent(models.Model):
    name = models.CharField(max_length=120)
    role = models.TextField(blank=True, default="")
    goal = models.TextField(blank=True, default="")
    action_type = models.CharField(max_length=80, default="custom")
    schedule_cron = models.CharField(max_length=120, blank=True, default="")
    active = models.BooleanField(default=True)
    sandbox = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Agent<{self.id}> {self.name}"


class RunLog(models.Model):
    STATUS_CHOICES = [
        ("success", "success"),
        ("failed", "failed"),
        ("sandboxed", "sandboxed"),
    ]
    agent = models.ForeignKey(Agent, null=True, blank=True, on_delete=models.SET_NULL, related_name="runs")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="success")
    message = models.TextField(blank=True, default="")
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()

    def __str__(self) -> str:
        return f"RunLog<{self.id}> {self.status}"


class SystemLog(models.Model):
    source = models.CharField(max_length=80)
    level = models.CharField(max_length=20, default="info")
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"SystemLog<{self.id}> {self.source}:{self.level}"
