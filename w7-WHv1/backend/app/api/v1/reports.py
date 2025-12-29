"""Inventory reports API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import DbSession, RequireViewer
from app.schemas.dashboard import OccupancyHistoryResponse
from app.schemas.inventory import StockLevel
from app.services.inventory import get_stock_levels
from app.services.occupancy_history import get_occupancy_history

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/inventory-summary", response_model=list[StockLevel])
async def get_inventory_summary(
    db: DbSession,
    _current_user: RequireViewer,
    warehouse_id: UUID | None = Query(None, description="Filter by warehouse"),
) -> list[StockLevel]:
    """
    Get overall inventory summary (all users).

    Returns aggregated stock levels across all products.
    """
    return await get_stock_levels(db, warehouse_id=warehouse_id)


@router.get("/product-locations", response_model=list[StockLevel])
async def get_product_locations(
    db: DbSession,
    _current_user: RequireViewer,
    product_id: UUID = Query(..., description="Product UUID"),
) -> list[StockLevel]:
    """
    Get all locations for a specific product (all users).

    Shows where product is stored across warehouses and bins.
    """
    return await get_stock_levels(db, product_id=product_id)


@router.get("/occupancy-history", response_model=OccupancyHistoryResponse)
async def get_occupancy_history_endpoint(
    db: DbSession,
    _current_user: RequireViewer,
    days: int = Query(30, ge=1, le=90, description="Days of history (max 90)"),
    warehouse_id: UUID | None = Query(None, description="Filter by warehouse"),
) -> OccupancyHistoryResponse:
    """
    Get occupancy history for trend chart (all users).

    Returns historical occupancy data points for the specified time range.
    Uses real-time calculation assuming bins don't change much over time.
    """
    return await get_occupancy_history(db, days, warehouse_id)
