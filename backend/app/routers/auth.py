from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import (
    create_token, get_current_user, hash_password, verify_clerk_token, verify_password,
)
from ..db import get_db
from ..models import User
from ..schemas import ClerkLoginIn, LoginIn, LoginOut, PasswordChangeIn, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    return LoginOut(token=create_token(user), user=UserOut.model_validate(user))


@router.post("/clerk", response_model=LoginOut)
def clerk_login(body: ClerkLoginIn, db: Session = Depends(get_db)):
    """Bridge a verified Clerk session into an app user + JWT.

    Clerk owns identity; we still own the role. A Clerk user is provisioned as
    fleet_manager (the admin) on first sign-in, then uses the normal app JWT.
    """
    claims = verify_clerk_token(body.token)
    clerk_id = claims["sub"]

    user = db.scalar(select(User).where(User.clerk_id == clerk_id))
    if user is None and body.email:
        # link an existing account with the same email (e.g. a demo/issued user)
        user = db.scalar(select(User).where(User.email == body.email))
        if user is not None:
            user.clerk_id = clerk_id
    if user is None:
        user = User(
            name=body.name or (body.email.split("@")[0] if body.email else "Clerk User"),
            email=body.email or f"{clerk_id}@clerk.local",
            role="fleet_manager",
            clerk_id=clerk_id,
            password_hash="",
        )
        db.add(user)
    db.commit()
    db.refresh(user)
    return LoginOut(token=create_token(user), user=UserOut.model_validate(user))


@router.post("/password", status_code=204)
def change_password(
    body: PasswordChangeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Self-service password rotation for issued/demo users."""
    if not user.password_hash:
        raise HTTPException(400, "Clerk accounts change their password in Clerk, not here.")
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
