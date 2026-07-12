import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Role(str, enum.Enum):
    fleet_manager = "fleet_manager"
    dispatcher = "dispatcher"
    safety_officer = "safety_officer"
    financial_analyst = "financial_analyst"


class VehicleStatus(str, enum.Enum):
    available = "Available"
    on_trip = "On Trip"
    in_shop = "In Shop"
    retired = "Retired"


class DriverStatus(str, enum.Enum):
    available = "Available"
    on_trip = "On Trip"
    off_duty = "Off Duty"
    suspended = "Suspended"


class TripStatus(str, enum.Enum):
    draft = "Draft"
    dispatched = "Dispatched"
    completed = "Completed"
    cancelled = "Cancelled"


class MaintenanceStatus(str, enum.Enum):
    active = "Active"
    completed = "Completed"


class ExpenseType(str, enum.Enum):
    toll = "Toll"
    misc = "Misc"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(50))


class Vehicle(Base):
    __tablename__ = "vehicles"
    id: Mapped[int] = mapped_column(primary_key=True)
    registration_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(50))
    max_capacity_kg: Mapped[float] = mapped_column(Float)
    odometer_km: Mapped[float] = mapped_column(Float, default=0)
    acquisition_cost: Mapped[float] = mapped_column(Float, default=0)
    region: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(20), default=VehicleStatus.available.value)


class Driver(Base):
    __tablename__ = "drivers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    license_no: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    license_category: Mapped[str] = mapped_column(String(20))
    license_expiry: Mapped[date] = mapped_column(Date)
    contact: Mapped[str] = mapped_column(String(30), default="")
    safety_score: Mapped[float] = mapped_column(Float, default=100)
    trips_completed: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default=DriverStatus.available.value)


class Trip(Base):
    __tablename__ = "trips"
    id: Mapped[int] = mapped_column(primary_key=True)
    source: Mapped[str] = mapped_column(String(200))
    destination: Mapped[str] = mapped_column(String(200))
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), nullable=True)
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"), nullable=True)
    cargo_weight_kg: Mapped[float] = mapped_column(Float)
    planned_distance_km: Mapped[float] = mapped_column(Float)
    revenue: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default=TripStatus.draft.value)
    end_odometer_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_consumed_l: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    vehicle: Mapped[Vehicle | None] = relationship()
    driver: Mapped[Driver | None] = relationship()

    @property
    def code(self) -> str:
        return f"TR{self.id:03d}"


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    service_type: Mapped[str] = mapped_column(String(100))
    cost: Mapped[float] = mapped_column(Float, default=0)
    date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default=MaintenanceStatus.active.value)

    vehicle: Mapped[Vehicle] = relationship()


class FuelLog(Base):
    __tablename__ = "fuel_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    trip_id: Mapped[int | None] = mapped_column(ForeignKey("trips.id"), nullable=True)
    liters: Mapped[float] = mapped_column(Float)
    cost: Mapped[float] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date)

    vehicle: Mapped[Vehicle] = relationship()


class Expense(Base):
    __tablename__ = "expenses"
    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"))
    trip_id: Mapped[int | None] = mapped_column(ForeignKey("trips.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(20))
    amount: Mapped[float] = mapped_column(Float)
    date: Mapped[date] = mapped_column(Date)

    vehicle: Mapped[Vehicle] = relationship()
