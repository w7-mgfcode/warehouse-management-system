# INITIAL3 — WMS Phase 3: Inventory Receipt/Issue + FEFO Logic

This document defines Phase 3 implementation requirements, building on Phase 2 (Products, Suppliers, Bins CRUD + Bulk Generation).

**Last Updated**: December 2025
**Prerequisite**: Phase 2 complete (products, suppliers, bins with bulk generation, 88 tests passing)

## FEATURE

### Phase 3 Scope

1. **Bin Contents** - Track inventory in bins with batch/lot numbers and expiry dates
2. **Incoming Goods (Receipt)** - Receive products into bins with full traceability
3. **Outgoing Goods (Issue)** - Issue products from bins with FEFO enforcement
4. **FEFO Algorithm** - First Expired, First Out inventory management
5. **Stock Movements History** - Audit trail of all inventory transactions
6. **Expiry Warnings** - Alert system for products approaching expiration

### Key Constraints

- All user-facing messages in **Hungarian**
- FEFO algorithm must be **strictly enforced** for food products
- **One bin = one product** at a time (with multiple batches allowed)
- Movement history must be **immutable** (audit trail)
- Expiry dates are **mandatory** for food products
- Use **timezone-aware timestamps** (Europe/Budapest)

## EXAMPLES

### Bin Contents Model

**Current State Tracking**:
```json
{
  "id": "uuid",
  "bin_id": "uuid",
  "product_id": "uuid",
  "supplier_id": "uuid",
  "batch_number": "BATCH-2025-001",
  "use_by_date": "2025-12-31",
  "best_before_date": "2025-12-25",
  "freeze_date": "2025-01-15",
  "quantity": 100.0,
  "unit": "kg",
  "pallet_count": 5,
  "weight_kg": 500.0,
  "received_date": "2025-01-15T08:30:00+01:00",
  "status": "available",
  "notes": "Friss áru, hűtve tárolandó"
}
```

### Incoming Goods API (Receipt)

```bash
# Receive product into bin
POST /api/v1/inventory/receive
{
  "bin_id": "uuid",
  "product_id": "uuid",
  "supplier_id": "uuid",
  "batch_number": "BATCH-2025-001",
  "use_by_date": "2025-12-31",
  "best_before_date": "2025-12-25",
  "freeze_date": "2025-01-15",
  "quantity": 100.0,
  "unit": "kg",
  "pallet_count": 5,
  "weight_kg": 500.0,
  "notes": "Friss áru"
}

# Response:
{
  "bin_content_id": "uuid",
  "movement_id": "uuid",
  "bin": {
    "code": "A-01-02-03",
    "warehouse_name": "Budapest Central"
  },
  "product": {
    "name": "Csirkemell filé",
    "sku": "CSIRKE-001"
  },
  "quantity": 100.0,
  "use_by_date": "2025-12-31",
  "days_until_expiry": 350,
  "message": "Termék sikeresen beérkeztetve"
}
```

### Outgoing Goods API (Issue)

```bash
# Get FEFO recommendation before issuing
GET /api/v1/inventory/fefo-recommendation?product_id=uuid&quantity=50

# Response:
{
  "product_id": "uuid",
  "product_name": "Csirkemell filé",
  "requested_quantity": 50.0,
  "recommendations": [
    {
      "bin_id": "uuid",
      "bin_code": "A-01-02-03",
      "batch_number": "BATCH-2025-001",
      "use_by_date": "2025-03-15",
      "days_until_expiry": 54,
      "available_quantity": 50.0,
      "suggested_quantity": 50.0,
      "is_fefo_compliant": true,
      "warning": null
    }
  ],
  "total_available": 150.0,
  "fefo_warnings": []
}

# Issue product from bin (following FEFO)
POST /api/v1/inventory/issue
{
  "bin_content_id": "uuid",
  "quantity": 50.0,
  "reason": "sales_order",
  "reference_number": "SO-2025-001",
  "notes": "Vevői rendelés"
}

# Response:
{
  "movement_id": "uuid",
  "bin_content_id": "uuid",
  "quantity_issued": 50.0,
  "remaining_quantity": 50.0,
  "use_by_date": "2025-03-15",
  "days_until_expiry": 54,
  "fefo_compliant": true,
  "message": "Termék sikeresen kiadva"
}

# Force issue (bypass FEFO with warning)
POST /api/v1/inventory/issue
{
  "bin_content_id": "uuid",
  "quantity": 30.0,
  "reason": "customer_request",
  "force_non_fefo": true,  # Admin/Manager only
  "override_reason": "Vevő kifejezett kérése",
  "notes": "Nem FEFO szerint"
}
```

