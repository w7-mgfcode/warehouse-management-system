# WMS Phase 3: Overview

**Version**: 3.0
**Last Updated**: December 2025

## What's New in Phase 3

Phase 3 transforms the Warehouse Management System into a complete **FEFO-compliant inventory management solution** for food safety. Building on Phase 2's master data and storage location management, Phase 3 adds critical inventory operations with **First Expired, First Out** enforcement, ensuring regulatory compliance and minimizing food waste.

### New Capabilities

1. **Inventory Receipt** - Receive products into bins with full traceability (batch numbers, expiry dates, supplier tracking)
2. **Inventory Issue** - Issue products from bins with strict FEFO enforcement for food safety
3. **FEFO Algorithm** - Automated recommendation system for picking oldest-expiry items first
4. **Movement Audit Trail** - Immutable history of all inventory transactions for compliance
5. **Expiry Warnings** - Proactive alerts for products approaching expiration (4 urgency levels)
6. **Stock Reports** - Real-time inventory levels, product locations, and expiry timelines

### Key Business Value

- **Food Safety Compliance**: Automated FEFO ensures products are issued in correct expiry order
- **Waste Reduction**: Proactive expiry warnings prevent product loss
- **Full Traceability**: Immutable audit trail tracks every inventory movement
- **Regulatory Compliance**: Complete chain of custody from receipt to issue
- **Operational Efficiency**: Multi-bin allocation recommendations speed up picking

---

## Quick Reference

### New API Endpoints: 12

| Resource | Endpoints | Key Features |
|----------|-----------|--------------|
| Inventory | 8 | Receive, issue, FEFO recommendations, stock levels, expiry warnings, adjust, scrap |
| Movements | 2 | Movement history with filters (product, bin, date, user), audit trail |
| Reports | 2 | Inventory summary, product locations |

### New Database Tables: 2

| Table | Description | Key Features |
|-------|-------------|--------------|
| `bin_contents` | Current inventory state | Batch tracking, expiry dates, status (available/reserved/expired/scrapped) |
| `bin_movements` | Immutable audit trail | Movement types, quantity snapshots, FEFO compliance flag, user attribution |

### Test Coverage: 48 New Tests (136 Total)

| Resource | Tests | Coverage Areas |
|----------|-------|----------------|
| Inventory | 16 | Receipt, issue, stock queries, FEFO compliance, expiry validation |
| FEFO Algorithm | 12 | Multi-level sort, recommendations, compliance checking, overrides |
| Movements | 12 | History tracking, filtering, immutability, user attribution |
| Expiry Warnings | 8 | Critical/high/medium thresholds, expired products, urgency levels |
| **Phase 3 Total** | **48** | **~87% coverage** |
| **Cumulative** | **136** | **88 tests (Phase 1+2) + 48 tests (Phase 3)** |

---

## Phase 1 vs Phase 2 vs Phase 3 Comparison

| Aspect | Phase 1 | Phase 2 | Phase 3 | Total |
|--------|---------|---------|---------|-------|
| **Resources** | Users, Warehouses | +Products, Suppliers, Bins | +Inventory, Movements | **7 resources** |
| **API Endpoints** | 12 | +15 | +12 | **39 endpoints** |
| **Database Tables** | 2 | +3 | +2 | **7 tables** |
| **Test Suite** | 40 tests | +48 tests | +48 tests | **136 tests** |
| **Key Features** | Auth, RBAC, Warehouses | Master data, Storage locations, Bulk generation | **Inventory ops, FEFO, Audit trail** | **Complete WMS** |
| **Complexity** | Foundation | Operational setup | **Business-critical operations** | **Production-ready** |

---

## Key Features in Detail

### 1. Inventory Receipt

**Receive incoming goods with complete traceability**:

- **Batch Tracking**: Unique batch/lot numbers for each delivery
- **Expiry Management**: Mandatory `use_by_date` for food products, optional `best_before_date` and `freeze_date`
- **Supplier Attribution**: Link receipts to suppliers for quality tracking
- **Physical Metrics**: Track quantity, unit, pallet count, weight
- **Bin Constraint**: One bin = one product (multiple batches allowed)

