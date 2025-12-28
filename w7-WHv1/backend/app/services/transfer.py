"""Transfer service for bin-to-bin and cross-warehouse stock movements."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.i18n import HU_MESSAGES, HU_TRANSFER_MESSAGES
from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.bin_movement import BinMovement
from app.db.models.warehouse import Warehouse
from app.db.models.warehouse_transfer import WarehouseTransfer
from app.schemas.transfer import (
    CrossWarehouseTransferCreate,
    TransferConfirmRequest,
    TransferCreate,
)
from app.services.movement import create_movement


async def transfer_within_warehouse(
    db: AsyncSession,
    transfer_data: TransferCreate,
    user_id: UUID,
) -> tuple[BinMovement, BinMovement, BinContent]:
    """
    Transfer stock from one bin to another within same warehouse.

    Args:
        db: Async database session.
        transfer_data: Transfer request data.
        user_id: User performing the action.

    Returns:
        tuple: (source_movement, target_movement, target_bin_content)

    Raises:
        ValueError: If validation fails.
    """
    # 1. Get source bin_content with relationships
    source_result = await db.execute(
        select(BinContent)
        .options(
            selectinload(BinContent.bin).selectinload(Bin.warehouse),
            selectinload(BinContent.product),
        )
        .where(BinContent.id == transfer_data.source_bin_content_id)
    )
    source_content = source_result.scalar_one_or_none()
    if not source_content:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    # 2. Check available quantity (excluding reserved)
    available = source_content.quantity - source_content.reserved_quantity
    if transfer_data.quantity > available:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_insufficient_quantity"])

    # 3. Get target bin with relationships
    target_result = await db.execute(
        select(Bin)
        .options(selectinload(Bin.warehouse))
        .where(Bin.id == transfer_data.target_bin_id)
    )
    target_bin = target_result.scalar_one_or_none()
    if not target_bin:
        raise ValueError(HU_MESSAGES["bin_not_found"])

    # 4. Validate same warehouse
    if source_content.bin.warehouse_id != target_bin.warehouse_id:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_different_warehouse"])

    # 5. Validate not same bin
    if source_content.bin_id == target_bin.id:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_same_bin"])

    # 6. Validate target bin is active
    if not target_bin.is_active:
        raise ValueError(HU_MESSAGES["bin_inactive"])

    # 7. Check target bin for different product
    different_product_result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == target_bin.id,
            BinContent.product_id != source_content.product_id,
            BinContent.quantity > 0,
        )
    )
    if different_product_result.scalar_one_or_none():
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_target_occupied"])

    # 8. Find or create target bin_content
    existing_target_result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == target_bin.id,
            BinContent.product_id == source_content.product_id,
            BinContent.batch_number == source_content.batch_number,
        )
    )
    target_content = existing_target_result.scalar_one_or_none()

    # Source: Decrease quantity
    source_quantity_before = source_content.quantity
    source_content.quantity -= transfer_data.quantity
    source_quantity_after = source_content.quantity

    # Update source bin status if empty
    if source_content.quantity <= 0:
        source_content.bin.status = "empty"

    if target_content:
        # Update existing target bin_content
        target_quantity_before = target_content.quantity
        target_content.quantity += transfer_data.quantity
        target_quantity_after = target_content.quantity
    else:
        # Create new bin_content at target
        target_content = BinContent(
            bin_id=target_bin.id,
            product_id=source_content.product_id,
            supplier_id=source_content.supplier_id,
            batch_number=source_content.batch_number,
            use_by_date=source_content.use_by_date,
            best_before_date=source_content.best_before_date,
            freeze_date=source_content.freeze_date,
            quantity=transfer_data.quantity,
            unit=source_content.unit,
            pallet_count=None,
            weight_kg=None,
            received_date=source_content.received_date,
            status="available",
            notes=transfer_data.notes,
        )
        db.add(target_content)
        await db.flush()
        await db.refresh(target_content)
        target_quantity_before = Decimal(0)
        target_quantity_after = target_content.quantity

    # Update target bin status
    target_bin.status = "occupied"

    # 9. Create movement records
    source_movement = await create_movement(
        db=db,
        bin_content_id=source_content.id,
        movement_type="transfer",
        quantity=-transfer_data.quantity,
        quantity_before=source_quantity_before,
        quantity_after=source_quantity_after,
        reason="transfer_out",
        user_id=user_id,
        notes=f"Transfer to {target_bin.code}",
    )

    target_movement = await create_movement(
        db=db,
        bin_content_id=target_content.id,
        movement_type="transfer",
        quantity=transfer_data.quantity,
        quantity_before=target_quantity_before,
        quantity_after=target_quantity_after,
        reason="transfer_in",
        user_id=user_id,
        notes=f"Transfer from {source_content.bin.code}",
    )

    await db.flush()

    # Reload source_movement with relationships for response
    source_movement_result = await db.execute(
        select(BinMovement)
        .options(
            selectinload(BinMovement.bin_content).selectinload(BinContent.bin),
        )
        .where(BinMovement.id == source_movement.id)
    )
    source_movement_loaded = source_movement_result.scalar_one()

    # Reload target_content with relationships
    result = await db.execute(
        select(BinContent)
        .options(
            selectinload(BinContent.bin),
            selectinload(BinContent.product),
        )
        .where(BinContent.id == target_content.id)
    )
    target_content_loaded = result.scalar_one()

    return source_movement_loaded, target_movement, target_content_loaded


async def create_cross_warehouse_transfer(
    db: AsyncSession,
    transfer_data: CrossWarehouseTransferCreate,
    user_id: UUID,
) -> WarehouseTransfer:
    """
    Create a cross-warehouse transfer (pending state).

    Args:
        db: Async database session.
        transfer_data: Cross-warehouse transfer data.
        user_id: User performing the action.

    Returns:
        WarehouseTransfer: Created transfer record.

    Raises:
        ValueError: If validation fails.
    """
    # 1. Get source bin_content with relationships
    source_result = await db.execute(
        select(BinContent)
        .options(
            selectinload(BinContent.bin).selectinload(Bin.warehouse),
            selectinload(BinContent.product),
        )
        .where(BinContent.id == transfer_data.source_bin_content_id)
    )
    source_content = source_result.scalar_one_or_none()
    if not source_content:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    # 2. Check available quantity (excluding reserved)
    available = source_content.quantity - source_content.reserved_quantity
    if transfer_data.quantity > available:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_insufficient_quantity"])

    # 3. Validate target warehouse exists
    target_wh_result = await db.execute(
        select(Warehouse).where(Warehouse.id == transfer_data.target_warehouse_id)
    )
    target_warehouse = target_wh_result.scalar_one_or_none()
    if not target_warehouse:
        raise ValueError(HU_MESSAGES["warehouse_not_found"])

    # 4. Validate different warehouse
    if source_content.bin.warehouse_id == target_warehouse.id:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_same_bin"])

    # 5. Validate target bin if provided
    target_bin_id = None
    if transfer_data.target_bin_id:
        target_bin_result = await db.execute(
            select(Bin).where(
                Bin.id == transfer_data.target_bin_id,
                Bin.warehouse_id == target_warehouse.id,
            )
        )
        target_bin = target_bin_result.scalar_one_or_none()
        if not target_bin:
            raise ValueError(HU_MESSAGES["bin_not_found"])
        if not target_bin.is_active:
            raise ValueError(HU_MESSAGES["bin_inactive"])
        target_bin_id = target_bin.id

    # 6. Reduce source quantity
    source_quantity_before = source_content.quantity
    source_content.quantity -= transfer_data.quantity

    # Update source bin status if empty
    if source_content.quantity <= 0:
        source_content.bin.status = "empty"

    # 7. Create transfer record
    transfer = WarehouseTransfer(
        source_warehouse_id=source_content.bin.warehouse_id,
        source_bin_id=source_content.bin_id,
        source_bin_content_id=source_content.id,
        target_warehouse_id=target_warehouse.id,
        target_bin_id=target_bin_id,
        quantity_sent=transfer_data.quantity,
        unit=source_content.unit,
        status="pending",
        transport_reference=transfer_data.transport_reference,
        created_by=user_id,
        notes=transfer_data.notes,
    )
    db.add(transfer)
    await db.flush()

    # 8. Create source movement record
    await create_movement(
        db=db,
        bin_content_id=source_content.id,
        movement_type="transfer",
        quantity=-transfer_data.quantity,
        quantity_before=source_quantity_before,
        quantity_after=source_content.quantity,
        reason="cross_warehouse_out",
        user_id=user_id,
        reference_number=transfer_data.transport_reference,
        notes=f"Cross-warehouse transfer to {target_warehouse.name}",
    )

    await db.flush()
    await db.refresh(transfer)

    # Load transfer with relationships
    result = await db.execute(
        select(WarehouseTransfer)
        .options(
            selectinload(WarehouseTransfer.source_warehouse),
            selectinload(WarehouseTransfer.target_warehouse),
            selectinload(WarehouseTransfer.source_bin),
            selectinload(WarehouseTransfer.source_bin_content).selectinload(BinContent.product),
        )
        .where(WarehouseTransfer.id == transfer.id)
    )
    return result.scalar_one()


async def dispatch_transfer(
    db: AsyncSession,
    transfer_id: UUID,
    user_id: UUID,
) -> WarehouseTransfer:
    """
    Mark a pending transfer as in_transit.

    Args:
        db: Async database session.
        transfer_id: Transfer UUID.
        user_id: User performing the action.

    Returns:
        WarehouseTransfer: Updated transfer.

    Raises:
        ValueError: If transfer not found or invalid state.
    """
    result = await db.execute(select(WarehouseTransfer).where(WarehouseTransfer.id == transfer_id))
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_not_found"])

    if transfer.status != "pending":
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_already_completed"])

    transfer.status = "in_transit"
    transfer.dispatched_at = datetime.now(UTC)

    await db.flush()
    return transfer


async def confirm_cross_warehouse_transfer(
    db: AsyncSession,
    transfer_id: UUID,
    confirm_data: TransferConfirmRequest,
    user_id: UUID,
) -> WarehouseTransfer:
    """
    Confirm receipt of cross-warehouse transfer.

    Args:
        db: Async database session.
        transfer_id: Transfer UUID.
        confirm_data: Confirmation data.
        user_id: User performing the action.

    Returns:
        WarehouseTransfer: Confirmed transfer.

    Raises:
        ValueError: If validation fails.
    """
    # 1. Get transfer with relationships
    result = await db.execute(
        select(WarehouseTransfer)
        .options(
            selectinload(WarehouseTransfer.source_bin_content).selectinload(BinContent.product),
            selectinload(WarehouseTransfer.target_bin),
        )
        .where(WarehouseTransfer.id == transfer_id)
    )
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_not_found"])

    if transfer.status == "received":
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_already_completed"])
    if transfer.status == "cancelled":
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_already_cancelled"])
    if transfer.status == "pending":
        raise ValueError("A transzfert először ki kell küldeni (dispatch) mielőtt megerősítené.")

    # 2. Validate target bin
    target_bin_result = await db.execute(
        select(Bin)
        .options(selectinload(Bin.warehouse))
        .where(
            Bin.id == confirm_data.target_bin_id,
            Bin.warehouse_id == transfer.target_warehouse_id,
        )
    )
    target_bin = target_bin_result.scalar_one_or_none()
    if not target_bin:
        raise ValueError(HU_MESSAGES["bin_not_found"])
    if not target_bin.is_active:
        raise ValueError(HU_MESSAGES["bin_inactive"])

    # 3. Check target bin for different product
    source_content = transfer.source_bin_content
    different_product_result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == target_bin.id,
            BinContent.product_id != source_content.product_id,
            BinContent.quantity > 0,
        )
    )
    if different_product_result.scalar_one_or_none():
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_target_occupied"])

    # 4. Find or create target bin_content
    existing_target_result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == target_bin.id,
            BinContent.product_id == source_content.product_id,
            BinContent.batch_number == source_content.batch_number,
        )
    )
    target_content = existing_target_result.scalar_one_or_none()

    if target_content:
        target_quantity_before = target_content.quantity
        target_content.quantity += confirm_data.received_quantity
        target_quantity_after = target_content.quantity
    else:
        target_content = BinContent(
            bin_id=target_bin.id,
            product_id=source_content.product_id,
            supplier_id=source_content.supplier_id,
            batch_number=source_content.batch_number,
            use_by_date=source_content.use_by_date,
            best_before_date=source_content.best_before_date,
            freeze_date=source_content.freeze_date,
            quantity=confirm_data.received_quantity,
            unit=source_content.unit,
            received_date=source_content.received_date,
            status="available",
            notes=confirm_data.notes,
        )
        db.add(target_content)
        await db.flush()
        await db.refresh(target_content)
        target_quantity_before = Decimal(0)
        target_quantity_after = target_content.quantity

    # Update target bin status
    target_bin.status = "occupied"

    # 5. Create target movement record
    await create_movement(
        db=db,
        bin_content_id=target_content.id,
        movement_type="transfer",
        quantity=confirm_data.received_quantity,
        quantity_before=target_quantity_before,
        quantity_after=target_quantity_after,
        reason="cross_warehouse_in",
        user_id=user_id,
        reference_number=transfer.transport_reference,
        notes=f"Cross-warehouse transfer from {transfer.source_warehouse_id}",
    )

    # 6. Update transfer record
    transfer.status = "received"
    transfer.target_bin_id = target_bin.id
    transfer.quantity_received = confirm_data.received_quantity
    transfer.condition_on_receipt = confirm_data.condition_on_receipt
    transfer.received_at = datetime.now(UTC)
    transfer.received_by = user_id

    await db.flush()
    return transfer


async def cancel_transfer(
    db: AsyncSession,
    transfer_id: UUID,
    reason: str,
    user_id: UUID,
) -> WarehouseTransfer:
    """
    Cancel a pending/in_transit transfer.

    Args:
        db: Async database session.
        transfer_id: Transfer UUID.
        reason: Cancellation reason.
        user_id: User performing the action.

    Returns:
        WarehouseTransfer: Cancelled transfer.

    Raises:
        ValueError: If transfer not found or invalid state.
    """
    # 1. Get transfer with source bin_content
    result = await db.execute(
        select(WarehouseTransfer)
        .options(selectinload(WarehouseTransfer.source_bin_content))
        .where(WarehouseTransfer.id == transfer_id)
    )
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_not_found"])

    if transfer.status == "received":
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_already_completed"])
    if transfer.status == "cancelled":
        raise ValueError(HU_TRANSFER_MESSAGES["transfer_already_cancelled"])

    # 2. Return quantity to source
    source_content = transfer.source_bin_content
    source_quantity_before = source_content.quantity
    source_content.quantity += transfer.quantity_sent
    source_content.bin.status = "occupied"

    # 3. Create reversal movement
    await create_movement(
        db=db,
        bin_content_id=source_content.id,
        movement_type="transfer",
        quantity=transfer.quantity_sent,
        quantity_before=source_quantity_before,
        quantity_after=source_content.quantity,
        reason="transfer_cancelled",
        user_id=user_id,
        notes=f"Transfer cancelled: {reason}",
    )

    # 4. Update transfer record
    transfer.status = "cancelled"
    transfer.cancelled_at = datetime.now(UTC)
    transfer.cancellation_reason = reason

    await db.flush()
    return transfer


async def get_transfer_by_id(
    db: AsyncSession,
    transfer_id: UUID,
) -> WarehouseTransfer | None:
    """Get transfer by ID with relationships."""
    result = await db.execute(
        select(WarehouseTransfer)
        .options(
            selectinload(WarehouseTransfer.source_warehouse),
            selectinload(WarehouseTransfer.target_warehouse),
            selectinload(WarehouseTransfer.source_bin),
            selectinload(WarehouseTransfer.target_bin),
            selectinload(WarehouseTransfer.source_bin_content).selectinload(BinContent.product),
            selectinload(WarehouseTransfer.created_by_user),
            selectinload(WarehouseTransfer.received_by_user),
        )
        .where(WarehouseTransfer.id == transfer_id)
    )
    return result.scalar_one_or_none()


async def get_transfers(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    source_warehouse_id: UUID | None = None,
    target_warehouse_id: UUID | None = None,
    status: str | None = None,
) -> tuple[list[WarehouseTransfer], int]:
    """Get paginated list of transfers with filters."""
    query = select(WarehouseTransfer).options(
        selectinload(WarehouseTransfer.source_warehouse),
        selectinload(WarehouseTransfer.target_warehouse),
        selectinload(WarehouseTransfer.source_bin),
        selectinload(WarehouseTransfer.target_bin),
        selectinload(WarehouseTransfer.source_bin_content).selectinload(BinContent.product),
    )

    if source_warehouse_id:
        query = query.where(WarehouseTransfer.source_warehouse_id == source_warehouse_id)
    if target_warehouse_id:
        query = query.where(WarehouseTransfer.target_warehouse_id == target_warehouse_id)
    if status:
        query = query.where(WarehouseTransfer.status == status)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated results
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(WarehouseTransfer.created_at.desc()).offset(offset).limit(page_size)
    )
    transfers = list(result.scalars().all())

    return transfers, total


async def get_pending_transfers(
    db: AsyncSession,
    warehouse_id: UUID | None = None,
) -> list[WarehouseTransfer]:
    """Get pending cross-warehouse transfers for a warehouse."""
    query = select(WarehouseTransfer).options(
        selectinload(WarehouseTransfer.source_warehouse),
        selectinload(WarehouseTransfer.target_warehouse),
        selectinload(WarehouseTransfer.source_bin),
        selectinload(WarehouseTransfer.source_bin_content).selectinload(BinContent.product),
    )

    query = query.where(WarehouseTransfer.status.in_(["pending", "in_transit"]))

    if warehouse_id:
        query = query.where(WarehouseTransfer.target_warehouse_id == warehouse_id)

    query = query.order_by(WarehouseTransfer.created_at.asc())

    result = await db.execute(query)
    return list(result.scalars().all())
