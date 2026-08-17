# Plan: Celery Full Implementation

**Status:** Complete
**Date:** 2026-03-18

---

## Goal

Complete the Celery integration by adding persistent DB-backed task results (`django-celery-results`), DB-driven periodic scheduling (`django-celery-beat`), DRF task dispatch/poll/revoke endpoints, a React polling hook, and a full test suite — as specified in `docs/guides/celery_setup.md`.

## Background

Phase 1–3 of [backend-celery.md](backend-celery.md) are complete: Celery runs with Redis as broker, the worker starts via Docker, and `just dev` wires everything together. What remains is everything needed to make async tasks observable and testable end-to-end:

- Task results currently live only in Redis and are ephemeral. `django-celery-results` stores them in Postgres, making them queryable via the ORM and inspectable in Django admin.
- `django-celery-beat` allows periodic task schedules to be managed in Django admin at runtime without code changes. The `celery_beat` Docker service exists but is commented out pending this dependency.
- There are no DRF endpoints to trigger tasks, poll their status, or revoke them.
- There is no frontend hook to poll task status and update the UI.
- Phase 4 of the existing plan (tests) is still incomplete.

---

## Phases

### Phase 1 — django-celery-results (Persistent Task Results)

- [ ] Add `django-celery-results` to `backend/pyproject.toml` dependencies
- [ ] Add `django_celery_results` to `INSTALLED_APPS` in `backend/core/settings/base.py`
- [ ] Change `CELERY_RESULT_BACKEND` from `"redis://..."` to `"django-db"` in `base.py`
- [ ] Add `CELERY_RESULT_EXTENDED = True` to `base.py` (stores args, kwargs, worker, runtime)
- [ ] Run `uv add django-celery-results` inside `backend/`
- [ ] Run `just be-makemigrations` and `just be-migrate` to create `django_celery_results` tables
- [ ] Verify results appear in Django admin at `/admin/django_celery_results/taskresult/`

### Phase 2 — django-celery-beat (Periodic Task Scheduling)

- [ ] Add `django-celery-beat` to `backend/pyproject.toml` dependencies
- [ ] Run `uv add django-celery-beat` inside `backend/`
- [ ] Add `django_celery_beat` to `INSTALLED_APPS` in `backend/core/settings/base.py`
- [ ] Add `CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"` to `base.py`
- [ ] Run `just be-makemigrations` and `just be-migrate` to create `django_celery_beat` tables
- [ ] Uncomment the `celery_beat` service in `docker-compose.yml`
- [ ] Verify beat schedule is editable in Django admin at `/admin/django_celery_beat/periodictask/`

### Phase 3 — Extended Celery Settings

Add the following reliability and observability settings to `backend/core/settings/base.py` (absent from the current config):

- [ ] `CELERY_TASK_TRACK_STARTED = True` — exposes STARTED state so UI can show "in progress"
- [ ] `CELERY_TASK_SEND_SENT_EVENT = True`
- [ ] `CELERY_WORKER_SEND_TASK_EVENTS = True`
- [ ] `CELERY_TASK_ACKS_LATE = True` — task survives worker crash, requeued automatically
- [ ] `CELERY_WORKER_PREFETCH_MULTIPLIER = 1` — prevents long tasks blocking short ones
- [ ] `CELERY_TASK_SOFT_TIME_LIMIT = 300` — raises `SoftTimeLimitExceeded` at 5 min
- [ ] `CELERY_TASK_TIME_LIMIT = 360` — hard kill at 6 min

### Phase 4 — DRF Task Endpoints

Add task dispatch, status polling, and revoke endpoints to `backend/apps/pages/`.

- [ ] Update `backend/apps/pages/tasks.py` — add a realistic `process_data` task with `bind=True`, `max_retries=3`, and proper logging (replace / supplement the current trivial `add` task)
- [ ] Create/update `backend/apps/pages/views.py` with three endpoints:
  - `POST /api/tasks/trigger/` — dispatches `process_data.delay()`, returns `{ task_id }`
  - `GET /api/tasks/<task_id>/` — returns `{ task_id, status, result, traceback }`
  - `POST /api/tasks/<task_id>/revoke/` — revokes/terminates the task
- [ ] Update `backend/apps/pages/urls.py` with the three route patterns
- [ ] Confirm routes are included in `backend/core/urls.py` under `/api/`

