"""Warehouse schemas for CRUD operations."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.i18n import HU_MESSAGES


class BinStructureField(BaseModel):
    """Schema for a single field in bin structure template."""

    name: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=100)  # Hungarian label
    required: bool = True
    order: int = Field(..., ge=1)

    model_config = ConfigDict(str_strip_whitespace=True)


class BinStructureTemplate(BaseModel):
    """Schema for warehouse bin structure template."""

    fields: list[BinStructureField] = Field(..., min_length=1)
    code_format: str = Field(..., pattern=r".*\{.*\}.*")
    separator: str = Field(default="-", max_length=5)
    auto_uppercase: bool = True
    zero_padding: bool = True

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "fields": [
                    {"name": "aisle", "label": "Sor", "required": True, "order": 1},
                    {"name": "rack", "label": "Allvany", "required": False, "order": 2},
                    {"name": "level", "label": "Szint", "required": True, "order": 3},
                    {"name": "position", "label": "Pozicio", "required": True, "order": 4},
                ],
                "code_format": "{aisle}-{rack}-{level}-{position}",
                "separator": "-",
                "auto_uppercase": True,
                "zero_padding": True,
            }
        },
    )

    @field_validator("fields")
    @classmethod
    def validate_fields(cls, v: list[BinStructureField]) -> list[BinStructureField]:
        """Validate that field orders are unique."""
        orders = [f.order for f in v]
        if len(orders) != len(set(orders)):
            raise ValueError(HU_MESSAGES["bin_template_invalid"])
        return v


class WarehouseCreate(BaseModel):
    """Schema for creating a new warehouse."""

    name: str = Field(..., min_length=2, max_length=255)
    location: str | None = Field(None, max_length=255)
    description: str | None = None
    bin_structure_template: BinStructureTemplate
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate warehouse name."""
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["name_min_length"])
        return v.strip()


class WarehouseUpdate(BaseModel):
    """Schema for updating a warehouse."""

    name: str | None = Field(None, min_length=2, max_length=255)
    location: str | None = Field(None, max_length=255)
    description: str | None = None
    bin_structure_template: BinStructureTemplate | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class WarehouseResponse(BaseModel):
    """Schema for warehouse response."""

    id: UUID
    name: str
    location: str | None
    description: str | None
    bin_structure_template: dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WarehouseStats(BaseModel):
    """Schema for warehouse statistics."""

    total_bins: int
    occupied_bins: int
    empty_bins: int
    reserved_bins: int
    inactive_bins: int
    utilization_percent: float


class WarehouseListResponse(BaseModel):
    """Schema for paginated warehouse list response."""

    items: list[WarehouseResponse]
    total: int
    page: int
    page_size: int
    pages: int
