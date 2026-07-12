import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import User

JWT_SECRET = os.environ.get("JWT_SECRET", "transitops-dev-secret")
JWT_ALGO = "HS256"

bearer = HTTPBearer(auto_error=False)

# Clerk: verify session tokens against the instance JWKS.
CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "https://sunny-terrapin-30.clerk.accounts.dev")
_clerk_jwks = jwt.PyJWKClient(f"{CLERK_ISSUER}/.well-known/jwks.json")


def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk session JWT and return its claims (sub = Clerk user id)."""
    try:
        key = _clerk_jwks.get_signing_key_from_jwt(token).key
        return jwt.decode(
            token, key, algorithms=["RS256"], issuer=CLERK_ISSUER,
            leeway=10,  # tolerate small clock skew on short-lived session tokens
            options={"verify_aud": False},  # Clerk session tokens have no fixed audience
        )
    except jwt.PyJWTError as e:
        raise HTTPException(401, f"Invalid Clerk token: {e}")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def user_from_token(token: str, db: Session) -> User:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(401, "User not found")
    return user


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(401, "Not authenticated")
    return user_from_token(creds.credentials, db)
