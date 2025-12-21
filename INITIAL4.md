# INITIAL4 — WMS Phase 4: Bin Transfers, Stock Reservations & Scheduled Jobs

This document defines Phase 4 implementation requirements, building on Phase 3 (Inventory Receipt/Issue, FEFO Logic, Movement Audit Trail).

**Last Updated**: December 2025
**Prerequisite**: Phase 3 API implemented (inventory operations, FEFO algorithm, 12 endpoints)
**Current Tests**: 92 passing (Phase 1: ~32, Phase 2: ~60)

## CRITICAL: Phase 3 Test Gap

**Phase 3 API endpoints are implemented but NOT tested.** Before proceeding with Phase 4, the following tests MUST be created:

### Missing Phase 3 Tests (Target: ~48 tests)

**test_inventory.py** (~20 tests):
- `test_receive_goods_success` - Receive product into empty bin
- `test_receive_goods_same_product` - Add batch to bin with same product
- `test_receive_goods_different_product_reject` - Reject adding different product
- `test_receive_goods_inactive_bin_reject` - Reject receiving into inactive bin
- `test_receive_goods_past_expiry_reject` - Reject past use_by_date
- `test_receive_goods_warehouse_user` - RBAC check
- `test_receive_goods_viewer_forbidden` - RBAC restriction
- `test_issue_goods_fefo_compliant` - Issue oldest batch first
- `test_issue_goods_fefo_violation_warehouse_reject` - Warehouse user can't override FEFO
- `test_issue_goods_fefo_override_manager` - Manager can force non-FEFO
- `test_issue_goods_insufficient_quantity` - Reject over-issue
- `test_issue_goods_expired_reject` - Reject issuing expired stock
- `test_adjust_stock_manager` - Manager can adjust
- `test_adjust_stock_warehouse_forbidden` - Warehouse user can't adjust
- `test_scrap_stock_manager` - Manager can scrap
- `test_scrap_stock_warehouse_forbidden` - Warehouse user can't scrap
- `test_fefo_recommendation_single_batch` - Simple FEFO recommendation
- `test_fefo_recommendation_multi_batch` - Multiple batches sorted by expiry
- `test_stock_levels_aggregation` - Correct quantity aggregation
- `test_stock_levels_filter_warehouse` - Filter by warehouse

**test_fefo.py** (~8 tests):
- `test_fefo_sort_by_use_by_date` - Primary sort by expiry
- `test_fefo_sort_by_batch_number` - Secondary sort when same expiry
- `test_fefo_sort_by_received_date` - Tertiary sort when same batch
- `test_fefo_excludes_expired` - Don't recommend expired items
- `test_fefo_excludes_scrapped` - Don't recommend scrapped items
- `test_fefo_partial_quantity` - Recommend across multiple bins
- `test_fefo_exact_quantity` - Recommend exact match
- `test_fefo_insufficient_stock` - Handle insufficient total stock

**test_movements.py** (~10 tests):
- `test_list_movements_success` - List all movements
- `test_list_movements_filter_product` - Filter by product
- `test_list_movements_filter_bin` - Filter by bin
- `test_list_movements_filter_type` - Filter by movement type
- `test_list_movements_filter_date_range` - Filter by date range
- `test_list_movements_filter_user` - Filter by created_by
- `test_list_movements_pagination` - Pagination works
- `test_get_movement_by_id` - Get single movement
- `test_get_movement_not_found` - 404 for invalid ID
- `test_movements_immutable` - No update/delete endpoints

**test_expiry.py** (~10 tests):
- `test_expiry_warnings_critical` - Items <7 days flagged critical
- `test_expiry_warnings_high` - Items 7-14 days flagged high
- `test_expiry_warnings_medium` - Items 15-30 days flagged medium
- `test_expiry_warnings_summary` - Summary counts correct
- `test_expiry_warnings_filter_warehouse` - Filter by warehouse
- `test_expiry_warnings_threshold` - Custom days_threshold works
- `test_expired_products_list` - List already expired items
- `test_expired_products_filter_warehouse` - Filter by warehouse
- `test_expired_products_days_since` - Correct days_since_expiry
- `test_expired_products_action_required` - Action message present

### Phase 3 Endpoints to Test

