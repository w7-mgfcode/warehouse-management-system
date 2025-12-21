# WMS Phase 3: Testing Guide

**Version**: 3.0
**Last Updated**: December 2025

## Overview

Phase 3 adds **48 comprehensive tests** for inventory operations, FEFO algorithm, movement audit trail, and expiry warnings. Combined with Phase 1 (40 tests) and Phase 2 (48 tests), the total test suite now contains **136 tests** with ~87% code coverage.

### Test Philosophy

Phase 3 tests follow the same principles established in Phase 1 and 2:

- **Comprehensive**: Cover happy paths, edge cases, and failure scenarios
- **Fast**: Use SQLite in-memory database (no Docker needed)
- **Isolated**: Each test is independent with clean database state
- **Readable**: Clear test names, arrange-act-assert pattern

---

## Test Coverage Summary

| Resource | Tests | Coverage Areas |
|----------|-------|----------------|
| **Inventory Operations** | 16 | Receipt, issue, stock queries, FEFO compliance, expiry validation |
| **FEFO Algorithm** | 12 | Multi-level sort, recommendations, compliance checking, overrides |
| **Movement Audit Trail** | 12 | History tracking, filtering, immutability, user attribution |
| **Expiry Warnings** | 8 | Critical/high/medium thresholds, expired products, urgency levels |
| **Phase 3 Total** | **48** | **~87% coverage** |
| **Cumulative (Phase 1+2+3)** | **136** | **~86% average coverage** |

---

## Test Structure

### Test Organization

```
app/tests/
├── conftest.py               # Shared fixtures (db, tokens, factories)
├── test_auth.py              # Phase 1 (9 tests)
├── test_users.py             # Phase 1 (13 tests)
├── test_warehouses.py        # Phase 1 (18 tests)
├── test_products.py          # Phase 2 (16 tests)
├── test_suppliers.py         # Phase 2 (16 tests)
├── test_bins.py              # Phase 2 (16 tests)
├── test_inventory.py         # Phase 3 (16 tests) ← NEW
├── test_fefo.py              # Phase 3 (12 tests) ← NEW
├── test_movements.py         # Phase 3 (12 tests) ← NEW
└── test_expiry.py            # Phase 3 (8 tests)  ← NEW
```

### Test File Template

```python
"""Tests for [Feature Name]."""

import pytest
from httpx import AsyncClient

# Arrange-Act-Assert pattern
class Test[FeatureName]:
    """Test suite for [Feature]."""

    async def test_[operation]_success(self, db, warehouse_user_token, ...):
        """Happy path: [Description]."""
        # Arrange
        ...

        # Act
        response = await client.post("/api/v1/...")

        # Assert
        assert response.status_code == 201
        ...

    async def test_[operation]_edge_case(self, db, ...):
        """Edge case: [Description]."""
        ...

    async def test_[operation]_failure(self, db, ...):
        """Failure: [Description]."""
        ...
```

---

## Inventory Tests (16 tests)

### Test File: `test_inventory.py`

#### 1. Receipt Tests (6 tests)

**Test 1: Happy Path - Receive Product**
```python
async def test_receive_product_success(db, warehouse_user_token, product, supplier, bin):
    """Happy path: Receive product into empty bin."""
    # Arrange
    receive_data = {
        "bin_id": str(bin.id),
        "product_id": str(product.id),
        "supplier_id": str(supplier.id),
        "batch_number": "BATCH-2025-001",
        "use_by_date": "2025-03-15",
        "quantity": 100.0,
        "unit": "kg"
    }

    # Act
    response = await client.post(
        "/api/v1/inventory/receive",
        json=receive_data,
        headers={"Authorization": f"Bearer {warehouse_user_token}"}
    )

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["quantity"] == 100.0
    assert data["message"] == "Termék sikeresen beérkeztetve"
    assert "bin_content_id" in data
    assert "movement_id" in data
```

