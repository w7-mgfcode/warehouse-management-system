# WMS Phase 4: Testing Guide

**Version**: 4.0
**Last Updated**: December 2025

## Overview

Phase 4 extends the test suite with patterns for testing **stock reservations, warehouse transfers, and background jobs**. This guide covers test fixtures, patterns, and best practices for Phase 4 features.

### Test Summary

| Category | Test File | Tests | Coverage |
|----------|-----------|-------|----------|
| Transfers | `test_transfers.py` | TBD | Same-warehouse, cross-warehouse workflows |
| Reservations | `test_reservations.py` | TBD | FEFO allocation, fulfill, cancel |
| Jobs | `test_jobs.py` | TBD | Job triggers, execution logging |
| **Phase 4 Total** | - | TBD | ~85% target |

### Cumulative Test Count

| Phase | Tests | Running Total |
|-------|-------|---------------|
| Phase 1 | 40 | 40 |
| Phase 2 | 48 | 88 |
| Phase 3 | 48 | 136 |
| Phase 4 (new API tests) | 4 | 140 |

---

## Test Environment Setup

### Prerequisites

```bash
# Activate virtual environment
source venv_linux/bin/activate

# Install dependencies
pip install pytest pytest-asyncio pytest-cov factory-boy

# Run tests
cd w7-WHv1/backend
pytest -v
```

### Test Database

Tests use **SQLite in-memory** database (no Docker required):

```python
# conftest.py
@pytest.fixture
async def db():
    """Create in-memory SQLite database for tests."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSession(engine) as session:
        yield session
```

---

## Phase 4 Fixtures

### New Fixtures Added to conftest.py

```python
@pytest.fixture
async def reservation_fixture(
    db: AsyncSession,
    product_fixture: Product,
    bin_content_fixture: BinContent,
    user_fixture: User,
) -> StockReservation:
    """
    Create a stock reservation with one item.

    Returns:
        StockReservation: Active reservation with allocated item.
    """
    reservation = StockReservation(
        product_id=product_fixture.id,
        order_reference="ORD-TEST-001",
        customer_name="Test Customer Kft.",
        total_quantity=Decimal("50.00"),
        reserved_until=datetime.now(UTC) + timedelta(hours=24),
        status="active",
        created_by=user_fixture.id,
    )
    db.add(reservation)
    await db.flush()

    item = ReservationItem(
        reservation_id=reservation.id,
        bin_content_id=bin_content_fixture.id,
        quantity_reserved=Decimal("50.00"),
    )
    db.add(item)

    # Update bin_content reserved_quantity
    bin_content_fixture.reserved_quantity = Decimal("50.00")

    await db.commit()
    await db.refresh(reservation)
    return reservation


@pytest.fixture
async def transfer_fixture(
    db: AsyncSession,
    warehouse_fixture: Warehouse,
    second_warehouse_fixture: Warehouse,
    bin_fixture: Bin,
    bin_content_fixture: BinContent,
    user_fixture: User,
) -> WarehouseTransfer:
    """
    Create a pending cross-warehouse transfer.

    Returns:
        WarehouseTransfer: Pending transfer between warehouses.
    """
    transfer = WarehouseTransfer(
        source_warehouse_id=warehouse_fixture.id,
        target_warehouse_id=second_warehouse_fixture.id,
        source_bin_id=bin_fixture.id,
        source_bin_content_id=bin_content_fixture.id,
        quantity_sent=Decimal("50.00"),
        unit="kg",
        status="pending",
        transport_reference="TRUCK-TEST-001",
        created_by=user_fixture.id,
    )
    db.add(transfer)
    await db.commit()
    await db.refresh(transfer)
    return transfer


@pytest.fixture
async def second_warehouse_fixture(db: AsyncSession) -> Warehouse:
    """Create a second warehouse for cross-warehouse tests."""
    warehouse = Warehouse(
        name="Test Warehouse 2",
        code="TW2",
        address="Test Address 2",
        is_active=True,
    )
    db.add(warehouse)
    await db.commit()
    await db.refresh(warehouse)
    return warehouse


@pytest.fixture
async def second_bin_fixture(
    db: AsyncSession,
    second_warehouse_fixture: Warehouse,
) -> Bin:
    """Create a bin in the second warehouse."""
    bin = Bin(
        warehouse_id=second_warehouse_fixture.id,
        code="B-01-01-01",
        row="01",
        column="01",
        level="01",
        status="empty",
        is_active=True,
    )
    db.add(bin)
    await db.commit()
    await db.refresh(bin)
    return bin
```

---

## Test Patterns

### 1. Reservation Tests

#### Test File: `test_reservations.py`

**Test 1: Create Reservation - Happy Path**

