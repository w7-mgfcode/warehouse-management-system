name: "Phase 3: Inventory Receipt/Issue + FEFO Logic"
description: |
  Implement comprehensive inventory management with FEFO (First Expired, First Out) enforcement,
  receipt/issue tracking, and immutable movement audit trail.

---

## Goal
Build a production-ready warehouse inventory management system with:
- **Receipt Operations**: Receive products into bins with full traceability (batch, expiry dates, supplier)
- **Issue Operations**: Issue products from bins with strict FEFO enforcement
- **FEFO Algorithm**: Automatic recommendation engine for oldest-expiry-first picking
- **Movement Audit Trail**: Immutable record of all inventory transactions
- **Expiry Warnings**: Alert system for products approaching expiration
- **Stock Reports**: Real-time inventory levels and locations

## Why
- **Business Value**: Ensures food safety compliance through FEFO enforcement
- **User Impact**: Warehouse staff get clear picking instructions, reducing errors and waste
- **Integration**: Builds on Phase 2 (Products, Suppliers, Bins) with 88 passing tests
- **Problems Solved**:
  - Manual expiry tracking is error-prone
  - FEFO violations lead to product waste and regulatory issues
  - Lack of audit trail makes root cause analysis difficult
  - No visibility into stock levels by location

## What
User-visible behavior and technical requirements:

### Core Features
1. **Receive Goods** (`POST /api/v1/inventory/receive`)
   - Scan/enter product, bin, batch number, expiry date
   - System validates bin availability (empty or same product)
   - Creates BinContent record + Receipt movement
   - Updates bin status to 'occupied'

2. **Issue Goods** (`POST /api/v1/inventory/issue`)
   - Request product and quantity
   - System shows FEFO recommendation (`GET /api/v1/inventory/fefo-recommendation`)
   - Warehouse picks from recommended bin (oldest expiry)
   - System enforces FEFO or requires manager override
   - Creates Issue movement, updates quantity

3. **FEFO Recommendation Engine**
   - Queries all bins with requested product
   - Sorts by: use_by_date ASC → batch_number ASC → received_date ASC
   - Returns ordered picking list with expiry warnings
   - Flags non-compliant selections

4. **Expiry Warnings** (`GET /api/v1/inventory/expiry-warnings`)
   - Critical: < 7 days (red alert)
   - High: 7-14 days (orange warning)
   - Medium: 15-30 days (yellow notice)
   - Automatic daily alerts (Phase 4)

5. **Movement History** (`GET /api/v1/movements`)
   - Filter by product, bin, date range, user, movement type
   - Immutable audit trail (no updates/deletes)
   - Shows quantity before/after, reason, FEFO compliance

### Success Criteria
- [ ] All 88 Phase 2 tests still pass
- [ ] 40+ new Phase 3 tests pass (receipt, issue, FEFO, movements, expiry)
- [ ] FEFO violations are blocked unless manager overrides
- [ ] Movement history is immutable and complete
- [ ] Hungarian messages for all user-facing errors
- [ ] No linting errors (`ruff check`)
- [ ] No type errors (`mypy`)

---

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window

- file: INITIAL3.md
  why: Complete Phase 3 requirements specification with examples

- file: w7-WHv1/backend/app/db/models/product.py
  why: Model pattern (GUID, timestamps, SQLAlchemy 2.0)

- file: w7-WHv1/backend/app/db/models/bin.py
  why: Relationship patterns, CheckConstraints, status enum

- file: w7-WHv1/backend/app/services/bin.py
  why: Service layer patterns (async, error handling, pagination)

- file: w7-WHv1/backend/app/api/v1/bins.py
  why: API endpoint patterns (RBAC, HTTPException, response models)

- file: w7-WHv1/backend/app/schemas/bin.py
  why: Pydantic v2 schemas (@field_validator, ConfigDict, Literal types)

- file: w7-WHv1/backend/app/tests/test_bins.py
  why: Test patterns (AsyncClient, fixtures, auth_header, assertions)

- file: w7-WHv1/backend/app/core/i18n.py
  why: Hungarian message patterns (HU_MESSAGES dict)

- file: w7-WHv1/backend/app/db/base.py
  why: GUID TypeDecorator for PostgreSQL/SQLite compatibility

- file: w7-WHv1/backend/alembic/versions/20251221_021531_686c3bcd48eb_initial_schema.py
  why: Migration pattern (create_table, foreign keys, constraints)

- url: https://docs.sqlalchemy.org/en/20/orm/queryguide/select.html
  why: SQLAlchemy 2.0 async select() patterns (no more session.query())
  critical: Use select(Model).where() not session.query(Model).filter()

- url: https://docs.pydantic.dev/latest/concepts/validators/
  why: Pydantic v2 @field_validator syntax (replaces @validator)
  critical: Use @field_validator not @validator (deprecated in v2)

- url: https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/
  why: RBAC dependency injection patterns
  critical: Use RequireWarehouse, RequireManager from app.api.deps
