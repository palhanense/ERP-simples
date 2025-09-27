from pathlib import Path
from app.database import get_sqlite_path

sqlite_path = get_sqlite_path()
if sqlite_path is None:
    raise SystemExit('This script expects a local sqlite DB; run equivalent checks against Postgres')
DB = str(sqlite_path)

import sqlite3
import json
import sys

DB = str(sqlite_path)

try:
    conn = sqlite3.connect(DB)
except Exception as e:
    print(json.dumps({'error': f'could not open db: {e}'}))
    sys.exit(1)

cur = conn.cursor()
result = {}
tables = ['products', 'customers', 'sales', 'financial_entries']
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        c = cur.fetchone()[0]
        cur.execute(f"SELECT * FROM {t} LIMIT 3")
        rows = cur.fetchall()
        # convert rows to lists for JSON
        result[t] = {'count': c, 'rows': [list(r) for r in rows]}
    except Exception as e:
        result[t] = {'error': str(e)}

print(json.dumps(result, ensure_ascii=False, indent=2))
