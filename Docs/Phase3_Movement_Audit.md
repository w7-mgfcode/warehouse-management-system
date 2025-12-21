# WMS Phase 3: Movement Audit Trail

**Version**: 3.0
**Last Updated**: December 2025

## Overview

The **Movement Audit Trail** provides complete traceability of all inventory transactions through immutable, append-only records. Every receipt, issue, adjustment, transfer, and scrap operation creates a permanent `BinMovement` record that can **never be modified or deleted**.

This audit trail is critical for:
- **Regulatory Compliance**: EU food safety laws require complete traceability
- **Financial Auditing**: Inventory reconciliation and valuation
- **Quality Investigation**: Root cause analysis for product recalls
- **Performance Analytics**: Inventory turnover, FEFO compliance, user productivity

---

## What is an Immutable Audit Trail?

### Definition

An **immutable audit trail** is a log of events where records are:
1. **Append-Only**: New records added, never modified
2. **Permanent**: Records cannot be deleted
3. **Complete**: Every transaction captured
4. **Attributed**: User who performed action recorded
5. **Timestamped**: Precise time of transaction

### Why Immutability Matters

**Problem with Mutable Records**:
```python
# Bad: Editable history
movement.quantity = 200  # Someone changed history!
movement.created_at = yesterday  # Backdating fraud
db.update(movement)  # Audit trail compromised
```

**Solution: Immutable Records**:
```python
# Good: Append-only
movement = BinMovement(...)
db.add(movement)  # ✓ Allowed

movement.quantity = 200  # ✗ No UPDATE endpoint exists
db.delete(movement)      # ✗ No DELETE endpoint exists
```

**Benefits**:
- **Forensic Evidence**: Tamper-proof for legal compliance
- **Data Integrity**: Historical state reconstruction guaranteed
- **Audit Confidence**: Auditors trust immutable logs
- **Compliance**: Meets EU Regulation (EC) No 178/2002 requirements

---

## Movement Types

Phase 3 implements **5 movement types** covering all inventory operations:

### 1. receipt (Incoming Goods)

**Purpose**: Record arrival of products from suppliers

**Characteristics**:
- `quantity`: Positive (+)
- `fefo_compliant`: NULL (not applicable)
- `force_override`: false

**Example**:
```json
{
  "movement_type": "receipt",
  "quantity": 100.0,
  "quantity_before": 0.0,
  "quantity_after": 100.0,
  "reason": "supplier_delivery",
  "reference_number": "PO-2025-001"
}
```

**Hungarian Label**: "Beérkezés"

---

### 2. issue (Outgoing Goods)

**Purpose**: Record issuance to customers or production

**Characteristics**:
- `quantity`: Negative (-)
- `fefo_compliant`: true/false (FEFO check performed)
- `force_override`: true if manager bypassed FEFO

**Example (FEFO-Compliant)**:
```json
{
  "movement_type": "issue",
  "quantity": -50.0,
  "quantity_before": 100.0,
  "quantity_after": 50.0,
  "reason": "sales_order",
  "reference_number": "SO-2025-001",
  "fefo_compliant": true,
  "force_override": false
}
```

**Example (Non-FEFO Override)**:
```json
{
  "movement_type": "issue",
  "quantity": -30.0,
  "quantity_before": 50.0,
  "quantity_after": 20.0,
  "reason": "customer_request",
  "reference_number": "SO-2025-002",
  "fefo_compliant": false,
  "force_override": true,
  "override_reason": "Vevő kifejezett kérése - BATCH-2025-045 szükséges"
}
```

**Hungarian Label**: "Kiadás"

---

### 3. adjustment (Stock Correction)

**Purpose**: Record quantity corrections from stocktakes or damage

**Characteristics**:
- `quantity`: Positive (+) or Negative (-)
- `fefo_compliant`: NULL
- `force_override`: false

**Example (Stocktake Correction)**:
```json
{
  "movement_type": "adjustment",
  "quantity": 5.0,
  "quantity_before": 70.0,
  "quantity_after": 75.0,
  "reason": "stocktake",
  "reference_number": "STOCK-2025-001",
  "notes": "Leltári többlet"
}
```