**RBAC**: Warehouse+ users can receive goods

**Example Use Case**:
```
Receive 100kg of chicken breast (Csirkemell filé)
- Batch: BATCH-2025-001
- Use by: 2025-03-15 (54 days until expiry)
- Supplier: Baromfi Kft.
- Bin: A-01-02-03

Result: BinContent created, BinMovement recorded (receipt type)
```

---

### 2. Inventory Issue with FEFO Enforcement

**Issue outgoing goods following food safety regulations**:

- **FEFO Compliance**: System enforces First Expired, First Out picking
- **Real-time Validation**: Checks if selected bin is oldest expiry
- **Multi-Bin Recommendations**: Suggests optimal picking across multiple bins
- **Manager Override**: Admin/Manager can force non-FEFO with documented reason
- **Expiry Check**: Rejects issue if product is past `use_by_date`

**FEFO Sort Priority**:
1. Earliest `use_by_date` (primary)
2. Earliest `batch_number` alphabetically (tiebreaker)
3. Earliest `received_date` (final tiebreaker)

**RBAC**:
- Warehouse+ can issue (FEFO-compliant only)
- Manager+ can override FEFO with documented reason

**Example Use Case**:
```
Issue 50kg of chicken breast
1. System recommends Bin A-01-02-03 (expires 2025-03-15)
2. User attempts Bin B-02-01-01 (expires 2025-04-20)
3. System warns: "FEFO violation! Bin A-01-02-03 expires sooner."
4. Manager overrides with reason: "Customer requested specific batch"
5. Movement recorded with force_override=true
```

---

### 3. FEFO Algorithm

**Automated recommendation system for optimal picking**:

- **3-Level Sort**: Orders bins by expiry date → batch number → received date
- **Multi-Bin Allocation**: Calculates how much to pick from each bin
- **Quantity Optimization**: Minimizes number of bins to pick from
- **Expiry Warnings**: Flags critical (<7 days) and high urgency (<14 days) items
- **Stock Availability**: Shows total available across all bins

**Algorithm Complexity**:
- **Time**: O(n log n) where n = number of bins with product
- **Space**: O(n) for recommendations list

**Example Output**:
```json
{
  "product_name": "Csirkemell filé",
  "requested_quantity": 150.0,
  "recommendations": [
    {
      "bin_code": "A-01-02-03",
      "use_by_date": "2025-03-15",
      "days_until_expiry": 54,
      "available_quantity": 100.0,
      "suggested_quantity": 100.0,
      "warning": null
    },
    {
      "bin_code": "A-02-01-01",
      "use_by_date": "2025-06-30",
      "days_until_expiry": 161,
      "available_quantity": 80.0,
      "suggested_quantity": 50.0,
      "warning": null
    }
  ],
  "total_available": 180.0
}
```

---

### 4. Movement Audit Trail

**Immutable history of all inventory transactions**:

- **Movement Types**: receipt, issue, adjustment, scrap, transfer (Phase 4)
- **Quantity Snapshots**: Records quantity_before, quantity_after for every movement
- **FEFO Compliance Tracking**: Flags non-FEFO issues with override reason
- **User Attribution**: Records which user performed each action
- **Reference Numbers**: Links to PO/SO/adjustment docs
- **Immutability**: Records are NEVER updated or deleted (compliance requirement)

**Audit Trail Integrity**:
- Application-level enforcement (no UPDATE/DELETE endpoints)
- Timezone-aware timestamps (Europe/Budapest)
- Complete chain of custody from receipt to issue

**Example Audit Trail**:
```
Receipt:    0 kg → +100 kg → 100 kg (admin, 2025-01-15 08:30)
Issue:    100 kg →  -30 kg →  70 kg (warehouse_user, 2025-01-20 14:15, FEFO-compliant)
Issue:     70 kg →  -20 kg →  50 kg (warehouse_user, 2025-01-25 10:00, FEFO-compliant)
Adjustment: 50 kg →  +10 kg →  60 kg (manager, 2025-02-01 16:00, stocktake correction)
```

---

### 5. Expiry Warnings

