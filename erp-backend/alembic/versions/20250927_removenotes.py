"""remove notes from customer_payments

Revision ID: 20250927_removenotes
Revises: 20250927_add_customer_payments
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250927_removenotes'
down_revision = '20250927_add_customer_payments'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Drop notes column if exists
    with op.batch_alter_table('customer_payments') as batch_op:
        try:
            batch_op.drop_column('notes')
        except Exception:
            # best-effort: if column doesn't exist, ignore
            pass


def downgrade() -> None:
    with op.batch_alter_table('customer_payments') as batch_op:
        batch_op.add_column(sa.Column('notes', sa.Text, nullable=True))
