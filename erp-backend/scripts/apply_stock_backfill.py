"""
Backfill minimal stock values for products and compute totals using
SQLAlchemy so the script runs against Postgres or SQLite via DATABASE_URL.
"""

from decimal import Decimal
import json
import urllib.request

from app.database import SessionLocal
from app import models

BACKFILL_VALUE = 10

session = SessionLocal()
try:
    # count products needing backfill
    to_update = session.query(models.Product).filter((models.Product.stock == None) | (models.Product.stock == 0)).count()
    print('products to update:', to_update)
    if to_update > 0:
        session.query(models.Product).filter((models.Product.stock == None) | (models.Product.stock == 0)).update({models.Product.stock: BACKFILL_VALUE}, synchronize_session=False)
        session.commit()
        print('updated rows:', to_update)
    else:
        print('no rows needed update')

    # recalc totals
    rows = session.query(models.Product.id, models.Product.name, models.Product.cost_price, models.Product.sale_price, models.Product.stock).all()
    sum_stock = 0
    total_cost = Decimal('0')
    total_sale = Decimal('0')
    for pid, name, cost_price, sale_price, stock in rows:
        stock = stock or 0
        sum_stock += int(stock)
        total_cost += Decimal(cost_price or 0) * int(stock)
        total_sale += Decimal(sale_price or 0) * int(stock)

    print('--- after backfill ---')
    print('sum_stock=', sum_stock)
    print('total_cost=', float(total_cost))
    print('total_sale=', float(total_sale))
    print('sample products:')
    for r in rows[:5]:
        print(r)

    # try calling backend endpoint
    try:
        url = 'http://127.0.0.1:8000/reports/products?limit=500'
        print('\ncalling', url)
        resp = urllib.request.urlopen(url, timeout=5)
        data = resp.read().decode('utf-8')
        try:
            j = json.loads(data)
            print('endpoint totals:', j.get('totals'))
        except Exception as e:
            print('failed to parse JSON from endpoint:', e)
    except Exception as e:
        print('HTTP call failed:', e)
finally:
    session.close()