```

### Current Codebase Tree (relevant sections)
```bash
w7-WHv1/backend/
├── app/
│   ├── api/
│   │   ├── deps.py              # RBAC: RequireViewer, RequireWarehouse, RequireManager
│   │   └── v1/
│   │       ├── bins.py          # Reference pattern
│   │       ├── products.py
│   │       └── warehouses.py
│   ├── core/
│   │   ├── config.py
│   │   ├── i18n.py              # Hungarian messages
│   │   └── security.py          # JWT, password hashing
│   ├── db/
│   │   ├── base.py              # GUID TypeDecorator
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── bin.py
│   │   │   ├── bin_content.py   # EXISTS but needs modification
│   │   │   ├── bin_history.py   # Will be replaced by bin_movement.py
│   │   │   ├── product.py
│   │   │   ├── supplier.py
│   │   │   ├── user.py
│   │   │   └── warehouse.py
│   │   ├── session.py           # async_sessionmaker, AsyncSession
│   │   └── seed.py
│   ├── schemas/
│   │   ├── bin.py               # Reference pattern
│   │   └── product.py
│   ├── services/
│   │   ├── bin.py               # Reference pattern
│   │   ├── pagination.py        # calculate_pages()
│   │   ├── product.py
│   │   └── warehouse.py
│   └── tests/
│       ├── conftest.py          # Fixtures, auth_header()
│       ├── test_auth.py
│       ├── test_bins.py         # Reference pattern
│       └── test_products.py
├── alembic/
│   ├── env.py
│   └── versions/
│       └── 686c3bcd48eb_initial_schema.py
├── alembic.ini
└── pyproject.toml
```

### Desired Codebase Tree (files to CREATE/MODIFY)
```bash
w7-WHv1/backend/
├── app/
│   ├── api/v1/
│   │   ├── inventory.py         # CREATE: Receipt/issue endpoints
│   │   ├── movements.py         # CREATE: Movement history endpoints
│   │   └── reports.py           # CREATE: Stock/expiry reports
│   ├── db/models/
│   │   ├── bin_content.py       # MODIFY: Add batch_number, quantity, unit, status
│   │   ├── bin_movement.py      # CREATE: Immutable audit trail (replaces bin_history.py)
│   │   └── bin_history.py       # DELETE: Replaced by bin_movement.py
│   ├── schemas/
│   │   ├── inventory.py         # CREATE: ReceiveRequest, IssueRequest, StockLevel
│   │   ├── movement.py          # CREATE: MovementResponse, MovementFilter
│   │   └── expiry.py            # CREATE: ExpiryWarning, ExpiryReport
│   ├── services/
│   │   ├── inventory.py         # CREATE: Receipt/issue logic, stock queries
│   │   ├── fefo.py              # CREATE: FEFO recommendation algorithm
│   │   ├── movement.py          # CREATE: Movement tracking, audit queries
│   │   └── expiry.py            # CREATE: Expiry warnings, urgency calculation
│   └── tests/
│       ├── test_inventory.py    # CREATE: Receipt/issue/stock tests
│       ├── test_fefo.py         # CREATE: FEFO algorithm tests
│       ├── test_movements.py    # CREATE: Movement history tests
│       └── test_expiry.py       # CREATE: Expiry warning tests
└── alembic/versions/
    └── YYYYMMDD_HHMMSS_phase3_inventory.py  # CREATE: Migration
```

### Known Gotchas & Library Quirks
```python
# CRITICAL: Existing BinContent and BinHistory models DON'T match INITIAL3.md spec
# Current: bin_content.py has delivery_date, net_weight, gross_weight (no batch_number, quantity, unit, status)
# Required: INITIAL3.md specifies batch_number, quantity, unit, received_date, status
# Action: MODIFY bin_content.py to match spec, CREATE bin_movement.py, DELETE bin_history.py

# Pydantic v2 (2.11+) - Use new syntax
from pydantic import field_validator, ConfigDict  # NOT @validator, NOT class Config
@field_validator("field_name")  # NOT @validator
def validate_field(cls, v):
    return v

model_config = ConfigDict(from_attributes=True)  # NOT class Config: orm_mode = True

# SQLAlchemy 2.0.45 - Async pattern
from sqlalchemy import select  # NOT from sqlalchemy.orm import Query
result = await session.execute(select(Model).where(Model.id == id))
obj = result.scalar_one_or_none()  # NOT session.query(Model).filter().first()

# DateTime - Timezone aware
from datetime import UTC, datetime
datetime.now(UTC)  # NOT datetime.utcnow() (deprecated)

# FastAPI RBAC - Use existing dependencies
from app.api.deps import RequireWarehouse, RequireManager, RequireViewer

# Hungarian messages - Add to app/core/i18n.py HU_MESSAGES dict
HU_MESSAGES["receipt_successful"] = "Termék sikeresen beérkeztetve."

# GUID TypeDecorator - Use for all UUID columns (PostgreSQL + SQLite compatibility)
from app.db.base import GUID
id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)

# FEFO Sort Key - Multiple levels (use_by_date, batch_number, received_date)
query = select(BinContent).where(
    BinContent.product_id == product_id,
    BinContent.status == "available",
    BinContent.quantity > 0
).order_by(
    BinContent.use_by_date.asc(),
    BinContent.batch_number.asc(),
    BinContent.received_date.asc()
)

# Immutable Audit Trail - BinMovement records NEVER updated or deleted
# Use ondelete="RESTRICT" for created_by FK, "SET NULL" is acceptable
# NO UPDATE or DELETE endpoints for movements

# One Bin = One Product constraint
# Check: SELECT * FROM bin_contents WHERE bin_id = ? AND product_id != ?
# If exists: raise HTTPException(409, "bin_already_occupied")

