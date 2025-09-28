"""add margin column to products

Revision ID: 20250927_add_margin
Revises: 20250927_add_stock
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250927_add_margin'
down_revision = '20250927_add_stock'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE products ADD COLUMN IF NOT EXISTS margin NUMERIC(10,2) DEFAULT 0"))
    except Exception:
        op.add_column('products', sa.Column('margin', sa.Numeric(10,2), nullable=False, server_default='0'))


def downgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE products DROP COLUMN IF EXISTS margin"))
    except Exception:
        op.drop_column('products', 'margin')
