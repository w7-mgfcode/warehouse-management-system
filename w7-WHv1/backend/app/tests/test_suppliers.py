"""Tests for supplier management endpoints."""

import uuid

from httpx import AsyncClient

from app.core.i18n import HU_MESSAGES
from app.db.models.supplier import Supplier
from app.db.models.user import User
from app.tests.conftest import auth_header


class TestListSuppliers:
    """Tests for GET /api/v1/suppliers endpoint."""

    async def test_list_suppliers_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test viewer can list suppliers."""
        response = await client.get(
            "/api/v1/suppliers",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    async def test_list_suppliers_filter_active(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test filtering suppliers by active status."""
        response = await client.get(
            "/api/v1/suppliers?is_active=true",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_active"] is True

    async def test_list_suppliers_search(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test searching suppliers."""
        response = await client.get(
            "/api/v1/suppliers?search=Test",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_list_suppliers_unauthenticated(
        self,
        client: AsyncClient,
    ) -> None:
        """Test unauthenticated user cannot list suppliers."""
        response = await client.get("/api/v1/suppliers")
        assert response.status_code == 401


class TestCreateSupplier:
    """Tests for POST /api/v1/suppliers endpoint."""

    async def test_create_supplier_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
    ) -> None:
        """Test manager can create supplier."""
        response = await client.post(
            "/api/v1/suppliers",
            headers=auth_header(manager_token),
            json={
                "company_name": "Új Beszállító Kft.",
                "contact_person": "Teszt Kapcsolat",
                "email": "teszt@beszallito.hu",
                "tax_number": "87654321-1-43",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "Új Beszállító Kft."

    async def test_create_supplier_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
    ) -> None:
        """Test warehouse user cannot create supplier."""
        response = await client.post(
            "/api/v1/suppliers",
            headers=auth_header(warehouse_token),
            json={"company_name": "Unauthorized Supplier"},
        )
        assert response.status_code == 403

    async def test_create_supplier_invalid_tax_number(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating supplier with invalid tax number returns 422."""
        response = await client.post(
            "/api/v1/suppliers",
            headers=auth_header(admin_token),
            json={
                "company_name": "Invalid Tax Kft.",
                "tax_number": "invalid",  # Invalid format
            },
        )
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert any(err.get("msg", "").endswith(HU_MESSAGES["invalid_tax_number"]) for err in detail)

    async def test_create_supplier_short_name(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating supplier with too short name returns 422."""
        response = await client.post(
            "/api/v1/suppliers",
            headers=auth_header(admin_token),
            json={"company_name": "A"},  # Too short
        )
        assert response.status_code == 422


class TestGetSupplier:
    """Tests for GET /api/v1/suppliers/{supplier_id} endpoint."""

    async def test_get_supplier_success(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test getting supplier by ID."""
        response = await client.get(
            f"/api/v1/suppliers/{sample_supplier.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Test Supplier Kft."

    async def test_get_supplier_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting non-existent supplier returns 404."""
        response = await client.get(
            f"/api/v1/suppliers/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestUpdateSupplier:
    """Tests for PUT /api/v1/suppliers/{supplier_id} endpoint."""

    async def test_update_supplier_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test manager can update supplier."""
        response = await client.put(
            f"/api/v1/suppliers/{sample_supplier.id}",
            headers=auth_header(manager_token),
            json={"company_name": "Updated Supplier Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Updated Supplier Name"

    async def test_update_supplier_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test viewer cannot update supplier."""
        response = await client.put(
            f"/api/v1/suppliers/{sample_supplier.id}",
            headers=auth_header(viewer_token),
            json={"company_name": "Unauthorized Update"},
        )
        assert response.status_code == 403

    async def test_update_supplier_invalid_tax_number_returns_422(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test updating supplier with invalid tax number returns localized 422."""
        response = await client.put(
            f"/api/v1/suppliers/{sample_supplier.id}",
            headers=auth_header(manager_token),
            json={"tax_number": "invalid"},
        )
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert any(err.get("msg", "").endswith(HU_MESSAGES["invalid_tax_number"]) for err in detail)


class TestDeleteSupplier:
    """Tests for DELETE /api/v1/suppliers/{supplier_id} endpoint."""

    async def test_delete_supplier_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test manager can delete supplier."""
        response = await client.delete(
            f"/api/v1/suppliers/{sample_supplier.id}",
            headers=auth_header(manager_token),
        )
        assert response.status_code == 204

    async def test_delete_supplier_warehouse(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_supplier: Supplier,
    ) -> None:
        """Test warehouse user cannot delete supplier."""
        response = await client.delete(
            f"/api/v1/suppliers/{sample_supplier.id}",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 403

    async def test_delete_supplier_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test deleting non-existent supplier returns 404."""
        response = await client.delete(
            f"/api/v1/suppliers/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404
