"""Idempotent demo seed — mirrors the Excalidraw mockup data. Skips if users exist."""

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password
from .models import Driver, Expense, FuelLog, MaintenanceLog, Trip, User, Vehicle


def seed(db: Session) -> None:
    if db.scalar(select(User).limit(1)) is not None:
        return

    pw = hash_password("demo1234")
    db.add_all([
        User(name="Meera F.", email="fleet@transitops.in", password_hash=pw, role="fleet_manager"),
        User(name="Raven K.", email="dispatch@transitops.in", password_hash=pw, role="dispatcher"),
        User(name="Sana S.", email="safety@transitops.in", password_hash=pw, role="safety_officer"),
        User(name="Farid A.", email="finance@transitops.in", password_hash=pw, role="financial_analyst"),
    ])

    vehicles = [
        Vehicle(registration_no="GJ01AB4521", name="VAN-05", type="Van", max_capacity_kg=500,
                odometer_km=74000, acquisition_cost=620000, region="Gandhinagar", status="Available"),
        Vehicle(registration_no="GJ01AB9981", name="TRUCK-11", type="Truck", max_capacity_kg=5000,
                odometer_km=182000, acquisition_cost=2450000, region="Ahmedabad", status="On Trip"),
        Vehicle(registration_no="GJ01AB1120", name="MINI-03", type="Mini", max_capacity_kg=1000,
                odometer_km=66000, acquisition_cost=410000, region="Gandhinagar", status="In Shop"),
        Vehicle(registration_no="GJ01AB0087", name="VAN-09", type="Van", max_capacity_kg=750,
                odometer_km=241900, acquisition_cost=590000, region="Ahmedabad", status="Retired"),
        Vehicle(registration_no="GJ05CD1102", name="TRUCK-04", type="Truck", max_capacity_kg=4000,
                odometer_km=98000, acquisition_cost=2100000, region="Sanand", status="On Trip"),
        Vehicle(registration_no="GJ05CD2210", name="TRK-12", type="Truck", max_capacity_kg=6000,
                odometer_km=143000, acquisition_cost=2900000, region="Sanand", status="Available"),
        Vehicle(registration_no="GJ18EF3301", name="MINI-08", type="Mini", max_capacity_kg=900,
                odometer_km=31000, acquisition_cost=380000, region="Kalol", status="Available"),
        Vehicle(registration_no="GJ18EF4419", name="VAN-02", type="Van", max_capacity_kg=600,
                odometer_km=52000, acquisition_cost=540000, region="Gandhinagar", status="Available"),
        Vehicle(registration_no="GJ01GH5527", name="TRUCK-07", type="Truck", max_capacity_kg=4500,
                odometer_km=120500, acquisition_cost=2300000, region="Ahmedabad", status="Available"),
        Vehicle(registration_no="GJ01GH6635", name="MINI-01", type="Mini", max_capacity_kg=800,
                odometer_km=88000, acquisition_cost=350000, region="Kalol", status="Available"),
    ]
    db.add_all(vehicles)

    drivers = [
        Driver(name="Alex", license_no="DL-88213", license_category="LMV",
               license_expiry=date(2028, 12, 31), contact="9876500001", safety_score=96,
               trips_completed=42, status="Available"),
        Driver(name="John", license_no="DL-44120", license_category="HMV",
               license_expiry=date(2025, 3, 31), contact="9822000002", safety_score=81,
               trips_completed=25, status="Suspended"),
        Driver(name="Priya", license_no="DL-77031", license_category="LMV",
               license_expiry=date(2027, 8, 31), contact="9911000003", safety_score=99,
               trips_completed=58, status="On Trip"),
        Driver(name="Suresh", license_no="DL-90045", license_category="HMV",
               license_expiry=date(2027, 1, 31), contact="9744000004", safety_score=88,
               trips_completed=33, status="On Trip"),
        Driver(name="Meena", license_no="DL-11208", license_category="LMV",
               license_expiry=date(2029, 5, 31), contact="9855000005", safety_score=93,
               trips_completed=17, status="Available"),
        Driver(name="Ravi", license_no="DL-33967", license_category="HMV",
               license_expiry=date(2026, 11, 30), contact="9633000006", safety_score=85,
               trips_completed=21, status="Off Duty"),
    ]
    db.add_all(drivers)
    db.flush()

    v = {x.name: x for x in vehicles}
    d = {x.name: x for x in drivers}
    now = datetime.now()

    trips = [
        Trip(source="Gandhinagar Depot", destination="Ahmedabad Hub",
             vehicle=v["TRUCK-11"], driver=d["Priya"], cargo_weight_kg=3200,
             planned_distance_km=38, status="Dispatched", dispatched_at=now - timedelta(hours=1)),
        Trip(source="Vatva Industrial Area", destination="Sanand Warehouse",
             vehicle=v["TRK-12"], driver=d["Alex"], cargo_weight_kg=4100,
             planned_distance_km=52, revenue=48000, status="Completed",
             dispatched_at=now - timedelta(days=6, hours=5), completed_at=now - timedelta(days=6),
             end_odometer_km=143000, fuel_consumed_l=110),
        Trip(source="Kalol Depot", destination="Mansa",
             vehicle=v["MINI-08"], driver=d["Meena"], cargo_weight_kg=600,
             planned_distance_km=27, revenue=9500, status="Completed",
             dispatched_at=now - timedelta(days=5, hours=4), completed_at=now - timedelta(days=5),
             end_odometer_km=31000, fuel_consumed_l=28),
        Trip(source="Ahmedabad Hub", destination="Vatva Industrial Area",
             vehicle=v["TRUCK-04"], driver=d["Suresh"], cargo_weight_kg=2800,
             planned_distance_km=22, status="Dispatched", dispatched_at=now - timedelta(hours=2)),
        Trip(source="Mansa", destination="Kalol Depot",
             cargo_weight_kg=450, planned_distance_km=18, status="Cancelled"),
        Trip(source="Sanand Warehouse", destination="Gandhinagar Depot",
             cargo_weight_kg=700, planned_distance_km=44, status="Draft"),
        Trip(source="Gandhinagar Depot", destination="Kalol Depot",
             vehicle=v["VAN-02"], driver=d["Alex"], cargo_weight_kg=380,
             planned_distance_km=25, revenue=6800, status="Completed",
             dispatched_at=now - timedelta(days=2, hours=3), completed_at=now - timedelta(days=2),
             end_odometer_km=52000, fuel_consumed_l=9),
    ]
    db.add_all(trips)
    db.flush()

    db.add_all([
        MaintenanceLog(vehicle_id=v["VAN-05"].id, service_type="Oil Change", cost=2500,
                       date=date.today() - timedelta(days=5), status="Completed"),
        MaintenanceLog(vehicle_id=v["TRUCK-11"].id, service_type="Engine Repair", cost=18000,
                       date=date.today() - timedelta(days=20), status="Completed"),
        MaintenanceLog(vehicle_id=v["MINI-03"].id, service_type="Tyre Replace", cost=6200,
                       date=date.today() - timedelta(days=1), status="Active"),
    ])

    db.add_all([
        FuelLog(vehicle_id=v["VAN-05"].id, liters=42, cost=3150, date=date.today() - timedelta(days=7)),
        FuelLog(vehicle_id=v["TRK-12"].id, trip_id=trips[1].id, liters=110, cost=8400,
                date=date.today() - timedelta(days=6)),
        FuelLog(vehicle_id=v["MINI-08"].id, trip_id=trips[2].id, liters=28, cost=2050,
                date=date.today() - timedelta(days=5)),
        FuelLog(vehicle_id=v["VAN-02"].id, trip_id=trips[6].id, liters=9, cost=720,
                date=date.today() - timedelta(days=2)),
        FuelLog(vehicle_id=v["TRUCK-04"].id, liters=95, cost=7300, date=date.today() - timedelta(days=3)),
    ])

    db.add_all([
        Expense(vehicle_id=v["TRUCK-11"].id, trip_id=trips[0].id, type="Toll", amount=120,
                date=date.today()),
        Expense(vehicle_id=v["TRK-12"].id, trip_id=trips[1].id, type="Toll", amount=340,
                date=date.today() - timedelta(days=6)),
        Expense(vehicle_id=v["TRK-12"].id, trip_id=trips[1].id, type="Misc", amount=150,
                date=date.today() - timedelta(days=6)),
        Expense(vehicle_id=v["MINI-08"].id, trip_id=trips[2].id, type="Toll", amount=80,
                date=date.today() - timedelta(days=5)),
    ])

    db.commit()
