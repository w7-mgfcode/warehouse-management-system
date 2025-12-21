"""Expiry warning service for inventory management."""

from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.product import Product
from app.db.models.warehouse import Warehouse
from app.schemas.expiry import (
    ExpiredProduct,
    ExpiredProductResponse,
    ExpiryWarning,
    ExpiryWarningResponse,
    ExpiryWarningSummary,
    UrgencyLevel,
)


def calculate_urgency(days_until_expiry: int) -> UrgencyLevel:
    """
    Calculate urgency level based on days until expiry.

    Args:
        days_until_expiry: Days until expiry.

    Returns:
        UrgencyLevel: critical/high/medium/low.
    """
    if days_until_expiry < 7:
        return "critical"
    elif days_until_expiry < 14:
        return "high"
    elif days_until_expiry < 30:
        return "medium"
    else:
        return "low"


async def get_expiry_warnings(
    db: AsyncSession,
    days_threshold: int = 30,
    warehouse_id: UUID | None = None,
) -> ExpiryWarningResponse:
    """
    Get expiry warnings for products approaching expiration.

    Args:
        db: Async database session.
        days_threshold: Number of days ahead to check (default 30).
        warehouse_id: Optional warehouse filter.

    Returns:
        ExpiryWarningResponse: Warnings with summary.
    """
    today = date.today()
    threshold_date = today + timedelta(days=days_threshold)

    query = (
        select(BinContent)
        .join(Bin, BinContent.bin_id == Bin.id)
        .join(Warehouse, Bin.warehouse_id == Warehouse.id)
        .join(Product, BinContent.product_id == Product.id)
        .options(
            selectinload(BinContent.bin).selectinload(Bin.warehouse),
            selectinload(BinContent.product),
        )
        .where(
            BinContent.status == "available",
            BinContent.quantity > 0,
            BinContent.use_by_date > today,
            BinContent.use_by_date <= threshold_date,
        )
    )

    if warehouse_id:
        query = query.where(Bin.warehouse_id == warehouse_id)

    query = query.order_by(BinContent.use_by_date.asc())

    result = await db.execute(query)
    bin_contents = result.scalars().all()

    # Build warnings
    warnings: list[ExpiryWarning] = []
    summary_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}

    for bin_content in bin_contents:
        days_until_expiry = (bin_content.use_by_date - today).days
        urgency = calculate_urgency(days_until_expiry)
        summary_counts[urgency] += 1

        # Generate warning message
        if urgency == "critical":
            warning_message = f"KRITIKUS! Lejárat {days_until_expiry} nap múlva"
        elif urgency == "high":
            warning_message = f"FIGYELEM! Lejárat közel ({days_until_expiry} nap)"
        elif urgency == "medium":
            warning_message = f"Figyelem: lejárat {days_until_expiry} nap múlva"
        else:
            warning_message = f"Lejárat: {days_until_expiry} nap múlva"

        warnings.append(
            ExpiryWarning(
                bin_content_id=bin_content.id,
                bin_code=bin_content.bin.code,
                warehouse_name=bin_content.bin.warehouse.name,
                product_name=bin_content.product.name,
                sku=bin_content.product.sku,
                batch_number=bin_content.batch_number,
                quantity=bin_content.quantity,
                unit=bin_content.unit,
                use_by_date=bin_content.use_by_date,
                days_until_expiry=days_until_expiry,
                urgency=urgency,
                warning_message=warning_message,
            )
        )

    summary = ExpiryWarningSummary(
        critical=summary_counts["critical"],
        high=summary_counts["high"],
        medium=summary_counts["medium"],
        low=summary_counts["low"],
        total=len(warnings),
    )

    return ExpiryWarningResponse(
        items=warnings,
        summary=summary,
        warehouse_id=warehouse_id,
    )


async def get_expired_products(
    db: AsyncSession,
    warehouse_id: UUID | None = None,
) -> ExpiredProductResponse:
    """
    Get products that have already expired.

    Args:
        db: Async database session.
        warehouse_id: Optional warehouse filter.

    Returns:
        ExpiredProductResponse: List of expired products.
    """
    today = date.today()

    query = (
        select(BinContent)
        .join(Bin, BinContent.bin_id == Bin.id)
        .join(Warehouse, Bin.warehouse_id == Warehouse.id)
        .join(Product, BinContent.product_id == Product.id)
        .options(
            selectinload(BinContent.bin).selectinload(Bin.warehouse),
            selectinload(BinContent.product),
        )
        .where(
            BinContent.status == "available",
            BinContent.use_by_date < today,
            BinContent.quantity > 0,
        )
    )

    if warehouse_id:
        query = query.where(Bin.warehouse_id == warehouse_id)

    query = query.order_by(BinContent.use_by_date.asc())

    result = await db.execute(query)
    bin_contents = result.scalars().all()

    # Build expired products list
    expired: list[ExpiredProduct] = []

    for bin_content in bin_contents:
        days_since_expiry = (today - bin_content.use_by_date).days

        expired.append(
            ExpiredProduct(
                bin_content_id=bin_content.id,
                bin_code=bin_content.bin.code,
                warehouse_name=bin_content.bin.warehouse.name,
                product_name=bin_content.product.name,
                sku=bin_content.product.sku,
                batch_number=bin_content.batch_number,
                quantity=bin_content.quantity,
                unit=bin_content.unit,
                use_by_date=bin_content.use_by_date,
                days_since_expiry=days_since_expiry,
                status=bin_content.status,
                action_required="Selejtezés szükséges",
            )
        )

    return ExpiredProductResponse(
        items=expired,
        total=len(expired),
        warehouse_id=warehouse_id,
    )
