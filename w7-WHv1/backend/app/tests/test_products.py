"""Tests for product management endpoints."""

import uuid

from httpx import AsyncClient

from app.db.models.product import Product
from app.db.models.user import User
from app.tests.conftest import auth_header


class TestListProducts:
    """Tests for GET /api/v1/products endpoint."""

    async def test_list_products_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_product: Product,
    ) -> None:
        """Test viewer can list products."""
        response = await client.get(
            "/api/v1/products",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    async def test_list_products_filter_active(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_product: Product,
    ) -> None:
        """Test filtering products by active status."""
        response = await client.get(
            "/api/v1/products?is_active=true",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        for item in data["items"]:
            assert item["is_active"] is True

    async def test_list_products_search(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_product: Product,
    ) -> None:
        """Test searching products."""
        response = await client.get(
            "/api/v1/products?search=Test",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_list_products_unauthenticated(
        self,
        client: AsyncClient,
    ) -> None:
        """Test unauthenticated user cannot list products."""
        response = await client.get("/api/v1/products")
        assert response.status_code == 401


class TestCreateProduct:
    """Tests for POST /api/v1/products endpoint."""

    async def test_create_product_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
    ) -> None:
        """Test manager can create product."""
        response = await client.post(
            "/api/v1/products",
            headers=auth_header(manager_token),
            json={
                "name": "Új Termék",
                "sku": "UJ-001",
                "category": "Teszt",
                "default_unit": "kg",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Új Termék"
        assert data["sku"] == "UJ-001"

    async def test_create_product_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
    ) -> None:
        """Test warehouse user cannot create product."""
        response = await client.post(
            "/api/v1/products",
            headers=auth_header(warehouse_token),
            json={"name": "Unauthorized Product"},
        )
        assert response.status_code == 403

    async def test_create_product_duplicate_sku(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_product: Product,
    ) -> None:
        """Test creating product with duplicate SKU returns 409."""
        response = await client.post(
            "/api/v1/products",
            headers=auth_header(admin_token),
            json={
                "name": "Duplicate SKU Product",
                "sku": "TEST-001",  # Same as sample_product
            },
        )
        assert response.status_code == 409

    async def test_create_product_short_name(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test creating product with too short name returns 422."""
        response = await client.post(
            "/api/v1/products",
            headers=auth_header(admin_token),
            json={"name": "A"},  # Too short
        )
        assert response.status_code == 422


class TestGetProduct:
    """Tests for GET /api/v1/products/{product_id} endpoint."""

    async def test_get_product_success(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_product: Product,
    ) -> None:
        """Test getting product by ID."""
        response = await client.get(
            f"/api/v1/products/{sample_product.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Product"

    async def test_get_product_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test getting non-existent product returns 404."""
        response = await client.get(
            f"/api/v1/products/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404


class TestUpdateProduct:
    """Tests for PUT /api/v1/products/{product_id} endpoint."""

    async def test_update_product_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_product: Product,
    ) -> None:
        """Test manager can update product."""
        response = await client.put(
            f"/api/v1/products/{sample_product.id}",
            headers=auth_header(manager_token),
            json={"name": "Updated Product Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Product Name"

    async def test_update_product_viewer(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_product: Product,
    ) -> None:
        """Test viewer cannot update product."""
        response = await client.put(
            f"/api/v1/products/{sample_product.id}",
            headers=auth_header(viewer_token),
            json={"name": "Unauthorized Update"},
        )
        assert response.status_code == 403


class TestDeleteProduct:
    """Tests for DELETE /api/v1/products/{product_id} endpoint."""

    async def test_delete_product_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_product: Product,
    ) -> None:
        """Test manager can delete product."""
        response = await client.delete(
            f"/api/v1/products/{sample_product.id}",
            headers=auth_header(manager_token),
        )
        assert response.status_code == 204

    async def test_delete_product_warehouse(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_product: Product,
    ) -> None:
        """Test warehouse user cannot delete product."""
        response = await client.delete(
            f"/api/v1/products/{sample_product.id}",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 403

    async def test_delete_product_not_found(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
    ) -> None:
        """Test deleting non-existent product returns 404."""
        response = await client.delete(
            f"/api/v1/products/{uuid.uuid4()}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404
