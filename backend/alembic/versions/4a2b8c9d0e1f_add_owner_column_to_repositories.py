"""Add owner column to repositories

Revision ID: 4a2b8c9d0e1f
Revises: b9b66bffd34a
Create Date: 2026-05-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a2b8c9d0e1f'
down_revision: Union[str, Sequence[str], None] = 'b9b66bffd34a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('repositories',
        sa.Column('owner', sa.String(length=255), nullable=True)
    )
    # Backfill owner from full_name (format: "owner/repo")
    op.execute(
        "UPDATE repositories SET owner = SPLIT_PART(full_name, '/', 1) WHERE owner IS NULL"
    )
    # Now make it non-nullable
    op.alter_column('repositories', 'owner', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('repositories', 'owner')
