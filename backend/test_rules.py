"""The 10 mandatory PDF §4 rules + the §5 workflow, all runnable with `uv run pytest`.

Uses in-memory SQLite so no Docker/Postgres is needed — the rules live in app code,
not the DB, so any engine that create_all() supports exercises them faithfully.
"""

from datetime import date, timedelta

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import Base
from app.models import Driver, FuelLog, Trip, TripStatus, Vehicle
from app.routers import trips as trips_router
from app.rules import validate_dispatch
from app.schemas import TripCompleteIn, TripDispatchIn

YESTERDAY = date.today() - timedelta(days=1)
NEXT_YEAR = date.today() + timedelta(days=365)


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s


def _van(**kw):
    d = dict(registration_no="GJ-VAN-05", name="VAN-05", type="Van",
             max_capacity_kg=500, odometer_km=1000, status="Available")
    d.update(kw)
    return Vehicle(**d)


def _alex(**kw):
    d = dict(name="Alex", license_no="DL-ALEX", license_category="LMV",
             license_expiry=NEXT_YEAR, status="Available")
    d.update(kw)
    return Driver(**d)


# --- pure rule function (rules 2,3,4,5) ---

def test_capacity_exceeded_exact_copy():
    v = _van(max_capacity_kg=500)
    assert "Capacity exceeded by 200 kg" in validate_dispatch(v, _alex(), 700)


def test_450_on_500_ok():
    assert validate_dispatch(_van(max_capacity_kg=500), _alex(), 450) == []


def test_expired_license_blocked():
    assert validate_dispatch(_van(), _alex(license_expiry=YESTERDAY), 100)


def test_suspended_driver_blocked():
    assert validate_dispatch(_van(), _alex(status="Suspended"), 100)


def test_on_trip_vehicle_and_driver_blocked():
    assert validate_dispatch(_van(status="On Trip"), _alex(status="On Trip"), 100)


def test_missing_vehicle_or_driver_blocked():
    assert validate_dispatch(None, _alex(), 100)
    assert validate_dispatch(_van(), None, 100)


# --- lifecycle through the router (rules 6,7,8 + §5 workflow) ---

def _make_draft(db, van, driver, cargo=450):
    db.add_all([van, driver])
    db.flush()
    t = Trip(source="A", destination="B", vehicle_id=van.id, driver_id=driver.id,
             cargo_weight_kg=cargo, planned_distance_km=50)
    db.add(t)
    db.flush()
    return t


def test_dispatch_flips_both_on_trip(db):
    van, alex = _van(), _alex()
    t = _make_draft(db, van, alex)
    trips_router.dispatch_trip(t.id, TripDispatchIn(), db)
    assert t.status == TripStatus.dispatched.value
    assert van.status == "On Trip" and alex.status == "On Trip"


def test_complete_restores_and_logs_fuel(db):
    van, alex = _van(odometer_km=1000), _alex()
    t = _make_draft(db, van, alex)
    trips_router.dispatch_trip(t.id, TripDispatchIn(), db)
    trips_router.complete_trip(
        t.id, TripCompleteIn(end_odometer_km=1200, fuel_liters=40, fuel_cost=3000, revenue=9000), db)
    assert t.status == TripStatus.completed.value
    assert van.status == "Available" and alex.status == "Available"
    assert van.odometer_km == 1200 and alex.trips_completed == 1
    assert db.scalar(select(FuelLog).where(FuelLog.trip_id == t.id)) is not None


def test_complete_rejects_odometer_going_backwards(db):
    van, alex = _van(odometer_km=1000), _alex()
    t = _make_draft(db, van, alex)
    trips_router.dispatch_trip(t.id, TripDispatchIn(), db)
    with pytest.raises(Exception):
        trips_router.complete_trip(
            t.id, TripCompleteIn(end_odometer_km=900, fuel_liters=40, fuel_cost=3000, revenue=9000), db)


def test_second_dispatch_blocked_while_on_trip(db):
    van, alex = _van(), _alex()
    t1 = _make_draft(db, van, alex)
    trips_router.dispatch_trip(t1.id, TripDispatchIn(), db)
    t2 = Trip(source="C", destination="D", vehicle_id=van.id, driver_id=alex.id,
              cargo_weight_kg=100, planned_distance_km=10)
    db.add(t2)
    db.flush()
    with pytest.raises(Exception):
        trips_router.dispatch_trip(t2.id, TripDispatchIn(), db)


def test_on_trip_absent_from_options(db):
    van, alex = _van(), _alex()
    t = _make_draft(db, van, alex)
    trips_router.dispatch_trip(t.id, TripDispatchIn(), db)
    opts = trips_router.trip_options(db)
    assert van.id not in [v["id"] for v in opts["available_vehicles"]]
    assert alex.id not in [d["id"] for d in opts["available_drivers"]]


def test_cancel_dispatched_restores_both(db):
    van, alex = _van(), _alex()
    t = _make_draft(db, van, alex)
    trips_router.dispatch_trip(t.id, TripDispatchIn(), db)
    trips_router.cancel_trip(t.id, db)
    assert t.status == TripStatus.cancelled.value
    assert van.status == "Available" and alex.status == "Available"
