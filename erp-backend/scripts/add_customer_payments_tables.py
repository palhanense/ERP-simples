"""
Simple migration script to create customer_payments and customer_payment_allocations tables
Run: python scripts/add_customer_payments_tables.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "erp.db"

SQL_CREATE_PAYMENTS = r"""
CREATE TABLE IF NOT EXISTS customer_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    FOREIGN KEY(payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE,
    FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
"""


def main():
    print("Using DB:", DB_PATH)
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.executescript(SQL_CREATE_PAYMENTS)
    con.commit()
    con.close()
    print("Tables ensured.")


if __name__ == "__main__":
    main()
