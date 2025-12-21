"""Reservation API endpoints for stock reservations with FEFO integration."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireManager, RequireViewer, RequireWarehouse
from app.core.i18n import HU_RESERVATION_MESSAGES
from app.schemas.reservation import (
    ReservationCancelRequest,
    ReservationCreate,
    ReservationDetail,
    ReservationFulfillRequest,
    ReservationFulfillResponse,
    ReservationItemResponse,
    ReservationListItem,
    ReservationListResponse,
    ReservationResponse,
)
from app.services.reservation import (
    cancel_reservation,
    create_reservation,
    fulfill_reservation,
    get_expiring_reservations,
    get_reservation_by_id,
    get_reservations,
)

router = APIRouter(prefix="/reservations", tags=["reservations"])


def calculate_pages(total: int, page_size: int) -> int:
    """Calculate total pages."""
    return (total + page_size - 1) // page_size if page_size > 0 else 0


def calculate_days_until_expiry(use_by_date: date) -> int:
    """Calculate days until expiry."""
    return (use_by_date - date.today()).days


@router.post("/", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation_endpoint(
    reservation_data: ReservationCreate,
    db: DbSession,
    current_user: RequireWarehouse,
) -> ReservationResponse:
    """
    Create a stock reservation following FEFO order (warehouse+ only).

    Allocates stock from oldest expiry date first. Returns partial reservation
    if insufficient stock is available.
    """
    try:
        reservation, is_partial = await create_reservation(db, reservation_data, current_user.id)

        items = [
            ReservationItemResponse(
                id=item.id,
                bin_content_id=item.bin_content_id,
                bin_code=item.bin_content.bin.code,
                batch_number=item.bin_content.batch_number,
                use_by_date=item.bin_content.use_by_date,
                quantity_reserved=item.quantity_reserved,
                days_until_expiry=calculate_days_until_expiry(item.bin_content.use_by_date),
            )
            for item in reservation.items
        ]

        message = (
            HU_RESERVATION_MESSAGES["reservation_partial"]
            if is_partial
            else HU_RESERVATION_MESSAGES["reservation_successful"]
        )

        return ReservationResponse(
            reservation_id=reservation.id,
            product_id=reservation.product_id,
            product_name=reservation.product.name,
            sku=reservation.product.sku,
            order_reference=reservation.order_reference,
            customer_name=reservation.customer_name,
            total_quantity=reservation.total_quantity,
            reserved_until=reservation.reserved_until,
            status=reservation.status,
            items=items,
            is_partial=is_partial,
            message=message,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get("/", response_model=ReservationListResponse)
async def list_reservations(
    db: DbSession,
    current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    product_id: UUID | None = None,
    reservation_status: str | None = Query(None, alias="status"),
    order_reference: str | None = None,
) -> ReservationListResponse:
    """
    List reservations with filters (viewer+ only).
    """
    reservations, total = await get_reservations(
        db,
        page=page,
        page_size=page_size,
        product_id=product_id,
        status=reservation_status,
        order_reference=order_reference,
    )

    items = [
        ReservationListItem(
            id=r.id,
            product_name=r.product.name,
            sku=r.product.sku,
            order_reference=r.order_reference,
            customer_name=r.customer_name,
            total_quantity=r.total_quantity,
            reserved_until=r.reserved_until,
            status=r.status,
            created_at=r.created_at,
        )
        for r in reservations
    ]

    return ReservationListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=calculate_pages(total, page_size),
    )


@router.get("/expiring", response_model=list[ReservationListItem])
async def list_expiring_reservations(
    db: DbSession,
    current_user: RequireWarehouse,
    hours_threshold: int = Query(24, ge=1, le=168),
) -> list[ReservationListItem]:
    """
    List reservations expiring within threshold hours (warehouse+ only).

    Default is 24 hours, max is 168 hours (7 days).
    """
    reservations = await get_expiring_reservations(db, hours_threshold)

    return [
        ReservationListItem(
            id=r.id,
            product_name=r.product.name,
            sku=r.product.sku,
            order_reference=r.order_reference,
            customer_name=r.customer_name,
            total_quantity=r.total_quantity,
            reserved_until=r.reserved_until,
            status=r.status,
            created_at=r.created_at,
        )
        for r in reservations
    ]


@router.get("/{reservation_id}", response_model=ReservationDetail)
async def get_reservation(
    reservation_id: UUID,
    db: DbSession,
    current_user: RequireViewer,
) -> ReservationDetail:
    """
    Get reservation details by ID (viewer+ only).
    """
    reservation = await get_reservation_by_id(db, reservation_id)
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_RESERVATION_MESSAGES["reservation_not_found"],
        )

    items = [
        ReservationItemResponse(
            id=item.id,
            bin_content_id=item.bin_content_id,
            bin_code=item.bin_content.bin.code,
            batch_number=item.bin_content.batch_number,
            use_by_date=item.bin_content.use_by_date,
            quantity_reserved=item.quantity_reserved,
            days_until_expiry=calculate_days_until_expiry(item.bin_content.use_by_date),
        )
        for item in reservation.items
    ]

    return ReservationDetail(
        id=reservation.id,
        product_id=reservation.product_id,
        product_name=reservation.product.name,
        sku=reservation.product.sku,
        order_reference=reservation.order_reference,
        customer_name=reservation.customer_name,
        total_quantity=reservation.total_quantity,
        reserved_until=reservation.reserved_until,
        status=reservation.status,
        fulfilled_at=reservation.fulfilled_at,
        cancelled_at=reservation.cancelled_at,
        cancellation_reason=reservation.cancellation_reason,
        items=items,
        created_by=reservation.created_by_user.username,
        notes=reservation.notes,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
    )


@router.post("/{reservation_id}/fulfill", response_model=ReservationFulfillResponse)
async def fulfill_reservation_endpoint(
    reservation_id: UUID,
    fulfill_data: ReservationFulfillRequest,
    db: DbSession,
    current_user: RequireWarehouse,
) -> ReservationFulfillResponse:
    """
    Fulfill a reservation by issuing the reserved stock (warehouse+ only).

    Creates issue movements for all reservation items.
    """
    try:
        reservation, movement_ids = await fulfill_reservation(
            db, reservation_id, current_user.id, fulfill_data.notes
        )

        return ReservationFulfillResponse(
            reservation_id=reservation.id,
            movement_ids=movement_ids,
            total_fulfilled=reservation.total_quantity,
            message=HU_RESERVATION_MESSAGES["reservation_fulfilled"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.delete("/{reservation_id}", response_model=ReservationDetail)
async def cancel_reservation_endpoint(
    reservation_id: UUID,
    cancel_data: ReservationCancelRequest,
    db: DbSession,
    current_user: RequireManager,
) -> ReservationDetail:
    """
    Cancel a reservation and release reserved quantities (manager+ only).
    """
    try:
        reservation = await cancel_reservation(
            db, reservation_id, cancel_data.reason, current_user.id, cancel_data.notes
        )

        # Reload with full relationships for response
        reservation = await get_reservation_by_id(db, reservation_id)

        items = [
            ReservationItemResponse(
                id=item.id,
                bin_content_id=item.bin_content_id,
                bin_code=item.bin_content.bin.code,
                batch_number=item.bin_content.batch_number,
                use_by_date=item.bin_content.use_by_date,
                quantity_reserved=item.quantity_reserved,
                days_until_expiry=calculate_days_until_expiry(item.bin_content.use_by_date),
            )
            for item in reservation.items
        ]

        return ReservationDetail(
            id=reservation.id,
            product_id=reservation.product_id,
            product_name=reservation.product.name,
            sku=reservation.product.sku,
            order_reference=reservation.order_reference,
            customer_name=reservation.customer_name,
            total_quantity=reservation.total_quantity,
            reserved_until=reservation.reserved_until,
            status=reservation.status,
            fulfilled_at=reservation.fulfilled_at,
            cancelled_at=reservation.cancelled_at,
            cancellation_reason=reservation.cancellation_reason,
            items=items,
            created_by=reservation.created_by_user.username,
            notes=reservation.notes,
            created_at=reservation.created_at,
            updated_at=reservation.updated_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
