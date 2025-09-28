
"""
Script para checar tabelas no banco de dados usando SQLAlchemy/Postgres.
Retorna contagens e até 3 linhas de amostra por tabela.
"""

import json
from app.database import SessionLocal
from app import models

session = SessionLocal()
try:
    result = {}
    tables = [models.Product, models.Customer, models.Sale, models.FinancialEntry]
    for M in tables:
        name = M.__tablename__
        try:
            count = session.query(M).count()
            rows = session.query(M).limit(3).all()
            # serialize simple attrs (avoid ORM internals)
            serialized = []
            for r in rows:
                d = {}
                for k in r.__dict__:
                    if k.startswith('_sa_'):
                        continue
                    v = getattr(r, k)
                    # coerce decimals and datetimes to primitives for JSON
                    try:
                        from decimal import Decimal
                        from datetime import datetime

                        if isinstance(v, Decimal):
                            v = float(v)
                        elif isinstance(v, datetime):
                            v = v.isoformat()
                    except Exception:
                        pass
                    d[k] = v
                serialized.append(d)
            result[name] = {'count': count, 'rows': serialized}
        except Exception as e:
            result[name] = {'error': str(e)}

    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    session.close()
