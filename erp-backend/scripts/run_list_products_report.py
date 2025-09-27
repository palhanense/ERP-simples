import os
import sys
import traceback

# Ensure project root is on sys.path so `import app` works when running scripts
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from app.database import SessionLocal
from app import crud


if __name__ == '__main__':
    db = SessionLocal()
    try:
        report = crud.list_products_report(db, limit=10)
        print('OK, products:', len(report['products']))
        print('totals:', report['totals'])
    except Exception:
        print('EXCEPTION calling list_products_report:')
        traceback.print_exc()
    finally:
        db.close()
