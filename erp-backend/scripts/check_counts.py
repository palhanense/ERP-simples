from __future__ import annotations

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app import models


def main() -> None:
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
    main()
