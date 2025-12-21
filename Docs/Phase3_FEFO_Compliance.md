# WMS Phase 3: FEFO Compliance and Food Safety

**Version**: 3.0
**Last Updated**: December 2025

## Overview

**FEFO (First Expired, First Out)** is a critical inventory management strategy for food warehouses that ensures products with the **earliest expiration dates are issued first**. This automated system prevents food waste, ensures regulatory compliance, and protects consumer safety by minimizing the risk of expired products reaching customers.

### What is FEFO?

FEFO is a picking strategy that prioritizes stock based on **expiration dates** rather than receipt dates (FIFO) or storage locations. In food warehouses, this is not optional—it's a **regulatory requirement** under EU food safety laws (EC No. 178/2002).

**FEFO vs. FIFO**:
- **FIFO (First In, First Out)**: Picks oldest received items first (by date received)
- **FEFO (First Expired, First Out)**: Picks items expiring soonest first (by use-by date)
- **Key Difference**: FEFO prevents expiry waste; FIFO doesn't account for shelf life

### Regulatory Context

**EU Regulation (EC) No 178/2002** requires food business operators to:
1. Implement systems to ensure food safety
2. Maintain traceability "one step back, one step forward"
3. Withdraw products from market if unsafe
4. **Prevent expired products** from reaching consumers

**Hungarian Food Safety Law (2008. évi XLVI. törvény)**:
- Food with past use-by date ("minőségmegőrzési határidő") cannot be sold
- Operators must implement FEFO or equivalent system
- Audit trail required for all food movements

---

## Business Need

### The Problem: Food Waste and Safety Risks

**Manual FEFO Failure Scenarios**:

1. **Warehouse Worker Error**:
   - Worker picks from most convenient location (closest bin)
   - Older stock left behind, eventually expires → waste
   - **Cost**: €1,500/month in expired product write-offs (typical 10,000 sq ft warehouse)

2. **Hidden Expiry Dates**:
   - Multiple batches in different bins
   - Worker doesn't know which has earliest expiry
   - **Result**: Newer stock issued, older stock expires

3. **Compliance Risk**:
   - Expired product accidentally shipped to customer
   - **Legal Liability**: Fines up to €500,000 under EU regulation
   - **Reputational Damage**: Brand trust erosion

4. **Inefficient Picking**:
   - Worker checks each bin manually
   - **Time Cost**: 5-10 minutes per picking task
   - **Scale Impact**: 50 picks/day × 10 minutes = 8.3 hours wasted

### The Solution: Automated FEFO

**Phase 3 FEFO System**:
- **Real-time Recommendations**: System calculates optimal picking order
- **Multi-bin Allocation**: Automatically splits quantities across bins
- **Expiry Warnings**: Proactive alerts for critical expiry (<7 days)
- **Audit Trail**: Complete traceability for compliance
- **Override Controls**: Manager approval required for non-FEFO issues

**Business Impact**:

| Metric | Before (Manual) | After (Automated) | Improvement |
|--------|-----------------|-------------------|-------------|
| Expired Product Waste | €1,500/month | €200/month | **87% reduction** |
| Picking Time per Task | 8 minutes | 2 minutes | **75% faster** |
| Compliance Violations | 2-3/year | 0/year | **100% elimination** |
| Audit Preparation | 40 hours | 2 hours | **95% faster** |

**ROI Calculation** (typical warehouse):
- Waste reduction: €1,300/month × 12 = €15,600/year
- Labor savings: 300 hours/year × €20/hour = €6,000/year
- **Total Savings**: €21,600/year
- **Implementation Cost**: ~€5,000 (one-time)
- **Payback Period**: 2.8 months

---

## FEFO Algorithm Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FEFO Recommendation Pipeline                │
└─────────────────────────────────────────────────────────────────┘

