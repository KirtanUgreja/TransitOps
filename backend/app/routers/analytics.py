import csv
import io
from collections import defaultdict
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..auth import user_from_token
from ..db import get_db
from ..models import Driver, FuelLog, MaintenanceLog, Trip, Vehicle
from ..rbac import MATRIX, require

router = APIRouter(tags=["analytics"])

RETIRED = "Retired"
IN_SHOP = "In Shop"
ON_TRIP = "On Trip"
AVAILABLE = "Available"
DISPATCHED = "Dispatched"
DRAFT = "Draft"
COMPLETED = "Completed"


def _vehicle_base(db: Session, type_, status, region):
    stmt = select(Vehicle)
    if type_:
        stmt = stmt.where(Vehicle.type == type_)
    if status:
        stmt = stmt.where(Vehicle.status == status)
    if region:
        stmt = stmt.where(Vehicle.region == region)
    return db.scalars(stmt).all()


@router.get("/dashboard/kpis", dependencies=[Depends(require("dashboard"))])
def dashboard_kpis(
    type: str | None = None, status: str | None = None, region: str | None = None,
    db: Session = Depends(get_db),
):
    vehicles = _vehicle_base(db, type, status, region)
    not_retired = [v for v in vehicles if v.status != RETIRED]
    on_trip = [v for v in vehicles if v.status == ON_TRIP]

    counts: dict[str, int] = defaultdict(int)
    for v in vehicles:
        counts[v.status] += 1

    active_trips = db.scalar(select(func.count()).where(Trip.status == DISPATCHED))
    pending_trips = db.scalar(select(func.count()).where(Trip.status == DRAFT))
    drivers_on_duty = db.scalar(
        select(func.count()).where(Driver.status.in_([AVAILABLE, ON_TRIP]))
    )

    recent = db.scalars(
        select(Trip).options(selectinload(Trip.vehicle), selectinload(Trip.driver))
        .order_by(Trip.id.desc()).limit(8)
    ).all()

    return {
        "active_vehicles": len(not_retired),
        "available_vehicles": counts.get(AVAILABLE, 0),
        "in_maintenance": counts.get(IN_SHOP, 0),
        "active_trips": active_trips,
        "pending_trips": pending_trips,
        "drivers_on_duty": drivers_on_duty,
        "fleet_utilization_pct": round(len(on_trip) / len(not_retired) * 100, 1) if not_retired else 0.0,
        "vehicle_status_counts": dict(counts),
        "recent_trips": [
            {"code": t.code, "source": t.source, "destination": t.destination,
             "vehicle_name": t.vehicle.name if t.vehicle else None,
             "driver_name": t.driver.name if t.driver else None, "status": t.status}
            for t in recent
        ],
    }


def _per_vehicle(db: Session) -> list[dict]:
    fuel = dict(db.execute(
        select(FuelLog.vehicle_id, func.sum(FuelLog.cost)).group_by(FuelLog.vehicle_id)).all())
    maint = dict(db.execute(
        select(MaintenanceLog.vehicle_id, func.sum(MaintenanceLog.cost)).group_by(MaintenanceLog.vehicle_id)).all())
    revenue = dict(db.execute(
        select(Trip.vehicle_id, func.sum(Trip.revenue)).where(Trip.status == COMPLETED)
        .group_by(Trip.vehicle_id)).all())

    rows = []
    for v in db.scalars(select(Vehicle).order_by(Vehicle.name)):
        f = float(fuel.get(v.id, 0))
        m = float(maint.get(v.id, 0))
        rev = float(revenue.get(v.id, 0))
        roi = (rev - (m + f)) / v.acquisition_cost * 100 if v.acquisition_cost else 0.0
        rows.append({
            "vehicle_id": v.id, "registration_no": v.registration_no, "name": v.name,
            "fuel_cost": f, "maintenance_cost": m, "total_cost": f + m,
            "revenue": rev, "roi_pct": round(roi, 1),
        })
    return rows


