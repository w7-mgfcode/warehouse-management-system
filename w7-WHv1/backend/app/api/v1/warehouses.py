"""Warehouse management API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireAdmin, RequireManager, RequireViewer
from app.core.i18n import HU_MESSAGES
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseListResponse,
    WarehouseResponse,
    WarehouseStats,
    WarehouseUpdate,
)
from app.services.warehouse import (
    calculate_pages,
    create_warehouse,
    delete_warehouse,
    get_warehouse_by_id,
    get_warehouse_by_name,
    get_warehouse_stats,
    get_warehouses,
    has_bins,
    update_warehouse,
)

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=WarehouseListResponse)
async def list_warehouses(
    db: DbSession,
    _current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
) -> WarehouseListResponse:
    """
    List all warehouses with pagination and optional filtering.
    """
    warehouses, total = await get_warehouses(
        db, page=page, page_size=page_size, is_active=is_active
    )
    pages = calculate_pages(total, page_size)

    return WarehouseListResponse(
        items=[WarehouseResponse.model_validate(w) for w in warehouses],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_warehouse(
    warehouse_data: WarehouseCreate,
    db: DbSession,
    _current_user: RequireManager,
) -> WarehouseResponse:
    """
    Create a new warehouse (admin/manager only).
    """
    # Check name uniqueness
    existing = await get_warehouse_by_name(db, warehouse_data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=HU_MESSAGES["warehouse_name_exists"],
        )

    warehouse = await create_warehouse(db, warehouse_data)
    return WarehouseResponse.model_validate(warehouse)


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> WarehouseResponse:
    """
    Get warehouse by ID.
    """
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["warehouse_not_found"],
        )
    return WarehouseResponse.model_validate(warehouse)


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
async def update_existing_warehouse(
    warehouse_id: UUID,
    warehouse_data: WarehouseUpdate,
    db: DbSession,
    _current_user: RequireManager,
) -> WarehouseResponse:
    """
    Update warehouse by ID (admin/manager only).
    """
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["warehouse_not_found"],
        )

    # Check name uniqueness if updating
    if warehouse_data.name and warehouse_data.name != warehouse.name:
        existing = await get_warehouse_by_name(db, warehouse_data.name)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=HU_MESSAGES["warehouse_name_exists"],
            )

    updated_warehouse = await update_warehouse(db, warehouse, warehouse_data)
    return WarehouseResponse.model_validate(updated_warehouse)


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_warehouse(
    warehouse_id: UUID,
    db: DbSession,
    _current_user: RequireAdmin,
) -> None:
    """
    Delete warehouse by ID (admin only).

    Warehouse must have no bins to be deleted.
    """
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["warehouse_not_found"],
        )

    # Check if warehouse has bins
    if await has_bins(db, warehouse_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=HU_MESSAGES["warehouse_has_bins"],
        )

    await delete_warehouse(db, warehouse)


@router.get("/{warehouse_id}/stats", response_model=WarehouseStats)
async def get_warehouse_statistics(
    warehouse_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> WarehouseStats:
    """
    Get warehouse statistics (bin counts by status).
    """
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if warehouse is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["warehouse_not_found"],
        )

    return await get_warehouse_stats(db, warehouse_id)
