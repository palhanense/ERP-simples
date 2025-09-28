import json

from fastapi.testclient import TestClient
from app.main import app


def run() -> None:
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


if __name__ == '__main__':
    run()