```python
class TestCreateReservation:
    """Tests for POST /reservations endpoint."""

    async def test_create_reservation_success(
        self,
        client: AsyncClient,
        db: AsyncSession,
        warehouse_user_token: str,
        product_fixture: Product,
        bin_content_fixture: BinContent,
    ):
        """Happy path: Create FEFO-ordered reservation."""
        # Arrange
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}
        payload = {
            "product_id": str(product_fixture.id),
            "quantity": 50.0,
            "order_reference": "ORD-2025-001",
            "customer_name": "Test Kft.",
            "reserved_until": (datetime.now(UTC) + timedelta(hours=24)).isoformat(),
        }

        # Act
        response = await client.post(
            "/api/v1/reservations",
            json=payload,
            headers=headers,
        )

        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["reservation_id"] is not None
        assert float(data["total_quantity"]) == 50.0
        assert data["status"] == "active"
        assert data["is_partial"] is False
        assert len(data["items"]) >= 1
        assert data["message"] == "Foglalás sikeresen létrehozva."

    async def test_create_reservation_partial(
        self,
        client: AsyncClient,
        warehouse_user_token: str,
        product_fixture: Product,
        bin_content_with_low_stock: BinContent,
    ):
        """Edge case: Partial reservation when insufficient stock."""
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}
        payload = {
            "product_id": str(product_fixture.id),
            "quantity": 1000.0,  # More than available
            "order_reference": "ORD-2025-002",
            "reserved_until": (datetime.now(UTC) + timedelta(hours=24)).isoformat(),
        }

        response = await client.post(
            "/api/v1/reservations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["is_partial"] is True
        assert float(data["total_quantity"]) < 1000.0
        assert data["message"] == "Részleges foglalás - nem áll rendelkezésre elegendő készlet."

    async def test_create_reservation_no_stock(
        self,
        client: AsyncClient,
        warehouse_user_token: str,
        product_with_no_stock: Product,
    ):
        """Failure: No available stock for reservation."""
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}
        payload = {
            "product_id": str(product_with_no_stock.id),
            "quantity": 50.0,
            "order_reference": "ORD-2025-003",
            "reserved_until": (datetime.now(UTC) + timedelta(hours=24)).isoformat(),
        }

        response = await client.post(
            "/api/v1/reservations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 400
        assert "Nincs elérhető készlet" in response.json()["detail"]
```

**Test 2: Fulfill Reservation**

```python
class TestFulfillReservation:
    """Tests for POST /reservations/{id}/fulfill endpoint."""

    async def test_fulfill_reservation_success(
        self,
        client: AsyncClient,
        warehouse_user_token: str,
        reservation_fixture: StockReservation,
    ):
        """Happy path: Fulfill active reservation."""
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}

        response = await client.post(
            f"/api/v1/reservations/{reservation_fixture.id}/fulfill",
            json={"notes": "Order shipped"},
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["movement_ids"]) >= 1
        assert data["message"] == "Foglalás teljesítve."

    async def test_fulfill_already_fulfilled(
        self,
        client: AsyncClient,
        warehouse_user_token: str,
        fulfilled_reservation_fixture: StockReservation,
    ):
        """Failure: Cannot fulfill already fulfilled reservation."""
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}

        response = await client.post(
            f"/api/v1/reservations/{fulfilled_reservation_fixture.id}/fulfill",
            json={},
            headers=headers,
        )

        assert response.status_code == 400
        assert "már teljesítve" in response.json()["detail"]
```

---

### 2. Transfer Tests

#### Test File: `test_transfers.py`

**Test 1: Same-Warehouse Transfer**

```python
class TestSameWarehouseTransfer:
    """Tests for POST /transfers endpoint."""

    async def test_transfer_within_warehouse_success(
        self,
        client: AsyncClient,
        warehouse_user_token: str,
        bin_content_fixture: BinContent,
        empty_bin_fixture: Bin,
    ):
        """Happy path: Transfer between bins in same warehouse."""
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}
        payload = {
            "source_bin_content_id": str(bin_content_fixture.id),
            "target_bin_id": str(empty_bin_fixture.id),
            "quantity": 25.0,
            "reason": "reorganization",
        }

        response = await client.post(
            "/api/v1/transfers",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["source_movement_id"] is not None
        assert data["target_movement_id"] is not None
        assert float(data["quantity_transferred"]) == 25.0
        assert data["message"] == "Átmozgatás sikeresen végrehajtva."

    async def test_transfer_same_bin_fails(
        self,
        client: AsyncClient,
        warehouse_user_token: str,
        bin_content_fixture: BinContent,
    ):
        """Failure: Cannot transfer to same bin."""
        headers = {"Authorization": f"Bearer {warehouse_user_token}"}
        payload = {
            "source_bin_content_id": str(bin_content_fixture.id),
            "target_bin_id": str(bin_content_fixture.bin_id),
            "quantity": 25.0,
        }

        response = await client.post(
            "/api/v1/transfers",
            json=payload,
            headers=headers,
        )

        assert response.status_code == 400
        assert "nem lehet ugyanaz" in response.json()["detail"]
```

