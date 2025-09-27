from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal, init_db

PRODUCTS = [
    {
        "name": "Vestido Midi Essential",
        "sku": "VST-001",
        "category": "Vestuario",
        "cost_price": 89.9,
        "sale_price": 159.9,
        "stock": 25,
        "min_stock": 10,
        "photos": [],
        "extra_attributes": {"tamanho": ["P", "M", "G"]},
    },
    {
        "name": "Blusa Oversized Soft",
        "sku": "BLS-101",
        "category": "Vestuario",
        "cost_price": 59.5,
        "sale_price": 119.0,
        "stock": 40,
        "min_stock": 12,
        "photos": [],
        "extra_attributes": {"tamanho": ["M", "G", "GG"]},
    },
    {
        "name": "Calca Jeans Minimal",
        "sku": "CLJ-204",
        "category": "Calcas",
        "cost_price": 110.0,
        "sale_price": 189.5,
        "stock": 18,
        "min_stock": 8,
        "photos": [],
        "extra_attributes": {"tamanho": ["36", "38", "40", "42"]},
    },
    {
        "name": "Saia Plissada Noir",
        "sku": "SAI-330",
        "category": "Saias",
        "cost_price": 72.3,
        "sale_price": 139.0,
        "stock": 12,
        "min_stock": 6,
        "photos": [],
        "extra_attributes": {"tamanho": ["P", "M", "G"]},
    },
]

CUSTOMERS = [
    {
        "name": "Ana Paula",
        "document": "12345678900",
        "email": "ana@example.com",
        "phone": "+55 11 98888-1111",
        "notes": "Cliente recorrente",
    },
    {
        "name": "Carlos Lima",
        "document": "98765432100",
        "email": "carlos@example.com",
        "phone": "+55 11 97777-2222",
        "notes": "Prefere pagamento em cartao",
    },
    {
        "name": "Loja Dona Rosa",
        "document": "12345678000199",
        "email": "contato@donarosa.com",
        "phone": "+55 11 3666-1234",
        "notes": "Cliente atacado",
    },
]

PAYMENTS_CATALOG = [
    models.PaymentMethod.DINHEIRO,
    models.PaymentMethod.PIX,
    models.PaymentMethod.CARTAO,
    models.PaymentMethod.FIADO,
]


def ensure_products(db: Session) -> list[models.Product]:
    existing = db.query(models.Product).all()
    if existing:
        return existing

    created: list[models.Product] = []
    for payload in PRODUCTS:
        product = models.Product(**payload)
        db.add(product)
        created.append(product)
    db.commit()
    for product in created:
        db.refresh(product)
    return created


def ensure_customers(db: Session) -> list[models.Customer]:
    existing = db.query(models.Customer).all()
    if existing:
        return existing

    created: list[models.Customer] = []
    for payload in CUSTOMERS:
        customer = models.Customer(**payload)
        db.add(customer)
        created.append(customer)
    db.commit()
    for customer in created:
        db.refresh(customer)
    return created


def seed_sales(db: Session, customers: list[models.Customer], products: list[models.Product]) -> None:
    if db.query(models.Sale).count() > 0:
        return

    for index in range(5):
        customer = random.choice(customers)
        sale = models.Sale(
            customer_id=customer.id,
            status=models.SaleStatus.COMPLETED,
            notes="Pedido de teste",
        )
        db.add(sale)
        db.flush()

        total_amount = 0.0
        selected_products = random.sample(products, k=min(len(products), 2 + index % 2))
        for product in selected_products:
            quantity = random.randint(1, 3)
            unit_price = float(product.sale_price)
            line_total = unit_price * quantity
            sale_item = models.SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
            total_amount += line_total
            db.add(sale_item)

        payments = []
        remaining = total_amount
        for method in PAYMENTS_CATALOG[:-1]:
            if remaining <= 0:
                break
            amount = round(remaining * random.uniform(0.2, 0.6), 2)
            payments.append((method, amount))
            remaining -= amount

        if remaining > 0:
            payments.append((PAYMENTS_CATALOG[-1], round(remaining, 2)))

        for method, amount in payments:
            sale_payment = models.SalePayment(
                sale_id=sale.id,
                method=method,
                amount=amount,
            )
            db.add(sale_payment)

        sale.total_amount = total_amount
        sale.created_at = datetime.utcnow() - timedelta(days=index)
        sale.updated_at = sale.created_at

    db.commit()


def ensure_financial_entries(db: Session) -> list[models.FinancialEntry]:
    existing = db.query(models.FinancialEntry).all()
    if existing:
        return existing

    created: list[models.FinancialEntry] = []
    categories_receita = ["Vendas", "Servicos", "Outros"]
    categories_despesa = ["Aluguel", "Salarios", "Material", "Contas"]
    now = datetime.utcnow()

    for i in range(12):
        if i % 3 == 0:
            entry_type = models.EntryType.RECEITA
            category = categories_receita[i % len(categories_receita)]
            amount = round(random.uniform(50, 1000), 2)
        else:
            entry_type = models.EntryType.DESPESA
            category = categories_despesa[i % len(categories_despesa)]
            amount = round(random.uniform(20, 800), 2)

        entry = models.FinancialEntry(
            date=now - timedelta(days=i),
            type=entry_type,
            category=category,
            amount=amount,
            notes=f"Seed entry {i}",
            created_at=now - timedelta(days=i),
            updated_at=now - timedelta(days=i),
        )
        db.add(entry)
        created.append(entry)

    db.commit()
    for e in created:
        db.refresh(e)
    return created


def main() -> None:
    init_db()
    with SessionLocal() as db:
        products = ensure_products(db)
        customers = ensure_customers(db)
        seed_sales(db, customers, products)
    print("Banco inicializado com dados de teste.")


if __name__ == "__main__":
    random.seed(42)
    main()
