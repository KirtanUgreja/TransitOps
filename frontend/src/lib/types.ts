// Mirrors backend/app/schemas.py Out models.

export type Vehicle = {
  id: number;
  registration_no: string;
  name: string;
  type: string;
  max_capacity_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  region: string;
  status: string;
};

export type Driver = {
  id: number;
  name: string;
  license_no: string;
  license_category: string;
  license_expiry: string; // ISO date
  contact: string;
  safety_score: number;
  trips_completed: number;
  status: string;
  license_expired: boolean;
};

export type Trip = {
  id: number;
  code: string;
  source: string;
  destination: string;
  vehicle_id: number | null;
  driver_id: number | null;
  vehicle_name: string | null;
  driver_name: string | null;
  cargo_weight_kg: number;
  planned_distance_km: number;
  revenue: number;
  status: string;
  end_odometer_km: number | null;
  fuel_consumed_l: number | null;
  created_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
};

export type DashboardKpis = {
  active_vehicles: number;
  available_vehicles: number;
  in_maintenance: number;
  active_trips: number;
  pending_trips: number;
  drivers_on_duty: number;
  fleet_utilization_pct: number;
  vehicle_status_counts: Record<string, number>;
  recent_trips: {
    code: string; source: string; destination: string;
    vehicle_name: string | null; driver_name: string | null; status: string;
  }[];
};

export type FuelLog = {
  id: number;
  vehicle_id: number;
  vehicle_name: string | null;
  trip_id: number | null;
  liters: number;
  cost: number;
  date: string;
};

export type Expense = {
  id: number;
  vehicle_id: number;
  vehicle_name: string | null;
  trip_id: number | null;
  type: string;
  amount: number;
  date: string;
};

export type CostsSummary = {
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_expenses: number;
  total_operational_cost: number;
  per_vehicle: { vehicle_id: number; vehicle_name: string; fuel: number; maintenance: number; total: number }[];
};

export type AnalyticsSummary = {
  fuel_efficiency_km_l: number;
  fleet_utilization_pct: number;
  operational_cost: number;
  avg_roi_pct: number;
  per_vehicle: {
    vehicle_id: number; registration_no: string; name: string;
    fuel_cost: number; maintenance_cost: number; total_cost: number; revenue: number; roi_pct: number;
  }[];
  monthly_revenue: { month: string; revenue: number }[];
  costliest_vehicles: { name: string; total_cost: number }[];
};

export type Maintenance = {
  id: number;
  vehicle_id: number;
  vehicle_name: string | null;
  service_type: string;
  cost: number;
  date: string;
  status: string;
};

export type TripOptions = {
  available_vehicles: { id: number; name: string; registration_no: string; max_capacity_kg: number }[];
  available_drivers: { id: number; name: string; license_no: string; safety_score: number }[];
  recommended: { vehicle_id: number | null; driver_id: number | null; reason: string | null };
};

export const VEHICLE_TYPES = ["Van", "Truck", "Mini"] as const;
export const VEHICLE_STATUSES = ["Available", "On Trip", "In Shop", "Retired"] as const;
export const DRIVER_STATUSES = ["Available", "On Trip", "Off Duty", "Suspended"] as const;
export const LICENSE_CATEGORIES = ["LMV", "HMV"] as const;
