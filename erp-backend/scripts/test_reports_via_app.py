import os
import sys
import json

# ensure local package import
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)
resp = client.get("/reports/products?limit=5")
print('status', resp.status_code)
try:
    print('json:', json.dumps(resp.json(), indent=2, ensure_ascii=False))
except Exception:
    print('text:', resp.text)
    
# also call the internal function directly to compare
from app.database import SessionLocal
from app import crud

db = SessionLocal()
try:
    report = crud.list_products_report(db, limit=5)
    print('\ninternal call success: totals ->', report['totals'])
except Exception as exc:
    print('\ninternal call failed with:', exc)
finally:
    db.close()
