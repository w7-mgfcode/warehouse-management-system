"""Tests for authentication endpoints."""

from httpx import AsyncClient

from app.db.models.user import User
from app.tests.conftest import auth_header


class TestLogin:
    """Tests for POST /api/v1/auth/login endpoint."""

    async def test_login_success(
        self,
        client: AsyncClient,
        admin_user: User,
    ) -> None:
        """Test successful login returns tokens."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "testadmin", "password": "TestPass123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(
        self,
        client: AsyncClient,
        admin_user: User,
    ) -> None:
        """Test login with wrong password returns 401."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "testadmin", "password": "wrongpassword"},
        )
        assert response.status_code == 401

    async def test_login_nonexistent_user(
        self,
        client: AsyncClient,
    ) -> None:
        """Test login with nonexistent user returns 401."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "nonexistent", "password": "password"},
        )
        assert response.status_code == 401

    async def test_login_inactive_user(
        self,
        client: AsyncClient,
        inactive_user: User,
    ) -> None:
        """Test login with inactive user returns 403."""
        response = await client.post(
            "/api/v1/auth/login",
            data={"username": "inactiveuser", "password": "TestPass123!"},
        )
        assert response.status_code == 403


class TestRefreshToken:
    """Tests for POST /api/v1/auth/refresh endpoint."""

    async def test_refresh_success(
        self,
        client: AsyncClient,
        admin_user: User,
    ) -> None:
        """Test successful token refresh."""
        # First login to get tokens
        login_response = await client.post(
            "/api/v1/auth/login",
            data={"username": "testadmin", "password": "TestPass123!"},
        )
        refresh_token = login_response.json()["refresh_token"]

        # Use refresh token to get new tokens
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_refresh_invalid_token(
        self,
        client: AsyncClient,
    ) -> None:
        """Test refresh with invalid token returns 401."""
        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid_token"},
        )
        assert response.status_code == 401


class TestGetMe:
    """Tests for GET /api/v1/auth/me endpoint."""

    async def test_get_me_success(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting current user info."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testadmin"
        assert data["email"] == "testadmin@test.com"
        assert data["role"] == "admin"

    async def test_get_me_no_token(
        self,
        client: AsyncClient,
    ) -> None:
        """Test getting current user without token returns 401."""
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_get_me_invalid_token(
        self,
        client: AsyncClient,
    ) -> None:
        """Test getting current user with invalid token returns 401."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_header("invalid_token"),
        )
        assert response.status_code == 401
