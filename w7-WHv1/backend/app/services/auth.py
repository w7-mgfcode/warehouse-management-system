"""Authentication service."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db.models.user import User


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> User | None:
    """
    Authenticate user by username and password.

    Args:
        db: Async database session.
        username: User's username.
        password: Plain text password.

    Returns:
        User | None: User object if authenticated, None otherwise.
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def create_tokens(user_id: str) -> dict[str, str]:
    """
    Create access and refresh tokens for a user.

    Args:
        user_id: User ID to encode in tokens.

    Returns:
        dict: Dictionary containing access_token, refresh_token, and token_type.
    """
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id),
        "token_type": "bearer",
    }


def refresh_access_token(refresh_token: str) -> dict[str, str] | None:
    """
    Create new access token from refresh token.

    Args:
        refresh_token: Valid refresh token.

    Returns:
        dict | None: New tokens if refresh token is valid, None otherwise.
    """
    payload = decode_token(refresh_token)
    if payload is None:
        return None

    if payload.get("type") != "refresh":
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    return create_tokens(user_id)
