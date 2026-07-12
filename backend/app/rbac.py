"""RBAC matrix (mirrored in frontend/src/lib/rbac.ts — keep in sync).

Values: "full" (read+write), "view" (read-only), None (no access).
Resources map to routers; "dashboard" is readable by everyone.
"""

from fastapi import Depends, HTTPException

from .auth import get_current_user
from .models import User

MATRIX: dict[str, dict[str, str | None]] = {
    "fleet_manager": {
        "dashboard": "full",
        "fleet": "full",
        "drivers": "full",
        "trips": "view",
        "maintenance": "full",
        "fuel_expenses": "view",
        "analytics": "full",
        "settings": "full",
    },
    "dispatcher": {
        "dashboard": "full",
        "fleet": "view",
        "drivers": "view",
        "trips": "full",
        "maintenance": None,
        "fuel_expenses": None,
        "analytics": None,
        "settings": None,
    },
    "safety_officer": {
        "dashboard": "full",
        "fleet": None,
        "drivers": "full",
        "trips": "view",
        "maintenance": None,
        "fuel_expenses": None,
        "analytics": None,
        "settings": None,
    },
    "financial_analyst": {
        "dashboard": "full",
        "fleet": "view",
        "drivers": None,
        "trips": "view",
        "maintenance": "view",
        "fuel_expenses": "full",
        "analytics": "full",
        "settings": None,
    },
}


def require(resource: str, write: bool = False):
    def dep(user: User = Depends(get_current_user)) -> User:
        access = MATRIX.get(user.role, {}).get(resource)
        if access is None or (write and access != "full"):
            raise HTTPException(403, f"Role '{user.role}' cannot {'modify' if write else 'access'} {resource}")
        return user

    return dep
