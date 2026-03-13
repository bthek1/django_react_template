# django_react_template

A monorepo starter for a decoupled web application:

- **`backend/`** — Django REST Framework API (Python 3.13, PostgreSQL)
- **`frontend/`** — React 18 SPA (TypeScript, Vite, TanStack Router, TanStack Query)

---

## Quick Start

```bash
# 1. Clone
git clone <repo-url> && cd django_react_template

# 2. Create env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Start everything
docker compose up

# 4. Run migrations (first time)
docker compose exec backend python manage.py migrate
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api/ |
| Django admin | http://localhost:8000/admin/ |
| Health check | http://localhost:8000/api/health/ |

---

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/guides/local-setup.md](docs/guides/local-setup.md) | Full local dev setup (Docker + without Docker) |
| [docs/guides/onboarding.md](docs/guides/onboarding.md) | New developer orientation |
| [docs/standards/api-contracts.md](docs/standards/api-contracts.md) | All API endpoints, request/response shapes |
| [docs/explanations/architecture.md](docs/explanations/architecture.md) | Monorepo structure and design decisions |
| [docs/explanations/auth-flow.md](docs/explanations/auth-flow.md) | JWT auth flow end to end |

---

## Project Structure

```
/
├── backend/          Django REST API
│   ├── core/         Settings, URLs, WSGI
│   ├── apps/         Domain applications
│   │   ├── accounts/ User model, registration, JWT auth
│   │   └── pages/    Health check
│   └── manage.py
├── frontend/         React SPA
│   └── src/
│       ├── api/      Axios client, query keys, API functions
│       ├── hooks/    Custom hooks (auth, etc.)
│       ├── routes/   TanStack Router file-based routes
│       └── types/    TypeScript types from API contracts
├── docs/             Project knowledge base
└── docker-compose.yml
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend language | Python 3.13 |
| Backend framework | Django 5 + Django REST Framework |
| Auth | JWT (`djangorestframework-simplejwt`) |
| Database | PostgreSQL 16 |
| Dependency manager | [uv](https://github.com/astral-sh/uv) |
| Frontend language | TypeScript |
| Frontend bundler | Vite |
| UI framework | React 18 |
| Routing | TanStack Router |
| Server state | TanStack Query v5 |
| HTTP client | Axios |
| Container | Docker Compose |