| Router | Endpoint | Method | Tests Needed |
|--------|----------|--------|--------------|
| inventory | `/receive` | POST | 7 |
| inventory | `/issue` | POST | 5 |
| inventory | `/fefo-recommendation` | GET | 2 |
| inventory | `/stock-levels` | GET | 2 |
| inventory | `/expiry-warnings` | GET | 4 |
| inventory | `/expired` | GET | 3 |
| inventory | `/adjust` | POST | 2 |
| inventory | `/scrap` | POST | 2 |
| movements | `/` | GET | 7 |
| movements | `/{id}` | GET | 2 |
| reports | `/inventory-summary` | GET | 1 |
| reports | `/product-locations` | GET | 1 |

**Total: 12 endpoints, ~48 tests needed**

---

## FEATURE

### Phase 4 Scope

1. **Bin Transfers** - Move inventory between bins within same warehouse
2. **Cross-Warehouse Transfers** - Move inventory between different warehouses
3. **Stock Reservations** - Reserve inventory for pending orders
4. **Reservation Expiry** - Auto-release expired reservations
5. **Scheduled Jobs** - Celery + Valkey for automation (expiry checks, cleanup, alerts)
6. **Email Alerts** - Hungarian email notifications for expiry warnings

### Key Constraints

- All user-facing messages in **Hungarian**
- Transfers must maintain **FEFO integrity** and **audit trail**
- Reservations block FEFO algorithm from selecting reserved stock
- Scheduled jobs use **Celery + Valkey 8.1** (open-source Redis alternative)
- Email alerts require **SMTP configuration**
- All movements recorded in **immutable audit trail**

## EXAMPLES

### Bin Transfer API

```bash
# Transfer within same warehouse
POST /api/v1/transfers
{
  "source_bin_content_id": "uuid",
  "target_bin_id": "uuid",
  "quantity": 50.0,
  "reason": "reorganization",
  "notes": "Sor átrendezés miatt"
}

# Response:
{
  "success": true,
  "transfer_id": "uuid",
  "movement_ids": ["uuid-source", "uuid-target"],
  "source_bin": {
    "code": "A-01-02-03",
    "remaining_quantity": 50.0
  },
  "target_bin": {
    "code": "A-02-01-01",
    "new_quantity": 50.0
  },
  "message": "Áthelyezés sikeresen végrehajtva"
}

# Transfer to different warehouse (cross-warehouse)
POST /api/v1/transfers/cross-warehouse
{
  "source_bin_content_id": "uuid",
  "target_warehouse_id": "uuid",
  "target_bin_id": "uuid",
  "quantity": 30.0,
  "reason": "warehouse_balance",
  "transport_reference": "TR-2025-001",
  "notes": "Készletegyensúlyozás"
}

# Response:
{
  "success": true,
  "transfer_id": "uuid",
  "source_warehouse": "Budapest Central",
  "target_warehouse": "Debrecen East",
  "quantity_transferred": 30.0,
  "transport_reference": "TR-2025-001",
  "message": "Raktárközi áthelyezés sikeresen végrehajtva"
}

# Get pending cross-warehouse transfers
GET /api/v1/transfers/pending?warehouse_id=uuid

# Confirm receipt of cross-warehouse transfer
POST /api/v1/transfers/{transfer_id}/confirm
{
  "received_quantity": 30.0,
  "condition": "good",
  "notes": "Rendben megérkezett"
}
```

### Stock Reservation API

