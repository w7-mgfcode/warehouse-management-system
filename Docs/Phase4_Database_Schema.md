# WMS Phase 4: Database Schema

**Version**: 4.0
**Last Updated**: December 2025

## Overview

Phase 4 introduces **4 new database tables** and modifies the existing `bin_contents` table to support stock reservations, warehouse transfers, and background job execution tracking.

### Schema Summary

| Table | Status | Purpose |
|-------|--------|---------|
| `stock_reservations` | NEW | Pending order reservations with FEFO allocation |
| `reservation_items` | NEW | Links reservations to bin_contents |
| `warehouse_transfers` | NEW | Cross-warehouse transfer tracking |
| `job_executions` | NEW | Background job execution logs |
| `bin_contents` | MODIFIED | Added `reserved_quantity` column |

---

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│      products       │       │       users         │
│  (Phase 2)          │       │  (Phase 1)          │
└──────────┬──────────┘       └──────────┬──────────┘
           │                             │
           │ 1:N                         │ 1:N
           ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐
│  stock_reservations │◄──────│    created_by       │
│  (NEW - Phase 4)    │       └─────────────────────┘
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│  reservation_items  │──────►│    bin_contents     │
│  (NEW - Phase 4)    │  N:1  │  (Modified)         │
└─────────────────────┘       └──────────┬──────────┘
                                         │
                                         │ 1:N
                                         ▼
┌─────────────────────┐       ┌─────────────────────┐
│ warehouse_transfers │──────►│        bins         │
│  (NEW - Phase 4)    │  N:1  │  (Phase 2)          │
└─────────────────────┘       └─────────────────────┘
           │
           │ N:1
           ▼
┌─────────────────────┐
│     warehouses      │
│  (Phase 1)          │
└─────────────────────┘

┌─────────────────────┐
│   job_executions    │  (Standalone - no FKs)
│  (NEW - Phase 4)    │
└─────────────────────┘
```

---

## 1. stock_reservations Table (NEW)

**Purpose**: Store pending order reservations that hold inventory for customers following FEFO allocation.

### Column Specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `product_id` | UUID | FK → products.id, NOT NULL | Reserved product |
| `order_reference` | VARCHAR(100) | NOT NULL | External order/PO number |
| `customer_name` | VARCHAR(255) | NULL | Customer name for reference |
| `total_quantity` | NUMERIC(10,2) | NOT NULL | Total reserved quantity |
| `reserved_until` | TIMESTAMP WITH TZ | NOT NULL | Reservation expiry datetime |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' | active/fulfilled/cancelled/expired |
| `fulfilled_at` | TIMESTAMP WITH TZ | NULL | When reservation was fulfilled |
| `cancelled_at` | TIMESTAMP WITH TZ | NULL | When reservation was cancelled |
| `cancellation_reason` | VARCHAR(50) | NULL | Reason for cancellation |
| `notes` | TEXT | NULL | Additional notes |
| `created_by` | UUID | FK → users.id, NOT NULL | User who created |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Indexes

```sql
CREATE INDEX ix_stock_reservations_status_until
    ON stock_reservations (status, reserved_until);

CREATE INDEX ix_stock_reservations_product_status
    ON stock_reservations (product_id, status);

CREATE INDEX ix_stock_reservations_order_ref
    ON stock_reservations (order_reference);
```

### Foreign Keys

- `product_id` → `products.id` (RESTRICT) - Cannot delete products with reservations
- `created_by` → `users.id` - User attribution

### Status Values

| Status | Description | Hungarian |
|--------|-------------|-----------|
| `active` | Reservation is active, stock is held | Aktív |
| `fulfilled` | Reservation converted to issue | Teljesítve |
| `cancelled` | Reservation cancelled by user | Visszavonva |
| `expired` | Reservation expired (auto-released) | Lejárt |

### Business Rules

1. Reservations allocate from oldest expiry dates first (FEFO)
2. `reserved_until` must be in the future when creating
3. Expired reservations are cleaned up by scheduled job
4. Only `active` reservations can be fulfilled or cancelled
5. Cancellation releases `reserved_quantity` back to available stock

### SQLAlchemy Model

```python
class StockReservation(Base):
    """
    Stock reservation for pending orders.
    Reserves inventory for customer orders following FEFO order.
    """
    __tablename__ = "stock_reservations"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    reserved_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    fulfilled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    product: Mapped["Product"] = relationship()
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by])
    items: Mapped[list["ReservationItem"]] = relationship(
        back_populates="reservation", cascade="all, delete-orphan"
    )
