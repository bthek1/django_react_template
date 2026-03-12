from .base import *

DEBUG = True

ALLOWED_HOSTS = ["localhost", "0.0.0.0", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
DEFAULT_FROM_EMAIL = "root@localhost"

# django-debug-toolbar
INTERNAL_IPS = ["127.0.0.1"]