```bash
# Create reservation for order
POST /api/v1/reservations
{
  "product_id": "uuid",
  "quantity": 100.0,
  "order_reference": "SO-2025-001",
  "customer_name": "Béke Étterem Kft.",
  "reserved_until": "2025-02-15T23:59:59+01:00",
  "notes": "Vevői rendelés előjegyzés"
}

# Response:
{
  "success": true,
  "reservation_id": "uuid",
  "reserved_items": [
    {
      "bin_content_id": "uuid",
      "bin_code": "A-01-02-03",
      "batch_number": "BATCH-2025-001",
      "quantity_reserved": 50.0,
      "use_by_date": "2025-03-15"
    },
    {
      "bin_content_id": "uuid",
      "bin_code": "A-02-01-01",
      "batch_number": "BATCH-2025-002",
      "quantity_reserved": 50.0,
      "use_by_date": "2025-04-30"
    }
  ],
  "total_reserved": 100.0,
  "expires_at": "2025-02-15T23:59:59+01:00",
  "message": "Foglalás sikeresen létrehozva"
}

# List active reservations
GET /api/v1/reservations?status=active&product_id=uuid

# Response:
{
  "items": [
    {
      "id": "uuid",
      "product_name": "Csirkemell filé",
      "quantity_reserved": 100.0,
      "order_reference": "SO-2025-001",
      "customer_name": "Béke Étterem Kft.",
      "reserved_until": "2025-02-15T23:59:59+01:00",
      "created_at": "2025-02-01T10:30:00+01:00",
      "created_by": "warehouse_user",
      "status": "active"
    }
  ],
  "total": 1
}

# Fulfill reservation (convert to issue)
POST /api/v1/reservations/{reservation_id}/fulfill
{
  "notes": "Kiszállítva"
}

# Response:
{
  "success": true,
  "movements": [
    {
      "movement_id": "uuid",
      "bin_code": "A-01-02-03",
      "quantity_issued": 50.0
    },
    {
      "movement_id": "uuid",
      "bin_code": "A-02-01-01",
      "quantity_issued": 50.0
    }
  ],
  "order_reference": "SO-2025-001",
  "message": "Foglalás teljesítve, készlet kiadva"
}

# Cancel reservation
DELETE /api/v1/reservations/{reservation_id}
{
  "reason": "customer_cancelled",
  "notes": "Vevő lemondta a rendelést"
}

# Response:
{
  "success": true,
  "released_quantity": 100.0,
  "message": "Foglalás törölve, készlet felszabadítva"
}
```

### Scheduled Jobs Configuration

```bash
# Check scheduled job status
GET /api/v1/jobs/status

# Response:
{
  "jobs": [
    {
      "name": "expiry_check",
      "schedule": "0 6 * * *",
      "description": "Lejárati dátum ellenőrzés és email riasztás",
      "last_run": "2025-02-01T06:00:02+01:00",
      "next_run": "2025-02-02T06:00:00+01:00",
      "status": "success",
      "last_result": {
        "critical_items": 5,
        "high_items": 12,
        "emails_sent": 3
      }
    },
    {
      "name": "reservation_cleanup",
      "schedule": "0 * * * *",
      "description": "Lejárt foglalások felszabadítása",
      "last_run": "2025-02-01T15:00:01+01:00",
      "next_run": "2025-02-01T16:00:00+01:00",
      "status": "success",
      "last_result": {
        "expired_reservations": 2,
        "released_quantity": 75.0
      }
    },
    {
      "name": "consistency_check",
      "schedule": "0 2 * * *",
      "description": "Adatkonzisztencia ellenőrzés",
      "last_run": "2025-02-01T02:00:03+01:00",
      "next_run": "2025-02-02T02:00:00+01:00",
      "status": "success",
      "last_result": {
        "bins_checked": 600,
        "issues_found": 0
      }
    }
  ]
}

# Manually trigger a job (admin only)
POST /api/v1/jobs/{job_name}/run

# Get job history
GET /api/v1/jobs/{job_name}/history?limit=10
```

### Email Alert Examples

```bash
# Expiry alert email (Hungarian)
{
  "subject": "WMS Lejárati Figyelmeztetés - 2025. 02. 01.",
  "recipients": ["warehouse@company.hu", "manager@company.hu"],
  "body": {
    "summary": {
      "kritikus": 5,
      "magas": 12,
      "közepes": 25
    },
    "critical_items": [
      {
        "termék": "Csirkemell filé",
        "sarzsszám": "BATCH-2025-001",
        "tárolóhely": "A-01-02-03",
        "mennyiség": "50 kg",
        "lejárat": "2025. 02. 05.",
        "hátralevő_napok": 4
      }
    ]
  }
}
```

## DOCUMENTATION

### New Models to Create

