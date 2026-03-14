# Copilot Instructions

## Project Overview
This is a monorepo containing a decoupled web application:
- `backend/` — Django REST Framework API (Python) with PostgreSQL
- `frontend/` — React SPA built with Vite (TypeScript) with TanStack Query + TanStack Router

The backend exposes only API endpoints. The frontend consumes them via HTTP.
They are developed and deployed independently.
add_fieldsets
---

## Backend (`backend/`)

**Stack:** Python, Django, Django REST Framework, PostgreSQL, psycopg2, JWT auth (simplejwt), django-environ

**Conventions:**
- All endpoints are prefixed with `/api/`
- Use class-based views (APIView or ViewSets) over function-based views
- Serializers live in `serializers.py`, business logic in `services.py`, not in views
- Use `get_object_or_404` and DRF's exception handling — never raw try/except for HTTP errors
- All responses use DRF's `Response` object — never `JsonResponse`
- Models use UUIDs as primary keys (`models.UUIDField(default=uuid.uuid4, editable=False)`)
- Use `select_related` / `prefetch_related` to avoid N+1 queries
- Database migrations live in `apps/<appname>/migrations/` — always run `makemigrations` after model changes
- Environment config via `django-environ` — never hardcode secrets or DB credentials

**Database:**
- PostgreSQL via `psycopg2-binary`
- Connection configured entirely through `DATABASE_URL` env var
- Use `django.db.models.indexes` for frequently queried fields
- Prefer `bulk_create` / `bulk_update` for batch operations

**Auth:** JWT via `rest_framework_simplejwt`. Protected routes use `IsAuthenticated` permission class.

**Settings pattern:**
```python
import environ
env = environ.Env()
environ.Env.read_env()

DATABASES = {
    'default': env.db('DATABASE_URL')
}
```

---

## Frontend (`frontend/`)

**Stack:** React 18, TypeScript, Vite, TanStack Router, TanStack Query v5, Axios

**Conventions:**
- Functional components only — no class components
- All API calls go through `src/api/client.ts` (Axios instance with JWT interceptor)
- **Server state** managed exclusively by TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`)
- **Routing** managed by TanStack Router — file-based routes under `src/routes/`
- **Local/UI state** managed by `useState` / `useReducer` — never use Query for UI-only state
- Co-locate component styles, tests, and types in the same folder as the component
- No business logic in components — extract to custom hooks in `src/hooks/`
- Use TypeScript strictly — no `any`, define response types from API contracts in `src/types/`
- Query keys are defined as constants in `src/api/queryKeys.ts`

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

**Env vars:** Prefix with `VITE_`. Access via `import.meta.env.VITE_*`.

---

## Monorepo Structure

```
/
├── backend/
│   ├── core/                  # Django project (settings, urls, wsgi)
│   ├── apps/                  # Django apps (one per domain)
│   │   └── <appname>/
│   │       ├── models.py
│   │       ├── serializers.py
│   │       ├── services.py
│   │       ├── views.py
│   │       ├── urls.py
│   │       └── migrations/
│   ├── manage.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios client, endpoint functions, queryKeys
│   │   ├── components/        # Shared/reusable UI components
│   │   ├── hooks/             # Custom hooks (business logic)
│   │   ├── routes/            # TanStack Router file-based routes
│   │   ├── types/             # Shared TypeScript types from API contracts
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── standards/             # Coding standards, style guides, conventions
│   ├── guides/                # How-to guides, onboarding, setup instructions
│   ├── plans/                 # Architecture decisions, feature plans, roadmaps
│   └── explanations/          # Concept explanations, design rationale, ADRs
├── docker-compose.yml         # PostgreSQL + backend + frontend for local dev
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
- `docs/plans/` — Architecture decisions (ADRs), feature plans, roadmaps, spike notes
- `docs/explanations/` — Concept explanations, design rationale, background context

**Rules:**
- When a feature, API endpoint, or architectural pattern is added or changed, update the relevant doc in `docs/` as part of the same change
- New backend apps or frontend modules should have a corresponding explanation or guide in `docs/`
- API contract changes (new endpoints, modified request/response shapes) must be reflected in `docs/standards/`
- Architecture or design decisions must be recorded as an ADR in `docs/plans/`
- Docs are written for the next developer — assume no prior context

---

## General Rules
- Never mix backend and frontend concerns — they communicate only via the API contract
- Never commit `.env` files — use `.env.example` as the source of truth for required vars
- All DB access goes through Django ORM — never raw SQL unless absolutely necessary, and always parameterised
- Prefer explicit over implicit — readable code over clever code
- Write for the next developer, not just for today
- Keep `docs/` up to date — code changes and doc changes travel together
