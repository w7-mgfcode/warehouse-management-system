"""Expiry warning schemas for inventory management."""

from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

UrgencyLevel = Literal["critical", "high", "medium", "low"]


class ExpiryWarning(BaseModel):
    """Warning for a product approaching expiration."""

    bin_content_id: UUID
    bin_code: str
    warehouse_name: str
    product_name: str
    sku: str | None
    batch_number: str
    quantity: Decimal
    unit: str
    use_by_date: date
    days_until_expiry: int
    urgency: UrgencyLevel
    warning_message: str

    model_config = ConfigDict(from_attributes=True)


class ExpiryWarningSummary(BaseModel):
    """Summary counts by urgency level."""

    critical: int  # < 7 days
    high: int  # 7-14 days
    medium: int  # 15-30 days
    low: int  # 31-60 days
    total: int


class ExpiryWarningResponse(BaseModel):
    """Response with expiry warnings and summary."""

    items: list[ExpiryWarning]
    summary: ExpiryWarningSummary
    warehouse_id: UUID | None = None


class ExpiredProduct(BaseModel):
    """Product that has already expired."""

    bin_content_id: UUID
    bin_code: str
    warehouse_name: str
    product_name: str
    sku: str | None
    batch_number: str
    quantity: Decimal
    unit: str
    use_by_date: date
    days_since_expiry: int
    status: str
    action_required: str

    model_config = ConfigDict(from_attributes=True)


class ExpiredProductResponse(BaseModel):
    """Response with expired products."""

    items: list[ExpiredProduct]
    total: int
    warehouse_id: UUID | None = None
