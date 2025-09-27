import os
import sys
import traceback

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=True)
try:
    resp = client.get("/reports/products?limit=5")
    print('status', resp.status_code)
    print('body', resp.text)
except Exception:
    print('server exception:')
    traceback.print_exc()