**StockReservation** (`stock_reservations` table):
- `id` UUID PK
- `product_id` UUID FK → products.id (RESTRICT)
- `order_reference` VARCHAR(100) NOT NULL
- `customer_name` VARCHAR(255) NULL
- `total_quantity` DECIMAL(10,2) NOT NULL
- `reserved_until` TIMESTAMP WITH TZ NOT NULL
- `status` VARCHAR(20) CHECK IN ('active', 'fulfilled', 'cancelled', 'expired')
- `fulfilled_at` TIMESTAMP WITH TZ NULL
- `cancelled_at` TIMESTAMP WITH TZ NULL
- `cancellation_reason` VARCHAR(50) NULL
- `notes` TEXT NULL
- `created_by` UUID FK → users.id
- `created_at`, `updated_at` TIMESTAMP WITH TZ

**ReservationItem** (`reservation_items` table):
- `id` UUID PK
- `reservation_id` UUID FK → stock_reservations.id (CASCADE)
- `bin_content_id` UUID FK → bin_contents.id (RESTRICT)
- `quantity` DECIMAL(10,2) NOT NULL
- `created_at` TIMESTAMP WITH TZ

**WarehouseTransfer** (`warehouse_transfers` table):
- `id` UUID PK
- `source_warehouse_id` UUID FK → warehouses.id (RESTRICT)
- `target_warehouse_id` UUID FK → warehouses.id (RESTRICT)
- `source_bin_content_id` UUID FK → bin_contents.id (RESTRICT)
- `target_bin_id` UUID FK → bins.id (RESTRICT) NULL (until confirmed)
- `target_bin_content_id` UUID FK → bin_contents.id NULL (after confirmed)
- `product_id` UUID FK → products.id (RESTRICT)
- `batch_number` VARCHAR(100) NOT NULL
- `quantity` DECIMAL(10,2) NOT NULL
- `use_by_date` DATE NOT NULL
- `transport_reference` VARCHAR(100) NULL
- `status` VARCHAR(20) CHECK IN ('pending', 'in_transit', 'received', 'cancelled')
- `shipped_at` TIMESTAMP WITH TZ NULL
- `received_at` TIMESTAMP WITH TZ NULL
- `received_quantity` DECIMAL(10,2) NULL
- `condition_notes` TEXT NULL
- `notes` TEXT NULL
- `created_by` UUID FK → users.id
- `received_by` UUID FK → users.id NULL
- `created_at`, `updated_at` TIMESTAMP WITH TZ

**JobExecution** (`job_executions` table) - Job history tracking:
- `id` UUID PK
- `job_name` VARCHAR(50) NOT NULL
- `started_at` TIMESTAMP WITH TZ NOT NULL
- `finished_at` TIMESTAMP WITH TZ NULL
- `status` VARCHAR(20) CHECK IN ('running', 'success', 'failed')
- `result` JSON NULL
- `error_message` TEXT NULL

### Model Updates

**BinContent** - Add reservation tracking:
```python
# Existing status values: 'available', 'reserved', 'expired', 'scrapped'
# Add computed property for available vs reserved quantities
reserved_quantity: Mapped[Decimal | None] = mapped_column(
    Numeric(10, 2),
    default=Decimal("0"),
    nullable=False,
    comment="Quantity currently reserved"
)
```

**Indexes**:
- `stock_reservations(status, reserved_until)` - Expiry cleanup
- `stock_reservations(product_id, status)` - Product reservations
- `reservation_items(reservation_id)` - Reservation lookup
- `reservation_items(bin_content_id)` - Content reservations
- `warehouse_transfers(status, source_warehouse_id)` - Pending transfers
- `job_executions(job_name, started_at DESC)` - Job history

### Existing Code References

- `app/db/models/bin_content.py` - BinContent with status field (Phase 3)
- `app/db/models/bin_movement.py` - Movement audit trail (Phase 3)
- `app/services/inventory.py` - Receipt/issue operations (Phase 3)
- `app/services/fefo.py` - FEFO algorithm to update (Phase 3)
- `app/api/v1/inventory.py` - Inventory endpoints (Phase 3)
- `Docs/Phase3_API_Reference.md` - API conventions

### Hungarian Messages to Add (`app/core/i18n.py`)

