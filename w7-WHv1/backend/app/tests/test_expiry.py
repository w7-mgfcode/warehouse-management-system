"""Tests for expiry warning endpoints (Phase 3)."""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.product import Product
from app.db.models.supplier import Supplier
from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.tests.conftest import auth_header


class TestExpiryWarnings:
    """Tests for GET /api/v1/inventory/expiry-warnings endpoint."""

    async def test_expiry_warnings_critical(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_critical_expiry: BinContent,
    ) -> None:
        """Test items < 7 days are flagged as critical."""
        response = await client.get(
            "/api/v1/inventory/expiry-warnings?days_threshold=30",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "summary" in data

        # Check critical item is present
        critical_items = [item for item in data["items"] if item["urgency"] == "critical"]
        assert len(critical_items) >= 1

    async def test_expiry_warnings_high(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test items 7-14 days are flagged as high urgency."""
        # Create bin content expiring in 10 days (high urgency)
        bin_obj = Bin(
            id=uuid.uuid4(),
            warehouse_id=sample_warehouse.id,
            code="HIGH-01",
            structure_data={"aisle": "H", "level": "01"},
            status="occupied",
            max_weight=1000.0,
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(bin_obj)
        await db_session.flush()

        content = BinContent(
            id=uuid.uuid4(),
            bin_id=bin_obj.id,
            product_id=sample_product.id,
            supplier_id=sample_supplier.id,
            batch_number="BATCH-HIGH-001",
            use_by_date=date.today() + timedelta(days=10),
            quantity=Decimal("50.0"),
            unit="kg",
            status="available",
            received_date=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(content)
        await db_session.flush()

        response = await client.get(
            "/api/v1/inventory/expiry-warnings?days_threshold=30",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Check high urgency item is present
        high_items = [item for item in data["items"] if item["urgency"] == "high"]
        assert len(high_items) >= 1

    async def test_expiry_warnings_medium(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test items 15-30 days are flagged as medium urgency."""
        # Create bin content expiring in 20 days (medium urgency)
        bin_obj = Bin(
            id=uuid.uuid4(),
            warehouse_id=sample_warehouse.id,
            code="MED-01",
            structure_data={"aisle": "M", "level": "01"},
            status="occupied",
            max_weight=1000.0,
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(bin_obj)
        await db_session.flush()

        content = BinContent(
            id=uuid.uuid4(),
            bin_id=bin_obj.id,
            product_id=sample_product.id,
            supplier_id=sample_supplier.id,
            batch_number="BATCH-MED-001",
            use_by_date=date.today() + timedelta(days=20),
            quantity=Decimal("50.0"),
            unit="kg",
            status="available",
            received_date=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(content)
        await db_session.flush()

        response = await client.get(
            "/api/v1/inventory/expiry-warnings?days_threshold=30",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Check medium urgency item is present
        medium_items = [item for item in data["items"] if item["urgency"] == "medium"]
        assert len(medium_items) >= 1

    async def test_expiry_warnings_summary(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_critical_expiry: BinContent,
    ) -> None:
        """Test summary counts are correct."""
        response = await client.get(
            "/api/v1/inventory/expiry-warnings?days_threshold=30",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        summary = data["summary"]
        assert "critical" in summary
        assert "high" in summary
        assert "medium" in summary
        assert "low" in summary
        assert "total" in summary

        # Total should equal sum of all categories
        calculated_total = (
            summary["critical"] + summary["high"] + summary["medium"] + summary["low"]
        )
        assert summary["total"] == calculated_total
        assert len(data["items"]) == summary["total"]

    async def test_expiry_warnings_filter_warehouse(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_critical_expiry: BinContent,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test filtering expiry warnings by warehouse."""
        response = await client.get(
            f"/api/v1/inventory/expiry-warnings?warehouse_id={sample_warehouse.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["warehouse_id"] == str(sample_warehouse.id)

    async def test_expiry_warnings_custom_threshold(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,  # 30 days expiry
    ) -> None:
        """Test custom days_threshold parameter."""
        # With 7 day threshold, 30-day item should not appear
        response = await client.get(
            "/api/v1/inventory/expiry-warnings?days_threshold=7",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Item with 30 days expiry should not be in 7-day warning list
        for item in data["items"]:
            assert item["days_until_expiry"] <= 7


class TestExpiredProducts:
    """Tests for GET /api/v1/inventory/expired endpoint."""

    async def test_expired_products_list(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_expired: BinContent,
    ) -> None:
        """Test listing already expired products."""
        response = await client.get(
            "/api/v1/inventory/expired",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

        # All items should have negative or zero days (expired)
        for item in data["items"]:
            assert item["days_since_expiry"] >= 0

    async def test_expired_products_filter_warehouse(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_expired: BinContent,
        sample_warehouse: Warehouse,
    ) -> None:
        """Test filtering expired products by warehouse."""
        response = await client.get(
            f"/api/v1/inventory/expired?warehouse_id={sample_warehouse.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["warehouse_id"] == str(sample_warehouse.id)

    async def test_expired_products_days_since(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_expired: BinContent,
    ) -> None:
        """Test days_since_expiry is calculated correctly."""
        response = await client.get(
            "/api/v1/inventory/expired",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        for item in data["items"]:
            # days_since_expiry should be positive integer
            assert isinstance(item["days_since_expiry"], int)
            assert item["days_since_expiry"] >= 0

    async def test_expired_products_action_required(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content_expired: BinContent,
    ) -> None:
        """Test action_required message is present."""
        response = await client.get(
            "/api/v1/inventory/expired",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        for item in data["items"]:
            assert "action_required" in item
            assert item["action_required"]  # Should not be empty
