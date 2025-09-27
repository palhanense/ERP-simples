"""
Script para checar tabelas no banco de dados usando SQLAlchemy.
Funciona tanto com SQLite local quanto com Postgres quando o app estiver
configurado com `DATABASE_URL`. Retorna contagens e até 3 linhas de amostra
por tabela.
"""

import json
from app.database import SessionLocal, get_sqlite_path
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
                d = {k: getattr(r, k) for k in r.__dict__ if not k.startswith('_sa_')}
                serialized.append(d)
            result[name] = {'count': count, 'rows': serialized}
        except Exception as e:
            result[name] = {'error': str(e)}

    print(json.dumps(result, ensure_ascii=False, indent=2))
finally:
    session.close()
