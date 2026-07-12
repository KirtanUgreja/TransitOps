from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginIn(BaseModel):
    email: str
    password: str


class ClerkLoginIn(BaseModel):
    token: str
    email: str | None = None
    name: str | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str


class UserCreateIn(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=3)
    role: str  # one of the four RBAC roles


class UserCreatedOut(BaseModel):
    """Returned once, to the Fleet Manager, so they can hand over the credentials."""
    id: int
    name: str
    email: str
    role: str
    password: str  # plaintext, shown only at creation time
    email_sent: bool = False


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class LoginOut(BaseModel):
    token: str
    user: UserOut


# --- Vehicles ---

class VehicleIn(BaseModel):
    registration_no: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=100)
    type: str
    max_capacity_kg: float = Field(gt=0)
    odometer_km: float = Field(ge=0, default=0)
    acquisition_cost: float = Field(ge=0, default=0)
    region: str = ""
    status: str = "Available"


class VehiclePatch(BaseModel):
    registration_no: str | None = None
    name: str | None = None
    type: str | None = None
    max_capacity_kg: float | None = Field(gt=0, default=None)
    odometer_km: float | None = Field(ge=0, default=None)
    acquisition_cost: float | None = Field(ge=0, default=None)
    region: str | None = None
    status: str | None = None


class VehicleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    registration_no: str
    name: str
    type: str
    max_capacity_kg: float
    odometer_km: float
    acquisition_cost: float
    region: str
    status: str


# --- Drivers ---

class DriverIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    license_no: str = Field(min_length=1, max_length=50)
    license_category: str
    license_expiry: date
    contact: str = ""
    safety_score: float = Field(ge=0, le=100, default=100)
    status: str = "Available"


class DriverPatch(BaseModel):
    name: str | None = None
    license_no: str | None = None
    license_category: str | None = None
    license_expiry: date | None = None
    contact: str | None = None
    safety_score: float | None = Field(ge=0, le=100, default=None)
    status: str | None = None


class DriverOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    license_no: str
    license_category: str
    license_expiry: date
    contact: str
    safety_score: float
    trips_completed: int
    status: str
    license_expired: bool = False


# --- Trips ---

class TripIn(BaseModel):
    source: str = Field(min_length=1)
    destination: str = Field(min_length=1)
    cargo_weight_kg: float = Field(gt=0)
    planned_distance_km: float = Field(gt=0)
    vehicle_id: int | None = None
    driver_id: int | None = None


class TripDispatchIn(BaseModel):
    vehicle_id: int | None = None
    driver_id: int | None = None


class TripCompleteIn(BaseModel):
    end_odometer_km: float = Field(ge=0)
    fuel_liters: float = Field(gt=0)
    fuel_cost: float = Field(ge=0)
    revenue: float = Field(ge=0)


class TripOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    source: str
    destination: str
    vehicle_id: int | None
    driver_id: int | None
    vehicle_name: str | None = None
    driver_name: str | None = None
    cargo_weight_kg: float
    planned_distance_km: float
    revenue: float
    status: str
    end_odometer_km: float | None
    fuel_consumed_l: float | None
    created_at: datetime
    dispatched_at: datetime | None
    completed_at: datetime | None


# --- Maintenance ---

class MaintenanceIn(BaseModel):
    vehicle_id: int
    service_type: str = Field(min_length=1)
    cost: float = Field(ge=0)
    date: date
    status: str = "Active"


class MaintenanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    vehicle_name: str | None = None
    service_type: str
    cost: float
    date: date
    status: str


# --- Fuel & Expenses ---

class FuelLogIn(BaseModel):
    vehicle_id: int
    trip_id: int | None = None
    liters: float = Field(gt=0)
    cost: float = Field(ge=0)
    date: date


class FuelLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    vehicle_name: str | None = None
    trip_id: int | None
    liters: float
    cost: float
    date: date


class ExpenseIn(BaseModel):
    vehicle_id: int
    trip_id: int | None = None
    type: str
    amount: float = Field(gt=0)
    date: date


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    vehicle_id: int
    vehicle_name: str | None = None
    trip_id: int | None
    type: str
    amount: float
    date: date
