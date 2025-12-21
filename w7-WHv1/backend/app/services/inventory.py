"""Inventory service for receipt, issue, and stock management."""

from datetime import UTC, datetime
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
from app.schemas.inventory import (
    AdjustmentRequest,
    IssueRequest,
    ReceiveRequest,
    ScrapRequest,
    StockLevel,
)
from app.services.bin import get_bin_by_id
from app.services.fefo import is_fefo_compliant
from app.services.movement import create_movement
from app.services.product import get_product_by_id
from app.services.supplier import get_supplier_by_id


async def receive_goods(
    db: AsyncSession,
    receive_data: ReceiveRequest,
    user_id: UUID,
) -> tuple[BinContent, BinMovement]:
    """
    Receive product into bin with full traceability.

    Args:
        db: Async database session.
        receive_data: Receipt request data.
        user_id: User performing the action.

    Returns:
        tuple: (BinContent, BinMovement) created/updated.

    Raises:
        ValueError: If validation fails.
    """
    # 1. Validate bin
    bin_obj = await get_bin_by_id(db, receive_data.bin_id)
    if not bin_obj:
        raise ValueError(HU_MESSAGES["bin_not_found"])
    if not bin_obj.is_active:
        raise ValueError(HU_MESSAGES["bin_inactive"])

    # Check if bin is occupied by different product
    different_product_result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == receive_data.bin_id,
            BinContent.product_id != receive_data.product_id,
            BinContent.quantity > 0,
        )
    )
    if different_product_result.scalar_one_or_none():
        raise ValueError(HU_MESSAGES["bin_already_occupied"])

    # 2. Validate product and supplier
    product = await get_product_by_id(db, receive_data.product_id)
    if not product or not product.is_active:
        raise ValueError(HU_MESSAGES["product_not_found"])

    if receive_data.supplier_id:
        supplier = await get_supplier_by_id(db, receive_data.supplier_id)
        if not supplier or not supplier.is_active:
            raise ValueError(HU_MESSAGES["supplier_not_found"])

    # 3. Check for existing bin_content with same product and batch
    existing_result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == receive_data.bin_id,
            BinContent.product_id == receive_data.product_id,
            BinContent.batch_number == receive_data.batch_number,
        )
    )
    bin_content = existing_result.scalar_one_or_none()

    if bin_content:
        # Update existing bin_content (add to quantity)
        quantity_before = bin_content.quantity
        bin_content.quantity += receive_data.quantity
        bin_content.updated_at = datetime.now(UTC)
        quantity_after = bin_content.quantity
    else:
        # Create new bin_content
        bin_content = BinContent(
            bin_id=receive_data.bin_id,
            product_id=receive_data.product_id,
            supplier_id=receive_data.supplier_id,
            batch_number=receive_data.batch_number,
            use_by_date=receive_data.use_by_date,
            best_before_date=receive_data.best_before_date,
            freeze_date=receive_data.freeze_date,
            quantity=receive_data.quantity,
            unit=receive_data.unit,
            pallet_count=receive_data.pallet_count,
            weight_kg=receive_data.weight_kg,
            received_date=datetime.now(UTC),
            status="available",
            notes=receive_data.notes,
        )
        db.add(bin_content)
        await db.flush()
        await db.refresh(bin_content)
        quantity_before = Decimal(0)
        quantity_after = bin_content.quantity

    # 4. Create BinMovement (receipt)
    movement = await create_movement(
        db=db,
        bin_content_id=bin_content.id,
        movement_type="receipt",
        quantity=receive_data.quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason="supplier_delivery",
        user_id=user_id,
        reference_number=receive_data.reference_number,
        notes=receive_data.notes,
    )

    # 5. Update Bin status
    bin_obj.status = "occupied"

    await db.flush()

    result = await db.execute(
        select(BinContent)
        .options(
            selectinload(BinContent.bin),
            selectinload(BinContent.product),
        )
        .where(BinContent.id == bin_content.id)
    )
    bin_content_with_relationships = result.scalar_one()

    return bin_content_with_relationships, movement


