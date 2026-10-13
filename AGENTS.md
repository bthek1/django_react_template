# AGENTS.md

Rules for AI coding agents working in this repository. This is the only agent instruction file.
`CLAUDE.md` contains just `@AGENTS.md`. Do not add rules anywhere else.

---

## What this repo is

A **template** for new Django + DRF + React projects, as a decoupled monorepo:

- **`backend/`**: Django REST Framework API (Python 3.13, PostgreSQL, Celery + Redis)
- **`frontend/`**: React 19 SPA (TypeScript, Vite, TanStack Router + Query)

The backend exposes only `/api/` endpoints. The frontend consumes them over HTTP. The two halves
share no code. The API contract is the only interface between them.

Because this is a starter template, keep everything generic and reusable. Do not hardcode
project-specific names, domains or data. Prefer documented conventions over one-off solutions.

---

## Where to look first

| You need | Read |
|----------|------|
| Architecture and design decisions | [`docs/explanations/architecture.md`](docs/explanations/architecture.md) |
| Auth flow (JWT) | [`docs/explanations/auth-flow.md`](docs/explanations/auth-flow.md) |
| Endpoints and request/response shapes | [`docs/standards/api-contracts.md`](docs/standards/api-contracts.md) |
| Local dev setup | [`docs/guides/local-setup.md`](docs/guides/local-setup.md) |
| Celery / async tasks | [`docs/guides/celery_setup.md`](docs/guides/celery_setup.md) |
| Plan lifecycle and `gh` commands | [`docs/plans/README.md`](docs/plans/README.md) |
| Plan template | [`.github/ISSUE_TEMPLATE/plan.md`](.github/ISSUE_TEMPLATE/plan.md) |
| Active / finished plans | GitHub issues labelled `plan` (`just plans`, `just plans --state closed`) |
| Pre-issue plans (frozen archive) | [`docs/plans/completed/`](docs/plans/completed/) |
| Target-state docs | [`docs/plans/future/`](docs/plans/future/) |

---

## Commands

All workflows are in the [`justfile`](justfile). Run `just --list` for everything.

```bash
just dev            # db + redis + celery (docker) + backend + frontend
just up             # everything via docker compose

# Backend (run from backend/ with `uv run ...` outside just)
just be-dev         # makemigrations + migrate + runserver on :8005
just be-test        # pytest
just be-test-cov    # pytest with coverage
just be-lint        # ruff check
just be-fmt         # ruff format
just be-makemigrations <app>
just be-startapp <name>
uv run mypy .       # type check, from backend/

# Frontend
just fe-dev         # vite dev server on :5174
just fe-build       # type-check + build
just fe-test        # vitest
just fe-test-ui     # vitest UI
just fe-lint        # eslint

# Celery
just celery-up      # redis + worker + beat (docker)
just celery-worker  # worker outside docker, for debugging
just flower         # Flower UI on :5555

# Plans (GitHub issues)
just plans          # list open plan issues
just gh-labels      # one-time: create the plan / status labels
```

### Local services and ports

Host ports are offset so they do not clash with a locally installed Postgres or Redis.

| Service | Host port | Notes |
|---|---|---|
| `db` | `5435` -> 5432 | Postgres 16 (`appuser` / `apppassword` / `appdb`) |
| `redis` | `6380` -> 6379 | Celery broker |
| `backend` | `8005` | Django dev server |
| `celery_worker`, `celery_beat` | none | beat uses `DatabaseScheduler` |
| `frontend` | `5174` | Vite dev server |

Inside Compose, the `environment:` blocks set `DATABASE_URL` and `CELERY_BROKER_URL` to the
in-network hosts (`db:5432`, `redis:6379`). These override the `localhost` values in the root `.env`.

---

## Backend (`backend/`)

**Stack:** Python 3.13, Django 5.1+, DRF, PostgreSQL (psycopg3), simplejwt, Celery + Redis
(`django-celery-results`, `django-celery-beat`), django-environ, uv, ruff, mypy, pytest +
pytest-django, factory-boy, faker, freezegun, pytest-mock.

**Layout:** project package `core/` (settings, `celery.py`, `urls.py`), one app per domain under
`apps/<name>/`. Current apps: `accounts` (CustomUser, registration, `/me`) and `pages` (health
check and Celery task demo endpoints).

**Views and URLs**
- All endpoints are under `/api/`.
- Use class-based views (`APIView`, `generics.*`, `ViewSet`). `apps/pages/views.py` uses
  `@api_view` function views. It is a legacy exception. Do not copy it.
- Serializers go in `serializers.py`. Business logic goes in `services.py`, never in views or
  serializers.
