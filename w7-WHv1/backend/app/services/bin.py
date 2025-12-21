"""Bin service for CRUD operations and bulk generation."""

import math
import uuid
from itertools import product as cartesian_product
from typing import Any
from uuid import UUID

from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.bin import Bin
from app.schemas.bin import BinCreate, BinUpdate
from app.services.warehouse import get_warehouse_by_id


def expand_range(spec: Any) -> list[str]:
    """
    Expand a range specification to list of values.

    Args:
        spec: Either a list of values or a dict with start/end keys.

    Returns:
        list[str]: List of string values.

    Raises:
        ValueError: If specification format is invalid.
    """
    if isinstance(spec, list):
        return [str(v) for v in spec]
    if isinstance(spec, dict) and "start" in spec and "end" in spec:
        return [str(i) for i in range(spec["start"], spec["end"] + 1)]
    raise ValueError("Invalid range specification")


def generate_bin_codes(
    template: dict,
    ranges: dict[str, Any],
) -> list[tuple[str, dict]]:
    """
    Generate bin codes and structure_data from ranges.

    Args:
        template: Warehouse bin_structure_template.
        ranges: Range specifications for each field.

    Returns:
        list[tuple[str, dict]]: List of (code, structure_data) tuples.

    Raises:
        ValueError: If field missing from ranges.
    """
    fields = template["fields"]
    code_format = template["code_format"]
    auto_uppercase = template.get("auto_uppercase", True)
    zero_padding = template.get("zero_padding", True)

    # Get ordered field names
    sorted_fields = sorted(fields, key=lambda f: f["order"])
    field_names = [f["name"] for f in sorted_fields]

    # Expand ranges for each field
    field_values = []
    for name in field_names:
        if name not in ranges:
            raise ValueError(f"Missing range for field: {name}")
        field_values.append(expand_range(ranges[name]))

    # Generate cartesian product
    results = []
    for combo in cartesian_product(*field_values):
        structure_data = dict(zip(field_names, combo, strict=True))

        # Apply formatting
        formatted = {}
        for name, value in structure_data.items():
            if auto_uppercase and isinstance(value, str) and value.isalpha():
                value = value.upper()
            if zero_padding and value.isdigit():
                value = value.zfill(2)
            formatted[name] = value

        # Generate code from format string
        code = code_format.format(**formatted)
        results.append((code, formatted))

    return results


async def create_bin(
    db: AsyncSession,
    bin_data: BinCreate,
) -> Bin:
    """
    Create a new bin.

    Args:
        db: Async database session.
        bin_data: Bin creation data.

    Returns:
        Bin: Created bin object.
    """
    bin_obj = Bin(
        warehouse_id=bin_data.warehouse_id,
        code=bin_data.code,
        structure_data=bin_data.structure_data,
        status=bin_data.status,
        max_weight=bin_data.max_weight,
        max_height=bin_data.max_height,
        accessibility=bin_data.accessibility,
        notes=bin_data.notes,
        is_active=bin_data.is_active,
    )
    db.add(bin_obj)
    await db.flush()
    await db.refresh(bin_obj)
    return bin_obj


async def get_bin_by_id(
    db: AsyncSession,
    bin_id: UUID,
) -> Bin | None:
    """
    Get bin by ID.

    Args:
        db: Async database session.
        bin_id: Bin UUID.

    Returns:
        Bin | None: Bin object if found, None otherwise.
    """
    result = await db.execute(select(Bin).where(Bin.id == bin_id))
    return result.scalar_one_or_none()


async def get_bin_by_code(
    db: AsyncSession,
    code: str,
) -> Bin | None:
    """
    Get bin by code.

    Args:
        db: Async database session.
        code: Bin code.

    Returns:
        Bin | None: Bin object if found, None otherwise.
    """
    result = await db.execute(select(Bin).where(Bin.code == code))
    return result.scalar_one_or_none()


