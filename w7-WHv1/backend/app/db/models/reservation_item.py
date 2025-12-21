"""Reservation item model linking reservations to bin contents."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base

if TYPE_CHECKING:
    from app.db.models.bin_content import BinContent
    from app.db.models.stock_reservation import StockReservation


class ReservationItem(Base):
    """
    Individual item within a stock reservation.

    Links a reservation to specific bin_contents with reserved quantities.
    Follows FEFO order - earliest expiry bins are reserved first.
    """

    __tablename__ = "reservation_items"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    reservation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("stock_reservations.id", ondelete="CASCADE"),
        nullable=False,
    )
    bin_content_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("bin_contents.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity_reserved: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_reservation_items_reservation", "reservation_id"),
        Index("ix_reservation_items_bin_content", "bin_content_id"),
    )

    # Relationships
    reservation: Mapped["StockReservation"] = relationship(back_populates="items")
    bin_content: Mapped["BinContent"] = relationship()
