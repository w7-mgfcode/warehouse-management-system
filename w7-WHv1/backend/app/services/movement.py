"""Movement tracking service for immutable audit trail."""

from datetime import UTC, date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.i18n import HU_MESSAGES
from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.bin_movement import BinMovement
from app.db.models.product import Product
from app.db.models.user import User
from app.schemas.movement import MovementResponse
from app.services.pagination import calculate_pages as _calculate_pages


def calculate_pages(total: int, page_size: int) -> int:
    """Calculate total pages."""
    return _calculate_pages(total, page_size)


async def create_movement(
    db: AsyncSession,
    bin_content_id: UUID,
    movement_type: str,
    quantity: Decimal,
    quantity_before: Decimal,
    quantity_after: Decimal,
    reason: str,
    user_id: UUID,
    reference_number: str | None = None,
    fefo_compliant: bool | None = None,
    force_override: bool = False,
    override_reason: str | None = None,
    notes: str | None = None,
) -> BinMovement:
    """
    Create a movement record (immutable audit trail).

    Args:
        db: Async database session.
        bin_content_id: BinContent UUID.
        movement_type: Type of movement.
        quantity: Quantity change (positive for receipt, negative for issue).
        quantity_before: Quantity before movement.
        quantity_after: Quantity after movement.
        reason: Reason code.
        user_id: User performing the action.
        reference_number: Optional reference (PO, SO, etc.).
        fefo_compliant: Only for issue movements.
        force_override: True if non-FEFO with approval.
        override_reason: Reason for override.
        notes: Optional notes.

    Returns:
        BinMovement: Created movement record with eagerly loaded bin_content.
    """
    movement = BinMovement(
        bin_content_id=bin_content_id,
        movement_type=movement_type,
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=reason,
        reference_number=reference_number,
        fefo_compliant=fefo_compliant,
        force_override=force_override,
        override_reason=override_reason,
        notes=notes,
        created_by=user_id,
    )
    db.add(movement)
    await db.flush()
    
    # Reload with eager loading to ensure bin_content is available in async context
    # This prevents lazy-load issues when bin_content is None in issue_goods()
    result = await db.execute(
        select(BinMovement)
        .options(selectinload(BinMovement.bin_content))
        .where(BinMovement.id == movement.id)
    )
    return result.scalar_one()


async def get_movements(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    product_id: UUID | None = None,
    bin_id: UUID | None = None,
    movement_type: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    created_by: UUID | None = None,
) -> tuple[list[BinMovement], int]:
    """
    Get paginated list of movements with filters.

    Args:
        db: Async database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        product_id: Filter by product.
        bin_id: Filter by bin.
        movement_type: Filter by type.
        start_date: Filter by start date.
        end_date: Filter by end date.
        created_by: Filter by user.

    Returns:
        tuple: List of movements and total count.
    """
    query = (
        select(BinMovement)
        .join(BinContent, BinMovement.bin_content_id == BinContent.id)
        .join(Bin, BinContent.bin_id == Bin.id)
    )

    if product_id:
        query = query.where(BinContent.product_id == product_id)
    if bin_id:
        query = query.where(BinContent.bin_id == bin_id)
    if movement_type:
        query = query.where(BinMovement.movement_type == movement_type)
    if start_date:
        from datetime import datetime

        start_datetime = datetime.combine(start_date, datetime.min.time()).replace(tzinfo=UTC)
        query = query.where(BinMovement.created_at >= start_datetime)
    if end_date:
        from datetime import datetime

        end_datetime = datetime.combine(end_date, datetime.max.time()).replace(tzinfo=UTC)
        query = query.where(BinMovement.created_at <= end_datetime)
    if created_by:
        query = query.where(BinMovement.created_by == created_by)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated movements
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(BinMovement.created_at.desc()).offset(offset).limit(page_size)
    )
    movements = list(result.scalars().all())

    return movements, total


async def get_movement_by_id(
    db: AsyncSession,
    movement_id: UUID,
) -> BinMovement | None:
    """
    Get movement by ID.

    Args:
        db: Async database session.
        movement_id: Movement UUID.

    Returns:
        BinMovement | None: Movement if found.
    """
    result = await db.execute(select(BinMovement).where(BinMovement.id == movement_id))
    return result.scalar_one_or_none()


async def movement_to_response(
    db: AsyncSession,
    movement: BinMovement,
) -> MovementResponse:
    """
    Convert BinMovement to MovementResponse with joined data.

    Args:
        db: Async database session.
        movement: BinMovement object.

    Returns:
        MovementResponse: Formatted response.
    """
    # Get bin_content with relationships
    bin_content_result = await db.execute(
        select(BinContent)
        .join(Bin, BinContent.bin_id == Bin.id)
        .join(Product, BinContent.product_id == Product.id)
        .options(
            selectinload(BinContent.bin),
            selectinload(BinContent.product),
        )
        .where(BinContent.id == movement.bin_content_id)
    )
    bin_content = bin_content_result.scalar_one_or_none()
    if not bin_content:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    # Get user
    user_result = await db.execute(select(User).where(User.id == movement.created_by))
    user = user_result.scalar_one_or_none()
    if not user:
        raise ValueError(HU_MESSAGES["user_not_found"])

    return MovementResponse(
        id=movement.id,
        movement_type=movement.movement_type,
        bin_code=bin_content.bin.code,
        product_name=bin_content.product.name,
        sku=bin_content.product.sku,
        batch_number=bin_content.batch_number,
        quantity=movement.quantity,
        unit=bin_content.unit,
        quantity_before=movement.quantity_before,
        quantity_after=movement.quantity_after,
        use_by_date=bin_content.use_by_date,
        reason=movement.reason,
        reference_number=movement.reference_number,
        fefo_compliant=movement.fefo_compliant,
        force_override=movement.force_override,
        override_reason=movement.override_reason,
        notes=movement.notes,
        created_by=user.username,
        created_at=movement.created_at,
    )
