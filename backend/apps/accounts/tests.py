import pytest
from django.contrib.auth import get_user_model

from apps.accounts.forms import CustomUserCreationForm, CustomUserChangeForm

User = get_user_model()


@pytest.mark.django_db
class TestCustomUserModel:
    def test_create_user(self):
        user = User.objects.create_user(
            username="alice", email="alice@example.com", password="secret123"
        )
        assert user.pk is not None
        assert user.username == "alice"
        assert user.email == "alice@example.com"
        assert user.is_active
        assert not user.is_staff
        assert not user.is_superuser

    def test_str_returns_email(self):
        user = User(username="bob", email="bob@example.com")
        assert str(user) == "bob@example.com"

    def test_create_superuser(self):
        admin = User.objects.create_superuser(
            username="admin", email="admin@example.com", password="adminpass"
        )
        assert admin.is_staff
        assert admin.is_superuser


@pytest.mark.django_db
class TestCustomUserCreationForm:
    def test_valid_form(self):
        form = CustomUserCreationForm(
            data={
                "username": "carol",
                "email": "carol@example.com",
                "password1": "strongpass999",
                "password2": "strongpass999",
            }
        )
        assert form.is_valid(), form.errors

    def test_password_mismatch_invalid(self):
        form = CustomUserCreationForm(
            data={
                "username": "dave",
                "email": "dave@example.com",
                "password1": "strongpass999",
                "password2": "differentpass",
            }
        )
        assert not form.is_valid()
        assert "password2" in form.errors

    def test_missing_username_invalid(self):
        form = CustomUserCreationForm(
            data={
                "username": "",
                "email": "noname@example.com",
                "password1": "strongpass999",
                "password2": "strongpass999",
            }
        )
        assert not form.is_valid()
        assert "username" in form.errors


@pytest.mark.django_db
class TestCustomUserChangeForm:
    def test_valid_change(self):
        user = User.objects.create_user(
            username="eve", email="eve@example.com", password="pass1234"
        )
        form = CustomUserChangeForm(
            instance=user,
            data={"username": "eve_updated", "email": "eve_new@example.com"},
        )
        assert form.is_valid(), form.errors
