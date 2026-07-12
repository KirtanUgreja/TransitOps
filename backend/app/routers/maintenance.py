from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import MaintenanceLog, MaintenanceStatus, Vehicle, VehicleStatus
from ..rbac import require
from ..schemas import MaintenanceIn, MaintenanceOut

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

# Routine service intervals in days, keyed by service_type. Days (not km) because
# MaintenanceLog stores the service date, not the odometer-at-service.
SERVICE_INTERVAL_DAYS = {"Oil Change": 90, "Tyre Replace": 365, "Engine Repair": 365}
DEFAULT_INTERVAL_DAYS = 180
DUE_SOON_WINDOW = 14


def _service_due(logs: list[MaintenanceLog], today: date) -> list[dict]:
    """Red-flag list: for each (vehicle, service_type) with history, is the next service
    due soon or overdue? Predicts only on service types a vehicle has actually had."""
    last: dict[tuple[int, str], MaintenanceLog] = {}
    for log in logs:
        key = (log.vehicle_id, log.service_type)
        if key not in last or log.date > last[key].date:
            last[key] = log

    rows = []
    for (vehicle_id, service_type), log in last.items():
        interval = SERVICE_INTERVAL_DAYS.get(service_type, DEFAULT_INTERVAL_DAYS)
        due_date = log.date + timedelta(days=interval)
        days_left = (due_date - today).days
        if days_left < 0:
            state = "overdue"
        elif days_left <= DUE_SOON_WINDOW:
            state = "due_soon"
        else:
            continue
        rows.append({
            "vehicle_id": vehicle_id,
            "vehicle_name": log.vehicle.name if log.vehicle else None,
            "service_type": service_type,
            "last_date": log.date, "due_date": due_date,
            "days_left": days_left, "state": state,
        })
    rows.sort(key=lambda r: r["days_left"])  # overdue (most negative) first
    return rows


def _out(log: MaintenanceLog) -> MaintenanceOut:
    out = MaintenanceOut.model_validate(log)
    out.vehicle_name = log.vehicle.name if log.vehicle else None
    return out


@router.get("", response_model=list[MaintenanceOut], dependencies=[Depends(require("maintenance"))])
def list_maintenance(db: Session = Depends(get_db)):
    stmt = select(MaintenanceLog).options(selectinload(MaintenanceLog.vehicle)).order_by(desc(MaintenanceLog.id))
    return [_out(m) for m in db.scalars(stmt).all()]


@router.get("/due", dependencies=[Depends(require("maintenance"))])
def service_due(db: Session = Depends(get_db)):
    """Vehicles whose next routine service is due soon or overdue (non-retired only)."""
    logs = db.scalars(
        select(MaintenanceLog).options(selectinload(MaintenanceLog.vehicle))
        .join(Vehicle).where(Vehicle.status != VehicleStatus.retired.value)
    ).all()
    return _service_due(list(logs), date.today())


@router.post("", response_model=MaintenanceOut, status_code=201,
             dependencies=[Depends(require("maintenance", write=True))])
def create_maintenance(body: MaintenanceIn, db: Session = Depends(get_db)):
    vehicle = db.get(Vehicle, body.vehicle_id)
    if vehicle is None:
        raise HTTPException(404, "Vehicle not found")
    if body.status == MaintenanceStatus.active.value:
        if vehicle.status == VehicleStatus.on_trip.value:
            raise HTTPException(422, f"Vehicle {vehicle.name} is On Trip — complete the trip first")
        # Rule: creating an active maintenance record puts the vehicle In Shop
        if vehicle.status != VehicleStatus.retired.value:
            vehicle.status = VehicleStatus.in_shop.value
    log = MaintenanceLog(**body.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return _out(log)


@router.post("/{log_id}/close", response_model=MaintenanceOut,
             dependencies=[Depends(require("maintenance", write=True))])
def close_maintenance(log_id: int, db: Session = Depends(get_db)):
    log = db.get(MaintenanceLog, log_id)
    if log is None:
        raise HTTPException(404, "Maintenance record not found")
    if log.status != MaintenanceStatus.active.value:
        raise HTTPException(422, "Record is already closed")
    log.status = MaintenanceStatus.completed.value
    vehicle = db.get(Vehicle, log.vehicle_id)
    # Rule: closing maintenance restores the vehicle to Available (unless retired)
    if vehicle.status != VehicleStatus.retired.value:
        vehicle.status = VehicleStatus.available.value
    db.commit()
    db.refresh(log)
    return _out(log)