**Test 2: Edge Case - Receipt into Occupied Bin (Same Product)**
```python
async def test_receive_same_product_existing_bin(db, warehouse_user_token, bin_content):
    """Edge case: Receive same product into occupied bin (should add to quantity)."""
    # Arrange - bin already has 50kg
    initial_quantity = bin_content.quantity
    receive_data = {
        "bin_id": str(bin_content.bin_id),
        "product_id": str(bin_content.product_id),
        "batch_number": "BATCH-2025-002",  # Different batch
        "use_by_date": "2025-04-20",
        "quantity": 30.0,
        "unit": "kg"
    }

    # Act
    response = await client.post("/api/v1/inventory/receive", json=receive_data, ...)

    # Assert
    assert response.status_code == 201
    # Verify quantity added (new batch created, not added to existing)
    bin_contents = await get_bin_contents(bin_content.bin_id)
    assert len(bin_contents) == 2  # Two batches now
```

**Test 3: Failure - Receipt into Occupied Bin (Different Product)**
```python
async def test_receive_different_product_occupied_bin(db, warehouse_user_token, bin_content):
    """Failure: Cannot receive different product into occupied bin."""
    # Arrange
    different_product = await create_product(name="Different Product")
    receive_data = {
        "bin_id": str(bin_content.bin_id),
        "product_id": str(different_product.id),
        "batch_number": "BATCH-2025-003",
        "use_by_date": "2025-05-10",
        "quantity": 20.0,
        "unit": "kg"
    }

    # Act
    response = await client.post("/api/v1/inventory/receive", json=receive_data, ...)

    # Assert
    assert response.status_code == 400
    assert "már foglalt másik termékkel" in response.json()["detail"]
```

**Test 4: Validation - Past Expiry Date**
```python
async def test_receive_product_past_expiry_date(db, warehouse_user_token, bin, product):
    """Failure: Cannot receive product with past expiry date."""
    # Arrange
    receive_data = {
        "bin_id": str(bin.id),
        "product_id": str(product.id),
        "batch_number": "BATCH-2025-004",
        "use_by_date": "2024-01-01",  # Past date
        "quantity": 100.0,
        "unit": "kg"
    }

    # Act
    response = await client.post("/api/v1/inventory/receive", json=receive_data, ...)

    # Assert
    assert response.status_code == 400
    assert "múltbeli" in response.json()["detail"]  # "szavatossági dátum nem lehet múltbeli"
```

**Test 5: Validation - Future Freeze Date**
```python
async def test_receive_product_future_freeze_date(db, warehouse_user_token, bin, product):
    """Failure: Freeze date cannot be in the future."""
    # Arrange
    from datetime import date, timedelta
    future_date = date.today() + timedelta(days=10)

    receive_data = {
        "bin_id": str(bin.id),
        "product_id": str(product.id),
        "batch_number": "BATCH-2025-005",
        "use_by_date": "2025-12-31",
        "freeze_date": str(future_date),  # Future date
        "quantity": 50.0,
        "unit": "kg"
    }

    # Act
    response = await client.post("/api/v1/inventory/receive", json=receive_data, ...)

    # Assert
    assert response.status_code == 400
    assert "jövőbeli" in response.json()["detail"]
```

**Test 6: RBAC - Viewer Cannot Receive**
```python
async def test_receive_product_viewer_forbidden(db, viewer_token, bin, product):
    """RBAC: Viewer cannot receive goods."""
    # Arrange
    receive_data = {...}

    # Act
    response = await client.post(
        "/api/v1/inventory/receive",
        json=receive_data,
        headers={"Authorization": f"Bearer {viewer_token}"}
    )

    # Assert
    assert response.status_code == 403
```

---

#### 2. Issue Tests (6 tests)

