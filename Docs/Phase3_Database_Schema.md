# WMS Phase 3: Database Schema

**Version**: 3.0
**Last Updated**: December 2025

## Overview

Phase 3 adds **2 new tables** to support inventory operations with FEFO enforcement:

1. **`bin_contents`** - Current inventory state in bins (batch tracking, expiry dates)
2. **`bin_movements`** - Immutable audit trail of all inventory transactions

These tables complete the data model for a full-featured warehouse management system with regulatory compliance and traceability.

###Phase 3 Changes Summary

| Change Type | Details |
|-------------|---------|
| **New Tables** | `bin_contents`, `bin_movements` |
| **Modified Tables** | `bins` (relationship changed to `contents` list) |
| **Deleted Tables** | `bin_history` (replaced by `bin_movements`) |
| **New Indexes** | 7 indexes for FEFO and audit queries |
| **New Constraints** | 5 CHECK constraints, 3 foreign keys |

---

## Updated Entity Relationship Diagram

```
┌─────────────┐
│  warehouses │
│  (Phase 1)  │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴──────┐
│    bins     │
│  (Phase 2)  │
└──────┬──────┘
       │ 1
       │
       │ N
┌──────┴────────────┐
│  bin_contents     │◄────┐
│  (Phase 3 NEW)    │     │
└────┬─────┬────────┘     │
     │     │ 1             │
     │     │               │
     │     │ N             │
     │ ┌───┴────────────┐  │
     │ │ bin_movements  │  │ 1
     │ │ (Phase 3 NEW)  │──┘
     │ └───┬────────────┘
     │     │
     │     │ N
     │     │
     │ N   │ 1
     │ ┌───┴────┐
     └─┤  users │
       │ (Phase1│
       └────────┘

┌───────────┐      ┌────────────┐
│  products │      │ suppliers  │
│ (Phase 2) │      │ (Phase 2)  │
└─────┬─────┘      └──────┬─────┘
      │ 1                 │ 1
      │                   │
      │ N                 │ N
      └────────┬──────────┘
               │
         ┌─────┴─────────┐
         │ bin_contents  │
         │ (Phase 3)     │
         └───────────────┘
```

**Key Relationships**:
- One bin → many bin_contents (multiple batches)
- One product → many bin_contents (across bins)
- One supplier → many bin_contents
- One bin_content → many bin_movements (audit trail)
- One user → many bin_movements (user attribution)

---

## 1. bin_contents Table (NEW)

**Purpose**: Tracks current inventory state in bins with batch-level detail and expiry dates for FEFO compliance.

### Column Specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL, DEFAULT uuid_generate_v4() | Unique bin content identifier |
| `bin_id` | UUID | FK bins.id ON DELETE CASCADE, NOT NULL | Parent bin (one product per bin) |
| `product_id` | UUID | FK products.id ON DELETE RESTRICT, NOT NULL | Product being stored |
| `supplier_id` | UUID | FK suppliers.id ON DELETE SET NULL, NULL | Supplier of goods (optional) |
| `batch_number` | VARCHAR(100) | NOT NULL | Batch/lot number for traceability |
| `use_by_date` | DATE | NOT NULL | Expiration date (mandatory for food) |
| `best_before_date` | DATE | NULL | Optional quality guarantee date |
| `freeze_date` | DATE | NULL | Date product was frozen (if applicable) |
| `quantity` | NUMERIC(10,2) | NOT NULL, CHECK > 0 | Current quantity in bin |
| `unit` | VARCHAR(50) | NOT NULL | Unit of measurement (kg, db, l) |
| `pallet_count` | INTEGER | NULL, CHECK > 0 if present | Number of pallets |
| `weight_kg` | NUMERIC(10,2) | NULL | Total weight in kilograms |
| `received_date` | TIMESTAMPTZ | NOT NULL | When product entered warehouse |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'available', CHECK enum | available, reserved, expired, scrapped |
| `notes` | TEXT | NULL | Additional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Check Constraints

```sql
-- use_by_date must be after best_before_date (if both present)
CONSTRAINT check_use_by_after_best_before
  CHECK (use_by_date >= best_before_date OR best_before_date IS NULL)

-- Quantity must be positive
CONSTRAINT check_positive_quantity
  CHECK (quantity > 0)

-- Pallet count must be positive if provided
CONSTRAINT check_positive_pallet_count
  CHECK (pallet_count > 0 OR pallet_count IS NULL)

-- Status must be valid enum
CONSTRAINT check_bin_content_status
  CHECK (status IN ('available', 'reserved', 'expired', 'scrapped'))
```

