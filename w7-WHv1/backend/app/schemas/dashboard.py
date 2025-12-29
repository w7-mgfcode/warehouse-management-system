"""
Dashboard statistics schemas.

Defines response models for dashboard KPIs, charts, and aggregated statistics.
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WarehouseOccupancyData(BaseModel):
    """Single warehouse occupancy data point for chart."""

    warehouse_id: UUID
    warehouse_name: str
    occupied: int
    empty: int
    total: int
    occupancy_rate: float

    model_config = ConfigDict(from_attributes=True)


class MovementHistoryData(BaseModel):
    """Single day movement history data point for chart."""

    date: date
    receipts: int
    issues: int
    total: int

    model_config = ConfigDict(from_attributes=True)


class DashboardStats(BaseModel):
    """
    Aggregated dashboard statistics.

    Includes:
    - Stock metrics (total stock kg, products, batches)
    - Occupancy metrics (rate, occupied bins, total bins)
    - Expiry warnings by urgency level
    - Today's movement counts
    - Chart data (warehouse occupancy, movement history)
    """

    # Stock Metrics
    total_stock_kg: Decimal
    total_products: int
    total_batches: int

    # Occupancy Metrics
    occupancy_rate: float
    occupied_bins: int
    total_bins: int

    # Expiry Warnings (by urgency level)
    expiry_warnings: dict[str, int]

    # Today's Movements
    today_movements: int
    today_receipts: int
    today_issues: int

    # Chart Data
    warehouse_occupancy: list[WarehouseOccupancyData]
    movement_history: list[MovementHistoryData]
    supplier_distribution: list["SupplierDistributionData"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SupplierDistributionData(BaseModel):
    """Product distribution by supplier for pie chart."""

    supplier_id: UUID | None
    supplier_name: str
    product_count: int
    total_quantity_kg: Decimal

    model_config = ConfigDict(from_attributes=True)


class OccupancyHistoryPoint(BaseModel):
    """Single occupancy history data point."""

    date: date
    warehouse_id: UUID | None
    warehouse_name: str | None
    total_bins: int
    occupied_bins: int
    empty_bins: int
    occupancy_rate: float

    model_config = ConfigDict(from_attributes=True)


class OccupancyHistoryResponse(BaseModel):
    """Occupancy history response for trend chart."""

    data: list[OccupancyHistoryPoint]
    start_date: date
    end_date: date

    model_config = ConfigDict(from_attributes=True)
