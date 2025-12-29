"""Movement history API endpoints."""

from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession, RequireViewer
from app.core.i18n import HU_MESSAGES
from app.schemas.movement import MovementListResponse, MovementResponse, MovementType
from app.services.movement import (
    calculate_pages,
    get_movement_by_id,
    get_movements,
    movement_to_response,
)

router = APIRouter(prefix="/movements", tags=["movements"])


@router.get("", response_model=MovementListResponse)
async def list_movements(
    db: DbSession,
    _current_user: RequireViewer,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    product_id: UUID | None = Query(None, description="Filter by product"),
    bin_id: UUID | None = Query(None, description="Filter by bin"),
    movement_type: MovementType | None = Query(None, description="Filter by type"),
    start_date: str | None = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    created_by: UUID | None = Query(None, description="Filter by user"),
) -> MovementListResponse:
    """
    List all movements with filters (all users).

    Immutable audit trail of inventory transactions.
    """
    # Parse date strings to date objects
    parsed_start_date: date | None = None
    parsed_end_date: date | None = None

    if start_date:
        try:
            parsed_start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid start_date format. Use YYYY-MM-DD",
            ) from None

    if end_date:
        try:
            parsed_end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid end_date format. Use YYYY-MM-DD",
            ) from None

    movements, total = await get_movements(
        db=db,
        page=page,
        page_size=page_size,
        product_id=product_id,
        bin_id=bin_id,
        movement_type=movement_type,
        start_date=parsed_start_date,
        end_date=parsed_end_date,
        created_by=created_by,
    )

    # Convert to response models
    items: list[MovementResponse] = []
    for movement in movements:
        try:
            response = await movement_to_response(db, movement)
            items.append(response)
        except ValueError:
            # Skip if bin_content or user not found (shouldn't happen)
            continue

    pages = calculate_pages(total, page_size)

    return MovementListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{movement_id}", response_model=MovementResponse)
async def get_movement(
    movement_id: UUID,
    db: DbSession,
    _current_user: RequireViewer,
) -> MovementResponse:
    """
    Get movement details by ID (all users).
    """
    movement = await get_movement_by_id(db, movement_id)
    if not movement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["movement_not_found"],
        )

    try:
        return await movement_to_response(db, movement)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