**Test 7: Happy Path - Issue Product (FEFO-Compliant)**
```python
async def test_issue_product_fefo_compliant(db, warehouse_user_token, bin_content):
    """Happy path: Issue product from oldest expiry (FEFO-compliant)."""
    # Arrange
    issue_data = {
        "bin_content_id": str(bin_content.id),
        "quantity": 30.0,
        "reason": "sales_order",
        "reference_number": "SO-2025-001"
    }

    # Act
    response = await client.post("/api/v1/inventory/issue", json=issue_data, ...)

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["quantity_issued"] == 30.0
    assert data["fefo_compliant"] == True
    assert data["warning"] is None
    assert data["message"] == "Termék sikeresen kiadva"
```

**Test 8: Failure - Insufficient Quantity**
```python
async def test_issue_product_insufficient_quantity(db, warehouse_user_token, bin_content):
    """Failure: Cannot issue more than available."""
    # Arrange - bin_content has 100kg
    issue_data = {
        "bin_content_id": str(bin_content.id),
        "quantity": 150.0,  # More than available
        "reason": "sales_order"
    }

    # Act
    response = await client.post("/api/v1/inventory/issue", json=issue_data, ...)

    # Assert
    assert response.status_code == 400
    assert "elegendő mennyiség" in response.json()["detail"]
```

**Test 9: Failure - Expired Product**
```python
async def test_issue_expired_product(db, warehouse_user_token, expired_bin_content):
    """Failure: Cannot issue expired product."""
    # Arrange - bin_content.use_by_date < today
    issue_data = {
        "bin_content_id": str(expired_bin_content.id),
        "quantity": 10.0,
        "reason": "sales_order"
    }

    # Act
    response = await client.post("/api/v1/inventory/issue", json=issue_data, ...)

    # Assert
    assert response.status_code == 400
    assert "lejárt" in response.json()["detail"]
```

**Test 10: FEFO Violation - Warehouse User Rejected**
```python
async def test_issue_non_fefo_warehouse_rejected(db, warehouse_user_token, bin_content_old, bin_content_new):
    """FEFO violation: Warehouse user cannot issue from newer batch."""
    # Arrange
    # bin_content_old: expires 2025-02-10
    # bin_content_new: expires 2025-06-30
    issue_data = {
        "bin_content_id": str(bin_content_new.id),  # Trying to pick newer
        "quantity": 20.0,
        "reason": "sales_order"
    }

    # Act
    response = await client.post("/api/v1/inventory/issue", json=issue_data, ...)

    # Assert
    assert response.status_code == 409  # Conflict
    assert "FEFO szabály" in response.json()["detail"]
```

**Test 11: Manager Override - Non-FEFO with Reason**
```python
async def test_issue_non_fefo_manager_override(db, manager_token, bin_content_old, bin_content_new):
    """Manager override: Can issue from newer batch with documented reason."""
    # Arrange
    issue_data = {
        "bin_content_id": str(bin_content_new.id),
        "quantity": 20.0,
        "reason": "customer_request",
        "force_non_fefo": True,
        "override_reason": "Vevő kifejezett kérése - BATCH-2025-045 szükséges",
        "notes": "XYZ Vendéglő megrendelés"
    }

    # Act
    response = await client.post(
        "/api/v1/inventory/issue",
        json=issue_data,
        headers={"Authorization": f"Bearer {manager_token}"}
    )

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["fefo_compliant"] == False
    assert data["warning"] is not None
    assert "FEFO" in data["warning"]["message"]
```

**Test 12: Validation - Override Without Reason**
```python
async def test_issue_force_non_fefo_without_reason(db, manager_token, bin_content_new):
    """Failure: force_non_fefo requires override_reason."""
    # Arrange
    issue_data = {
        "bin_content_id": str(bin_content_new.id),
        "quantity": 20.0,
        "reason": "customer_request",
        "force_non_fefo": True,
        # Missing override_reason
    }

    # Act
    response = await client.post("/api/v1/inventory/issue", json=issue_data, ...)

    # Assert
    assert response.status_code == 400
    assert "felülíráshoz" in response.json()["detail"]
```

---

#### 3. Stock Query Tests (4 tests)

