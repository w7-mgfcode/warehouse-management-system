"""BinHistory model for archived inventory movements."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base
from app.db.models.product import Product
from app.db.models.supplier import Supplier


class BinHistory(Base):
    """Archived bin content after removal (for audit and reporting)."""

    __tablename__ = "bin_history"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    bin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        nullable=False,
    )
    bin_code: Mapped[str] = mapped_column(String(100), nullable=False)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        nullable=False,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )
    pallet_count: Mapped[int] = mapped_column(Integer, nullable=False)
    net_weight: Mapped[float] = mapped_column(Float, nullable=False)
    gross_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    best_before_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    freeze_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    use_by_date: Mapped[date] = mapped_column(Date, nullable=False)
    cmr_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    removal_reason: Mapped[str] = mapped_column(String(50), nullable=False)
    removal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    removed_by: Mapped[uuid.UUID | None] = mapped_column(
        GUID(),
        nullable=True,
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    removed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships (for display purposes, nullable)
    product: Mapped["Product | None"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship()
