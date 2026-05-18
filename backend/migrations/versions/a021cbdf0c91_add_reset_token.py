"""add reset token

Revision ID: a021cbdf0c91
Revises: aff99b18139b
Create Date: 2026-05-15

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a021cbdf0c91'
down_revision: Union[str, None] = 'aff99b18139b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tenant_users', sa.Column('reset_token', sa.String(255), nullable=True))
    op.add_column('tenant_users', sa.Column('reset_token_expires', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_tenant_users_reset_token', 'tenant_users', ['reset_token'])


def downgrade() -> None:
    op.drop_index('ix_tenant_users_reset_token', table_name='tenant_users')
    op.drop_column('tenant_users', 'reset_token_expires')
    op.drop_column('tenant_users', 'reset_token')