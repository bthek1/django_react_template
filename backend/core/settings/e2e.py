# Settings for the Playwright end-to-end suite (frontend/playwright.config.ts).
# Reuses the test settings with a dedicated SQLite file so e2e data never touches
# the dev Postgres or the pytest database.
from .test import *

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "e2e.sqlite3",
    }
}

CORS_ALLOWED_ORIGINS = env.list(
    "E2E_CORS_ALLOWED_ORIGINS", default=["http://127.0.0.1:5185"]
)