- Use `get_object_or_404` and DRF exception handling, not try/except for HTTP errors.
- Return DRF `Response`, never `JsonResponse`.
- Default permission is `IsAuthenticated` (set in `REST_FRAMEWORK`). Mark public views explicitly.

**Models and data**
- UUID primary keys: `models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- `AUTH_USER_MODEL = "accounts.CustomUser"` (email is `USERNAME_FIELD`, no `username`). Always
  use `get_user_model()`, never import `User` directly.
- Avoid N+1 with `select_related` / `prefetch_related`. Use `bulk_create` / `bulk_update` for
  batches. Add indexes for frequently queried fields.
- All DB access goes through the ORM. Raw SQL only when unavoidable, and always parameterised.
- Run `makemigrations` with an explicit app name after model changes. Never edit or delete
  migration files by hand.

**Settings:** split into `core/settings/{base,dev,prod,test}.py`, selected by
`DJANGO_SETTINGS_MODULE`. All config comes from env vars via `django-environ`, loaded from the
repo-root `.env` (`base.py` reads `BASE_DIR.parent / ".env"`). Never hardcode secrets or
credentials. `DATABASE_URL` configures the database.

**Auth:** JWT via simplejwt. `POST /api/token/` and `POST /api/token/refresh/`.

**Celery**
- App in `core/celery.py`. Tasks in `apps/<app>/tasks.py`, auto-discovered, defined with
  `@shared_task`.
- Broker is Redis. Results are stored in Postgres (`CELERY_RESULT_BACKEND = "django-db"`).
  Periodic schedules are managed in Django admin.
- Test settings run tasks eagerly (`CELERY_TASK_ALWAYS_EAGER`), so tests need no broker.

**Testing:** `core.settings.test` uses SQLite and a fast password hasher. Fixtures go in
`conftest.py` (app-level or `backend/conftest.py`). Markers: `slow`, `integration`, `development`.

**API docs:** no OpenAPI generator is installed. `docs/standards/api-contracts.md` is the
hand-written contract.

---

## Frontend (`frontend/`)

**Stack:** React 19, TypeScript ~6.0 (strict), Vite 8, TanStack Router, TanStack Query v5, Axios,
Tailwind CSS v4, shadcn/ui (`base-nova` style on `@base-ui/react`), React Hook Form + Zod,
Zustand + Immer, date-fns, ECharts + Recharts, react-markdown, Vitest + Testing Library + MSW,
ESLint 10. Node 20.19+ or 22.12+.

**Layout (`src/`):** `api/` (client, endpoint functions, `queryKeys.ts`), `components/` (`ui/`
for shadcn, `charts/`, `layout/`), `hooks/`, `lib/`, `routes/`, `schemas/`, `store/`, `test/`,
`__tests__/routes/`, `types/`.

**Conventions**
- Functional components only. No business logic in components; extract it to `src/hooks/`.
- All API calls go through `src/api/client.ts` (Axios with JWT header and silent 401 refresh).
- Server state lives only in TanStack Query. Query keys are constants in `src/api/queryKeys.ts`.
  Mutations invalidate the affected queries on success.
- Global UI state lives in Zustand stores in `src/store/`, one file per concern, with the `immer`
  middleware. Never put server data in Zustand. Local state uses `useState` / `useReducer`.
- Routing is file-based under `src/routes/`. Use TanStack Router's typed `useParams()` /
  `useSearch()`. Loaders prefetch with `queryClient.ensureQueryData(...)`.
- Forms use React Hook Form + `zodResolver`, with schemas in `src/schemas/` (one file per
  domain) and the shadcn `Form`, `FormField`, `FormItem`, `FormMessage` primitives.
- No `any`. API response types go in `src/types/`, matching the API contract.
- Import with the `@/` alias (`src/`). No relative `../../` imports across feature boundaries.
- Env vars are prefixed `VITE_` and read via `import.meta.env.VITE_*`. Vite loads them from the
  repo-root `.env` (`envDir` in `vite.config.ts`). Only `VITE_` vars reach the browser bundle.

**Styling**
- Tailwind v4 is CSS-first (`@import "tailwindcss"` in `src/index.css`). There is no
  `tailwind.config.js`.
- Merge conditional classes with `cn()` from `src/lib/utils.ts`.
- Theme through the shadcn CSS variables, not arbitrary Tailwind values.
- Add shadcn components with `npx shadcn@latest add <component>`. Do not hand-edit the generated
  files in `src/components/ui/`.

**Base UI gotchas (`@base-ui/react`, not Radix)**
1. No `asChild` and no `<Slot>`. Compose with the `render` prop:
   `<Button render={<Link to="/x" />} />`.
2. No `forwardRef`. React 19 passes `ref` as a normal prop, so `ui/` wrappers spread `{...props}`
   onto the primitive. This is what lets RHF's `{...field}` (which carries a `ref`) bind to
   `<Input>`.
3. `FormControl` merges ARIA/id props onto its child with `useRender`, so it must wrap exactly
   one React element: `<FormControl><Input {...field} /></FormControl>`.

**Utilities**
- Dates: always through the `src/lib/date.ts` wrappers, never `date-fns` directly in components.
- Charts: ECharts through the lazy-loaded `src/components/charts/EChart.tsx` wrapper (keep it
  code-split), or Recharts inline for light SVG charts.
- Markdown / LLM output: render with `src/components/Markdown.tsx`.

**Testing**
- Environment is `happy-dom`. `src/test/setup.ts` loads jest-dom, starts the MSW server, and
  polyfills `localStorage` (Node 25+ ships a stub that shadows the DOM one).
- Mock HTTP with MSW (default handlers in `src/test/handlers.ts`, override with
  `server.use(...)`) or mock Axios at module level. Never make real HTTP calls.
- Co-locate tests with the code they test (`Button.test.tsx` next to `button.tsx`). Route tests
  live in `src/__tests__/routes/`. Zod schemas get plain unit tests.

---

## Docs (`docs/`)

`docs/` is the source of truth for project knowledge. Docs travel with code in the same change.

| Folder | Holds |
|---|---|
| `docs/standards/` | Conventions and the API contract |
| `docs/guides/` | Step-by-step how-tos: setup, onboarding, Celery |
| `docs/explanations/` | Design rationale and background |
| `docs/plans/` | Plan lifecycle, `future/` target-state docs, frozen `completed/` archive |

- A new or changed endpoint updates `docs/standards/api-contracts.md`. Each entry gives the
  method and path, auth (public or authenticated), request body, response shape with status
  codes, and error responses.
- Changed setup steps update `docs/guides/local-setup.md`.
- A new backend app or frontend module gets an explanation or guide.
- Design decisions that outlive a plan go in `docs/explanations/`, linking the plan issue.
- Write for the next developer: assume no prior context, use tables for structured data and
  code blocks for commands.
- If you find an outdated doc, fix it in the same change.

---

## Plans (GitHub issues)

Any change touching more than one file needs a plan issue before implementation. The full
lifecycle and `gh` commands are in [`docs/plans/README.md`](docs/plans/README.md).

- Create the issue from [`.github/ISSUE_TEMPLATE/plan.md`](.github/ISSUE_TEMPLATE/plan.md) with
  labels `plan` + `status: draft`.
- Plans are phased. Each phase is **stable**: it leaves the repo working (migrations applied,
  existing suites green, nothing half-wired).
- Each phase has a **Validation** block naming the tests (file + test name) and manual steps that
  prove it landed. Progress is measured by those checks passing. If a step can only be verified
  after a later phase, merge it into that phase.
- Each plan also has a plan-level **Testing** section for cross-cutting strategy and the
  end-to-end walkthrough.
- When work starts, swap `status: draft` for `status: in-progress`.
- When a phase lands, tick its boxes in the issue body and comment with the validation results.
- When all phases are done, close the issue as completed (`Closes #<n>` in the final PR, or
  `gh issue close <n> --reason completed`). Close abandoned plans as `not planned` with a reason.
