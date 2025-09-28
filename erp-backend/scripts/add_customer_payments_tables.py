"""Ensure customer_payments and customer_payment_allocations exist using
SQLAlchemy models (idempotent). Prefer applying Alembic migrations for schema
changes in production.
"""

from app.database import engine
from app import models


def main():
    # This relies on models.CustomerPayment and CustomerPaymentAllocation being
    # declared in app.models — SQLAlchemy will CREATE TABLE IF NOT EXISTS style
    # on metadata.create_all when the table doesn't exist.
    models.Base.metadata.create_all(bind=engine, tables=[models.CustomerPayment.__table__, models.CustomerPaymentAllocation.__table__])
    print("Tables ensured via SQLAlchemy metadata.create_all()")


if __name__ == "__main__":
    main()
