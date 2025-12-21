"""Product schemas for CRUD operations."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.i18n import HU_MESSAGES


class ProductCreate(BaseModel):
    """Schema for creating a new product."""

    name: str = Field(..., min_length=2, max_length=255)
    sku: str | None = Field(None, min_length=3, max_length=100)
    category: str | None = Field(None, max_length=100)
    default_unit: str = Field(default="db", max_length=50)
    description: str | None = None
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate product name."""
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["product_name_required"])
        return v.strip()


class ProductUpdate(BaseModel):
    """Schema for updating a product."""

    name: str | None = Field(None, min_length=2, max_length=255)
    sku: str | None = Field(None, min_length=3, max_length=100)
    category: str | None = Field(None, max_length=100)
    default_unit: str | None = Field(None, max_length=50)
    description: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ProductResponse(BaseModel):
    """Schema for product response."""

    id: UUID
    name: str
    sku: str | None
    category: str | None
    default_unit: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductListResponse(BaseModel):
    """Schema for paginated product list response."""

    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
    pages: int
