"""Inventory reports API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import DbSession, RequireViewer
from app.schemas.inventory import StockLevel
from app.services.inventory import get_stock_levels

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
