"""
Revision script template
"""
from alembic import op
import sqlalchemy as sa

revision = '64b4c612e13f'
down_revision = ('20250927_removenotes', '20250928_add_tenants_users')
branch_labels = None
depends_on = None


def upgrade():
    """Upgrade operations go here."""
    pass


def downgrade():
    """Downgrade operations go here."""
    pass
