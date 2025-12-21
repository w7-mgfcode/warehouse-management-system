"""Reservation schemas for stock reservations with FEFO integration."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReservationCreate(BaseModel):
    """Request schema for creating a stock reservation."""

    product_id: UUID
    quantity: Decimal = Field(..., gt=0)
    order_reference: str = Field(..., min_length=1, max_length=100)
    customer_name: str | None = Field(None, max_length=255)
    reserved_until: datetime
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ReservationItemResponse(BaseModel):
    """Individual item within a reservation."""

    id: UUID
    bin_content_id: UUID
    bin_code: str
    batch_number: str
    use_by_date: date
    quantity_reserved: Decimal
    days_until_expiry: int

    model_config = ConfigDict(from_attributes=True)


class ReservationResponse(BaseModel):
    """Response schema for reservation creation/details."""

    reservation_id: UUID
    product_id: UUID
    product_name: str
    sku: str | None
    order_reference: str
    customer_name: str | None
    total_quantity: Decimal
    reserved_until: datetime
    status: str
    items: list[ReservationItemResponse]
    is_partial: bool
    message: str

    model_config = ConfigDict(from_attributes=True)


class ReservationFulfillRequest(BaseModel):
    """Request schema for fulfilling a reservation."""

    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ReservationFulfillResponse(BaseModel):
    """Response schema for fulfilled reservation."""

    reservation_id: UUID
    movement_ids: list[UUID]
    total_fulfilled: Decimal
    message: str

    model_config = ConfigDict(from_attributes=True)


class ReservationCancelRequest(BaseModel):
    """Request schema for cancelling a reservation."""

    reason: str = Field(..., min_length=1, max_length=50)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ReservationDetail(BaseModel):
    """Detailed reservation information."""

    id: UUID
    product_id: UUID
    product_name: str
    sku: str | None
    order_reference: str
    customer_name: str | None
    total_quantity: Decimal
    reserved_until: datetime
    status: Literal["active", "fulfilled", "cancelled", "expired"]
    fulfilled_at: datetime | None
    cancelled_at: datetime | None
    cancellation_reason: str | None
    items: list[ReservationItemResponse]
    created_by: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReservationListItem(BaseModel):
    """Reservation item for list views."""

    id: UUID
    product_name: str
    sku: str | None
    order_reference: str
    customer_name: str | None
    total_quantity: Decimal
    reserved_until: datetime
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReservationListResponse(BaseModel):
    """Paginated reservation list response."""

    items: list[ReservationListItem]
    total: int
    page: int
    page_size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)
