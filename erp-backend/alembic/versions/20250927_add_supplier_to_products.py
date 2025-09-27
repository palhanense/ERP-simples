"""add supplier to products

Revision ID: 20250927_add_supplier_to_products
Revises: 561153c82482_initial2
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250927_add_supplier_to_products'
down_revision = '561153c82482_initial2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add supplier column to products (nullable)
    op.add_column('products', sa.Column('supplier', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # Remove supplier column
    op.drop_column('products', 'supplier')
