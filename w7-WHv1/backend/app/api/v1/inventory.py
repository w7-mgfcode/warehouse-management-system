"""Inventory management API endpoints."""

from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireManager, RequireViewer, RequireWarehouse
from app.core.i18n import HU_MESSAGES
from app.schemas.expiry import ExpiredProductResponse, ExpiryWarningResponse
from app.schemas.inventory import (
    AdjustmentRequest,
    IssueRequest,
    IssueResponse,
    ReceiveRequest,
    ReceiveResponse,
    ScrapRequest,
    StockLevel,
)
from app.services.expiry import get_expired_products, get_expiry_warnings
from app.services.fefo import calculate_days_until_expiry, get_fefo_recommendation
from app.services.inventory import (
    adjust_stock,
    check_cmr_uniqueness,
    get_stock_levels,
    issue_goods,
    receive_goods,
    scrap_stock,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.post("/receive", response_model=ReceiveResponse, status_code=status.HTTP_201_CREATED)
async def receive_inventory(
    receive_data: ReceiveRequest,
    db: DbSession,
    current_user: RequireWarehouse,
) -> ReceiveResponse:
    """
    Receive goods into a bin (warehouse+ only).

    Creates BinContent record and receipt movement.
    """
    try:
        bin_content, movement = await receive_goods(db, receive_data, current_user.id)

        return ReceiveResponse(
            bin_content_id=bin_content.id,
            movement_id=movement.id,
            bin_code=bin_content.bin.code,
            product_name=bin_content.product.name,
            quantity=bin_content.quantity,
            unit=bin_content.unit,
            use_by_date=bin_content.use_by_date,
            days_until_expiry=calculate_days_until_expiry(bin_content.use_by_date),
            message=HU_MESSAGES["receipt_successful"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.post("/issue", response_model=IssueResponse)
async def issue_inventory(
    issue_data: IssueRequest,
    db: DbSession,
    current_user: RequireWarehouse,
) -> IssueResponse:
    """
    Issue goods from a bin (warehouse+ only).

    Enforces FEFO unless manager overrides.
    """
    try:
        bin_content, movement = await issue_goods(
            db, issue_data, current_user.id, current_user.role
        )

        # Build warning if non-FEFO
        warning = None
        if not movement.fefo_compliant:
            warning = {
                "type": "fefo_violation",
                "message": HU_MESSAGES["fefo_warning"],
            }

        return IssueResponse(
            movement_id=movement.id,
            bin_content_id=bin_content.id if bin_content else None,
            quantity_issued=abs(movement.quantity),
            remaining_quantity=movement.quantity_after,
            use_by_date=bin_content.use_by_date
            if bin_content
            else movement.bin_content.use_by_date,
            days_until_expiry=calculate_days_until_expiry(
                bin_content.use_by_date if bin_content else movement.bin_content.use_by_date
            ),
            fefo_compliant=movement.fefo_compliant or False,
            warning=warning,
            message=HU_MESSAGES["issue_successful"],
        )
    except ValueError as e:
        # FEFO violations and other errors
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT
            if "FEFO" in str(e)
            else status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e


@router.get("/fefo-recommendation")
async def get_fefo_recommendation_endpoint(
    db: DbSession,
    _current_user: RequireViewer,
    product_id: UUID = Query(..., description="Product UUID"),
    quantity: Decimal = Query(..., gt=0, description="Requested quantity"),
):
    """
    Get FEFO-compliant picking recommendations (all users).

    Returns ordered list of bins to pick from (oldest expiry first).
    """
    try:
        recommendation = await get_fefo_recommendation(db, product_id, quantity)
        return recommendation
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e


@router.get("/stock-levels", response_model=list[StockLevel])
async def get_stock_levels_endpoint(
    db: DbSession,
    _current_user: RequireViewer,
    warehouse_id: UUID | None = Query(None, description="Filter by warehouse"),
    product_id: UUID | None = Query(None, description="Filter by product"),
    search: str | None = Query(None, description="Search by product name, bin code, or batch number"),
) -> list[StockLevel]:
    """
    Get detailed stock levels for each bin content (all users).

    Returns individual records per bin/batch combination with search support.
    """
    return await get_stock_levels(db, warehouse_id, product_id, search)


@router.get("/expiry-warnings", response_model=ExpiryWarningResponse)
async def get_expiry_warnings_endpoint(
    db: DbSession,
    _current_user: RequireViewer,
    days_threshold: int = Query(30, ge=1, le=365, description="Days ahead to check"),
    warehouse_id: UUID | None = Query(None, description="Filter by warehouse"),
) -> ExpiryWarningResponse:
    """
    Get expiry warnings for products approaching expiration (all users).

    Returns warnings grouped by urgency: critical (<7d), high (7-14d), medium (15-30d).
    """
    return await get_expiry_warnings(db, days_threshold, warehouse_id)


@router.get("/expired", response_model=ExpiredProductResponse)
async def get_expired_endpoint(
    db: DbSession,
    _current_user: RequireViewer,
    warehouse_id: UUID | None = Query(None, description="Filter by warehouse"),
) -> ExpiredProductResponse:
    """
    Get products that have already expired (all users).

    Returns list of expired products requiring scrapping.
    """
    return await get_expired_products(db, warehouse_id)


@router.get("/cmr-check")
async def check_cmr_number(
    db: DbSession,
    _current_user: RequireViewer,
    cmr_number: str = Query(..., min_length=1, description="CMR/Waybill number"),
) -> dict:
    """
    Check if CMR number already exists in the system (all users).

    Returns existence status and bin content details if found.
    """
    result = await check_cmr_uniqueness(db, cmr_number)
    return result


@router.post("/adjust", status_code=status.HTTP_200_OK)
async def adjust_inventory(
    adjustment_data: AdjustmentRequest,
    db: DbSession,
    current_user: RequireManager,
) -> dict:
    """
    Adjust stock quantity (manager+ only).

    Creates adjustment movement record.
    """
    try:
        movement = await adjust_stock(db, adjustment_data, current_user.id)
        return {
            "movement_id": movement.id,
            "quantity_before": movement.quantity_before,
            "quantity_after": movement.quantity_after,
            "message": "Készlet módosítva",
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e


@router.post("/scrap", status_code=status.HTTP_200_OK)
async def scrap_inventory(
    scrap_data: ScrapRequest,
    db: DbSession,
    current_user: RequireManager,
) -> dict:
    """
    Scrap expired or damaged stock (manager+ only).

    Sets quantity to 0 and status to 'scrapped'.
    """
    try:
        movement = await scrap_stock(db, scrap_data, current_user.id)
        return {
            "movement_id": movement.id,
            "quantity_scrapped": abs(movement.quantity),
            "message": "Termék selejtezve",
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
