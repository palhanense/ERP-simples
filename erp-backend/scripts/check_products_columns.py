import sqlite3
from app.database import get_sqlite_path

sqlite_path = get_sqlite_path()
if sqlite_path is None:
    raise SystemExit('This script expects a local sqlite DB; run against Postgres differently')
p = str(sqlite_path)
conn=sqlite3.connect(p)
cur=conn.cursor()
cur.execute("PRAGMA table_info('products')")
rows=cur.fetchall()
for r in rows:
    print(r)
conn.close()