**Proactive alerts for products approaching expiration**:

- **4 Urgency Levels**:
  - **Critical**: < 7 days (red alert, immediate action required)
  - **High**: 7-14 days (orange warning, plan usage/discounts)
  - **Medium**: 15-30 days (yellow notice, monitor stock)
  - **Low**: 31-60 days (info, for planning)

- **Expired Products Report**: Separate list of products past `use_by_date` requiring scrap

- **Customizable Threshold**: Default 30 days, adjustable 1-365 days

**Hungarian Messages**:
- Critical: "KRITIKUS! Lejárat 5 nap múlva"
- High: "FIGYELEM! Lejárat közel (12 nap)"
- Medium: "Figyelem: lejárat 25 nap múlva"

**Example Summary**:
```json
{
  "summary": {
    "critical": 5,    // < 7 days
    "high": 12,       // 7-14 days
    "medium": 25,     // 15-30 days
    "low": 8,         // 31-60 days
    "total": 50
  }
}
```

---

### 6. Stock Reports

**Real-time inventory visibility**:

- **Stock Levels by Product**: Total quantity, bin count, batch count, expiry range
- **Product Locations**: Where is product X stored (all bins)
- **Warehouse Stock**: All inventory in specific warehouse
- **Bin Contents**: Detailed view of single bin

**Aggregation Features**:
- Groups by product across all bins
- Shows oldest and newest expiry dates
- Lists all storage locations
- Calculates total quantities by unit

---

## Migration Path

### Prerequisites

- Phase 2 complete (Products, Suppliers, Bins CRUD functional)
- 88 tests passing from Phase 1 + Phase 2
- PostgreSQL 17.7+ with asyncpg driver
- Python 3.13+ with SQLAlchemy 2.0.45+

### Database Migration

```bash
# Apply Phase 3 migration
alembic upgrade head

# Migration creates:
# - bin_contents table with indexes
# - bin_movements table (audit trail)
# - Removes obsolete bin_history table
```

### Breaking Changes

**None** - Phase 3 is additive only. Existing Phase 1/2 functionality unchanged.

### Rollback Plan

```bash
# Rollback migration if needed
alembic downgrade -1

# Note: Movement audit trail will be lost (immutable records)
```

---

## Documentation Structure

Phase 3 documentation consists of 6 comprehensive files:

1. **Phase3_Overview.md** (this file) - Quick reference and business context
2. **Phase3_API_Reference.md** - Complete API documentation for all 12 endpoints
3. **Phase3_Database_Schema.md** - BinContent, BinMovement tables, ERD, indexes
4. **Phase3_FEFO_Compliance.md** - Algorithm deep dive, food safety, business value
5. **Phase3_Movement_Audit.md** - Audit trail, traceability, compliance reporting
6. **Phase3_Testing_Guide.md** - Test patterns, fixtures, 48 new tests

### Related Phase 1/2 Documentation

Still relevant for Phase 3:

- **Phase1_Authentication.md** - JWT and RBAC (applies to inventory endpoints)
- **Phase1_Architecture.md** - System design patterns
- **Phase2_Overview.md** - Products, Suppliers, Bins context
- **Phase2_API_Reference.md** - Master data endpoints
- **Phase2_Database_Schema.md** - Foundation tables (products, suppliers, bins)

---

## What's Next: Phase 4 Preview

Phase 4 will add **reporting, automation, and notifications**:

### Planned Features

1. **Advanced Reports**
   - Inventory turnover analysis
   - FEFO compliance metrics
   - Expiry waste tracking
   - Movement frequency reports

2. **Celery Background Tasks**
   - Scheduled daily expiry checks
   - Automatic email notifications
   - Batch report generation

3. **Hungarian Email Templates**
   - Expiry alert emails to warehouse managers
   - Daily inventory summary
   - FEFO violation alerts

4. **Additional Operations**
   - Stock reservations for orders
   - Bin-to-bin transfers
   - Batch splitting
   - Quality holds/quarantine

### Phase 4 Timeline

- **Start**: After Phase 3 testing complete (48 tests passing)
- **Duration**: ~2 weeks
- **Dependencies**: Celery, Redis (Valkey), email server config

