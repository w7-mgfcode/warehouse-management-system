"""
Integration tests for multi-service workflows.

Tests complete workflows that span multiple API endpoints and
verify the system works correctly end-to-end.
"""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.bin_movement import BinMovement
from app.db.models.product import Product
from app.db.models.stock_reservation import StockReservation
from app.db.models.supplier import Supplier
from app.db.models.user import User
from app.db.models.warehouse import Warehouse
from app.tests.conftest import auth_header


@pytest.mark.asyncio
class TestInventoryWorkflow:
    """Test complete inventory receipt → FEFO issue workflow."""

    async def test_complete_inventory_workflow(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        warehouse_token: str,
        warehouse_user: User,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
        sample_bin: Bin,
    ):
        """
        Test complete inventory workflow:
        1. Receive goods into bin
        2. Check FEFO recommendation
        3. Issue goods from bin
        4. Verify movement audit trail
        """
        # Step 1: Receive goods (create bin content)
        receipt_data = {
            "bin_id": str(sample_bin.id),
            "product_id": str(sample_product.id),
            "supplier_id": str(sample_supplier.id),
            "batch_number": "BATCH-INT-001",
            "use_by_date": str(date.today() + timedelta(days=30)),
            "quantity": 100.0,
            "unit": "kg",
            "reference_number": "REF-INT-001",
            "notes": "Integration test receipt",
        }

        response = await client.post(
            "/api/v1/inventory/receive",
            json=receipt_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 201
        receipt_result = response.json()
        bin_content_id = receipt_result["bin_content_id"]

        # Verify bin status updated to occupied
        result = await db_session.execute(select(Bin).where(Bin.id == sample_bin.id))
        updated_bin = result.scalar_one()
        assert updated_bin.status == "occupied"

        # Verify movement audit created
        result = await db_session.execute(
            select(BinMovement).where(BinMovement.bin_content_id == uuid.UUID(bin_content_id))
        )
        movements = result.scalars().all()
        assert len(movements) == 1
        assert movements[0].movement_type == "receipt"
        assert movements[0].quantity == Decimal("100.0")

        # Step 2: Check FEFO recommendation
        response = await client.get(
            f"/api/v1/inventory/fefo-recommendation?warehouse_id={sample_warehouse.id}&product_id={sample_product.id}&quantity=50",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        fefo_result = response.json()
        assert len(fefo_result["items"]) == 1
        assert fefo_result["items"][0]["bin_content_id"] == bin_content_id
        assert fefo_result["is_fefo_compliant"] is True

        # Step 3: Issue goods
        issue_data = {
            "warehouse_id": str(sample_warehouse.id),
            "product_id": str(sample_product.id),
            "quantity": 50.0,
            "reference_number": "REF-INT-ISSUE-001",
            "notes": "Integration test issue",
        }

        response = await client.post(
            "/api/v1/inventory/issue",
            json=issue_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        issue_result = response.json()
        assert issue_result["issued_quantity"] == 50.0
        assert issue_result["is_fefo_compliant"] is True

        # Verify remaining stock
        result = await db_session.execute(
            select(BinContent).where(BinContent.id == uuid.UUID(bin_content_id))
        )
        updated_content = result.scalar_one()
        assert updated_content.quantity == Decimal("50.0")

        # Step 4: Verify complete movement audit trail
        result = await db_session.execute(
            select(BinMovement)
            .where(BinMovement.bin_content_id == uuid.UUID(bin_content_id))
            .order_by(BinMovement.created_at)
        )
        movements = result.scalars().all()
        assert len(movements) == 2
        assert movements[0].movement_type == "receipt"
        assert movements[0].quantity == Decimal("100.0")
        assert movements[1].movement_type == "issue"
        assert movements[1].quantity == Decimal("50.0")
        assert movements[1].quantity_after == Decimal("50.0")


@pytest.mark.asyncio
class TestTransferWorkflow:
    """Test complete warehouse transfer workflow."""

    async def test_same_warehouse_transfer_workflow(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        warehouse_token: str,
        warehouse_user: User,
        sample_bin_content: BinContent,
        second_bin: Bin,
    ):
        """
        Test same-warehouse transfer:
        1. Create transfer
        2. Dispatch transfer
        3. Confirm receipt
        4. Verify stock moved
        """
        # Step 1: Create transfer
        transfer_data = {
            "from_bin_id": str(sample_bin_content.bin_id),
            "to_bin_id": str(second_bin.id),
            "quantity": 50.0,
            "notes": "Integration test transfer",
        }

        response = await client.post(
            "/api/v1/transfers",
            json=transfer_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 201
        transfer_result = response.json()
        transfer_id = transfer_result["id"]
        assert transfer_result["status"] == "pending"

        # Step 2: Dispatch transfer
        response = await client.post(
            f"/api/v1/transfers/{transfer_id}/dispatch",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        dispatch_result = response.json()
        assert dispatch_result["status"] == "dispatched"

        # Verify source bin content reduced
        result = await db_session.execute(
            select(BinContent).where(BinContent.id == sample_bin_content.id)
        )
        source_content = result.scalar_one()
        assert source_content.quantity == Decimal("50.0")  # 100 - 50

        # Step 3: Confirm receipt
        response = await client.post(
            f"/api/v1/transfers/{transfer_id}/confirm",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        confirm_result = response.json()
        assert confirm_result["status"] == "confirmed"

        # Step 4: Verify destination bin content created
        result = await db_session.execute(
            select(BinContent).where(BinContent.bin_id == second_bin.id)
        )
        dest_content = result.scalar_one()
        assert dest_content.quantity == Decimal("50.0")
        assert dest_content.product_id == sample_bin_content.product_id
        assert dest_content.batch_number == sample_bin_content.batch_number

        # Verify destination bin status updated
        result = await db_session.execute(select(Bin).where(Bin.id == second_bin.id))
        dest_bin = result.scalar_one()
        assert dest_bin.status == "occupied"


@pytest.mark.asyncio
class TestReservationWorkflow:
    """Test complete stock reservation workflow."""

    async def test_reservation_with_fefo_workflow(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        warehouse_token: str,
        warehouse_user: User,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_bin_content: BinContent,
    ):
        """
        Test reservation workflow:
        1. Create reservation (FEFO allocation)
        2. Verify items reserved
        3. Fulfill reservation
        4. Verify stock reduced
        """
        # Step 1: Create reservation
        reservation_data = {
            "customer_name": "Test Customer",
            "warehouse_id": str(sample_warehouse.id),
            "items": [
                {
                    "product_id": str(sample_product.id),
                    "quantity": 30.0,
                }
            ],
            "expiry_date": str(date.today() + timedelta(days=7)),
            "notes": "Integration test reservation",
        }

        response = await client.post(
            "/api/v1/reservations",
            json=reservation_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 201
        reservation_result = response.json()
        reservation_id = reservation_result["id"]
        assert reservation_result["status"] == "pending"
        assert len(reservation_result["items"]) == 1

        # Step 2: Verify items reserved in database
        result = await db_session.execute(
            select(StockReservation).where(StockReservation.id == uuid.UUID(reservation_id))
        )
        reservation = result.scalar_one()
        assert len(reservation.items) == 1
        assert reservation.items[0].quantity == Decimal("30.0")
        assert reservation.items[0].bin_content_id == sample_bin_content.id

        # Verify bin content status updated
        result = await db_session.execute(
            select(BinContent).where(BinContent.id == sample_bin_content.id)
        )
        content = result.scalar_one()
        assert content.status == "reserved"

        # Step 3: Fulfill reservation
        response = await client.post(
            f"/api/v1/reservations/{reservation_id}/fulfill",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        fulfill_result = response.json()
        assert fulfill_result["status"] == "fulfilled"

        # Step 4: Verify stock reduced
        result = await db_session.execute(
            select(BinContent).where(BinContent.id == sample_bin_content.id)
        )
        updated_content = result.scalar_one()
        assert updated_content.quantity == Decimal("70.0")  # 100 - 30
        assert updated_content.status == "available"


@pytest.mark.asyncio
class TestExpiryWarningSystem:
    """Test expiry warning system integration."""

    async def test_expiry_warnings_and_expired_items(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        warehouse_token: str,
        sample_warehouse: Warehouse,
        sample_bin_content_expired: BinContent,
        sample_bin_content_critical_expiry: BinContent,
    ):
        """
        Test expiry warning system:
        1. Get expiry warnings (critical + warning)
        2. Get expired items
        3. Verify urgency levels
        """
        # Step 1: Get expiry warnings
        response = await client.get(
            f"/api/v1/inventory/expiry-warnings?warehouse_id={sample_warehouse.id}",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        warnings_result = response.json()

        # Should have at least 1 critical warning (< 7 days)
        critical_warnings = [
            w for w in warnings_result["items"] if w["urgency"] == "critical"
        ]
        assert len(critical_warnings) >= 1

        # Step 2: Get expired items
        response = await client.get(
            f"/api/v1/inventory/expired?warehouse_id={sample_warehouse.id}",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        expired_result = response.json()

        # Should have at least 1 expired item
        assert len(expired_result["items"]) >= 1
        assert expired_result["items"][0]["id"] == str(sample_bin_content_expired.id)


@pytest.mark.asyncio
class TestCrossWarehouseTransfer:
    """Test cross-warehouse transfer workflow."""

    async def test_cross_warehouse_transfer_workflow(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        warehouse_token: str,
        warehouse_user: User,
        sample_warehouse: Warehouse,
        sample_bin_content: BinContent,
        sample_product: Product,
    ):
        """
        Test cross-warehouse transfer:
        1. Create second warehouse and bin
        2. Create cross-warehouse transfer
        3. Dispatch from source
        4. Confirm at destination
        5. Verify stock moved between warehouses
        """
        # Step 1: Create second warehouse
        warehouse2_data = {
            "name": "Test Warehouse 2",
            "location": "Test Location 2",
            "bin_structure_template": {
                "fields": [
                    {"name": "aisle", "label": "Sor", "required": True, "order": 1},
                ],
                "code_format": "{aisle}",
                "separator": "-",
                "auto_uppercase": True,
            },
        }

        response = await client.post(
            "/api/v1/warehouses",
            json=warehouse2_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 201
        warehouse2 = response.json()
        warehouse2_id = warehouse2["id"]

        # Create bin in second warehouse
        bin2_data = {
            "warehouse_id": warehouse2_id,
            "code": "X",
            "structure_data": {"aisle": "X"},
            "max_weight": 1000.0,
        }

        response = await client.post(
            "/api/v1/bins",
            json=bin2_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 201
        bin2 = response.json()
        bin2_id = bin2["id"]

        # Step 2: Create cross-warehouse transfer
        transfer_data = {
            "from_warehouse_id": str(sample_warehouse.id),
            "to_warehouse_id": warehouse2_id,
            "from_bin_id": str(sample_bin_content.bin_id),
            "to_bin_id": bin2_id,
            "quantity": 40.0,
            "notes": "Cross-warehouse integration test",
        }

        response = await client.post(
            "/api/v1/transfers/cross-warehouse",
            json=transfer_data,
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 201
        transfer_result = response.json()
        transfer_id = transfer_result["id"]
        assert transfer_result["status"] == "pending"

        # Step 3: Dispatch from source
        response = await client.post(
            f"/api/v1/transfers/{transfer_id}/dispatch",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200

        # Verify source quantity reduced
        result = await db_session.execute(
            select(BinContent).where(BinContent.id == sample_bin_content.id)
        )
        source_content = result.scalar_one()
        assert source_content.quantity == Decimal("60.0")  # 100 - 40

        # Step 4: Confirm at destination
        response = await client.post(
            f"/api/v1/transfers/{transfer_id}/confirm",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200

        # Step 5: Verify destination bin content created
        result = await db_session.execute(
            select(BinContent).where(BinContent.bin_id == uuid.UUID(bin2_id))
        )
        dest_content = result.scalar_one()
        assert dest_content.quantity == Decimal("40.0")
        assert dest_content.product_id == sample_bin_content.product_id


@pytest.mark.asyncio
class TestStockLevelAggregation:
    """Test stock level aggregation across bins."""

    async def test_stock_level_aggregation_by_warehouse_and_product(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        warehouse_token: str,
        sample_warehouse: Warehouse,
        sample_product: Product,
        sample_supplier: Supplier,
        sample_bin: Bin,
        second_bin: Bin,
    ):
        """
        Test stock level aggregation:
        1. Create multiple bin contents with same product
        2. Query stock levels
        3. Verify aggregation by warehouse and product
        """
        # Step 1: Create bin contents in different bins
        bin_content_1 = BinContent(
            id=uuid.uuid4(),
            bin_id=sample_bin.id,
            product_id=sample_product.id,
            supplier_id=sample_supplier.id,
            batch_number="BATCH-AGG-001",
            use_by_date=date.today() + timedelta(days=30),
            quantity=Decimal("100.0"),
            unit="kg",
            status="available",
            received_date=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(bin_content_1)

        bin_content_2 = BinContent(
            id=uuid.uuid4(),
            bin_id=second_bin.id,
            product_id=sample_product.id,
            supplier_id=sample_supplier.id,
            batch_number="BATCH-AGG-002",
            use_by_date=date.today() + timedelta(days=45),
            quantity=Decimal("150.0"),
            unit="kg",
            status="available",
            received_date=datetime.now(UTC),
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(bin_content_2)

        await db_session.flush()

        # Step 2: Query stock levels
        response = await client.get(
            f"/api/v1/inventory/stock-levels?warehouse_id={sample_warehouse.id}&product_id={sample_product.id}",
            headers=auth_header(warehouse_token),
        )
        assert response.status_code == 200
        stock_result = response.json()

        # Step 3: Verify aggregation
        assert len(stock_result["items"]) >= 1
        product_stock = next(
            (item for item in stock_result["items"] if item["product_id"] == str(sample_product.id)),
            None,
        )
        assert product_stock is not None
        assert product_stock["total_quantity"] == 250.0  # 100 + 150
