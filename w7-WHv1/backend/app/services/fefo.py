"""FEFO (First Expired, First Out) recommendation service."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.i18n import HU_MESSAGES
from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.product import Product
from app.schemas.inventory import FEFORecommendation, FEFORecommendationResponse


def calculate_days_until_expiry(use_by_date: date) -> int:
    """
    Calculate days until expiry.

    Args:
        use_by_date: The use by date.

    Returns:
        int: Days until expiry (negative if expired).
    """
    return (use_by_date - date.today()).days


async def get_fefo_recommendation(
    db: AsyncSession,
    product_id: UUID,
    quantity: Decimal,
) -> FEFORecommendationResponse:
    """
    Get FEFO-compliant picking recommendation for a product.

    Sorts bins by: use_by_date ASC → batch_number ASC → received_date ASC.

    Args:
        db: Async database session.
        product_id: Product UUID.
        quantity: Requested quantity.

    Returns:
        FEFORecommendationResponse: Ordered list of bins to pick from.

    Raises:
        ValueError: If product not found.
    """
    # Get product details
    product_result = await db.execute(select(Product).where(Product.id == product_id))
    product = product_result.scalar_one_or_none()
    if not product:
        raise ValueError(HU_MESSAGES["product_not_found"])

    # Query all available stock for this product (exclude expired and fully reserved items)
    today = date.today()
    result = await db.execute(
        select(BinContent)
        .join(Bin, BinContent.bin_id == Bin.id)
        .options(selectinload(BinContent.bin))
        .where(
            BinContent.product_id == product_id,
            BinContent.status == "available",
            BinContent.quantity > BinContent.reserved_quantity,  # Exclude fully reserved
            BinContent.use_by_date >= today,  # Exclude expired items
        )
        .order_by(
            BinContent.use_by_date.asc(),
            BinContent.batch_number.asc(),
            BinContent.received_date.asc(),
        )
    )
    available_bins = result.scalars().all()

    if not available_bins:
        return FEFORecommendationResponse(
            product_id=product_id,
            product_name=product.name,
            sku=product.sku,
            requested_quantity=quantity,
            recommendations=[],
            total_available=Decimal(0),
            fefo_warnings=[],
        )

    # Calculate suggestions
    recommendations: list[FEFORecommendation] = []
    remaining_needed = quantity
    fefo_warnings: list[str] = []

    for bin_content in available_bins:
        if remaining_needed <= 0:
            break

        # Calculate actual available quantity (excluding reserved)
        available_qty = bin_content.quantity - bin_content.reserved_quantity
        suggested_qty = min(available_qty, remaining_needed)
        days_until_expiry = calculate_days_until_expiry(bin_content.use_by_date)

        # Generate warning if expiry is close
        warning = None
        if days_until_expiry < 7:
            warning = f"KRITIKUS! Lejárat {days_until_expiry} nap múlva"
        elif days_until_expiry < 14:
            warning = f"Figyelem! Lejárat {days_until_expiry} nap múlva"

        recommendations.append(
            FEFORecommendation(
                bin_id=bin_content.bin_id,
                bin_content_id=bin_content.id,
                bin_code=bin_content.bin.code,
                batch_number=bin_content.batch_number,
                use_by_date=bin_content.use_by_date,
                days_until_expiry=days_until_expiry,
                available_quantity=available_qty,  # Unreserved quantity only
                suggested_quantity=suggested_qty,
                is_fefo_compliant=True,  # All recommendations are in FEFO order
                warning=warning,
            )
        )

        remaining_needed -= suggested_qty

    # Total available is sum of unreserved quantities
    total_available = sum(bc.quantity - bc.reserved_quantity for bc in available_bins)

    # Check for critical expiry warnings
    if recommendations and recommendations[0].days_until_expiry < 7:
        fefo_warnings.append("KRITIKUS: A legrégebbi tétel 7 napon belül lejár!")
    elif recommendations and recommendations[0].days_until_expiry < 14:
        fefo_warnings.append("FIGYELEM: A legrégebbi tétel 14 napon belül lejár!")

    return FEFORecommendationResponse(
        product_id=product_id,
        product_name=product.name,
        sku=product.sku,
        requested_quantity=quantity,
        recommendations=recommendations,
        total_available=total_available,
        fefo_warnings=fefo_warnings,
    )


async def is_fefo_compliant(
    db: AsyncSession,
    bin_content_id: UUID,
    product_id: UUID,
) -> tuple[bool, BinContent | None]:
    """
    Check if issuing from this bin_content is FEFO compliant.

    Args:
        db: Async database session.
        bin_content_id: BinContent UUID to check.
        product_id: Product UUID.

    Returns:
        tuple: (is_compliant, oldest_bin_content if not compliant else None)
    """
    # Get the selected bin_content
    selected_result = await db.execute(select(BinContent).where(BinContent.id == bin_content_id))
    selected_bin = selected_result.scalar_one_or_none()
    if not selected_bin:
        raise ValueError(HU_MESSAGES["bin_content_not_found"])

    # Get the oldest available bin_content for this product (with unreserved stock)
    oldest_result = await db.execute(
        select(BinContent)
        .where(
            BinContent.product_id == product_id,
            BinContent.status == "available",
            BinContent.quantity > BinContent.reserved_quantity,  # Has unreserved stock
        )
        .order_by(
            BinContent.use_by_date.asc(),
            BinContent.batch_number.asc(),
            BinContent.received_date.asc(),
        )
        .limit(1)
    )
    oldest_bin = oldest_result.scalar_one_or_none()

    if not oldest_bin:
        # No available stock (shouldn't happen, but handle gracefully)
        return True, None

    # Check if selected bin is the oldest
    if selected_bin.id == oldest_bin.id:
        return True, None

    # Not FEFO compliant - return oldest bin for reference
    return False, oldest_bin