```

### Example Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "product_id": "550e8400-e29b-41d4-a716-446655440001",
  "order_reference": "ORD-2025-001",
  "customer_name": "Vendéglátó Kft.",
  "total_quantity": 150.00,
  "reserved_until": "2025-12-22T18:00:00+01:00",
  "status": "active",
  "fulfilled_at": null,
  "cancelled_at": null,
  "cancellation_reason": null,
  "notes": "Sürgős megrendelés",
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-12-21T10:00:00+01:00",
  "updated_at": "2025-12-21T10:00:00+01:00"
}
```

---

## 2. reservation_items Table (NEW)

**Purpose**: Link reservations to specific bin_contents with reserved quantities. Enables multi-bin FEFO allocation.

### Column Specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `reservation_id` | UUID | FK → stock_reservations.id, NOT NULL | Parent reservation |
| `bin_content_id` | UUID | FK → bin_contents.id, NOT NULL | Reserved bin content |
| `quantity_reserved` | NUMERIC(10,2) | NOT NULL | Quantity reserved from this bin |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

### Indexes

```sql
CREATE INDEX ix_reservation_items_reservation
    ON reservation_items (reservation_id);

CREATE INDEX ix_reservation_items_bin_content
    ON reservation_items (bin_content_id);
```

### Foreign Keys

- `reservation_id` → `stock_reservations.id` (CASCADE) - Delete items when reservation deleted
- `bin_content_id` → `bin_contents.id` (RESTRICT) - Cannot delete bin_content with reservations

### Business Rules

1. Sum of `quantity_reserved` across items equals `total_quantity` on reservation
2. Items are created in FEFO order (oldest expiry first)
3. Each item corresponds to one bin_content
4. Multiple items can reference different bin_contents for same reservation

### SQLAlchemy Model

```python
class ReservationItem(Base):
    """
    Individual item within a stock reservation.
    Links a reservation to specific bin_contents with reserved quantities.
    """
    __tablename__ = "reservation_items"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    reservation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("stock_reservations.id", ondelete="CASCADE"), nullable=False
    )
    bin_content_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("bin_contents.id", ondelete="RESTRICT"), nullable=False
    )
    quantity_reserved: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    reservation: Mapped["StockReservation"] = relationship(back_populates="items")
    bin_content: Mapped["BinContent"] = relationship()
```

### Example Data

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "reservation_id": "550e8400-e29b-41d4-a716-446655440010",
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440005",
    "quantity_reserved": 100.00,
    "created_at": "2025-12-21T10:00:00+01:00"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440021",
    "reservation_id": "550e8400-e29b-41d4-a716-446655440010",
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440006",
    "quantity_reserved": 50.00,
    "created_at": "2025-12-21T10:00:00+01:00"
  }
]
```

---

## 3. warehouse_transfers Table (NEW)

**Purpose**: Track cross-warehouse transfers with full status workflow and transport tracking.

### Column Specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `source_warehouse_id` | UUID | FK → warehouses.id, NOT NULL | Source warehouse |
| `source_bin_id` | UUID | FK → bins.id, NOT NULL | Source bin |
| `source_bin_content_id` | UUID | FK → bin_contents.id, NOT NULL | Source inventory |
| `target_warehouse_id` | UUID | FK → warehouses.id, NOT NULL | Target warehouse |
| `target_bin_id` | UUID | FK → bins.id, NULL | Target bin (assigned on receipt) |
| `quantity_sent` | NUMERIC(10,2) | NOT NULL | Quantity dispatched |
| `quantity_received` | NUMERIC(10,2) | NULL | Quantity confirmed (may differ) |
| `unit` | VARCHAR(50) | NOT NULL | Unit of measure |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | pending/in_transit/received/cancelled |
| `transport_reference` | VARCHAR(100) | NULL | Truck/shipment ID |
| `condition_on_receipt` | VARCHAR(50) | NULL | Condition assessment |
| `dispatched_at` | TIMESTAMP WITH TZ | NULL | When dispatched |
| `received_at` | TIMESTAMP WITH TZ | NULL | When received |
| `cancelled_at` | TIMESTAMP WITH TZ | NULL | When cancelled |
| `cancellation_reason` | VARCHAR(255) | NULL | Reason for cancellation |
| `created_by` | UUID | FK → users.id, NOT NULL | User who created |
| `received_by` | UUID | FK → users.id, NULL | User who confirmed |
| `notes` | TEXT | NULL | Additional notes |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

### Indexes

```sql
CREATE INDEX ix_warehouse_transfers_status
    ON warehouse_transfers (status);

