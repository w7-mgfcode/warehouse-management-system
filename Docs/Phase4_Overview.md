# WMS Phase 4: Overview

**Version**: 4.0
**Last Updated**: December 2025

## What's New in Phase 4

Phase 4 extends the Warehouse Management System with **advanced inventory operations and automation**. Building on Phase 3's FEFO-compliant inventory management, Phase 4 adds stock reservations, warehouse transfers, background job scheduling, and automated email alerts for expiring products.

### New Capabilities

1. **Stock Reservations** - Reserve inventory for customer orders with automatic FEFO allocation
2. **Same-Warehouse Transfers** - Move stock between bins within the same warehouse
3. **Cross-Warehouse Transfers** - Transfer stock between warehouses with tracking workflow
4. **Background Jobs** - Celery-based scheduled tasks for automated maintenance
5. **Email Alerts** - Hungarian email notifications for critical expiry warnings
6. **Job Monitoring** - Track and manually trigger background tasks

### Key Business Value

- **Order Management**: Reserve stock for pending orders, ensuring availability
- **Warehouse Flexibility**: Move stock between bins and warehouses as needed
- **Automation**: Scheduled cleanup of expired reservations and expiry checks
- **Proactive Alerts**: Email notifications before products expire
- **Operational Visibility**: Monitor background job execution and results

---

## Quick Reference

### New API Endpoints: 18

| Resource | Endpoints | Key Features |
|----------|-----------|--------------|
| Transfers | 8 | Same-warehouse, cross-warehouse, dispatch, confirm, cancel |
| Reservations | 6 | FEFO-ordered allocation, fulfill, cancel, expiring list |
| Jobs | 4 | Trigger jobs, check status, view execution history |

### New Database Tables: 4 (+1 Modified)

| Table | Description | Key Features |
|-------|-------------|--------------|
| `stock_reservations` | Pending order reservations | FEFO allocation, expiry tracking, status workflow |
| `reservation_items` | Links reservations to bins | Quantity tracking per bin_content |
| `warehouse_transfers` | Cross-warehouse movements | Status workflow, transport tracking |
| `job_executions` | Background job logs | Duration, results (JSON), error tracking |
| `bin_contents` (modified) | Added `reserved_quantity` | Tracks reserved vs available stock |

### Test Coverage: 48 Tests for Phase 3 API (140 Total)

| Resource | Tests | Coverage Areas |
|----------|-------|----------------|
| Inventory | 16 | Receipt, issue, FEFO recommendations, expiry validation |
| FEFO | 12 | Multi-level sort, recommendations, compliance checking |
| Movements | 12 | History tracking, filtering, immutability |
| Expiry | 8 | Critical/high thresholds, expired products |
| **Phase 3 Tests** | **48** | **~87% coverage** |
| **Cumulative** | **140** | **92 tests (Phase 1+2) + 48 tests (Phase 3)** |

---

## Phase Comparison: 1 → 2 → 3 → 4

| Aspect | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|--------|---------|---------|---------|---------|-------|
| **Resources** | Users, Warehouses | +Products, Suppliers, Bins | +Inventory, Movements | +Transfers, Reservations, Jobs | **10 resources** |
| **API Endpoints** | 12 | +15 | +12 | +18 | **57 endpoints** |
| **Database Tables** | 2 | +3 | +2 | +4 | **11 tables** |
| **Test Suite** | 40 tests | +48 tests | +48 tests | +4 tests | **140 tests** |
| **Key Features** | Auth, RBAC | Master data, Bulk gen | FEFO, Audit trail | **Reservations, Transfers, Jobs** | **Enterprise WMS** |

---

## Key Features in Detail

### 1. Stock Reservations

**Reserve inventory for customer orders following FEFO order**:

- **FEFO Allocation**: Automatically reserves from oldest expiry dates first
- **Partial Reservations**: If insufficient stock, reserves available amount
- **Expiry Tracking**: Reservations auto-expire after `reserved_until` datetime
- **Fulfillment**: Convert reservation to actual issue with movement records
- **Cancellation**: Release reserved quantities back to available stock

**Reservation Workflow**:
```
Create Reservation → [active]
    ↓
    ├─── Fulfill Reservation → [fulfilled] → Issue Movements Created
    ├─── Cancel Reservation → [cancelled] → Stock Released
    └─── Time Expires → [expired] → Stock Released (via scheduled job)
```

**RBAC**:
- Warehouse+ can create and fulfill reservations
- Manager+ can cancel reservations

**Example Use Case**:
```
Customer order for 150kg of chicken breast (Csirkemell filé)
1. System reserves from oldest expiry:
   - Bin A-01-02-03: 100kg (expires 2025-03-15)
   - Bin A-02-01-01: 50kg (expires 2025-04-20)
2. Reservation created with 24h hold
3. Order confirmed → Fulfill reservation
4. Issue movements created, stock decremented
```

---

### 2. Same-Warehouse Transfers

**Move stock between bins within the same warehouse**:

- **Immediate Execution**: Source decremented, target incremented in single transaction
- **Movement Audit**: Creates paired transfer_out/transfer_in movements
- **Batch Preservation**: Maintains batch number, expiry dates, supplier info
- **Target Validation**: Ensures target bin is empty or has same product

**RBAC**: Warehouse+ can transfer within warehouse

**Example**:
```bash
# Transfer 50kg from bin A-01-01-01 to bin A-02-02-02
POST /api/v1/transfers
{
  "source_bin_content_id": "uuid",
  "target_bin_id": "uuid",
  "quantity": 50.0
}
```

---

### 3. Cross-Warehouse Transfers

**Transfer stock between warehouses with confirmation workflow**:

**Status Workflow**:
```
Create Transfer → [pending]
    ↓
Dispatch → [in_transit]
    ↓
    ├─── Confirm Receipt → [received] → Stock Added to Target
    └─── Cancel → [cancelled] → Stock Returned to Source
```

- **Pending**: Stock reserved at source, awaiting dispatch
- **In Transit**: Goods dispatched, transport reference assigned
- **Received**: Confirmed at target warehouse with quantity verification
- **Cancelled**: Transfer aborted, stock returned to source

**RBAC**:
- Manager+ can create cross-warehouse transfers
- Warehouse+ can dispatch and confirm receipt
- Manager+ can cancel transfers

**Example**:
```bash
# Create cross-warehouse transfer
POST /api/v1/transfers/cross-warehouse
{
  "source_bin_content_id": "uuid",
  "target_warehouse_id": "uuid",
  "quantity": 100.0,
  "transport_reference": "TRUCK-2025-001"
}
```

---

### 4. Background Jobs (Celery)

**Scheduled tasks for automated maintenance**:

| Job Name | Schedule | Purpose |
|----------|----------|---------|
| `cleanup_expired_reservations` | Hourly | Release expired reservation holds |
| `check_expiry_warnings` | Daily | Scan for products approaching expiry |
| `send_expiry_alerts` | Daily | Email notifications for critical items |

**Job Execution Logging**:
- Start/finish timestamps
- Duration tracking
- Result data (JSON)
- Error messages for failures

**Manual Triggering**: Admin users can manually trigger jobs via API

---

### 5. Email Alerts

**Hungarian email notifications for expiring products**:

- **HTML + Plain Text**: Dual-format emails for compatibility
- **Urgency Grouping**: Critical (<7 days) and High (7-14 days) sections
- **Product Details**: Name, SKU, batch, bin, warehouse, quantity, expiry date
- **Configurable Recipients**: Comma-separated email list in settings

**Email Subject Example**:
```
[WMS] Lejárat Figyelmeztetés - 3 kritikus, 8 magas
```

**Email Content** (Hungarian):
- KRITIKUS - Azonnali beavatkozás szükséges!
- MAGAS PRIORITÁS - Figyelem szükséges

---

### 6. Job Monitoring

**Track background job execution**:

- **Execution History**: Paginated list of all job runs
- **Status Tracking**: running, completed, failed
- **Result Details**: JSON data returned by job
- **Error Messages**: Captured for failed executions
- **Duration**: Seconds elapsed for each run

---

## Migration Path

### Prerequisites

- Phase 3 complete (Inventory operations, FEFO, Movements functional)
- 140 tests passing from Phase 1 + 2 + 3
- PostgreSQL 17.7+ with asyncpg driver
- Python 3.13+ with SQLAlchemy 2.0.45+
- Celery 5.4+ with Redis/Valkey backend

### Database Migration

```bash
# Apply Phase 4 migration
alembic upgrade head

# Migration creates:
# - stock_reservations table
# - reservation_items table
# - warehouse_transfers table
# - job_executions table
# - Adds reserved_quantity to bin_contents
```

### New Dependencies

Add to `requirements.txt`:
```
celery>=5.4.0
valkey>=6.0.0
aiosmtplib>=3.0.0
```

### Environment Variables

Add to `.env`:
```bash
# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email (SMTP)
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=wms@example.com
SMTP_FROM_NAME=WMS - Raktárkezelő Rendszer
SMTP_TLS=true
EMAIL_ENABLED=false

# Expiry alerts
EXPIRY_WARNING_DAYS=14
EXPIRY_CRITICAL_DAYS=7
ALERT_RECIPIENT_EMAILS=manager@example.com,warehouse@example.com
```

### Breaking Changes

**None** - Phase 4 is additive only. Existing Phase 1/2/3 functionality unchanged.

### Rollback Plan

```bash
# Rollback migration if needed
alembic downgrade -1

# Note: Reservation and transfer data will be lost
```

---

## RBAC Summary

### Transfer Operations

| Operation | admin | manager | warehouse | viewer |
|-----------|-------|---------|-----------|--------|
| Same-warehouse transfer | ✓ | ✓ | ✓ | - |
| Create cross-warehouse | ✓ | ✓ | - | - |
| Dispatch transfer | ✓ | ✓ | ✓ | - |
| Confirm transfer | ✓ | ✓ | ✓ | - |
| Cancel transfer | ✓ | ✓ | - | - |
| View transfers | ✓ | ✓ | ✓ | ✓ |