# Test Pattern - Use existing fixtures from conftest.py
# pytest fixtures: db, client, admin_user, admin_token, warehouse_user, warehouse_token, viewer_user, viewer_token
# Auth: headers=auth_header(token)
```

---

## Implementation Blueprint

### Data Models and Structure

#### Task 1: Modify BinContent Model
**FILE**: `w7-WHv1/backend/app/db/models/bin_content.py`

**MODIFY** existing model to match INITIAL3.md specification:
```python
# CHANGES NEEDED:
# 1. ADD: batch_number (VARCHAR(100), NOT NULL, indexed)
# 2. ADD: quantity (DECIMAL(10,2), NOT NULL, > 0)
# 3. ADD: unit (VARCHAR(50), NOT NULL)
# 4. ADD: received_date (TIMESTAMP WITH TZ, NOT NULL)
# 5. ADD: status (VARCHAR(20), CHECK IN ('available', 'reserved', 'expired', 'scrapped'))
# 6. RENAME: delivery_date -> (keep as delivery_date, but add received_date separately)
# 7. MODIFY: best_before_date remains nullable
# 8. MODIFY: use_by_date remains NOT NULL
# 9. ADD: weight_kg (DECIMAL(10,2), nullable) - optional total weight
# 10. REMOVE: net_weight, gross_weight (replaced by quantity + unit + weight_kg)

# CONSTRAINTS:
# - One bin = one product at a time (unique constraint on bin_id already exists)
# - use_by_date >= best_before_date OR best_before_date IS NULL
# - quantity > 0
# - pallet_count > 0

# INDEXES:
# CREATE INDEX idx_bin_contents_product_status ON bin_contents(product_id, status, use_by_date)
# CREATE INDEX idx_bin_contents_expiry ON bin_contents(use_by_date) WHERE status = 'available'
```

#### Task 2: Create BinMovement Model
**FILE**: `w7-WHv1/backend/app/db/models/bin_movement.py`

**CREATE** new immutable audit trail model:
```python
class BinMovement(Base):
    """Immutable audit trail of all inventory movements."""

    __tablename__ = "bin_movements"

    # Core fields
    id: UUID (PK)
    bin_content_id: UUID (FK bin_contents.id, RESTRICT)
    movement_type: Literal['receipt', 'issue', 'adjustment', 'transfer', 'scrap']
    quantity: Decimal (positive for receipt, negative for issue)
    quantity_before: Decimal
    quantity_after: Decimal

    # Tracking
    reason: VARCHAR(50) NOT NULL  # 'supplier_delivery', 'sales_order', etc.
    reference_number: VARCHAR(100) NULL  # PO-2025-001, SO-2025-001
    fefo_compliant: Boolean NULL  # Only for 'issue' movements
    force_override: Boolean DEFAULT false  # Non-FEFO issue with approval
    override_reason: Text NULL
    notes: Text NULL

    # Audit
    created_by: UUID (FK users.id, RESTRICT)
    created_at: TIMESTAMP WITH TZ NOT NULL

    # CONSTRAINTS:
    # - Check movement_type in allowed values
    # - created_at is immutable (set once, never updated)

    # INDEXES:
    # CREATE INDEX idx_movements_bin_content ON bin_movements(bin_content_id, created_at DESC)
    # CREATE INDEX idx_movements_type ON bin_movements(movement_type, created_at DESC)
    # CREATE INDEX idx_movements_user ON bin_movements(created_by, created_at DESC)
```

#### Task 3: Delete Obsolete Model
**FILE**: `w7-WHv1/backend/app/db/models/bin_history.py`

**DELETE** this file (replaced by bin_movement.py with different purpose)

#### Task 4: Create Database Migration
**FILE**: `w7-WHv1/backend/alembic/versions/YYYYMMDD_HHMMSS_phase3_inventory.py`

**CREATE** using alembic autogenerate:
```bash
cd w7-WHv1/backend
source ../../venv_linux/bin/activate
alembic revision --autogenerate -m "phase3_inventory_movements"
```

**MANUAL REVIEW** migration before applying:
- Verify column types match INITIAL3.md
- Verify foreign key ON DELETE actions (CASCADE for bins, RESTRICT for products/suppliers)
- Verify CHECK constraints are correct
- Verify indexes are created
- Add data migration if needed (unlikely since models are unused)

---

### List of Tasks (Implementation Order)

```yaml
# ============================================================
# PHASE 1: Database Layer (Models + Migration)
# ============================================================

Task 1: Modify BinContent Model
  FILE: w7-WHv1/backend/app/db/models/bin_content.py
  ACTIONS:
    - READ current model to understand structure
    - ADD fields: batch_number, quantity, unit, received_date, status, weight_kg
    - REMOVE fields: net_weight, gross_weight (or keep if backward compat needed)
    - UPDATE CheckConstraints for new fields
    - UPDATE relationships if needed
    - ADD __table_args__ indexes
  VALIDATE:
    - ruff check app/db/models/bin_content.py --fix
    - mypy app/db/models/bin_content.py

Task 2: Create BinMovement Model
  FILE: w7-WHv1/backend/app/db/models/bin_movement.py
  ACTIONS:
    - MIRROR pattern from: app/db/models/product.py (GUID, timestamps)
    - CREATE BinMovement class with all fields from INITIAL3.md
    - ADD relationships: bin_content, created_by_user
    - ADD CHECK constraint for movement_type
    - ADD indexes in __table_args__
  VALIDATE:
    - ruff check app/db/models/bin_movement.py --fix
    - mypy app/db/models/bin_movement.py

Task 3: Update Model __init__.py
  FILE: w7-WHv1/backend/app/db/models/__init__.py
  ACTIONS:
    - ADD: from app.db.models.bin_movement import BinMovement
    - REMOVE: from app.db.models.bin_history import BinHistory (if present)
    - ENSURE: BinContent import exists
  VALIDATE:
    - ruff check app/db/models/__init__.py

Task 4: Delete Obsolete BinHistory Model
  FILE: w7-WHv1/backend/app/db/models/bin_history.py
  ACTIONS:
    - DELETE file (no longer needed, replaced by BinMovement)

