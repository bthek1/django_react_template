from .base import *

DEBUG = True
ALLOWED_HOSTS = ["localhost", "0.0.0.0", "127.0.0.1", "*"]

DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://appuser:apppassword@localhost:5432/appdb"),
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "root@localhost"

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5174",
]

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://192\.168\.\d+\.\d+:\d+$",
]