CREATE INDEX ix_warehouse_transfers_source
    ON warehouse_transfers (source_warehouse_id, status);

CREATE INDEX ix_warehouse_transfers_target
    ON warehouse_transfers (target_warehouse_id, status);

CREATE INDEX ix_warehouse_transfers_transport
    ON warehouse_transfers (transport_reference);
```

### Foreign Keys

- `source_warehouse_id` → `warehouses.id` (RESTRICT)
- `target_warehouse_id` → `warehouses.id` (RESTRICT)
- `source_bin_id` → `bins.id` (RESTRICT)
- `target_bin_id` → `bins.id` (SET NULL) - Optional until receipt
- `source_bin_content_id` → `bin_contents.id` (RESTRICT)
- `created_by` → `users.id`
- `received_by` → `users.id`

### Status Values

| Status | Description | Hungarian |
|--------|-------------|-----------|
| `pending` | Created, awaiting dispatch | Függőben |
| `in_transit` | Dispatched, in transport | Úton |
| `received` | Confirmed at target warehouse | Beérkezve |
| `cancelled` | Transfer cancelled | Visszavonva |

### Status Workflow

```
pending → in_transit → received
    ↓          ↓
cancelled  cancelled (stock returned)
```

### Business Rules

1. Source and target warehouses must be different
2. `quantity_received` can differ from `quantity_sent` (damage, loss)
3. Cancellation from `in_transit` returns stock to source
4. Movement audit records created at each status change
5. `target_bin_id` assigned only on receipt confirmation

### SQLAlchemy Model

```python
class WarehouseTransfer(Base):
    """
    Cross-warehouse transfer record.
    Tracks transfers between warehouses with status workflow.
    """
    __tablename__ = "warehouse_transfers"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    source_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False
    )
    source_bin_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("bins.id", ondelete="RESTRICT"), nullable=False
    )
    source_bin_content_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("bin_contents.id", ondelete="RESTRICT"), nullable=False
    )
    target_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False
    )
    target_bin_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("bins.id", ondelete="SET NULL"), nullable=True
    )
    quantity_sent: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity_received: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    transport_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    condition_on_receipt: Mapped[str | None] = mapped_column(String(50), nullable=True)
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(GUID(), ForeignKey("users.id"), nullable=False)
    received_by: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC), nullable=False
    )

    # Relationships
    source_warehouse: Mapped["Warehouse"] = relationship(foreign_keys=[source_warehouse_id])
    target_warehouse: Mapped["Warehouse"] = relationship(foreign_keys=[target_warehouse_id])
    source_bin: Mapped["Bin"] = relationship(foreign_keys=[source_bin_id])
    target_bin: Mapped["Bin | None"] = relationship(foreign_keys=[target_bin_id])
    source_bin_content: Mapped["BinContent"] = relationship()
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by])
    received_by_user: Mapped["User | None"] = relationship(foreign_keys=[received_by])
