from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Driver, DriverStatus, FuelLog, MaintenanceLog, Trip, TripStatus, Vehicle, VehicleStatus
from ..rbac import require
from ..rules import validate_dispatch
from ..schemas import TripCompleteIn, TripDispatchIn, TripIn, TripOut

router = APIRouter(prefix="/trips", tags=["trips"])


def _cost_per_km(db: Session) -> dict[int, float]:
    """Vehicle_id → recent ₹/km = (fuel + maintenance cost) / completed planned distance.
    Vehicles with no distance are omitted (can't fabricate a cost)."""
    fuel = dict(db.execute(
        select(FuelLog.vehicle_id, func.sum(FuelLog.cost)).group_by(FuelLog.vehicle_id)).all())
    maint = dict(db.execute(
        select(MaintenanceLog.vehicle_id, func.sum(MaintenanceLog.cost)).group_by(MaintenanceLog.vehicle_id)).all())
    dist = dict(db.execute(
        select(Trip.vehicle_id, func.sum(Trip.planned_distance_km))
        .where(Trip.status == TripStatus.completed.value).group_by(Trip.vehicle_id)).all())
    out: dict[int, float] = {}
    for vid, km in dist.items():
        if km:
            out[vid] = (float(fuel.get(vid, 0)) + float(maint.get(vid, 0))) / float(km)
    return out


def _recommend(cargo: float, vehicles: list[Vehicle], drivers: list[Driver], db: Session) -> dict:
    """Heuristic pick from the available pools. Smallest-fitting vehicle (tie: cheapest ₹/km),
    highest-safety driver (tie: fewest trips). Returns nulls when nothing fits."""
    cpk = _cost_per_km(db)
    fitting = [v for v in vehicles if v.max_capacity_kg >= cargo] if cargo > 0 else list(vehicles)
    vehicle = min(fitting, key=lambda v: (v.max_capacity_kg, cpk.get(v.id, float("inf")))) if fitting else None
    driver = min(drivers, key=lambda d: (-d.safety_score, d.trips_completed)) if drivers else None

    if not vehicle and not driver:
        return {"vehicle_id": None, "driver_id": None, "reason": None}

    parts = []
    if vehicle:
        parts.append(f"{vehicle.name} — fits {cargo:g} kg" if cargo > 0 else f"{vehicle.name}")
        if vehicle.id in cpk:
            parts.append(f"₹{cpk[vehicle.id]:.1f}/km")
    if driver:
        parts.append(f"{driver.name} (safety {driver.safety_score:g}%)")
    return {
        "vehicle_id": vehicle.id if vehicle else None,
        "driver_id": driver.id if driver else None,
        "reason": ", ".join(parts),
    }


def _out(trip: Trip) -> TripOut:
    out = TripOut.model_validate(trip)
    out.vehicle_name = trip.vehicle.name if trip.vehicle else None
    out.driver_name = trip.driver.name if trip.driver else None
    return out


@router.get("", response_model=list[TripOut], dependencies=[Depends(require("trips"))])
def list_trips(status: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Trip).options(selectinload(Trip.vehicle), selectinload(Trip.driver)).order_by(desc(Trip.id))
    if status:
        stmt = stmt.where(Trip.status == status)
    return [_out(t) for t in db.scalars(stmt).all()]


@router.get("/options", dependencies=[Depends(require("trips"))])
def trip_options(db: Session = Depends(get_db), cargo: float = 0):
    """Dispatch pools + a recommended assignment for the given cargo weight. Rule:
    Retired/In Shop/On Trip vehicles and non-Available or expired-license drivers never appear here."""
    vehicles = list(db.scalars(
        select(Vehicle).where(Vehicle.status == VehicleStatus.available.value).order_by(Vehicle.name)
    ).all())
    drivers = list(db.scalars(
        select(Driver)
        .where(Driver.status == DriverStatus.available.value, Driver.license_expiry >= date.today())
        .order_by(Driver.name)
    ).all())
    return {
        "available_vehicles": [
            {"id": v.id, "name": v.name, "registration_no": v.registration_no,
             "max_capacity_kg": v.max_capacity_kg}
            for v in vehicles
        ],
        "available_drivers": [
            {"id": d.id, "name": d.name, "license_no": d.license_no, "safety_score": d.safety_score}
            for d in drivers
        ],
        "recommended": _recommend(cargo, vehicles, drivers, db),
    }


