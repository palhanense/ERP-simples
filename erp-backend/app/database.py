from __future__ import annotations

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    """Base class for all ORM models."""


DATABASE_URL = "sqlite:///./data/erp.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    """Create tables if they do not exist."""
    from app import models  # noqa: F401 - ensure models are imported

    Base.metadata.create_all(bind=engine)

    with engine.connect() as connection:
        result = connection.execute(text("PRAGMA table_info('products')"))
        columns = {row[1] for row in result}
        if "supplier" not in columns:
            connection.execute(text("ALTER TABLE products ADD COLUMN supplier VARCHAR(255)"))
