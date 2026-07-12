from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import MaintenanceLog, MaintenanceStatus, Vehicle, VehicleStatus
from ..rbac import require
from ..schemas import MaintenanceIn, MaintenanceOut

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


def _out(log: MaintenanceLog) -> MaintenanceOut:
    out = MaintenanceOut.model_validate(log)
    out.vehicle_name = log.vehicle.name if log.vehicle else None
    return out


@router.get("", response_model=list[MaintenanceOut], dependencies=[Depends(require("maintenance"))])
def list_maintenance(db: Session = Depends(get_db)):
    stmt = select(MaintenanceLog).options(selectinload(MaintenanceLog.vehicle)).order_by(desc(MaintenanceLog.id))
    return [_out(m) for m in db.scalars(stmt).all()]


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
