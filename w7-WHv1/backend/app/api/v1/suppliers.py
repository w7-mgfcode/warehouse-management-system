"""Supplier management API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireManager, RequireViewer
from app.core.i18n import HU_MESSAGES
from app.schemas.supplier import (
    SupplierCreate,
    SupplierListResponse,
    SupplierResponse,
    SupplierUpdate,
)
from app.services.supplier import (
    calculate_pages,
    create_supplier,
    delete_supplier,
    get_supplier_by_id,
    get_suppliers,
    update_supplier,
)

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=SupplierListResponse)
async def list_suppliers(
    db: DbSession,
    _current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    search: str | None = None,
) -> SupplierListResponse:
    """
    List all suppliers with pagination and optional filtering.
    """
    suppliers, total = await get_suppliers(
        db,
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
    )
    pages = calculate_pages(total, page_size)

    return SupplierListResponse(
        items=[SupplierResponse.model_validate(s) for s in suppliers],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_new_supplier(
    supplier_data: SupplierCreate,
    db: DbSession,
    _current_user: RequireManager,
) -> SupplierResponse:
    """
    Create a new supplier (manager+ only).
    """
    supplier = await create_supplier(db, supplier_data)
    return SupplierResponse.model_validate(supplier)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> SupplierResponse:
    """
    Get supplier by ID.
    """
    supplier = await get_supplier_by_id(db, supplier_id)
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["supplier_not_found"],
        )
    return SupplierResponse.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_existing_supplier(
    supplier_id: UUID,
    supplier_data: SupplierUpdate,
    db: DbSession,
    _current_user: RequireManager,
) -> SupplierResponse:
    """
    Update supplier by ID (manager+ only).
    """
    supplier = await get_supplier_by_id(db, supplier_id)
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["supplier_not_found"],
        )

    updated_supplier = await update_supplier(db, supplier, supplier_data)
    return SupplierResponse.model_validate(updated_supplier)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_supplier(
    supplier_id: UUID,
    db: DbSession,
    _current_user: RequireManager,
) -> None:
    """
    Delete supplier by ID (manager+ only).

    Supplier must not have inventory to be deleted.
    """
    supplier = await get_supplier_by_id(db, supplier_id)
    if supplier is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["supplier_not_found"],
        )

    # Note: In Phase 3, we'll check for bin_contents references
    # For now, allow deletion
    await delete_supplier(db, supplier)
