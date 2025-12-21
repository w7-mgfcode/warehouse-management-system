"""Transfer schemas for bin-to-bin and cross-warehouse stock movements."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TransferCreate(BaseModel):
    """Request schema for same-warehouse transfer."""

    source_bin_content_id: UUID
    target_bin_id: UUID
    quantity: Decimal = Field(..., gt=0)
    reason: str = Field(default="reorganization", max_length=50)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class TransferResponse(BaseModel):
    """Response schema for successful transfer."""

    transfer_id: UUID | None = None  # Only for cross-warehouse
    source_movement_id: UUID
    target_movement_id: UUID
    source_bin_code: str
    target_bin_code: str
    quantity_transferred: Decimal
    unit: str
    product_name: str
    batch_number: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class CrossWarehouseTransferCreate(BaseModel):
    """Request schema for cross-warehouse transfer."""

    source_bin_content_id: UUID
    target_warehouse_id: UUID
    target_bin_id: UUID | None = None  # Optional, can be assigned on receipt
    quantity: Decimal = Field(..., gt=0)
    transport_reference: str | None = Field(None, max_length=100)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class CrossWarehouseTransferResponse(BaseModel):
    """Response schema for cross-warehouse transfer creation."""

    transfer_id: UUID
    source_warehouse_name: str
    target_warehouse_name: str
    source_bin_code: str
    quantity_sent: Decimal
    unit: str
    product_name: str
    batch_number: str
    status: str
    transport_reference: str | None
    message: str

    model_config = ConfigDict(from_attributes=True)


class TransferConfirmRequest(BaseModel):
    """Request schema for confirming cross-warehouse transfer receipt."""

    target_bin_id: UUID
    received_quantity: Decimal = Field(..., gt=0)
    condition_on_receipt: str | None = Field(None, max_length=50)  # good, damaged, partial
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class TransferConfirmResponse(BaseModel):
    """Response schema for confirmed transfer."""

    transfer_id: UUID
    target_bin_code: str
    quantity_received: Decimal
    quantity_sent: Decimal
    condition_on_receipt: str | None
    status: str
    message: str

    model_config = ConfigDict(from_attributes=True)


class TransferCancelRequest(BaseModel):
    """Request schema for cancelling a transfer."""

    reason: str = Field(..., min_length=1, max_length=255)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class TransferDetail(BaseModel):
    """Detailed transfer information."""

    id: UUID
    source_warehouse_id: UUID
    source_warehouse_name: str
    target_warehouse_id: UUID
    target_warehouse_name: str
    source_bin_code: str
    target_bin_code: str | None
    product_name: str
    sku: str | None
    batch_number: str
    use_by_date: date
    quantity_sent: Decimal
    quantity_received: Decimal | None
    unit: str
    status: Literal["pending", "in_transit", "received", "cancelled"]
    transport_reference: str | None
    condition_on_receipt: str | None
    dispatched_at: datetime | None
    received_at: datetime | None
    cancelled_at: datetime | None
    cancellation_reason: str | None
    created_by: str
    received_by: str | None
    notes: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransferListItem(BaseModel):
    """Transfer item for list views."""

    id: UUID
    source_warehouse_name: str
    target_warehouse_name: str
    source_bin_code: str
    target_bin_code: str | None
    product_name: str
    quantity_sent: Decimal
    unit: str
    status: str
    transport_reference: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TransferListResponse(BaseModel):
    """Paginated transfer list response."""

    items: list[TransferListItem]
    total: int
    page: int
    page_size: int
    pages: int

    model_config = ConfigDict(from_attributes=True)
