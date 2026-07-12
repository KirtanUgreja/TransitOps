"""plan-12: recommended dispatch assignment heuristic."""
from datetime import date

from app.models import Driver, Vehicle
from app.routers.trips import _recommend


class _FakeDB:
    def execute(self, *a, **k):
        return _Empty()  # no cost/distance history → cpk empty, exercises the null-cost path


class _Empty:
    def all(self):
        return []


def _v(id, name, cap):
    return Vehicle(id=id, registration_no=f"R{id}", name=name, type="Van",
                   max_capacity_kg=cap, odometer_km=0, acquisition_cost=1, region="X",
                   status="Available")


def _d(id, name, safety, trips=0):
    return Driver(id=id, name=name, license_no=f"L{id}", license_category="LMV",
                  license_expiry=date(2099, 1, 1), contact="0", safety_score=safety,
                  trips_completed=trips, status="Available")


def test_smallest_fitting_vehicle_and_top_safety_driver():
    vehicles = [_v(1, "SMALL", 500), _v(2, "MED", 1000), _v(3, "BIG", 5000)]
    drivers = [_d(1, "Lo", 80), _d(2, "Hi", 99), _d(3, "Mid", 90)]
    rec = _recommend(600, vehicles, drivers, _FakeDB())
    assert rec["vehicle_id"] == 2, "smallest capacity >= 600 kg"
    assert rec["driver_id"] == 2, "highest safety_score"
    assert "MED" in rec["reason"] and "Hi" in rec["reason"]


def test_no_vehicle_fits_still_suggests_driver():
    vehicles = [_v(1, "SMALL", 500)]
    drivers = [_d(1, "Only", 88)]
    rec = _recommend(9000, vehicles, drivers, _FakeDB())
    assert rec["vehicle_id"] is None
    assert rec["driver_id"] == 1


def test_safety_tie_broken_by_fewer_trips():
    drivers = [_d(1, "Busy", 95, trips=50), _d(2, "Fresh", 95, trips=2)]
    rec = _recommend(0, [], drivers, _FakeDB())
    assert rec["driver_id"] == 2


if __name__ == "__main__":
    test_smallest_fitting_vehicle_and_top_safety_driver()
    test_no_vehicle_fits_still_suggests_driver()
    test_safety_tie_broken_by_fewer_trips()
    print("ok")
