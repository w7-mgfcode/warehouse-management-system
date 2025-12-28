"""Tests for movement history endpoints (Phase 3)."""

import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.i18n import HU_MESSAGES
from app.db.models.bin import Bin
from app.db.models.bin_content import BinContent
from app.db.models.bin_movement import BinMovement
from app.db.models.product import Product
from app.db.models.user import User
from app.tests.conftest import auth_header


class TestListMovements:
    """Tests for GET /api/v1/movements endpoint."""

    async def test_list_movements_success(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
    ) -> None:
        """Test listing all movements."""
        response = await client.get(
            "/api/v1/movements",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1

    async def test_list_movements_filter_product(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
        sample_product: Product,
    ) -> None:
        """Test filtering movements by product."""
        response = await client.get(
            f"/api/v1/movements?product_id={sample_product.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)

    async def test_list_movements_filter_bin(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
        sample_bin: Bin,
    ) -> None:
        """Test filtering movements by bin."""
        response = await client.get(
            f"/api/v1/movements?bin_id={sample_bin.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)

    async def test_list_movements_filter_type(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
    ) -> None:
        """Test filtering movements by type."""
        response = await client.get(
            "/api/v1/movements?movement_type=receipt",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)
        # All returned items should be receipts
        for item in data["items"]:
            assert item["movement_type"] == "receipt"

    async def test_list_movements_filter_date_range(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
    ) -> None:
        """Test filtering movements by date range."""
        today = date.today()
        yesterday = today - timedelta(days=1)
        tomorrow = today + timedelta(days=1)

        response = await client.get(
            f"/api/v1/movements?start_date={yesterday.isoformat()}&end_date={tomorrow.isoformat()}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)

    async def test_list_movements_filter_user(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
        warehouse_user: User,
    ) -> None:
        """Test filtering movements by created_by user."""
        response = await client.get(
            f"/api/v1/movements?created_by={warehouse_user.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["items"], list)

    async def test_list_movements_pagination(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        warehouse_user: User,
    ) -> None:
        """Test movements pagination."""
        # Create multiple movements
        for i in range(5):
            movement = BinMovement(
                id=uuid.uuid4(),
                bin_content_id=sample_bin_content.id,
                movement_type="adjustment",
                quantity=Decimal(str(i + 1)),
                quantity_before=Decimal("100.0"),
                quantity_after=Decimal("100.0"),
                reason="test_pagination",
                created_by=warehouse_user.id,
                created_at=datetime.now(UTC),
            )
            db_session.add(movement)
        await db_session.flush()

        # Request page 1 with small page size
        response = await client.get(
            "/api/v1/movements?page=1&page_size=2",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["items"]) <= 2
        assert data["pages"] >= 1


class TestGetMovement:
    """Tests for GET /api/v1/movements/{id} endpoint."""

    async def test_get_movement_by_id(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
        sample_movement: BinMovement,
    ) -> None:
        """Test getting movement by ID."""
        response = await client.get(
            f"/api/v1/movements/{sample_movement.id}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(sample_movement.id)
        assert data["movement_type"] == "receipt"
        assert float(data["quantity"]) == 100.0

    async def test_get_movement_not_found(
        self,
        client: AsyncClient,
        viewer_user: User,
        viewer_token: str,
    ) -> None:
        """Test 404 for non-existent movement ID."""
        response = await client.get(
            f"/api/v1/movements/{uuid.uuid4()}",
            headers=auth_header(viewer_token),
        )
        assert response.status_code == 404
        assert HU_MESSAGES["movement_not_found"] in response.json()["detail"]


class TestMovementImmutability:
    """Tests for movement record immutability."""

    async def test_movements_no_update_endpoint(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_movement: BinMovement,
    ) -> None:
        """Test that movements cannot be updated (no PUT endpoint)."""
        response = await client.put(
            f"/api/v1/movements/{sample_movement.id}",
            headers=auth_header(admin_token),
            json={
                "quantity": 999.0,
                "reason": "hacked",
            },
        )
        # Should return 405 Method Not Allowed or 404 Not Found
        assert response.status_code in [404, 405]

    async def test_movements_no_delete_endpoint(
        self,
        client: AsyncClient,
        admin_user: User,
        admin_token: str,
        sample_movement: BinMovement,
    ) -> None:
        """Test that movements cannot be deleted (no DELETE endpoint)."""
        response = await client.delete(
            f"/api/v1/movements/{sample_movement.id}",
            headers=auth_header(admin_token),
        )
        # Should return 405 Method Not Allowed or 404 Not Found
        assert response.status_code in [404, 405]


class TestMovementUserInfo:
    """Tests for movement user attribution."""

    async def test_movement_user_attribution(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        viewer_user: User,
        viewer_token: str,
        sample_bin_content: BinContent,
        warehouse_user: User,
    ) -> None:
        """
        Test that movement records include created_by user information.

        Verifies:
        1. Movement record stores created_by user_id
        2. GET /movements includes user info in response
        3. GET /movements/{id} includes user info in response

        From movement.py line 228: created_by=user.username
        """
        # Create a movement record with known user
        movement = BinMovement(
            id=uuid.uuid4(),
            bin_content_id=sample_bin_content.id,
            movement_type="adjustment",
            quantity=Decimal("25.0"),
            quantity_before=Decimal("100.0"),
            quantity_after=Decimal("125.0"),
            reason="test_user_attribution",
            reference_number="REF-USER-TEST-001",
            notes="Testing user attribution in movements",
            created_by=warehouse_user.id,  # Explicitly set user
            created_at=datetime.now(UTC),
        )
        db_session.add(movement)
        await db_session.flush()
        await db_session.refresh(movement)

        # Test 1: GET /movements - list includes user info
        list_response = await client.get(
            "/api/v1/movements",
            headers=auth_header(viewer_token),
        )
        assert list_response.status_code == 200
        list_data = list_response.json()

        # Find our movement in the list
        our_movement = None
        for item in list_data["items"]:
            if item["id"] == str(movement.id):
                our_movement = item
                break

        assert our_movement is not None, "Movement should be in list"

        # Verify user attribution
        assert "created_by" in our_movement, "Should include created_by field"
        assert our_movement["created_by"] == warehouse_user.username, (
            "Should show username, not user_id"
        )
        assert "created_at" in our_movement, "Should include created_at timestamp"

        # Test 2: GET /movements/{id} - detail includes user info
        detail_response = await client.get(
            f"/api/v1/movements/{movement.id}",
            headers=auth_header(viewer_token),
        )
        assert detail_response.status_code == 200
        detail_data = detail_response.json()

        # Verify user attribution in detail response
        assert detail_data["id"] == str(movement.id)
        assert detail_data["created_by"] == warehouse_user.username, (
            "Detail should show username"
        )
        assert detail_data["created_at"] is not None

        # Verify other movement fields are correct
        assert detail_data["movement_type"] == "adjustment"
        assert float(detail_data["quantity"]) == 25.0
        assert float(detail_data["quantity_before"]) == 100.0
        assert float(detail_data["quantity_after"]) == 125.0
        assert detail_data["reason"] == "test_user_attribution"
        assert detail_data["reference_number"] == "REF-USER-TEST-001"

        # Test 3: Verify user filter works
        filter_response = await client.get(
            f"/api/v1/movements?created_by={warehouse_user.id}",
            headers=auth_header(viewer_token),
        )
        assert filter_response.status_code == 200
        filter_data = filter_response.json()

        # All returned movements should be by warehouse_user
        for item in filter_data["items"]:
            assert item["created_by"] == warehouse_user.username, (
                "Filtered results should only include warehouse_user movements"
            )
