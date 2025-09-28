from app.database import SessionLocal
from app import crud


def run() -> None:
    db = SessionLocal()
    try:
        report = crud.list_products_report(db, limit=10)
        print('OK, products:', len(report['products']))
        print('totals:', report['totals'])
    except Exception:
        print('EXCEPTION calling list_products_report:')
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == '__main__':
    run()
