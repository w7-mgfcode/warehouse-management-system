"""Warehouse service for CRUD operations."""
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.bin import Bin
from app.db.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseStats, WarehouseUpdate
from app.services.pagination import calculate_pages as _calculate_pages


async def create_warehouse(
    db: AsyncSession,
    warehouse_data: WarehouseCreate,
) -> Warehouse:
    """
    Create a new warehouse.

    Args:
        db: Async database session.
        warehouse_data: Warehouse creation data.

    Returns:
        Warehouse: Created warehouse object.
    """
    warehouse = Warehouse(
        name=warehouse_data.name,
        location=warehouse_data.location,
        description=warehouse_data.description,
        bin_structure_template=warehouse_data.bin_structure_template.model_dump(),
        is_active=warehouse_data.is_active,
    )
    db.add(warehouse)
    await db.flush()
    await db.refresh(warehouse)
    return warehouse


async def get_warehouse_by_id(
    db: AsyncSession,
    warehouse_id: UUID,
) -> Warehouse | None:
    """
    Get warehouse by ID.

    Args:
        db: Async database session.
        warehouse_id: Warehouse UUID.

    Returns:
        Warehouse | None: Warehouse object if found, None otherwise.
    """
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    return result.scalar_one_or_none()


async def get_warehouse_by_name(
    db: AsyncSession,
    name: str,
) -> Warehouse | None:
    """
    Get warehouse by name.

    Args:
        db: Async database session.
        name: Warehouse name.

    Returns:
        Warehouse | None: Warehouse object if found, None otherwise.
    """
    result = await db.execute(select(Warehouse).where(Warehouse.name == name))
    return result.scalar_one_or_none()


async def get_warehouses(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    is_active: bool | None = None,
) -> tuple[list[Warehouse], int]:
    """
    Get paginated list of warehouses.

    Args:
        db: Async database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        is_active: Filter by active status.

    Returns:
        tuple: List of warehouses and total count.
    """
    query = select(Warehouse)

    if is_active is not None:
        query = query.where(Warehouse.is_active == is_active)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated warehouses
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Warehouse.created_at.desc()).offset(offset).limit(page_size)
    )
    warehouses = list(result.scalars().all())

    return warehouses, total


async def update_warehouse(
    db: AsyncSession,
    warehouse: Warehouse,
    warehouse_data: WarehouseUpdate,
) -> Warehouse:
    """
    Update warehouse data.

    Args:
        db: Async database session.
        warehouse: Warehouse object to update.
        warehouse_data: Update data.

    Returns:
        Warehouse: Updated warehouse object.
    """
    update_dict = warehouse_data.model_dump(exclude_unset=True)

    if "bin_structure_template" in update_dict and update_dict["bin_structure_template"]:
        update_dict["bin_structure_template"] = warehouse_data.bin_structure_template.model_dump()

    for field, value in update_dict.items():
        setattr(warehouse, field, value)

    await db.flush()
    await db.refresh(warehouse)
    return warehouse


async def delete_warehouse(db: AsyncSession, warehouse: Warehouse) -> None:
    """
    Delete a warehouse.

    Args:
        db: Async database session.
        warehouse: Warehouse object to delete.
    """
    await db.delete(warehouse)
    await db.flush()


async def get_warehouse_stats(
    db: AsyncSession,
    warehouse_id: UUID,
) -> WarehouseStats:
    """
    Get warehouse statistics.

    Args:
        db: Async database session.
        warehouse_id: Warehouse UUID.

    Returns:
        WarehouseStats: Statistics about bins in the warehouse.
    """
    # Count bins by status
    result = await db.execute(
        select(Bin.status, func.count(Bin.id))
        .where(Bin.warehouse_id == warehouse_id)
        .group_by(Bin.status)
    )
    status_counts = dict(result.all())

    total = sum(status_counts.values())
    occupied = status_counts.get("occupied", 0)
    empty = status_counts.get("empty", 0)
    reserved = status_counts.get("reserved", 0)
    inactive = status_counts.get("inactive", 0)

    utilization = (occupied / total * 100) if total > 0 else 0.0

    return WarehouseStats(
        total_bins=total,
        occupied_bins=occupied,
        empty_bins=empty,
        reserved_bins=reserved,
        inactive_bins=inactive,
        utilization_percent=round(utilization, 2),
    )


async def has_bins(db: AsyncSession, warehouse_id: UUID) -> bool:
    """
    Check if warehouse has any bins.

    Args:
        db: Async database session.
        warehouse_id: Warehouse UUID.

    Returns:
        bool: True if warehouse has bins, False otherwise.
    """
    result = await db.execute(
        select(func.count()).select_from(Bin).where(Bin.warehouse_id == warehouse_id)
    )
    count = result.scalar() or 0
    return count > 0


def calculate_pages(total: int, page_size: int) -> int:
    return _calculate_pages(total, page_size)