async def issue_goods(
    db: AsyncSession,
    issue_data: IssueRequest,
    user_id: UUID,
    user_role: str,
) -> tuple[BinContent | None, BinMovement]:
    """
    Issue product from bin with FEFO enforcement.

    Args:
        db: Async database session.
        issue_data: Issue request data.
        user_id: User performing the action.
        user_role: User role (for FEFO override check).

    Returns:
        tuple: (BinContent or None if depleted, BinMovement) created.

    Raises:
        ValueError: If validation or FEFO violation.
    """
    # 1. Get bin_content
    bin_content_result = await db.execute(
        select(BinContent).where(BinContent.id == issue_data.bin_content_id)
    )
    bin_content = bin_content_result.scalar_one_or_none()
    if not bin_content:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    # 2. Validate quantity
    if issue_data.quantity > bin_content.quantity:
        raise ValueError(HU_MESSAGES["insufficient_quantity"])
    if issue_data.quantity <= 0:
        raise ValueError(HU_MESSAGES["invalid_quantity"])

    # 3. Check expiry
    from datetime import date

    if bin_content.use_by_date < date.today():
        raise ValueError(HU_MESSAGES["product_expired"])

    # 4. Check FEFO compliance
    is_compliant, oldest_bin = await is_fefo_compliant(
        db, issue_data.bin_content_id, bin_content.product_id
    )

    if not is_compliant and not issue_data.force_non_fefo:
        # Not FEFO compliant and not forcing override
        raise ValueError(HU_MESSAGES["fefo_violation"])

    if not is_compliant and issue_data.force_non_fefo:
        # Force override - check permissions
        if user_role not in ["admin", "manager"]:
            raise ValueError(HU_MESSAGES["fefo_override_required"])
        if not issue_data.override_reason:
            raise ValueError(HU_MESSAGES["fefo_override_required"])

    # 5. Validate reserved quantity constraint
    available_to_issue = bin_content.quantity - bin_content.reserved_quantity
    if issue_data.quantity > available_to_issue:
        raise ValueError(
            f"Nem lehet kiadni: {issue_data.quantity} kért, "
            f"de csak {available_to_issue} elérhető (lefoglalva: {bin_content.reserved_quantity})"
        )

    # 6. Update quantity
    quantity_before = bin_content.quantity
    bin_content.quantity -= issue_data.quantity
    quantity_after = bin_content.quantity

    # 7. Create BinMovement (issue)
    movement = await create_movement(
        db=db,
        bin_content_id=bin_content.id,
        movement_type="issue",
        quantity=-issue_data.quantity,  # Negative for issue
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=issue_data.reason,
        user_id=user_id,
        reference_number=issue_data.reference_number,
        fefo_compliant=is_compliant,
        force_override=issue_data.force_non_fefo,
        override_reason=issue_data.override_reason,
        notes=issue_data.notes,
    )

    # 8. Update bin status if empty
    if bin_content.quantity == 0:
        bin = await get_bin_by_id(db, bin_content.bin_id)
        if bin:
            bin.status = "empty"
        result_bin_content = None
    else:
        result_bin_content = bin_content

    await db.flush()

    return result_bin_content, movement


async def adjust_stock(
    db: AsyncSession,
    adjustment_data: AdjustmentRequest,
    user_id: UUID,
) -> BinMovement:
    """
    Adjust stock quantity (manager+ only).

    Args:
        db: Async database session.
        adjustment_data: Adjustment request data.
        user_id: User performing the action.

    Returns:
        BinMovement: Created movement record.

    Raises:
        ValueError: If bin_content not found.
    """
    # Get bin_content
    bin_content_result = await db.execute(
        select(BinContent).where(BinContent.id == adjustment_data.bin_content_id)
    )
    bin_content = bin_content_result.scalar_one_or_none()
    if not bin_content:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    # Validate new quantity won't violate reserved constraint
    if adjustment_data.new_quantity < bin_content.reserved_quantity:
        raise ValueError(
            f"Az új mennyiség ({adjustment_data.new_quantity}) nem lehet kevesebb, "
            f"mint a lefoglalt mennyiség ({bin_content.reserved_quantity})"
        )

    quantity_before = bin_content.quantity
    quantity_change = adjustment_data.new_quantity - quantity_before
    bin_content.quantity = adjustment_data.new_quantity
    quantity_after = adjustment_data.new_quantity

    # Create adjustment movement
    movement = await create_movement(
        db=db,
        bin_content_id=bin_content.id,
        movement_type="adjustment",
        quantity=quantity_change,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=adjustment_data.reason,
        user_id=user_id,
        reference_number=adjustment_data.reference_number,
        notes=adjustment_data.notes,
    )

    # Update bin status
    bin = await get_bin_by_id(db, bin_content.bin_id)
    if bin:
        if quantity_after == 0:
            bin.status = "empty"
        else:
            bin.status = "occupied"

    await db.flush()

    return movement


