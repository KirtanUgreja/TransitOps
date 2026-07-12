import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


def _normalize_db_url(url: str) -> str:
    """Let a raw Neon/managed-Postgres URL be pasted as-is. Neon hands out a plain
    `postgresql://…` URL, but SQLAlchemy needs the `+psycopg` driver and Neon requires TLS.
    Rewrite the scheme and ensure `sslmode=require` — a no-op for a URL that's already correct."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    # Only force SSL for a remote host (skip localhost, where Postgres has no TLS by default).
    if "sslmode=" not in url and "@localhost" not in url and "@127.0.0.1" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


DATABASE_URL = _normalize_db_url(os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://transitops:transitops@localhost:5432/transitops"
))

engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


def get_db():
    with Session(engine) as session:
        yield session
