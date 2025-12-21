"""User management API endpoints (admin only)."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import DbSession, RequireAdmin
from app.core.i18n import HU_ERRORS, HU_MESSAGES
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate
from app.services.user import (
    calculate_pages,
    create_user,
    delete_user,
    get_user_by_email,
    get_user_by_id,
    get_user_by_username,
    get_users,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse)
async def list_users(
    db: DbSession,
    _current_user: RequireAdmin,
    page: int = 1,
    page_size: int = 50,
) -> UserListResponse:
    """
    List all users with pagination (admin only).
    """
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 200:
        page_size = 50

    users, total = await get_users(db, page=page, page_size=page_size)
    pages = calculate_pages(total, page_size)

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_new_user(
    user_data: UserCreate,
    db: DbSession,
    _current_user: RequireAdmin,
) -> UserResponse:
    """
    Create a new user (admin only).
    """
    # Check username uniqueness
    existing = await get_user_by_username(db, user_data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=HU_MESSAGES["username_exists"],
        )

    # Check email uniqueness
    existing = await get_user_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=HU_MESSAGES["email_exists"],
        )

    user = await create_user(db, user_data)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: DbSession,
    _current_user: RequireAdmin,
) -> UserResponse:
    """
    Get user by ID (admin only).
    """
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_ERRORS["not_found"],
        )
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_existing_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: DbSession,
    _current_user: RequireAdmin,
) -> UserResponse:
    """
    Update user by ID (admin only).
    """
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_ERRORS["not_found"],
        )

    # Check username uniqueness if updating
    if user_data.username and user_data.username != user.username:
        existing = await get_user_by_username(db, user_data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=HU_MESSAGES["username_exists"],
            )

    # Check email uniqueness if updating
    if user_data.email and user_data.email != user.email:
        existing = await get_user_by_email(db, user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=HU_MESSAGES["email_exists"],
            )

    updated_user = await update_user(db, user, user_data)
    return UserResponse.model_validate(updated_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_user(
    user_id: UUID,
    db: DbSession,
    _current_user: RequireAdmin,
) -> None:
    """
    Delete user by ID (admin only).
    """
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_ERRORS["not_found"],
        )
    await delete_user(db, user)
