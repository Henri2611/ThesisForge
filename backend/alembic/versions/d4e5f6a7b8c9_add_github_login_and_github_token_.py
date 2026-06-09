"""add github_login and github_token_encrypted to users

Revision ID: d4e5f6a7b8c9
Revises: f3b61c4418c7
Create Date: 2026-06-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'f3b61c4418c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('github_login', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('github_token_encrypted', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'github_token_encrypted')
    op.drop_column('users', 'github_login')