```python
# Transfers
"transfer_successful": "Áthelyezés sikeresen végrehajtva.",
"transfer_not_found": "Az áthelyezés nem található.",
"transfer_insufficient_quantity": "Nincs elegendő mennyiség az áthelyezéshez.",
"transfer_same_bin": "A forrás és cél tárolóhely nem lehet ugyanaz.",
"transfer_different_product": "A cél tárolóhely másik terméket tartalmaz.",
"transfer_bin_inactive": "A cél tárolóhely inaktív.",
"cross_warehouse_pending": "Raktárközi áthelyezés várakozik megerősítésre.",
"cross_warehouse_confirmed": "Raktárközi áthelyezés megerősítve.",
"cross_warehouse_cancelled": "Raktárközi áthelyezés törölve.",

# Reservations
"reservation_created": "Foglalás sikeresen létrehozva.",
"reservation_not_found": "A foglalás nem található.",
"reservation_insufficient_stock": "Nincs elegendő szabad készlet a foglaláshoz.",
"reservation_expired": "A foglalás lejárt.",
"reservation_already_fulfilled": "A foglalás már teljesítve.",
"reservation_cancelled": "Foglalás törölve, készlet felszabadítva.",
"reservation_fulfilled": "Foglalás teljesítve, készlet kiadva.",
"reservation_partial": "Részleges foglalás: {reserved}/{requested} {unit}.",
"stock_reserved": "A készlet foglalt, nem adható ki.",

# Scheduled Jobs
"job_started": "Feladat elindítva.",
"job_completed": "Feladat befejezve.",
"job_failed": "Feladat sikertelen: {error}.",
"job_not_found": "A feladat nem található.",
"job_already_running": "A feladat már fut.",

# Email Alerts
"email_expiry_subject": "WMS Lejárati Figyelmeztetés - {date}",
"email_expiry_critical": "KRITIKUS: {count} tétel lejár 7 napon belül!",
"email_expiry_high": "Figyelem: {count} tétel lejár 14 napon belül.",
"email_sent": "Email sikeresen elküldve.",
"email_failed": "Email küldése sikertelen: {error}.",
```

## OTHER CONSIDERATIONS

### Transfer Logic

**Same-Warehouse Transfer**:
1. Validate source bin_content exists with sufficient quantity
2. Validate target bin is empty OR contains same product
3. If target has same product, add to existing bin_content
4. If target is empty, create new bin_content (copy metadata)
5. Reduce source quantity (or delete if zero)
6. Create two movement records (issue from source, receipt to target)
7. Update bin statuses (empty/occupied)

**Cross-Warehouse Transfer**:
1. Source warehouse creates transfer record (status='pending')
2. Create issue movement from source bin (status='in_transit')
3. Target warehouse receives and confirms
4. Create receipt movement to target bin
5. Update transfer status to 'received'

**Transfer Movement Types**:
```python
# movement_type = 'transfer'
# Recorded as linked pair:
{
  "source_movement": {
    "movement_type": "transfer",
    "quantity": -50.0,  # Negative
    "reason": "transfer_out",
    "reference_number": "TRF-2025-001"
  },
  "target_movement": {
    "movement_type": "transfer",
    "quantity": 50.0,  # Positive
    "reason": "transfer_in",
    "reference_number": "TRF-2025-001"
  }
}
```

### Reservation Logic

**FEFO Integration**:
- Reserved stock is **excluded** from FEFO recommendations
- Available quantity = total quantity - reserved quantity
- Reservation follows FEFO: oldest expiry items reserved first
- Partial reservations allowed when insufficient stock

**Reservation Lifecycle**:
```
Created (active) → Fulfilled (issue movements created)
                 → Cancelled (stock released)
                 → Expired (auto-cancelled by job)
```

**Reservation Allocation Algorithm**:
1. Get all bin_contents for product, sorted by FEFO
2. Filter out expired, scrapped items
3. Calculate available = quantity - reserved_quantity
4. Allocate from oldest expiry until request satisfied
5. Create reservation_items for each allocation
6. Update bin_content.reserved_quantity

### Scheduled Jobs Architecture

**Celery + Valkey Setup**:
```python
# app/tasks/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "wms",
    broker=settings.VALKEY_URL.replace("valkey://", "redis://"),
    backend=settings.VALKEY_URL.replace("valkey://", "redis://"),
)

celery_app.conf.update(
    timezone="Europe/Budapest",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
)
```

