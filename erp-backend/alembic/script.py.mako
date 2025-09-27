"""
Revision script template
"""
from alembic import op
import sqlalchemy as sa

revision = '${up_revision}'
down_revision = ${down_revision and repr(down_revision) or None}
branch_labels = ${branch_labels and repr(branch_labels) or None}
depends_on = ${depends_on and repr(depends_on) or None}


def upgrade():
    """Upgrade operations go here."""
    ${upgrades if upgrades else "pass"}


def downgrade():
    """Downgrade operations go here."""
    ${downgrades if downgrades else "pass"}
