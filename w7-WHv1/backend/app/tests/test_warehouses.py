"""Tests for warehouse management endpoints."""

import uuid

from httpx import AsyncClient

from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.tests.conftest import auth_header

VALID_BIN_TEMPLATE = {
    "fields": [
        {"name": "aisle", "label": "Sor", "required": True, "order": 1},
        {"name": "level", "label": "Szint", "required": True, "order": 2},
    ],
    "code_format": "{aisle}-{level}",
    "separator": "-",
    "auto_uppercase": True,
    "zero_padding": True,
}


class TestListWarehouses:
    """Tests for GET /api/v1/warehouses endpoint."""

    async def test_list_warehouses_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test viewer can list warehouses."""
        response = await client.get(
            "/api/v1/warehouses",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    async def test_list_warehouses_filter_active(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test filtering warehouses by active status."""
        response = await client.get(
            "/api/v1/warehouses?is_active=true",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_active"] is True

    async def test_list_warehouses_unauthenticated(
        self,
        client: AsyncClient,
    ) -> None:
        """Test unauthenticated user cannot list warehouses."""
        response = await client.get("/api/v1/warehouses")
        assert response.status_code == 401


class TestCreateWarehouse:
    """Tests for POST /api/v1/warehouses endpoint."""

    async def test_create_warehouse_admin(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test admin can create warehouse."""
        response = await client.post(
            "/api/v1/warehouses",
            headers=auth_header(admin_token),
            json={
                "name": "Uj Raktar",
                "location": "Budapest",
                "description": "Teszt leiras",
                "bin_structure_template": VALID_BIN_TEMPLATE,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Uj Raktar"
        assert data["location"] == "Budapest"

    async def test_create_warehouse_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
    ) -> None:
        """Test manager can create warehouse."""
        response = await client.post(
            "/api/v1/warehouses",
            headers=auth_header(manager_token),
            json={
                "name": "Manager Raktar",
                "bin_structure_template": VALID_BIN_TEMPLATE,
            },
        )
        assert response.status_code == 201

    async def test_create_warehouse_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
    ) -> None:
        """Test warehouse user cannot create warehouse."""
        response = await client.post(
            "/api/v1/warehouses",
            headers=auth_header(warehouse_token),
            json={
                "name": "Unauthorized Raktar",
                "bin_structure_template": VALID_BIN_TEMPLATE,
            },
        )
        assert response.status_code == 403

    async def test_create_warehouse_duplicate_name(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test creating warehouse with duplicate name returns 409."""
        response = await client.post(
            "/api/v1/warehouses",
            headers=auth_header(admin_token),
            json={
                "name": "Test Warehouse",  # Same as sample_warehouse
                "bin_structure_template": VALID_BIN_TEMPLATE,
            },
        )
        assert response.status_code == 409

    async def test_create_warehouse_invalid_template(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating warehouse with invalid template returns 422."""
        response = await client.post(
            "/api/v1/warehouses",
            headers=auth_header(admin_token),
            json={
                "name": "Invalid Template Raktar",
                "bin_structure_template": {
                    "fields": [],  # Empty fields - invalid
                    "code_format": "invalid",  # No placeholders - invalid
                },
            },
        )
        assert response.status_code == 422

    async def test_create_warehouse_short_name(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating warehouse with too short name returns 422."""
        response = await client.post(
            "/api/v1/warehouses",
            headers=auth_header(admin_token),
            json={
                "name": "A",  # Too short
                "bin_structure_template": VALID_BIN_TEMPLATE,
            },
        )
        assert response.status_code == 422


class TestGetWarehouse:
    """Tests for GET /api/v1/warehouses/{warehouse_id} endpoint."""

    async def test_get_warehouse_success(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test getting warehouse by ID."""
        response = await client.get(
            f"/api/v1/warehouses/{sample_warehouse.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Warehouse"

    async def test_get_warehouse_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting non-existent warehouse returns 404."""
        response = await client.get(
            f"/api/v1/warehouses/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestUpdateWarehouse:
    """Tests for PUT /api/v1/warehouses/{warehouse_id} endpoint."""

    async def test_update_warehouse_admin(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test admin can update warehouse."""
        response = await client.put(
            f"/api/v1/warehouses/{sample_warehouse.id}",
            headers=auth_header(admin_token),
            json={"name": "Updated Warehouse Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Warehouse Name"

    async def test_update_warehouse_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test manager can update warehouse."""
        response = await client.put(
            f"/api/v1/warehouses/{sample_warehouse.id}",
            headers=auth_header(manager_token),
            json={"location": "New Location"},
        )
        assert response.status_code == 200

    async def test_update_warehouse_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test viewer cannot update warehouse."""
        response = await client.put(
            f"/api/v1/warehouses/{sample_warehouse.id}",
            headers=auth_header(viewer_token),
            json={"name": "Unauthorized Update"},
        )
        assert response.status_code == 403


class TestDeleteWarehouse:
    """Tests for DELETE /api/v1/warehouses/{warehouse_id} endpoint."""

    async def test_delete_warehouse_admin(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test admin can delete warehouse (without bins)."""
        response = await client.delete(
            f"/api/v1/warehouses/{sample_warehouse.id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

    async def test_delete_warehouse_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test manager cannot delete warehouse."""
        response = await client.delete(
            f"/api/v1/warehouses/{sample_warehouse.id}",
            headers=auth_header(manager_token),
        )
        assert response.status_code == 403

    async def test_delete_warehouse_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test deleting non-existent warehouse returns 404."""
        response = await client.delete(
            f"/api/v1/warehouses/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestWarehouseStats:
    """Tests for GET /api/v1/warehouses/{warehouse_id}/stats endpoint."""

    async def test_get_warehouse_stats(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test getting warehouse statistics."""
        response = await client.get(
            f"/api/v1/warehouses/{sample_warehouse.id}/stats",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_bins" in data
        assert "occupied_bins" in data
        assert "empty_bins" in data
        assert "utilization_percent" in data
        # No bins created, so all should be 0
        assert data["total_bins"] == 0
        assert data["utilization_percent"] == 0.0

    async def test_get_warehouse_stats_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting stats for non-existent warehouse returns 404."""
        response = await client.get(
            f"/api/v1/warehouses/{uuid.uuid4()}/stats",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404
