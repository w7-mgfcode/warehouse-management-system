"""Transfer API endpoints for bin-to-bin and cross-warehouse movements."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireManager, RequireViewer, RequireWarehouse
from app.core.i18n import HU_TRANSFER_MESSAGES
from app.schemas.transfer import (
    CrossWarehouseTransferCreate,
    CrossWarehouseTransferResponse,
    TransferCancelRequest,
    TransferConfirmRequest,
    TransferConfirmResponse,
    TransferCreate,
    TransferDetail,
    TransferListItem,
    TransferListResponse,
    TransferResponse,
)
from app.services.transfer import (
    cancel_transfer,
    confirm_cross_warehouse_transfer,
    create_cross_warehouse_transfer,
    dispatch_transfer,
    get_pending_transfers,
    get_transfer_by_id,
    get_transfers,
    transfer_within_warehouse,
)

router = APIRouter(prefix="/transfers", tags=["transfers"])


def calculate_pages(total: int, page_size: int) -> int:
    """Calculate total pages."""
    return (total + page_size - 1) // page_size if page_size > 0 else 0


@router.post("/", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_same_warehouse_transfer(
    transfer_data: TransferCreate,
    db: DbSession,
    current_user: RequireWarehouse,
) -> TransferResponse:
    """
    Transfer stock within the same warehouse (warehouse+ only).

    Moves quantity from source bin to target bin, creating movement records.
    """
    try:
        source_movement, target_movement, target_content = await transfer_within_warehouse(
            db, transfer_data, current_user.id
        )

        return TransferResponse(
            source_movement_id=source_movement.id,
            target_movement_id=target_movement.id,
            source_bin_code=source_movement.bin_content.bin.code,
            target_bin_code=target_content.bin.code,
            quantity_transferred=transfer_data.quantity,
            unit=target_content.unit,
            product_name=target_content.product.name,
            batch_number=target_content.batch_number,
            message=HU_TRANSFER_MESSAGES["transfer_successful"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post(
    "/cross-warehouse",
    response_model=CrossWarehouseTransferResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_cross_warehouse_transfer_endpoint(
    transfer_data: CrossWarehouseTransferCreate,
    db: DbSession,
    current_user: RequireManager,
) -> CrossWarehouseTransferResponse:
    """
    Create a cross-warehouse transfer (manager+ only).

    Creates a pending transfer that must be confirmed at the target warehouse.
    """
    try:
        transfer = await create_cross_warehouse_transfer(db, transfer_data, current_user.id)

        return CrossWarehouseTransferResponse(
            transfer_id=transfer.id,
            source_warehouse_name=transfer.source_warehouse.name,
            target_warehouse_name=transfer.target_warehouse.name,
            source_bin_code=transfer.source_bin.code,
            quantity_sent=transfer.quantity_sent,
            unit=transfer.unit,
            product_name=transfer.source_bin_content.product.name,
            batch_number=transfer.source_bin_content.batch_number,
            status=transfer.status,
            transport_reference=transfer.transport_reference,
            message=HU_TRANSFER_MESSAGES["cross_warehouse_created"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get("/", response_model=TransferListResponse)
async def list_transfers(
    db: DbSession,
    current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    source_warehouse_id: UUID | None = None,
    target_warehouse_id: UUID | None = None,
    transfer_status: str | None = Query(None, alias="status"),
) -> TransferListResponse:
    """
    List cross-warehouse transfers with filters (viewer+ only).
    """
    transfers, total = await get_transfers(
        db,
        page=page,
        page_size=page_size,
        source_warehouse_id=source_warehouse_id,
        target_warehouse_id=target_warehouse_id,
        status=transfer_status,
    )

    items = [
        TransferListItem(
            id=t.id,
            source_warehouse_name=t.source_warehouse.name,
            target_warehouse_name=t.target_warehouse.name,
            source_bin_code=t.source_bin.code,
            target_bin_code=t.target_bin.code if t.target_bin else None,
            product_name=t.source_bin_content.product.name,
            quantity_sent=t.quantity_sent,
            unit=t.unit,
            status=t.status,
            transport_reference=t.transport_reference,
            created_at=t.created_at,
        )
        for t in transfers
    ]

    return TransferListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=calculate_pages(total, page_size),
    )


@router.get("/pending", response_model=list[TransferListItem])
async def list_pending_transfers(
    db: DbSession,
    current_user: RequireWarehouse,
    warehouse_id: UUID | None = None,
) -> list[TransferListItem]:
    """
    List pending cross-warehouse transfers awaiting receipt (warehouse+ only).
    """
    transfers = await get_pending_transfers(db, warehouse_id)

    return [
        TransferListItem(
            id=t.id,
            source_warehouse_name=t.source_warehouse.name,
            target_warehouse_name=t.target_warehouse.name,
            source_bin_code=t.source_bin.code,
            target_bin_code=t.target_bin.code if t.target_bin else None,
            product_name=t.source_bin_content.product.name,
            quantity_sent=t.quantity_sent,
            unit=t.unit,
            status=t.status,
            transport_reference=t.transport_reference,
            created_at=t.created_at,
        )
        for t in transfers
    ]


@router.get("/{transfer_id}", response_model=TransferDetail)
async def get_transfer(
    transfer_id: UUID,
    db: DbSession,
    current_user: RequireViewer,
) -> TransferDetail:
    """
    Get transfer details by ID (viewer+ only).
    """
    transfer = await get_transfer_by_id(db, transfer_id)
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_TRANSFER_MESSAGES["transfer_not_found"],
        )

    return TransferDetail(
        id=transfer.id,
        source_warehouse_id=transfer.source_warehouse_id,
        source_warehouse_name=transfer.source_warehouse.name,
        target_warehouse_id=transfer.target_warehouse_id,
        target_warehouse_name=transfer.target_warehouse.name,
        source_bin_code=transfer.source_bin.code,
        target_bin_code=transfer.target_bin.code if transfer.target_bin else None,
        product_name=transfer.source_bin_content.product.name,
        sku=transfer.source_bin_content.product.sku,
        batch_number=transfer.source_bin_content.batch_number,
        use_by_date=transfer.source_bin_content.use_by_date,
        quantity_sent=transfer.quantity_sent,
        quantity_received=transfer.quantity_received,
        unit=transfer.unit,
        status=transfer.status,
        transport_reference=transfer.transport_reference,
        condition_on_receipt=transfer.condition_on_receipt,
        dispatched_at=transfer.dispatched_at,
        received_at=transfer.received_at,
        cancelled_at=transfer.cancelled_at,
        cancellation_reason=transfer.cancellation_reason,
        created_by=transfer.created_by_user.username,
        received_by=(transfer.received_by_user.username if transfer.received_by_user else None),
        notes=transfer.notes,
        created_at=transfer.created_at,
    )


@router.post("/{transfer_id}/dispatch", response_model=TransferDetail)
async def dispatch_transfer_endpoint(
    transfer_id: UUID,
    db: DbSession,
    current_user: RequireWarehouse,
) -> TransferDetail:
    """
    Mark a pending transfer as dispatched/in_transit (warehouse+ only).
    """
    try:
        await dispatch_transfer(db, transfer_id, current_user.id)
        transfer = await get_transfer_by_id(db, transfer_id)
        if not transfer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=HU_TRANSFER_MESSAGES["transfer_not_found"],
            )

        return TransferDetail(
            id=transfer.id,
            source_warehouse_id=transfer.source_warehouse_id,
            source_warehouse_name=transfer.source_warehouse.name,
            target_warehouse_id=transfer.target_warehouse_id,
            target_warehouse_name=transfer.target_warehouse.name,
            source_bin_code=transfer.source_bin.code,
            target_bin_code=transfer.target_bin.code if transfer.target_bin else None,
            product_name=transfer.source_bin_content.product.name,
            sku=transfer.source_bin_content.product.sku,
            batch_number=transfer.source_bin_content.batch_number,
            use_by_date=transfer.source_bin_content.use_by_date,
            quantity_sent=transfer.quantity_sent,
            quantity_received=transfer.quantity_received,
            unit=transfer.unit,
            status=transfer.status,
            transport_reference=transfer.transport_reference,
            condition_on_receipt=transfer.condition_on_receipt,
            dispatched_at=transfer.dispatched_at,
            received_at=transfer.received_at,
            cancelled_at=transfer.cancelled_at,
            cancellation_reason=transfer.cancellation_reason,
            created_by=transfer.created_by_user.username,
            received_by=(transfer.received_by_user.username if transfer.received_by_user else None),
            notes=transfer.notes,
            created_at=transfer.created_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/{transfer_id}/confirm", response_model=TransferConfirmResponse)
async def confirm_transfer_receipt(
    transfer_id: UUID,
    confirm_data: TransferConfirmRequest,
    db: DbSession,
    current_user: RequireWarehouse,
) -> TransferConfirmResponse:
    """
    Confirm receipt of a cross-warehouse transfer (warehouse+ only).
    """
    try:
        transfer = await confirm_cross_warehouse_transfer(
            db, transfer_id, confirm_data, current_user.id
        )

        return TransferConfirmResponse(
            transfer_id=transfer.id,
            target_bin_code=transfer.target_bin.code,
            quantity_received=transfer.quantity_received,
            quantity_sent=transfer.quantity_sent,
            condition_on_receipt=transfer.condition_on_receipt,
            status=transfer.status,
            message=HU_TRANSFER_MESSAGES["cross_warehouse_confirmed"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/{transfer_id}/cancel", response_model=TransferDetail)
async def cancel_transfer_endpoint(
    transfer_id: UUID,
    cancel_data: TransferCancelRequest,
    db: DbSession,
    current_user: RequireManager,
) -> TransferDetail:
    """
    Cancel a pending or in_transit transfer (manager+ only).

    Returns the stock to the source bin.
    """
    try:
        await cancel_transfer(db, transfer_id, cancel_data.reason, current_user.id)
        transfer = await get_transfer_by_id(db, transfer_id)
        if not transfer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=HU_TRANSFER_MESSAGES["transfer_not_found"],
            )

        return TransferDetail(
            id=transfer.id,
            source_warehouse_id=transfer.source_warehouse_id,
            source_warehouse_name=transfer.source_warehouse.name,
            target_warehouse_id=transfer.target_warehouse_id,
            target_warehouse_name=transfer.target_warehouse.name,
            source_bin_code=transfer.source_bin.code,
            target_bin_code=transfer.target_bin.code if transfer.target_bin else None,
            product_name=transfer.source_bin_content.product.name,
            sku=transfer.source_bin_content.product.sku,
            batch_number=transfer.source_bin_content.batch_number,
            use_by_date=transfer.source_bin_content.use_by_date,
            quantity_sent=transfer.quantity_sent,
            quantity_received=transfer.quantity_received,
            unit=transfer.unit,
            status=transfer.status,
            transport_reference=transfer.transport_reference,
            condition_on_receipt=transfer.condition_on_receipt,
            dispatched_at=transfer.dispatched_at,
            received_at=transfer.received_at,
            cancelled_at=transfer.cancelled_at,
            cancellation_reason=transfer.cancellation_reason,
            created_by=transfer.created_by_user.username,
            received_by=(transfer.received_by_user.username if transfer.received_by_user else None),
            notes=transfer.notes,
            created_at=transfer.created_at,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