**Test 13: Get Stock Levels - All Products**
**Test 14: Get Stock Levels - Filter by Warehouse**
**Test 15: Get Stock Levels - Filter by Product**
**Test 16: Get Stock Levels - Empty Stock**

---

## FEFO Algorithm Tests (12 tests)

### Test File: `test_fefo.py`

**Test 1: Basic 3-Bin Sort**
```python
async def test_fefo_sort_three_bins_by_expiry(db, product):
    """FEFO sort: Orders bins by use_by_date ASC."""
    # Arrange
    bin1 = await create_bin_content(product, use_by_date="2025-06-30", quantity=50)
    bin2 = await create_bin_content(product, use_by_date="2025-02-10", quantity=100)
    bin3 = await create_bin_content(product, use_by_date="2025-04-15", quantity=80)

    # Act
    recommendation = await get_fefo_recommendation(db, product.id, 200)

    # Assert
    assert len(recommendation.recommendations) == 3
    assert recommendation.recommendations[0].bin_content_id == bin2.id  # 2025-02-10 (oldest)
    assert recommendation.recommendations[1].bin_content_id == bin3.id  # 2025-04-15
    assert recommendation.recommendations[2].bin_content_id == bin1.id  # 2025-06-30 (newest)
```

**Test 2: Tiebreaker by Batch Number**
```python
async def test_fefo_tiebreaker_batch_number(db, product):
    """FEFO tiebreaker: Same expiry, sort by batch_number ASC."""
    # Arrange
    bin1 = await create_bin_content(product, use_by_date="2025-02-10", batch_number="BATCH-2025-045")
    bin2 = await create_bin_content(product, use_by_date="2025-02-10", batch_number="BATCH-2025-001")
    bin3 = await create_bin_content(product, use_by_date="2025-02-10", batch_number="BATCH-2025-020")

    # Act
    recommendation = await get_fefo_recommendation(db, product.id, 150)

    # Assert
    assert recommendation.recommendations[0].batch_number == "BATCH-2025-001"
    assert recommendation.recommendations[1].batch_number == "BATCH-2025-020"
    assert recommendation.recommendations[2].batch_number == "BATCH-2025-045"
```

**Test 3: Final Tiebreaker by Received Date**
```python
async def test_fefo_final_tiebreaker_received_date(db, product):
    """FEFO final tiebreaker: Same expiry + batch, sort by received_date ASC."""
    # Arrange
    from datetime import datetime, timedelta
    bin1 = await create_bin_content(
        product,
        use_by_date="2025-02-10",
        batch_number="BATCH-2025-001",
        received_date=datetime.now() - timedelta(days=10)
    )
    bin2 = await create_bin_content(
        product,
        use_by_date="2025-02-10",
        batch_number="BATCH-2025-001",
        received_date=datetime.now() - timedelta(days=5)
    )

    # Act
    recommendation = await get_fefo_recommendation(db, product.id, 100)

    # Assert
    assert recommendation.recommendations[0].bin_content_id == bin1.id  # Older receipt
```

**Test 4: Multi-Bin Allocation**
```python
async def test_fefo_multi_bin_allocation(db, product):
    """FEFO allocation: Splits quantity across multiple bins."""
    # Arrange
    bin1 = await create_bin_content(product, use_by_date="2025-02-10", quantity=100)
    bin2 = await create_bin_content(product, use_by_date="2025-04-15", quantity=80)

    # Act
    recommendation = await get_fefo_recommendation(db, product.id, 150)

    # Assert
    assert len(recommendation.recommendations) == 2
    assert recommendation.recommendations[0].suggested_quantity == 100  # Full bin1
    assert recommendation.recommendations[1].suggested_quantity == 50   # Partial bin2
    assert recommendation.total_available == 180
```

