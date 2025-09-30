"""add store_name to registrations

Revision ID: 20250929_add_store_name_to_registrations
Revises: 20250928_add_tenants_users
Create Date: 2025-09-29 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20250929_store_name'
down_revision = '64b4c612e13f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('registrations', sa.Column('store_name', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('registrations', 'store_name')
