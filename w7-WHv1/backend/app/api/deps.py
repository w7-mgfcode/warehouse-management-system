"""API dependencies for authentication and RBAC."""

import uuid as uuid_module
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import HU_ERRORS
from app.core.security import decode_token
from app.db.models.user import User
from app.db.session import get_async_session

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    """
    Get current authenticated user from JWT token.

    Args:
        token: JWT access token from Authorization header.
        db: Async database session.

    Returns:
        User: Authenticated user object.

    Raises:
        HTTPException: If token is invalid or user not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=HU_ERRORS["invalid_credentials"],
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_uuid = uuid_module.UUID(user_id)
    except (ValueError, TypeError) as err:
        raise credentials_exception from err

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=HU_ERRORS["inactive_user"],
        )

    return user


def require_roles(*allowed_roles: str):
    """
    Dependency factory for role-based access control.

    Args:
        *allowed_roles: Roles that are allowed to access the endpoint.

    Returns:
        Callable: Dependency that checks user role.
    """

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=HU_ERRORS["not_enough_permissions"],
            )
        return current_user

    return role_checker


# Pre-defined role dependencies for common use cases
RequireAdmin = Annotated[User, Depends(require_roles("admin"))]
RequireManager = Annotated[User, Depends(require_roles("admin", "manager"))]
RequireWarehouse = Annotated[User, Depends(require_roles("admin", "manager", "warehouse"))]
RequireViewer = Annotated[
    User, Depends(require_roles("admin", "manager", "warehouse", "viewer"))
]

# Type aliases for common dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_async_session)]