Task 5: Create Alembic Migration
  COMMAND: alembic revision --autogenerate -m "phase3_inventory_movements"
  ACTIONS:
    - RUN alembic autogenerate
    - REVIEW generated migration file
    - MODIFY if needed (verify constraints, indexes, ON DELETE actions)
    - TEST migration: alembic upgrade head
    - TEST rollback: alembic downgrade -1, then upgrade again
  VALIDATE:
    - alembic upgrade head  # Must succeed
    - alembic downgrade -1  # Must succeed
    - alembic upgrade head  # Must succeed again

# ============================================================
# PHASE 2: Schemas Layer (Pydantic Models)
# ============================================================

Task 6: Create Inventory Schemas
  FILE: w7-WHv1/backend/app/schemas/inventory.py
  ACTIONS:
    - MIRROR pattern from: app/schemas/bin.py (Pydantic v2, ConfigDict)
    - CREATE ReceiveRequest (bin_id, product_id, supplier_id, batch_number, dates, quantity, unit, etc.)
    - CREATE IssueRequest (bin_content_id, quantity, reason, reference_number, force_non_fefo, override_reason)
    - CREATE ReceiveResponse (bin_content_id, movement_id, bin_code, product_name, quantity, days_until_expiry, message)
    - CREATE IssueResponse (movement_id, quantity_issued, remaining_quantity, fefo_compliant, warning if applicable)
    - CREATE FEFORecommendation (bin_id, bin_code, batch_number, use_by_date, days_until_expiry, available_quantity, suggested_quantity, is_fefo_compliant)
    - CREATE FEFORecommendationResponse (product_id, product_name, requested_quantity, recommendations list, total_available, fefo_warnings)
    - CREATE StockLevel (product_id, product_name, sku, total_quantity, unit, bin_count, batch_count, oldest_expiry, newest_expiry, locations)
    - ADD @field_validator for date validations (use_by_date must be future, etc.)
  VALIDATE:
    - ruff check app/schemas/inventory.py --fix
    - mypy app/schemas/inventory.py

Task 7: Create Movement Schemas
  FILE: w7-WHv1/backend/app/schemas/movement.py
  ACTIONS:
    - CREATE MovementResponse (id, movement_type, bin_code, product_name, batch_number, quantity, unit, use_by_date, reason, reference_number, fefo_compliant, created_by username, created_at, notes)
    - CREATE MovementListResponse (items, total, page, page_size, pages)
    - CREATE MovementFilter (for query params: product_id, bin_id, movement_type, start_date, end_date)
  VALIDATE:
    - ruff check app/schemas/movement.py --fix
    - mypy app/schemas/movement.py

Task 8: Create Expiry Schemas
  FILE: w7-WHv1/backend/app/schemas/expiry.py
  ACTIONS:
    - CREATE ExpiryWarning (bin_content_id, bin_code, product_name, batch_number, quantity, unit, use_by_date, days_until_expiry, urgency: Literal['critical'|'high'|'medium'|'low'], warning_message)
    - CREATE ExpiryWarningResponse (items list, summary with counts by urgency)
    - CREATE ExpiredProduct (bin_content_id, bin_code, product_name, batch_number, quantity, unit, use_by_date, days_since_expiry, status, action_required message)
  VALIDATE:
    - ruff check app/schemas/expiry.py --fix
    - mypy app/schemas/expiry.py

# ============================================================
# PHASE 3: Service Layer (Business Logic)
# ============================================================

Task 9: Create Inventory Service
  FILE: w7-WHv1/backend/app/services/inventory.py
  ACTIONS:
    - MIRROR pattern from: app/services/bin.py (async functions, error handling)
    - CREATE receive_goods(db, receive_data, user_id) -> tuple[BinContent, BinMovement]
      * Validate bin exists and is empty or contains same product
      * Validate product exists and is active
      * Validate supplier exists and is active
      * Validate use_by_date is future date
      * Create/update BinContent record
      * Create BinMovement (type='receipt', quantity positive)
      * Update Bin status to 'occupied'
    - CREATE issue_goods(db, issue_data, user_id) -> tuple[BinContent, BinMovement]
      * Validate bin_content exists with sufficient quantity
      * Check FEFO compliance (call is_fefo_compliant())
      * If not FEFO and not force_override: raise ValueError(HU_MESSAGES["fefo_violation"])
      * Reduce quantity (or delete if quantity becomes 0)
      * Create BinMovement (type='issue', quantity negative)
      * Update Bin status to 'empty' if quantity is 0
    - CREATE adjust_stock(db, bin_content_id, new_quantity, reason, user_id) -> BinMovement
      * Manager+ only (checked in API layer)
      * Create adjustment movement
    - CREATE scrap_stock(db, bin_content_id, reason, user_id) -> BinMovement
      * Set BinContent status to 'scrapped'
      * Create scrap movement
    - CREATE get_stock_levels(db, warehouse_id, product_id) -> list[StockLevel]
      * Aggregate query GROUP BY product_id
    - CREATE get_bin_stock(db, bin_id) -> BinContent | None
    - CREATE get_warehouse_stock(db, warehouse_id) -> list[BinContent]
  VALIDATE:
    - ruff check app/services/inventory.py --fix
    - mypy app/services/inventory.py

