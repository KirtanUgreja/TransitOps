import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import hash_password
from ..db import get_db
from ..email import send_credentials_email
from ..models import Role, User
from ..rbac import require
from ..schemas import UserCreatedOut, UserCreateIn, UserOut

router = APIRouter(prefix="/users", tags=["users"])

VALID_ROLES = {r.value for r in Role}
ROLE_LABELS = {
    "fleet_manager": "Fleet Manager", "dispatcher": "Dispatcher",
    "safety_officer": "Safety Officer", "financial_analyst": "Financial Analyst",
}


@router.get("", response_model=list[UserOut], dependencies=[Depends(require("settings"))])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()


@router.post("", response_model=UserCreatedOut, status_code=201,
             dependencies=[Depends(require("settings", write=True))])
def create_user(body: UserCreateIn, db: Session = Depends(get_db)):
    if body.role not in VALID_ROLES:
        raise HTTPException(422, f"Role must be one of {sorted(VALID_ROLES)}")
    password = secrets.token_urlsafe(9)  # the credential handed to the new user
    user = User(name=body.name, email=body.email, role=body.role,
                password_hash=hash_password(password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, f"A user with email '{body.email}' already exists")
    db.refresh(user)
    email_sent = send_credentials_email(
        to=user.email, name=user.name,
        role_label=ROLE_LABELS.get(user.role, user.role), password=password,
    )
    return UserCreatedOut(id=user.id, name=user.name, email=user.email,
                          role=user.role, password=password, email_sent=email_sent)
