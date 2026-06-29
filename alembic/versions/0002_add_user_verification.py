"""add user verification fields

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-29 18:40:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('users', sa.Column('otp_code', sa.String(length=6), nullable=True))
    op.add_column('users', sa.Column('otp_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'otp_expires_at')
    op.drop_column('users', 'otp_code')
    op.drop_column('users', 'is_verified')
