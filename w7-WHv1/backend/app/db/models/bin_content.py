"""BinContent model for current inventory in bins."""

import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base
from app.db.models.bin import Bin
from app.db.models.product import Product
from app.db.models.supplier import Supplier


class BinContent(Base):
    """
    Current content of a bin (one product at a time, multiple batches allowed).

    Tracks inventory with batch numbers, expiry dates, and FEFO-compliant quantities.
    """

    __tablename__ = "bin_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    bin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("bins.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    use_by_date: Mapped[date] = mapped_column(Date, nullable=False)
    best_before_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    freeze_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    pallet_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    received_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), default="available", nullable=False)
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
        CheckConstraint(
            "use_by_date >= best_before_date OR best_before_date IS NULL",
            name="check_use_by_after_best_before",
        ),
        CheckConstraint(
            "quantity >= 0",
            name="check_positive_quantity",
        ),
        CheckConstraint(
            "pallet_count > 0 OR pallet_count IS NULL",
            name="check_positive_pallet_count",
        ),
        CheckConstraint(
            "status IN ('available', 'reserved', 'expired', 'scrapped')",
            name="check_bin_content_status",
        ),
        # Indexes for FEFO queries
        Index("idx_bin_contents_product_status", "product_id", "status", "use_by_date"),
        Index("idx_bin_contents_expiry", "use_by_date"),
        Index("idx_bin_contents_bin", "bin_id"),
    )

    # Relationships
    bin: Mapped["Bin"] = relationship(back_populates="contents")
    product: Mapped["Product"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship()
