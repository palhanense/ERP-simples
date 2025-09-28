from __future__ import annotations
import random
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal, init_db

from faker import Faker
fake = Faker('pt_BR')

PRODUCTS = [
    {
        "name": fake.unique.word().capitalize() + " " + fake.word().capitalize(),
        "sku": f"SKU-{i:03d}",
        "category": fake.word().capitalize(),
        "supplier": fake.company(),
        "cost_price": round(fake.pydecimal(left_digits=3, right_digits=2, positive=True), 2),
        "sale_price": round(fake.pydecimal(left_digits=3, right_digits=2, positive=True), 2),
        "stock": fake.random_int(min=0, max=100),
        "min_stock": fake.random_int(min=0, max=20),
        "photos": [],
        "extra_attributes": {"tamanho": fake.random_elements(elements=["P", "M", "G", "GG", "36", "38", "40", "42"], length=3, unique=True)},
    }
    for i in range(50)
]

CUSTOMERS = [
    {
        "name": fake.name(),
        "email": fake.email(),
        "phone": fake.phone_number(),
        "notes": fake.sentence(nb_words=6),
    }
    for _ in range(50)
]

## Removido bloco de sobrescrita de CUSTOMERS para garantir 50 clientes gerados com Faker

PAYMENTS_CATALOG = [
    models.PaymentMethod.DINHEIRO,
    models.PaymentMethod.PIX,
    models.PaymentMethod.CARTAO,
    models.PaymentMethod.FIADO,
]


def ensure_products(db: Session) -> list[models.Product]:
    # Apagar dependências antes de apagar produtos
    db.query(models.SalePayment).delete()
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.query(models.CustomerPaymentAllocation).delete()
    db.query(models.CustomerPayment).delete()
    db.query(models.FinancialEntry).delete()
    db.commit()
    db.query(models.Product).delete()
    db.commit()
    created: list[models.Product] = []
    for payload in PRODUCTS:
        # garantir sku único
        if db.query(models.Product).filter_by(sku=payload["sku"]).first():
            continue
        product = models.Product(**payload)
        db.add(product)
        created.append(product)
    db.commit()
    for product in created:
        db.refresh(product)
    return created


def ensure_customers(db: Session) -> list[models.Customer]:
    # Apagar dependências antes de apagar clientes
    db.query(models.SalePayment).delete()
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.query(models.CustomerPaymentAllocation).delete()
    db.query(models.CustomerPayment).delete()
    db.query(models.FinancialEntry).delete()
    db.commit()
    db.query(models.Customer).delete()
    db.commit()
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
    db.query(models.SalePayment).delete()
    db.query(models.SaleItem).delete()
    db.query(models.Sale).delete()
    db.commit()
    for index in range(50):
        customer = random.choice(customers)
        sale = models.Sale(
            customer_id=customer.id,
            status=models.SaleStatus.COMPLETED,
            notes=fake.sentence(nb_words=6),
        )
        db.add(sale)
        db.flush()

        total_amount = 0.0
        selected_products = random.sample(products, k=random.randint(1, 4))
        for product in selected_products:
            quantity = random.randint(1, 5)
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
    db.query(models.FinancialEntry).delete()
    db.commit()
    created: list[models.FinancialEntry] = []
    categories_receita = ["Vendas", "Servicos", "Outros"]
    categories_despesa = ["Aluguel", "Salarios", "Material", "Contas"]
    now = datetime.utcnow()

    for i in range(50):
        if i % 3 == 0:
            entry_type = models.EntryType.RECEITA
            category = random.choice(categories_receita)
            amount = round(random.uniform(50, 1000), 2)
        else:
            entry_type = models.EntryType.DESPESA
            category = random.choice(categories_despesa)
            amount = round(random.uniform(20, 800), 2)

        entry = models.FinancialEntry(
            date=now - timedelta(days=i),
            type=entry_type,
            category=category,
            amount=amount,
            notes=fake.sentence(nb_words=6),
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
        ensure_financial_entries(db)
    print("Banco inicializado com 50 registros em cada tabela principal.")


def run() -> None:
    random.seed(42)
    main()


if __name__ == "__main__":
    run()
