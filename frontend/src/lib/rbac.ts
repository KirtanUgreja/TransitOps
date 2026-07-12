// Mirror of backend/app/rbac.py — keep in sync.
export type Role = "fleet_manager" | "dispatcher" | "safety_officer" | "financial_analyst";
export type Resource =
  | "dashboard" | "fleet" | "drivers" | "trips"
  | "maintenance" | "fuel_expenses" | "analytics" | "settings";
export type Access = "full" | "view" | null;

export const MATRIX: Record<Role, Record<Resource, Access>> = {
  fleet_manager: {
    dashboard: "full", fleet: "full", drivers: "full", trips: "view",
    maintenance: "full", fuel_expenses: "view", analytics: "full", settings: "full",
  },
  dispatcher: {
    dashboard: "full", fleet: "view", drivers: "view", trips: "full",
    maintenance: null, fuel_expenses: null, analytics: null, settings: null,
  },
  safety_officer: {
    dashboard: "full", fleet: null, drivers: "full", trips: "view",
    maintenance: null, fuel_expenses: null, analytics: null, settings: null,
  },
  financial_analyst: {
    dashboard: "full", fleet: "view", drivers: null, trips: "view",
    maintenance: "view", fuel_expenses: "full", analytics: "full", settings: null,
  },
};

export function can(role: Role | undefined, resource: Resource, write = false): boolean {
  if (!role) return false;
  const access = MATRIX[role]?.[resource] ?? null;
  return write ? access === "full" : access !== null;
}

export const ROLE_LABELS: Record<Role, string> = {
  fleet_manager: "Fleet Manager",
  dispatcher: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};
