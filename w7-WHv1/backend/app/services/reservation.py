"""Reservation service for stock reservations with FEFO integration."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.i18n import HU_MESSAGES, HU_RESERVATION_MESSAGES
from app.db.models.bin_content import BinContent
from app.db.models.product import Product
from app.db.models.reservation_item import ReservationItem
from app.db.models.stock_reservation import StockReservation
from app.schemas.reservation import ReservationCreate
from app.services.movement import create_movement


async def create_reservation(
    db: AsyncSession,
    reservation_data: ReservationCreate,
    user_id: UUID,
) -> tuple[StockReservation, bool]:
    """
    Create a stock reservation following FEFO order.

    Args:
        db: Async database session.
        reservation_data: Reservation request data.
        user_id: User performing the action.

    Returns:
        tuple: (StockReservation, is_partial) - is_partial True if insufficient stock.

    Raises:
        ValueError: If product not found or no stock available.
    """
    # 1. Validate product exists and is active
    product_result = await db.execute(
        select(Product).where(Product.id == reservation_data.product_id)
    )
    product = product_result.scalar_one_or_none()
    if not product or not product.is_active:
        raise ValueError(HU_MESSAGES["product_not_found"])

    # 2. Get all available bin_contents for product, FEFO sorted
    today = date.today()
    result = await db.execute(
        select(BinContent)
        .options(selectinload(BinContent.bin))
        .where(
            BinContent.product_id == reservation_data.product_id,
            BinContent.status == "available",
            BinContent.quantity > BinContent.reserved_quantity,
            BinContent.use_by_date >= today,  # Not expired
        )
        .order_by(
            BinContent.use_by_date.asc(),
            BinContent.batch_number.asc(),
            BinContent.received_date.asc(),
        )
    )
    available_bins = result.scalars().all()

    if not available_bins:
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_no_stock"])

    # 3. Allocate from oldest expiry until request satisfied
    remaining_needed = reservation_data.quantity
    allocated_items: list[tuple[BinContent, Decimal]] = []

    for bin_content in available_bins:
        if remaining_needed <= 0:
            break

        # Available = quantity - reserved_quantity
        available = bin_content.quantity - bin_content.reserved_quantity
        if available <= 0:
            continue

        allocate_qty = min(available, remaining_needed)
        allocated_items.append((bin_content, allocate_qty))
        remaining_needed -= allocate_qty

    if not allocated_items:
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_no_stock"])

    # Calculate total reserved
    total_reserved = sum(qty for _, qty in allocated_items)
    is_partial = total_reserved < reservation_data.quantity

    # 4. Create StockReservation record
    reservation = StockReservation(
        product_id=reservation_data.product_id,
        order_reference=reservation_data.order_reference,
        customer_name=reservation_data.customer_name,
        total_quantity=total_reserved,
        reserved_until=reservation_data.reserved_until,
        status="active",
        notes=reservation_data.notes,
        created_by=user_id,
    )
    db.add(reservation)
    await db.flush()

    # 5. Create ReservationItem for each allocation and update reserved_quantity
    for bin_content, qty in allocated_items:
        item = ReservationItem(
            reservation_id=reservation.id,
            bin_content_id=bin_content.id,
            quantity_reserved=qty,
        )
        db.add(item)

        # Update bin_content reserved_quantity
        bin_content.reserved_quantity += qty

    await db.flush()

    # Reload reservation with relationships
    result = await db.execute(
        select(StockReservation)
        .options(
            selectinload(StockReservation.product),
            selectinload(StockReservation.items)
            .selectinload(ReservationItem.bin_content)
            .selectinload(BinContent.bin),
            selectinload(StockReservation.created_by_user),
        )
        .where(StockReservation.id == reservation.id)
    )
    reservation_loaded = result.scalar_one()

    return reservation_loaded, is_partial


async def fulfill_reservation(
    db: AsyncSession,
    reservation_id: UUID,
    user_id: UUID,
    notes: str | None = None,
) -> tuple[StockReservation, list[UUID]]:
    """
    Fulfill a reservation by creating issue movements.

    Args:
        db: Async database session.
        reservation_id: Reservation UUID.
        user_id: User performing the action.
        notes: Optional notes.

    Returns:
        tuple: (StockReservation, list of movement IDs)

    Raises:
        ValueError: If reservation not found or invalid state.
    """
    # 1. Get reservation with items
    result = await db.execute(
        select(StockReservation)
        .options(
            selectinload(StockReservation.items)
            .selectinload(ReservationItem.bin_content)
            .selectinload(BinContent.bin),
        )
        .where(StockReservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_not_found"])

    if reservation.status == "fulfilled":
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_already_fulfilled"])
    if reservation.status == "cancelled":
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_already_cancelled"])
    if reservation.status == "expired":
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_expired"])

    # 2. Create issue movements for each item
    movement_ids: list[UUID] = []

    for item in reservation.items:
        bin_content = item.bin_content
        quantity_before = bin_content.quantity

        # Reduce quantity and reserved_quantity
        bin_content.quantity -= item.quantity_reserved
        bin_content.reserved_quantity -= item.quantity_reserved

        # Update bin status if empty
        if bin_content.quantity <= 0:
            bin_content.bin.status = "empty"

        # Create movement
        movement = await create_movement(
            db=db,
            bin_content_id=bin_content.id,
            movement_type="issue",
            quantity=-item.quantity_reserved,
            quantity_before=quantity_before,
            quantity_after=bin_content.quantity,
            reason="reservation_fulfillment",
            user_id=user_id,
            reference_number=reservation.order_reference,
            fefo_compliant=True,
            notes=notes,
        )
        movement_ids.append(movement.id)

    # 3. Update reservation status
    reservation.status = "fulfilled"
    reservation.fulfilled_at = datetime.now(UTC)

    await db.flush()

    return reservation, movement_ids


async def cancel_reservation(
    db: AsyncSession,
    reservation_id: UUID,
    reason: str,
    user_id: UUID,
    notes: str | None = None,
) -> StockReservation:
    """
    Cancel a reservation and release reserved quantities.

    Args:
        db: Async database session.
        reservation_id: Reservation UUID.
        reason: Cancellation reason.
        user_id: User performing the action.
        notes: Optional notes.

    Returns:
        StockReservation: Cancelled reservation.

    Raises:
        ValueError: If reservation not found or invalid state.
    """
    # 1. Get reservation with items
    result = await db.execute(
        select(StockReservation)
        .options(
            selectinload(StockReservation.items).selectinload(ReservationItem.bin_content),
        )
        .where(StockReservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_not_found"])

    if reservation.status == "fulfilled":
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_already_fulfilled"])
    if reservation.status == "cancelled":
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_already_cancelled"])
    if reservation.status == "expired":
        raise ValueError(HU_RESERVATION_MESSAGES["reservation_expired"])

    # 2. Release reserved quantities
    for item in reservation.items:
        bin_content = item.bin_content
        bin_content.reserved_quantity -= item.quantity_reserved

    # 3. Update reservation status
    reservation.status = "cancelled"
    reservation.cancelled_at = datetime.now(UTC)
    reservation.cancellation_reason = reason

    await db.flush()

    return reservation


async def cleanup_expired_reservations(
    db: AsyncSession,
) -> int:
    """
    Cleanup expired reservations (for scheduled job).

    Returns:
        int: Number of reservations expired.
    """
    now = datetime.now(UTC)

    # Get expired active reservations
    result = await db.execute(
        select(StockReservation)
        .options(
            selectinload(StockReservation.items).selectinload(ReservationItem.bin_content),
        )
        .where(
            StockReservation.status == "active",
            StockReservation.reserved_until < now,
        )
    )
    expired_reservations = result.scalars().all()

    count = 0
    for reservation in expired_reservations:
        # Release reserved quantities
        for item in reservation.items:
            bin_content = item.bin_content
            bin_content.reserved_quantity -= item.quantity_reserved

        # Update status
        reservation.status = "expired"
        count += 1

    await db.flush()

    return count


async def get_reservation_by_id(
    db: AsyncSession,
    reservation_id: UUID,
) -> StockReservation | None:
    """Get reservation by ID with relationships."""
    result = await db.execute(
        select(StockReservation)
        .options(
            selectinload(StockReservation.product),
            selectinload(StockReservation.items)
            .selectinload(ReservationItem.bin_content)
            .selectinload(BinContent.bin),
            selectinload(StockReservation.created_by_user),
        )
        .where(StockReservation.id == reservation_id)
    )
    return result.scalar_one_or_none()


async def get_reservations(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    product_id: UUID | None = None,
    status: str | None = None,
    order_reference: str | None = None,
) -> tuple[list[StockReservation], int]:
    """Get paginated list of reservations with filters."""
    query = select(StockReservation).options(
        selectinload(StockReservation.product),
    )

    if product_id:
        query = query.where(StockReservation.product_id == product_id)
    if status:
        query = query.where(StockReservation.status == status)
    if order_reference:
        query = query.where(StockReservation.order_reference.ilike(f"%{order_reference}%"))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated results
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(StockReservation.created_at.desc()).offset(offset).limit(page_size)
    )
    reservations = list(result.scalars().all())

    return reservations, total


async def get_expiring_reservations(
    db: AsyncSession,
    hours_threshold: int = 24,
) -> list[StockReservation]:
    """Get reservations expiring within threshold hours."""
    from datetime import timedelta

    now = datetime.now(UTC)
    threshold = now + timedelta(hours=hours_threshold)

    result = await db.execute(
        select(StockReservation)
        .options(
            selectinload(StockReservation.product),
            selectinload(StockReservation.items),
        )
        .where(
            StockReservation.status == "active",
            StockReservation.reserved_until <= threshold,
            StockReservation.reserved_until > now,
        )
        .order_by(StockReservation.reserved_until.asc())
    )
    return list(result.scalars().all())