### Indexes

```sql
-- For FEFO queries (most important index)
CREATE INDEX idx_bin_contents_product_status
  ON bin_contents (product_id, status, use_by_date);

-- For expiry warnings
CREATE INDEX idx_bin_contents_expiry
  ON bin_contents (use_by_date);

-- For bin occupancy checks
CREATE INDEX idx_bin_contents_bin
  ON bin_contents (bin_id);
```

### Foreign Keys

- `bin_id` → `bins.id` (CASCADE on delete - if bin deleted, contents deleted)
- `product_id` → `products.id` (RESTRICT on delete - prevent deletion if inventory exists)
- `supplier_id` → `suppliers.id` (SET NULL on delete - preserve history)

### Business Rules

1. **One Bin = One Product** (at a time)
   - No unique constraint on `bin_id` (allows multiple batches)
   - Application-level validation prevents different products in same bin

2. **Multiple Batches Allowed**
   - Same product can have multiple `bin_contents` records in one bin
   - Different `batch_number` for each delivery

3. **FEFO Sort Priority**
   - Primary: `use_by_date ASC`
   - Tiebreaker: `batch_number ASC`
   - Final tiebreaker: `received_date ASC`

4. **Status Lifecycle**
   ```
   available → reserved (Phase 4)
   available → expired (auto-detect)
   available → scrapped (manager action)
   expired → scrapped (cleanup)
   ```

### SQLAlchemy 2.0 Model

```python
from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, datetime
from decimal import Decimal
import uuid

class BinContent(Base):
    """Current content of a bin (one product, multiple batches allowed)."""

    __tablename__ = "bin_contents"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    bin_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("bins.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("products.id", ondelete="RESTRICT"))
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(GUID(), ForeignKey("suppliers.id", ondelete="SET NULL"))

    batch_number: Mapped[str] = mapped_column(String(100))
    use_by_date: Mapped[date] = mapped_column(Date)
    best_before_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    freeze_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    unit: Mapped[str] = mapped_column(String(50))
    pallet_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    received_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), default="available")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    __table_args__ = (
        CheckConstraint("use_by_date >= best_before_date OR best_before_date IS NULL"),
        CheckConstraint("quantity > 0"),
        CheckConstraint("pallet_count > 0 OR pallet_count IS NULL"),
        CheckConstraint("status IN ('available', 'reserved', 'expired', 'scrapped')"),
        Index("idx_bin_contents_product_status", "product_id", "status", "use_by_date"),
        Index("idx_bin_contents_expiry", "use_by_date"),
        Index("idx_bin_contents_bin", "bin_id"),
    )

    # Relationships
    bin: Mapped["Bin"] = relationship(back_populates="contents")
    product: Mapped["Product"] = relationship()
    supplier: Mapped["Supplier | None"] = relationship()
```

### Example JSON Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "bin_id": "450e8400-e29b-41d4-a716-446655440000",
  "product_id": "650e8400-e29b-41d4-a716-446655440000",
  "supplier_id": "750e8400-e29b-41d4-a716-446655440000",
  "batch_number": "BATCH-2025-001",
  "use_by_date": "2025-03-15",
  "best_before_date": "2025-03-10",
  "freeze_date": null,
  "quantity": 100.0,
  "unit": "kg",
  "pallet_count": 5,
  "weight_kg": 500.0,
  "received_date": "2025-01-15T08:30:00+01:00",
  "status": "available",
  "notes": "Friss áru, hűtve tárolandó",
  "created_at": "2025-01-15T08:30:00+01:00",
  "updated_at": "2025-01-15T08:30:00+01:00"
}
```

---

## 2. bin_movements Table (NEW)

**Purpose**: Immutable audit trail of all inventory transactions for regulatory compliance and traceability.

### Column Specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL, DEFAULT uuid_generate_v4() | Unique movement identifier |
| `bin_content_id` | UUID | FK bin_contents.id ON DELETE RESTRICT, NOT NULL | Bin content affected |
| `movement_type` | VARCHAR(20) | NOT NULL, CHECK enum | receipt, issue, adjustment, transfer, scrap |
| `quantity` | NUMERIC(10,2) | NOT NULL | Quantity change (+ for receipt, - for issue) |
| `quantity_before` | NUMERIC(10,2) | NOT NULL | Quantity before movement |
| `quantity_after` | NUMERIC(10,2) | NOT NULL | Quantity after movement |
| `reason` | VARCHAR(50) | NOT NULL | Reason code (sales_order, stocktake, etc.) |
| `reference_number` | VARCHAR(100) | NULL | PO/SO/adjustment reference |
| `fefo_compliant` | BOOLEAN | NULL | FEFO compliance flag (only for issue) |
| `force_override` | BOOLEAN | NOT NULL, DEFAULT false | True if non-FEFO with manager approval |
| `override_reason` | TEXT | NULL | Justification for FEFO override |
| `notes` | TEXT | NULL | Additional notes |
| `created_by` | UUID | FK users.id ON DELETE RESTRICT, NOT NULL | User who performed action |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Movement timestamp |

### Check Constraints

```sql
-- Movement type must be valid enum
CONSTRAINT check_movement_type
  CHECK (movement_type IN ('receipt', 'issue', 'adjustment', 'transfer', 'scrap'))