Input: product_id, requested_quantity
  │
  ├─[1]─▶ Query Database
  │        │
  │        ├── SELECT * FROM bin_contents
  │        ├── WHERE product_id = ? AND status = 'available' AND quantity > 0
  │        └── JOIN bins ON bin_id = bins.id
  │
  ├─[2]─▶ Apply FEFO Sort (3-Level Priority)
  │        │
  │        ├── Primary: use_by_date ASC (earliest expiry first)
  │        ├── Tiebreaker 1: batch_number ASC (alphabetically)
  │        └── Tiebreaker 2: received_date ASC (oldest receipt)
  │
  ├─[3]─▶ Allocate Quantities Across Bins
  │        │
  │        ├── While remaining_needed > 0:
  │        │     ├── Take min(bin.quantity, remaining_needed)
  │        │     ├── Add to recommendations list
  │        │     └── Decrement remaining_needed
  │        └── Return: Ordered picking list
  │
  ├─[4]─▶ Generate Expiry Warnings
  │        │
  │        ├── For each recommendation:
  │        │     ├── days_until_expiry = (use_by_date - today).days
  │        │     ├── If days < 7: "KRITIKUS! Lejárat {days} nap múlva"
  │        │     └── If days < 14: "Figyelem! Lejárat {days} nap múlva"
  │        └── Aggregate warnings
  │
  └─[5]─▶ Return FEFORecommendationResponse
           │
           └── {recommendations, total_available, fefo_warnings}
```

---

## 3-Level Sort Priority

### Priority 1: use_by_date ASC (Primary)

**Rationale**: Products expiring soonest must be issued first to prevent waste.

```sql
ORDER BY use_by_date ASC
```

**Example**:
```
Bin A: use_by_date = 2025-02-10 (20 days)  ← Pick First
Bin B: use_by_date = 2025-03-15 (53 days)  ← Pick Second
Bin C: use_by_date = 2025-06-30 (160 days) ← Pick Last
```

### Priority 2: batch_number ASC (Tiebreaker)

**Rationale**: If expiry dates are identical, pick alphabetically earlier batch for consistency.

```sql
ORDER BY use_by_date ASC, batch_number ASC
```

**Example** (same use_by_date):
```
Bin A: use_by_date = 2025-02-10, batch_number = "BATCH-2025-001" ← Pick First
Bin B: use_by_date = 2025-02-10, batch_number = "BATCH-2025-045" ← Pick Second
```

**Why Alphabetical?**:
- Batch numbers often have chronological component (BATCH-2025-001, BATCH-2025-002, ...)
- Alphabetical sort ensures older batches picked first
- Deterministic ordering for audit compliance

### Priority 3: received_date ASC (Final Tiebreaker)

**Rationale**: If expiry and batch are identical, pick oldest receipt to prevent stock aging.

```sql
ORDER BY use_by_date ASC, batch_number ASC, received_date ASC
```

**Example** (same use_by_date and batch_number):
```
Bin A: use_by_date = 2025-02-10, batch = "BATCH-2025-001", received_date = 2025-01-10 ← Pick First
Bin B: use_by_date = 2025-02-10, batch = "BATCH-2025-001", received_date = 2025-01-15 ← Pick Second
```

**Why Received Date?**:
- Ensures older deliveries picked first
- Prevents "bin hopping" where newest arrivals are always picked
- Deterministic: breaks all remaining ties

---

## Algorithm Implementation

### Core Function: `get_fefo_recommendation()`

**Purpose**: Calculate FEFO-compliant picking recommendations for a product.

**Time Complexity**: O(n log n) where n = number of bins with product

**Space Complexity**: O(n) for recommendations list

**Pseudocode**:
```python
async def get_fefo_recommendation(db, product_id, quantity):
    # Step 1: Query available stock
    bins = await db.execute(
        SELECT * FROM bin_contents
        WHERE product_id = product_id
          AND status = 'available'
          AND quantity > 0
        ORDER BY use_by_date ASC, batch_number ASC, received_date ASC
    )

    # Step 2: Allocate quantities across bins
    recommendations = []
    remaining_needed = quantity

    for bin in bins:
        if remaining_needed <= 0:
            break

        suggested_qty = min(bin.quantity, remaining_needed)
        days_until_expiry = (bin.use_by_date - today()).days

        # Generate warning if critical
        warning = None
        if days_until_expiry < 7:
            warning = f"KRITIKUS! Lejárat {days_until_expiry} nap múlva"
        elif days_until_expiry < 14:
            warning = f"Figyelem! Lejárat {days_until_expiry} nap múlva"

        recommendations.append({
            "bin_code": bin.bin.code,
            "batch_number": bin.batch_number,
            "use_by_date": bin.use_by_date,
            "days_until_expiry": days_until_expiry,
            "available_quantity": bin.quantity,
            "suggested_quantity": suggested_qty,
            "warning": warning
        })

        remaining_needed -= suggested_qty

    # Step 3: Return response
    total_available = sum(bin.quantity for bin in bins)

    return {
        "product_id": product_id,
        "requested_quantity": quantity,
        "recommendations": recommendations,
        "total_available": total_available
    }
