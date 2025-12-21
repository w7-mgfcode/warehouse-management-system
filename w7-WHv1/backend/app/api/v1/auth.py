"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, DbSession
from app.core.i18n import HU_ERRORS
from app.schemas.auth import RefreshTokenRequest, Token
from app.schemas.user import UserResponse
from app.services.auth import authenticate_user, create_tokens, refresh_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(
    db: DbSession,
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Token:
    """
    OAuth2 compatible login endpoint.

    Returns access and refresh tokens on successful authentication.
    """
    user = await authenticate_user(db, form_data.username, form_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=HU_ERRORS["invalid_credentials"],
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=HU_ERRORS["inactive_user"],
        )

    tokens = create_tokens(str(user.id))
    return Token(**tokens)


@router.post("/refresh", response_model=Token)
async def refresh_token(request: RefreshTokenRequest) -> Token:
    """
    Refresh access token using refresh token.

    Returns new access and refresh tokens.
    """
    tokens = refresh_access_token(request.refresh_token)

    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=HU_ERRORS["invalid_token"],
            headers={"WWW-Authenticate": "Bearer"},
        )

    return Token(**tokens)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser) -> UserResponse:
    """
    Get current authenticated user information.
    """
    return UserResponse.model_validate(current_user)
