"""Tests for bin management endpoints."""

import uuid

from httpx import AsyncClient

from app.core.i18n import HU_MESSAGES
from app.db.models.bin import Bin
from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.tests.conftest import auth_header


class TestListBins:
    """Tests for GET /api/v1/bins endpoint."""

    async def test_list_bins_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test viewer can list bins."""
        response = await client.get(
            "/api/v1/bins",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    async def test_list_bins_filter_warehouse(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_bin: Bin,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test filtering bins by warehouse."""
        response = await client.get(
            f"/api/v1/bins?warehouse_id={sample_warehouse.id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["warehouse_id"] == str(sample_warehouse.id)

    async def test_list_bins_search(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test searching bins."""
        response = await client.get(
            "/api/v1/bins?search=A-01",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_list_bins_unauthenticated(
        self,
        client: AsyncClient,
    ) -> None:
        """Test unauthenticated user cannot list bins."""
        response = await client.get("/api/v1/bins")
        assert response.status_code == 401


class TestCreateBin:
    """Tests for POST /api/v1/bins endpoint."""

    async def test_create_bin_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test warehouse user can create bin."""
        response = await client.post(
            "/api/v1/bins",
            headers=auth_header(warehouse_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "code": "B-01",
                "structure_data": {"aisle": "B", "level": "01"},
                "max_weight": 1000.0,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["code"] == "B-01"

    async def test_create_bin_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test viewer cannot create bin."""
        response = await client.post(
            "/api/v1/bins",
            headers=auth_header(viewer_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "code": "C-01",
                "structure_data": {"aisle": "C", "level": "01"},
            },
        )
        assert response.status_code == 403

    async def test_create_bin_duplicate_code(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_bin: Bin,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test creating bin with duplicate code returns 409."""
        response = await client.post(
            "/api/v1/bins",
            headers=auth_header(admin_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "code": "A-01",  # Same as sample_bin
                "structure_data": {"aisle": "A", "level": "01"},
            },
        )
        assert response.status_code == 409


class TestGetBin:
    """Tests for GET /api/v1/bins/{bin_id} endpoint."""

    async def test_get_bin_success(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test getting bin by ID."""
        response = await client.get(
            f"/api/v1/bins/{sample_bin.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "A-01"

    async def test_get_bin_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting non-existent bin returns 404."""
        response = await client.get(
            f"/api/v1/bins/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestUpdateBin:
    """Tests for PUT /api/v1/bins/{bin_id} endpoint."""

    async def test_update_bin_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test warehouse user can update bin."""
        response = await client.put(
            f"/api/v1/bins/{sample_bin.id}",
            headers=auth_header(warehouse_token),
            json={"max_weight": 1500.0},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["max_weight"] == 1500.0

    async def test_update_bin_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test viewer cannot update bin."""
        response = await client.put(
            f"/api/v1/bins/{sample_bin.id}",
            headers=auth_header(viewer_token),
            json={"max_weight": 2000.0},
        )
        assert response.status_code == 403


class TestDeleteBin:
    """Tests for DELETE /api/v1/bins/{bin_id} endpoint."""

    async def test_delete_bin_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test warehouse user can delete empty bin."""
        response = await client.delete(
            f"/api/v1/bins/{sample_bin.id}",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 204

    async def test_delete_bin_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin: Bin,
    ) -> None:
        """Test viewer cannot delete bin."""
        response = await client.delete(
            f"/api/v1/bins/{sample_bin.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 403

    async def test_delete_bin_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test deleting non-existent bin returns 404."""
        response = await client.delete(
            f"/api/v1/bins/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestBulkGeneration:
    """Tests for bulk bin generation endpoints."""

    async def test_bulk_preview_success(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test bulk generation preview."""
        response = await client.post(
            "/api/v1/bins/bulk/preview",
            headers=auth_header(manager_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "ranges": {
                    "aisle": ["A", "B"],
                    "level": {"start": 1, "end": 3},
                },
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert data["count"] == 6  # 2 aisles * 3 levels
        assert "sample_codes" in data
        assert "conflicts" in data
        assert "valid" in data

    async def test_bulk_create_success(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test bulk bin creation."""
        response = await client.post(
            "/api/v1/bins/bulk",
            headers=auth_header(manager_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "ranges": {
                    "aisle": ["C"],
                    "level": {"start": 1, "end": 2},
                },
                "defaults": {
                    "max_weight": 1000.0,
                    "max_height": 180.0,
                },
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["created"] == 2

    async def test_bulk_conflict_detection(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
        sample_bin: Bin,
    ) -> None:
        """Test bulk generation detects conflicts."""
        response = await client.post(
            "/api/v1/bins/bulk",
            headers=auth_header(manager_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "ranges": {
                    "aisle": ["A"],  # Sample bin is A-01
                    "level": ["01"],
                },
            },
        )
        assert response.status_code == 400
        assert HU_MESSAGES["bulk_conflicts_found"].split("{codes}")[0] in response.json()["detail"]

    async def test_bulk_invalid_range_start_gt_end(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test invalid range (start > end) returns localized 422."""
        response = await client.post(
            "/api/v1/bins/bulk/preview",
            headers=auth_header(manager_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "ranges": {
                    "aisle": ["A"],
                    "level": {"start": 3, "end": 1},
                },
            },
        )
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert any(err.get("msg", "").endswith(HU_MESSAGES["bulk_invalid_range"]) for err in detail)

    async def test_bulk_empty_generation_returns_localized_error(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test empty generation returns a localized 400."""
        response = await client.post(
            "/api/v1/bins/bulk",
            headers=auth_header(manager_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "ranges": {
                    "aisle": [],
                    "level": {"start": 1, "end": 1},
                },
            },
        )
        assert response.status_code == 400
        assert response.json()["detail"] == HU_MESSAGES["bulk_no_bins_generated"]

    async def test_bulk_warehouse_user_forbidden(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test warehouse user cannot bulk create bins."""
        response = await client.post(
            "/api/v1/bins/bulk",
            headers=auth_header(warehouse_token),
            json={
                "warehouse_id": str(sample_warehouse.id),
                "ranges": {
                    "aisle": ["D"],
                    "level": {"start": 1, "end": 2},
                },
            },
        )
        assert response.status_code == 403