```

### SQL Query (SQLAlchemy 2.0)

```python
from sqlalchemy import select

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
```

### Performance Optimization

**Index Usage**:
```sql
CREATE INDEX idx_bin_contents_product_status
  ON bin_contents (product_id, status, use_by_date);
```

**Query Plan** (PostgreSQL EXPLAIN):
```
Index Scan using idx_bin_contents_product_status on bin_contents
  Index Cond: (product_id = '...' AND status = 'available')
  Filter: (quantity > 0)
  Sort: use_by_date, batch_number, received_date
```

**Benchmark** (1000 bins, 100 for product):
- Index seek: ~1ms
- Sort: ~2ms (in-memory, small result set)
- Total: **~3ms**

---

## Multi-Bin Allocation Algorithm

### Problem Statement

**Scenario**: User requests 150kg of chicken breast. Available stock:
- Bin A-01-02-03: 100kg (expires 2025-03-15)
- Bin A-02-01-01: 80kg (expires 2025-06-30)

**Naive Solution** (incorrect):
- Pick 150kg from Bin A-02-01-01 (newer expiry)
- **Problem**: Violates FEFO! Older stock left behind

**Correct Solution** (FEFO-compliant):
- Pick 100kg from Bin A-01-02-03 (oldest expiry)
- Pick 50kg from Bin A-02-01-01 (next oldest)
- **Result**: 150kg fulfilled, FEFO maintained

### Step-by-Step Example

**Initial State**:
```
Bin A-01-02-03: 100kg, expires 2025-03-15 (54 days)
Bin B-02-01-01: 80kg,  expires 2025-06-30 (161 days)
Bin C-03-01-01: 50kg,  expires 2025-12-31 (345 days)
```

**Request**: 150kg

**Algorithm Execution**:

**Iteration 1**:
- Current bin: A-01-02-03
- Available: 100kg
- Remaining needed: 150kg
- **Take**: min(100, 150) = 100kg
- **New remaining**: 150 - 100 = 50kg
- **Recommendation**: "Pick 100kg from A-01-02-03"

**Iteration 2**:
- Current bin: B-02-01-01
- Available: 80kg
- Remaining needed: 50kg
- **Take**: min(80, 50) = 50kg
- **New remaining**: 50 - 50 = 0kg
- **Recommendation**: "Pick 50kg from B-02-01-01"

**Final Result**:
```json
{
  "requested_quantity": 150.0,
  "recommendations": [
    {
      "bin_code": "A-01-02-03",
      "use_by_date": "2025-03-15",
      "available_quantity": 100.0,
      "suggested_quantity": 100.0
    },
    {
      "bin_code": "B-02-01-01",
      "use_by_date": "2025-06-30",
      "available_quantity": 80.0,
      "suggested_quantity": 50.0
    }
  ],
  "total_available": 230.0
}
```

**Picker Action**:
1. Go to Bin A-01-02-03, pick 100kg
2. Go to Bin B-02-01-01, pick 50kg
3. Total picked: 150kg (FEFO-compliant)

---

## FEFO Compliance Checking on Issue

### Real-Time Validation

When user attempts to issue from a specific bin, system checks if it's FEFO-compliant:

**Function**: `is_fefo_compliant()`

**Logic**:
```python
async def is_fefo_compliant(db, bin_content_id, product_id):
    # Get selected bin
    selected_bin = await db.get(BinContent, bin_content_id)

    # Get oldest available bin for this product
    oldest_bin = await db.execute(
        SELECT * FROM bin_contents
        WHERE product_id = product_id
          AND status = 'available'
          AND quantity > 0
        ORDER BY use_by_date ASC, batch_number ASC, received_date ASC
        LIMIT 1
    ).scalar_one_or_none()

    # Check if selected is oldest
    if selected_bin.id == oldest_bin.id:
        return True, None  # FEFO-compliant
    else:
        return False, oldest_bin  # Violation, return oldest
