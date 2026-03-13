# Architecture

## Overview

This project is a **decoupled monorepo**: a Django REST Framework backend and a React SPA frontend, developed and deployed independently, communicating exclusively over HTTP.

```
┌──────────────────────────────────────────────────────────────┐
│                        Monorepo root                         │
│                                                              │
│  ┌─────────────────────┐    HTTP/JSON    ┌────────────────┐  │
│  │   frontend/         │ ─────────────► │   backend/     │  │
│  │   React SPA         │ ◄──────────── │   DRF API      │  │
│  │   (Vite, TS)        │                │   (Django)     │  │
│  └─────────────────────┘                └───────┬────────┘  │
│                                                  │           │
│                                         ┌────────▼────────┐ │
│                                         │   PostgreSQL    │ │
│                                         └─────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

The two applications **share no code**. The API contract (documented in `docs/standards/api-contracts.md`) is the only interface between them.

---

## Backend Structure

```
backend/
├── core/                  Django project package
│   ├── settings/
│   │   ├── base.py        Shared settings for all environments
│   │   ├── dev.py         Development overrides (SQLite fallback, DEBUG=True)
│   │   ├── prod.py        Production overrides
│   │   └── test.py        Test runner settings
│   ├── urls.py            Root URL configuration
│   ├── wsgi.py
│   └── asgi.py
├── apps/                  All domain applications
│   ├── accounts/          User model, registration, profile
│   │   ├── models.py      CustomUser (UUID PK, extends AbstractUser)
│   │   ├── serializers.py Request/response shapes
│   │   ├── services.py    Business logic (user creation, etc.)
│   │   ├── views.py       Class-based API views
│   │   └── urls.py
│   └── pages/             Infrastructure endpoints
│       └── views.py       /api/health/ liveness check
├── manage.py
├── pyproject.toml         Python dependencies (managed by uv)
└── .env.example
```

### Key design decisions

**One app per domain.** Each `apps/<name>/` package owns a single bounded domain. Cross-domain dependencies go through service functions, not direct model imports from another app.

**Business logic in `services.py`.** Views delegate to service functions — they never contain business rules. This keeps views thin and services testable in isolation.

**Split settings.** `base.py` contains all environment-agnostic config. Each environment file imports from `base` and overrides only what it needs. The active settings module is selected via `DJANGO_SETTINGS_MODULE`.

**UUID primary keys.** All models use `UUIDField(default=uuid4)` as the primary key to avoid exposing sequential integer IDs in the API.

---

## Frontend Structure

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts      Axios instance — base URL, JWT interceptor
│   │   ├── auth.ts        Auth API call functions
│   │   └── queryKeys.ts   Centralised TanStack Query key constants
│   ├── components/        Shared / reusable UI components
│   ├── hooks/             Custom hooks encapsulating business logic
│   │   └── useAuth.ts     Auth state, login, logout
│   ├── routes/            TanStack Router file-based routes
│   │   ├── __root.tsx     Root layout
│   │   ├── index.tsx      Home page
│   │   └── login.tsx      Login page
│   ├── types/
│   │   └── auth.ts        TypeScript types matching API contracts
│   └── main.tsx           App entry point (QueryClient, RouterProvider)
├── vite.config.ts
└── package.json
```

### Key design decisions

**TanStack Router for routing.** Routes are file-based under `src/routes/`. The router generates a fully type-safe route tree. Route loaders prefetch data via the QueryClient before the component renders.

**TanStack Query for server state.** All data fetched from the API lives in the Query cache. Components never manage async loading/error state manually — they call `useQuery` or `useMutation`.

**Axios interceptor for JWT.** A single Axios instance in `client.ts` attaches `Authorization: Bearer <token>` headers and handles silent token refresh on 401 responses. No component ever touches tokens directly.

**No business logic in components.** Components render UI. All logic (auth checks, data transformation, API calls) lives in hooks under `src/hooks/`.

---

## Data Flow

### Authenticated request flow

```
Component
  └─► useQuery / useMutation
        └─► API function (src/api/)
              └─► Axios client (src/api/client.ts)
                    ├─ attaches Authorization header
                    └─► /api/<endpoint>/ (Django backend)
                              └─► DRF view
                                    └─► service function
                                          └─► Django ORM → PostgreSQL
```

### Response flows back up the same chain, populating the Query cache, which triggers React re-renders.

---

## Environment Configuration

| Variable | Where | Purpose |
|----------|-------|---------|
| `SECRET_KEY` | `backend/.env` | Django secret key |
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection string |
| `DJANGO_SETTINGS_MODULE` | `backend/.env` | Which settings file to load |
| `CORS_ALLOWED_ORIGINS` | `backend/.env` | Frontend origin(s) allowed cross-origin |
| `VITE_API_BASE_URL` | `frontend/.env` | Backend base URL for Axios |

All secrets and environment-specific config live in `.env` files that are **never committed**. Use `.env.example` as the template.
