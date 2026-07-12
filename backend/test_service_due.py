"""plan-14: service-due prediction heuristic (days-based)."""
from datetime import date, timedelta

from app.routers.maintenance import _service_due


class _Veh:
    def __init__(self, name):
        self.name = name


class _Log:
    def __init__(self, vehicle_id, service_type, d, name="V"):
        self.vehicle_id = vehicle_id
        self.service_type = service_type
        self.date = d
        self.vehicle = _Veh(name)


TODAY = date(2026, 7, 12)


def test_overdue_first_and_sign():
    logs = [
        _Log(1, "Oil Change", TODAY - timedelta(days=200), "OLD"),   # overdue (interval 90)
        _Log(2, "Oil Change", TODAY - timedelta(days=80), "SOON"),   # due in 10 days
    ]
    rows = _service_due(logs, TODAY)
    assert [r["vehicle_name"] for r in rows] == ["OLD", "SOON"], "overdue ranked first"
    assert rows[0]["state"] == "overdue" and rows[0]["days_left"] < 0
    assert rows[1]["state"] == "due_soon" and 0 <= rows[1]["days_left"] <= 14


def test_recent_service_not_flagged():
    logs = [_Log(1, "Oil Change", TODAY - timedelta(days=5))]  # fresh
    assert _service_due(logs, TODAY) == []


def test_latest_log_wins_per_type():
    logs = [
        _Log(1, "Oil Change", TODAY - timedelta(days=200)),  # old
        _Log(1, "Oil Change", TODAY - timedelta(days=3)),    # recent → not due
    ]
    assert _service_due(logs, TODAY) == []


if __name__ == "__main__":
    test_overdue_first_and_sign()
    test_recent_service_not_flagged()
    test_latest_log_wins_per_type()
    print("ok")
