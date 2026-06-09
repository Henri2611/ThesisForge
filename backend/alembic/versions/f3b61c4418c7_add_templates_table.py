"""Add templates table

Revision ID: f3b61c4418c7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-06 14:56:31.831571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'f3b61c4418c7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'templates',
        sa.Column('id', sa.String(100), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('organization', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('format', sa.String(10), nullable=False),
        sa.Column('tags', postgresql.JSONB, nullable=False, server_default='[]'),
        sa.Column('config_json', postgresql.JSONB, nullable=False, server_default='{}'),
        sa.Column('is_global', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('templates')