Task 10: Create FEFO Service
  FILE: w7-WHv1/backend/app/services/fefo.py
  ACTIONS:
    - CREATE get_fefo_recommendation(db, product_id, quantity) -> FEFORecommendationResponse
      * Query all BinContent where product_id matches, status='available', quantity > 0
      * ORDER BY use_by_date ASC, batch_number ASC, received_date ASC
      * Calculate suggested_quantity for each bin
      * Flag warnings if multiple batches with different expiry
    - CREATE is_fefo_compliant(db, bin_content_id, product_id) -> tuple[bool, BinContent | None]
      * Check if this bin_content has the oldest expiry for this product
      * Return (True, None) if compliant
      * Return (False, oldest_bin_content) if non-compliant
    - CREATE calculate_days_until_expiry(use_by_date: date) -> int
      * Return (use_by_date - date.today()).days
  VALIDATE:
    - ruff check app/services/fefo.py --fix
    - mypy app/services/fefo.py

Task 11: Create Movement Service
  FILE: w7-WHv1/backend/app/services/movement.py
  ACTIONS:
    - CREATE create_movement(db, movement_data, user_id) -> BinMovement
      * Helper function to create movement records
      * Enforce immutability (no update/delete functions)
    - CREATE get_movements(db, filters, page, page_size) -> tuple[list[BinMovement], int]
      * Filter by: product_id, bin_id, movement_type, date_range, user_id
      * Paginate results
      * JOIN with bin_contents, products, bins for display
    - CREATE get_movement_by_id(db, movement_id) -> BinMovement | None
  VALIDATE:
    - ruff check app/services/movement.py --fix
    - mypy app/services/movement.py

Task 12: Create Expiry Service
  FILE: w7-WHv1/backend/app/services/expiry.py
  ACTIONS:
    - CREATE get_expiry_warnings(db, days_threshold, warehouse_id) -> ExpiryWarningResponse
      * Query BinContent where status='available' AND use_by_date <= today + threshold
      * Calculate urgency: critical (<7d), high (7-14d), medium (15-30d), low (31-60d)
      * Return items grouped by urgency
    - CREATE get_expired_products(db, warehouse_id) -> list[ExpiredProduct]
      * Query BinContent where use_by_date < today
    - CREATE calculate_urgency(days_until_expiry: int) -> Literal['critical'|'high'|'medium'|'low']
  VALIDATE:
    - ruff check app/services/expiry.py --fix
    - mypy app/services/expiry.py

# ============================================================
# PHASE 4: API Layer (Endpoints)
# ============================================================

Task 13: Create Inventory API Endpoints
  FILE: w7-WHv1/backend/app/api/v1/inventory.py
  ACTIONS:
    - MIRROR pattern from: app/api/v1/bins.py (router, RBAC deps, HTTPException)
    - CREATE router = APIRouter(prefix="/inventory", tags=["inventory"])
    - CREATE POST /receive (RequireWarehouse)
      * Call inventory.receive_goods()
      * Return ReceiveResponse with Hungarian message
    - CREATE POST /issue (RequireWarehouse)
      * Call inventory.issue_goods()
      * Handle FEFO violations with HTTPException(409, HU_MESSAGES["fefo_violation"])
      * Return IssueResponse
    - CREATE GET /fefo-recommendation (RequireViewer)
      * Query params: product_id, quantity
      * Call fefo.get_fefo_recommendation()
      * Return FEFORecommendationResponse
    - CREATE GET /stock-levels (RequireViewer)
      * Query params: warehouse_id, product_id
      * Call inventory.get_stock_levels()
    - CREATE GET /bins/{bin_id} (RequireViewer)
      * Call inventory.get_bin_stock()
    - CREATE GET /warehouse/{warehouse_id} (RequireViewer)
      * Call inventory.get_warehouse_stock()
    - CREATE GET /expiry-warnings (RequireViewer)
      * Query params: days_threshold (default 30), warehouse_id
      * Call expiry.get_expiry_warnings()
    - CREATE GET /expired (RequireViewer)
      * Call expiry.get_expired_products()
    - CREATE POST /adjust (RequireManager)
      * Call inventory.adjust_stock()
    - CREATE POST /scrap (RequireManager)
      * Call inventory.scrap_stock()
  VALIDATE:
    - ruff check app/api/v1/inventory.py --fix
    - mypy app/api/v1/inventory.py

Task 14: Create Movements API Endpoints
  FILE: w7-WHv1/backend/app/api/v1/movements.py
  ACTIONS:
    - CREATE router = APIRouter(prefix="/movements", tags=["movements"])
    - CREATE GET / (RequireViewer)
      * Query params: product_id, bin_id, movement_type, start_date, end_date, page, page_size
      * Call movement.get_movements()
      * Return MovementListResponse
    - CREATE GET /{movement_id} (RequireViewer)
      * Call movement.get_movement_by_id()
      * Return MovementResponse
  VALIDATE:
    - ruff check app/api/v1/movements.py --fix
    - mypy app/api/v1/movements.py

Task 15: Create Reports API Endpoints
  FILE: w7-WHv1/backend/app/api/v1/reports.py
  ACTIONS:
    - CREATE router = APIRouter(prefix="/reports", tags=["reports"])
    - CREATE GET /inventory-summary (RequireViewer)
      * Overall inventory snapshot
    - CREATE GET /product-locations (RequireViewer)
      * Query param: product_id
      * Show all bins containing this product
    - CREATE GET /expiry-timeline (RequireViewer)
      * Show expiry dates timeline
    - CREATE GET /movement-history (RequireViewer)
      * Movement history report with filters
  VALIDATE:
    - ruff check app/api/v1/reports.py --fix
    - mypy app/api/v1/reports.py

