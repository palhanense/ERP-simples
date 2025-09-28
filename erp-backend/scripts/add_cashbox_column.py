"""Ensure cashbox_id column exists and optionally backfill values.

This script performs only backfill/inspection. For Postgres schema changes use
Alembic to add the column first.
"""

from sqlalchemy import inspect
from app.database import engine, SessionLocal
from app import models


def main():
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("financial_entries")]
    print("financial_entries columns:", cols)
    if "cashbox_id" not in cols:
        raise SystemExit("Column 'cashbox_id' not found. Apply Alembic migration to add it before running backfill.")

    # nothing to backfill by default here; we leave placeholder for custom logic
    print("cashbox_id present — no automatic backfill implemented.")


if __name__ == "__main__":
    main()