```

### Indexes

```sql
-- For bin content history queries (most important)
CREATE INDEX idx_movements_bin_content
  ON bin_movements (bin_content_id, created_at);

-- For movement type filtering
CREATE INDEX idx_movements_type
  ON bin_movements (movement_type, created_at);

-- For user activity tracking
CREATE INDEX idx_movements_user
  ON bin_movements (created_by, created_at);

-- For chronological queries
CREATE INDEX idx_movements_created
  ON bin_movements (created_at);
```

### Foreign Keys

- `bin_content_id` → `bin_contents.id` (RESTRICT on delete - preserve audit trail)
- `created_by` → `users.id` (RESTRICT on delete - preserve user attribution)

### Immutability Enforcement

**Critical Design Principle**: Movement records are **NEVER updated or deleted** after creation.

**Application-Level Enforcement**:
- No UPDATE endpoints in API
- No DELETE endpoints in API
- SQLAlchemy ORM prevents accidental updates (document in code comments)

**Optional Database-Level Enforcement** (not implemented, but possible):
```sql
-- Trigger to prevent updates (optional)
CREATE TRIGGER prevent_movement_update
  BEFORE UPDATE ON bin_movements
  FOR EACH ROW
  EXECUTE FUNCTION raise_exception('Movement records are immutable');

-- Trigger to prevent deletes (optional)
CREATE TRIGGER prevent_movement_delete
  BEFORE DELETE ON bin_movements
  FOR EACH ROW
  EXECUTE FUNCTION raise_exception('Movement records cannot be deleted');
```

### Movement Types

| Type | Description | Quantity Sign | FEFO Relevant |
|------|-------------|---------------|---------------|
| `receipt` | Incoming goods from supplier | Positive (+) | No |
| `issue` | Outgoing goods to customer/production | Negative (-) | Yes |
| `adjustment` | Stock correction (stocktake, damage) | + or - | No |
| `transfer` | Move between bins (Phase 4) | - (from) / + (to) | No |
| `scrap` | Write-off expired/damaged stock | Negative (-) | No |

### Quantity Snapshot Pattern

Every movement records before/after state:

```
Receipt:    0 kg → +100 kg → 100 kg
Issue:    100 kg →  -30 kg →  70 kg
Issue:     70 kg →  -20 kg →  50 kg
Adjustment: 50 kg →  +10 kg →  60 kg (stocktake correction)
Scrap:     60 kg →  -60 kg →   0 kg
```

**Validation**: `quantity_after = quantity_before + quantity`

### SQLAlchemy 2.0 Model

```python
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from decimal import Decimal
import uuid

class BinMovement(Base):
    """Immutable audit trail of all inventory movements."""

    __tablename__ = "bin_movements"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    bin_content_id: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("bin_contents.id", ondelete="RESTRICT"))

    movement_type: Mapped[str] = mapped_column(String(20))
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), comment="Positive for receipt, negative for issue")
    quantity_before: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    quantity_after: Mapped[Decimal] = mapped_column(Numeric(10, 2))

    reason: Mapped[str] = mapped_column(String(50))
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)

    fefo_compliant: Mapped[bool | None] = mapped_column(Boolean, nullable=True, comment="Only for issue movements")
    force_override: Mapped[bool] = mapped_column(Boolean, default=False, comment="True if non-FEFO with manager approval")
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    __table_args__ = (
        CheckConstraint("movement_type IN ('receipt', 'issue', 'adjustment', 'transfer', 'scrap')"),
        Index("idx_movements_bin_content", "bin_content_id", "created_at"),
        Index("idx_movements_type", "movement_type", "created_at"),
        Index("idx_movements_user", "created_by", "created_at"),
        Index("idx_movements_created", "created_at"),
    )

    # Relationships
    bin_content: Mapped["BinContent"] = relationship()
    created_by_user: Mapped["User"] = relationship()
