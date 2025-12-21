"""Product service for CRUD operations."""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.pagination import calculate_pages as _calculate_pages


async def create_product(
    db: AsyncSession,
    product_data: ProductCreate,
) -> Product:
    """
    Create a new product.

    Args:
        db: Async database session.
        product_data: Product creation data.

    Returns:
        Product: Created product object.
    """
    product = Product(
        name=product_data.name,
        sku=product_data.sku,
        category=product_data.category,
        default_unit=product_data.default_unit,
        description=product_data.description,
        is_active=product_data.is_active,
    )
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


async def get_product_by_id(
    db: AsyncSession,
    product_id: UUID,
) -> Product | None:
    """
    Get product by ID.

    Args:
        db: Async database session.
        product_id: Product UUID.

    Returns:
        Product | None: Product object if found, None otherwise.
    """
    result = await db.execute(select(Product).where(Product.id == product_id))
    return result.scalar_one_or_none()


async def get_product_by_sku(
    db: AsyncSession,
    sku: str,
) -> Product | None:
    """
    Get product by SKU.

    Args:
        db: Async database session.
        sku: Product SKU.

    Returns:
        Product | None: Product object if found, None otherwise.
    """
    result = await db.execute(select(Product).where(Product.sku == sku))
    return result.scalar_one_or_none()


async def get_products(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    is_active: bool | None = None,
    category: str | None = None,
    search: str | None = None,
) -> tuple[list[Product], int]:
    """
    Get paginated list of products.

    Args:
        db: Async database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        is_active: Filter by active status.
        category: Filter by category.
        search: Search term for name, SKU, or category.

    Returns:
        tuple: List of products and total count.
    """
    query = select(Product)

    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if category:
        query = query.where(Product.category == category)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.category.ilike(search_term),
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated products
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Product.created_at.desc()).offset(offset).limit(page_size)
    )
    products = list(result.scalars().all())

    return products, total


async def update_product(
    db: AsyncSession,
    product: Product,
    product_data: ProductUpdate,
) -> Product:
    """
    Update product data.

    Args:
        db: Async database session.
        product: Product object to update.
        product_data: Update data.

    Returns:
        Product: Updated product object.
    """
    update_dict = product_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        setattr(product, field, value)

    await db.flush()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, product: Product) -> None:
    """
    Delete a product.

    Args:
        db: Async database session.
        product: Product object to delete.
    """
    await db.delete(product)
    await db.flush()


def calculate_pages(total: int, page_size: int) -> int:
    return _calculate_pages(total, page_size)