def _get_or_404(trip_id: int, db: Session) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(404, "Trip not found")
    return trip


def _dispatch(trip: Trip, db: Session) -> Trip:
    vehicle = db.get(Vehicle, trip.vehicle_id) if trip.vehicle_id else None
    driver = db.get(Driver, trip.driver_id) if trip.driver_id else None
    violations = validate_dispatch(vehicle, driver, trip.cargo_weight_kg)
    if violations:
        raise HTTPException(422, "; ".join(violations))
    vehicle.status = VehicleStatus.on_trip.value
    driver.status = DriverStatus.on_trip.value
    trip.status = TripStatus.dispatched.value
    trip.dispatched_at = datetime.now()
    db.commit()
    db.refresh(trip)
    return trip


@router.post("", response_model=TripOut, status_code=201, dependencies=[Depends(require("trips", write=True))])
def create_trip(body: TripIn, dispatch: bool = False, db: Session = Depends(get_db)):
    trip = Trip(**body.model_dump())
    db.add(trip)
    db.flush()
    if dispatch:
        trip = _dispatch(trip, db)
    else:
        db.commit()
    db.refresh(trip)
    return _out(trip)


@router.post("/{trip_id}/dispatch", response_model=TripOut, dependencies=[Depends(require("trips", write=True))])
def dispatch_trip(trip_id: int, body: TripDispatchIn, db: Session = Depends(get_db)):
    trip = _get_or_404(trip_id, db)
    if trip.status != TripStatus.draft.value:
        raise HTTPException(422, f"Only Draft trips can be dispatched (trip is {trip.status})")
    if body.vehicle_id is not None:
        trip.vehicle_id = body.vehicle_id
    if body.driver_id is not None:
        trip.driver_id = body.driver_id
    return _out(_dispatch(trip, db))


@router.post("/{trip_id}/complete", response_model=TripOut, dependencies=[Depends(require("trips", write=True))])
def complete_trip(trip_id: int, body: TripCompleteIn, db: Session = Depends(get_db)):
    trip = _get_or_404(trip_id, db)
    if trip.status != TripStatus.dispatched.value:
        raise HTTPException(422, f"Only Dispatched trips can be completed (trip is {trip.status})")
    vehicle = db.get(Vehicle, trip.vehicle_id)
    driver = db.get(Driver, trip.driver_id)
    if body.end_odometer_km < vehicle.odometer_km:
        raise HTTPException(422, f"End odometer must be ≥ current odometer ({vehicle.odometer_km:g} km)")

    vehicle.odometer_km = body.end_odometer_km
    vehicle.status = VehicleStatus.available.value
    driver.status = DriverStatus.available.value
    driver.trips_completed += 1
    trip.status = TripStatus.completed.value
    trip.completed_at = datetime.now()
    trip.end_odometer_km = body.end_odometer_km
    trip.fuel_consumed_l = body.fuel_liters
    trip.revenue = body.revenue
    db.add(FuelLog(vehicle_id=vehicle.id, trip_id=trip.id, liters=body.fuel_liters,
                   cost=body.fuel_cost, date=date.today()))
    db.commit()
    db.refresh(trip)
    return _out(trip)


@router.post("/{trip_id}/cancel", response_model=TripOut, dependencies=[Depends(require("trips", write=True))])
def cancel_trip(trip_id: int, db: Session = Depends(get_db)):
    trip = _get_or_404(trip_id, db)
    if trip.status not in (TripStatus.draft.value, TripStatus.dispatched.value):
        raise HTTPException(422, f"Only Draft or Dispatched trips can be cancelled (trip is {trip.status})")
    if trip.status == TripStatus.dispatched.value:
        db.get(Vehicle, trip.vehicle_id).status = VehicleStatus.available.value
        db.get(Driver, trip.driver_id).status = DriverStatus.available.value
    trip.status = TripStatus.cancelled.value
    db.commit()
    db.refresh(trip)
    return _out(trip)