### Stock Movements History

```bash
# Get movement history for product
GET /api/v1/movements?product_id=uuid&start_date=2025-01-01&end_date=2025-12-31

# Response:
{
  "items": [
    {
      "id": "uuid",
      "movement_type": "receipt",
      "bin_code": "A-01-02-03",
      "product_name": "Csirkemell filé",
      "batch_number": "BATCH-2025-001",
      "quantity": 100.0,
      "unit": "kg",
      "use_by_date": "2025-12-31",
      "reason": "supplier_delivery",
      "reference_number": "PO-2025-001",
      "created_by": "admin",
      "created_at": "2025-01-15T08:30:00+01:00",
      "notes": "Friss áru beérkeztetés"
    },
    {
      "id": "uuid",
      "movement_type": "issue",
      "bin_code": "A-01-02-03",
      "product_name": "Csirkemell filé",
      "batch_number": "BATCH-2025-001",
      "quantity": -50.0,
      "unit": "kg",
      "use_by_date": "2025-12-31",
      "reason": "sales_order",
      "reference_number": "SO-2025-001",
      "fefo_compliant": true,
      "created_by": "warehouse_user",
      "created_at": "2025-01-20T14:15:00+01:00"
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 50
}

# Get bin movement history
GET /api/v1/movements?bin_id=uuid

# Get movement by ID
GET /api/v1/movements/{movement_id}
```

### Expiry Warnings

```bash
# Get expiry warnings
GET /api/v1/inventory/expiry-warnings?days_threshold=30

# Response:
{
  "items": [
    {
      "bin_content_id": "uuid",
      "bin_code": "A-01-02-03",
      "product_name": "Csirkemell filé",
      "batch_number": "BATCH-2025-001",
      "quantity": 50.0,
      "unit": "kg",
      "use_by_date": "2025-02-15",
      "days_until_expiry": 15,
      "urgency": "high",
      "warning_message": "Figyelem! Lejárat közel (15 nap)"
    },
    {
      "bin_content_id": "uuid",
      "bin_code": "B-03-01-02",
      "product_name": "Tejföl",
      "batch_number": "BATCH-2025-045",
      "quantity": 20.0,
      "unit": "kg",
      "use_by_date": "2025-02-05",
      "days_until_expiry": 5,
      "urgency": "critical",
      "warning_message": "KRITIKUS! Lejárat közel (5 nap)"
    }
  ],
  "summary": {
    "critical": 5,    # < 7 days
    "high": 12,       # 7-14 days
    "medium": 25,     # 15-30 days
    "total": 42
  }
}

# Get expired products
GET /api/v1/inventory/expired

# Response:
{
  "items": [
    {
      "bin_content_id": "uuid",
      "bin_code": "C-05-02-01",
      "product_name": "Joghurt",
      "batch_number": "BATCH-2024-999",
      "quantity": 10.0,
      "unit": "kg",
      "use_by_date": "2025-01-10",
      "days_since_expiry": 5,
      "status": "expired",
      "action_required": "Selejtezés szükséges"
    }
  ],
  "total": 1
}
```

### Inventory Reports

```bash
# Current stock levels by product
GET /api/v1/inventory/stock-levels

# Response:
{
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Csirkemell filé",
      "sku": "CSIRKE-001",
      "total_quantity": 150.0,
      "unit": "kg",
      "bin_count": 3,
      "batch_count": 2,
      "oldest_expiry": "2025-03-15",
      "newest_expiry": "2025-12-31",
      "locations": ["A-01-02-03", "A-02-01-01", "B-01-03-02"]
    }
  ]
}

# Stock by bin
GET /api/v1/inventory/bins/{bin_id}

# Stock by warehouse
GET /api/v1/inventory/warehouse/{warehouse_id}
```

## DOCUMENTATION

### New Models to Create

**BinContent** (`bin_contents` table):
- `id` UUID PK
- `bin_id` UUID FK → bins.id (CASCADE)
- `product_id` UUID FK → products.id (RESTRICT)
- `supplier_id` UUID FK → suppliers.id (RESTRICT)
- `batch_number` VARCHAR(100) NOT NULL
- `use_by_date` DATE NULL (mandatory for food)
- `best_before_date` DATE NULL
- `freeze_date` DATE NULL
- `quantity` DECIMAL(10,2) NOT NULL
- `unit` VARCHAR(50) NOT NULL
- `pallet_count` INTEGER NULL
- `weight_kg` DECIMAL(10,2) NULL
- `received_date` TIMESTAMP WITH TZ NOT NULL
- `status` VARCHAR(20) CHECK IN ('available', 'reserved', 'expired', 'scrapped')
- `notes` TEXT NULL
- `created_at`, `updated_at` TIMESTAMP WITH TZ