```

### Example Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "source_warehouse_id": "550e8400-e29b-41d4-a716-446655440100",
  "source_bin_id": "550e8400-e29b-41d4-a716-446655440101",
  "source_bin_content_id": "550e8400-e29b-41d4-a716-446655440005",
  "target_warehouse_id": "550e8400-e29b-41d4-a716-446655440200",
  "target_bin_id": null,
  "quantity_sent": 100.00,
  "quantity_received": null,
  "unit": "kg",
  "status": "in_transit",
  "transport_reference": "TRUCK-2025-001",
  "condition_on_receipt": null,
  "dispatched_at": "2025-12-21T14:00:00+01:00",
  "received_at": null,
  "cancelled_at": null,
  "cancellation_reason": null,
  "created_by": "550e8400-e29b-41d4-a716-446655440000",
  "received_by": null,
  "notes": "Sürgős szállítás",
  "created_at": "2025-12-21T10:00:00+01:00",
  "updated_at": "2025-12-21T14:00:00+01:00"
}
```

---

## 4. job_executions Table (NEW)

**Purpose**: Log all background job executions for monitoring and debugging.

### Column Specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL | Unique identifier |
| `job_name` | VARCHAR(100) | NOT NULL | Name of the job |
| `celery_task_id` | VARCHAR(255) | NULL | Celery task UUID |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'running' | running/completed/failed |
| `started_at` | TIMESTAMP WITH TZ | NOT NULL, DEFAULT NOW() | Job start time |
| `completed_at` | TIMESTAMP WITH TZ | NULL | Job completion time |
| `duration_seconds` | FLOAT | NULL | Execution duration |
| `result` | JSONB | NULL | Job result data |
| `error_message` | TEXT | NULL | Error details if failed |

### Indexes

```sql
CREATE INDEX ix_job_executions_job_name
    ON job_executions (job_name);

CREATE INDEX ix_job_executions_status
    ON job_executions (status);

CREATE INDEX ix_job_executions_started_at
    ON job_executions (started_at);
```

### Status Values

| Status | Description | Hungarian |
|--------|-------------|-----------|
| `running` | Job is currently executing | Fut |
| `completed` | Job finished successfully | Befejezve |
| `failed` | Job encountered an error | Sikertelen |

### Job Names

| Job Name | Description | Schedule |
|----------|-------------|----------|
| `cleanup_expired_reservations` | Release expired reservation holds | Hourly |
| `check_expiry_warnings` | Scan for expiring products | Daily |
| `send_expiry_alerts` | Email notifications | Daily |

### SQLAlchemy Model

```python
class JobExecution(Base):
    """
    Execution log for scheduled jobs.
    Tracks Celery task executions with results and errors.
    """
    __tablename__ = "job_executions"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    job_name: Mapped[str] = mapped_column(String(100), nullable=False)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="running", nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB().with_variant(Text, "sqlite"), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
```

### Example Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "job_name": "check_expiry_warnings",
  "celery_task_id": "abc123-def456-ghi789",
  "status": "completed",
  "started_at": "2025-12-21T06:00:00+01:00",
  "completed_at": "2025-12-21T06:00:05+01:00",
  "duration_seconds": 5.234,
  "result": {
    "warning_counts": {
      "critical": 3,
      "high": 8,
      "medium": 15,
      "low": 22,
      "total": 48
    },
    "expired_count": 2,
    "message": "Figyelmeztetések: 48, Lejárt: 2"
  },
  "error_message": null
}
```

---

## 5. bin_contents Table (MODIFIED)

**Purpose**: Added `reserved_quantity` column to track reserved vs available stock.

### New Column

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `reserved_quantity` | NUMERIC(10,2) | NOT NULL, DEFAULT 0 | Quantity held by reservations |

### Updated Check Constraint

```sql
ALTER TABLE bin_contents
ADD CONSTRAINT check_reserved_quantity
CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity);
```

### Business Rules

1. `reserved_quantity` increments when reservation items are created
2. `reserved_quantity` decrements when reservations are fulfilled/cancelled/expired
3. Available quantity = `quantity` - `reserved_quantity`
4. FEFO queries now filter: `quantity > reserved_quantity`

### Updated Model Snippet

```python
class BinContent(Base):
    # ... existing columns ...

    reserved_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=Decimal("0"), nullable=False
    )

    __table_args__ = (
        # ... existing constraints ...
        CheckConstraint(
            "reserved_quantity >= 0 AND reserved_quantity <= quantity",
            name="check_reserved_quantity",
        ),
    )
