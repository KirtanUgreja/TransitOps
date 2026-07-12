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

export const VEHICLE_TYPES = ["Van", "Truck", "Mini"] as const;
export const VEHICLE_STATUSES = ["Available", "On Trip", "In Shop", "Retired"] as const;
export const DRIVER_STATUSES = ["Available", "On Trip", "Off Duty", "Suspended"] as const;
export const LICENSE_CATEGORIES = ["LMV", "HMV"] as const;