---

## RBAC Summary

| Operation | admin | manager | warehouse | viewer |
|-----------|-------|---------|-----------|--------|
| Receive Goods | ✓ | ✓ | ✓ | - |
| Issue (FEFO) | ✓ | ✓ | ✓ | - |
| Issue (Force) | ✓ | ✓ | - | - |
| View Stock | ✓ | ✓ | ✓ | ✓ |
| View Movements | ✓ | ✓ | ✓ | ✓ |
| Expiry Warnings | ✓ | ✓ | ✓ | ✓ |
| Stock Reports | ✓ | ✓ | ✓ | ✓ |
| Adjust/Scrap | ✓ | ✓ | - | - |

---

## Hungarian Localization

All user-facing messages in Phase 3 are in Hungarian:

- **Success**: "Termék sikeresen beérkeztetve", "Termék sikeresen kiadva"
- **Errors**: "FEFO szabály megsértése!", "Nincs elegendő mennyiség"
- **Warnings**: "KRITIKUS! Lejárat közel", "Figyelem: lejárat 15 nap múlva"
- **Actions**: "Selejtezés szükséges" (scrap required)

See `app/core/i18n.py` for complete message dictionary (24 new Hungarian messages).

---

## Performance Characteristics

### FEFO Recommendation Query

```sql
-- O(n log n) where n = bins with product
SELECT * FROM bin_contents
WHERE product_id = ? AND status = 'available' AND quantity > 0
ORDER BY use_by_date ASC, batch_number ASC, received_date ASC
```

**Optimized by index**: `idx_bin_contents_product_status (product_id, status, use_by_date)`

### Movement History Query

```sql
-- O(log n) with index on created_at
SELECT * FROM bin_movements
WHERE bin_content_id = ?
ORDER BY created_at DESC
LIMIT 50 OFFSET ?
```

**Optimized by index**: `idx_movements_bin_content (bin_content_id, created_at)`

---

## Key Constraints

### Business Rules

1. **One Bin = One Product** (multiple batches allowed)
2. **FEFO Enforcement** (strict for warehouse users, manager override allowed)
3. **Expiry Dates Mandatory** (for food products)
4. **Movement Immutability** (audit trail never modified)
5. **Quantity Positive** (no negative stock)

### Data Integrity

- **Foreign Keys**: RESTRICT on products/suppliers (prevent orphan inventory)
- **Check Constraints**: quantity > 0, valid status enum, valid date ranges
- **Indexes**: Optimized for FEFO queries and audit trail lookups
- **Transactions**: All inventory operations use database transactions (ACID compliant)

---

## Quick Start

### 1. Apply Migration

```bash
cd w7-WHv1/backend
alembic upgrade head
```

### 2. Seed Test Data (Optional)

```bash
python -m app.db.seed  # Creates sample products, bins, initial inventory
```

### 3. Receive Goods

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/receive" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_id": "uuid",
    "product_id": "uuid",
    "batch_number": "BATCH-2025-001",
    "use_by_date": "2025-12-31",
    "quantity": 100.0,
    "unit": "kg"
  }'
```

### 4. Get FEFO Recommendation

```bash
curl "http://localhost:8000/api/v1/inventory/fefo-recommendation?product_id=uuid&quantity=50" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Issue Goods

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_content_id": "uuid",
    "quantity": 50.0,
    "reason": "sales_order"
  }'
```

---

## Support and Feedback

- **Documentation**: See `Docs/Phase3_*.md` for detailed guides
- **API Reference**: `Docs/Phase3_API_Reference.md` for all endpoints
- **Testing**: `Docs/Phase3_Testing_Guide.md` for test patterns
- **Issues**: Report bugs to project maintainers
- **Questions**: Refer to `CLAUDE.md` for development guidelines

---

**Phase 3 represents a major milestone**: The WMS now supports complete **FEFO-compliant inventory management** with full traceability, expiry warnings, and regulatory compliance for food warehouses. All 12 new endpoints are production-ready with comprehensive test coverage (48 tests, ~87% coverage).