async def scrap_stock(
    db: AsyncSession,
    scrap_data: ScrapRequest,
    user_id: UUID,
) -> BinMovement:
    """
    Scrap expired or damaged stock (manager+ only).

    Args:
        db: Async database session.
        scrap_data: Scrap request data.
        user_id: User performing the action.

    Returns:
        BinMovement: Created movement record.

    Raises:
        ValueError: If bin_content not found.
    """
    # Get bin_content
    bin_content_result = await db.execute(
        select(BinContent).where(BinContent.id == scrap_data.bin_content_id)
    )
    bin_content = bin_content_result.scalar_one_or_none()
    if not bin_content:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    quantity_before = bin_content.quantity
    bin_content.quantity = Decimal(0)
    bin_content.status = "scrapped"
    quantity_after = Decimal(0)

    # Create scrap movement
    movement = await create_movement(
        db=db,
        bin_content_id=bin_content.id,
        movement_type="scrap",
        quantity=-quantity_before,  # Negative (removing all)
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=scrap_data.reason,
        user_id=user_id,
        reference_number=scrap_data.reference_number,
        notes=scrap_data.notes,
    )

    # Update bin status
    bin = await get_bin_by_id(db, bin_content.bin_id)
    if bin:
        bin.status = "empty"

    await db.flush()

    return movement


async def get_stock_levels(
    db: AsyncSession,
    warehouse_id: UUID | None = None,
    product_id: UUID | None = None,
) -> list[StockLevel]:
    """
    Get aggregated stock levels by product.

    Args:
        db: Async database session.
        warehouse_id: Optional warehouse filter.
        product_id: Optional product filter.

    Returns:
        list[StockLevel]: Aggregated stock levels.
    """
    query = (
        select(
            BinContent.product_id,
            Product.name,
            Product.sku,
            BinContent.unit,
            func.sum(BinContent.quantity).label("total_quantity"),
            func.count(func.distinct(BinContent.bin_id)).label("bin_count"),
            func.count(func.distinct(BinContent.batch_number)).label("batch_count"),
            func.min(BinContent.use_by_date).label("oldest_expiry"),
            func.max(BinContent.use_by_date).label("newest_expiry"),
        )
        .join(Product, BinContent.product_id == Product.id)
        .join(Bin, BinContent.bin_id == Bin.id)
        .where(
            BinContent.status == "available",
            BinContent.quantity > 0,
        )
        .group_by(BinContent.product_id, Product.name, Product.sku, BinContent.unit)
    )

    if warehouse_id:
        query = query.where(Bin.warehouse_id == warehouse_id)
    if product_id:
        query = query.where(BinContent.product_id == product_id)

    result = await db.execute(query)
    rows = result.all()

    stock_levels: list[StockLevel] = []
    for row in rows:
        # Get locations for this product
        locations_query = (
            select(Bin.code)
            .join(BinContent, Bin.id == BinContent.bin_id)
            .where(
                BinContent.product_id == row.product_id,
                BinContent.status == "available",
                BinContent.quantity > 0,
            )
            .distinct()
        )
        if warehouse_id:
            locations_query = locations_query.where(Bin.warehouse_id == warehouse_id)

        locations_result = await db.execute(locations_query)
        locations = [loc[0] for loc in locations_result.all()]

        stock_levels.append(
            StockLevel(
                product_id=row.product_id,
                product_name=row.name,
                sku=row.sku,
                total_quantity=row.total_quantity or Decimal(0),
                unit=row.unit,
                bin_count=row.bin_count or 0,
                batch_count=row.batch_count or 0,
                oldest_expiry=row.oldest_expiry,
                newest_expiry=row.newest_expiry,
                locations=locations,
            )
        )

    return stock_levels


async def get_bin_stock(
    db: AsyncSession,
    bin_id: UUID,
) -> list[BinContent]:
    """
    Get all stock in a specific bin.

    Args:
        db: Async database session.
        bin_id: Bin UUID.

    Returns:
        list[BinContent]: All contents in the bin.
    """
    result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == bin_id,
            BinContent.quantity > 0,
        )
    )
    return list(result.scalars().all())


async def get_warehouse_stock(
    db: AsyncSession,
    warehouse_id: UUID,
) -> list[BinContent]:
    """
    Get all stock in a warehouse.

    Args:
        db: Async database session.
        warehouse_id: Warehouse UUID.

    Returns:
        list[BinContent]: All contents in the warehouse.
    """
    result = await db.execute(
        select(BinContent)
        .join(Bin, BinContent.bin_id == Bin.id)
        .where(
            Bin.warehouse_id == warehouse_id,
            BinContent.quantity > 0,
        )
    )
    return list(result.scalars().all())
