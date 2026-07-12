"""plan-15: fuel-efficiency anomaly flagging."""
from app.routers.analytics import _fuel_anomalies


class _Veh:
    def __init__(self, name):
        self.name = name


class _Trip:
    def __init__(self, id, vehicle_id, dist, fuel, name="V"):
        self.id = id
        self.vehicle_id = vehicle_id
        self.status = "Completed"
        self.planned_distance_km = dist
        self.fuel_consumed_l = fuel
        self.completed_at = None
        self.vehicle = _Veh(name)


def test_outlier_flagged_normal_not():
    # vehicle 1: three trips at ~10 km/L, one at ~6 km/L (40% worse) → flagged
    trips = [
        _Trip(1, 1, 100, 10),   # 10 km/L
        _Trip(2, 1, 100, 10),   # 10 km/L
        _Trip(3, 1, 100, 10),   # 10 km/L  -> baseline median 10
        _Trip(4, 1, 60, 10),    # 6 km/L   -> 40% below, flagged
    ]
    rows = _fuel_anomalies(trips)
    codes = [r["trip_code"] for r in rows]
    assert codes == ["TR004"], f"only the bad trip flagged, got {codes}"
    assert rows[0]["pct_below"] == 40.0


def test_single_trip_vehicle_no_baseline():
    trips = [_Trip(1, 7, 30, 10)]  # 3 km/L but only one trip -> no baseline, no flag
    assert _fuel_anomalies(trips) == []


def test_within_tolerance_not_flagged():
    trips = [_Trip(1, 1, 100, 10), _Trip(2, 1, 90, 10)]  # 9 vs 10 median=9.5, 5% below -> ok
    assert _fuel_anomalies(trips) == []


if __name__ == "__main__":
    test_outlier_flagged_normal_not()
    test_single_trip_vehicle_no_baseline()
    test_within_tolerance_not_flagged()
    print("ok")