### Phase 5 — Frontend Polling Hook

- [ ] Create `frontend/src/hooks/useTaskPoller.ts` — polls `GET /api/tasks/<task_id>/` on an interval, stops automatically on `SUCCESS`, `FAILURE`, or `REVOKED`
- [ ] Export `TaskStatus` and `TaskResult<T>` types from the hook file
- [ ] Create `frontend/src/components/TaskTrigger.tsx` — demo component that calls `POST /api/tasks/trigger/` and feeds the returned `task_id` into `useTaskPoller`
- [ ] Add a co-located test `frontend/src/hooks/useTaskPoller.test.ts`

### Phase 6 — Tests

#### Backend

- [ ] Add `pytest-celery` to dev dependencies in `backend/pyproject.toml`
- [ ] Add `eager_celery` fixture to `backend/apps/pages/tests/conftest.py` (or `backend/conftest.py`) that sets `CELERY_TASK_ALWAYS_EAGER = True` for the duration of a test
- [ ] Write **eager tests** for `process_data` task logic (success path and retry/failure path)
- [ ] Write **mock tests** for the DRF trigger endpoint — patch `.delay()`, assert 202 and `task_id` in response
- [ ] Write **mock tests** for the DRF status endpoint — patch `AsyncResult`, assert status/result fields
- [ ] Write **beat registration test** — create an `IntervalSchedule` + `PeriodicTask` and assert it persists

#### Frontend

- [ ] Write `useTaskPoller.test.ts` — mock `fetch`, assert hook returns polling results and stops on terminal status
- [ ] Write `TaskTrigger.test.tsx` — mock POST and polling, assert UI updates on status change

### Phase 7 — Monitoring (Flower)

- [ ] Add `flower` to dev dependencies: `uv add --dev flower`
- [ ] Add a `flower` recipe to `justfile`:
  ```just
  flower:
      uv run celery -A core flower --port=5555
  ```
- [ ] Add Flower URL to `docs/guides/local-setup.md` (`http://localhost:5555`)
- [ ] (Optional) Add a `celery_flower` service to `docker-compose.yml` for fully Dockerised local dev

---

## Testing

**Unit tests (backend):**
- Task functions tested eagerly (`CELERY_TASK_ALWAYS_EAGER = True`) — no broker required
- Views tested with `.delay()` mocked — no broker required
- Run with `just be-test`

**Integration tests (backend):**
- `@pytest.mark.integration` — require running Redis
- Use in-memory broker where possible (`broker="memory://"`) via `pytest-celery`
- Cover full dispatch → worker → result cycle

**Frontend tests:**
- `useTaskPoller` tested with mocked `fetch` in Vitest + jsdom
- Run with `just fe-test`

**Manual verification:**
1. `just dev` — confirm Redis, worker, and beat containers all start
2. `POST /api/tasks/trigger/` via curl or Swagger UI — confirm 202 + `task_id`
3. `GET /api/tasks/<task_id>/` — confirm status transitions: `PENDING → STARTED → SUCCESS`
4. Django admin `/admin/django_celery_results/taskresult/` — confirm result row appears
5. Django admin `/admin/django_celery_beat/periodictask/` — create a periodic task, confirm beat fires it
6. Flower at `http://localhost:5555` — confirm worker and completed task visible

---

## Risks & Notes

- **Migration order matters:** `django_celery_results` must be in `INSTALLED_APPS` before running `migrate` or the `TaskResult` table won't be created.
- **`django-db` backend requires DB access from worker:** The Celery worker must share the same `DATABASE_URL` as Django. This is already the case in the Docker Compose setup.
- **`CELERY_TASK_ACKS_LATE` interaction with retries:** With `acks_late=True`, a task that raises and retries will be re-queued, not lost. Ensure `max_retries` is always set to avoid infinite loops.
- **`celery_beat` and `celery_worker` must not both read from the same beat schedule simultaneously** — the `celery_beat` service should be the only process running beat.
- **Frontend `useTaskPoller` should use the Axios client** from `src/api/client.ts` for JWT handling, not raw `fetch`, once authentication is required on task endpoints.
- **Flower is for local dev only** — do not expose port 5555 in production without authentication.

---

> **Completed** — moved to `docs/plans/completed/` and kept as a record.
