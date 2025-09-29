import pytest
from decimal import Decimal
from app import models, schemas
from app.database import SessionLocal, init_db

@pytest.fixture(scope="function")
def db():
    init_db()
    session = SessionLocal()
    yield session
    session.close()

def create_customer(db):
    customer = models.Customer(name="Cliente Teste", phone="11999999999")
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

import uuid

def create_product(db):
    sku = f"TEST-{uuid.uuid4().hex[:8]}"
    product = models.Product(name="Produto Teste", sku=sku, category="Test", cost_price=Decimal('10.00'), sale_price=Decimal('20.00'), stock=10, margin=Decimal('10.00'))
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

def test_create_sale_cash(db):
    customer = create_customer(db)
    product = create_product(db)
    sale = models.Sale(customer_id=customer.id, notes='Venda dinheiro teste', status=models.SaleStatus.COMPLETED)
    item = models.SaleItem(product_id=product.id, quantity=2, unit_price=product.sale_price, line_total=product.sale_price * 2)
    sale.items.append(item)
    sale.payments.append(models.SalePayment(method=models.PaymentMethod.DINHEIRO, amount=product.sale_price * 2))
    sale.total_amount = product.sale_price * 2
    db.add(sale)
    db.commit()
    db.refresh(sale)
    assert sale.id is not None
    assert sale.total_amount == Decimal('40.00')
    assert sale.items[0].quantity == 2
    assert sale.payments[0].method == models.PaymentMethod.DINHEIRO

def test_create_sale_fiado(db):
    customer = create_customer(db)
    product = create_product(db)
    sale = models.Sale(customer_id=customer.id, notes='Venda fiado teste', status=models.SaleStatus.COMPLETED)
    item = models.SaleItem(product_id=product.id, quantity=1, unit_price=product.sale_price, line_total=product.sale_price)
    sale.items.append(item)
    sale.payments.append(models.SalePayment(method=models.PaymentMethod.FIADO, amount=product.sale_price))
    sale.total_amount = product.sale_price
    db.add(sale)
    db.commit()
    db.refresh(sale)
    assert sale.id is not None
    assert sale.total_amount == Decimal('20.00')
    assert sale.payments[0].method == models.PaymentMethod.FIADO

def test_sale_stock_validation(db):
    customer = create_customer(db)
    product = create_product(db)
    sale = models.Sale(customer_id=customer.id, notes='Venda estoque teste', status=models.SaleStatus.COMPLETED)
    item = models.SaleItem(product_id=product.id, quantity=20, unit_price=product.sale_price, line_total=product.sale_price * 20)
    sale.items.append(item)
    sale.payments.append(models.SalePayment(method=models.PaymentMethod.DINHEIRO, amount=product.sale_price * 20))
    sale.total_amount = product.sale_price * 20
    db.add(sale)
    with pytest.raises(Exception):
        db.commit()  # Deve falhar por falta de estoque
