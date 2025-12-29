"""Occupancy history service for trend analysis."""

from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import Integer, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.bin import Bin
from app.db.models.warehouse import Warehouse
from app.schemas.dashboard import OccupancyHistoryPoint, OccupancyHistoryResponse


async def get_occupancy_history(
    db: AsyncSession,
    days: int = 30,
    warehouse_id: UUID | None = None,
) -> OccupancyHistoryResponse:
    """
    Get occupancy history for trend chart.

    Uses real-time calculation (Option A for MVP) - queries current bin status
    for each day in the range. Assumes bins don't change much over time.

    Args:
        db: Async database session.
        days: Number of days of history (default 30, max 90).
        warehouse_id: Optional warehouse filter.

    Returns:
        OccupancyHistoryResponse: Historical occupancy data points.
    """
    # Limit days to max 90
    days = min(days, 90)

    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)

    history_data: list[OccupancyHistoryPoint] = []

    if warehouse_id:
        # Single warehouse history
        warehouse_result = await db.execute(
            select(Warehouse).where(Warehouse.id == warehouse_id)
        )
        warehouse = warehouse_result.scalar_one()

        # Get current bin status for this warehouse
        bin_stats_query = select(
            func.count(Bin.id).label("total_bins"),
            func.sum(func.cast(Bin.status == "occupied", Integer)).label("occupied_bins"),
        ).where(Bin.warehouse_id == warehouse_id)

        bin_stats_result = await db.execute(bin_stats_query)
        bin_stats = bin_stats_result.one()

        total_bins = bin_stats.total_bins or 0
        occupied_bins = bin_stats.occupied_bins or 0
        empty_bins = total_bins - occupied_bins
        occupancy_rate = (occupied_bins / total_bins * 100) if total_bins > 0 else 0.0

        # For MVP, assume occupancy is constant over the period
        # (In a real implementation, we'd have daily snapshots)
        for day_offset in range(days):
            day_date = start_date + timedelta(days=day_offset)
            history_data.append(
                OccupancyHistoryPoint(
                    date=day_date,
                    warehouse_id=warehouse.id,
                    warehouse_name=warehouse.name,
                    total_bins=total_bins,
                    occupied_bins=occupied_bins,
                    empty_bins=empty_bins,
                    occupancy_rate=round(occupancy_rate, 2),
                )
            )
    else:
        # All warehouses aggregated
        # Get current total bin status across all warehouses
        total_stats_query = select(
            func.count(Bin.id).label("total_bins"),
            func.sum(func.cast(Bin.status == "occupied", Integer)).label("occupied_bins"),
        )

        total_stats_result = await db.execute(total_stats_query)
        total_stats = total_stats_result.one()

        total_bins = total_stats.total_bins or 0
        occupied_bins = total_stats.occupied_bins or 0
        empty_bins = total_bins - occupied_bins
        occupancy_rate = (occupied_bins / total_bins * 100) if total_bins > 0 else 0.0

        # For MVP, assume occupancy is constant over the period
        for day_offset in range(days):
            day_date = start_date + timedelta(days=day_offset)
            history_data.append(
                OccupancyHistoryPoint(
                    date=day_date,
                    warehouse_id=None,
                    warehouse_name="Összes raktár",
                    total_bins=total_bins,
                    occupied_bins=occupied_bins,
                    empty_bins=empty_bins,
                    occupancy_rate=round(occupancy_rate, 2),
                )
            )

    return OccupancyHistoryResponse(
        data=history_data,
        start_date=start_date,
        end_date=end_date,
    )
