# Features

What TransitOps does, by area. Every action is validated on the backend and scoped by the user's role.

## Authentication & access control

- JWT login for four seeded roles (Fleet Manager, Dispatcher, Safety Officer, Financial Analyst).
- **Role-based access control** enforced server-side and mirrored in the UI — each role sees only its
  screens, and write actions are hidden for view-only roles. A blocked request returns 403 even if the
  UI is bypassed.

## Vehicle registry

- Create, edit, and retire vehicles; filter by type/status/region and search by registration number.
- Unique registration number enforced (duplicate → clear inline error).
- Retiring a vehicle removes it from the dispatch pool automatically.

## Drivers & safety

- Create and manage driver profiles: license number, category, expiry, contact, safety score, trips
  completed.
- License-expiry tracking with a red **EXPIRED** tag; expired or suspended drivers are blocked from
  trips.
- Status toggle (Available / Off Duty / Suspended); "On Trip" is system-managed and can't be set by hand.

## Trip dispatcher

- Lifecycle board: Draft → Dispatched → Completed / Cancelled, filtered by tab.
- Create a trip, assign an available vehicle and driver (only eligible ones appear), and dispatch.
- **Live capacity check** — cargo over the vehicle's limit shows "Capacity exceeded by N kg" and
  disables dispatch before the request is even sent.
- Dispatch sets both vehicle and driver to On Trip; complete records the odometer and fuel and returns
  both to Available; cancel restores them.

## Maintenance

- Log service records against a vehicle (type, cost, date, Active/Completed).
- Opening an **Active** record moves the vehicle to In Shop and out of the dispatch pool; closing it
  returns the vehicle to Available (unless retired) — all automatic.

## Fuel & expenses

- Log fuel (with optional trip link) and other expenses (toll / misc).
- **Total operational cost** (fuel + maintenance) is computed on the server and shown as a live footer —
  never calculated in the browser.

## Dashboard & analytics

- Dashboard KPIs — active/available vehicles, in maintenance, active/pending trips, drivers on duty,
  fleet utilization — with type/status/region filters and a live recent-trips feed.
- Analytics: fuel efficiency, fleet utilization, operational cost, and **per-vehicle ROI**
  (Revenue − (Maintenance + Fuel)) / Acquisition Cost.

## The 10 business rules

All enforced in `backend/app/rules.py` + the routers, and covered by `backend/test_rules.py`:

1. Unique vehicle registration
2. Retired / In-Shop vehicles hidden from dispatch
3. Expired / Suspended drivers blocked from trips
4. On-Trip vehicle or driver can't take another trip
5. Cargo must not exceed vehicle capacity
6. Dispatching sets vehicle **and** driver to On Trip
7. Completing returns both to Available (and writes a fuel log)
8. Cancelling a dispatched trip restores both to Available
9. Creating an active maintenance record sets the vehicle In Shop
10. Closing maintenance returns the vehicle to Available (unless retired)

---

## Bonus — extras beyond the core requirements

- **Charts** — monthly-revenue and top-costliest-vehicle bar charts (Recharts), following real dataviz
  conventions.
- **CSV & PDF export** — per-vehicle cost/ROI report downloadable in both formats.
- **Dark mode** — full light/dark theming that persists, including chart palettes tuned per theme.
- **Search, filter & sort** — reusable across every data table (client-side, instant).
- **Responsive design** — works down to mobile; the sidebar collapses to a drawer, cards and tables
  reflow.
- **Live cross-screen updates** — a dispatch or maintenance action instantly updates the dashboard KPIs
  and dispatch pool without a refresh.
- **Rules test suite** — the 10 mandatory rules are covered by an automated test (`uv run pytest`).
