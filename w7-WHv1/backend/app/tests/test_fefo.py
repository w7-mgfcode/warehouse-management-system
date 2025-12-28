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

    async def test_fefo_sort_by_received_date(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """
        Test tertiary sort by received_date when use_by_date and batch_number are same.

        FEFO 3-level sort priority:
        1. use_by_date ASC (primary)
        2. batch_number ASC (secondary)
        3. received_date ASC (tertiary) ← THIS TEST
        """
        # Create 3 bins with IDENTICAL expiry AND batch, but different received_dates
        same_expiry = date.today() + timedelta(days=30)
        same_batch = "BATCH-IDENTICAL-001"

        received_dates = [
            datetime.now(UTC) - timedelta(days=20),  # Oldest (should be first)
            datetime.now(UTC) - timedelta(days=10),  # Middle
            datetime.now(UTC) - timedelta(days=5),  # Newest
        ]

        bins = []
        for i in range(3):
            bin_obj = Bin(
                id=uuid.uuid4(),
                warehouse_id=sample_warehouse.id,
                code=f"RCV-{i:02d}",
                structure_data={"aisle": "R", "level": f"{i:02d}"},
                status="occupied",
                max_weight=1000.0,
                is_active=True,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(bin_obj)
            bins.append(bin_obj)

        await db_session.flush()

        # Create bin_contents with same expiry, same batch, different received_dates
        for bin_obj, rcv_date in zip(bins, received_dates, strict=True):
            content = BinContent(
                id=uuid.uuid4(),
                bin_id=bin_obj.id,
                product_id=sample_product.id,
                supplier_id=sample_supplier.id,
                batch_number=same_batch,  # SAME batch
                use_by_date=same_expiry,  # SAME expiry
                quantity=Decimal("40.0"),
                unit="kg",
                status="available",
                received_date=rcv_date,  # DIFFERENT received dates
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(content)

        await db_session.flush()

        # Request FEFO recommendation for quantity that requires all 3 bins
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=100",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        recommendations = data["recommendations"]
        assert len(recommendations) == 3, "Should recommend from all 3 bins"

        # Verify chronological order by received_date (oldest first)
        # Since we can't directly see received_date in response, we verify via bin_code
        # which we created in chronological order
        assert recommendations[0]["bin_code"] == "RCV-00", "First should be oldest receipt"
        assert recommendations[1]["bin_code"] == "RCV-01", "Second should be middle receipt"
        assert recommendations[2]["bin_code"] == "RCV-02", "Third should be newest receipt"

        # All should have same expiry and batch
        for rec in recommendations:
            assert rec["batch_number"] == same_batch
            assert rec["use_by_date"] == same_expiry.isoformat()

    async def test_fefo_multi_bin_allocation(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """
        Test FEFO allocates across multiple bins when requested > single bin quantity.

        Scenario:
        - Bin 1: 30kg expiring in 10 days (use first)
        - Bin 2: 40kg expiring in 20 days (use second)
        - Bin 3: 50kg expiring in 30 days (use third)
        - Request: 100kg
        - Expected: Allocate 30 + 40 + 30 from bins 1, 2, 3
        """
        # Create 3 bins with different expiry dates and quantities
        bins_data = [
            {"days": 10, "qty": "30.0", "batch": "BATCH-A"},
            {"days": 20, "qty": "40.0", "batch": "BATCH-B"},
            {"days": 30, "qty": "50.0", "batch": "BATCH-C"},
        ]

        for i, data in enumerate(bins_data):
            bin_obj = Bin(
                id=uuid.uuid4(),
                warehouse_id=sample_warehouse.id,
                code=f"MULTI-{i:02d}",
                structure_data={"aisle": "M", "level": f"{i:02d}"},
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
                batch_number=data["batch"],
                use_by_date=date.today() + timedelta(days=data["days"]),
                quantity=Decimal(data["qty"]),
                unit="kg",
                status="available",
                received_date=datetime.now(UTC),
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            db_session.add(content)

        await db_session.flush()

        # Request 100kg (more than any single bin)
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=100",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        recommendations = data["recommendations"]
        assert len(recommendations) == 3, "Should allocate from all 3 bins"

        # Verify allocation order (FEFO: earliest expiry first)
        assert recommendations[0]["batch_number"] == "BATCH-A", "First: earliest expiry"
        assert recommendations[1]["batch_number"] == "BATCH-B", "Second: middle expiry"
        assert recommendations[2]["batch_number"] == "BATCH-C", "Third: latest expiry"

        # Verify suggested quantities
        assert float(recommendations[0]["suggested_quantity"]) == 30.0, "Use all of bin 1"
        assert float(recommendations[1]["suggested_quantity"]) == 40.0, "Use all of bin 2"
        assert float(recommendations[2]["suggested_quantity"]) == 30.0, "Use partial bin 3"

        # Verify total allocation
        total_suggested = sum(float(rec["suggested_quantity"]) for rec in recommendations)
        assert total_suggested == 100.0, "Total should equal requested quantity"

        # Verify available vs suggested
        assert float(recommendations[0]["available_quantity"]) == 30.0
        assert float(recommendations[1]["available_quantity"]) == 40.0
        assert float(recommendations[2]["available_quantity"]) == 50.0
        assert float(recommendations[2]["suggested_quantity"]) == 30.0, "Only partial from last"

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


class TestFEFOWarnings:
    """Tests for FEFO expiry warning generation."""

    async def test_fefo_critical_expiry_warning(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """
        Test FEFO includes CRITICAL warnings for items < 7 days until expiry.

        From fefo.py lines 105-106:
        if days_until_expiry < 7:
            warning = f"KRITIKUS! Lejárat {days_until_expiry} nap múlva"
        """
        # Create bin content with critical expiry (< 7 days)
        critical_days = 5  # Less than 7 days

        bin_obj = Bin(
            id=uuid.uuid4(),
            warehouse_id=sample_warehouse.id,
            code="CRIT-01",
            structure_data={"aisle": "C", "level": "01"},
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
            batch_number="BATCH-CRITICAL-001",
            use_by_date=date.today() + timedelta(days=critical_days),
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
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=30",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Check recommendation-level warning
        recommendations = data["recommendations"]
        assert len(recommendations) == 1
        rec = recommendations[0]

        assert rec["days_until_expiry"] == critical_days
        assert rec["warning"] is not None, "Should have warning"
        assert "KRITIKUS" in rec["warning"], "Should be critical warning"
        assert str(critical_days) in rec["warning"], "Should include days count"

        # Check response-level fefo_warnings list
        fefo_warnings = data["fefo_warnings"]
        assert len(fefo_warnings) > 0, "Should have FEFO warnings"

        # From fefo.py line 132: "KRITIKUS: A legrégebbi tétel 7 napon belül lejár!"
        critical_found = any("KRITIKUS" in w for w in fefo_warnings)
        assert critical_found, "Should have critical warning in fefo_warnings list"

        seven_days_found = any("7 napon belül" in w for w in fefo_warnings)
        assert seven_days_found, "Should mention 7 days threshold"

    async def test_fefo_high_urgency_warning(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
    ) -> None:
        """
        Test FEFO includes HIGH urgency warnings for items 7-14 days until expiry.

        From fefo.py lines 107-108:
        elif days_until_expiry < 14:
            warning = f"Figyelem! Lejárat {days_until_expiry} nap múlva"
        """
        # Create bin content with high urgency expiry (7 <= days < 14)
        high_urgency_days = 10  # Between 7 and 14 days

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
            use_by_date=date.today() + timedelta(days=high_urgency_days),
            quantity=Decimal("60.0"),
            unit="kg",
            status="available",
            received_date=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(content)
        await db_session.flush()

        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=40",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()

        # Check recommendation-level warning
        recommendations = data["recommendations"]
        assert len(recommendations) == 1
        rec = recommendations[0]

        assert rec["days_until_expiry"] == high_urgency_days
        assert rec["warning"] is not None, "Should have warning"
        assert "Figyelem" in rec["warning"], "Should be high urgency (Figyelem)"
        assert "KRITIKUS" not in rec["warning"], "Should NOT be critical"
        assert str(high_urgency_days) in rec["warning"], "Should include days count"

        # Check response-level fefo_warnings list
        fefo_warnings = data["fefo_warnings"]
        assert len(fefo_warnings) > 0, "Should have FEFO warnings"

        # From fefo.py line 134: "FIGYELEM: A legrégebbi tétel 14 napon belül lejár!"
        high_found = any("FIGYELEM" in w for w in fefo_warnings)
        assert high_found, "Should have high urgency warning in fefo_warnings list"

        fourteen_days_found = any("14 napon belül" in w for w in fefo_warnings)
        assert fourteen_days_found, "Should mention 14 days threshold"

        # Ensure it's not critical
        critical_found = any("KRITIKUS" in w for w in fefo_warnings)
        assert not critical_found, "Should NOT have critical warning for 10 days"


class TestFEFOEdgeCases:
    """Tests for FEFO edge cases and error handling."""

    async def test_fefo_no_stock_available(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_product: Product,
    ) -> None:
        """
        Test FEFO gracefully handles request when no stock exists for product.

        Expected behavior (from fefo.py lines 78-87):
        - Returns empty recommendations list
        - total_available = 0
        - No error thrown
        """
        # No test data creation needed - sample_product exists but has no bin_contents
        # This tests the case where product exists but has zero inventory

        # Test 1: Product exists but has no inventory
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={sample_product.id}&quantity=100",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200, "Should succeed even with no stock"
        data = response.json()

        # Verify graceful empty response
        assert data["product_id"] == str(sample_product.id)
        assert data["product_name"] == sample_product.name
        assert data["sku"] == sample_product.sku
        assert float(data["requested_quantity"]) == 100.0

        # Empty results
        assert data["recommendations"] == [], "Should return empty list"
        assert float(data["total_available"]) == 0.0, "Should show zero availability"
        assert data["fefo_warnings"] == [], "Should have no warnings"

        # Test 2: Non-existent product should return 404
        fake_product_id = uuid.uuid4()
        response_404 = await client.get(
            f"/api/v1/inventory/fefo-recommendation?product_id={fake_product_id}&quantity=100",
            headers=auth_header(viewer_token),
        )
        assert response_404.status_code == 404, "Non-existent product should return 404"
        error_data = response_404.json()

        # From fefo.py line 56: raises ValueError(HU_MESSAGES["product_not_found"])
        # API converts to 404 (inventory.py line 131-133)
        from app.core.i18n import HU_MESSAGES

        assert HU_MESSAGES["product_not_found"] in error_data["detail"]
