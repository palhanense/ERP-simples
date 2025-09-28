from __future__ import annotations

from datetime import datetime, timedelta
from app.database import SessionLocal
from app import models

ENTRIES = []
now = datetime.utcnow()
for i in range(12):
    if i % 3 == 0:
        t = models.EntryType.RECEITA
        cat = ["Vendas", "Servicos", "Outros"][i % 3]
        amt = round(100 + i * 25 + (i * 13.37) % 200, 2)
    else:
        t = models.EntryType.DESPESA
        cat = ["Aluguel", "Salarios", "Material", "Contas"][i % 4]
        amt = round(20 + i * 17 + (i * 7.3) % 150, 2)
    dt = now - timedelta(days=i)
    ENTRIES.append((dt, t, cat, amt, f"Seeded entry {i}", dt, dt))


def main():
    with SessionLocal() as session:
        for date, etype, category, amount, notes, created, updated in ENTRIES:
            entry = models.FinancialEntry(
                date=date,
                type=etype,
                category=category,
                amount=amount,
                notes=notes,
                created_at=created,
                updated_at=updated,
            )
            session.add(entry)
        session.commit()
        print(f"Inserted {len(ENTRIES)} financial entries via SQLAlchemy")


if __name__ == '__main__':
    main()
