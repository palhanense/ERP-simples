import sqlite3
from decimal import Decimal
from app.database import get_sqlite_path
sqlite_path = get_sqlite_path()
if sqlite_path is None:
    raise SystemExit('This script expects a local sqlite DB; set DATABASE_URL to a sqlite path or run equivalent checks against Postgres')
p = str(sqlite_path)
conn=sqlite3.connect(p)
conn.row_factory = sqlite3.Row
cur=conn.cursor()
cur.execute("SELECT id, name, cost_price, sale_price, stock FROM products ORDER BY id LIMIT 50")
rows=cur.fetchall()
print(f"Products checked: {len(rows)}")
sum_stock = 0
total_cost = Decimal('0')
total_sale = Decimal('0')
for r in rows:
    stock = r['stock'] if r['stock'] is not None else 0
    cost = Decimal(r['cost_price'] or 0)
    sale = Decimal(r['sale_price'] or 0)
    sum_stock += int(stock)
    total_cost += cost * int(stock)
    total_sale += sale * int(stock)
    print(r['id'], r['name'][:40].ljust(40), 'stock=', stock, 'cost=', cost, 'sale=', sale)
print('---')
print('sum_stock=', sum_stock)
print('total_cost=', float(total_cost))
print('total_sale=', float(total_sale))
conn.close()
