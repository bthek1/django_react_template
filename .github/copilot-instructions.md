# Copilot Instructions

> This file describes the project conventions for GitHub Copilot. [`CLAUDE.md`](../CLAUDE.md)
> is the Claude Code counterpart and covers the same conventions — keep the two in sync.

## Project Overview
This is a **template** for new Django + DRF + React projects. It is a monorepo containing a
decoupled web application:
- `backend/` — Django REST Framework API (Python) with PostgreSQL and Celery
- `frontend/` — React SPA built with Vite (TypeScript) with TanStack Query + TanStack Router, Tailwind CSS, shadcn/ui, React Hook Form + Zod, Zustand, Vitest

The backend exposes only API endpoints. The frontend consumes them via HTTP.
They are developed and deployed independently.

Because this is a starter template, keep everything generic and reusable — avoid hardcoding
project-specific names or data, and prefer documented conventions over one-off solutions.

---

## Backend (`backend/`)

**Stack:** Python 3.13, Django 5.1+, Django REST Framework, PostgreSQL, psycopg3, JWT auth (simplejwt), Celery + Redis (async tasks), django-environ, uv (package manager), ruff (lint/format), mypy (type checking), pytest + pytest-django

**Conventions:**
- All endpoints are prefixed with `/api/`
- Use class-based views (`APIView`, `generics.*`, or `ViewSet`) over function-based views
- Serializers live in `serializers.py`, business logic in `services.py`, not in views
- Use `get_object_or_404` and DRF's exception handling — never raw try/except for HTTP errors
- All responses use DRF's `Response` object — never `JsonResponse`
- Models use UUIDs as primary keys (`models.UUIDField(default=uuid.uuid4, editable=False)`)
- Use `select_related` / `prefetch_related` to avoid N+1 queries
- Database migrations live in `apps/<appname>/migrations/` — always run `makemigrations` after model changes
- Environment config via `django-environ` — never hardcode secrets or DB credentials
- `AUTH_USER_MODEL = "accounts.CustomUser"` — always use `get_user_model()`, never import `User` directly

**Auth model:** `CustomUser` extends `AbstractUser` with email as `USERNAME_FIELD` (no `username` field).
```python
# Correct — get the custom user model
from django.contrib.auth import get_user_model
User = get_user_model()
```

**Database:**
- PostgreSQL via `psycopg[binary]` (psycopg3)
- Connection configured entirely through `DATABASE_URL` env var
- Use `django.db.models.indexes` for frequently queried fields
- Prefer `bulk_create` / `bulk_update` for batch operations

**Auth:** JWT via `rest_framework_simplejwt`. Protected routes use `IsAuthenticated` permission class.
Token endpoints: `POST /api/token/` and `POST /api/token/refresh/`.

**Settings:** Split into `core/settings/base.py`, `dev.py`, `prod.py`, `test.py`.
```python
# base.py pattern
import environ
env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

DATABASES = {'default': env.db('DATABASE_URL')}
AUTH_USER_MODEL = "accounts.CustomUser"
```

**Testing:**
- Run with `just be-test` or `cd backend && uv run pytest`
- Test settings: `DJANGO_SETTINGS_MODULE = "core.settings.test"` (SQLite, fast password hasher)
- Use `factory-boy` + `faker` for fixtures, `freezegun` for time mocking
- Fixtures go in `conftest.py` (app-level or root `backend/conftest.py`)
- Test markers: `slow`, `integration`, `development`
- Coverage: `just be-test-cov`

**Code quality:**
- Lint: `just be-lint` (`ruff check`)
- Format: `just be-fmt` (`ruff format`)
- Type check: `uv run mypy .`

**API docs:** `drf-spectacular` is installed. Schema at `/api/schema/`, Swagger UI at `/api/schema/swagger-ui/`.

**Async tasks — Celery:**
- Broker is Redis; results are stored in Postgres via `django-celery-results` (`CELERY_RESULT_BACKEND = "django-db"`)
- Periodic schedules are managed in Django admin via `django-celery-beat` (`DatabaseScheduler`)
- The Celery app lives in `core/celery.py`; tasks live in `apps/<appname>/tasks.py` and are auto-discovered
- Define tasks with `@shared_task` so they don't import the app instance directly
- Run locally with `just celery-up` (worker + beat via Docker) or `just celery-worker` (worker outside Docker); `just flower` starts the Flower monitoring UI on port 5555
- Full setup and the DRF dispatch/poll/revoke pattern: `docs/guides/celery_setup.md`

---

## Frontend (`frontend/`)

**Stack:** React 18, TypeScript, Vite, TanStack Router, TanStack Query v5, Axios, Tailwind CSS v4, shadcn/ui, React Hook Form, Zod, Zustand, Vitest, date-fns, Plotly.js

