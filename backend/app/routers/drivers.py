from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import asc, desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Driver, DriverStatus
from ..rbac import require
from ..schemas import DriverIn, DriverOut, DriverPatch

router = APIRouter(prefix="/drivers", tags=["drivers"])

SORTABLE = {"name", "license_no", "license_expiry", "safety_score", "trips_completed", "status"}


def _out(driver: Driver) -> DriverOut:
    out = DriverOut.model_validate(driver)
    out.license_expired = driver.license_expiry < date.today()
    return out


@router.get("", response_model=list[DriverOut], dependencies=[Depends(require("drivers"))])
def list_drivers(
    status: str | None = None,
    q: str | None = None,
    sort: str = "name",
    order: str = "asc",
    db: Session = Depends(get_db),
):
    stmt = select(Driver)
    if status:
        stmt = stmt.where(Driver.status == status)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Driver.name.ilike(like) | Driver.license_no.ilike(like))
    col = getattr(Driver, sort if sort in SORTABLE else "name")
    stmt = stmt.order_by(desc(col) if order == "desc" else asc(col))
    return [_out(x) for x in db.scalars(stmt).all()]


@router.post("", response_model=DriverOut, status_code=201, dependencies=[Depends(require("drivers", write=True))])
def create_driver(body: DriverIn, db: Session = Depends(get_db)):
    driver = Driver(**body.model_dump())
    db.add(driver)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"License number '{body.license_no}' already exists")
    db.refresh(driver)
    return _out(driver)


def _get_or_404(driver_id: int, db: Session) -> Driver:
    driver = db.get(Driver, driver_id)
    if driver is None:
        raise HTTPException(404, "Driver not found")
    return driver


@router.get("/{driver_id}", response_model=DriverOut, dependencies=[Depends(require("drivers"))])
def get_driver(driver_id: int, db: Session = Depends(get_db)):
    return _out(_get_or_404(driver_id, db))


@router.patch("/{driver_id}", response_model=DriverOut, dependencies=[Depends(require("drivers", write=True))])
def patch_driver(driver_id: int, body: DriverPatch, db: Session = Depends(get_db)):
    driver = _get_or_404(driver_id, db)
    updates = body.model_dump(exclude_unset=True)
    if driver.status == DriverStatus.on_trip.value and updates.get("status") not in (None, driver.status):
        raise HTTPException(422, "Driver is On Trip — complete or cancel the trip first")
    for k, val in updates.items():
        setattr(driver, k, val)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "License number already exists")
    db.refresh(driver)
    return _out(driver)


@router.delete("/{driver_id}", status_code=204, dependencies=[Depends(require("drivers", write=True))])
def delete_driver(driver_id: int, db: Session = Depends(get_db)):
    driver = _get_or_404(driver_id, db)
    if driver.status == DriverStatus.on_trip.value:
        raise HTTPException(422, "Cannot delete a driver that is On Trip")
    try:
        db.delete(driver)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(422, "Driver has linked trips — suspend them instead")