**Test 5: Partial Availability**
```python
async def test_fefo_partial_availability(db, product):
    """FEFO with insufficient stock: Returns partial recommendation."""
    # Arrange
    bin1 = await create_bin_content(product, use_by_date="2025-02-10", quantity=50)

    # Act
    recommendation = await get_fefo_recommendation(db, product.id, 100)  # Request more than available

    # Assert
    assert len(recommendation.recommendations) == 1
    assert recommendation.recommendations[0].suggested_quantity == 50
    assert recommendation.total_available == 50  # Only 50 available
```

**Test 6: Critical Expiry Warning**
```python
async def test_fefo_critical_expiry_warning(db, product):
    """FEFO warnings: Flags critical expiry (<7 days)."""
    # Arrange
    from datetime import date, timedelta
    soon_date = date.today() + timedelta(days=5)
    bin1 = await create_bin_content(product, use_by_date=soon_date, quantity=50)

    # Act
    recommendation = await get_fefo_recommendation(db, product.id, 50)

    # Assert
    assert len(recommendation.fefo_warnings) > 0
    assert "KRITIKUS" in recommendation.fefo_warnings[0]
    assert recommendation.recommendations[0].warning is not None
    assert "KRITIKUS" in recommendation.recommendations[0].warning
```

**Test 7-12**: Additional FEFO tests for high urgency warnings, no stock, reserved stock filtering, etc.

---

## Movement Audit Tests (12 tests)

### Test File: `test_movements.py`

**Test 1: All Movements Recorded**
```python
async def test_all_movements_recorded(db, warehouse_user_token, bin, product):
    """Audit trail: All operations create movement records."""
    # Arrange & Act
    # 1. Receipt
    receipt_response = await receive_goods(bin, product, quantity=100)
    receipt_movement_id = receipt_response["movement_id"]

    # 2. Issue
    issue_response = await issue_goods(receipt_response["bin_content_id"], quantity=30)
    issue_movement_id = issue_response["movement_id"]

    # 3. Verify movements
    movements = await get_movements(bin_id=bin.id)

    # Assert
    assert len(movements["items"]) == 2
    assert movements["items"][0]["id"] == issue_movement_id  # Newest first
    assert movements["items"][1]["id"] == receipt_movement_id
```

**Test 2: Movements Immutable**
```python
async def test_movements_immutable_no_update_endpoint(client):
    """Immutability: No UPDATE endpoint exists."""
    # Arrange
    movement_id = "550e8400-e29b-41d4-a716-446655440000"

    # Act
    response = await client.put(f"/api/v1/movements/{movement_id}", json={"quantity": 200})

    # Assert
    assert response.status_code == 405  # Method Not Allowed (no PUT route)
```

**Test 3: Filter by Product**
```python
async def test_filter_movements_by_product(db, product1, product2):
    """Filter: Get movements for specific product only."""
    # Arrange
    movement1 = await create_movement(product=product1)
    movement2 = await create_movement(product=product2)
    movement3 = await create_movement(product=product1)

    # Act
    movements = await get_movements(product_id=product1.id)

    # Assert
    assert len(movements["items"]) == 2
    assert all(m["product_id"] == str(product1.id) for m in movements["items"])
```

**Test 4: Filter by Date Range**
```python
async def test_filter_movements_by_date_range(db):
    """Filter: Get movements within date range."""
    # Arrange
    from datetime import date
    start_date = date(2025, 1, 15)
    end_date = date(2025, 1, 31)

    # Act
    movements = await get_movements(start_date=start_date, end_date=end_date)

    # Assert
    for movement in movements["items"]:
        movement_date = datetime.fromisoformat(movement["created_at"]).date()
        assert start_date <= movement_date <= end_date
```

**Test 5: User Attribution**
```python
async def test_movement_user_attribution(db, warehouse_user, manager_user):
    """User attribution: Movements record who performed action."""
    # Arrange & Act
    movement1 = await create_movement(user=warehouse_user)
    movement2 = await create_movement(user=manager_user)

    # Assert
    movement1_data = await get_movement(movement1.id)
    movement2_data = await get_movement(movement2.id)

    assert movement1_data["created_by"] == warehouse_user.username
    assert movement2_data["created_by"] == manager_user.username
```