**Test 2: Cross-Warehouse Transfer Workflow**

```python
class TestCrossWarehouseTransfer:
    """Tests for cross-warehouse transfer workflow."""

    async def test_cross_warehouse_full_workflow(
        self,
        client: AsyncClient,
        manager_user_token: str,
        warehouse_user_token: str,
        transfer_fixture: WarehouseTransfer,
        second_bin_fixture: Bin,
    ):
        """Integration: Full cross-warehouse transfer workflow."""
        headers_manager = {"Authorization": f"Bearer {manager_user_token}"}
        headers_warehouse = {"Authorization": f"Bearer {warehouse_user_token}"}

        # Step 1: Dispatch transfer
        response = await client.post(
            f"/api/v1/transfers/{transfer_fixture.id}/dispatch",
            headers=headers_warehouse,
        )
        assert response.status_code == 200
        assert response.json()["status"] == "in_transit"

        # Step 2: Confirm receipt
        response = await client.post(
            f"/api/v1/transfers/{transfer_fixture.id}/confirm",
            json={
                "target_bin_id": str(second_bin_fixture.id),
                "received_quantity": 48.5,
                "condition_on_receipt": "damaged",
            },
            headers=headers_warehouse,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "received"
        assert float(data["quantity_received"]) == 48.5
        assert data["condition_on_receipt"] == "damaged"

    async def test_cancel_in_transit_transfer(
        self,
        client: AsyncClient,
        manager_user_token: str,
        in_transit_transfer_fixture: WarehouseTransfer,
    ):
        """Edge case: Cancel transfer that is in transit."""
        headers = {"Authorization": f"Bearer {manager_user_token}"}

        response = await client.post(
            f"/api/v1/transfers/{in_transit_transfer_fixture.id}/cancel",
            json={"reason": "Shipment lost"},
            headers=headers,
        )

        assert response.status_code == 200
        assert response.json()["status"] == "cancelled"
        # Verify stock returned to source (separate assertion)
```

---

### 3. Job Tests

#### Test File: `test_jobs.py`

**Test 1: Trigger Job (Admin Only)**

```python
class TestJobTrigger:
    """Tests for POST /jobs/trigger endpoint."""

    async def test_trigger_job_admin_success(
        self,
        client: AsyncClient,
        admin_user_token: str,
    ):
        """Happy path: Admin triggers job successfully."""
        headers = {"Authorization": f"Bearer {admin_user_token}"}

        response = await client.post(
            "/api/v1/jobs/trigger",
            json={"job_name": "check_expiry_warnings"},
            headers=headers,
        )

        assert response.status_code == 202
        data = response.json()
        assert data["job_name"] == "check_expiry_warnings"
        assert data["task_id"] is not None
        assert data["message"] == "Feladat sikeresen elindítva."

    async def test_trigger_job_non_admin_fails(
        self,
        client: AsyncClient,
        manager_user_token: str,
    ):
        """Failure: Non-admin cannot trigger jobs."""
        headers = {"Authorization": f"Bearer {manager_user_token}"}

        response = await client.post(
            "/api/v1/jobs/trigger",
            json={"job_name": "check_expiry_warnings"},
            headers=headers,
        )

        assert response.status_code == 403

    async def test_trigger_invalid_job_fails(
        self,
        client: AsyncClient,
        admin_user_token: str,
    ):
        """Failure: Invalid job name rejected."""
        headers = {"Authorization": f"Bearer {admin_user_token}"}

        response = await client.post(
            "/api/v1/jobs/trigger",
            json={"job_name": "nonexistent_job"},
            headers=headers,
        )

        assert response.status_code == 422  # Validation error
```

**Test 2: Job Execution History**

```python
class TestJobExecutions:
    """Tests for job execution endpoints."""

    async def test_list_job_executions(
        self,
        client: AsyncClient,
        manager_user_token: str,
        job_execution_fixtures: list[JobExecution],
    ):
        """Happy path: List job execution history."""
        headers = {"Authorization": f"Bearer {manager_user_token}"}

        response = await client.get(
            "/api/v1/jobs/executions?page=1&page_size=10",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] >= 1

    async def test_get_job_execution_details(
        self,
        client: AsyncClient,
        manager_user_token: str,
        job_execution_fixture: JobExecution,
    ):
        """Happy path: Get specific execution details."""
        headers = {"Authorization": f"Bearer {manager_user_token}"}

        response = await client.get(
            f"/api/v1/jobs/executions/{job_execution_fixture.id}",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["job_name"] is not None
        assert data["status"] in ["running", "completed", "failed"]
```

