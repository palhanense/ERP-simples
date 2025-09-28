"""add supplier to products

Revision ID: 20250927_add_supplier_to_products
Revises: 561153c82482_initial2
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250927_add_sup'
down_revision = '561153c82482'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add supplier column to products (nullable). Use IF NOT EXISTS to be idempotent
    # (helps when the column was added by other initialization code).
    conn = op.get_bind()
    # For Postgres, use ADD COLUMN IF NOT EXISTS
    try:
        conn.execute(sa.text("ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier VARCHAR(255)"))
    except Exception:
        # Fall back to Alembic's add_column for other DBs
        op.add_column('products', sa.Column('supplier', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove supplier column if present
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE products DROP COLUMN IF EXISTS supplier"))
    except Exception:
        # Fall back to Alembic's drop_column
        op.drop_column('products', 'supplier')
