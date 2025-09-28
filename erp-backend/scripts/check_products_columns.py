
"""
Verifica colunas de `products` usando SQLAlchemy/Postgres. Para alterações de esquema,
use Alembic (migrations). Este script apenas imprime a lista de colunas.
"""

from app.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='products' AND table_schema='public' ORDER BY ordinal_position")).fetchall()
    for r in res:
        print(r)
