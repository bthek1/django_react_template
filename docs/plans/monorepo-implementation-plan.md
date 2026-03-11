# Monorepo Implementation Plan

## Overview

This plan covers the steps to migrate the current Django project into the full monorepo structure described in the Copilot instructions, including a Django REST Framework backend, a React/Vite frontend, and a `docs/` knowledge base.

---

## Current State

The repository is a standard Django project with:
- A single `manage.py` at the root
- `django_project/` for settings, urls, wsgi
- `accounts/` and `pages/` Django apps at the root level
- Templates, static files, and migrations co-located at the root
- No API layer, no frontend, no docs structure

---

## Target State

```
/
├── backend/
│   ├── core/                  # Django project (settings, urls, wsgi)
│   ├── apps/                  # Django apps (one per domain)
│   ├── manage.py
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── routes/
│   │   ├── types/
│   │   └── main.tsx
│   ├── vite.config.ts
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── standards/
│   ├── guides/
│   ├── plans/
│   └── explanations/
├── docker-compose.yml
└── README.md
```

---

## Implementation Phases

### Phase 1 — Restructure the Backend

**Goal:** Move the existing Django project into `backend/` and align with conventions.

- [ ] Create `backend/` directory
- [ ] Move `manage.py` → `backend/manage.py`
- [ ] Move `django_project/` → `backend/core/` (settings, urls, wsgi, asgi)
  - [ ] Update `manage.py` to reference `core.settings`
  - [ ] Update `wsgi.py` / `asgi.py` module paths
  - [ ] Update `core/urls.py` import paths
- [ ] Create `backend/apps/` directory
- [ ] Move `accounts/` → `backend/apps/accounts/`
- [ ] Move `pages/` → `backend/apps/pages/`
  - [ ] Update `INSTALLED_APPS` in `core/settings.py` to use new paths (e.g. `apps.accounts`, `apps.pages`)
  - [ ] Update all internal import paths in moved apps
- [ ] Move `templates/` and `static/` into `backend/`
  - [ ] Update `TEMPLATES` and `STATICFILES_DIRS` settings accordingly
- [ ] Move `requirements.txt` → `backend/requirements.txt`
- [ ] Create `backend/.env.example` with all required environment variables
- [ ] Verify Django starts correctly: `python manage.py check`

---

### Phase 2 — Convert Backend to DRF API

**Goal:** Strip out server-rendered views and expose a pure REST API.

- [ ] Add to `backend/requirements.txt`:
  - `djangorestframework`
  - `djangorestframework-simplejwt`
  - `django-environ`
  - `psycopg2-binary`
- [ ] Add `rest_framework` and `rest_framework_simplejwt` to `INSTALLED_APPS`
- [ ] Configure DRF default settings in `core/settings.py` (renderer, authentication, permissions)
- [ ] Configure JWT settings (`SIMPLE_JWT` block)
- [ ] Migrate settings to use `django-environ` — remove hardcoded secrets
- [ ] Refactor `accounts` app:
  - [ ] Replace form/template views with DRF `APIView` or `ViewSet`
  - [ ] Create `accounts/serializers.py`
  - [ ] Create `accounts/services.py` for business logic
  - [ ] Update `accounts/urls.py` — all routes under `/api/accounts/`
  - [ ] Update account models to use `UUIDField` as primary key
  - [ ] Add JWT token endpoints (`/api/token/`, `/api/token/refresh/`)
- [ ] Refactor `pages` app:
  - [ ] Remove template views — add API-only views if needed, or remove app if not applicable
- [ ] Remove `templates/` and `static/` from backend (frontend will own UI)
- [ ] Update root `core/urls.py` to include all API routes under `/api/`
- [ ] Run and fix all migrations
- [ ] Test all endpoints with a REST client

---

### Phase 3 — Scaffold the Frontend

**Goal:** Create a React/Vite/TypeScript SPA that consumes the backend API.

- [ ] Scaffold frontend: `npm create vite@latest frontend -- --template react-ts`
- [ ] Install dependencies:
  - `@tanstack/react-query`
  - `@tanstack/react-router`
  - `axios`
- [ ] Set up project structure:
  - [ ] `src/api/client.ts` — Axios instance with JWT interceptor (reads `VITE_API_BASE_URL`)
  - [ ] `src/api/queryKeys.ts` — centralised query key constants
  - [ ] `src/types/` — TypeScript types matching API contracts
  - [ ] `src/hooks/` — custom hooks directory
  - [ ] `src/components/` — shared UI components
  - [ ] `src/routes/` — TanStack Router file-based routes
- [ ] Configure TanStack Router with root route and basic layout
- [ ] Configure TanStack Query `QueryClientProvider` in `main.tsx`
- [ ] Implement auth flow:
  - [ ] Login page and route (`/login`)
  - [ ] JWT token storage and refresh logic in `client.ts`
  - [ ] Protected route wrapper
- [ ] Create `frontend/.env.example` with `VITE_API_BASE_URL`
- [ ] Verify dev server runs: `npm run dev`

---

### Phase 4 — Docker Compose Integration

**Goal:** Wire backend, frontend, and database together for local development.

- [ ] Update `docker-compose.yml`:
  - [ ] `db` service — PostgreSQL 16
  - [ ] `backend` service — build from `./backend`, run `manage.py runserver`
  - [ ] `frontend` service — build from `./frontend`, run `npm run dev`
- [ ] Create `backend/Dockerfile`
- [ ] Create `frontend/Dockerfile`
- [ ] Set `DATABASE_URL` in `backend/.env` to point to the `db` service
- [ ] Set `VITE_API_BASE_URL` in `frontend/.env` to point to the `backend` service
- [ ] Test full stack: `docker compose up`

---

### Phase 5 — Docs Foundation

**Goal:** Establish the `docs/` structure and seed initial documentation.

- [ ] Create `docs/standards/api-contracts.md` — document all API endpoints, request/response shapes
- [ ] Create `docs/guides/local-setup.md` — step-by-step local dev setup
- [ ] Create `docs/guides/onboarding.md` — new developer orientation
- [ ] Create `docs/explanations/architecture.md` — explain the monorepo structure and separation of concerns
- [ ] Create `docs/explanations/auth-flow.md` — explain JWT auth flow end to end
- [ ] Update `README.md` at the root to reflect the new structure and link to relevant docs

---

## Definition of Done

- [ ] `docker compose up` starts all three services without errors
- [ ] All backend API endpoints respond correctly and are documented in `docs/standards/`
- [ ] Frontend connects to backend, authenticates, and renders data
- [ ] No hardcoded secrets anywhere — all config via env vars
- [ ] All migrations are clean and tracked in version control
- [ ] `docs/` is populated with at minimum: setup guide, API contract, architecture explanation