**Conventions:**
- Functional components only — no class components
- All API calls go through `src/api/client.ts` (Axios instance with JWT interceptor)
- **Server state** managed exclusively by TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`)
- **Global/UI state** managed by Zustand stores in `src/store/` — never store server data in Zustand
- **Routing** managed by TanStack Router — file-based routes under `src/routes/`
- **Local component state** managed by `useState` / `useReducer`
- Co-locate component tests in the same folder as the component (`ComponentName.test.tsx`)
- No business logic in components — extract to custom hooks in `src/hooks/`
- Use TypeScript strictly — no `any`, define response types from API contracts in `src/types/`
- Query keys are defined as constants in `src/api/queryKeys.ts`
- Use `cn()` from `src/lib/utils.ts` for all conditional `className` merging (wraps `clsx` + `tailwind-merge`)
- All path imports use the `@/` alias (resolves to `src/`) — never use relative `../../` imports across feature boundaries
- shadcn/ui components live in `src/components/ui/` — copy-paste via `npx shadcn@latest add <component>`, never modify generated files directly

**Styling — Tailwind CSS + shadcn/ui:**
```ts
// src/lib/utils.ts — always use cn() for conditional classes
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```
- Tailwind CSS v4: CSS-first config via `@import "tailwindcss"` in `src/index.css` — no `tailwind.config.js`
- shadcn/ui uses CSS variables for theming — do not override them with arbitrary Tailwind values
- Install new shadcn/ui components with `npx shadcn@latest add <component>`

**Forms — React Hook Form + Zod:**
```ts
// Define schema in src/schemas/<domain>.ts
import { z } from 'zod'
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
export type LoginSchema = z.infer<typeof loginSchema>

// Use in component
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
const form = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) })
```
- Zod schemas live in `src/schemas/` (one file per domain)
- Always use shadcn/ui `Form`, `FormField`, `FormItem`, `FormMessage` primitives — they wrap RHF context

**Global state — Zustand:**
```ts
// src/store/ui.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(immer((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set((s) => { s.sidebarOpen = open }),
})))
```
- One file per concern: `src/store/ui.ts`, `src/store/auth.ts`, etc.
- Use `immer` middleware for state mutations
- Never put server-fetched data in Zustand — that belongs in TanStack Query

**TanStack Query patterns:**
```ts
// Always define query keys centrally
export const queryKeys = {
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
  },
}

// Mutations always invalidate relevant queries on success
const mutation = useMutation({
  mutationFn: createUser,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
  },
})
```

**TanStack Router patterns:**
```ts
// Routes are type-safe — use useParams(), useSearch() from TanStack Router
// Loaders fetch data before render using the QueryClient
export const Route = createFileRoute('/users/$userId')({
  loader: ({ params }) =>
    queryClient.ensureQueryData(userDetailQuery(params.userId)),
  component: UserDetail,
})
```

**Testing — Vitest + React Testing Library:**
- Run with `just fe-test` or `cd frontend && npm test`
- Test environment: `jsdom` (configured in `vite.config.ts`)
- Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom`)
- Co-locate tests with the component/hook they test: `Button.test.tsx` next to `Button.tsx`
- Mock Axios at the module level — never make real HTTP calls in tests
- Zod schemas are tested as pure unit tests (no DOM)

**Utilities:**
- Date formatting: `date-fns` — always import via `src/lib/date.ts` wrappers, never call `date-fns` directly in components
- Charts: `plotly.js-dist-min` — always via the `src/components/charts/PlotlyChart.tsx` wrapper, always lazy-loaded

**Env vars:** Prefix with `VITE_`. Access via `import.meta.env.VITE_*`.

**Commands:**
- Dev server: `just fe-dev`
- Build: `just fe-build`
- Lint: `just fe-lint`
- Test: `just fe-test`
- Test UI: `just fe-test-ui`
- Install deps: `just fe-install`

---

## Task Runner (`justfile`)

All common tasks are defined in the root `justfile`. Use `just --list` to see all commands.

Key commands:
| Command | Description |
|---|---|
| `just up` | Start all Docker services |
| `just be-dev` | Run Django dev server locally (runs migrations first) |
| `just be-test` | Run backend test suite |
| `just be-test-cov` | Run backend tests with coverage |
| `just be-makemigrations` | Create new migrations |
| `just be-migrate` | Apply migrations |
| `just be-lint` / `just be-fmt` | Lint / format backend |
| `just fe-dev` | Run Vite dev server locally |
| `just fe-build` | Production build |
| `just fe-test` | Run frontend test suite |
| `just fe-test-ui` | Run frontend tests with Vitest UI |
| `just be-startapp name` | Scaffold a new Django app |

---

## Monorepo Structure

