"""Dashboard service for aggregated statistics and KPIs."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.bin_movement import BinMovement
from app.db.models.product import Product
from app.db.models.supplier import Supplier
from app.db.models.warehouse import Warehouse
from app.schemas.dashboard import (
    DashboardStats,
    MovementHistoryData,
    SupplierDistributionData,
    WarehouseOccupancyData,
)
from app.services.expiry import get_expiry_warnings


async def get_dashboard_stats(
    db: AsyncSession,
    warehouse_id: UUID | None = None,
) -> DashboardStats:
    """
    Get aggregated dashboard statistics.

    Args:
        db: Async database session.
        warehouse_id: Optional warehouse filter.

    Returns:
        DashboardStats: Aggregated KPIs and chart data.
    """
    # 1. Stock Metrics - Aggregate from BinContent
    stock_query = select(
        func.coalesce(func.sum(BinContent.weight_kg), Decimal("0")).label("total_stock_kg"),
        func.count(func.distinct(BinContent.product_id)).label("total_products"),
        func.count(func.distinct(BinContent.batch_number)).label("total_batches"),
    ).where(
        BinContent.status == "available",
        BinContent.quantity > 0,
    )

    if warehouse_id:
        stock_query = stock_query.join(Bin, BinContent.bin_id == Bin.id).where(
            Bin.warehouse_id == warehouse_id
        )

    stock_result = await db.execute(stock_query)
    stock_row = stock_result.one()

    total_stock_kg = stock_row.total_stock_kg or Decimal("0.00")
    total_products = stock_row.total_products or 0
    total_batches = stock_row.total_batches or 0

    # 2. Occupancy Metrics - Aggregate from Bins
    occupancy_query = select(
        func.count(Bin.id).label("total_bins"),
        func.sum(func.cast(Bin.status == "occupied", Integer)).label("occupied_bins"),
    )

    if warehouse_id:
        occupancy_query = occupancy_query.where(Bin.warehouse_id == warehouse_id)

    occupancy_result = await db.execute(occupancy_query)
    occupancy_row = occupancy_result.one()

    total_bins = occupancy_row.total_bins or 0
    occupied_bins = occupancy_row.occupied_bins or 0
    occupancy_rate = (occupied_bins / total_bins * 100) if total_bins > 0 else 0.0

    # 3. Expiry Warnings - Reuse existing service
    expiry_response = await get_expiry_warnings(db, days_threshold=30, warehouse_id=warehouse_id)
    expiry_warnings = {
        "critical": expiry_response.summary.critical,
        "high": expiry_response.summary.high,
        "medium": expiry_response.summary.medium,
        "low": expiry_response.summary.low,
    }

    # Add expired count
    today = date.today()
    expired_query = select(func.count(BinContent.id)).where(
        BinContent.status == "available",
        BinContent.quantity > 0,
        BinContent.use_by_date < today,
    )
    if warehouse_id:
        expired_query = expired_query.join(Bin, BinContent.bin_id == Bin.id).where(
            Bin.warehouse_id == warehouse_id
        )
    expired_result = await db.execute(expired_query)
    expiry_warnings["expired"] = expired_result.scalar() or 0

    # 4. Today's Movements - Query BinMovement
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    movements_query = select(
        func.count(BinMovement.id).label("total"),
        func.sum(func.cast(BinMovement.movement_type == "receipt", Integer)).label("receipts"),
        func.sum(func.cast(BinMovement.movement_type == "issue", Integer)).label("issues"),
    ).where(
        BinMovement.created_at >= today_start,
        BinMovement.created_at < today_end,
    )

    if warehouse_id:
        movements_query = movements_query.join(
            BinContent, BinMovement.bin_content_id == BinContent.id
        ).join(
            Bin, BinContent.bin_id == Bin.id
        ).where(
            Bin.warehouse_id == warehouse_id
        )

    movements_result = await db.execute(movements_query)
    movements_row = movements_result.one()

    today_movements = movements_row.total or 0
    today_receipts = movements_row.receipts or 0
    today_issues = movements_row.issues or 0

    # 5. Chart Data - Warehouse Occupancy
    warehouse_occupancy_data: list[WarehouseOccupancyData] = []

    if warehouse_id:
        # Single warehouse - use its stats
        warehouse_result = await db.execute(
            select(Warehouse).where(Warehouse.id == warehouse_id)
        )
        warehouse = warehouse_result.scalar_one()

        warehouse_occupancy_data.append(
            WarehouseOccupancyData(
                warehouse_id=warehouse.id,
                warehouse_name=warehouse.name,
                occupied=occupied_bins,
                empty=total_bins - occupied_bins,
                total=total_bins,
                occupancy_rate=round(occupancy_rate, 2),
            )
        )
    else:
        # All warehouses - aggregate by warehouse
        warehouse_stats_query = (
            select(
                Warehouse.id,
                Warehouse.name,
                func.count(Bin.id).label("total_bins"),
                func.sum(func.cast(Bin.status == "occupied", Integer)).label("occupied_bins"),
            )
            .join(Bin, Warehouse.id == Bin.warehouse_id)
            .group_by(Warehouse.id, Warehouse.name)
            .order_by(Warehouse.name)
        )

        warehouse_stats_result = await db.execute(warehouse_stats_query)
        for row in warehouse_stats_result:
            wh_total = row.total_bins or 0
            wh_occupied = row.occupied_bins or 0
            wh_empty = wh_total - wh_occupied
            wh_rate = (wh_occupied / wh_total * 100) if wh_total > 0 else 0.0

            warehouse_occupancy_data.append(
                WarehouseOccupancyData(
                    warehouse_id=row.id,
                    warehouse_name=row.name,
                    occupied=wh_occupied,
                    empty=wh_empty,
                    total=wh_total,
                    occupancy_rate=round(wh_rate, 2),
                )
            )

    # 6. Chart Data - Movement History (last 7 days)
    movement_history_data: list[MovementHistoryData] = []

    for days_ago in range(6, -1, -1):  # 6 days ago to today
        day_date = date.today() - timedelta(days=days_ago)
        day_start = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=UTC)
        day_end = day_start + timedelta(days=1)

        day_movements_query = select(
            func.sum(func.cast(BinMovement.movement_type == "receipt", Integer)).label("receipts"),
            func.sum(func.cast(BinMovement.movement_type == "issue", Integer)).label("issues"),
        ).where(
            BinMovement.created_at >= day_start,
            BinMovement.created_at < day_end,
        )

        if warehouse_id:
            day_movements_query = day_movements_query.join(
                BinContent, BinMovement.bin_content_id == BinContent.id
            ).join(
                Bin, BinContent.bin_id == Bin.id
            ).where(
                Bin.warehouse_id == warehouse_id
            )

        day_result = await db.execute(day_movements_query)
        day_row = day_result.one()

        day_receipts = day_row.receipts or 0
        day_issues = day_row.issues or 0
        day_total = day_receipts + day_issues

        movement_history_data.append(
            MovementHistoryData(
                date=day_date,
                receipts=day_receipts,
                issues=day_issues,
                total=day_total,
            )
        )

    # 7. Chart Data - Supplier Distribution (top 10 suppliers by product count)
    supplier_distribution_data: list[SupplierDistributionData] = []

    supplier_stats_query = (
        select(
            BinContent.supplier_id,
            Supplier.company_name,
            func.count(func.distinct(BinContent.product_id)).label("product_count"),
            func.coalesce(func.sum(BinContent.weight_kg), Decimal("0")).label("total_quantity_kg"),
        )
        .outerjoin(Supplier, BinContent.supplier_id == Supplier.id)
        .where(
            BinContent.status == "available",
            BinContent.quantity > 0,
        )
        .group_by(BinContent.supplier_id, Supplier.company_name)
        .order_by(func.count(func.distinct(BinContent.product_id)).desc())
        .limit(10)
    )

    if warehouse_id:
        supplier_stats_query = supplier_stats_query.join(
            Bin, BinContent.bin_id == Bin.id
        ).where(
            Bin.warehouse_id == warehouse_id
        )

    supplier_stats_result = await db.execute(supplier_stats_query)
    for row in supplier_stats_result:
        supplier_distribution_data.append(
            SupplierDistributionData(
                supplier_id=row.supplier_id,
                supplier_name=row.company_name or "Ismeretlen",
                product_count=row.product_count,
                total_quantity_kg=row.total_quantity_kg,
            )
        )

    return DashboardStats(
        total_stock_kg=total_stock_kg,
        total_products=total_products,
        total_batches=total_batches,
        occupancy_rate=round(occupancy_rate, 2),
        occupied_bins=occupied_bins,
        total_bins=total_bins,
        expiry_warnings=expiry_warnings,
        today_movements=today_movements,
        today_receipts=today_receipts,
        today_issues=today_issues,
        warehouse_occupancy=warehouse_occupancy_data,
        movement_history=movement_history_data,
        supplier_distribution=supplier_distribution_data,
    )
