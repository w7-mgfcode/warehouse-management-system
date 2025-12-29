"""Bin schemas for CRUD and bulk generation."""

from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal, Union
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.i18n import HU_MESSAGES

BinStatus = Literal["empty", "occupied", "reserved", "inactive"]
ExpiryUrgency = Literal["expired", "critical", "high", "medium", "low"]


class BinCreate(BaseModel):
    """Schema for creating a new bin."""

    warehouse_id: UUID
    code: str = Field(..., min_length=1, max_length=100)
    structure_data: dict[str, Any]
    status: BinStatus = "empty"
    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)
    notes: str | None = None
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)


class BinUpdate(BaseModel):
    """Schema for updating a bin."""

    code: str | None = Field(None, min_length=1, max_length=100)
    structure_data: dict[str, Any] | None = None
    status: BinStatus | None = None
    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)
    notes: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class BinResponse(BaseModel):
    """Schema for bin response."""

    id: UUID
    warehouse_id: UUID
    code: str
    structure_data: dict[str, Any]
    status: BinStatus
    max_weight: float | None
    max_height: float | None
    accessibility: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BinListResponse(BaseModel):
    """Schema for paginated bin list response."""

    items: list[Union[BinResponse, "BinResponseWithContent"]]
    total: int
    page: int
    page_size: int
    pages: int


# Bulk generation schemas
class RangeSpec(BaseModel):
    """Range specification for numeric ranges."""

    start: int
    end: int

    @model_validator(mode="after")
    def validate_range(self) -> "RangeSpec":
        """Validate that start <= end."""
        if self.start > self.end:
            raise ValueError(HU_MESSAGES["bulk_invalid_range"])
        return self


class BulkBinDefaults(BaseModel):
    """Default values for bulk-created bins."""

    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)


class BulkBinCreate(BaseModel):
    """Request body for bulk bin creation."""

    warehouse_id: UUID
    ranges: dict[str, list[str | int] | RangeSpec]  # field_name -> list or {start, end}
    defaults: BulkBinDefaults | None = None


class BulkBinPreviewResponse(BaseModel):
    """Response for bulk generation preview."""

    count: int
    sample_codes: list[str]  # First 20 codes
    conflicts: list[str]  # Existing codes that would conflict
    valid: bool  # True if no conflicts


# Warehouse Map schemas
class BinContentSummary(BaseModel):
    """Summary of bin content for warehouse map visualization."""

    id: UUID
    product_id: UUID
    product_name: str
    product_sku: str | None
    supplier_id: UUID | None
    supplier_name: str | None
    batch_number: str
    use_by_date: date
    quantity: Decimal
    unit: str
    status: str
    days_until_expiry: int | None = None
    urgency: ExpiryUrgency | None = None

    model_config = ConfigDict(from_attributes=True)


class BinResponseWithContent(BinResponse):
    """Bin response with optional content details for warehouse map."""

    contents: list[BinContentSummary] | None = None