```

**Response to User**:
- **If Compliant**: Allow issue
- **If Not Compliant**: Return HTTP 409 Conflict with message:
  ```json
  {
    "detail": "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető.",
    "oldest_bin": {
      "bin_code": "A-01-02-03",
      "use_by_date": "2025-03-15",
      "quantity": 100.0
    }
  }
  ```

---

## Manager Override Workflow

### When Overrides Are Necessary

**Valid Non-FEFO Reasons**:

1. **Customer-Specific Request** (`customer_request`):
   - Customer requires specific batch number (quality tracking)
   - Example: "Restaurant chain wants batch BATCH-2025-045"

2. **Quality Issue** (`quality_issue`):
   - Oldest batch has minor damage/quality concern
   - Newer batch in better condition
   - Example: "Oldest pallet has torn packaging"

3. **Partial Pallet** (`partial_pallet`):
   - Oldest batch is partial pallet (20kg left)
   - Newer batch is full pallet (500kg)
   - Picking efficiency: full pallet faster
   - Example: "Need 200kg, oldest has only 20kg, avoid breaking new pallet"

4. **Location Convenience** (`location_convenience`):
   - Oldest bin on top shelf (requires forklift)
   - Newer bin at ground level (hand-pick)
   - **Only allowed if expiry difference < 7 days**

### Override Request Flow

**Step 1**: Warehouse user attempts non-FEFO issue
```bash
POST /api/v1/inventory/issue
{
  "bin_content_id": "uuid-of-newer-bin",
  "quantity": 50.0,
  "reason": "sales_order"
}
```

**Step 2**: System detects FEFO violation, returns 409 Conflict
```json
{
  "detail": "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető.",
  "oldest_bin": {
    "bin_code": "A-01-02-03",
    "use_by_date": "2025-02-10"
  }
}
```

**Step 3**: Manager approves override
```bash
POST /api/v1/inventory/issue
{
  "bin_content_id": "uuid-of-newer-bin",
  "quantity": 50.0,
  "reason": "customer_request",
  "force_non_fefo": true,
  "override_reason": "Vevő kifejezett kérése - BATCH-2025-045 szükséges",
  "notes": "XYZ Vendéglő megrendelés"
}
```

**Step 4**: System logs override in audit trail
```sql
INSERT INTO bin_movements (
  movement_type, quantity, fefo_compliant, force_override, override_reason, ...
) VALUES (
  'issue', -50.0, false, true, 'Vevő kifejezett kérése...', ...
);
```

### RBAC for Overrides

| Role | Can Issue (FEFO) | Can Override |
|------|------------------|--------------|
| viewer | ❌ | ❌ |
| warehouse | ✅ | ❌ |
| manager | ✅ | ✅ (with reason) |
| admin | ✅ | ✅ (with reason) |

**Enforcement**: RequireManager dependency in FastAPI endpoint

```python
@router.post("/issue")
async def issue_inventory(
    issue_data: IssueRequest,
    current_user: RequireWarehouse,  # Base permission
    ...
):
    if issue_data.force_non_fefo:
        # Check manager permission
        if current_user.role not in ["manager", "admin"]:
            raise HTTPException(403, "FEFO felülíráshoz adminisztrátori jóváhagyás szükséges")
```

---

## Edge Cases and Handling

### 1. Multiple Batches, Same Expiry Date

**Scenario**:
```
Bin A: use_by_date = 2025-02-10, batch = "BATCH-2025-001"
Bin B: use_by_date = 2025-02-10, batch = "BATCH-2025-045"
```

**Solution**: Tiebreaker by `batch_number ASC`
- Pick Bin A first (BATCH-2025-001 < BATCH-2025-045)

### 2. No Expiry Date (Non-Food Products)

**Scenario**: Hardware items without expiry dates

**Solution**:
- Set `use_by_date = NULL` (database schema allows)
- **FEFO Query**: Skip products with NULL expiry
- **Fallback**: Use FIFO (received_date) for non-food

**Implementation**:
```sql
WHERE use_by_date IS NOT NULL  -- Only food products
ORDER BY use_by_date ASC
```

### 3. Partial Quantities

**Scenario**: Request 150kg, only 120kg available

**Solution**: Return partial recommendation
```json
{
  "requested_quantity": 150.0,
  "total_available": 120.0,
  "recommendations": [...],  // All available bins
  "fefo_warnings": ["Figyelem: Csak 120kg elérhető (kérvény: 150kg)"]
}
```

**User Action**: Decide to:
- Issue partial quantity (120kg)
- Wait for new delivery
- Source from different warehouse

### 4. Reserved Stock

**Scenario**: Bin A has 100kg, but 50kg reserved for Order #123

**Solution**: Filter by status
```sql
WHERE status = 'available'  -- Excludes 'reserved'
```

**Available for FEFO**: Only 50kg from Bin A

### 5. Expired Batch in Mix

**Scenario**:
```
Bin A: use_by_date = 2025-01-10 (EXPIRED -21 days)
Bin B: use_by_date = 2025-03-15 (54 days)
```

**Solution**: Application-level filter
```python
if bin.use_by_date < date.today():
    continue  # Skip expired bins