Task 16: Register New Routers
  FILE: w7-WHv1/backend/app/api/v1/__init__.py
  ACTIONS:
    - ADD: from app.api.v1 import inventory, movements, reports
    - INCLUDE routers in main API router
  VALIDATE:
    - Ensure app starts without import errors

Task 17: Add Hungarian Messages
  FILE: w7-WHv1/backend/app/core/i18n.py
  ACTIONS:
    - ADD all Hungarian messages from INITIAL3.md to HU_MESSAGES dict
    - Messages for: receipt, issue, FEFO, expiry, movements, validation errors
  VALIDATE:
    - ruff check app/core/i18n.py

# ============================================================
# PHASE 5: Testing (Comprehensive Coverage)
# ============================================================

Task 18: Create Inventory Tests
  FILE: w7-WHv1/backend/app/tests/test_inventory.py
  ACTIONS:
    - MIRROR pattern from: app/tests/test_bins.py (AsyncClient, fixtures, test classes)
    - CREATE TestReceiveGoods class
      * test_receive_into_empty_bin (happy path)
      * test_receive_into_occupied_bin_same_product (should succeed)
      * test_receive_into_occupied_bin_different_product (should fail 409)
      * test_receive_with_past_expiry_date (should fail 400)
      * test_receive_unauthorized_viewer (should fail 403)
    - CREATE TestIssueGoods class
      * test_issue_fefo_compliant (happy path)
      * test_issue_non_fefo_as_warehouse (should fail 409 or warn)
      * test_issue_non_fefo_as_manager_with_override (should succeed)
      * test_issue_insufficient_quantity (should fail 400)
      * test_issue_from_expired_batch (should fail 400)
    - CREATE TestStockQueries class
      * test_get_stock_levels
      * test_get_bin_stock
      * test_get_warehouse_stock
  VALIDATE:
    - pytest app/tests/test_inventory.py -v
    - All tests must pass

Task 19: Create FEFO Algorithm Tests
  FILE: w7-WHv1/backend/app/tests/test_fefo.py
  ACTIONS:
    - CREATE TestFEFORecommendation class
      * test_fefo_single_batch (simple case)
      * test_fefo_multiple_batches_sorted_by_expiry (verify order)
      * test_fefo_same_expiry_different_batch_numbers (sort by batch_number)
      * test_fefo_no_available_stock (empty result)
      * test_fefo_partial_quantity (suggest from multiple bins)
    - CREATE TestFEFOCompliance class
      * test_is_fefo_compliant_oldest_batch (should be true)
      * test_is_fefo_compliant_newer_batch (should be false, return oldest)
  VALIDATE:
    - pytest app/tests/test_fefo.py -v
    - All tests must pass

Task 20: Create Movement Tests
  FILE: w7-WHv1/backend/app/tests/test_movements.py
  ACTIONS:
    - CREATE TestMovementHistory class
      * test_create_receipt_movement
      * test_create_issue_movement
      * test_movement_immutable (attempt update/delete should fail at service level)
      * test_get_movements_filter_by_product
      * test_get_movements_filter_by_date_range
      * test_get_movements_filter_by_user
      * test_movement_includes_user_info (created_by username)
  VALIDATE:
    - pytest app/tests/test_movements.py -v
    - All tests must pass

Task 21: Create Expiry Tests
  FILE: w7-WHv1/backend/app/tests/test_expiry.py
  ACTIONS:
    - CREATE TestExpiryWarnings class
      * test_expiry_warning_critical_7days (urgency='critical')
      * test_expiry_warning_high_14days (urgency='high')
      * test_expiry_warning_medium_30days (urgency='medium')
      * test_no_warnings_far_future_expiry
    - CREATE TestExpiredProducts class
      * test_get_expired_products (use_by_date < today)
      * test_no_expired_products
  VALIDATE:
    - pytest app/tests/test_expiry.py -v
    - All tests must pass

Task 22: Run Full Test Suite
  COMMAND: pytest w7-WHv1/backend/app/tests/ -v --cov=app --cov-report=term
  ACTIONS:
    - Ensure all 88 Phase 2 tests still pass
    - Ensure all 40+ Phase 3 tests pass
    - Target: 128+ total tests passing
    - Coverage > 80%
  VALIDATE:
    - pytest must exit with code 0
    - No failing tests

# ============================================================
# PHASE 6: Final Validation
# ============================================================

Task 23: Run Linters and Type Checkers
  COMMANDS:
    - ruff check w7-WHv1/backend/app --fix
    - mypy w7-WHv1/backend/app
  ACTIONS:
    - Fix any linting errors
    - Fix any type errors
  VALIDATE:
    - Both commands must succeed with no errors

Task 24: Integration Test with Docker
  COMMANDS:
    - cd w7-WHv1 && docker-compose up -d db valkey
    - cd backend && alembic upgrade head
    - pytest -v
  ACTIONS:
    - Test against real PostgreSQL (not SQLite)
    - Verify migrations work correctly
  VALIDATE:
    - All tests pass against PostgreSQL

Task 25: Update Documentation
  FILES:
    - TASK.md: Mark Phase 3 tasks as completed
    - CLAUDE.md: Update status to Phase 3 complete (if needed)
  ACTIONS:
    - Document any discovered issues or future enhancements
  VALIDATE:
    - Files updated and committed