async def get_bins(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    warehouse_id: UUID | None = None,
    status: str | None = None,
    search: str | None = None,
) -> tuple[list[Bin], int]:
    """
    Get paginated list of bins.

    Args:
        db: Async database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.
        warehouse_id: Filter by warehouse.
        status: Filter by status.
        search: Search term for code.

    Returns:
        tuple: List of bins and total count.
    """
    query = select(Bin)

    if warehouse_id:
        query = query.where(Bin.warehouse_id == warehouse_id)
    if status:
        query = query.where(Bin.status == status)
    if search:
        search_term = f"%{search}%"
        query = query.where(Bin.code.ilike(search_term))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Get paginated bins
    offset = (page - 1) * page_size
    result = await db.execute(query.order_by(Bin.created_at.desc()).offset(offset).limit(page_size))
    bins = list(result.scalars().all())

    return bins, total


async def update_bin(
    db: AsyncSession,
    bin_obj: Bin,
    bin_data: BinUpdate,
) -> Bin:
    """
    Update bin data.

    Args:
        db: Async database session.
        bin_obj: Bin object to update.
        bin_data: Update data.

    Returns:
        Bin: Updated bin object.
    """
    update_dict = bin_data.model_dump(exclude_unset=True)

    for field, value in update_dict.items():
        setattr(bin_obj, field, value)

    await db.flush()
    await db.refresh(bin_obj)
    return bin_obj


async def delete_bin(db: AsyncSession, bin_obj: Bin) -> None:
    """
    Delete a bin.

    Args:
        db: Async database session.
        bin_obj: Bin object to delete.
    """
    await db.delete(bin_obj)
    await db.flush()


async def preview_bulk_bins(
    db: AsyncSession,
    warehouse_id: UUID,
    ranges: dict[str, Any],
) -> dict:
    """
    Preview bulk bin generation - check conflicts without creating.

    Args:
        db: Async database session.
        warehouse_id: Warehouse UUID.
        ranges: Range specifications for each field.

    Returns:
        dict: Preview with count, sample codes, conflicts, and validity.

    Raises:
        ValueError: If warehouse not found.
    """
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise ValueError("Warehouse not found")

    codes_and_data = generate_bin_codes(warehouse.bin_structure_template, ranges)
    codes = [c[0] for c in codes_and_data]

    # Check for existing codes
    if codes:
        existing = await db.execute(select(Bin.code).where(Bin.code.in_(codes)))
        conflicts = [row[0] for row in existing.fetchall()]
    else:
        conflicts = []

    return {
        "count": len(codes),
        "sample_codes": codes[:20],
        "conflicts": conflicts,
        "valid": len(conflicts) == 0,
    }


async def create_bulk_bins(
    db: AsyncSession,
    warehouse_id: UUID,
    ranges: dict[str, Any],
    defaults: dict | None = None,
) -> int:
    """
    Create bins in bulk.

    Args:
        db: Async database session.
        warehouse_id: Warehouse UUID.
        ranges: Range specifications for each field.
        defaults: Default values for bins.

    Returns:
        int: Count of created bins.

    Raises:
        ValueError: If warehouse not found or conflicts exist.
    """
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise ValueError("Warehouse not found")

    codes_and_data = generate_bin_codes(warehouse.bin_structure_template, ranges)

    # Check conflicts first
    codes = [c[0] for c in codes_and_data]
    if codes:
        existing = await db.execute(select(Bin.code).where(Bin.code.in_(codes)))
        conflicts = {row[0] for row in existing.fetchall()}

        if conflicts:
            conflict_list = ", ".join(list(conflicts)[:5])
            raise ValueError(f"Conflicting codes: {conflict_list}")
    else:
        raise ValueError("No bins to create")

    # Prepare bulk insert data
    defaults = defaults or {}
    bins_data = []
    for code, structure_data in codes_and_data:
        bins_data.append(
            {
                "id": uuid.uuid4(),
                "warehouse_id": warehouse_id,
                "code": code,
                "structure_data": structure_data,
                "status": "empty",
                "max_weight": defaults.get("max_weight"),
                "max_height": defaults.get("max_height"),
                "accessibility": defaults.get("accessibility"),
                "is_active": True,
            }
        )

    # Bulk insert using SQLAlchemy 2.0 pattern
    await db.execute(insert(Bin), bins_data)
    await db.flush()

    return len(bins_data)


def calculate_pages(total: int, page_size: int) -> int:
    """
    Calculate total number of pages.

    Args:
        total: Total number of items.
        page_size: Items per page.

    Returns:
        int: Total number of pages.
    """
    if page_size <= 0:
        return 1
    return math.ceil(total / page_size) if total > 0 else 1
