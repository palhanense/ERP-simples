import sqlite3
import json
from app.database import get_sqlite_path


def main():
    sqlite_path = get_sqlite_path()
    if sqlite_path is None:
        raise SystemExit("This script expects a local sqlite DB; run schema changes via Alembic for Postgres")

    p = str(sqlite_path)
    conn = sqlite3.connect(p)
    cur = conn.cursor()

    # check existing columns
    cur.execute("PRAGMA table_info('products')")
    cols = [r[1] for r in cur.fetchall()]
    print('columns before:', cols)
    if 'stock' not in cols:
        cur.execute("ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0")
        print('added column stock')
    else:
        print('stock column exists')

    # try backfill from extra_attributes if empty
    cur.execute("SELECT id, extra_attributes, stock FROM products")
    rows = cur.fetchall()
    updated = 0
    for pid, extra, stock in rows:
        if stock and stock > 0:
            continue
        try:
            if extra:
                obj = json.loads(extra)
                for key in ('stock', 'estoque', 'available_stock'):
                    if key in obj:
                        val = obj[key]
                        try:
                            n = int(val)
                            cur.execute('UPDATE products SET stock=? WHERE id=?', (n, pid))
                            updated += 1
                            break
                        except Exception:
                            continue
        except Exception:
            pass

    conn.commit()
    print('backfilled rows:', updated)
    cur.execute("PRAGMA table_info('products')")
    print('columns after:', [r[1] for r in cur.fetchall()])
    conn.close()


if __name__ == '__main__':
    main()