### Reservation Operations

| Operation | admin | manager | warehouse | viewer |
|-----------|-------|---------|-----------|--------|
| Create reservation | ✓ | ✓ | ✓ | - |
| Fulfill reservation | ✓ | ✓ | ✓ | - |
| Cancel reservation | ✓ | ✓ | - | - |
| View reservations | ✓ | ✓ | ✓ | ✓ |

### Job Operations

| Operation | admin | manager | warehouse | viewer |
|-----------|-------|---------|-----------|--------|
| Trigger job manually | ✓ | - | - | - |
| View job status | ✓ | ✓ | - | - |
| View job history | ✓ | ✓ | - | - |

---

## Hungarian Localization

All user-facing messages in Phase 4 are in Hungarian:

### Transfer Messages
- "Átmozgatás sikeresen végrehajtva." (Transfer successful)
- "Raktárközi átmozgatás létrehozva." (Cross-warehouse transfer created)
- "A lefoglalt készlet nem mozgatható." (Reserved stock cannot be transferred)

### Reservation Messages
- "Foglalás sikeresen létrehozva." (Reservation created successfully)
- "Részleges foglalás - nem áll rendelkezésre elegendő készlet." (Partial reservation)
- "Foglalás teljesítve." (Reservation fulfilled)

### Job Messages
- "Feladat sikeresen elindítva." (Job triggered successfully)
- "Feladat sikeresen befejezve." (Job completed successfully)

See `app/core/i18n.py` for complete message dictionaries:
- `HU_TRANSFER_MESSAGES` (16 messages)
- `HU_RESERVATION_MESSAGES` (10 messages)
- `HU_JOB_MESSAGES` (6 messages)

---

## Performance Characteristics

### Reservation FEFO Query

```sql
-- O(n log n) where n = bins with available product
SELECT * FROM bin_contents
WHERE product_id = ?
  AND status = 'available'
  AND quantity > reserved_quantity
  AND use_by_date >= CURRENT_DATE
ORDER BY use_by_date ASC, batch_number ASC, received_date ASC
```

**Optimized by index**: `idx_bin_contents_product_status`

### Transfer Query

```sql
-- O(log n) with index on status
SELECT * FROM warehouse_transfers
WHERE status = 'pending' AND target_warehouse_id = ?
ORDER BY created_at DESC
```

**Optimized by index**: `ix_warehouse_transfers_target`

---

## Documentation Structure

Phase 4 documentation consists of 4 comprehensive files:

1. **Phase4_Overview.md** (this file) - Quick reference and business context
2. **Phase4_API_Reference.md** - Complete API documentation for 18 endpoints
3. **Phase4_Database_Schema.md** - 4 new tables, modified bin_contents, ERD
4. **Phase4_Testing_Guide.md** - Test patterns, fixtures, integration tests

### Related Documentation

Still relevant for Phase 4:

- **Phase1_Authentication.md** - JWT and RBAC (applies to new endpoints)
- **Phase3_FEFO_Compliance.md** - FEFO algorithm (used by reservations)
- **Phase3_Movement_Audit.md** - Movement tracking (transfers create movements)

---

## Quick Start

### 1. Apply Migration

```bash
cd w7-WHv1/backend
alembic upgrade head
```

### 2. Start Celery Worker (for background jobs)

```bash
celery -A app.tasks worker --loglevel=info
```

### 3. Start Celery Beat (for scheduled tasks)

```bash
celery -A app.tasks beat --loglevel=info
```

### 4. Create a Reservation

```bash
curl -X POST "http://localhost:8000/api/v1/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "uuid",
    "quantity": 100.0,
    "order_reference": "ORD-2025-001",
    "customer_name": "Customer Kft.",
    "reserved_until": "2025-12-22T18:00:00+01:00"
  }'
```

### 5. Transfer Stock Between Bins

```bash
curl -X POST "http://localhost:8000/api/v1/transfers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_bin_content_id": "uuid",
    "target_bin_id": "uuid",
    "quantity": 50.0
  }'
```

### 6. Manually Trigger Expiry Check

```bash
curl -X POST "http://localhost:8000/api/v1/jobs/trigger" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"job_name": "check_expiry_warnings"}'
```

---

## Support and Feedback

- **Documentation**: See `Docs/Phase4_*.md` for detailed guides
- **API Reference**: `Docs/Phase4_API_Reference.md` for all endpoints
- **Testing**: `Docs/Phase4_Testing_Guide.md` for test patterns
- **Issues**: Report bugs to project maintainers
- **Questions**: Refer to `CLAUDE.md` for development guidelines

---

**Phase 4 completes the enterprise feature set**: The WMS now supports **stock reservations, warehouse transfers, automated background jobs, and email alerts**. Combined with Phase 3's FEFO compliance and audit trail, the system is fully equipped for production food warehouse operations.
