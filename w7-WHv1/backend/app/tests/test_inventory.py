"""Tests for inventory management endpoints (Phase 3)."""

import uuid
from datetime import date, timedelta

from httpx import AsyncClient

from app.core.i18n import HU_MESSAGES
from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.product import Product
from app.db.models.supplier import Supplier
from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.tests.conftest import auth_header


class TestReceiveGoods:
    """Tests for POST /api/v1/inventory/receive endpoint."""

    async def test_receive_goods_success(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin: Bin,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test receiving product into empty bin."""
        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(warehouse_token),
            json={
                "bin_id": str(sample_bin.id),
                "product_id": str(sample_product.id),
                "supplier_id": str(sample_supplier.id),
                "batch_number": "BATCH-001",
                "use_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "quantity": 100.0,
                "unit": "kg",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert "bin_content_id" in data
        assert "movement_id" in data
        assert float(data["quantity"]) == 100.0
        assert data["message"] == HU_MESSAGES["receipt_successful"]

    async def test_receive_goods_same_product_add_batch(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
        sample_bin: Bin,
        sample_product: Product,
    ) -> None:
        """Test adding same batch to bin with existing product."""
        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(warehouse_token),
            json={
                "bin_id": str(sample_bin.id),
                "product_id": str(sample_product.id),
                "batch_number": "BATCH-TEST-001",  # Same batch as existing
                "use_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "quantity": 50.0,
                "unit": "kg",
            },
        )
        assert response.status_code == 201
        data = response.json()
        # Should add to existing quantity (100 + 50 = 150)
        assert float(data["quantity"]) == 150.0

    async def test_receive_goods_different_product_reject(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
        sample_bin: Bin,
        sample_warehouse: Warehouse,
        db_session,
    ) -> None:
        """Test rejecting different product into occupied bin."""
        # Create a different product
        from datetime import UTC, datetime

        different_product = Product(
            id=uuid.uuid4(),
            name="Different Product",
            sku="DIFF-001",
            category="Other",
            default_unit="db",
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(different_product)
        await db_session.flush()

        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(warehouse_token),
            json={
                "bin_id": str(sample_bin.id),
                "product_id": str(different_product.id),
                "batch_number": "BATCH-DIFF-001",
                "use_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "quantity": 25.0,
                "unit": "db",
            },
        )
        assert response.status_code == 400
        assert HU_MESSAGES["bin_already_occupied"] in response.json()["detail"]

    async def test_receive_goods_inactive_bin_reject(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        inactive_bin: Bin,
        sample_product: Product,
    ) -> None:
        """Test rejecting receipt into inactive bin."""
        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(warehouse_token),
            json={
                "bin_id": str(inactive_bin.id),
                "product_id": str(sample_product.id),
                "batch_number": "BATCH-001",
                "use_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "quantity": 100.0,
                "unit": "kg",
            },
        )
        assert response.status_code == 400
        assert HU_MESSAGES["bin_inactive"] in response.json()["detail"]

    async def test_receive_goods_past_expiry_reject(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin: Bin,
        sample_product: Product,
    ) -> None:
        """Test rejecting receipt with past use_by_date."""
        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(warehouse_token),
            json={
                "bin_id": str(sample_bin.id),
                "product_id": str(sample_product.id),
                "batch_number": "BATCH-001",
                "use_by_date": (date.today() - timedelta(days=1)).isoformat(),
                "quantity": 100.0,
                "unit": "kg",
            },
        )
        assert response.status_code == 422  # Validation error

    async def test_receive_goods_warehouse_user(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin: Bin,
        sample_product: Product,
    ) -> None:
        """Test warehouse user can receive goods."""
        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(warehouse_token),
            json={
                "bin_id": str(sample_bin.id),
                "product_id": str(sample_product.id),
                "batch_number": "BATCH-WH-001",
                "use_by_date": (date.today() + timedelta(days=60)).isoformat(),
                "quantity": 50.0,
                "unit": "kg",
            },
        )
        assert response.status_code == 201

    async def test_receive_goods_viewer_forbidden(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin: Bin,
        sample_product: Product,
    ) -> None:
        """Test viewer cannot receive goods."""
        response = await client.post(
            "/api/v1/inventory/receive",
            headers=auth_header(viewer_token),
            json={
                "bin_id": str(sample_bin.id),
                "product_id": str(sample_product.id),
                "batch_number": "BATCH-001",
                "use_by_date": (date.today() + timedelta(days=30)).isoformat(),
                "quantity": 100.0,
                "unit": "kg",
            },
        )
        assert response.status_code == 403


class TestIssueGoods:
    """Tests for POST /api/v1/inventory/issue endpoint."""

    async def test_issue_goods_fefo_compliant(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test issuing oldest batch first (FEFO compliant)."""
        response = await client.post(
            "/api/v1/inventory/issue",
            headers=auth_header(warehouse_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "quantity": 25.0,
                "reason": "customer_order",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert float(data["quantity_issued"]) == 25.0
        assert float(data["remaining_quantity"]) == 75.0
        assert data["fefo_compliant"] is True
        assert data["message"] == HU_MESSAGES["issue_successful"]

    async def test_issue_goods_insufficient_quantity(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test rejecting issue when quantity exceeds available."""
        response = await client.post(
            "/api/v1/inventory/issue",
            headers=auth_header(warehouse_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "quantity": 999.0,  # More than available
                "reason": "customer_order",
            },
        )
        assert response.status_code == 400
        assert HU_MESSAGES["insufficient_quantity"] in response.json()["detail"]

    async def test_issue_goods_expired_reject(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content_expired: BinContent,
    ) -> None:
        """Test rejecting issue of expired stock."""
        response = await client.post(
            "/api/v1/inventory/issue",
            headers=auth_header(warehouse_token),
            json={
                "bin_content_id": str(sample_bin_content_expired.id),
                "quantity": 10.0,
                "reason": "customer_order",
            },
        )
        assert response.status_code == 400
        assert HU_MESSAGES["product_expired"] in response.json()["detail"]

    async def test_issue_goods_viewer_forbidden(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test viewer cannot issue goods."""
        response = await client.post(
            "/api/v1/inventory/issue",
            headers=auth_header(viewer_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "quantity": 10.0,
                "reason": "customer_order",
            },
        )
        assert response.status_code == 403

    async def test_issue_goods_full_quantity(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test issuing full quantity empties bin."""
        response = await client.post(
            "/api/v1/inventory/issue",
            headers=auth_header(warehouse_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "quantity": 100.0,  # Full quantity
                "reason": "customer_order",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert float(data["quantity_issued"]) == 100.0
        assert float(data["remaining_quantity"]) == 0.0


class TestFEFORecommendation:
    """Tests for GET /api/v1/inventory/fefo-recommendation endpoint."""

    async def test_fefo_recommendation_single_batch(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        sample_product: Product,
    ) -> None:
        """Test FEFO recommendation with single batch."""
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=50",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["product_id"] == str(sample_product.id)
        assert len(data["recommendations"]) >= 1
        assert float(data["total_available"]) >= 50

    async def test_fefo_recommendation_product_not_found(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
    ) -> None:
        """Test FEFO recommendation with non-existent product."""
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={uuid.uuid4()}&quantity=50",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 404


class TestStockLevels:
    """Tests for GET /api/v1/inventory/stock-levels endpoint."""

    async def test_stock_levels_aggregation(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        sample_product: Product,
    ) -> None:
        """Test correct quantity aggregation."""
        response = await client.get(
            "/api/v1/inventory/stock-levels",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the sample product
        product_stock = next((s for s in data if s["product_id"] == str(sample_product.id)), None)
        assert product_stock is not None
        assert float(product_stock["total_quantity"]) == 100.0

    async def test_stock_levels_filter_warehouse(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test filtering stock levels by warehouse."""
        response = await client.get(
            f"/api/v1/inventory/stock-levels?warehouse_id={sample_warehouse.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAdjustStock:
    """Tests for POST /api/v1/inventory/adjust endpoint."""

    async def test_adjust_stock_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test manager can adjust stock."""
        response = await client.post(
            "/api/v1/inventory/adjust",
            headers=auth_header(manager_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "new_quantity": 75.0,
                "reason": "inventory_count",
                "notes": "Physical count correction",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert float(data["quantity_before"]) == 100.0
        assert float(data["quantity_after"]) == 75.0

    async def test_adjust_stock_warehouse_forbidden(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test warehouse user cannot adjust stock."""
        response = await client.post(
            "/api/v1/inventory/adjust",
            headers=auth_header(warehouse_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "new_quantity": 75.0,
                "reason": "inventory_count",
            },
        )
        assert response.status_code == 403


class TestScrapStock:
    """Tests for POST /api/v1/inventory/scrap endpoint."""

    async def test_scrap_stock_manager(
        self,
        client: AsyncClient,
        manager_user: User,
        manager_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test manager can scrap stock."""
        response = await client.post(
            "/api/v1/inventory/scrap",
            headers=auth_header(manager_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "reason": "damaged",
                "notes": "Damaged during handling",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert float(data["quantity_scrapped"]) == 100.0

    async def test_scrap_stock_warehouse_forbidden(
        self,
        client: AsyncClient,
        warehouse_user: User,
        warehouse_token: str,
        sample_bin_content: BinContent,
    ) -> None:
        """Test warehouse user cannot scrap stock."""
        response = await client.post(
            "/api/v1/inventory/scrap",
            headers=auth_header(warehouse_token),
            json={
                "bin_content_id": str(sample_bin_content.id),
                "reason": "damaged",
            },
        )
        assert response.status_code == 403
