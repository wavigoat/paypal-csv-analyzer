import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Falls back to the docker-compose default so `uvicorn main:app` just works
# once `docker compose up -d` has been run once.
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+psycopg2://paypal:paypal@localhost:5432/paypal_analytics",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()