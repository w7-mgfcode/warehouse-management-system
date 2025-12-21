"""BinContent model for current inventory in bins."""

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base
from app.db.models.bin import Bin
from app.db.models.product import Product
from app.db.models.supplier import Supplier


class BinContent(Base):
    """Current content of a bin (one product at a time)."""

    __tablename__ = "bin_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    bin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("bins.id", ondelete="CASCADE"),
        unique=True,
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
    pallet_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    net_weight: Mapped[float] = mapped_column(Float, nullable=False)
    gross_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    best_before_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    freeze_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    use_by_date: Mapped[date] = mapped_column(Date, nullable=False)
    cmr_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
            "net_weight > 0",
            name="check_positive_net_weight",
        ),
        CheckConstraint(
            "pallet_count > 0",
            name="check_positive_pallet_count",
        ),
    )

    # Relationships
    bin: Mapped["Bin"] = relationship(back_populates="content")
    product: Mapped["Product"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship()