**Example (Damage)**:
```json
{
  "movement_type": "adjustment",
  "quantity": -10.0,
  "quantity_before": 75.0,
  "quantity_after": 65.0,
  "reason": "damage",
  "reference_number": "DAMAGE-2025-001",
  "notes": "Sérült raklap"
}
```

**Hungarian Label**: "Korrekció"

---

### 4. transfer (Bin-to-Bin Move) [Phase 4]

**Purpose**: Record movement of product between bins

**Characteristics**:
- Creates **two movements**: one negative (from), one positive (to)
- `quantity`: Negative for source, positive for destination
- `fefo_compliant`: NULL

**Example (Not Yet Implemented)**:
```json
// Movement 1: From Bin A-01-02-03
{
  "movement_type": "transfer",
  "quantity": -30.0,
  "quantity_before": 65.0,
  "quantity_after": 35.0,
  "reason": "bin_reorganization",
  "reference_number": "TRANSFER-2025-001"
}

// Movement 2: To Bin A-02-01-01
{
  "movement_type": "transfer",
  "quantity": 30.0,
  "quantity_before": 0.0,
  "quantity_after": 30.0,
  "reason": "bin_reorganization",
  "reference_number": "TRANSFER-2025-001"
}
```

**Hungarian Label**: "Áthelyezés"

---

### 5. scrap (Write-Off)

**Purpose**: Record disposal of expired or damaged stock

**Characteristics**:
- `quantity`: Negative (-)
- `fefo_compliant`: NULL
- Final `quantity_after`: Always 0
- Sets `bin_content.status = 'scrapped'`

**Example**:
```json
{
  "movement_type": "scrap",
  "quantity": -35.0,
  "quantity_before": 35.0,
  "quantity_after": 0.0,
  "reason": "expired",
  "reference_number": "SCRAP-2025-001",
  "notes": "Lejárt termék selejtezése"
}
```

**Hungarian Label**: "Selejtezés"

---

## BinMovement Model Deep Dive

### Core Fields

| Field | Purpose | Type | Constraints |
|-------|---------|------|-------------|
| `id` | Unique identifier | UUID | PK, NOT NULL |
| `bin_content_id` | Link to inventory | UUID | FK, NOT NULL |
| `movement_type` | Operation category | VARCHAR(20) | enum: receipt/issue/adjustment/transfer/scrap |
| `quantity` | Change amount | NUMERIC(10,2) | NOT NULL, + or - |
| `quantity_before` | State before | NUMERIC(10,2) | NOT NULL |
| `quantity_after` | State after | NUMERIC(10,2) | NOT NULL, must equal before + quantity |
| `reason` | Business justification | VARCHAR(50) | NOT NULL |
| `reference_number` | External doc link | VARCHAR(100) | NULL |
| `created_by` | User attribution | UUID | FK users.id, NOT NULL |
| `created_at` | Transaction time | TIMESTAMPTZ | NOT NULL, immutable |

### FEFO-Specific Fields

| Field | Purpose | Type | Constraints |
|-------|---------|------|-------------|
| `fefo_compliant` | FEFO check result | BOOLEAN | NULL (only for issue type) |
| `force_override` | Manager bypass flag | BOOLEAN | NOT NULL, DEFAULT false |
| `override_reason` | Override justification | TEXT | NULL, required if force_override=true |

### Quantity Snapshot Pattern

**Validation Rule**: `quantity_after = quantity_before + quantity`

**Example Sequence**:
```
Receipt:    0 kg + 100 kg → 100 kg
Issue:    100 kg -  30 kg →  70 kg
Issue:     70 kg -  20 kg →  50 kg
Adjustment: 50 kg +  10 kg →  60 kg (stocktake correction)
Scrap:     60 kg -  60 kg →   0 kg
```