**Scheduled Tasks**:

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `expiry_check` | Daily 06:00 | Check expiring products, send email alerts |
| `reservation_cleanup` | Hourly | Release expired reservations |
| `consistency_check` | Daily 02:00 | Verify bin statuses match contents |
| `backup_reminder` | Daily 01:00 | Log backup status (actual backup external) |

**Celery Beat Schedule**:
```python
# app/tasks/schedule.py
celery_app.conf.beat_schedule = {
    "expiry-check-daily": {
        "task": "app.tasks.expiry.check_expiring_products",
        "schedule": crontab(hour=6, minute=0),
    },
    "reservation-cleanup-hourly": {
        "task": "app.tasks.reservation.cleanup_expired",
        "schedule": crontab(minute=0),
    },
    "consistency-check-daily": {
        "task": "app.tasks.consistency.check_bin_status",
        "schedule": crontab(hour=2, minute=0),
    },
}
```

### Email Configuration

**SMTP Settings** (`.env`):
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=wms-alerts@company.hu
SMTP_PASSWORD=your-app-password
SMTP_FROM=WMS Raktárkezelő <wms@company.hu>
SMTP_TLS=true

# Alert recipients (comma-separated)
ALERT_RECIPIENTS=warehouse@company.hu,manager@company.hu
```

**Email Service**:
```python
# app/services/email.py
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib

async def send_expiry_alert(
    recipients: list[str],
    critical_items: list[dict],
    high_items: list[dict],
    medium_items: list[dict],
) -> bool:
    """Send Hungarian expiry warning email."""
    ...
```

### RBAC Requirements

| Endpoint | admin | manager | warehouse | viewer |
|----------|-------|---------|-----------|--------|
| Transfer (same warehouse) | ✓ | ✓ | ✓ | - |
| Transfer (cross-warehouse) | ✓ | ✓ | - | - |
| Confirm cross-warehouse | ✓ | ✓ | ✓ | - |
| Create reservation | ✓ | ✓ | ✓ | - |
| Fulfill reservation | ✓ | ✓ | ✓ | - |
| Cancel reservation | ✓ | ✓ | - | - |
| View reservations | ✓ | ✓ | ✓ | ✓ |
| View job status | ✓ | ✓ | ✓ | ✓ |
| Trigger job manually | ✓ | - | - | - |
| Configure jobs | ✓ | - | - | - |

### Validation Rules

**Transfers**:
- `source_bin_content_id` must exist with sufficient available (non-reserved) quantity
- `target_bin_id` must exist, be active, and either empty or contain same product
- `quantity` must be > 0 and ≤ available quantity
- Cross-warehouse: warehouses must be different
- Cannot transfer reserved stock

**Reservations**:
- `product_id` must exist and be active
- `quantity` must be > 0
- `reserved_until` must be future datetime
- Sufficient available (non-reserved) stock must exist
- Cannot reserve expired stock

**Scheduled Jobs**:
- Only admin can manually trigger jobs
- Jobs are idempotent (safe to re-run)
- Job executions logged for audit

### Test Coverage Requirements

**Transfers**:
- Transfer full quantity from bin (source becomes empty)
- Transfer partial quantity (source reduced)
- Transfer to empty bin (creates new bin_content)
- Transfer to bin with same product (quantity added)
- Reject transfer to bin with different product
- Reject transfer of reserved stock
- Cross-warehouse transfer with confirmation flow
- Cancel pending cross-warehouse transfer

**Reservations**:
- Create reservation (single bin allocation)
- Create reservation (multi-bin allocation with FEFO)
- Fulfill reservation (creates issue movements)
- Cancel reservation (releases stock)
- Expired reservation cleanup
- Reject reservation exceeding available stock
- FEFO excludes reserved stock

**Scheduled Jobs**:
- Expiry check identifies critical/high/medium items
- Reservation cleanup releases expired reservations
- Consistency check detects bin status mismatches
- Job execution history recorded

**Email Alerts**:
- Expiry alert email sent correctly
- Email with Hungarian content
- Failed email logged (not exception)

### Files to Create

```text
app/
├── db/models/
│   ├── stock_reservation.py   # StockReservation model
│   ├── reservation_item.py    # ReservationItem model
│   ├── warehouse_transfer.py  # WarehouseTransfer model
│   └── job_execution.py       # JobExecution model
├── schemas/
│   ├── transfer.py            # TransferCreate, TransferResponse
│   ├── reservation.py         # ReservationCreate, ReservationResponse
│   └── job.py                 # JobStatus, JobHistory
├── services/
│   ├── transfer.py            # Transfer logic
│   ├── reservation.py         # Reservation logic
│   ├── email.py               # Email sending
│   └── job.py                 # Job management
├── api/v1/
│   ├── transfers.py           # Transfer endpoints
│   ├── reservations.py        # Reservation endpoints
│   └── jobs.py                # Job status endpoints
├── tasks/
│   ├── celery_app.py          # Celery configuration
│   ├── schedule.py            # Beat schedule
│   ├── expiry.py              # Expiry check task
│   ├── reservation.py         # Reservation cleanup task
│   └── consistency.py         # Consistency check task
└── tests/
    ├── test_transfers.py
    ├── test_reservations.py
    ├── test_jobs.py
    └── test_email.py
