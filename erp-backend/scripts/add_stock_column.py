import sqlite3, json
p=r'C:/Users/abmme/OneDrive/Desktop/ERP sistema/erp-backend/data/erp.db'
con=sqlite3.connect(p)
cur=con.cursor()
# check existing columns
cur.execute("PRAGMA table_info('products')")
cols=[r[1] for r in cur.fetchall()]
print('columns before:',cols)
if 'stock' not in cols:
    cur.execute("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0")
    print('added column stock')
else:
    print('stock column exists')
# try backfill from extra_attributes if empty
cur.execute("SELECT id, extra_attributes, stock FROM products")
rows=cur.fetchall()
updated=0
for id, extra, stock in rows:
    if stock and stock>0:
        continue
    try:
        if extra:
            obj=json.loads(extra)
            for key in ('stock','estoque','available_stock'):
                if key in obj:
                    val=obj[key]
                    try:
                        n=int(val)
                        cur.execute('UPDATE products SET stock=? WHERE id=?',(n,id))
                        updated+=1
                        break
                    except:
                        continue
    except Exception as e:
        pass
con.commit()
print('backfilled rows:',updated)
cur.execute("PRAGMA table_info('products')")
print('columns after:',[r[1] for r in cur.fetchall()])
con.close()