**Why Snapshots?**
- **Data Integrity**: Detect arithmetic errors (quantity_after != expected)
- **State Reconstruction**: Can rebuild exact quantity at any point in time
- **Audit Trail**: Shows before/after for every transaction

---

## Audit Trail Integrity

### Application-Level Enforcement

**No UPDATE Endpoints**:
```python
# FastAPI routes - No PUT/PATCH for movements
@router.get("/movements")  # ✓ Allowed (read)
async def list_movements(...):
    ...

@router.get("/movements/{id}")  # ✓ Allowed (read)
async def get_movement(...):
    ...

# ✗ NOT IMPLEMENTED - No update endpoint
# @router.put("/movements/{id}")
# @router.patch("/movements/{id}")
```

**No DELETE Endpoints**:
```python
# ✗ NOT IMPLEMENTED - No delete endpoint
# @router.delete("/movements/{id}")
```

**SQLAlchemy ORM Protection**:
```python
# Service layer - Read-only operations
async def get_movement_by_id(db, movement_id):
    return await db.get(BinMovement, movement_id)  # ✓ Read

# ✗ No update functions exist
# async def update_movement(db, movement_id, data):
#     movement = await db.get(BinMovement, movement_id)
#     movement.quantity = data.quantity  # Would violate immutability
#     await db.commit()
```

### Optional Database-Level Enforcement

**PostgreSQL Triggers** (not implemented, but possible for extra safety):

```sql
-- Prevent updates
CREATE OR REPLACE FUNCTION prevent_bin_movement_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'BinMovement records are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_movement_update
    BEFORE UPDATE ON bin_movements
    FOR EACH ROW
    EXECUTE FUNCTION prevent_bin_movement_update();

-- Prevent deletes
CREATE OR REPLACE FUNCTION prevent_bin_movement_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'BinMovement records cannot be deleted (audit trail)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_movement_delete
    BEFORE DELETE ON bin_movements
    FOR EACH ROW
    EXECUTE FUNCTION prevent_bin_movement_delete();
```

**Trade-off**:
- **Pros**: Extra layer of protection, prevents accidental SQL updates
- **Cons**: Complicates data cleanup (if ever needed), requires trigger management

**Phase 3 Decision**: Application-level enforcement only (simpler, sufficient for most cases)

---

## Querying Movement History

### 1. Get All Movements for Bin Content

**Use Case**: Track lifecycle of specific inventory batch

**Query**:
```python
movements = await db.execute(
    select(BinMovement)
    .where(BinMovement.bin_content_id == bin_content_id)
    .order_by(BinMovement.created_at.desc())
)
```

**Example Result**:
```
Scrap:     100 kg -  60 kg →  40 kg (2025-02-10 10:00)
Issue:     160 kg -  60 kg → 100 kg (2025-02-05 14:30)
Adjustment: 150 kg +  10 kg → 160 kg (2025-02-01 16:00)
Issue:     200 kg -  50 kg → 150 kg (2025-01-25 11:15)
Receipt:     0 kg + 200 kg → 200 kg (2025-01-15 08:30)
```

### 2. Filter by Movement Type

**Use Case**: Review all scrap operations for waste analysis

**Query**:
```python
scraps = await db.execute(
    select(BinMovement)
    .where(BinMovement.movement_type == "scrap")
    .where(BinMovement.created_at >= start_date)
    .where(BinMovement.created_at <= end_date)
    .order_by(BinMovement.created_at.desc())
)
```

### 3. Filter by Product

**Use Case**: Trace all movements for a specific product (e.g., during recall)

**Query**:
```sql
SELECT bm.*
FROM bin_movements bm
JOIN bin_contents bc ON bm.bin_content_id = bc.id
WHERE bc.product_id = :product_id
ORDER BY bm.created_at DESC;
```

### 4. Filter by User

**Use Case**: Audit user activity, investigate discrepancies

**Query**:
```python
user_movements = await db.execute(
    select(BinMovement)
    .where(BinMovement.created_by == user_id)
    .where(BinMovement.created_at >= start_date)
    .order_by(BinMovement.created_at.desc())
)
```

### 5. Paginated Movement History

