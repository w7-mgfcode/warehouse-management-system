"""Inventory schemas for receipt, issue, and stock management."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.i18n import HU_MESSAGES

# Receipt schemas


class ReceiveRequest(BaseModel):
    """Request schema for receiving goods into a bin."""

    bin_id: UUID
    product_id: UUID
    supplier_id: UUID | None = None
    batch_number: str = Field(..., min_length=1, max_length=100)
    use_by_date: date
    best_before_date: date | None = None
    freeze_date: date | None = None
    delivery_date: date | None = None
    quantity: Decimal = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=50)
    pallet_count: int | None = Field(None, gt=0)
    weight_kg: Decimal | None = Field(None, gt=0)
    gross_weight_kg: Decimal | None = Field(None, gt=0)
    pallet_height_cm: int | None = Field(None, gt=0)
    cmr_number: str | None = Field(None, max_length=100)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("use_by_date")
    @classmethod
    def validate_use_by_date(cls, v: date) -> date:
        """Validate use_by_date is not in the past."""
        from datetime import date as date_type

        if v <= date_type.today():
            raise ValueError(HU_MESSAGES["expiry_date_past"])
        return v

    @field_validator("freeze_date")
    @classmethod
    def validate_freeze_date(cls, v: date | None) -> date | None:
        """Validate freeze_date is not in the future."""
        if v is None:
            return v
        from datetime import date as date_type

        if v > date_type.today():
            raise ValueError(HU_MESSAGES["freeze_date_future"])
        return v

    @field_validator("best_before_date")
    @classmethod
    def validate_best_before_date(cls, v: date | None, info) -> date | None:
        """Validate best_before_date <= use_by_date."""
        if v is None:
            return v
        data = info.data
        if "use_by_date" in data and v > data["use_by_date"]:
            raise ValueError("A minőségmegőrzési dátumnak korábbinak kell lennie, mint a lejárati dátum")
        return v

    @field_validator("gross_weight_kg")
    @classmethod
    def validate_gross_weight(cls, v: Decimal | None, info) -> Decimal | None:
        """Validate gross_weight_kg >= weight_kg."""
        if v is None:
            return v
        data = info.data
        if "weight_kg" in data and data["weight_kg"] is not None and v < data["weight_kg"]:
            raise ValueError("A bruttó súlynak nagyobbnak vagy egyenlőnek kell lennie, mint a nettó súly")
        return v


class ReceiveResponse(BaseModel):
    """Response schema after successfully receiving goods."""

    bin_content_id: UUID
    movement_id: UUID
    bin_code: str
    product_name: str
    quantity: Decimal
    unit: str
    use_by_date: date
    days_until_expiry: int
    message: str

    model_config = ConfigDict(from_attributes=True)


# Issue schemas


class IssueRequest(BaseModel):
    """Request schema for issuing goods from a bin."""

    bin_content_id: UUID
    quantity: Decimal = Field(..., gt=0)
    reason: str = Field(..., min_length=1, max_length=50)
    reference_number: str | None = Field(None, max_length=100)
    force_non_fefo: bool = False
    override_reason: str | None = None
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("override_reason")
    @classmethod
    def validate_override_reason(cls, v: str | None, info) -> str | None:
        """Require override_reason if force_non_fefo is True."""
        data = info.data
        if data.get("force_non_fefo") and not v:
            raise ValueError(HU_MESSAGES["fefo_override_required"])
        return v


class IssueResponse(BaseModel):
    """Response schema after successfully issuing goods."""

    movement_id: UUID
    bin_content_id: UUID | None
    quantity_issued: Decimal
    remaining_quantity: Decimal
    use_by_date: date
    days_until_expiry: int
    fefo_compliant: bool
    warning: dict | None = None
    message: str

    model_config = ConfigDict(from_attributes=True)


# FEFO schemas


class FEFORecommendation(BaseModel):
    """Single FEFO recommendation for a bin."""

    bin_id: UUID
    bin_content_id: UUID
    bin_code: str
    batch_number: str
    use_by_date: date
    days_until_expiry: int
    available_quantity: Decimal
    suggested_quantity: Decimal
    is_fefo_compliant: bool
    warning: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FEFORecommendationResponse(BaseModel):
    """Response with ordered FEFO recommendations."""

    product_id: UUID
    product_name: str
    sku: str | None
    requested_quantity: Decimal
    recommendations: list[FEFORecommendation]
    total_available: Decimal
    fefo_warnings: list[str]

    model_config = ConfigDict(from_attributes=True)


# Stock schemas


class StockLevel(BaseModel):
    """Detailed stock level for individual bin content."""

    bin_content_id: UUID
    bin_code: str
    warehouse_id: UUID
    warehouse_name: str
    product_id: UUID
    product_name: str
    sku: str | None
    batch_number: str
    quantity: Decimal
    unit: str
    weight_kg: Decimal
    use_by_date: date | None
    days_until_expiry: int
    status: str
    # FEFO compliance info
    is_fefo_compliant: bool = True
    oldest_bin_code: str | None = None
    oldest_use_by_date: date | None = None
    oldest_days_until_expiry: int | None = None

    model_config = ConfigDict(from_attributes=True)


class BinStockResponse(BaseModel):
    """Stock details for a specific bin."""

    bin_id: UUID
    bin_code: str
    warehouse_id: UUID
    warehouse_name: str
    contents: list["BinContentDetail"]
    total_weight_kg: Decimal
    status: str

    model_config = ConfigDict(from_attributes=True)


class BinContentDetail(BaseModel):
    """Detailed bin content information."""

    id: UUID
    product_id: UUID
    product_name: str
    sku: str | None
    supplier_id: UUID | None
    supplier_name: str | None
    batch_number: str
    quantity: Decimal
    unit: str
    use_by_date: date
    best_before_date: date | None
    days_until_expiry: int
    status: Literal["available", "reserved", "expired", "scrapped"]
    received_date: datetime
    pallet_count: int | None
    weight_kg: Decimal | None
    notes: str | None

    model_config = ConfigDict(from_attributes=True)


# Adjustment schemas


class AdjustmentRequest(BaseModel):
    """Request schema for stock adjustment (manager+)."""

    bin_content_id: UUID
    new_quantity: Decimal = Field(..., ge=0)
    reason: str = Field(..., min_length=1, max_length=50)
    reference_number: str | None = Field(None, max_length=100)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)


class ScrapRequest(BaseModel):
    """Request schema for scrapping stock (manager+)."""

    bin_content_id: UUID
    reason: str = Field(..., min_length=1, max_length=50)
    reference_number: str | None = Field(None, max_length=100)
    notes: str | None = None

    model_config = ConfigDict(str_strip_whitespace=True)
