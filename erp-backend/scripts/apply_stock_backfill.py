import sqlite3
from decimal import Decimal
import json
import urllib.request

DB_PATH = r'C:/Users/abmme/OneDrive/Desktop/ERP sistema/erp-backend/data/erp.db'
BACKFILL_VALUE = 10

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
# apply backfill where stock is NULL or 0
cur.execute("SELECT COUNT(*) FROM products WHERE stock IS NULL OR stock=0")
to_update = cur.fetchone()[0]
print('products to update:', to_update)
if to_update > 0:
    cur.execute("UPDATE products SET stock=? WHERE stock IS NULL OR stock=0", (BACKFILL_VALUE,))
    conn.commit()
    print('updated rows:', to_update)
else:
    print('no rows needed update')

# recalc totals
cur.execute("SELECT id, name, cost_price, sale_price, stock FROM products")
rows = cur.fetchall()
from decimal import Decimal
sum_stock = 0
total_cost = Decimal('0')
total_sale = Decimal('0')
for r in rows:
    pid, name, cost_price, sale_price, stock = r
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

conn.close()