```

### API Endpoints Summary

**Transfers** (`/api/v1/transfers`):
- `POST /` - Transfer within same warehouse (warehouse+)
- `POST /cross-warehouse` - Cross-warehouse transfer (manager+)
- `GET /` - List transfers with filters
- `GET /{id}` - Get transfer details
- `GET /pending` - Pending cross-warehouse transfers
- `POST /{id}/confirm` - Confirm receipt of cross-warehouse (warehouse+)
- `POST /{id}/cancel` - Cancel pending transfer (manager+)

**Reservations** (`/api/v1/reservations`):
- `POST /` - Create reservation (warehouse+)
- `GET /` - List reservations with filters
- `GET /{id}` - Get reservation details
- `POST /{id}/fulfill` - Fulfill reservation (warehouse+)
- `DELETE /{id}` - Cancel reservation (manager+)
- `GET /expiring` - Reservations expiring soon

**Jobs** (`/api/v1/jobs`):
- `GET /status` - All jobs status
- `GET /{job_name}/history` - Job execution history
- `POST /{job_name}/run` - Manually trigger job (admin only)

### Docker Compose Updates

```yaml
# Add to docker-compose.yml
services:
  celery-worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: wms_celery_worker
    command: celery -A app.tasks.celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql+asyncpg://wms_user:${DB_PASSWORD:-wms_password}@db:5432/wms
      VALKEY_URL: valkey://valkey:6379
      # SMTP settings
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_FROM: ${SMTP_FROM}
    depends_on:
      - db
      - valkey
    networks:
      - wms_network

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: wms_celery_beat
    command: celery -A app.tasks.celery_app beat --loglevel=info
    environment:
      VALKEY_URL: valkey://valkey:6379
    depends_on:
      - valkey
    networks:
      - wms_network
```

### Migration Strategy

**Phase 4 Migrations**:
1. Add `reserved_quantity` column to `bin_contents`
2. Create `stock_reservations` table
3. Create `reservation_items` table
4. Create `warehouse_transfers` table
5. Create `job_executions` table
6. Add indexes for performance

```bash
# Generate migration
alembic revision --autogenerate -m "phase4_transfers_reservations_jobs"

# Apply migration
alembic upgrade head
```

### Performance Considerations

**Reservation Queries**:
- Index on `bin_contents(product_id, status, use_by_date)` - FEFO with reservation filter
- Compute `available_quantity` in query: `quantity - reserved_quantity`

**Transfer Tracking**:
- Index on `warehouse_transfers(status, created_at)` - Pending transfers
- Use database transaction for atomic transfer operations

**Job Execution**:
- Celery tasks are async, don't block API
- Job results cached in Valkey for quick status checks
- Execution history purged after 30 days

### Future Enhancements (Phase 5+)

- **Barcode Integration** - Scan bins/products for transfers
- **Mobile App** - Handheld device for warehouse operations
- **Pick Lists** - Generate optimized picking routes
- **Quality Holds** - Quarantine inventory pending inspection
- **Temperature Logging** - IoT integration for cold chain
- **API Webhooks** - Notify external systems of inventory changes
- **Dashboard Analytics** - KPIs, charts, trend analysis
