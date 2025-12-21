"""Movement schemas for inventory transaction history."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

MovementType = Literal["receipt", "issue", "adjustment", "transfer", "scrap"]


class MovementResponse(BaseModel):
    """Response schema for a single movement record."""

    id: UUID
    movement_type: MovementType
    bin_code: str
    product_name: str
    sku: str | None
    batch_number: str
    quantity: Decimal
    unit: str
    quantity_before: Decimal
    quantity_after: Decimal
    use_by_date: date
    reason: str
    reference_number: str | None
    fefo_compliant: bool | None
    force_override: bool
    override_reason: str | None
    notes: str | None
    created_by: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MovementListResponse(BaseModel):
    """Paginated list of movement records."""

    items: list[MovementResponse]
    total: int
    page: int
    page_size: int
    pages: int


class MovementFilter(BaseModel):
    """Query parameters for filtering movements."""

    product_id: UUID | None = None
    bin_id: UUID | None = None
    movement_type: MovementType | None = None
    start_date: date | None = None
    end_date: date | None = None
    created_by: UUID | None = None
    page: int = 1
    page_size: int = 50

    model_config = ConfigDict(str_strip_whitespace=True)
