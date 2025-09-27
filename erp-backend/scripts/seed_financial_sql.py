from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "erp.db"

ENTRIES = []
now = datetime.utcnow()
for i in range(12):
    if i % 3 == 0:
        t = "receita"
        cat = ["Vendas", "Servicos", "Outros"][i % 3]
        amt = round(100 + i * 25 + (i * 13.37) % 200, 2)
    else:
        t = "despesa"
        cat = ["Aluguel", "Salarios", "Material", "Contas"][i % 4]
        amt = round(20 + i * 17 + (i * 7.3) % 150, 2)
    dt = (now - timedelta(days=i)).isoformat(sep=" ")
    ENTRIES.append((dt, t, cat, amt, f"Seeded entry {i}", dt, dt))

SQL = """
INSERT INTO financial_entries (date, type, category, amount, notes, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?);
"""

def main():
    if not DB_PATH.exists():
        print("DB file not found:", DB_PATH)
        return
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    # check table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='financial_entries';")
    if not cur.fetchone():
        print("Table financial_entries not found in DB. Did you run the backend once to create tables?")
        conn.close()
        return
    # insert entries
    for entry in ENTRIES:
        cur.execute(SQL, entry)
    conn.commit()
    print(f"Inserted {len(ENTRIES)} financial entries into {DB_PATH}")
    conn.close()

if __name__ == '__main__':
    main()