```

### Example Audit Trail Sequence

```json
[
  {
    "id": "750e8400-e29b-41d4-a716-446655440001",
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
    "movement_type": "receipt",
    "quantity": 100.0,
    "quantity_before": 0.0,
    "quantity_after": 100.0,
    "reason": "supplier_delivery",
    "reference_number": "PO-2025-001",
    "fefo_compliant": null,
    "force_override": false,
    "override_reason": null,
    "notes": "Friss áru beérkeztetés",
    "created_by": "admin_uuid",
    "created_at": "2025-01-15T08:30:00+01:00"
  },
  {
    "id": "850e8400-e29b-41d4-a716-446655440002",
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
    "movement_type": "issue",
    "quantity": -30.0,
    "quantity_before": 100.0,
    "quantity_after": 70.0,
    "reason": "sales_order",
    "reference_number": "SO-2025-001",
    "fefo_compliant": true,
    "force_override": false,
    "override_reason": null,
    "notes": null,
    "created_by": "warehouse_user_uuid",
    "created_at": "2025-01-20T14:15:00+01:00"
  },
  {
    "id": "950e8400-e29b-41d4-a716-446655440003",
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
    "movement_type": "adjustment",
    "quantity": 5.0,
    "quantity_before": 70.0,
    "quantity_after": 75.0,
    "reason": "stocktake",
    "reference_number": "STOCK-2025-001",
    "fefo_compliant": null,
    "force_override": false,
    "override_reason": null,
    "notes": "Leltári korrekció",
    "created_by": "manager_uuid",
    "created_at": "2025-02-01T16:00:00+01:00"
  }
]
```

---

## 3. bins Table (MODIFIED)

**Change**: Relationship updated to support multiple `bin_contents` per bin (multiple batches).

### Before (Phase 2)

```python
class Bin(Base):
    content: Mapped["BinContent | None"] = relationship(back_populates="bin", uselist=False)
```

### After (Phase 3)

```python
class Bin(Base):
    contents: Mapped[list["BinContent"]] = relationship(back_populates="bin", cascade="all, delete-orphan")
```

**Impact**:
- One bin can now have multiple `BinContent` records (different batches)
- Still constrained to one product (enforced at application level)
- When bin deleted, all associated `bin_contents` are cascaded deleted

### Bin Status Auto-Update Logic

Bin status is derived from `bin_contents`:

```python
# Pseudocode for bin status update
if bin_contents.filter(quantity > 0).exists():
    if bin_contents.filter(status='reserved').exists():
        bin.status = 'reserved'
    else:
        bin.status = 'occupied'
elif bin_contents.filter(status='expired').count() > 0:
    bin.status = 'occupied'  # Still occupied, needs cleanup
else:
    bin.status = 'empty'
```

---

## Data Integrity and Constraints

### Foreign Key Strategy

| Relationship | On Delete | Rationale |
|--------------|-----------|-----------|
| bin_contents → bins | CASCADE | Bin deletion removes all contents |
| bin_contents → products | RESTRICT | Prevent product deletion if inventory exists |
| bin_contents → suppliers | SET NULL | Preserve history if supplier deleted |
| bin_movements → bin_contents | RESTRICT | Preserve audit trail (immutable) |
| bin_movements → users | RESTRICT | Preserve user attribution (immutable) |

### Transaction Isolation

All inventory operations use **database transactions** for ACID compliance:

```python
async with db.begin():
    # Create BinContent
    # Create BinMovement
    # Update Bin status
    # Commit transaction (all or nothing)
```

### Concurrent Access

**Potential Race Condition**: Two users issuing from same bin simultaneously

**Solution**: Optimistic locking with quantity validation:
```sql
UPDATE bin_contents
SET quantity = quantity - ?
WHERE id = ? AND quantity >= ?
RETURNING *;
```

If no rows returned, quantity was insufficient (concurrent issue).

---

## Indexes and Performance

### FEFO Query Performance

**Query**:
```sql
SELECT * FROM bin_contents
WHERE product_id = ? AND status = 'available' AND quantity > 0
ORDER BY use_by_date ASC, batch_number ASC, received_date ASC;
```

**Optimized by**: `idx_bin_contents_product_status (product_id, status, use_by_date)`

**Expected Performance**: O(log n) seek + O(k) scan where k = matching rows

**Benchmark** (1000 bins, 100 for product):
- Index seek: ~1ms
- Result fetch (10 rows): ~2ms
- **Total: ~3ms**

### Movement History Query Performance

**Query**:
```sql
SELECT * FROM bin_movements
WHERE bin_content_id = ?
ORDER BY created_at DESC
LIMIT 50;
```

**Optimized by**: `idx_movements_bin_content (bin_content_id, created_at)`

**Expected Performance**: O(log n) + O(50) = ~5ms for 10k movements

---

## Migration Strategy

### Alembic Migration File

**Filename**: `20251221_074407_fb475d91443e_phase3_inventory_movements.py`

**Operations**:
1. Create `bin_contents` table
2. Create `bin_movements` table
3. Add indexes
4. Drop `bin_history` table (obsolete)

### Migration Commands

```bash
# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1

