"""Add cancelled document status

Revision ID: f7b2c8d9e0f1
Revises: e5f6a7b8c9d0
Create Date: 2026-06-09 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = 'f7b2c8d9e0f1'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE documentstatus ADD VALUE 'cancelled'")


def downgrade() -> None:
    op.execute("ALTER TYPE documentstatus RENAME TO documentstatus_old")
    op.execute("CREATE TYPE documentstatus AS ENUM('pending', 'generating', 'completed', 'failed')")
    op.execute((
        "ALTER TABLE documents ALTER COLUMN status TYPE documentstatus USING "
        "status::text::documentstatus"
    ))
    op.execute("DROP TYPE documentstatus_old")
