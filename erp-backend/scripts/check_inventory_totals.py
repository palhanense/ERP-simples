
"""
Calcula totais de inventário via SQLAlchemy (funciona com Postgres).
"""

from decimal import Decimal
from app.database import SessionLocal
from app import models

with SessionLocal() as session:
    rows = session.query(models.Product.id, models.Product.name, models.Product.cost_price, models.Product.sale_price, models.Product.stock).order_by(models.Product.id).limit(50).all()
    print(f"Products checked: {len(rows)}")
    sum_stock = 0
    total_cost = Decimal('0')
    total_sale = Decimal('0')
    for pid, name, cost, sale, stock in rows:
        stock = stock or 0
        cost = Decimal(cost or 0)
        sale = Decimal(sale or 0)
        sum_stock += int(stock)
        total_cost += cost * int(stock)
        total_sale += sale * int(stock)
        print(pid, (name or '')[:40].ljust(40), 'stock=', stock, 'cost=', cost, 'sale=', sale)
    print('---')
    print('sum_stock=', sum_stock)
    print('total_cost=', float(total_cost))
    print('total_sale=', float(total_sale))
