"""BinMovement model for immutable inventory transaction audit trail."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base

if TYPE_CHECKING:
    from app.db.models.bin_content import BinContent
    from app.db.models.user import User


class BinMovement(Base):
    """
    Immutable audit trail of all inventory movements.

    Records every receipt, issue, adjustment, transfer, and scrap operation.
    Once created, records are NEVER updated or deleted.
    """

    __tablename__ = "bin_movements"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    bin_content_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("bin_contents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        comment="Positive for receipt, negative for issue",
    )
    quantity_before: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_after: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fefo_compliant: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
        comment="Only for issue movements",
    )
    force_override: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="True if non-FEFO issue with manager approval",
    )
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('receipt', 'issue', 'adjustment', 'transfer', 'scrap')",
            name="check_movement_type",
        ),
        # Indexes for audit queries
        Index("idx_movements_bin_content", "bin_content_id", "created_at"),
        Index("idx_movements_type", "movement_type", "created_at"),
        Index("idx_movements_user", "created_by", "created_at"),
        Index("idx_movements_created", "created_at"),
    )

    # Relationships
    bin_content: Mapped["BinContent"] = relationship()
    created_by_user: Mapped["User"] = relationship()