```

---

### Per Task Pseudocode (Critical Tasks Only)

#### Task 9: Inventory Service - receive_goods()
```python
async def receive_goods(
    db: AsyncSession,
    receive_data: ReceiveRequest,
    user_id: UUID,
) -> tuple[BinContent, BinMovement]:
    """
    Receive product into bin with full traceability.

    CRITICAL STEPS:
    1. Validate bin exists and is empty OR contains same product
    2. Validate product and supplier exist and are active
    3. Validate dates (use_by_date > today, freeze_date <= today)
    4. Create/Update BinContent record
    5. Create BinMovement (type='receipt', quantity positive)
    6. Update Bin.status to 'occupied'
    7. Return both records
    """

    # 1. Validate bin
    bin_obj = await get_bin_by_id(db, receive_data.bin_id)
    if not bin_obj:
        raise ValueError(HU_MESSAGES["bin_not_found"])
    if not bin_obj.is_active:
        raise ValueError(HU_MESSAGES["bin_inactive"])

    # Check if bin is occupied by different product
    existing_content = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == receive_data.bin_id,
            BinContent.product_id != receive_data.product_id
        )
    )
    if existing_content.scalar_one_or_none():
        raise ValueError(HU_MESSAGES["bin_already_occupied"])

    # 2. Validate product and supplier
    product = await get_product_by_id(db, receive_data.product_id)
    if not product or not product.is_active:
        raise ValueError(HU_MESSAGES["product_not_found"])

    supplier = await get_supplier_by_id(db, receive_data.supplier_id)
    if not supplier or not supplier.is_active:
        raise ValueError(HU_MESSAGES["supplier_not_found"])

    # 3. Validate dates
    from datetime import date
    if receive_data.use_by_date <= date.today():
        raise ValueError(HU_MESSAGES["expiry_date_past"])
    if receive_data.freeze_date and receive_data.freeze_date > date.today():
        raise ValueError(HU_MESSAGES["freeze_date_future"])

    # 4. Create or update BinContent
    # Check if content already exists (same bin + product)
    result = await db.execute(
        select(BinContent).where(
            BinContent.bin_id == receive_data.bin_id,
            BinContent.product_id == receive_data.product_id
        )
    )
    bin_content = result.scalar_one_or_none()

    if bin_content:
        # Update existing (add to quantity)
        quantity_before = bin_content.quantity
        bin_content.quantity += receive_data.quantity
        quantity_after = bin_content.quantity
    else:
        # Create new
        bin_content = BinContent(
            bin_id=receive_data.bin_id,
            product_id=receive_data.product_id,
            supplier_id=receive_data.supplier_id,
            batch_number=receive_data.batch_number,
            use_by_date=receive_data.use_by_date,
            best_before_date=receive_data.best_before_date,
            freeze_date=receive_data.freeze_date,
            quantity=receive_data.quantity,
            unit=receive_data.unit,
            pallet_count=receive_data.pallet_count,
            weight_kg=receive_data.weight_kg,
            received_date=datetime.now(UTC),
            status="available",
            notes=receive_data.notes,
        )
        db.add(bin_content)
        await db.flush()
        quantity_before = 0
        quantity_after = bin_content.quantity

    # 5. Create BinMovement (receipt)
    movement = BinMovement(
        bin_content_id=bin_content.id,
        movement_type="receipt",
        quantity=receive_data.quantity,  # Positive
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        reason="supplier_delivery",
        reference_number=receive_data.reference_number,
        notes=receive_data.notes,
        created_by=user_id,
    )
    db.add(movement)

    # 6. Update Bin status
    bin_obj.status = "occupied"

    await db.flush()
    await db.refresh(bin_content)
    await db.refresh(movement)

    return bin_content, movement
```

#### Task 10: FEFO Service - get_fefo_recommendation()
```python
async def get_fefo_recommendation(
    db: AsyncSession,
    product_id: UUID,
    quantity: float,
) -> FEFORecommendationResponse:
    """
    Get FEFO-compliant picking recommendation.

    CRITICAL: Sort by use_by_date ASC, batch_number ASC, received_date ASC
    """

    # Query all available stock for this product
    result = await db.execute(
        select(BinContent)
        .join(Bin, BinContent.bin_id == Bin.id)
        .where(
            BinContent.product_id == product_id,
            BinContent.status == "available",
            BinContent.quantity > 0,
        )
        .order_by(
            BinContent.use_by_date.asc(),
            BinContent.batch_number.asc(),
            BinContent.received_date.asc(),
        )
    )
    available_bins = result.scalars().all()

    if not available_bins:
        return FEFORecommendationResponse(
            product_id=product_id,
            product_name="",  # Fetch from product
            requested_quantity=quantity,
            recommendations=[],
            total_available=0,
            fefo_warnings=[],
        )

    # Calculate suggestions
    recommendations = []
    remaining_needed = quantity

    for bin_content in available_bins:
        if remaining_needed <= 0:
            break

        suggested_qty = min(bin_content.quantity, remaining_needed)
        days_until_expiry = (bin_content.use_by_date - date.today()).days

        recommendations.append(
            FEFORecommendation(
                bin_id=bin_content.bin_id,
                bin_code=bin_content.bin.code,
                batch_number=bin_content.batch_number,
                use_by_date=bin_content.use_by_date,
                days_until_expiry=days_until_expiry,
                available_quantity=bin_content.quantity,
                suggested_quantity=suggested_qty,
                is_fefo_compliant=True,  # All in order are compliant
                warning=None if days_until_expiry > 7 else f"Lejárat közel: {days_until_expiry} nap",
            )
        )

        remaining_needed -= suggested_qty

    total_available = sum(bc.quantity for bc in available_bins)

    # Check for expiry warnings
    fefo_warnings = []
    if recommendations and recommendations[0].days_until_expiry < 7:
        fefo_warnings.append("FIGYELEM: A legrégebbi tétel 7 napon belül lejár!")

    return FEFORecommendationResponse(
        product_id=product_id,
        product_name=available_bins[0].product.name,
        requested_quantity=quantity,
        recommendations=recommendations,
        total_available=total_available,
        fefo_warnings=fefo_warnings,
    )
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
# Activate venv
cd w7-WHv1/backend
source ../../venv_linux/bin/activate

