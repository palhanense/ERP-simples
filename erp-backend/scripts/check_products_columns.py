import sqlite3
p=r'C:/Users/abmme/OneDrive/Desktop/ERP sistema/erp-backend/data/erp.db'
conn=sqlite3.connect(p)
cur=conn.cursor()
cur.execute("PRAGMA table_info('products')")
rows=cur.fetchall()
for r in rows:
    print(r)
conn.close()
