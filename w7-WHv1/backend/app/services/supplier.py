"""Supplier service for CRUD operations."""

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate
from app.services.pagination import calculate_pages as _calculate_pages


async def create_supplier(
    db: AsyncSession,
    supplier_data: SupplierCreate,
) -> Supplier:
    """
    Create a new supplier.

    Args:
        db: Async database session.
        supplier_data: Supplier creation data.

    Returns:
        Supplier: Created supplier object.
    """
    supplier = Supplier(
        company_name=supplier_data.company_name,
        contact_person=supplier_data.contact_person,
        email=supplier_data.email,
        phone=supplier_data.phone,
        address=supplier_data.address,
        tax_number=supplier_data.tax_number,
        is_active=supplier_data.is_active,
    )
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return supplier


async def get_supplier_by_id(
    db: AsyncSession,
    supplier_id: UUID,
) -> Supplier | None:
    """
    Get supplier by ID.

    Args:
        db: Async database session.
        supplier_id: Supplier UUID.

    Returns:
        Supplier | None: Supplier object if found, None otherwise.
    """
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    return result.scalar_one_or_none()


async def get_suppliers(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    is_active: bool | None = None,
    search: str | None = None,
) -> tuple[list[Supplier], int]:
    """
    Get paginated list of suppliers.

    Args:
        db: Async database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        is_active: Filter by active status.
        search: Search term for company name, contact person, or email.

    Returns:
        tuple: List of suppliers and total count.
    """
    query = select(Supplier)

    if is_active is not None:
        query = query.where(Supplier.is_active == is_active)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Supplier.company_name.ilike(search_term),
                Supplier.contact_person.ilike(search_term),
                Supplier.email.ilike(search_term),
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated suppliers
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(Supplier.created_at.desc()).offset(offset).limit(page_size)
    )
    suppliers = list(result.scalars().all())

    return suppliers, total


async def update_supplier(
    db: AsyncSession,
    supplier: Supplier,
    supplier_data: SupplierUpdate,
) -> Supplier:
    """
    Update supplier data.

    Args:
        db: Async database session.
        supplier: Supplier object to update.
        supplier_data: Update data.

    Returns:
        Supplier: Updated supplier object.
    """
    update_dict = supplier_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        setattr(supplier, field, value)

    await db.flush()
    await db.refresh(supplier)
    return supplier


async def delete_supplier(db: AsyncSession, supplier: Supplier) -> None:
    """
    Delete a supplier.

    Args:
        db: Async database session.
        supplier: Supplier object to delete.
    """
    await db.delete(supplier)
    await db.flush()


def calculate_pages(total: int, page_size: int) -> int:
    return _calculate_pages(total, page_size)

