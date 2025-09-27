import sqlite3
from pathlib import Path

DB = Path('data/erp.db')
if not DB.exists():
    print('db not found:', DB)
    raise SystemExit(1)

conn = sqlite3.connect(DB)
cur = conn.cursor()

updates = []
# normalize sales.status
cur.execute("SELECT DISTINCT status FROM sales")
rows = [r[0] for r in cur.fetchall()]
for s in rows:
    if s is None:
        continue
    lower = s.lower()
    if s != lower:
        updates.append((s, lower))
        cur.execute("UPDATE sales SET status = ? WHERE status = ?", (lower, s))

# normalize sale_payments.method
cur.execute("SELECT DISTINCT method FROM sale_payments")
rows = [r[0] for r in cur.fetchall()]
for m in rows:
    if m is None:
        continue
    lower = m.lower()
    if m != lower:
        updates.append((m, lower))
        cur.execute("UPDATE sale_payments SET method = ? WHERE method = ?", (lower, m))

# normalize financial_entries.type
cur.execute("SELECT DISTINCT type FROM financial_entries")
rows = [r[0] for r in cur.fetchall()]
for t in rows:
    if t is None:
        continue
    lower = t.lower()
    if t != lower:
        updates.append((t, lower))
        cur.execute("UPDATE financial_entries SET type = ? WHERE type = ?", (lower, t))

conn.commit()
print('normalized:', updates)
conn.close()
