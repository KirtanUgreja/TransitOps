# TransitOps — Smart Transport Operations Platform

Fleet, driver, trip-dispatch, maintenance, and fuel/expense management with server-enforced business
rules and role-based access control. Built for an 8-hour hackathon.

- **Backend:** FastAPI + SQLAlchemy 2.0 (uv-managed) → `:8000`
- **Frontend:** Next.js 16 (App Router, TS, Tailwind, shadcn) → `:3000`
- **Database:** Postgres 16 in Docker → `:5432`

Only the backend talks to Postgres; the frontend calls the JWT-authenticated API. All 10 mandatory
business rules are enforced server-side.

## Prerequisites

- Docker (for Postgres)
- [uv](https://docs.astral.sh/uv/) (Python 3.12)
- Node 20+

## Run it (3 commands)

```bash
cd database && docker compose up -d                    # Postgres on :5432
cd backend  && uv run uvicorn app.main:app --reload    # API on :8000 (creates tables + seeds on startup)
cd frontend && npm install && npm run dev              # UI on :3000
```

Open http://localhost:3000 and sign in with any demo account below.

## Demo accounts

All passwords are `demo1234`.

| Email | Role | Sees |
|---|---|---|
| fleet@transitops.in | Fleet Manager | Fleet, Drivers, Maintenance, Analytics, Settings (+ read Trips/Fuel) |
| dispatch@transitops.in | Dispatcher | Dashboard, Trips (+ read Fleet/Drivers) |
| safety@transitops.in | Safety Officer | Drivers (+ read Trips) |
| finance@transitops.in | Financial Analyst | Fuel & Expenses, Analytics (+ read Fleet/Trips/Maintenance) |

## Feature checklist (PDF deliverables)

- **Vehicle registry** — CRUD, unique registration, retire, filter/search/sort
- **Driver profiles** — CRUD, license-expiry tracking, status toggle, safety score
- **Trip dispatcher** — draft → dispatch → complete/cancel, live capacity check
- **Maintenance** — service logs with automatic In-Shop / Available status flips
- **Fuel & expenses** — logging with auto operational-cost totals
- **Dashboard & analytics** — KPIs, ROI, fuel efficiency, monthly revenue & costliest-vehicle charts
- **Exports** — per-vehicle cost/ROI as CSV and PDF
- **RBAC** — four roles, enforced server-side and mirrored in the UI
- **Bonus** — recharts, dark mode, search/filter/sort, PDF export

## The 10 business rules

All in `backend/app/rules.py` + the routers, covered by `backend/test_rules.py`:

```bash
cd backend && uv run pytest test_rules.py
```

1. Unique vehicle registration · 2. Retired/In-Shop hidden from dispatch · 3. Expired/Suspended drivers blocked ·
4. On-Trip vehicle/driver can't take another trip · 5. Cargo ≤ capacity · 6. Dispatch → both On Trip ·
7. Complete → both Available (+ fuel log) · 8. Cancel dispatched → both Available ·
9. Active maintenance → In Shop · 10. Close maintenance → Available (unless Retired).

## Deferred work

See [`future.md`](future.md).
