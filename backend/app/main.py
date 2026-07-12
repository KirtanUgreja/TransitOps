from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import Base, engine, get_db
from .routers import analytics, auth, drivers, fuel_expenses, maintenance, trips, users, vehicles
from .seed import seed

app = FastAPI(title="TransitOps")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
