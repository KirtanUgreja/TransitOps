from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Driver, DriverStatus, FuelLog, Trip, TripStatus, Vehicle, VehicleStatus
from ..rbac import require
from ..rules import validate_dispatch
from ..schemas import TripCompleteIn, TripDispatchIn, TripIn, TripOut

router = APIRouter(prefix="/trips", tags=["trips"])


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
def trip_options(db: Session = Depends(get_db)):
    """Dispatch pools. Rule: Retired/In Shop/On Trip vehicles and non-Available or
    expired-license drivers never appear here."""
    vehicles = db.scalars(
        select(Vehicle).where(Vehicle.status == VehicleStatus.available.value).order_by(Vehicle.name)
    ).all()
    drivers = db.scalars(
        select(Driver)
        .where(Driver.status == DriverStatus.available.value, Driver.license_expiry >= date.today())
        .order_by(Driver.name)
    ).all()
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
