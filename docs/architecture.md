# Architecture

## The shape of the system

TransitOps is a three-tier app with a hard security boundary: the browser never touches the database.
The frontend is a pure client of a JWT-authenticated API; the backend is the only process holding a
database connection and the only place business rules are enforced.

```
Browser ──JWT──▶ FastAPI (:8000) ──SQL──▶ Postgres (:5432)
(Next.js :3000)   business rules,          data only
                  RBAC, validation
```

Everything a user can do routes through the backend, which validates it against the ten mandatory
business rules and the role-based access matrix before any row changes. The frontend mirrors those
rules only for user experience — disabling a button, filtering a dropdown — but it is never the
enforcer. If someone bypassed the UI and called the API directly, the same rules would still hold.

## Backend

A FastAPI application organized as thin routers over a single set of SQLAlchemy models. The interesting
design decisions:

- **One place for dispatch rules.** All the trip-dispatch validations (capacity, driver eligibility,
  vehicle availability) live in a single pure function, `validate_dispatch(vehicle, driver, cargo)`,
  which returns the list of every violation. Routers call it; nothing duplicates it. This is what makes
  the rules testable in isolation and impossible to partially forget in one code path.
- **Status transitions are automatic and atomic.** Dispatching a trip flips both the vehicle and the
  driver to "On Trip" in one transaction; completing flips them back and writes a fuel log; opening
  maintenance moves a vehicle to "In Shop" and thereby removes it from the dispatch pool. The rules
  aren't a checklist the user follows — they're consequences the system produces.
- **RBAC as data, not scattered checks.** A single matrix maps each of the four roles to each resource
  (`full` / `view` / none). One dependency, `require(resource, write=?)`, reads that matrix and returns
  403 when access is denied. Adding a role or changing a permission is a one-line edit in one place.
- **Two front doors, one role model.** Clerk (the admin/Fleet Manager) and issued email/password
  credentials (everyone else) are two ways to authenticate, but both converge on the same thing: a
  Postgres user with a role and an app-issued JWT. Clerk owns *identity*; the backend still owns the
  *role*. `/auth/clerk` verifies the Clerk session token against Clerk's JWKS, finds-or-creates the
  user as a Fleet Manager, and returns the normal app JWT — so from that point on, every RBAC check
  and business rule behaves identically regardless of how the user signed in. The Fleet Manager creates
  the other roles' accounts via `/users` (guarded by `require("settings", write=True)`), and the app
  generates a one-time password to hand over.
- **No migrations, on purpose.** For a fresh demo database, `create_all` plus an idempotent seed is
  simpler and faster than Alembic. The tradeoff is no schema evolution on a live DB — acceptable for
  a demo that always boots a fresh database.
- **Decision helpers are pure functions over existing data.** The recommended-assignment
  (`_recommend`), service-due (`_service_due`), and fuel-anomaly (`_fuel_anomalies`) helpers are plain,
  side-effect-free functions that take rows and return ranked results — no ML, no new tables, no new
  infra. Keeping them pure makes each unit-testable without the DB (`test_recommend.py`,
  `test_service_due.py`, `test_fuel_anomaly.py`) and keeps the "why did it pick this?" answer a rule you
  can read, not a model you can't.

## Frontend

A Next.js App Router application. The app shell (sidebar, topbar) is rendered once and filtered by the
user's role using a mirror of the backend's RBAC matrix, so a dispatcher simply never sees the
Maintenance link. Each screen is a client component that fetches through a typed API wrapper; React
Query owns the server state and cache invalidation, so dispatching a trip on one screen immediately
updates the dashboard KPIs and the dispatch pool without a manual refresh.

Forms validate with the same shapes the backend expects (React Hook Form + Zod), and surface backend
errors — a duplicate registration number, a capacity violation — as inline field errors or toasts.
The server stays the source of truth; the client just makes the common cases smooth.

## Data model

Seven tables: `users`, `vehicles`, `drivers`, `trips`, `maintenance_logs`, `fuel_logs`, `expenses`.
Statuses are stored as human-readable strings ("Available", "On Trip", "In Shop") that match the enums
in the models. Two columns exist specifically to power features: `revenue` on trips (for the ROI
calculation) and `region` on vehicles (for the dashboard's regional filter).

`database/schema.sql` and `seed.sql` are generated `pg_dump` mirrors kept for reference — the models
and the Python seed remain the source of truth.

## Tech stack — and why

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | **Next.js 16 (App Router)** | File-system routing and a first-class client/server split; fast to scaffold a multi-screen dashboard. |
| UI | **Tailwind + shadcn/ui** | Accessible primitives we own the source of, styled with utility classes — no fighting a component library's opinions under time pressure. |
| Data fetching | **TanStack React Query** | Caching and invalidation for free; one mutation can refresh every dependent screen, which is exactly what the live dispatch board needs. |
| Forms | **React Hook Form + Zod** | Declarative validation that mirrors the backend schema, with typed inference. |
| Charts | **Recharts** | Composable React charts; enough control to follow real dataviz conventions without a heavy viz toolkit. |
| Backend framework | **FastAPI** | Type-hinted request/response models, automatic validation, and OpenAPI docs out of the box. |
| ORM | **SQLAlchemy 2.0** | Mature, explicit, typed models; full control over the transactions the status-flip rules depend on. |
| App auth | **JWT (PyJWT) + bcrypt** | Stateless app tokens carry the user's role; bcrypt hashes issued passwords. RS256 verification (via `cryptography`) validates Clerk tokens. |
| Admin identity | **Clerk** | Hosted sign-in/sign-up for the admin, verified server-side against Clerk's JWKS and bridged to the app's own JWT — identity managed for us, roles kept in our DB. |
| Database | **Postgres 16** | A real relational database with the constraints (unique registration number) some rules lean on. |
| Python tooling | **uv** | One fast tool for the virtualenv, dependencies, and running — no separate pip/venv dance. |
| Dev database | **Docker Compose** | Postgres in one command on any machine, with a persistent volume and a health check. |
| PDF export | **fpdf2** | Small, dependency-light PDF generation for the analytics report. |

## Request lifecycle (example: dispatching a trip)

1. Dispatcher fills the Create Trip form; the client blocks the Dispatch button if cargo exceeds the
   selected vehicle's capacity (UX mirror of rule 5).
2. `POST /trips?dispatch=true` hits the backend. `require("trips", write=True)` checks the JWT's role
   against the RBAC matrix.
3. `validate_dispatch()` runs every rule and returns all violations; any violation → 422 with the
   messages joined, and nothing is written.
4. On success, one transaction sets the trip to "Dispatched" and both the vehicle and driver to
   "On Trip", and stamps the dispatch time.
5. React Query invalidates the trips, vehicles, dispatch-options, and dashboard queries, so every
   affected screen reflects the change immediately.

## Deferred work

Scoped out of the 8-hour build: user-management edit/deactivate/reset (creation + self-service
password change are done), license-expiry email reminders, vehicle document uploads, Alembic
migrations, and httpOnly-cookie auth. See `future.md` for the full list and how each would be added.