**Constraints**:
- One bin can have only ONE product at a time
- Multiple batches of same product allowed (different batch_numbers)
- `use_by_date` is mandatory if product category is food-related

**BinMovement** (`bin_movements` table) - Immutable audit trail:
- `id` UUID PK
- `bin_content_id` UUID FK → bin_contents.id (RESTRICT)
- `movement_type` VARCHAR(20) CHECK IN ('receipt', 'issue', 'adjustment', 'transfer', 'scrap')
- `quantity` DECIMAL(10,2) NOT NULL (positive for receipt, negative for issue)
- `quantity_before` DECIMAL(10,2) NOT NULL
- `quantity_after` DECIMAL(10,2) NOT NULL
- `reason` VARCHAR(50) NOT NULL
- `reference_number` VARCHAR(100) NULL (PO, SO, etc.)
- `fefo_compliant` BOOLEAN NULL (only for issue movements)
- `force_override` BOOLEAN DEFAULT false (non-FEFO issue with approval)
- `override_reason` TEXT NULL
- `notes` TEXT NULL
- `created_by` UUID FK → users.id
- `created_at` TIMESTAMP WITH TZ NOT NULL

**Indexes**:
- `bin_contents`: bin_id, product_id, status, use_by_date
- `bin_movements`: bin_content_id, movement_type, created_at, created_by

### Existing Code References

- `app/db/models/product.py` - Product model (Phase 2)
- `app/db/models/supplier.py` - Supplier model (Phase 2)
- `app/db/models/bin.py` - Bin model (Phase 2)
- `app/api/v1/bins.py` - Reference for endpoint patterns
- `app/services/bin.py` - Reference for service patterns
- `app/tests/test_bins.py` - Reference for test patterns
- `Docs/Phase2_API_Reference.md` - API conventions
- `Docs/Phase2_Database_Schema.md` - Database patterns

### Hungarian Messages to Add (`app/core/i18n.py`)

```python
# Bin Contents
"bin_content_not_found": "A tárolóhely tartalma nem található.",
"bin_already_occupied": "A tárolóhely már foglalt másik termékkel.",
"bin_not_empty_for_product": "A tárolóhely már tartalmazza ezt a terméket.",
"insufficient_quantity": "Nincs elegendő mennyiség a tárolóhelyen.",
"invalid_quantity": "Érvénytelen mennyiség.",

# Incoming/Outgoing
"receipt_successful": "Termék sikeresen beérkeztetve.",
"issue_successful": "Termék sikeresen kiadva.",
"expiry_date_required": "A szavatossági dátum megadása kötelező.",
"expiry_date_past": "A szavatossági dátum nem lehet múltbeli.",
"freeze_date_future": "A fagyasztás dátuma nem lehet jövőbeli.",

# FEFO
"fefo_violation": "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető.",
"fefo_warning": "Figyelem: Ez nem a legrégebbi lejáratú tétel!",
"fefo_override_required": "FEFO felülíráshoz adminisztrátori jóváhagyás szükséges.",
"fefo_compliant": "FEFO szabály betartva.",

# Expiry
"product_expired": "A termék lejárt.",
"expiry_warning": "Figyelem! Lejárat közel ({days} nap).",
"expiry_critical": "KRITIKUS! Lejárat közel ({days} nap).",

# Movements
"movement_not_found": "A mozgás nem található.",
"movement_immutable": "A mozgás rekordok nem módosíthatók.",
"invalid_movement_type": "Érvénytelen mozgás típus.",
"reference_required": "A hivatkozási szám megadása kötelező.",
```

## OTHER CONSIDERATIONS

### FEFO Algorithm Logic

**Priority Calculation**:
1. Products with **earlier use_by_date** have higher priority
2. If use_by_date is same, use **earlier batch_number** (alphabetically)
3. If still tied, use **earlier received_date**

**FEFO Recommendation Flow**:
```
1. User requests quantity of product
2. System finds all bins with that product
3. Filter by status='available', quantity > 0
4. Sort by: use_by_date ASC, batch_number ASC, received_date ASC
5. Return ordered list with suggested quantities
6. Flag if user selects non-FEFO bin
```

**Force Override Rules**:
- Only admin/manager can override FEFO
- Must provide `override_reason`
- Movement marked with `force_override=true`
- Warning logged for audit

### Bin Status Updates

