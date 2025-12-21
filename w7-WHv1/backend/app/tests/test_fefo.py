"""Tests for FEFO (First Expired, First Out) algorithm (Phase 3)."""

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


class TestFEFOSorting:
    """Tests for FEFO sorting algorithm."""

    async def test_fefo_sort_by_use_by_date(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test primary sort by use_by_date (earliest first)."""
        # Create bins with different expiry dates
        bins = []
        bin_contents = []
        expiry_dates = [
            date.today() + timedelta(days=60),  # Latest expiry
            date.today() + timedelta(days=30),  # Middle expiry
            date.today() + timedelta(days=10),  # Earliest expiry
        ]

        for i in range(len(expiry_dates)):
            bin_obj = Bin(
                id=uuid.uuid4(),
                warehouse_id=sample_warehouse.id,
                code=f"FEFO-{i:02d}",
                structure_data={"aisle": "F", "level": f"{i:02d}"},
                status="occupied",
                max_weight=1000.0,
                is_active=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(bin_obj)
            bins.append(bin_obj)

        await db_session.flush()

        for i, (bin_obj, expiry) in enumerate(zip(bins, expiry_dates, strict=True)):
            content = BinContent(
                id=uuid.uuid4(),
                bin_id=bin_obj.id,
                product_id=sample_product.id,
                supplier_id=sample_supplier.id,
                batch_number=f"BATCH-FEFO-{i:03d}",
                use_by_date=expiry,
                quantity=Decimal("50.0"),
                unit="kg",
                status="available",
                received_date=datetime.now(UTC),
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(content)
            bin_contents.append(content)

        await db_session.flush()

        # Request FEFO recommendation
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=100",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # First recommendation should be the one with earliest expiry (10 days)
        recommendations = data["recommendations"]
        assert len(recommendations) >= 2
        assert recommendations[0]["days_until_expiry"] <= recommendations[1]["days_until_expiry"]

    async def test_fefo_sort_by_batch_number(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test secondary sort by batch_number when same expiry."""
        # Create bins with same expiry but different batch numbers
        same_expiry = date.today() + timedelta(days=30)
        bins = []
        batch_numbers = ["BATCH-Z", "BATCH-A", "BATCH-M"]  # Unsorted

        for i in range(len(batch_numbers)):
            bin_obj = Bin(
                id=uuid.uuid4(),
                warehouse_id=sample_warehouse.id,
                code=f"BATCH-{i:02d}",
                structure_data={"aisle": "B", "level": f"{i:02d}"},
                status="occupied",
                max_weight=1000.0,
                is_active=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(bin_obj)
            bins.append(bin_obj)

        await db_session.flush()

        for bin_obj, batch in zip(bins, batch_numbers, strict=True):
            content = BinContent(
                id=uuid.uuid4(),
                bin_id=bin_obj.id,
                product_id=sample_product.id,
                supplier_id=sample_supplier.id,
                batch_number=batch,
                use_by_date=same_expiry,
                quantity=Decimal("25.0"),
                unit="kg",
                status="available",
                received_date=datetime.now(UTC),
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(content)

        await db_session.flush()

        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=50",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # With same expiry, should be sorted by batch_number ASC
        recommendations = data["recommendations"]
        assert len(recommendations) >= 2
        # First batch should be alphabetically first (BATCH-A)
        assert recommendations[0]["batch_number"] <= recommendations[1]["batch_number"]

    async def test_fefo_excludes_expired(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        sample_bin_content_expired: BinContent,
        sample_product: Product,
    ) -> None:
        """Test FEFO excludes already expired items."""
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=200",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Expired items should not be in recommendations
        for rec in data["recommendations"]:
            assert rec["days_until_expiry"] >= 0

    async def test_fefo_excludes_scrapped(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test FEFO excludes scrapped items."""
        # Create a scrapped bin content
        bin_obj = Bin(
            id=uuid.uuid4(),
            warehouse_id=sample_warehouse.id,
            code="SCRAP-01",
            structure_data={"aisle": "S", "level": "01"},
            status="occupied",
            max_weight=1000.0,
            is_active=True,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(bin_obj)
        await db_session.flush()

        scrapped_content = BinContent(
            id=uuid.uuid4(),
            bin_id=bin_obj.id,
            product_id=sample_product.id,
            supplier_id=sample_supplier.id,
            batch_number="BATCH-SCRAPPED",
            use_by_date=date.today() + timedelta(days=5),  # Earliest expiry
            quantity=Decimal("100.0"),
            unit="kg",
            status="scrapped",  # Scrapped status
            received_date=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(scrapped_content)
        await db_session.flush()

        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=50",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Scrapped batch should not be in recommendations
        for rec in data["recommendations"]:
            assert rec["batch_number"] != "BATCH-SCRAPPED"

    async def test_fefo_partial_quantity(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """Test FEFO recommends across multiple bins for partial quantity."""
        # Create multiple bins with small quantities
        for i in range(3):
            bin_obj = Bin(
                id=uuid.uuid4(),
                warehouse_id=sample_warehouse.id,
                code=f"PARTIAL-{i:02d}",
                structure_data={"aisle": "P", "level": f"{i:02d}"},
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
                batch_number=f"BATCH-PARTIAL-{i:03d}",
                use_by_date=date.today() + timedelta(days=30 + i * 10),
                quantity=Decimal("30.0"),  # Small quantity
                unit="kg",
                status="available",
                received_date=datetime.now(UTC),
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(content)

        await db_session.flush()

        # Request more than single bin has
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=75",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Should recommend from multiple bins
        assert len(data["recommendations"]) >= 2
        total_suggested = sum(float(rec["suggested_quantity"]) for rec in data["recommendations"])
        assert total_suggested >= 75 or total_suggested == float(data["total_available"])

    async def test_fefo_exact_quantity(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        sample_product: Product,
    ) -> None:
        """Test FEFO with exact quantity match."""
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=100",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Should have exactly the requested quantity
        total_suggested = sum(float(rec["suggested_quantity"]) for rec in data["recommendations"])
        assert total_suggested == 100.0

    async def test_fefo_insufficient_stock(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        sample_product: Product,
    ) -> None:
        """Test FEFO handles insufficient total stock gracefully."""
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=9999",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Should return all available, not error
        assert float(data["total_available"]) < 9999
        # Recommendations should sum to total_available
        total_suggested = sum(float(rec["suggested_quantity"]) for rec in data["recommendations"])
        assert total_suggested == float(data["total_available"])
