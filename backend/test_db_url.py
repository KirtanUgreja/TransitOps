"""Deployment: DATABASE_URL normalization for Neon-style URLs."""
from app.db import _normalize_db_url


def test_neon_plain_url_gets_driver_and_ssl():
    raw = "postgresql://user:pw@ep-cool-name.us-east-2.aws.neon.tech/transitops"
    out = _normalize_db_url(raw)
    assert out.startswith("postgresql+psycopg://")
    assert "sslmode=require" in out


def test_postgres_scheme_alias():
    out = _normalize_db_url("postgres://user:pw@host.neon.tech/db")
    assert out.startswith("postgresql+psycopg://")
    assert "sslmode=require" in out


def test_existing_sslmode_not_duplicated():
    raw = "postgresql://u:p@host.neon.tech/db?sslmode=require"
    out = _normalize_db_url(raw)
    assert out.count("sslmode=") == 1


def test_localhost_left_untouched_no_ssl():
    raw = "postgresql+psycopg://transitops:transitops@localhost:5432/transitops"
    out = _normalize_db_url(raw)
    assert out == raw  # already correct driver, localhost → no ssl forced


if __name__ == "__main__":
    test_neon_plain_url_gets_driver_and_ssl()
    test_postgres_scheme_alias()
    test_existing_sslmode_not_duplicated()
    test_localhost_left_untouched_no_ssl()
    print("ok")
