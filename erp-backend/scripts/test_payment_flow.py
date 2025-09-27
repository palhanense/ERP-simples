"""Test script: create a customer, create a fiado sale and register a payment.

This script uses the application's ORM and will persist data into erp.db so you can inspect it later.
Run with the workspace python (the environment already configured in this session).
"""
from decimal import Decimal
from app.database import SessionLocal, init_db
from app import crud, models

# ensure DB and tables exist
init_db()

def get_or_create_customer(db):
    # try to find a customer named 'Test Cliente'
    existing = db.query(models.Customer).filter(models.Customer.name == 'Test Cliente').first()
    if existing:
        return existing
    c = models.Customer(name='Test Cliente', email='test@example.com', phone='999999999')
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def create_fiado_sale(db, customer):
    # Create a product or use existing
    prod = db.query(models.Product).first()
    if not prod:
        prod = models.Product(name='Produto Teste', sku='TEST-001', category='Test', cost_price=Decimal('10.00'), sale_price=Decimal('20.00'), stock=10, margin=Decimal('10.00'))
        db.add(prod)
        db.commit()
        db.refresh(prod)

    # create sale with one item, total 20
    sale = models.Sale(customer_id=customer.id, notes='Venda fiado teste', status=models.SaleStatus.COMPLETED)
    item = models.SaleItem(product_id=prod.id, quantity=1, unit_price=prod.sale_price, line_total=prod.sale_price)
    sale.items.append(item)
    # mark the payment as fiado (so total_fiado > 0)
    sale.payments.append(models.SalePayment(method=models.PaymentMethod.FIADO, amount=prod.sale_price))
    sale.total_amount = prod.sale_price
    db.add(sale)
    db.commit()
    db.refresh(sale)
    print('Created sale', sale.id, 'total', float(sale.total_amount))
    return sale


def run():
    db = SessionLocal()
    try:
        customer = get_or_create_customer(db)
        print('Customer id', customer.id)
        sale = create_fiado_sale(db, customer)

        # Now create another older sale to test FIFO: create a sale with earlier created_at
        old_sale = models.Sale(customer_id=customer.id, notes='Venda antiga', status=models.SaleStatus.COMPLETED)
        old_item = models.SaleItem(product_id=sale.items[0].product_id, quantity=2, unit_price=sale.items[0].unit_price, line_total=sale.items[0].unit_price * 2)
        old_sale.items.append(old_item)
        old_sale.payments.append(models.SalePayment(method=models.PaymentMethod.FIADO, amount=old_item.line_total))
        old_sale.total_amount = old_item.line_total
        db.add(old_sale)
        db.commit()
        db.refresh(old_sale)
        print('Created older sale', old_sale.id, 'total', float(old_sale.total_amount))

        # Add a payment that should first reduce the older sale (FIFO)
        amount_to_pay = float(old_sale.total_amount) + 5.0  # pay more than older sale to force allocation to next
        result = crud.create_customer_payment(db, customer_id=customer.id, amount=amount_to_pay, method='dinheiro', notes='Pagamento teste')
        print('Payment id', result['payment'].id, 'remaining', result['remaining'])
        print('Allocations:')
        for a in result['allocations']:
            print(' sale', a['sale_id'], 'amount', a['amount'])

        from app.database import get_db_url
        print('Done. Data persisted to database at', get_db_url())
    finally:
        db.close()

if __name__ == '__main__':
    run()
