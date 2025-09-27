import sqlite3, os
root = r"c:\Users\abmme\OneDrive\Desktop\ERP sistema"
db_path = os.path.join(root, 'erp-backend', 'data', 'erp.db')
print('DB exists:', os.path.exists(db_path))
if not os.path.exists(db_path):
    raise SystemExit('DB file not found: ' + db_path)
conn = sqlite3.connect(db_path)
cur = conn.cursor()
cur.execute("PRAGMA table_info('financial_entries')")
cols = [r[1] for r in cur.fetchall()]
print('financial_entries columns:', cols)
if 'cashbox_id' not in cols:
    print('Adding cashbox_id column...')
    cur.execute('ALTER TABLE financial_entries ADD COLUMN cashbox_id INTEGER')
    conn.commit()
    print('Added column')
else:
    print('Column already present')
conn.close()
