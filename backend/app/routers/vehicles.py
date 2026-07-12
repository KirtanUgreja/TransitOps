from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc, desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Vehicle, VehicleStatus
from ..rbac import require
from ..schemas import VehicleIn, VehicleOut, VehiclePatch

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

SORTABLE = {"registration_no", "name", "type", "max_capacity_kg", "odometer_km", "acquisition_cost", "status"}


@router.get("", response_model=list[VehicleOut], dependencies=[Depends(require("fleet"))])
def list_vehicles(
    type: str | None = None,
    status: str | None = None,
    region: str | None = None,
    q: str | None = None,
    sort: str = "registration_no",
    order: str = "asc",
    db: Session = Depends(get_db),
):
    stmt = select(Vehicle)
    if type:
        stmt = stmt.where(Vehicle.type == type)
    if status:
        stmt = stmt.where(Vehicle.status == status)
    if region:
        stmt = stmt.where(Vehicle.region == region)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Vehicle.registration_no.ilike(like) | Vehicle.name.ilike(like))
    col = getattr(Vehicle, sort if sort in SORTABLE else "registration_no")
    stmt = stmt.order_by(desc(col) if order == "desc" else asc(col))
    return db.scalars(stmt).all()


@router.post("", response_model=VehicleOut, status_code=201, dependencies=[Depends(require("fleet", write=True))])
def create_vehicle(body: VehicleIn, db: Session = Depends(get_db)):
    vehicle = Vehicle(**body.model_dump())
    db.add(vehicle)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"Registration number '{body.registration_no}' already exists")
    db.refresh(vehicle)
    return vehicle


def _get_or_404(vehicle_id: int, db: Session) -> Vehicle:
    vehicle = db.get(Vehicle, vehicle_id)
    if vehicle is None:
        raise HTTPException(404, "Vehicle not found")
    return vehicle


@router.get("/{vehicle_id}", response_model=VehicleOut, dependencies=[Depends(require("fleet"))])
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    return _get_or_404(vehicle_id, db)


@router.patch("/{vehicle_id}", response_model=VehicleOut, dependencies=[Depends(require("fleet", write=True))])
def patch_vehicle(vehicle_id: int, body: VehiclePatch, db: Session = Depends(get_db)):
    vehicle = _get_or_404(vehicle_id, db)
    for k, val in body.model_dump(exclude_unset=True).items():
        setattr(vehicle, k, val)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Registration number already exists")
    db.refresh(vehicle)
    return vehicle


@router.delete("/{vehicle_id}", status_code=204, dependencies=[Depends(require("fleet", write=True))])
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = _get_or_404(vehicle_id, db)
    if vehicle.status == VehicleStatus.on_trip.value:
        raise HTTPException(422, "Cannot delete a vehicle that is On Trip")
    try:
        db.delete(vehicle)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(422, "Vehicle has linked records — retire it instead")
