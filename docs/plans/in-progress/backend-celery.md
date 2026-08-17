# Plan: Backend Celery Integration (Docker)

**Status:** In Progress
**Date:** 2026-03-18

---

## Goal

Add Celery (with Redis as the broker/result backend) to the Django backend, running the worker inside Docker. The `just dev` command is updated to automatically start Redis and the Celery worker containers alongside the local Django and Vite dev servers.

## Background

The backend currently has no async task queue. Adding Celery enables offloading slow or scheduled work (emails, data processing, periodic jobs) from the synchronous request cycle. Redis is the standard broker choice — lightweight, minimal ops overhead, and fully supported by Celery. Running Redis and the Celery worker in Docker keeps local dev machines clean while still allowing Django to run locally (for fast reloads and debugger access).

---

## Phases

Every phase is stable: the backend still boots and `just be-test` still passes at the end of
each one, whether or not the following phases have landed.

### Phase 1 — Dependencies & Core Configuration

**Outcome:** Django starts with a configured Celery app attached; no worker required yet.

- [x] Add `celery[redis]` to `backend/pyproject.toml` dependencies
- [x] Create `backend/core/celery.py` — Celery app instance, auto-discovers tasks
- [x] Update `backend/core/__init__.py` to expose the Celery app (so Django loads it at startup)
- [x] Add Celery settings to `backend/core/settings/base.py`:
  - `CELERY_BROKER_URL`
  - `CELERY_RESULT_BACKEND`
  - `CELERY_ACCEPT_CONTENT`
  - `CELERY_TASK_SERIALIZER`
  - `CELERY_RESULT_SERIALIZER`
  - `CELERY_TIMEZONE` (mirrors `TIME_ZONE`)

**Validation:**
- [x] `just be-test` passes — Django still boots with `core.celery` imported at startup
- [x] Manual: `just be-shell` → `from core import celery_app; celery_app.conf.broker_url`
      returns the configured URL

### Phase 2 — Docker Services

**Outcome:** Redis and a Celery worker run under Docker and the worker connects to the broker.

- [x] Add `redis` service to `docker-compose.yml` (image `redis:7-alpine`, port `6379`)
- [x] Add `celery_worker` service to `docker-compose.yml`:
  - Builds from `./backend`
  - Command: `celery -A core worker --loglevel=info`
  - Depends on `db` and `redis`
  - Shares the same `env_file` and environment vars as `backend`
- [x] Add `celery_beat` service (optional, for periodic tasks):
  - Command: `celery -A core beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler`
  - Gated behind a comment — enable when `django-celery-beat` is added

**Validation:**
- [x] `docker compose config` parses with no errors
- [x] Manual: `docker compose up -d redis celery_worker`, then
      `docker compose logs celery_worker` shows `celery@… ready.`

### Phase 3 — `just dev` Integration

**Outcome:** `just dev` brings up the full local stack — Redis and the worker included —
in one command.

- [x] Add `celery-up` recipe to `justfile`:
  ```just
  celery-up:
      @docker compose ps --status running redis | grep -q redis \
          && echo "Redis already running." \
          || (echo "Starting Redis + Celery worker..." && docker compose up -d redis celery_worker)
  ```
- [x] Update `dev` recipe to call `celery-up` after `db-up`
- [x] Add `celery-logs` convenience recipe: `just logs-svc celery_worker`
- [x] Add `celery-worker` recipe to run the worker locally (outside Docker) for debugging

**Validation:**
- [x] `just --list` shows `celery-up`, `celery-logs`, `celery-worker`
- [x] Manual: `just dev` from a clean state starts Redis + worker + backend + frontend, and
      re-running it reports "Redis already running." instead of starting a second container

### Phase 4 — Example Task (Smoke Test)

**Outcome:** A task ships end to end — defined, queued, executed — with a test that fails if
the wiring breaks.

- [ ] Create `backend/apps/pages/tasks.py` with a trivial `debug_task` that logs its request
- [ ] Write a test in `backend/apps/pages/tests.py` using `celery.contrib.pytest` fixtures (`celery_app`, `celery_worker`)

**Validation:**
- [ ] `backend/apps/pages/tests.py::test_debug_task_runs` — calls the task directly and asserts
      its return value
- [ ] `backend/apps/pages/tests.py::test_debug_task_delay_eager` — `.delay()` under
      `CELERY_TASK_ALWAYS_EAGER` resolves successfully, proving app discovery works
- [ ] `just be-test` passes
- [ ] Manual: the five broker round-trip steps in **Testing → Manual verification** below

---

## Testing

Cross-cutting strategy. Per-phase checks live in the **Validation** blocks above.

**Unit tests:**
- Task functions are unit-tested directly (call the function, not `.delay()`)
- Use `@pytest.mark.django_db` where tasks touch the ORM
- Use `CELERY_TASK_ALWAYS_EAGER = True` in `test.py` settings so tasks run synchronously

**Integration tests:**
- Mark with `@pytest.mark.integration`
- Require a running Redis; skip in CI unless broker is available
- Use the `celery_worker` pytest fixture for in-process integration tests

**Manual verification:**
1. `just dev` — confirm Redis and celery_worker containers start
2. `docker compose logs -f celery_worker` — confirm worker connects to Redis and is ready
3. Open Django shell: `just be-shell`
4. `from apps.pages.tasks import debug_task; debug_task.delay()` — confirm task executes
5. Check celery_worker logs for task received + succeeded

---

## Risks & Notes

- **Broker URL env var:** `CELERY_BROKER_URL` must be set in `.env.example` (and `.env`). Inside Docker, use `redis://redis:6379/0`; locally, use `redis://localhost:6379/0`.
- **`celery_beat` deferred:** `django-celery-beat` requires a migration. It's included in Phase 2 as a commented service — activate only when periodic tasks are needed.
- **Worker concurrency:** Defaults to CPU count. For dev, `--concurrency=2` keeps resource usage low.
- **Result backend:** Redis is used for results too, keeping things simple. For production, consider a dedicated backend or disabling results if tasks are fire-and-forget.
- **No Flower in Phase 1:** Flower (Celery monitoring UI) can be added as a separate Docker service later (`just flower-up`).

---

> **On completion:** set `Status: Complete` and move this file to `docs/plans/completed/`.