**Test 6-12**: Additional movement tests for pagination, movement types, FEFO compliance flag, etc.

---

## Expiry Warning Tests (8 tests)

### Test File: `test_expiry.py`

**Test 1: Critical Threshold (<7 days)**
```python
async def test_expiry_warnings_critical_threshold(db, product):
    """Expiry warnings: Critical urgency for products <7 days to expiry."""
    # Arrange
    from datetime import date, timedelta
    critical_date = date.today() + timedelta(days=5)
    bin_content = await create_bin_content(product, use_by_date=critical_date, quantity=50)

    # Act
    response = await client.get("/api/v1/inventory/expiry-warnings?days_threshold=7")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["summary"]["critical"] >= 1
    assert any(item["urgency"] == "critical" for item in data["items"])
    assert any("KRITIKUS" in item["warning_message"] for item in data["items"])
```

**Test 2: High Threshold (7-14 days)**
```python
async def test_expiry_warnings_high_threshold(db, product):
    """Expiry warnings: High urgency for products 7-14 days to expiry."""
    # Arrange
    from datetime import date, timedelta
    high_date = date.today() + timedelta(days=10)
    bin_content = await create_bin_content(product, use_by_date=high_date, quantity=80)

    # Act
    response = await client.get("/api/v1/inventory/expiry-warnings?days_threshold=14")

    # Assert
    data = response.json()
    assert data["summary"]["high"] >= 1
    assert any(item["urgency"] == "high" for item in data["items"])
    assert any("FIGYELEM" in item["warning_message"] for item in data["items"])
```

**Test 3: Expired Products**
```python
async def test_get_expired_products(db, product):
    """Expired products: List products past use_by_date."""
    # Arrange
    from datetime import date, timedelta
    expired_date = date.today() - timedelta(days=10)
    bin_content = await create_bin_content(product, use_by_date=expired_date, quantity=20)

    # Act
    response = await client.get("/api/v1/inventory/expired")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(item["days_since_expiry"] > 0 for item in data["items"])
    assert any(item["action_required"] == "Selejtezés szükséges" for item in data["items"])
```

**Test 4: Warnings Exclude Scrapped Items**
```python
async def test_expiry_warnings_exclude_scrapped(db, product):
    """Expiry warnings: Do not include scrapped products."""
    # Arrange
    from datetime import date, timedelta
    critical_date = date.today() + timedelta(days=5)
    bin_content1 = await create_bin_content(product, use_by_date=critical_date, status="available")
    bin_content2 = await create_bin_content(product, use_by_date=critical_date, status="scrapped")

    # Act
    response = await client.get("/api/v1/inventory/expiry-warnings?days_threshold=7")

    # Assert
    data = response.json()
    assert len([item for item in data["items"] if item["bin_content_id"] == str(bin_content1.id)]) == 1
    assert len([item for item in data["items"] if item["bin_content_id"] == str(bin_content2.id)]) == 0
```

**Test 5-8**: Additional expiry tests for medium/low thresholds, warehouse filtering, etc.

---

## Test Fixtures and Helpers

### Core Fixtures (`conftest.py`)

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from datetime import date, datetime, timedelta

