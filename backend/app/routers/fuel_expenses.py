from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Expense, FuelLog, MaintenanceLog, Vehicle
from ..rbac import require
from ..schemas import ExpenseIn, ExpenseOut, FuelLogIn, FuelLogOut

router = APIRouter(tags=["fuel_expenses"])

VIEW = [Depends(require("fuel_expenses"))]
WRITE = [Depends(require("fuel_expenses", write=True))]


def _fuel_out(f: FuelLog) -> FuelLogOut:
    out = FuelLogOut.model_validate(f)
    out.vehicle_name = f.vehicle.name if f.vehicle else None
    return out


def _exp_out(e: Expense) -> ExpenseOut:
    out = ExpenseOut.model_validate(e)
    out.vehicle_name = e.vehicle.name if e.vehicle else None
    return out


@router.get("/fuel-logs", response_model=list[FuelLogOut], dependencies=VIEW)
def list_fuel(vehicle_id: int | None = None, db: Session = Depends(get_db)):
    stmt = select(FuelLog).options(selectinload(FuelLog.vehicle)).order_by(desc(FuelLog.id))
    if vehicle_id:
        stmt = stmt.where(FuelLog.vehicle_id == vehicle_id)
    return [_fuel_out(f) for f in db.scalars(stmt).all()]


@router.post("/fuel-logs", response_model=FuelLogOut, status_code=201, dependencies=WRITE)
def create_fuel(body: FuelLogIn, db: Session = Depends(get_db)):
    if db.get(Vehicle, body.vehicle_id) is None:
        raise HTTPException(404, "Vehicle not found")
    f = FuelLog(**body.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return _fuel_out(f)


@router.get("/expenses", response_model=list[ExpenseOut], dependencies=VIEW)
def list_expenses(vehicle_id: int | None = None, db: Session = Depends(get_db)):
    stmt = select(Expense).options(selectinload(Expense.vehicle)).order_by(desc(Expense.id))
    if vehicle_id:
        stmt = stmt.where(Expense.vehicle_id == vehicle_id)
    return [_exp_out(e) for e in db.scalars(stmt).all()]


@router.post("/expenses", response_model=ExpenseOut, status_code=201, dependencies=WRITE)
def create_expense(body: ExpenseIn, db: Session = Depends(get_db)):
    if db.get(Vehicle, body.vehicle_id) is None:
        raise HTTPException(404, "Vehicle not found")
    e = Expense(**body.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _exp_out(e)


@router.get("/costs/summary", dependencies=VIEW)
def costs_summary(db: Session = Depends(get_db)):
    """The mockup's 'TOTAL OPERATIONAL COST (AUTO)' footer + per-vehicle rollup."""
    fuel = db.scalar(select(func.coalesce(func.sum(FuelLog.cost), 0.0)))
    maint = db.scalar(select(func.coalesce(func.sum(MaintenanceLog.cost), 0.0)))
    expenses = db.scalar(select(func.coalesce(func.sum(Expense.amount), 0.0)))

    # per-vehicle fuel + maintenance rollup for the fleet cost view
    rows: dict[int, dict] = {}
    for vid, name in db.execute(select(Vehicle.id, Vehicle.name)):
        rows[vid] = {"vehicle_id": vid, "vehicle_name": name, "fuel": 0.0, "maintenance": 0.0}
    for vid, total in db.execute(select(FuelLog.vehicle_id, func.sum(FuelLog.cost)).group_by(FuelLog.vehicle_id)):
        rows[vid]["fuel"] = float(total)
    for vid, total in db.execute(
        select(MaintenanceLog.vehicle_id, func.sum(MaintenanceLog.cost)).group_by(MaintenanceLog.vehicle_id)
    ):
        rows[vid]["maintenance"] = float(total)
    for r in rows.values():
        r["total"] = r["fuel"] + r["maintenance"]

    return {
        "total_fuel_cost": float(fuel),
        "total_maintenance_cost": float(maint),
        "total_expenses": float(expenses),
        "total_operational_cost": float(fuel) + float(maint),
        "per_vehicle": list(rows.values()),
    }
