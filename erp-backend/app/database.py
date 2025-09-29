from __future__ import annotations


import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import event
from sqlalchemy.orm import Session as OrmSession

# guard to avoid double-registering listeners if init_db called multiple times
_listeners_registered = False


class Base(DeclarativeBase):
    """Base class for all ORM models."""

# Only Postgres is supported
DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def init_db() -> None:
    """Create tables if they do not exist."""
    # import models here to avoid circular imports at module import time
    from app import models  # noqa: F401 - ensure models are imported
    Base.metadata.create_all(bind=engine)

    # Register a before_flush listener to validate stock when Sales are created/updated
    # This ensures tests or code that directly adds `models.Sale` and commits will still
    # enforce stock validation (the same checks performed by crud.create_sale).
    global _listeners_registered
    if not _listeners_registered:
        def _validate_sale_stock(session: OrmSession, flush_context, instances):
            # iterate new and dirty objects to find Sale instances
            for obj in list(session.new) + list(session.dirty):
                try:
                    is_sale = isinstance(obj, models.Sale)
                except Exception:
                    is_sale = False
                if not is_sale:
                    continue
                # Only validate completed sales (same business rule as crud.create_sale)
                try:
                    status = obj.status
                except Exception:
                    status = None
                if status != models.SaleStatus.COMPLETED:
                    continue

                # ensure items exist and stock is sufficient
                for item in getattr(obj, 'items', []) or []:
                    # product may be loaded or only have product_id
                    prod = None
                    try:
                        prod = session.get(models.Product, item.product_id)
                    except Exception:
                        prod = None
                    if not prod:
                        raise ValueError(f"Produto {item.product_id} nao encontrado.")
                    if item.quantity > prod.stock:
                        raise ValueError(
                            f"Estoque insuficiente para o produto {prod.name} (id={prod.id}). Solicitado: {item.quantity}, disponível: {prod.stock}"
                        )

        event.listen(OrmSession, "before_flush", _validate_sale_stock)
        _listeners_registered = True
