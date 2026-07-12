# Getting Started — Run TransitOps Locally

Three services: **Postgres** (Docker), **backend** (FastAPI), **frontend** (Next.js). Only the backend
talks to the database; the frontend calls the backend's JWT-authenticated API.

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker | any recent | [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Mac & Windows) |
| uv | latest | Python package manager, see below |
| Node | 20+ | [nodejs.org](https://nodejs.org/) |

Install **uv**:

- **macOS / Linux:** `curl -LsSf https://astral.sh/uv/install.sh | sh`
- **Windows (PowerShell):** `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

uv brings its own Python 3.12 — no separate Python install needed.

## Environment variables (optional)

Every variable has a working default that matches the local setup below, so you can skip this for a
plain local run. To override, copy the example files:

| Example | Copy to | Holds |
|---|---|---|
| `backend/.env.example` | `backend/.env` | `DATABASE_URL`, `JWT_SECRET`, `CLERK_ISSUER` |
| `frontend/.env.example` | `frontend/.env.local` | `NEXT_PUBLIC_API_URL`, Clerk keys |

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

The real `.env` / `.env.local` files are git-ignored; only the `.example` files are committed.

### Clerk (admin sign-in) — optional

The demo and issued-credential logins work with no Clerk setup. To enable the **Admin sign-in (Clerk)**
button, add your own Clerk instance:

1. Create an app at [dashboard.clerk.com](https://dashboard.clerk.com/) and run `clerk init` in
   `frontend/` (it writes the publishable + secret keys into `frontend/.env.local`).
2. Set `CLERK_ISSUER` in `backend/.env` to your Clerk Frontend API URL
   (e.g. `https://<subdomain>.clerk.accounts.dev`) so the backend can verify Clerk tokens.

A Clerk user is provisioned as a **Fleet Manager** on first sign-in; from Settings they create the
other roles' accounts.

## Run it (three terminals)

Start each service in its own terminal. Ports: Postgres `5432`, backend `8000`, frontend `3000`.

### 1. Database (Postgres in Docker)

```bash
cd database
docker compose up -d
```

Wait until the container is healthy (`docker ps` shows `healthy`). Data persists in a named Docker
volume between restarts.

### 2. Backend (FastAPI)

**macOS / Linux:**
```bash
cd backend
uv run uvicorn app.main:app --reload
```

**Windows (PowerShell):**
```powershell
cd backend
uv run uvicorn app.main:app --reload
```

On first boot the backend creates all tables and seeds demo data automatically (idempotent — restarts
won't duplicate it). Confirm it's up: open http://localhost:8000/health → `{"status":"ok"}`.

### 3. Frontend (Next.js)

```bash
cd frontend
npm install      # first run only
npm run dev
```

Open **http://localhost:3000** and sign in.

## Demo accounts

All passwords are `demo1234`. Each role sees a different slice of the app (enforced server-side).

| Email | Role | Sees |
|---|---|---|
| fleet@transitops.in | Fleet Manager | Fleet, Drivers, Maintenance, Analytics, Settings (+ read Trips/Fuel) |
| dispatch@transitops.in | Dispatcher | Dashboard, Trips (+ read Fleet/Drivers) |
| safety@transitops.in | Safety Officer | Drivers (+ read Trips) |
| finance@transitops.in | Financial Analyst | Fuel & Expenses, Analytics (+ read Fleet/Trips/Maintenance) |

## Run the tests

The 10 mandatory business rules plus the smart-heuristic helpers (recommended dispatch, service-due,
fuel anomalies) are covered by a test suite (no Docker needed — the rule tests use in-memory SQLite,
the heuristic tests are pure functions):

```bash
cd backend
uv run pytest          # whole suite
uv run pytest test_rules.py   # just the 10 mandatory rules
```

## Troubleshooting

- **`docker compose` fails / "cannot connect to the Docker daemon"** — Docker Desktop isn't running. Open it and wait for the whale icon to settle, then retry.
- **Backend can't reach Postgres** — make sure step 1's container is `healthy` first. The default connection string points at `localhost:5432` with user/password/db all `transitops`.
- **Port already in use** — something else is on 3000/8000/5432. Stop it, or change the port (`uvicorn ... --port 8001`, `npm run dev -- -p 3001`).
- **Frontend loads but calls fail** — the backend must be running on `:8000`. The frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).