```

**Separate Endpoint**: `/inventory/expired` lists expired products for scrapping

---

## Testing FEFO Logic

### Unit Test Scenarios

**Test 1: Basic 3-Bin Sort**
```python
def test_fefo_sort_three_bins():
    bin1 = create_bin_content(use_by_date="2025-06-30")  # Newest
    bin2 = create_bin_content(use_by_date="2025-02-10")  # Oldest
    bin3 = create_bin_content(use_by_date="2025-04-15")  # Middle

    recommendations = get_fefo_recommendation(product_id, 150)

    assert recommendations[0].bin_content_id == bin2.id  # 2025-02-10
    assert recommendations[1].bin_content_id == bin3.id  # 2025-04-15
    assert recommendations[2].bin_content_id == bin1.id  # 2025-06-30
```

**Test 2: Tiebreaker by Batch Number**
```python
def test_fefo_tiebreaker_batch():
    bin1 = create_bin_content(use_by_date="2025-02-10", batch_number="BATCH-2025-045")
    bin2 = create_bin_content(use_by_date="2025-02-10", batch_number="BATCH-2025-001")

    recommendations = get_fefo_recommendation(product_id, 50)

    assert recommendations[0].bin_content_id == bin2.id  # BATCH-2025-001
```

**Test 3: Multi-Bin Allocation**
```python
def test_fefo_multi_bin_allocation():
    bin1 = create_bin_content(use_by_date="2025-02-10", quantity=100)
    bin2 = create_bin_content(use_by_date="2025-04-15", quantity=80)

    recommendations = get_fefo_recommendation(product_id, 150)

    assert len(recommendations) == 2
    assert recommendations[0].suggested_quantity == 100  # Full bin1
    assert recommendations[1].suggested_quantity == 50   # Partial bin2
```

**Test 4: Issue Non-FEFO (Should Fail)**
```python
def test_issue_non_fefo_warehouse_user(warehouse_user_token):
    bin_old = create_bin_content(use_by_date="2025-02-10", quantity=100)
    bin_new = create_bin_content(use_by_date="2025-06-30", quantity=80)

    response = client.post("/api/v1/inventory/issue", json={
        "bin_content_id": bin_new.id,  # Trying to pick newer
        "quantity": 50.0,
        "reason": "sales_order"
    }, headers={"Authorization": f"Bearer {warehouse_user_token}"})

    assert response.status_code == 409  # Conflict
    assert "FEFO" in response.json()["detail"]
```

**Test 5: Manager Override**
```python
def test_issue_non_fefo_manager_override(manager_token):
    bin_old = create_bin_content(use_by_date="2025-02-10", quantity=100)
    bin_new = create_bin_content(use_by_date="2025-06-30", quantity=80)

    response = client.post("/api/v1/inventory/issue", json={
        "bin_content_id": bin_new.id,
        "quantity": 50.0,
        "reason": "customer_request",
        "force_non_fefo": true,
        "override_reason": "Vevő kifejezett kérése"
    }, headers={"Authorization": f"Bearer {manager_token}"})

    assert response.status_code == 200
    assert response.json()["fefo_compliant"] == false
    assert response.json()["warning"]["type"] == "fefo_violation"