- Reference the issue (`#<n>`) in related commits and PRs. Never delete plan issues.
- `docs/plans/future/` holds target-state docs, not tasks. When an increment starts, set the
  issue's **Source** to the future doc and note the issue number in that doc.
- Do not add files to `docs/plans/completed/`.

---

## General rules

- Backend and frontend communicate only through the API contract. Never mix their concerns.
- Never commit `.env` files. `.env.example` is the source of truth for required vars.
- There is exactly one env file: `.env` in the repo root, from `.env.example` (`just env-init`).
  Django, Vite, docker-compose (`env_file`), direnv (`backend/.envrc`) and VS Code all read it.
  Do not add per-folder `.env` files. Add new vars to the root `.env.example`, grouped under the
  backend or frontend heading.
- Prefer explicit, readable code over clever code.

## Never do without explicit confirmation

- Git: `commit`, `push` (any form), `reset --hard`, `rebase` / `merge` on shared branches,
  `branch -D`.
- Files: `rm -rf` on non-temporary directories, deleting migration files.
- Infrastructure: `docker compose down -v` (destroys DB volumes), editing shared `.env` files.
- Process: bypassing hooks (`--no-verify`), dropping or truncating tables directly.

`.claude/settings.json` allows all `Bash(*)` commands to keep the dev loop free of prompts.
The list above still applies. The allowlist removes prompts, not judgement.
