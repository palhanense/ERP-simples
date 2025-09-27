import sqlite3
from decimal import Decimal
p=r'C:/Users/abmme/OneDrive/Desktop/ERP sistema/erp-backend/data/erp.db'
con=sqlite3.connect(p)
cur=con.cursor()
cur.execute("PRAGMA table_info('products')")
cols=[r[1] for r in cur.fetchall()]
print('columns before:',cols)
if 'margin' not in cols:
    cur.execute("ALTER TABLE products ADD COLUMN margin NUMERIC NOT NULL DEFAULT 0")
    print('added column margin')
else:
    print('margin column exists')

# backfill
cur.execute("SELECT id, cost_price, sale_price FROM products")
rows=cur.fetchall()
updated=0
for id, cost, sale in rows:
    try:
        c = Decimal(cost or 0)
        s = Decimal(sale or 0)
        m = s - c
        cur.execute('UPDATE products SET margin=? WHERE id=?',(float(m),id))
        updated+=1
    except Exception:
        continue
con.commit()
print('backfilled rows:',updated)
cur.execute("PRAGMA table_info('products')")
print('columns after:',[r[1] for r in cur.fetchall()])
con.close()