# Check current version
alembic current
```

### Data Migration Considerations

**From Phase 2 to Phase 3**:
- No data migration needed (new tables only)
- Existing bins remain empty (no pre-existing inventory)
- Manual data entry required for initial stock (via `/inventory/receive`)

**Rollback Impact**:
- `bin_contents` and `bin_movements` tables dropped
- **Audit trail permanently lost** (immutable records)
- Recommend database backup before migration

---

## Query Patterns

### 1. Get FEFO Recommendation

```sql
SELECT
    bc.id AS bin_content_id,
    b.code AS bin_code,
    bc.batch_number,
    bc.use_by_date,
    bc.quantity AS available_quantity
FROM bin_contents bc
JOIN bins b ON bc.bin_id = b.id
WHERE bc.product_id = :product_id
  AND bc.status = 'available'
  AND bc.quantity > 0
ORDER BY bc.use_by_date ASC, bc.batch_number ASC, bc.received_date ASC;
```

### 2. Get Stock Levels by Product

```sql
SELECT
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    SUM(bc.quantity) AS total_quantity,
    bc.unit,
    COUNT(DISTINCT bc.bin_id) AS bin_count,
    COUNT(bc.id) AS batch_count,
    MIN(bc.use_by_date) AS oldest_expiry,
    MAX(bc.use_by_date) AS newest_expiry
FROM bin_contents bc
JOIN products p ON bc.product_id = p.id
WHERE bc.status = 'available' AND bc.quantity > 0
GROUP BY p.id, p.name, p.sku, bc.unit;
```

### 3. Get Movement History for Bin Content

```sql
SELECT
    bm.id,
    bm.movement_type,
    bm.quantity,
    bm.quantity_before,
    bm.quantity_after,
    bm.reason,
    bm.reference_number,
    bm.fefo_compliant,
    u.username AS created_by,
    bm.created_at
FROM bin_movements bm
JOIN users u ON bm.created_by = u.id
WHERE bm.bin_content_id = :bin_content_id
ORDER BY bm.created_at DESC;
```

### 4. Get Expiry Warnings

```sql
SELECT
    bc.id,
    b.code AS bin_code,
    p.name AS product_name,
    bc.batch_number,
    bc.quantity,
    bc.unit,
    bc.use_by_date,
    (bc.use_by_date - CURRENT_DATE) AS days_until_expiry,
    CASE
        WHEN (bc.use_by_date - CURRENT_DATE) < 7 THEN 'critical'
        WHEN (bc.use_by_date - CURRENT_DATE) < 14 THEN 'high'
        WHEN (bc.use_by_date - CURRENT_DATE) < 30 THEN 'medium'
        ELSE 'low'
    END AS urgency
FROM bin_contents bc
JOIN bins b ON bc.bin_id = b.id
JOIN products p ON bc.product_id = p.id
WHERE bc.status = 'available'
  AND bc.quantity > 0
  AND bc.use_by_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY bc.use_by_date ASC;
```

---

## Database Portability (GUID Type)

Phase 3 uses the same `GUID` TypeDecorator as Phase 1/2 for database portability:

```python
from app.db.base import GUID

class BinContent(Base):
    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
```

- **PostgreSQL**: Uses native `UUID` type
- **SQLite** (for tests): Uses `String(36)` representation

This allows tests to run on SQLite without PostgreSQL dependency.

---

## See Also

- **Phase3_Overview.md** - Business context and feature summary
- **Phase3_API_Reference.md** - API endpoints using these tables
- **Phase3_FEFO_Compliance.md** - FEFO algorithm leveraging indexes
- **Phase3_Movement_Audit.md** - Audit trail usage and queries
- **Phase2_Database_Schema.md** - Foundation tables (bins, products, suppliers)
- **Phase1_Database_Schema.md** - Core tables (users, warehouses)
