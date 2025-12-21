"""Supplier schemas for CRUD operations."""

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.i18n import HU_MESSAGES

# Hungarian tax number pattern: 8 digits-1 digit-2 digits (e.g., 12345678-2-42)
TAX_NUMBER_PATTERN = re.compile(r"^\d{8}-\d-\d{2}$")


class SupplierCreate(BaseModel):
    """Schema for creating a new supplier."""

    company_name: str = Field(..., max_length=255)
    contact_person: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    tax_number: str | None = Field(None, max_length=50)
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v: str) -> str:
        """Validate company name."""
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["supplier_name_required"])
        return v.strip()

    @field_validator("tax_number")
    @classmethod
    def validate_tax_number(cls, v: str | None) -> str | None:
        """Validate Hungarian tax number format."""
        if v is None or v == "":
            return None
        if not TAX_NUMBER_PATTERN.match(v):
            raise ValueError(HU_MESSAGES["invalid_tax_number"])
        return v


class SupplierUpdate(BaseModel):
    """Schema for updating a supplier."""

    company_name: str | None = Field(None, max_length=255)
    contact_person: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    tax_number: str | None = Field(None, max_length=50)
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v: str | None) -> str | None:
        """Validate company name when provided."""
        if v is None:
            return None
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["supplier_name_required"])
        return v.strip()

    @field_validator("tax_number")
    @classmethod
    def validate_tax_number(cls, v: str | None) -> str | None:
        """Validate Hungarian tax number format."""
        if v is None or v == "":
            return None
        if not TAX_NUMBER_PATTERN.match(v):
            raise ValueError(HU_MESSAGES["invalid_tax_number"])
        return v


class SupplierResponse(BaseModel):
    """Schema for supplier response."""

    id: UUID
    company_name: str
    contact_person: str | None
    email: str | None
    phone: str | None
    address: str | None
    tax_number: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierListResponse(BaseModel):
    """Schema for paginated supplier list response."""

    items: list[SupplierResponse]
    total: int
    page: int
    page_size: int
    pages: int
