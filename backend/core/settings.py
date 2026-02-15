from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_csv(name: str, default: str = "") -> list[str]:
    raw = os.getenv(name, default)
    return [x.strip() for x in raw.split(",") if x.strip()]


# ------------------------------------------------------------------------------
# Core
# ------------------------------------------------------------------------------
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-insecure-key-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)

ALLOWED_HOSTS = env_csv(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost,demo-assitant.onrender.com",
)

# ------------------------------------------------------------------------------
# Apps / Middleware
# ------------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "app",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"

# ------------------------------------------------------------------------------
# Database (SQLite MVP)
# ------------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ------------------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = []
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Static files (required by Render collectstatic)
# ------------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------------------
# DRF
# ------------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# ------------------------------------------------------------------------------
# CORS / CSRF
# ------------------------------------------------------------------------------
# Keep this False in production unless explicitly needed.
CORS_ALLOW_ALL_ORIGINS = env_bool("CORS_ALLOW_ALL_ORIGINS", False)

# Example:
# CORS_ALLOWED_ORIGINS=https://demo-assitant.vercel.app,https://demo-assitant-git-main-martian3062.vercel.app
CORS_ALLOWED_ORIGINS = env_csv(
    "CORS_ALLOWED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173",
)

# Example:
# CSRF_TRUSTED_ORIGINS=https://demo-assitant.vercel.app,https://demo-assitant-git-main-martian3062.vercel.app
CSRF_TRUSTED_ORIGINS = env_csv(
    "CSRF_TRUSTED_ORIGINS",
    "http://127.0.0.1:5173,http://localhost:5173",
)

# Optional explicit headers list
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

# ------------------------------------------------------------------------------
# Security behind Render proxy
# ------------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Keep cookies secure in production when HTTPS is used
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)

# ------------------------------------------------------------------------------
# App defaults
# ------------------------------------------------------------------------------
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

ENV_GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MAKE_WEBHOOK_URL = os.getenv("MAKE_WEBHOOK_URL", "")
OPENCLAW_BIN = os.getenv("OPENCLAW_BIN", "openclaw")
