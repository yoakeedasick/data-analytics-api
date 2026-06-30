"""create initial tables

Revision ID: 0001
Revises:
Create Date: 2026-06-26

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("user_id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── files ─────────────────────────────────────────────────────────────────
    op.create_table(
        "files",
        sa.Column("file_id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.UUID(as_uuid=True), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("s3_path", sa.Text, nullable=False),
        sa.Column("upload_time", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("file_size", sa.BigInteger, nullable=True),
        sa.Column("row_count", sa.Integer, nullable=True),
        sa.Column("col_count", sa.Integer, nullable=True),
    )
    op.create_index("ix_files_user_id", "files", ["user_id"])

    # ── analysis_results ──────────────────────────────────────────────────────
    op.create_table(
        "analysis_results",
        sa.Column("result_id", sa.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("file_id", sa.UUID(as_uuid=True), sa.ForeignKey("files.file_id"), nullable=False, unique=True),
        sa.Column("result_json", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index("ix_analysis_results_file_id", "analysis_results", ["file_id"], unique=True)


def downgrade() -> None:
    op.drop_table("analysis_results")
    op.drop_table("files")
    op.drop_table("users")