**Auto-update bin.status based on bin_contents**:
- If bin_contents exists with quantity > 0: `status='occupied'`
- If bin_contents.status='reserved': `status='reserved'`
- If no bin_contents or quantity=0: `status='empty'`
- If bin_contents.status='expired': Consider manual intervention

### Expiry Warning Thresholds

**Urgency Levels**:
- **critical**: < 7 days until expiry (red alert)
- **high**: 7-14 days (orange warning)
- **medium**: 15-30 days (yellow notice)
- **low**: 31-60 days (info)

### RBAC Requirements

| Endpoint | admin | manager | warehouse | viewer |
|----------|-------|---------|-----------|--------|
| Receive Goods | ✓ | ✓ | ✓ | - |
| Issue Goods (FEFO compliant) | ✓ | ✓ | ✓ | - |
| Issue Goods (Force non-FEFO) | ✓ | ✓ | - | - |
| View Inventory | ✓ | ✓ | ✓ | ✓ |
| View Movements | ✓ | ✓ | ✓ | ✓ |
| Expiry Warnings | ✓ | ✓ | ✓ | ✓ |
| Stock Reports | ✓ | ✓ | ✓ | ✓ |
| Scrap/Adjust | ✓ | ✓ | - | - |

### Validation Rules

**Receipt Validation**:
- `bin_id` must exist and be empty or contain same product
- `product_id` must exist and be active
- `supplier_id` must exist and be active
- `use_by_date` required if product is food (can infer from category)
- `quantity` must be > 0
- `use_by_date` must be future date
- `freeze_date` must be past or today
- `weight_kg` should match `quantity * unit_weight` (warning if mismatch)

**Issue Validation**:
- `bin_content_id` must exist with sufficient quantity
- `quantity` must be > 0 and ≤ available quantity
- Product must not be expired (use_by_date)
- FEFO check: If not oldest batch, require `force_non_fefo=true` (manager+)

**Adjustment Validation**:
- Requires manager+ permission
- Must provide reason (stocktake, damage, etc.)
- Records old and new quantities

### Movement Types

**receipt**: Incoming goods from supplier
**issue**: Outgoing goods to customer/production
**adjustment**: Stock correction (stocktake, damage)
**transfer**: Move between bins (Phase 4)
**scrap**: Write-off expired/damaged stock

### Delete Constraints

- **BinContent**: Cannot delete, only scrap with movement record
- **BinMovement**: **IMMUTABLE** - Never delete or update (audit trail)
- Products/Suppliers: Cannot delete if referenced in bin_contents (Phase 2 rule enforced)

### Test Coverage Requirements

**Bin Contents**:
- Create bin content in empty bin
- Attempt to add different product to occupied bin (reject)
- Update quantity
- View bin with content details

**Incoming Goods**:
- Successful receipt with all fields
- Receipt without expiry date (should fail for food)
- Receipt with past expiry date (reject)
- Receipt into occupied bin with different product (reject)

**Outgoing Goods**:
- Issue following FEFO (oldest batch first)
- Attempt to issue newer batch when older exists (should warn/reject)
- Force non-FEFO issue as manager
- Attempt force non-FEFO as warehouse user (reject)
- Insufficient quantity (reject)
- Issue from expired batch (reject)

**FEFO Algorithm**:
- Multiple batches sorted by expiry date
- Recommendation returns correct order
- Issue from wrong batch triggers warning

**Movements History**:
- All movements recorded correctly
- Movements are immutable
- Filter by product, bin, date range
- Movements include user who performed action

**Expiry Warnings**:
- Products expiring in 7 days flagged as critical
- Products expiring in 14 days flagged as high
- Expired products listed separately
- Warnings updated based on current date

### Files to Create

```text
app/
├── db/models/
│   ├── bin_content.py     # BinContent model
│   └── bin_movement.py    # BinMovement model (audit trail)
├── schemas/
│   ├── inventory.py       # ReceiveRequest, IssueRequest, StockLevel
│   ├── movement.py        # MovementResponse, MovementCreate
│   └── expiry.py          # ExpiryWarning, ExpiryReport
├── services/
│   ├── inventory.py       # Receipt, issue, stock queries
│   ├── fefo.py            # FEFO algorithm logic
│   ├── movement.py        # Movement history tracking
│   └── expiry.py          # Expiry warnings and alerts
├── api/v1/
│   ├── inventory.py       # Receive/issue endpoints
│   ├── movements.py       # Movement history endpoints
│   └── reports.py         # Stock and expiry reports
└── tests/
    ├── test_inventory.py
    ├── test_fefo.py
    ├── test_movements.py
    └── test_expiry.py
```

### API Endpoints Summary

