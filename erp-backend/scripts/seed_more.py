from __future__ import annotations

import random
from datetime import datetime, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal, init_db

TARGET = 30

CATEGORIES = ["Vestuario", "Calcas", "Saias", "Acessorios", "Casa", "Beleza"]

PHONE_BASE = "+55 11 9{0:04d}-{1:04d}"


def ensure_products(db: Session) -> list[models.Product]:
    existing = db.query(models.Product).all()
    start = len(existing) + 1
    created = []
    if len(existing) >= TARGET:
        return existing

    for i in range(start, TARGET + 1):
        payload = {
            "name": f"Produto Seed {i}",
            "sku": f"SD-{i:04d}",
            "category": random.choice(CATEGORIES),
            "cost_price": round(random.uniform(10, 150), 2),
            "sale_price": round(random.uniform(20, 300), 2),
            "min_stock": random.randint(1, 20),
            "photos": [],
            "extra_attributes": {},
        }
        p = models.Product(**payload)
        db.add(p)
        created.append(p)
    db.commit()
    for p in created:
        db.refresh(p)
    return db.query(models.Product).all()


def ensure_customers(db: Session) -> list[models.Customer]:
    existing = db.query(models.Customer).all()
    start = len(existing) + 1
    created = []
    if len(existing) >= TARGET:
        return existing

    for i in range(start, TARGET + 1):
        payload = {
            "name": f"Cliente Seed {i}",
            "document": f"{random.randint(10000000000, 99999999999)}",
            "email": f"cliente{i}@example.com",
            "phone": PHONE_BASE.format(random.randint(1000, 9999), random.randint(1000, 9999)),
            "notes": "Seeded customer",
        }
        c = models.Customer(**payload)
        db.add(c)
        created.append(c)
    db.commit()
    for c in created:
        db.refresh(c)
    return db.query(models.Customer).all()


def ensure_sales(db: Session, customers: list[models.Customer], products: list[models.Product]) -> list[models.Sale]:
    count = db.query(models.Sale).count()
    if count >= TARGET:
        return db.query(models.Sale).all()

    for i in range(count + 1, TARGET + 1):
        customer = random.choice(customers)
        sale = models.Sale(
            customer_id=customer.id,
            status=models.SaleStatus.COMPLETED,
            notes="Seed sale",
        )
        db.add(sale)
        db.flush()

        total_amount = 0.0
        selected = random.sample(products, k=random.randint(1, 3))
        for p in selected:
            qty = random.randint(1, 5)
            unit_price = float(p.sale_price)
            line_total = round(unit_price * qty, 2)
            si = models.SaleItem(
                sale_id=sale.id,
                product_id=p.id,
                quantity=qty,
                unit_price=unit_price,
                line_total=line_total,
            )
            db.add(si)
            total_amount += line_total

        # payments: mostly one payment, sometimes split
        remaining = total_amount
        methods = [m for m in list(models.PaymentMethod)]
        payments = []
        if random.random() < 0.2 and len(methods) >= 2:
            # split in two
            a = round(total_amount * random.uniform(0.2, 0.6), 2)
            payments.append((methods[0], a))
            payments.append((methods[-1], round(total_amount - a, 2)))
        else:
            payments.append((random.choice(methods), round(total_amount, 2)))

        for method, amount in payments:
            sp = models.SalePayment(
                sale_id=sale.id,
                method=method,
                amount=amount,
            )
            db.add(sp)

        sale.total_amount = round(total_amount, 2)
        sale.created_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))
        sale.updated_at = sale.created_at

    db.commit()
    return db.query(models.Sale).all()


def ensure_financial_entries(db: Session) -> list[models.FinancialEntry]:
    existing = db.query(models.FinancialEntry).all()
    start = len(existing) + 1
    created = []
    if len(existing) >= TARGET:
        return existing

    categories_receita = ["Vendas", "Servicos", "Outros"]
    categories_despesa = ["Aluguel", "Salarios", "Material", "Contas"]
    now = datetime.utcnow()

    for i in range(start, TARGET + 1):
        if i % 3 == 0:
            entry_type = models.EntryType.RECEITA
            category = categories_receita[i % len(categories_receita)]
            amount = round(random.uniform(50, 2000), 2)
        else:
            entry_type = models.EntryType.DESPESA
            category = categories_despesa[i % len(categories_despesa)]
            amount = round(random.uniform(20, 1500), 2)

        entry = models.FinancialEntry(
            date=now - timedelta(days=i),
            type=entry_type,
            category=category,
            amount=amount,
            notes=f"Seeded entry {i}",
            created_at=now - timedelta(days=i),
            updated_at=now - timedelta(days=i),
        )
        db.add(entry)
        created.append(entry)

    db.commit()
    for e in created:
        db.refresh(e)
    return db.query(models.FinancialEntry).all()


def main() -> None:
    init_db()
    with SessionLocal() as db:
        products = ensure_products(db)
        customers = ensure_customers(db)
        sales = ensure_sales(db, customers, products)
        entries = ensure_financial_entries(db)

        print(f"products: {len(products)}")
        print(f"customers: {len(customers)}")
        print(f"sales: {len(sales)}")
        print(f"financial_entries: {len(entries)}")


if __name__ == "__main__":
    random.seed(12345)
    main()