```
/
├── backend/
│   ├── core/
│   │   ├── settings/          # base.py, dev.py, prod.py, test.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/                  # Django apps (one per domain)
│   │   ├── accounts/          # CustomUser, JWT auth endpoints
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── services.py
│   │   │   ├── views.py
│   │   │   ├── urls.py
│   │   │   └── migrations/
│   │   └── pages/             # Health check and static page endpoints
│   ├── conftest.py            # Root pytest fixtures
│   ├── manage.py
│   ├── pyproject.toml         # Dependencies (uv), pytest, ruff config
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client, endpoint functions, queryKeys
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui copy-paste components
│   │   │   └── charts/        # PlotlyChart wrapper (lazy-loaded)
│   │   ├── hooks/             # Custom hooks (business logic)
│   │   ├── lib/               # Shared utilities: cn(), date wrappers
│   │   ├── routes/            # TanStack Router file-based routes
│   │   ├── schemas/           # Zod validation schemas (one file per domain)
│   │   ├── store/             # Zustand stores (one file per concern)
│   │   ├── test/              # Vitest setup file
│   │   ├── types/             # Shared TypeScript types from API contracts
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── standards/             # Coding standards, style guides, conventions, API contracts
│   ├── guides/                # How-to guides, onboarding, local setup, deployment
│   ├── plans/                 # Feature plans, ADRs, roadmaps (phased, with testing)
│   └── explanations/          # Concept explanations, design rationale, background context
├── justfile                   # Task runner (use `just --list`)
├── docker-compose.yml
└── README.md
```

---

## Docker Compose (local dev)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppassword
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    ports:
      - "8000:8000"
    depends_on:
      - db
    env_file:
      - ./backend/.env

  frontend:
    build: ./frontend
    command: npm run dev
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
```

---

## Docs (`docs/`)

The `docs/` folder is the single source of truth for project knowledge. It is kept in sync with the codebase.

**Structure:**
- `docs/standards/` — Coding standards, style guides, naming conventions, API contracts
- `docs/guides/` — Step-by-step how-to guides, onboarding, local setup, deployment
- `docs/plans/` — Feature plans, ADRs, roadmaps, spike notes
- `docs/explanations/` — Concept explanations, design rationale, background context

**Rules:**
- When a feature, API endpoint, or architectural pattern is added or changed, update the relevant doc in `docs/` as part of the same change
- New backend apps or frontend modules should have a corresponding explanation or guide in `docs/`
- API contract changes (new endpoints, modified request/response shapes) must be reflected in `docs/standards/`
- Architecture or design decisions must be recorded as an ADR in `docs/plans/`
- Docs are written for the next developer — assume no prior context

---

## Planning Rules (`docs/plans/`)

Every non-trivial feature or change must have a plan file before implementation begins.

**File naming:** `docs/plans/<feature-name>.md`

**Required plan structure:**
```markdown
# Plan: <Feature Name>

**Status:** Draft | In Progress | Complete
**Date:** YYYY-MM-DD

---

## Goal
One paragraph describing what this plan achieves and why.

## Background
Context and motivation. What problem does this solve?

## Phases

### Phase 1 — <Name>
- [ ] Task 1
- [ ] Task 2

### Phase 2 — <Name>
- [ ] Task 3

## Testing
- Unit tests: what to cover
- Integration tests: what to cover
- Manual verification steps

## Risks & Notes
Any known risks, open questions, or decisions deferred.
```

**Rules:**
- Plans are always phased — break work into discrete, independently deliverable phases
- Every plan must include a **Testing** section covering unit tests, integration tests, and manual steps
- Do not start implementation without a plan for any feature that touches more than one file
- Update plan status (`Draft → In Progress → Complete`) as work progresses
- Completed plans are kept (not deleted) as a record of decisions made

---

## General Rules
- Never mix backend and frontend concerns — they communicate only via the API contract
- Never commit `.env` files — use `.env.example` as the source of truth for required vars
- All DB access goes through Django ORM — never raw SQL unless absolutely necessary, and always parameterised
- Prefer explicit over implicit — readable code over clever code
- Write for the next developer, not just for today
- Keep `docs/` up to date — code changes and doc changes travel together

---

## Absolute Don'ts

These actions must **never** be performed without explicit user confirmation:

**Git operations — never run autonomously:**
- `git commit` — do not commit code on the user's behalf
- `git push` / `git push --force` — do not push to any remote
- `git reset --hard` — destructive, cannot be undone
- `git rebase` / `git merge` on shared branches
- `git branch -D` — do not delete branches

**File system:**
- `rm -rf` on any non-temporary directory
- Deleting migration files

**Infrastructure:**
- Running `docker compose down -v` (destroys DB volumes)
- Modifying shared environment files (`.env`) in-place

**Process:**
- Bypassing pre-commit hooks (`--no-verify`)
- Dropping or truncating database tables directly
