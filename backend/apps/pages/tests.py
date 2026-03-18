import pytest
from celery import Celery
from django.urls import reverse

from apps.pages.tasks import add
from core.celery import app as celery_app


@pytest.mark.django_db
class TestHealthCheck:
    def test_health_check_returns_200(self, client):
        url = reverse("health-check")
        response = client.get(url)
        assert response.status_code == 200

    def test_health_check_returns_ok(self, client):
        url = reverse("health-check")
        response = client.get(url)
        assert response.json() == {"status": "ok"}


class TestCeleryConfig:
    """Verify the Celery application is correctly wired to Django settings."""

    def test_celery_app_is_celery_instance(self):
        assert isinstance(celery_app, Celery)

    def test_celery_app_name(self):
        assert celery_app.main == "core"

    def test_celery_app_uses_django_conf(self):
        # config_from_object with namespace="CELERY" means Django's
        # CELERY_BROKER_URL maps to broker_url, etc.
        assert celery_app.conf.task_serializer == "json"
        assert celery_app.conf.result_serializer == "json"
        assert "json" in celery_app.conf.accept_content

    def test_task_always_eager_in_test_settings(self):
        # Tasks must run synchronously during the test suite — no broker needed.
        from django.conf import settings

        assert getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False) is True


class TestAddTask:
    """Celery task unit tests — run eagerly via CELERY_TASK_ALWAYS_EAGER."""

    def test_add_called_directly(self):
        assert add(2, 3) == 5

    def test_add_delay_returns_correct_result(self):
        result = add.delay(4, 6)
        assert result.get() == 10

    def test_add_apply_returns_correct_result(self):
        result = add.apply(args=(7, 8))
        assert result.get() == 15

    def test_add_with_negative_numbers(self):
        assert add(-1, 1) == 0

    def test_add_with_zero(self):
        assert add(0, 0) == 0
