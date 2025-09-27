"""
Normaliza valores de enums (status/method/type) usando SQLAlchemy.
Isso funciona contra Postgres ou SQLite conforme `DATABASE_URL`.
"""

from app.database import SessionLocal
from app import models

session = SessionLocal()
updates = []
try:
    # sales.status
    statuses = {r[0] for r in session.query(models.Sale.status).distinct()}
    for s in statuses:
        if s is None:
            continue
        lower = s.lower()
        if s != lower:
            updates.append((s, lower))
            session.query(models.Sale).filter(models.Sale.status == s).update({models.Sale.status: lower}, synchronize_session=False)

    # sale_payments.method
    methods = {r[0] for r in session.query(models.SalePayment.method).distinct()}
    for m in methods:
        if m is None:
            continue
        lower = m.lower()
        if m != lower:
            updates.append((m, lower))
            session.query(models.SalePayment).filter(models.SalePayment.method == m).update({models.SalePayment.method: lower}, synchronize_session=False)

    # financial_entries.type
    types = {r[0] for r in session.query(models.FinancialEntry.type).distinct()}
    for t in types:
        if t is None:
            continue
        lower = t.lower()
        if t != lower:
            updates.append((t, lower))
            session.query(models.FinancialEntry).filter(models.FinancialEntry.type == t).update({models.FinancialEntry.type: lower}, synchronize_session=False)

    session.commit()
    print('normalized:', updates)
finally:
    session.close()
