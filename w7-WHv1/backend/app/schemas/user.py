"""User schemas for CRUD operations."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.i18n import HU_MESSAGES

RoleType = Literal["admin", "manager", "warehouse", "viewer"]


class UserBase(BaseModel):
    """Base user schema with common fields."""

    username: str = Field(..., min_length=3, max_length=100)
    email: EmailStr
    full_name: str | None = Field(None, max_length=255)
    role: RoleType = "warehouse"
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError(HU_MESSAGES["password_min_length"])
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        if not (has_upper and has_lower and has_digit):
            raise ValueError(HU_MESSAGES["password_weak"])
        return v


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    username: str | None = Field(None, min_length=3, max_length=100)
    email: EmailStr | None = None
    full_name: str | None = Field(None, max_length=255)
    role: RoleType | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str | None) -> str | None:
        """Validate password strength if provided."""
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError(HU_MESSAGES["password_min_length"])
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        if not (has_upper and has_lower and has_digit):
            raise ValueError(HU_MESSAGES["password_weak"])
        return v


class UserResponse(BaseModel):
    """Schema for user response (without password)."""

    id: UUID
    username: str
    email: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    pages: int
