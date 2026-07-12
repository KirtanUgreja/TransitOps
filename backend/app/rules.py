"""Mandatory business rules (PDF §4). Single source of truth for dispatch validation."""

from datetime import date

from .models import Driver, DriverStatus, Vehicle, VehicleStatus


def validate_dispatch(vehicle: Vehicle | None, driver: Driver | None, cargo_kg: float) -> list[str]:
    """Return violations blocking a dispatch. Empty list = OK to dispatch."""
    violations: list[str] = []
    if vehicle is None:
        violations.append("A vehicle must be assigned before dispatch")
    else:
        if vehicle.status != VehicleStatus.available.value:
            violations.append(f"Vehicle {vehicle.registration_no} is {vehicle.status}, not Available")
        if cargo_kg > vehicle.max_capacity_kg:
            over = cargo_kg - vehicle.max_capacity_kg
            violations.append(f"Capacity exceeded by {over:g} kg")
    if driver is None:
        violations.append("A driver must be assigned before dispatch")
    else:
        if driver.status != DriverStatus.available.value:
            violations.append(f"Driver {driver.name} is {driver.status}, not Available")
        if driver.license_expiry < date.today():
            violations.append(f"Driver {driver.name}'s license expired on {driver.license_expiry:%d/%m/%Y}")
    return violations
