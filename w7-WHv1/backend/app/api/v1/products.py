"""Product management API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireManager, RequireViewer
from app.core.i18n import HU_MESSAGES
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)
from app.services.product import (
    calculate_pages,
    create_product,
    delete_product,
    get_product_by_id,
    get_product_by_sku,
    get_products,
    update_product,
)

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=ProductListResponse)
async def list_products(
    db: DbSession,
    _current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    is_active: bool | None = None,
    category: str | None = None,
    search: str | None = None,
) -> ProductListResponse:
    """
    List all products with pagination and optional filtering.
    """
    products, total = await get_products(
        db,
        page=page,
        page_size=page_size,
        is_active=is_active,
        category=category,
        search=search,
    )
    pages = calculate_pages(total, page_size)

    return ProductListResponse(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_new_product(
    product_data: ProductCreate,
    db: DbSession,
    _current_user: RequireManager,
) -> ProductResponse:
    """
    Create a new product (manager+ only).
    """
    # Check SKU uniqueness if provided
    if product_data.sku:
        existing = await get_product_by_sku(db, product_data.sku)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=HU_MESSAGES["product_sku_exists"],
            )

    product = await create_product(db, product_data)
    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> ProductResponse:
    """
    Get product by ID.
    """
    product = await get_product_by_id(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["product_not_found"],
        )
    return ProductResponse.model_validate(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_existing_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: DbSession,
    _current_user: RequireManager,
) -> ProductResponse:
    """
    Update product by ID (manager+ only).
    """
    product = await get_product_by_id(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["product_not_found"],
        )

    # Check SKU uniqueness if updating
    if product_data.sku and product_data.sku != product.sku:
        existing = await get_product_by_sku(db, product_data.sku)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=HU_MESSAGES["product_sku_exists"],
            )

    updated_product = await update_product(db, product, product_data)
    return ProductResponse.model_validate(updated_product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_product(
    product_id: UUID,
    db: DbSession,
    _current_user: RequireManager,
) -> None:
    """
    Delete product by ID (manager+ only).

    Product must not have inventory to be deleted.
    """
    product = await get_product_by_id(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["product_not_found"],
        )

    # Note: In Phase 3, we'll check for bin_contents references
    # For now, allow deletion
    await delete_product(db, product)
