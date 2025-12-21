"""Tests for user management endpoints."""

import uuid

from httpx import AsyncClient

from app.db.models.user import User
from app.tests.conftest import auth_header


class TestListUsers:
    """Tests for GET /api/v1/users endpoint."""

    async def test_list_users_admin(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test admin can list users."""
        response = await client.get(
            "/api/v1/users",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    async def test_list_users_non_admin(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
    ) -> None:
        """Test non-admin cannot list users."""
        response = await client.get(
            "/api/v1/users",
            headers=auth_header(manager_token),
        )
        assert response.status_code == 403


class TestCreateUser:
    """Tests for POST /api/v1/users endpoint."""

    async def test_create_user_success(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test admin can create a new user."""
        response = await client.post(
            "/api/v1/users",
            headers=auth_header(admin_token),
            json={
                "username": "newuser",
                "email": "newuser@test.com",
                "password": "NewPass123!",
                "full_name": "New User",
                "role": "warehouse",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["username"] == "newuser"
        assert data["email"] == "newuser@test.com"
        assert data["role"] == "warehouse"
        assert "password" not in data

    async def test_create_user_duplicate_username(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating user with duplicate username returns 409."""
        response = await client.post(
            "/api/v1/users",
            headers=auth_header(admin_token),
            json={
                "username": "testadmin",  # Existing username
                "email": "another@test.com",
                "password": "NewPass123!",
            },
        )
        assert response.status_code == 409

    async def test_create_user_weak_password(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating user with weak password returns 422."""
        response = await client.post(
            "/api/v1/users",
            headers=auth_header(admin_token),
            json={
                "username": "weakuser",
                "email": "weak@test.com",
                "password": "weak",  # Too weak
            },
        )
        assert response.status_code == 422

    async def test_create_user_non_admin(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
    ) -> None:
        """Test non-admin cannot create users."""
        response = await client.post(
            "/api/v1/users",
            headers=auth_header(warehouse_token),
            json={
                "username": "newuser",
                "email": "new@test.com",
                "password": "NewPass123!",
            },
        )
        assert response.status_code == 403


class TestGetUser:
    """Tests for GET /api/v1/users/{user_id} endpoint."""

    async def test_get_user_success(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        manager_user: User,
    ) -> None:
        """Test admin can get user by ID."""
        response = await client.get(
            f"/api/v1/users/{manager_user.id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testmanager"

    async def test_get_user_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting non-existent user returns 404."""
        response = await client.get(
            f"/api/v1/users/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestUpdateUser:
    """Tests for PUT /api/v1/users/{user_id} endpoint."""

    async def test_update_user_success(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        manager_user: User,
    ) -> None:
        """Test admin can update user."""
        response = await client.put(
            f"/api/v1/users/{manager_user.id}",
            headers=auth_header(admin_token),
            json={"full_name": "Updated Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == "Updated Name"

    async def test_update_user_role(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        manager_user: User,
    ) -> None:
        """Test admin can update user role."""
        response = await client.put(
            f"/api/v1/users/{manager_user.id}",
            headers=auth_header(admin_token),
            json={"role": "admin"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"


class TestDeleteUser:
    """Tests for DELETE /api/v1/users/{user_id} endpoint."""

    async def test_delete_user_success(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        viewer_user: User,
    ) -> None:
        """Test admin can delete user."""
        response = await client.delete(
            f"/api/v1/users/{viewer_user.id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

    async def test_delete_user_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test deleting non-existent user returns 404."""
        response = await client.delete(
            f"/api/v1/users/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404
