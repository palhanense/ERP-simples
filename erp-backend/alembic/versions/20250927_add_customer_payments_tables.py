"""add customer payments tables

Revision ID: 20250927_add_customer_payments
Revises: 20250927_add_cashbox
Create Date: 2025-09-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '20250927_add_customer_payments'
down_revision = '20250927_add_cashbox'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Create tables if not exists (Postgres will error on IF NOT EXISTS for CREATE TABLE with constraints,
    # so use sa.Table check; here we use SQL statements conservatively)
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_payments (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL,
            method VARCHAR(50) NOT NULL,
            amount NUMERIC(12,2) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS customer_payment_allocations (
            id SERIAL PRIMARY KEY,
            payment_id INTEGER NOT NULL,
            sale_id INTEGER NOT NULL,
            amount NUMERIC(12,2) NOT NULL,
            FOREIGN KEY(payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE,
            FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE CASCADE
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS customer_payment_allocations")
    op.execute("DROP TABLE IF EXISTS customer_payments")