**Inventory Operations** (`/api/v1/inventory`):
- `POST /receive` - Receive goods into bin (warehouse+)
- `POST /issue` - Issue goods from bin (warehouse+)
- `GET /fefo-recommendation` - Get FEFO recommendations
- `GET /stock-levels` - Current stock by product
- `GET /bins/{bin_id}` - Stock in specific bin
- `GET /warehouse/{warehouse_id}` - Stock in warehouse
- `GET /expiry-warnings` - Products approaching expiry
- `GET /expired` - Expired products
- `POST /adjust` - Stock adjustment (manager+)
- `POST /scrap` - Scrap expired/damaged stock (manager+)

**Movements** (`/api/v1/movements`):
- `GET /` - List movements with filters (product, bin, date range, user)
- `GET /{id}` - Get movement details

**Reports** (`/api/v1/reports`):
- `GET /inventory-summary` - Overall inventory snapshot
- `GET /product-locations` - Where is product X located
- `GET /expiry-timeline` - Expiry dates timeline
- `GET /movement-history` - Movement history report

### Response Format Examples

**Receipt Response**:
```json
{
  "success": true,
  "bin_content_id": "uuid",
  "movement_id": "uuid",
  "bin_code": "A-01-02-03",
  "product_name": "Csirkemell filé",
  "quantity": 100.0,
  "use_by_date": "2025-12-31",
  "days_until_expiry": 350,
  "message": "Termék sikeresen beérkeztetve"
}
```

**Issue Response with FEFO Warning**:
```json
{
  "success": true,
  "movement_id": "uuid",
  "quantity_issued": 50.0,
  "remaining_quantity": 50.0,
  "fefo_compliant": false,
  "warning": {
    "type": "fefo_violation",
    "message": "Figyelem! Ez nem a legrégebbi lejáratú tétel!",
    "oldest_batch": {
      "bin_code": "B-02-01-01",
      "batch_number": "BATCH-2025-002",
      "use_by_date": "2025-03-15",
      "quantity": 30.0
    }
  }
}
```

### FEFO Exception Handling

**Valid Reasons for Non-FEFO Issue**:
- `customer_request` - Customer requested specific batch
- `quality_issue` - Oldest batch has quality concerns
- `partial_pallet` - Need full pallet, oldest is partial
- `location_convenience` - Picking efficiency
- `other` - Other justified reason (must explain)

**Audit Trail**:
All non-FEFO issues logged with:
- Who performed override (user_id)
- Reason code
- Detailed explanation
- Which batch should have been picked
- Manager approval (if required by policy)

### Performance Considerations

**Indexes for Performance**:
- `bin_contents(product_id, status, use_by_date)` - FEFO queries
- `bin_contents(bin_id, status)` - Bin occupancy checks
- `bin_movements(created_at DESC)` - Recent movements
- `bin_movements(bin_content_id, movement_type)` - Movement history

**Query Optimization**:
- FEFO recommendation: Single query with ORDER BY
- Expiry warnings: Indexed date comparison
- Stock levels: Aggregate query with GROUP BY

### Date Handling

**Important Dates**:
- `use_by_date` (minőségmegőrzési határidő) - Mandatory for food, product unusable after
- `best_before_date` (fogyaszthatósági idő) - Optional, quality guarantee
- `freeze_date` (fagyasztás dátuma) - When product was frozen (if applicable)
- `received_date` - When product entered warehouse

**FEFO uses**: `use_by_date` primarily, `best_before_date` as fallback

### Migration Strategy

**Phase 3 Migrations**:
1. Create `bin_contents` table with constraints
2. Create `bin_movements` table (immutable)
3. Add indexes for performance
4. Add foreign keys with appropriate CASCADE/RESTRICT
5. Create database functions for FEFO ranking (optional)

### Testing Data Scenarios

**Test Data Setup**:
```python
# Create multiple batches with different expiry dates
batch_old = create_bin_content(use_by_date="2025-02-15")  # Expires soon
batch_mid = create_bin_content(use_by_date="2025-06-30")  # Mid-year
batch_new = create_bin_content(use_by_date="2025-12-31")  # Far future

# Test FEFO: Should recommend batch_old first
recommendation = get_fefo_recommendation(product_id)
assert recommendation[0].batch_number == batch_old.batch_number
```

### Future Enhancements (Phase 4+)

- **Transfer between bins** - Move product from bin to bin
- **Stock reservations** - Reserve stock for orders
- **Batch splitting** - Split large batch into smaller units
- **Quality holds** - Quarantine batches for inspection
- **Temperature tracking** - Monitor cold chain compliance
- **Barcode integration** - Scan batch numbers on receipt/issue
