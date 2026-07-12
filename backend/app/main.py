import os
from pathlib import Path

from dotenv import load_dotenv

# Load backend env before any module reads os.environ (db, auth, email all do at import).
# .env.local wins over .env, matching the frontend convention.
_backend = Path(__file__).resolve().parent.parent
load_dotenv(_backend / ".env")
load_dotenv(_backend / ".env.local", override=True)

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .db import Base, engine, get_db  # noqa: E402
from .routers import analytics, auth, drivers, fuel_expenses, maintenance, trips, users, vehicles  # noqa: E402
from .seed import seed  # noqa: E402

app = FastAPI(title="TransitOps")

# Production frontends (comma-separated), e.g. "https://transitops.example.com".
# The regex below still covers local dev, so ALLOWED_ORIGINS is only needed in prod.
_allowed = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    # Exact production origins from env, plus (via regex) localhost / any LAN IP on the dev
    # port — so the app works locally whether reached via localhost or the machine's IP.
    allow_origins=_allowed,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):3000",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(engine)
    db = next(get_db())
    try:
        seed(db)
    finally:
        db.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


for r in (auth, vehicles, drivers, trips, maintenance, fuel_expenses, analytics, users):
    app.include_router(r.router)