```

---

## Migration Script

**File**: `alembic/versions/20251221_142327_202af48e6f7e_phase4_transfers_reservations_jobs.py`

```python
def upgrade() -> None:
    # 1. Add reserved_quantity to bin_contents
    op.add_column(
        "bin_contents",
        sa.Column("reserved_quantity", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.create_check_constraint(
        "check_reserved_quantity",
        "bin_contents",
        "reserved_quantity >= 0 AND reserved_quantity <= quantity",
    )

    # 2. Create stock_reservations table
    op.create_table(
        "stock_reservations",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("product_id", GUID(), sa.ForeignKey("products.id", ondelete="RESTRICT")),
        sa.Column("order_reference", sa.String(100), nullable=False),
        sa.Column("customer_name", sa.String(255), nullable=True),
        sa.Column("total_quantity", sa.Numeric(10, 2), nullable=False),
        sa.Column("reserved_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="active"),
        # ... timestamps and user tracking ...
    )

    # 3. Create reservation_items table
    op.create_table(
        "reservation_items",
        sa.Column("id", GUID(), primary_key=True),
        sa.Column("reservation_id", GUID(),
                  sa.ForeignKey("stock_reservations.id", ondelete="CASCADE")),
        sa.Column("bin_content_id", GUID(),
                  sa.ForeignKey("bin_contents.id", ondelete="RESTRICT")),
        sa.Column("quantity_reserved", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True)),
    )

    # 4. Create warehouse_transfers table
    op.create_table(
        "warehouse_transfers",
        # ... full column definitions ...
    )

    # 5. Create job_executions table
    op.create_table(
        "job_executions",
        # ... full column definitions ...
    )

    # 6. Create all indexes
    # ... index creation statements ...


def downgrade() -> None:
    op.drop_table("job_executions")
    op.drop_table("warehouse_transfers")
    op.drop_table("reservation_items")
    op.drop_table("stock_reservations")
    op.drop_constraint("check_reserved_quantity", "bin_contents")
    op.drop_column("bin_contents", "reserved_quantity")
```

---

## Query Patterns

### 1. Get Available Stock (Excluding Reservations)

```sql
SELECT
    bc.id,
    bc.quantity - bc.reserved_quantity AS available_quantity,
    bc.use_by_date,
    b.code AS bin_code
FROM bin_contents bc
JOIN bins b ON bc.bin_id = b.id
WHERE bc.product_id = :product_id
  AND bc.status = 'available'
  AND bc.quantity > bc.reserved_quantity
  AND bc.use_by_date >= CURRENT_DATE
ORDER BY bc.use_by_date ASC, bc.batch_number ASC;
```

### 2. Get Active Reservations for Product

```sql
SELECT
    sr.id,
    sr.order_reference,
    sr.total_quantity,
    sr.reserved_until,
    u.username AS created_by
FROM stock_reservations sr
JOIN users u ON sr.created_by = u.id
WHERE sr.product_id = :product_id
  AND sr.status = 'active'
ORDER BY sr.reserved_until ASC;
```

### 3. Get Pending Transfers for Warehouse

```sql
SELECT
    wt.id,
    sw.name AS source_warehouse,
    sb.code AS source_bin,
    wt.quantity_sent,
    wt.transport_reference
FROM warehouse_transfers wt
JOIN warehouses sw ON wt.source_warehouse_id = sw.id
JOIN bins sb ON wt.source_bin_id = sb.id
WHERE wt.target_warehouse_id = :warehouse_id
  AND wt.status IN ('pending', 'in_transit')
ORDER BY wt.created_at DESC;
```

### 4. Get Recent Job Executions

```sql
SELECT
    job_name,
    status,
    started_at,
    duration_seconds,
    result->>'message' AS message
FROM job_executions
WHERE started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 50;
```

---

## See Also

- **Phase4_Overview.md** - Feature summary and business context
- **Phase4_API_Reference.md** - API endpoints using these tables
- **Phase3_Database_Schema.md** - bin_contents and bin_movements tables
- **Phase2_Database_Schema.md** - products, suppliers, bins tables