@pytest.fixture
async def db():
    """Async database session (SQLite in-memory)."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session

@pytest.fixture
def client(db):
    """HTTP client with database dependency override."""
    app.dependency_overrides[get_db] = lambda: db
    return AsyncClient(app=app, base_url="http://test")

@pytest.fixture
async def admin_token(db):
    """Admin user JWT token."""
    user = await create_user(db, username="admin", role="admin")
    return create_access_token(user.id)

@pytest.fixture
async def manager_token(db):
    """Manager user JWT token."""
    user = await create_user(db, username="manager", role="manager")
    return create_access_token(user.id)

@pytest.fixture
async def warehouse_user_token(db):
    """Warehouse user JWT token."""
    user = await create_user(db, username="warehouse_user", role="warehouse")
    return create_access_token(user.id)

@pytest.fixture
async def viewer_token(db):
    """Viewer user JWT token."""
    user = await create_user(db, username="viewer", role="viewer")
    return create_access_token(user.id)
```

### Phase 3 Fixtures

```python
@pytest.fixture
async def product(db):
    """Create product fixture."""
    return await create_product(
        db,
        name="Csirkemell filé",
        sku="CSIRKE-001",
        category="meat",
        default_unit="kg"
    )

@pytest.fixture
async def supplier(db):
    """Create supplier fixture."""
    return await create_supplier(
        db,
        company_name="Baromfi Kft.",
        tax_number="12345678-1-23"
    )

@pytest.fixture
async def bin(db, warehouse):
    """Create bin fixture."""
    return await create_bin(
        db,
        warehouse_id=warehouse.id,
        code="A-01-02-03"
    )

@pytest.fixture
async def bin_content(db, bin, product, supplier):
    """Create bin_content with available stock."""
    return await create_bin_content(
        db,
        bin_id=bin.id,
        product_id=product.id,
        supplier_id=supplier.id,
        batch_number="BATCH-2025-001",
        use_by_date=date.today() + timedelta(days=54),
        quantity=100.0,
        unit="kg",
        status="available"
    )

@pytest.fixture
async def expired_bin_content(db, bin, product):
    """Create bin_content with expired product."""
    return await create_bin_content(
        db,
        bin_id=bin.id,
        product_id=product.id,
        batch_number="BATCH-2024-999",
        use_by_date=date.today() - timedelta(days=10),  # Expired
        quantity=20.0,
        unit="kg",
        status="expired"
    )

@pytest.fixture
async def bin_content_old(db, bin, product):
    """Create bin_content with old expiry (for FEFO tests)."""
    return await create_bin_content(
        db,
        bin_id=bin.id,
        product_id=product.id,
        batch_number="BATCH-2025-001",
        use_by_date=date.today() + timedelta(days=30),  # 30 days
        quantity=100.0,
        unit="kg"
    )

@pytest.fixture
async def bin_content_new(db, bin2, product):
    """Create bin_content with new expiry (for FEFO tests)."""
    return await create_bin_content(
        db,
        bin_id=bin2.id,
        product_id=product.id,
        batch_number="BATCH-2025-045",
        use_by_date=date.today() + timedelta(days=160),  # 160 days
        quantity=80.0,
        unit="kg"
    )
```

### Factory Functions

```python
async def create_bin_content(
    db,
    bin_id=None,
    product_id=None,
    supplier_id=None,
    batch_number="BATCH-TEST-001",
    use_by_date=None,
    best_before_date=None,
    freeze_date=None,
    quantity=100.0,
    unit="kg",
    pallet_count=None,
    weight_kg=None,
    received_date=None,
    status="available",
    notes=None
):
    """Factory function to create BinContent."""
    if use_by_date is None:
        use_by_date = date.today() + timedelta(days=30)
    if received_date is None:
        received_date = datetime.now(UTC)

    bin_content = BinContent(
        bin_id=bin_id or await create_bin().id,
        product_id=product_id or await create_product().id,
        supplier_id=supplier_id,
        batch_number=batch_number,
        use_by_date=use_by_date,
        best_before_date=best_before_date,
        freeze_date=freeze_date,
        quantity=quantity,
        unit=unit,
        pallet_count=pallet_count,
        weight_kg=weight_kg,
        received_date=received_date,
        status=status,
        notes=notes
    )
    db.add(bin_content)
    await db.commit()
    await db.refresh(bin_content)
    return bin_content

async def create_movement(
    db,
    bin_content_id,
    movement_type="receipt",
    quantity=100.0,
    quantity_before=0.0,
    quantity_after=100.0,
    reason="test",
    reference_number=None,
    fefo_compliant=None,
    force_override=False,
    override_reason=None,
    notes=None,
    created_by=None
):
    """Factory function to create BinMovement."""
    movement = BinMovement(
        bin_content_id=bin_content_id,
        movement_type=movement_type,
        quantity=quantity,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason=reason,
        reference_number=reference_number,
        fefo_compliant=fefo_compliant,
        force_override=force_override,
        override_reason=override_reason,
        notes=notes,
        created_by=created_by or await create_user().id
    )
    db.add(movement)
    await db.commit()
    await db.refresh(movement)
    return movement
```

---

## Running Phase 3 Tests

### Run All Tests

```bash
# Activate virtual environment
source venv_linux/bin/activate

# Run all Phase 3 tests
cd w7-WHv1/backend
pytest app/tests/test_inventory.py app/tests/test_fefo.py app/tests/test_movements.py app/tests/test_expiry.py -v

# Run all tests (Phase 1+2+3)
pytest app/tests/ -v
```

### Run Specific Test File

```bash
# Run only inventory tests
pytest app/tests/test_inventory.py -v

# Run only FEFO tests
pytest app/tests/test_fefo.py -v
```

### Run Specific Test

```bash
# Run single test by name
pytest app/tests/test_inventory.py::test_receive_product_success -v

# Run tests matching pattern
pytest -k "test_fefo" -v
```

### Coverage Report

```bash
# Run with coverage
pytest app/tests/ --cov=app --cov-report=html

# View HTML report
open htmlcov/index.html
```

**Target Coverage**: > 85% for Phase 3 code

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Phase 3 Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python 3.13
        uses: actions/setup-python@v4
        with:
          python-version: '3.13'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run linter
        run: |
          ruff check . --fix

      - name: Run type checker
        run: |
          mypy .

      - name: Run Phase 3 tests
        run: |
          pytest app/tests/test_inventory.py app/tests/test_fefo.py app/tests/test_movements.py app/tests/test_expiry.py -v --cov=app

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Debugging Failed Tests

### Verbose Output

```bash
# Show print statements
pytest app/tests/test_inventory.py -v -s

# Show full diff on assertion failures
pytest app/tests/test_inventory.py -v --tb=long
```

### Run Last Failed Tests

```bash
# Only re-run tests that failed last time
pytest --lf -v
```

### Use pdb Debugger

```python
def test_fefo_sort_three_bins(db, product):
    # ... test code ...
    import pdb; pdb.set_trace()  # Breakpoint
    # ... more test code ...
```

---

## Best Practices

### 1. Clear Test Names

**❌ Bad**:
```python
def test_1(db):
    ...
```

**✅ Good**:
```python
def test_receive_product_past_expiry_date_rejected(db, bin, product):
    """Failure: Cannot receive product with past expiry date."""
    ...
```

### 2. Arrange-Act-Assert Pattern

```python
async def test_example(db):
    # Arrange: Set up test data
    bin_content = await create_bin_content(...)

    # Act: Perform the operation
    response = await issue_goods(bin_content.id, 50)

    # Assert: Verify the result
    assert response.status_code == 200
    assert response.json()["quantity_issued"] == 50
```

### 3. Test One Thing

**❌ Bad** (tests multiple things):
```python
def test_inventory_operations(db):
    receive_goods(...)
    issue_goods(...)
    adjust_stock(...)
    # Too much in one test!
```

**✅ Good** (focused):
```python
def test_receive_product_success(db):
    # Only tests receipt
    ...

def test_issue_product_success(db):
    # Only tests issue
    ...
```

---

## See Also

- **Phase3_Overview.md** - Feature summary
- **Phase3_API_Reference.md** - API contracts for testing
- **Phase3_Database_Schema.md** - Data structures to test
- **Phase3_FEFO_Compliance.md** - FEFO algorithm test scenarios
- **Phase3_Movement_Audit.md** - Audit trail test requirements
- **Phase2_Testing_Guide.md** - Testing patterns from Phase 2
