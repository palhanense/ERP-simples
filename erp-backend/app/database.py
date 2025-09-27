from __future__ import annotations

from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import logging
import os
import time



class Base(DeclarativeBase):
    """Base class for all ORM models."""


# Use an absolute path for the SQLite DB so behavior is deterministic regardless of CWD
ROOT = Path(__file__).resolve().parents[1]
DB_DIR = ROOT / "data"
DB_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DB_DIR / "erp.db"

# Allow overriding DATABASE_URL from environment for flexibility (e.g., move DB out of OneDrive)
env_db = os.environ.get("DATABASE_URL")
if env_db:
    DATABASE_URL = env_db
else:
    DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

# Use a simple lockfile to avoid concurrent init_db runs (works across processes on Windows)
# Create engine with sensible defaults for SQLite vs Postgres/other DBs
connect_args = {}
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    # SQLite needs check_same_thread for SQLAlchemy with multiple threads
    connect_args = {"check_same_thread": False}
else:
    # For Postgres and other networked DBs, enable pooling and pre-ping
    engine_kwargs = {"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20}

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db(timeout: float = 15.0, poll_interval: float = 0.2) -> None:
    """Create tables if they do not exist and apply minimal safe schema fixes.

    Uses a simple lockfile mechanism to avoid concurrent initialization when a
    code reloader spawns multiple processes. If another process holds the lock,
    this function will wait until the lock is released or the timeout expires.
    """
    from app import models  # noqa: F401 - ensure models are imported

    lock_path = DB_DIR / ".init_lock"
    start = time.time()
    lock_fd = None

    # Attempt to acquire lock by atomically creating the lock file.
    while True:
        try:
            # os.O_EXCL|os.O_CREAT ensures we fail if file exists
            lock_fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            # We created the lock file successfully — write pid for debugging
            os.write(lock_fd, str(os.getpid()).encode())
            break
        except FileExistsError:
            # Another process is initializing. Wait for it to finish or timeout.
            if time.time() - start > timeout:
                logging.warning("timeout waiting for init lock; proceeding anyway")
                break
            time.sleep(poll_interval)
        except Exception:
            logging.exception("unexpected error while acquiring init lock")
            break

    try:
        # Create any missing tables according to current models
        try:
            Base.metadata.create_all(bind=engine)
        except Exception:
            logging.exception("failed to create tables via metadata.create_all")

        # Example migration: add 'supplier' column to products table if missing.
        # This is a tiny, safe, best-effort migration; for real projects prefer Alembic.
        try:
            with engine.connect() as connection:
                dialect = engine.dialect.name
                columns = set()
                if dialect == "sqlite":
                    # sqlite: use PRAGMA
                    result = connection.execute(text("PRAGMA table_info('products')"))
                    rows = result.fetchall()
                    columns = {row[1] for row in rows}
                else:
                    # Postgres and others: use information_schema to list columns
                    try:
                        result = connection.execute(
                            text(
                                "SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND table_schema = 'public'"
                            )
                        )
                        rows = result.fetchall()
                        columns = {row[0] for row in rows}
                    except Exception:
                        # If information_schema query fails (e.g., different schema), fall back to empty set
                        logging.exception("failed to query information_schema for products columns")

                if "supplier" not in columns:
                    try:
                        connection.execute(text("ALTER TABLE products ADD COLUMN supplier VARCHAR(255)"))
                    except Exception:
                        # If another process added the column between the check and the ALTER,
                        # ignore the error and continue. Log for visibility.
                        logging.exception(
                            "failed to add 'supplier' column; it might have been added concurrently"
                        )
        except Exception:
            logging.exception("error while checking/applying lightweight schema changes")
    finally:
        try:
            if lock_fd is not None:
                os.close(lock_fd)
            # Remove the lock file if we're the creator
            if lock_path.exists():
                try:
                    lock_path.unlink()
                except Exception:
                    logging.exception("failed to remove init lock file")
        except Exception:
            logging.exception("error cleaning up init lock")


def get_db_url() -> str:
    """Return the active DATABASE_URL used by the application.

    If the app is configured to use the local SQLite file, this will return
    the sqlite URL so scripts can still open the same DB when running
    outside the app process.
    """
    return DATABASE_URL


def get_sqlite_path() -> Path | None:
    """Return the Path to the local sqlite file when using sqlite, else None."""
    if DATABASE_URL.startswith("sqlite"):
        return DB_PATH
    return None
