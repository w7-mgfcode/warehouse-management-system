"""Warehouse transfer model for cross-warehouse stock movements."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base

if TYPE_CHECKING:
    from app.db.models.bin import Bin
    from app.db.models.bin_content import BinContent
    from app.db.models.user import User
    from app.db.models.warehouse import Warehouse


class WarehouseTransfer(Base):
    """
    Cross-warehouse transfer record.

    Tracks transfers between warehouses including:
    - Source and target warehouse/bin information
    - Transit status (pending, in_transit, received, cancelled)
    - Transport reference for tracking
    - Confirmation workflow with quantity verification
    """

    __tablename__ = "warehouse_transfers"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    # Source details
    source_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    source_bin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("bins.id", ondelete="RESTRICT"),
        nullable=False,
    )
    source_bin_content_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("bin_contents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Target details
    target_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
    )
    target_bin_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("bins.id", ondelete="SET NULL"),
        nullable=True,  # Assigned on receipt
    )
    # Quantities
    quantity_sent: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_received: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,  # Filled on confirmation
    )
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    # Status tracking
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )  # pending, in_transit, received, cancelled
    transport_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    condition_on_receipt: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # Timestamps
    dispatched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # User tracking
    created_by: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        nullable=False,
    )
    received_by: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_warehouse_transfers_status", "status"),
        Index("ix_warehouse_transfers_source", "source_warehouse_id", "status"),
        Index("ix_warehouse_transfers_target", "target_warehouse_id", "status"),
        Index("ix_warehouse_transfers_transport", "transport_reference"),
    )

    # Relationships
    source_warehouse: Mapped["Warehouse"] = relationship(foreign_keys=[source_warehouse_id])
    target_warehouse: Mapped["Warehouse"] = relationship(foreign_keys=[target_warehouse_id])
    source_bin: Mapped["Bin"] = relationship(foreign_keys=[source_bin_id])
    target_bin: Mapped["Bin | None"] = relationship(foreign_keys=[target_bin_id])
    source_bin_content: Mapped["BinContent"] = relationship()
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by])
    received_by_user: Mapped["User | None"] = relationship(foreign_keys=[received_by])
