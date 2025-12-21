"""Stock reservation model for pending orders."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import GUID, Base

if TYPE_CHECKING:
    from app.db.models.product import Product
    from app.db.models.reservation_item import ReservationItem
    from app.db.models.user import User


class StockReservation(Base):
    """
    Stock reservation for pending orders.

    Reserves inventory for customer orders following FEFO order.
    Reservations expire automatically after reserved_until datetime.
    """

    __tablename__ = "stock_reservations"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    reserved_until: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="active",
        nullable=False,
    )  # active, fulfilled, cancelled, expired
    fulfilled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id"),
        nullable=False,
    )
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
        Index("ix_stock_reservations_status_until", "status", "reserved_until"),
        Index("ix_stock_reservations_product_status", "product_id", "status"),
        Index("ix_stock_reservations_order_ref", "order_reference"),
    )

    # Relationships
    product: Mapped["Product"] = relationship()
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by])
    items: Mapped[list["ReservationItem"]] = relationship(
        back_populates="reservation",
        cascade="all, delete-orphan",
    )
