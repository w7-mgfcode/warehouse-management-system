"""User service for CRUD operations."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.pagination import calculate_pages as _calculate_pages


async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
    """
    Create a new user.

    Args:
        db: Async database session.
        user_data: User creation data.

    Returns:
        User: Created user object.
    """
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        is_active=user_data.is_active,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    """
    Get user by ID.

    Args:
        db: Async database session.
        user_id: User UUID.

    Returns:
        User | None: User object if found, None otherwise.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """
    Get user by username.

    Args:
        db: Async database session.
        username: Username string.

    Returns:
        User | None: User object if found, None otherwise.
    """
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """
    Get user by email.

    Args:
        db: Async database session.
        email: Email address.

    Returns:
        User | None: User object if found, None otherwise.
    """
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_users(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[User], int]:
    """
    Get paginated list of users.

    Args:
        db: Async database session.
        page: Page number (1-indexed).
        page_size: Number of items per page.

    Returns:
        tuple: List of users and total count.
    """
    # Get total count
    count_result = await db.execute(select(func.count()).select_from(User))
    total = count_result.scalar() or 0

    # Get paginated users
    offset = (page - 1) * page_size
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size)
    )
    users = list(result.scalars().all())

    return users, total


async def update_user(
    db: AsyncSession,
    user: User,
    user_data: UserUpdate,
) -> User:
    """
    Update user data.

    Args:
        db: Async database session.
        user: User object to update.
        user_data: Update data.

    Returns:
        User: Updated user object.
    """
    update_dict = user_data.model_dump(exclude_unset=True)

    if "password" in update_dict:
        update_dict["password_hash"] = get_password_hash(update_dict.pop("password"))

    for field, value in update_dict.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    """
    Delete a user.

    Args:
        db: Async database session.
        user: User object to delete.
    """
    await db.delete(user)
    await db.flush()


def calculate_pages(total: int, page_size: int) -> int:
    return _calculate_pages(total, page_size)



