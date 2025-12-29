"""Dashboard statistics API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import DbSession, RequireViewer
from app.schemas.dashboard import DashboardStats
from app.services.dashboard import get_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    db: DbSession,
    _user: RequireViewer,
    warehouse_id: UUID | None = Query(None, description="Filter by warehouse ID"),
) -> DashboardStats:
    """
    Get aggregated dashboard statistics.

    Returns KPIs and chart data including:
    - Stock metrics (total stock kg, products, batches)
    - Occupancy metrics (rate, occupied bins, total bins)
    - Expiry warnings by urgency level
    - Today's movement counts
    - Warehouse occupancy chart data
    - 7-day movement history chart data

    **Permissions**: viewer+
    """
    return await get_dashboard_stats(db, warehouse_id)