**Use Case**: Display large audit trails in web UI

**API Endpoint**:
```
GET /api/v1/movements?page=1&page_size=50&product_id=uuid
```

**Implementation**:
```python
async def get_movements(db, page, page_size, filters...):
    offset = (page - 1) * page_size

    query = select(BinMovement)
    # Apply filters...
    query = query.order_by(BinMovement.created_at.desc())
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    movements = result.scalars().all()

    total = await db.execute(select(func.count()).select_from(BinMovement))
    return movements, total.scalar()
```

---

## Reporting and Analytics

### 1. Movement Frequency Report

**Business Question**: How many transactions per day?

**Query**:
```sql
SELECT
    DATE_TRUNC('day', created_at) AS day,
    movement_type,
    COUNT(*) AS count,
    SUM(ABS(quantity)) AS total_quantity
FROM bin_movements
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY day, movement_type
ORDER BY day DESC, movement_type;
```

**Example Output**:
```
 day         | movement_type | count | total_quantity
-------------+---------------+-------+----------------
 2025-01-31  | receipt       |     5 |          500.0
 2025-01-31  | issue         |    12 |          350.0
 2025-01-31  | adjustment    |     2 |           15.0
 2025-01-30  | receipt       |     3 |          200.0
 2025-01-30  | issue         |     8 |          280.0
```

**Insight**: Peak issue activity = high demand days

---

### 2. User Activity Tracking

**Business Question**: Which users perform most operations?

**Query**:
```sql
SELECT
    u.username,
    u.role,
    COUNT(*) AS total_movements,
    COUNT(*) FILTER (WHERE movement_type = 'receipt') AS receipts,
    COUNT(*) FILTER (WHERE movement_type = 'issue') AS issues,
    COUNT(*) FILTER (WHERE force_override = true) AS fefo_overrides
FROM bin_movements bm
JOIN users u ON bm.created_by = u.id
WHERE bm.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.username, u.role
ORDER BY total_movements DESC;
```

**Example Output**:
```
 username      | role      | total_movements | receipts | issues | fefo_overrides
---------------+-----------+-----------------+----------+--------+----------------
 warehouse_joe | warehouse |             150 |       45 |    105 |              0
 manager_anna  | manager   |              85 |       30 |     50 |              5
 admin         | admin     |              20 |       10 |     10 |              0
```

**Insight**: Warehouse users do bulk of operations, managers handle overrides

---

### 3. FEFO Compliance Rate

**Business Question**: What percentage of issues are FEFO-compliant?

**Query**:
```sql
SELECT
    COUNT(*) FILTER (WHERE fefo_compliant = true) AS fefo_compliant_count,
    COUNT(*) FILTER (WHERE fefo_compliant = false) AS fefo_violation_count,
    COUNT(*) AS total_issues,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE fefo_compliant = true) / COUNT(*),
        2
    ) AS compliance_percentage
FROM bin_movements
WHERE movement_type = 'issue'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
```

**Example Output**:
```
 fefo_compliant_count | fefo_violation_count | total_issues | compliance_percentage
----------------------+----------------------+--------------+-----------------------
                  145 |                    5 |          150 |                 96.67
```

**Target**: > 95% compliance

---

### 4. Inventory Turnover Metrics

**Business Question**: How quickly is inventory moving?

**Query**:
```sql
WITH product_movements AS (
    SELECT
        bc.product_id,
        p.name AS product_name,
        SUM(ABS(bm.quantity)) FILTER (WHERE bm.movement_type = 'issue') AS total_issued,
        AVG(bc.quantity) AS avg_stock_level
    FROM bin_movements bm
    JOIN bin_contents bc ON bm.bin_content_id = bc.id
    JOIN products p ON bc.product_id = p.id
    WHERE bm.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY bc.product_id, p.name
)
SELECT
    product_name,
    total_issued,
    avg_stock_level,
    CASE
        WHEN avg_stock_level > 0
        THEN ROUND((total_issued / avg_stock_level), 2)
        ELSE 0
    END AS turnover_ratio
FROM product_movements
ORDER BY turnover_ratio DESC;
```

