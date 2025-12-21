"""Bin schemas for CRUD and bulk generation."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

BinStatus = Literal["empty", "occupied", "reserved", "inactive"]


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
    status: str
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

    items: list[BinResponse]
    total: int
    page: int
    page_size: int
    pages: int


# Bulk generation schemas
class RangeSpec(BaseModel):
    """Range specification for numeric ranges."""

    start: int | None = None
    end: int | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "RangeSpec":
        """Validate that start <= end."""
        if self.start is not None and self.end is not None:
            if self.start > self.end:
                raise ValueError("start must be <= end")
        return self


class BulkBinDefaults(BaseModel):
    """Default values for bulk-created bins."""

    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)


class BulkBinCreate(BaseModel):
    """Request body for bulk bin creation."""

    warehouse_id: UUID
    ranges: dict[str, Any]  # field_name -> list or {start, end}
    defaults: BulkBinDefaults | None = None


class BulkBinPreviewResponse(BaseModel):
    """Response for bulk generation preview."""

    count: int
    sample_codes: list[str]  # First 20 codes
    conflicts: list[str]  # Existing codes that would conflict
    valid: bool  # True if no conflicts
