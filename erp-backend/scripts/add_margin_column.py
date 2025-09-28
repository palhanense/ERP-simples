"""Backfill `margin` for products using SQLAlchemy.

If the `margin` column is missing, please add it via an Alembic migration
before running this script.
"""

from decimal import Decimal
from sqlalchemy import inspect
from app.database import SessionLocal, engine
from app import models


def main():
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("products")]
    print("product columns:", cols)
    if "margin" not in cols:
        raise SystemExit("Column 'margin' not found. Apply an Alembic migration to add it, then run this script to backfill.")

    updated = 0
    with SessionLocal() as session:
        rows = session.query(models.Product.id, models.Product.cost_price, models.Product.sale_price).all()
        for pid, cost, sale in rows:
            try:
                c = Decimal(cost or 0)
                s = Decimal(sale or 0)
                m = s - c
                product = session.get(models.Product, pid)
                product.margin = float(m)
                updated += 1
            except Exception:
                continue
        session.commit()

    print('backfilled rows:', updated)


if __name__ == '__main__':
    main()
