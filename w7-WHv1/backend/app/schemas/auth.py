"""Authentication schemas."""

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    """Login request schema."""

    username: str
    password: str

    model_config = ConfigDict(str_strip_whitespace=True)


class Token(BaseModel):
    """Token response schema."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """JWT token payload schema."""

    sub: str
    exp: int
    type: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str