@router.get("/analytics/summary", dependencies=[Depends(require("analytics"))])
def analytics_summary(db: Session = Depends(get_db)):
    total_fuel = float(db.scalar(select(func.coalesce(func.sum(FuelLog.cost), 0.0))))
    total_maint = float(db.scalar(select(func.coalesce(func.sum(MaintenanceLog.cost), 0.0))))
    total_liters = float(db.scalar(select(func.coalesce(func.sum(FuelLog.liters), 0.0))))
    completed_distance = float(db.scalar(
        select(func.coalesce(func.sum(Trip.planned_distance_km), 0.0)).where(Trip.status == COMPLETED)))

    vehicles = db.scalars(select(Vehicle)).all()
    not_retired = [v for v in vehicles if v.status != RETIRED]
    on_trip = [v for v in vehicles if v.status == ON_TRIP]

    rows = _per_vehicle(db)
    rois = [r["roi_pct"] for r in rows if r["revenue"] or r["total_cost"]]

    # monthly revenue, last 6 months from completed trips
    monthly: dict[str, float] = defaultdict(float)
    for t in db.scalars(select(Trip).where(Trip.status == COMPLETED, Trip.completed_at.isnot(None))):
        monthly[t.completed_at.strftime("%Y-%m")] += float(t.revenue)
    monthly_revenue = [{"month": k, "revenue": v} for k, v in sorted(monthly.items())[-6:]]

    costliest = sorted(rows, key=lambda r: r["total_cost"], reverse=True)[:5]

    return {
        "fuel_efficiency_km_l": round(completed_distance / total_liters, 2) if total_liters else 0.0,
        "fleet_utilization_pct": round(len(on_trip) / len(not_retired) * 100, 1) if not_retired else 0.0,
        "operational_cost": total_fuel + total_maint,
        "avg_roi_pct": round(sum(rois) / len(rois), 1) if rois else 0.0,
        "per_vehicle": rows,
        "monthly_revenue": monthly_revenue,
        "costliest_vehicles": [
            {"name": r["name"], "total_cost": r["total_cost"]} for r in costliest],
    }


# --- exports: accept ?token= so a plain <a href> download authenticates ---

def _export_user(token: str | None, db: Session):
    if not token:
        raise HTTPException(401, "Not authenticated")
    user = user_from_token(token, db)
    if MATRIX.get(user.role, {}).get("analytics") is None:
        raise HTTPException(403, f"Role '{user.role}' cannot access analytics")
    return user


@router.get("/analytics/export.csv")
def export_csv(token: str | None = None, db: Session = Depends(get_db)):
    _export_user(token, db)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Registration", "Name", "Fuel Cost", "Maintenance Cost",
                "Total Cost", "Revenue", "ROI %"])
    for r in _per_vehicle(db):
        w.writerow([r["registration_no"], r["name"], r["fuel_cost"], r["maintenance_cost"],
                    r["total_cost"], r["revenue"], r["roi_pct"]])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transitops-analytics.csv"})


@router.get("/analytics/export.pdf")
def export_pdf(token: str | None = None, db: Session = Depends(get_db)):
    _export_user(token, db)
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "TransitOps - Fleet Cost & ROI", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, f"Generated {datetime.now():%Y-%m-%d %H:%M}", ln=True)
    pdf.ln(2)

    headers = ["Reg", "Name", "Fuel", "Maint", "Total", "Revenue", "ROI%"]
    widths = [28, 30, 24, 24, 26, 28, 20]
    pdf.set_font("Helvetica", "B", 9)
    for h, wd in zip(headers, widths):
        pdf.cell(wd, 7, h, border=1)
    pdf.ln()
    pdf.set_font("Helvetica", "", 8)
    for r in _per_vehicle(db):
        cells = [r["registration_no"], r["name"], f"{r['fuel_cost']:.0f}",
                 f"{r['maintenance_cost']:.0f}", f"{r['total_cost']:.0f}",
                 f"{r['revenue']:.0f}", f"{r['roi_pct']:.1f}"]
        for c, wd in zip(cells, widths):
            pdf.cell(wd, 6, str(c), border=1)
        pdf.ln()

    out = pdf.output()  # fpdf2 returns bytearray
    return StreamingResponse(
        iter([bytes(out)]), media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=transitops-analytics.pdf"})
