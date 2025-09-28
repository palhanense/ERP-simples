from __future__ import annotations

from app.database import SessionLocal
from app import models


def run() -> None:
    with SessionLocal() as db:
        prod_count = db.query(models.Product).count()
        cust_count = db.query(models.Customer).count()
        sales_count = db.query(models.Sale).count()
        fin_count = db.query(models.FinancialEntry).count()

    print(f"Products: {prod_count}")
    print(f"Customers: {cust_count}")
    print(f"Sales: {sales_count}")
    print(f"Financial entries: {fin_count}")


if __name__ == "__main__":
    run()
