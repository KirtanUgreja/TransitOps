import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://transitops:transitops@localhost:5432/transitops"
)

engine = create_engine(DATABASE_URL)


class Base(DeclarativeBase):
    pass


def get_db():
    with Session(engine) as session:
        yield session