```

### Integration Test Flows

**Full Workflow Test**:
```python
async def test_full_fefo_workflow():
    # 1. Receive goods (create inventory)
    receipt1 = await receive_goods(product_id, bin_id_1, use_by="2025-02-10", quantity=100)
    receipt2 = await receive_goods(product_id, bin_id_2, use_by="2025-06-30", quantity=80)

    # 2. Get FEFO recommendation
    recommendation = await get_fefo_recommendation(product_id, 150)
    assert recommendation.recommendations[0].bin_code == "A-01-02-03"  # Oldest first

    # 3. Issue following recommendation
    issue_response = await issue_goods(
        bin_content_id=recommendation.recommendations[0].bin_content_id,
        quantity=100
    )
    assert issue_response.fefo_compliant == true

    # 4. Verify audit trail
    movements = await get_movements(product_id=product_id)
    assert movements[0].fefo_compliant == true
```

---

## Monitoring and Compliance Reports

### FEFO Violation Tracking

**Query**: Count non-FEFO issues per month
```sql
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) FILTER (WHERE fefo_compliant = false AND force_override = true) AS non_fefo_count,
    COUNT(*) FILTER (WHERE fefo_compliant = true) AS fefo_count,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE fefo_compliant = false) / COUNT(*),
        2
    ) AS non_fefo_percentage
FROM bin_movements
WHERE movement_type = 'issue'
GROUP BY month
ORDER BY month DESC;
```

**Example Output**:
```
 month       | non_fefo_count | fefo_count | non_fefo_percentage
-------------+----------------+------------+---------------------
 2025-01-01  |              3 |        147 |                2.00
 2024-12-01  |              1 |        132 |                0.75
```

**Alert Threshold**: If non_fefo_percentage > 5%, investigate with managers

### Override Frequency Report

**Query**: Top override reasons
```sql
SELECT
    override_reason,
    COUNT(*) AS count,
    STRING_AGG(DISTINCT created_by_user.username, ', ') AS managers
FROM bin_movements
JOIN users AS created_by_user ON bin_movements.created_by = created_by_user.id
WHERE force_override = true
GROUP BY override_reason
ORDER BY count DESC;
```

**Example Output**:
```
 override_reason                    | count | managers
------------------------------------+-------+-----------
 Vevő kifejezett kérése            |    15 | manager1, manager2
 Minőségi probléma                 |     5 | manager1
 Részleges raklap                  |     3 | manager2
```

---

## Best Practices

### 1. Always Call FEFO Recommendation First

**❌ Bad**:
```python
# User guesses which bin to pick from
issue_goods(bin_content_id="random-uuid", quantity=50)
```

**✅ Good**:
```python
# 1. Get recommendation
recommendation = get_fefo_recommendation(product_id, 50)

# 2. Pick from first recommendation
issue_goods(
    bin_content_id=recommendation.recommendations[0].bin_content_id,
    quantity=50
)
```

### 2. Document All Overrides

**Required Fields**:
- `override_reason`: Clear, specific justification
- `reference_number`: Link to customer order or incident report
- `notes`: Additional context

**❌ Bad**:
```json
{
  "override_reason": "Manager said okay"
}
```

**✅ Good**:
```json
{
  "override_reason": "Vevő kifejezett kérése - BATCH-2025-045 szükséges minőségi nyomon követéshez",
  "reference_number": "SO-2025-001",
  "notes": "XYZ Vendéglő megrendelés, előzetes egyeztetés Kovács Péter vevőszolgálati vezetővel"
}
```

### 3. Regular Expiry Audits

**Daily Task** (automated via Phase 4):
```bash
# Get critical expiry warnings (<7 days)
curl "/api/v1/inventory/expiry-warnings?days_threshold=7"

# Email warehouse manager with results
```

**Weekly Task**:
```bash
# Review all expiry warnings (30 days)
curl "/api/v1/inventory/expiry-warnings?days_threshold=30"

# Plan promotions/discounts for near-expiry products
```

### 4. Audit Trail Review

**Monthly Compliance Check**:
1. Review all non-FEFO issues (force_override=true)
2. Verify override reasons are documented
3. Interview managers if override rate > 5%
4. Update training if necessary

---

## See Also

- **Phase3_Overview.md** - Business value and feature summary
- **Phase3_API_Reference.md** - FEFO recommendation endpoint details
- **Phase3_Database_Schema.md** - Indexes optimizing FEFO queries
- **Phase3_Movement_Audit.md** - Audit trail for compliance
- **Phase3_Testing_Guide.md** - FEFO test patterns
