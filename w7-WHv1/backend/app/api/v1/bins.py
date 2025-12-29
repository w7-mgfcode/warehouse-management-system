"""Bin management API endpoints."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireManager, RequireViewer, RequireWarehouse
from app.core.i18n import HU_MESSAGES
from app.schemas.bin import (
    BinCreate,
    BinListResponse,
    BinResponse,
    BinUpdate,
    BulkBinCreate,
    BulkBinPreviewResponse,
)
from app.services.bin import (
    calculate_pages,
    create_bin,
    create_bulk_bins,
    delete_bin,
    get_bin_by_code,
    get_bin_by_id,
    get_bin_capacity,
    get_bins,
    preview_bulk_bins,
    update_bin,
)

router = APIRouter(prefix="/bins", tags=["bins"])


@router.get("", response_model=BinListResponse)
async def list_bins(
    db: DbSession,
    _current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    warehouse_id: UUID | None = None,
    status: str | None = None,
    search: str | None = None,
) -> BinListResponse:
    """
    List all bins with pagination and optional filtering.
    """
    bins, total = await get_bins(
        db,
        page=page,
        page_size=page_size,
        warehouse_id=warehouse_id,
        status=status,
        search=search,
    )
    pages = calculate_pages(total, page_size)

    return BinListResponse(
        items=[BinResponse.model_validate(b) for b in bins],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=BinResponse, status_code=status.HTTP_201_CREATED)
async def create_new_bin(
    bin_data: BinCreate,
    db: DbSession,
    _current_user: RequireWarehouse,
) -> BinResponse:
    """
    Create a new bin (warehouse+ only).
    """
    # Check code uniqueness
    existing = await get_bin_by_code(db, bin_data.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=HU_MESSAGES["bin_code_exists"],
        )

    bin_obj = await create_bin(db, bin_data)
    return BinResponse.model_validate(bin_obj)


@router.post("/bulk/preview", response_model=BulkBinPreviewResponse)
async def preview_bulk_bin_generation(
    bulk_data: BulkBinCreate,
    db: DbSession,
    _current_user: RequireManager,
) -> BulkBinPreviewResponse:
    """
    Preview bulk bin generation (manager+ only).

    Returns count, sample codes, and any conflicts.
    """
    try:
        preview = await preview_bulk_bins(
            db,
            bulk_data.warehouse_id,
            bulk_data.ranges,
        )
        return BulkBinPreviewResponse(**preview)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def bulk_create_bins(
    bulk_data: BulkBinCreate,
    db: DbSession,
    _current_user: RequireManager,
) -> dict[str, Any]:
    """
    Bulk create bins (manager+ only).

    Creates bins based on range specifications.
    """
    try:
        defaults_dict = bulk_data.defaults.model_dump() if bulk_data.defaults else None
        count = await create_bulk_bins(
            db,
            bulk_data.warehouse_id,
            bulk_data.ranges,
            defaults_dict,
        )
        return {"created": count, "message": f"{count} tárolóhely létrehozva"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get("/{bin_id}", response_model=BinResponse)
async def get_bin(
    bin_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> BinResponse:
    """
    Get bin by ID.
    """
    bin_obj = await get_bin_by_id(db, bin_id)
    if bin_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["bin_not_found"],
        )
    return BinResponse.model_validate(bin_obj)


@router.get("/{bin_id}/capacity")
async def get_capacity(
    bin_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> dict:
    """
    Get bin capacity information (all users).

    Returns max weight/height limits and current usage.
    """
    bin_obj = await get_bin_by_id(db, bin_id)
    if bin_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["bin_not_found"],
        )

    capacity = await get_bin_capacity(db, bin_obj)
    return capacity


@router.put("/{bin_id}", response_model=BinResponse)
async def update_existing_bin(
    bin_id: UUID,
    bin_data: BinUpdate,
    db: DbSession,
    _current_user: RequireWarehouse,
) -> BinResponse:
    """
    Update bin by ID (warehouse+ only).
    """
    bin_obj = await get_bin_by_id(db, bin_id)
    if bin_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["bin_not_found"],
        )

    # Check code uniqueness if updating
    if bin_data.code and bin_data.code != bin_obj.code:
        existing = await get_bin_by_code(db, bin_data.code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=HU_MESSAGES["bin_code_exists"],
            )

    updated_bin = await update_bin(db, bin_obj, bin_data)
    return BinResponse.model_validate(updated_bin)


@router.delete("/{bin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_bin(
    bin_id: UUID,
    db: DbSession,
    _current_user: RequireWarehouse,
) -> None:
    """
    Delete bin by ID (warehouse+ only).

    Bin must be empty to be deleted.
    """
    bin_obj = await get_bin_by_id(db, bin_id)
    if bin_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["bin_not_found"],
        )

    # Check if bin is empty
    if bin_obj.status != "empty":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=HU_MESSAGES["bin_not_empty"],
        )

    await delete_bin(db, bin_obj)