**Example Output**:
```
 product_name      | total_issued | avg_stock_level | turnover_ratio
-------------------+--------------+-----------------+----------------
 Csirkemell filé   |        500.0 |           100.0 |           5.00
 Tejföl            |        150.0 |            50.0 |           3.00
 Joghurt           |         80.0 |            30.0 |           2.67
```

**Insight**: Higher ratio = faster turnover, lower waste risk

---

## Data Retention and Archiving

### Long-Term Storage Strategy

**Regulatory Requirements**:
- **EU Food Law**: Minimum 5 years traceability
- **Hungarian Law**: 8 years for financial records
- **Best Practice**: 10 years for legal protection

### Phase 3 Approach

**Current**: All movements in active database

**Phase 4+ (Future)**:
1. **Hot Storage** (PostgreSQL): Last 2 years, fast queries
2. **Warm Storage** (PostgreSQL partitions): 2-5 years, slower queries
3. **Cold Storage** (S3/Object Storage): 5-10 years, archive-only

### Retention Policy

```python
# Pseudocode for Phase 4
async def archive_old_movements():
    cutoff_date = date.today() - timedelta(days=730)  # 2 years

    # Query old movements
    old_movements = await db.execute(
        select(BinMovement)
        .where(BinMovement.created_at < cutoff_date)
    )

    # Export to JSON/Parquet
    archive_data = [movement_to_dict(m) for m in old_movements]
    write_to_s3(f"audit-trail-{cutoff_date}.parquet", archive_data)

    # Move to warm storage table (optional)
    # or keep in main table (PostgreSQL can handle 10+ years)
```

**Phase 3 Decision**: No archiving yet (all movements in `bin_movements` table)

---

## Testing Audit Trail

### Test 1: Immutability

**Objective**: Verify movements cannot be updated or deleted

```python
def test_movement_immutability():
    # Create movement
    movement = create_movement(movement_type="receipt", quantity=100)

    # Attempt update (should fail - no endpoint exists)
    with pytest.raises(AttributeError):
        client.put(f"/api/v1/movements/{movement.id}", json={"quantity": 200})

    # Attempt delete (should fail - no endpoint exists)
    with pytest.raises(AttributeError):
        client.delete(f"/api/v1/movements/{movement.id}")
```

### Test 2: Complete Trace

**Objective**: Verify all operations create movements

```python
async def test_complete_audit_trail():
    # Receipt
    bin_content, movement1 = await receive_goods(...)
    assert movement1.movement_type == "receipt"
    assert movement1.quantity > 0

    # Issue
    bin_content, movement2 = await issue_goods(...)
    assert movement2.movement_type == "issue"
    assert movement2.quantity < 0

    # Adjustment
    movement3 = await adjust_stock(...)
    assert movement3.movement_type == "adjustment"

    # Scrap
    movement4 = await scrap_stock(...)
    assert movement4.movement_type == "scrap"
    assert movement4.quantity_after == 0

    # Verify all movements recorded
    movements = await get_movements(bin_content_id=bin_content.id)
    assert len(movements) == 4
```

### Test 3: User Attribution

**Objective**: Verify every movement records user

```python
def test_movement_user_attribution(warehouse_user_token):
    # Perform operation as specific user
    response = client.post("/api/v1/inventory/receive", json=...,
                           headers={"Authorization": f"Bearer {warehouse_user_token}"})

    movement_id = response.json()["movement_id"]
    movement = get_movement(movement_id)

    assert movement.created_by == warehouse_user.id
    assert movement.created_by_user.username == "warehouse_user"
```

---

## See Also

- **Phase3_Overview.md** - Business context for audit trail
- **Phase3_API_Reference.md** - Movements endpoints
- **Phase3_Database_Schema.md** - BinMovement table structure
- **Phase3_FEFO_Compliance.md** - FEFO compliance tracking in movements
- **Phase3_Testing_Guide.md** - Movement test patterns