---

## Mocking Celery Tasks

For testing job functionality without running actual Celery workers:

```python
from unittest.mock import patch, MagicMock

@pytest.fixture
def mock_celery_task():
    """Mock Celery task for testing job triggers."""
    with patch("app.tasks.jobs.cleanup_expired_reservations_task") as mock:
        mock_result = MagicMock()
        mock_result.id = "mock-task-id-123"
        mock.delay.return_value = mock_result
        yield mock


async def test_trigger_with_mock(
    client: AsyncClient,
    admin_user_token: str,
    mock_celery_task,
):
    """Test job trigger with mocked Celery."""
    headers = {"Authorization": f"Bearer {admin_user_token}"}

    response = await client.post(
        "/api/v1/jobs/trigger",
        json={"job_name": "cleanup_expired_reservations"},
        headers=headers,
    )

    assert response.status_code == 202
    mock_celery_task.delay.assert_called_once()
```

---

## Integration Test Patterns

### Full Reservation Workflow

```python
async def test_reservation_full_workflow(
    client: AsyncClient,
    db: AsyncSession,
    warehouse_user_token: str,
    manager_user_token: str,
    product_fixture: Product,
    bin_content_fixture: BinContent,
):
    """Integration: Complete reservation lifecycle."""
    headers_warehouse = {"Authorization": f"Bearer {warehouse_user_token}"}
    headers_manager = {"Authorization": f"Bearer {manager_user_token}"}

    # Step 1: Create reservation
    create_response = await client.post(
        "/api/v1/reservations",
        json={
            "product_id": str(product_fixture.id),
            "quantity": 50.0,
            "order_reference": "ORD-INTEG-001",
            "reserved_until": (datetime.now(UTC) + timedelta(hours=24)).isoformat(),
        },
        headers=headers_warehouse,
    )
    assert create_response.status_code == 201
    reservation_id = create_response.json()["reservation_id"]

    # Step 2: Verify bin_content reserved_quantity updated
    await db.refresh(bin_content_fixture)
    assert float(bin_content_fixture.reserved_quantity) == 50.0

    # Step 3: Fulfill reservation
    fulfill_response = await client.post(
        f"/api/v1/reservations/{reservation_id}/fulfill",
        json={},
        headers=headers_warehouse,
    )
    assert fulfill_response.status_code == 200

    # Step 4: Verify stock decremented
    await db.refresh(bin_content_fixture)
    original_qty = 100.0  # Assume fixture had 100
    assert float(bin_content_fixture.quantity) == original_qty - 50.0
    assert float(bin_content_fixture.reserved_quantity) == 0.0
```

---

## Running Tests

### All Tests

```bash
pytest -v
```

### Phase 4 Tests Only

```bash
pytest app/tests/test_transfers.py app/tests/test_reservations.py app/tests/test_jobs.py -v
```

### With Coverage

```bash
pytest --cov=app --cov-report=html
```

### Specific Test

```bash
pytest app/tests/test_reservations.py::TestCreateReservation::test_create_reservation_success -v
```

---

## Test Naming Conventions

| Pattern | Example | Description |
|---------|---------|-------------|
| `test_{operation}_success` | `test_create_reservation_success` | Happy path |
| `test_{operation}_{condition}` | `test_create_reservation_partial` | Edge case |
| `test_{operation}_{error}_fails` | `test_fulfill_already_fulfilled_fails` | Error case |
| `test_{workflow}_full_workflow` | `test_reservation_full_workflow` | Integration |

---

## Coverage Targets

| Module | Target | Description |
|--------|--------|-------------|
| `app/api/v1/transfers.py` | 90%+ | All endpoints tested |
| `app/api/v1/reservations.py` | 90%+ | All endpoints tested |
| `app/api/v1/jobs.py` | 85%+ | Trigger and query tested |
| `app/services/transfer.py` | 85%+ | Core logic paths |
| `app/services/reservation.py` | 85%+ | FEFO allocation tested |
| `app/tasks/jobs.py` | 70%+ | Mocked task execution |

---

## See Also

- **Phase4_Overview.md** - Feature summary and business context
- **Phase4_API_Reference.md** - Endpoint specifications
- **Phase4_Database_Schema.md** - Database models
- **Phase3_Testing_Guide.md** - Phase 3 test patterns (foundation)
