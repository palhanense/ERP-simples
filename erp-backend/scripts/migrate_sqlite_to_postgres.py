"""Migrate data from the local SQLite `data/erp.db` to a Postgres database.

Usage:
  python migrate_sqlite_to_postgres.py --sqlite sqlite:///./data/erp.db --postgres "postgresql+psycopg://user:pass@host:5432/db"

This script uses the project's SQLAlchemy models to perform row-by-row copy.
It is intentionally conservative and logs progress; test on a copy first.
"""
import argparse
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


def main(sqlite_url: str, postgres_url: str):
    # Import models lazily to avoid side-effects
    from app import models

    # Create engines
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    Postgres_engine = create_engine(postgres_url)

    SQLiteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=Postgres_engine)

    s_sqlite = SQLiteSession()
    s_pg = PostgresSession()

    try:
        # Copy rows for each model in dependency order. This list is derived from app.models
        model_order = [
            models.Category,
            models.Cashbox,
            models.Customer,
            models.Product,
            models.FinancialEntry,
            models.Sale,
            models.SaleItem,
            models.SalePayment,
            models.CustomerPayment,
            models.CustomerPaymentAllocation,
        ]

        for M in model_order:
            table_name = M.__tablename__
            logging.info('Migrating table %s', table_name)
            rows = s_sqlite.query(M).all()
            for r in rows:
                r_dict = {k: getattr(r, k) for k in r.__dict__ if not k.startswith('_sa_')}
                obj = M(**r_dict)
                s_pg.merge(obj)
            s_pg.commit()

        # Adjust sequences for Postgres
        with Postgres_engine.connect() as conn:
            for M in model_order:
                table = M.__tablename__
                try:
                    conn.execute("SELECT setval(pg_get_serial_sequence('%s','id'), (SELECT COALESCE(MAX(id),1) FROM %s));" % (table, table))
                except Exception:
                    logging.exception('failed to set sequence for %s', table)

    finally:
        s_sqlite.close()
        s_pg.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sqlite', required=False, default='sqlite:///./data/erp.db')
    parser.add_argument('--postgres', required=True)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    main(args.sqlite, args.postgres)
