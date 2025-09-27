from __future__ import annotations

import traceback

from fastapi.testclient import TestClient

from app import models
from app.database import SessionLocal
from app.main import app


def call_endpoint():
    client = TestClient(app)
    try:
        resp = client.get("/financial-entries")
        print("STATUS:", resp.status_code)
        print("TEXT:", resp.text)
        try:
            print("JSON:", resp.json())
        except Exception:
            pass
    except Exception:
        print("EXCEPTION during TestClient call:")
        traceback.print_exc()


def direct_db():
    try:
        with SessionLocal() as db:
            items = db.query(models.FinancialEntry).all()
            print("DB count:", len(items))
            if items:
                first = items[0]
                print("First repr:", repr(first))
                # show column attributes
                for col in ["id", "date", "type", "category", "amount", "notes"]:
                    print(col, "=", getattr(first, col, None))
    except Exception:
        print("EXCEPTION during direct DB query:")
        traceback.print_exc()


if __name__ == "__main__":
    call_endpoint()
    direct_db()
