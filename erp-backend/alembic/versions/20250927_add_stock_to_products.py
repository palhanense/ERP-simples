"""add stock column to products

Revision ID: 20250927_add_stock
Revises: 20250927_add_sup
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250927_add_stock'
down_revision = '20250927_add_sup'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0"))
    except Exception:
        op.add_column('products', sa.Column('stock', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE products DROP COLUMN IF EXISTS stock"))
    except Exception:
        op.drop_column('products', 'stock')
