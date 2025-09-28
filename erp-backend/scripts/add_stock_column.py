"""Backfill `stock` for products using SQLAlchemy.

This script will only perform the backfill. If the `stock` column is missing
it will instruct you to add it via Alembic (Postgres) and exit.
"""

from app.database import SessionLocal, engine
from app import models
from sqlalchemy import inspect


def main():
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("products")]
    print("product columns:", cols)
    if "stock" not in cols:
        raise SystemExit("Column 'stock' not found. Apply an Alembic migration to add it, then run this script to backfill.")

    updated = 0
    with SessionLocal() as session:
        products = session.query(models.Product).all()
        for p in products:
            try:
                if getattr(p, "stock", None) and int(p.stock) > 0:
                    continue
            except Exception:
                pass

            extra = p.extra_attributes or {}
            for key in ("stock", "estoque", "available_stock"):
                if key in extra:
                    try:
                        n = int(extra[key])
                        p.stock = n
                        updated += 1
                        break
                    except Exception:
                        continue

        session.commit()

    print("backfilled rows:", updated)


if __name__ == "__main__":
    main()
