"""phase4_transfers_reservations_jobs

Revision ID: 202af48e6f7e
Revises: 60db610701fc
Create Date: 2025-12-21 14:23:27.827112

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op
from app.db.base import GUID

# revision identifiers, used by Alembic.
revision: str = "202af48e6f7e"
down_revision: str | None = "60db610701fc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Create job_executions table
    op.create_table(
        "job_executions",
        sa.Column("id", GUID(), nullable=False),
        sa.Column("job_name", sa.String(length=100), nullable=False),
        sa.Column("celery_task_id", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "result",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.Text(), "sqlite"),
            nullable=True,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("items_processed", sa.Integer(), nullable=True),
        sa.Column("items_affected", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_executions_job_name", "job_executions", ["job_name"], unique=False)
    op.create_index("ix_job_executions_started_at", "job_executions", ["started_at"], unique=False)
    op.create_index("ix_job_executions_status", "job_executions", ["status"], unique=False)

    # Create stock_reservations table
    op.create_table(
        "stock_reservations",
        sa.Column("id", GUID(), nullable=False),
        sa.Column("product_id", GUID(), nullable=False),
        sa.Column("order_reference", sa.String(length=100), nullable=False),
        sa.Column("customer_name", sa.String(length=255), nullable=True),
        sa.Column("total_quantity", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("reserved_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("fulfilled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancellation_reason", sa.String(length=50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", GUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_stock_reservations_order_ref",
        "stock_reservations",
        ["order_reference"],
        unique=False,
    )
    op.create_index(
        "ix_stock_reservations_product_status",
        "stock_reservations",
        ["product_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_stock_reservations_status_until",
        "stock_reservations",
        ["status", "reserved_until"],
        unique=False,
    )

    # Create reservation_items table
    op.create_table(
        "reservation_items",
        sa.Column("id", GUID(), nullable=False),
        sa.Column("reservation_id", GUID(), nullable=False),
        sa.Column("bin_content_id", GUID(), nullable=False),
        sa.Column("quantity_reserved", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["bin_content_id"], ["bin_contents.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["reservation_id"], ["stock_reservations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_reservation_items_bin_content",
        "reservation_items",
        ["bin_content_id"],
        unique=False,
    )
    op.create_index(
        "ix_reservation_items_reservation",
        "reservation_items",
        ["reservation_id"],
        unique=False,
    )

    # Create warehouse_transfers table
    op.create_table(
        "warehouse_transfers",
        sa.Column("id", GUID(), nullable=False),
        sa.Column("source_warehouse_id", GUID(), nullable=False),
        sa.Column("source_bin_id", GUID(), nullable=False),
        sa.Column("source_bin_content_id", GUID(), nullable=False),
        sa.Column("target_warehouse_id", GUID(), nullable=False),
        sa.Column("target_bin_id", GUID(), nullable=True),
        sa.Column("quantity_sent", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("quantity_received", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("transport_reference", sa.String(length=100), nullable=True),
        sa.Column("condition_on_receipt", sa.String(length=50), nullable=True),
        sa.Column("dispatched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancellation_reason", sa.String(length=255), nullable=True),
        sa.Column("created_by", GUID(), nullable=False),
        sa.Column("received_by", GUID(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["received_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["source_bin_content_id"], ["bin_contents.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(["source_bin_id"], ["bins.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["source_warehouse_id"], ["warehouses.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["target_bin_id"], ["bins.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["target_warehouse_id"], ["warehouses.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_warehouse_transfers_source",
        "warehouse_transfers",
        ["source_warehouse_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_warehouse_transfers_status", "warehouse_transfers", ["status"], unique=False
    )
    op.create_index(
        "ix_warehouse_transfers_target",
        "warehouse_transfers",
        ["target_warehouse_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_warehouse_transfers_transport",
        "warehouse_transfers",
        ["transport_reference"],
        unique=False,
    )

    # Add reserved_quantity column to bin_contents
    op.add_column(
        "bin_contents",
        sa.Column(
            "reserved_quantity",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0",
        ),
    )

    # Add check constraint for reserved_quantity
    op.create_check_constraint(
        "check_reserved_quantity",
        "bin_contents",
        "reserved_quantity >= 0 AND reserved_quantity <= quantity",
    )


def downgrade() -> None:
    # Drop check constraint first
    op.drop_constraint("check_reserved_quantity", "bin_contents", type_="check")

    # Drop reserved_quantity column
    op.drop_column("bin_contents", "reserved_quantity")

    # Drop warehouse_transfers table
    op.drop_index("ix_warehouse_transfers_transport", table_name="warehouse_transfers")
    op.drop_index("ix_warehouse_transfers_target", table_name="warehouse_transfers")
    op.drop_index("ix_warehouse_transfers_status", table_name="warehouse_transfers")
    op.drop_index("ix_warehouse_transfers_source", table_name="warehouse_transfers")
    op.drop_table("warehouse_transfers")

    # Drop reservation_items table
    op.drop_index("ix_reservation_items_reservation", table_name="reservation_items")
    op.drop_index("ix_reservation_items_bin_content", table_name="reservation_items")
    op.drop_table("reservation_items")

    # Drop stock_reservations table
    op.drop_index("ix_stock_reservations_status_until", table_name="stock_reservations")
    op.drop_index("ix_stock_reservations_product_status", table_name="stock_reservations")
    op.drop_index("ix_stock_reservations_order_ref", table_name="stock_reservations")
    op.drop_table("stock_reservations")

    # Drop job_executions table
    op.drop_index("ix_job_executions_status", table_name="job_executions")
    op.drop_index("ix_job_executions_started_at", table_name="job_executions")
    op.drop_index("ix_job_executions_job_name", table_name="job_executions")
    op.drop_table("job_executions")
