from .base import *

DEBUG = False

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
DEFAULT_FROM_EMAIL = "root@localhost"

# Use a fast password hasher to speed up test runs
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