# Run ruff (linter + formatter)
ruff check app/ --fix
ruff format app/

# Run mypy (type checker)
mypy app/

# Expected: No errors. If errors, READ the error and fix the code.
```

### Level 2: Unit Tests
```bash
# Run Phase 3 tests
pytest app/tests/test_inventory.py -v
pytest app/tests/test_fefo.py -v
pytest app/tests/test_movements.py -v
pytest app/tests/test_expiry.py -v

# Run all tests (including Phase 1 & 2)
pytest app/tests/ -v

# Expected: 128+ tests passing (88 Phase 1+2, 40+ Phase 3)
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test (Docker + PostgreSQL)
```bash
# Start services
cd w7-WHv1
docker-compose up -d db valkey

# Run migrations
cd backend
alembic upgrade head

# Run tests against PostgreSQL
TEST_DATABASE_URL="postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms" pytest -v

# Expected: All tests pass against real PostgreSQL
```

### Level 4: Manual API Test
```bash
# Start backend
cd w7-WHv1/backend
uvicorn app.main:app --reload

# Test receipt endpoint
curl -X POST http://localhost:8000/api/v1/inventory/receive \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_id": "uuid",
    "product_id": "uuid",
    "supplier_id": "uuid",
    "batch_number": "BATCH-2025-001",
    "use_by_date": "2025-12-31",
    "quantity": 100.0,
    "unit": "kg"
  }'

# Expected: {"bin_content_id": "...", "message": "Termék sikeresen beérkeztetve."}

# Test FEFO recommendation
curl -X GET "http://localhost:8000/api/v1/inventory/fefo-recommendation?product_id=uuid&quantity=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: {"recommendations": [...], "fefo_warnings": [...]}
```

---

## Final Validation Checklist
- [ ] All 88 Phase 2 tests still pass
- [ ] All 40+ Phase 3 tests pass (128+ total)
- [ ] No linting errors: `ruff check app/`
- [ ] No type errors: `mypy app/`
- [ ] Migration succeeds: `alembic upgrade head`
- [ ] Migration rollback succeeds: `alembic downgrade -1`
- [ ] Receipt endpoint works (manual test)
- [ ] Issue endpoint enforces FEFO (manual test)
- [ ] FEFO recommendation returns correct order
- [ ] Expiry warnings show correct urgency levels
- [ ] Movement history is immutable (no update/delete endpoints)
- [ ] All Hungarian messages present in i18n.py
- [ ] Documentation updated (TASK.md)

---

## Anti-Patterns to Avoid
- ❌ Don't use Pydantic v1 syntax (`@validator`, `class Config`)
- ❌ Don't use SQLAlchemy 1.x syntax (`session.query()`)
- ❌ Don't use naive datetime (`datetime.utcnow()`)
- ❌ Don't create update/delete endpoints for BinMovement (immutable!)
- ❌ Don't skip FEFO checks for warehouse users (only manager can override)
- ❌ Don't allow bin to contain multiple different products
- ❌ Don't forget to update bin.status when content changes
- ❌ Don't use hardcoded strings for errors (use HU_MESSAGES)
- ❌ Don't skip validation in service layer (API is not the only entry point)
- ❌ Don't batch test runs without reading failures (fix immediately)
- ❌ Don't ignore type hints (mypy will catch bugs early)

---

## PRP Quality Score

**Confidence Level**: 9/10

**Reasoning**:
- ✅ Comprehensive context (15+ reference files, patterns, gotchas)
- ✅ Clear task breakdown (25 tasks in dependency order)
- ✅ Pseudocode for critical FEFO and inventory logic
- ✅ Executable validation gates (ruff, mypy, pytest)
- ✅ Reference patterns from Phase 2 (88 passing tests)
- ✅ Hungarian i18n requirements documented
- ✅ Database migration strategy clear
- ✅ RBAC patterns specified
- ⚠️ Minor risk: FEFO algorithm complexity (multiple sort keys)
- ⚠️ Minor risk: Existing models need modification (breaking change)

**Why not 10/10**:
- FEFO algorithm needs careful testing with edge cases (same expiry, same batch, etc.)
- Model modifications require careful migration (though existing models are unused)
- Integration between multiple services needs coordination (inventory ↔ FEFO ↔ movement)

**Mitigation**:
- Write comprehensive tests for FEFO (Task 19)
- Test migration both upgrade and downgrade (Task 5)
- Use type hints and mypy to catch integration issues early
- Follow existing patterns strictly (bins.py, products.py as templates)

---

## Success Metrics
After implementation, Phase 3 is complete when:
1. **All tests pass**: 128+ tests (88 Phase 2 + 40+ Phase 3)
2. **FEFO enforced**: Warehouse users cannot violate FEFO without manager override
3. **Audit trail complete**: Every receipt/issue has immutable movement record
4. **Expiry warnings work**: Critical alerts for <7 days, high for 7-14 days
5. **Hungarian UI**: All error messages in Hungarian
6. **No tech debt**: ruff + mypy pass, coverage >80%
7. **Documentation current**: TASK.md updated, INITIAL3.md requirements met

**Next Steps** (Phase 4):
- Stock reservations for orders
- Transfer between bins
- Barcode scanning integration
- Automated expiry notifications (email/SMS)
- Temperature monitoring (cold chain)
