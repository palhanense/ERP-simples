"""add cashbox_id to financial_entries

Revision ID: 20250927_add_cashbox
Revises: 20250927_add_margin
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250927_add_cashbox'
down_revision = '20250927_add_margin'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE financial_entries ADD COLUMN IF NOT EXISTS cashbox_id INTEGER"))
    except Exception:
        op.add_column('financial_entries', sa.Column('cashbox_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    try:
        conn.execute(sa.text("ALTER TABLE financial_entries DROP COLUMN IF EXISTS cashbox_id"))
    except Exception:
        op.drop_column('financial_entries', 'cashbox_id')
