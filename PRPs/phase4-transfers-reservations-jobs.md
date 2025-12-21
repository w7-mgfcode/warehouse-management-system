# PRP: Phase 4 - Bin Transfers, Stock Reservations & Scheduled Jobs

**Version**: 1.0
**Created**: 2025-12-21
**Feature File**: INITIAL4.md
**Estimated Complexity**: High (6 phases, ~150 tests total when complete)

---

## Goal

Implement Phase 4 of the WMS system including:
1. **Phase 3 Test Gap** - Create 48 missing tests for existing Phase 3 API endpoints
2. **Bin Transfers** - Move inventory between bins (same warehouse + cross-warehouse)
3. **Stock Reservations** - Reserve inventory for orders with FEFO integration
4. **Scheduled Jobs** - Celery + Valkey automation for expiry checks and cleanup
5. **Email Alerts** - Hungarian email notifications for expiry warnings

## Why

- **Phase 3 tests** ensure existing inventory operations are validated before building on them
- **Bin transfers** enable warehouse reorganization and cross-facility stock balancing
- **Reservations** prevent overselling by blocking stock for pending orders
- **Scheduled jobs** automate daily expiry checks and reservation cleanup
- **Email alerts** notify staff of critical expiry situations (food safety compliance)

## What

### Success Criteria
- [ ] Phase 3: 48 new tests pass (total 140 tests)
- [ ] Phase 4: All new models created with migration applied
- [ ] Transfers: Same-warehouse and cross-warehouse transfers functional
- [ ] Reservations: Create, fulfill, cancel, auto-expire functional
- [ ] FEFO: Excludes reserved stock from recommendations
- [ ] Jobs: Celery worker and beat scheduler configured
- [ ] Email: Sends Hungarian expiry alerts via SMTP
- [ ] All linting passes: `ruff check . && ruff format --check .`
- [ ] Type checking advisory: `mypy .` (warnings acceptable)

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Codebase patterns
- file: w7-WHv1/backend/app/services/inventory.py
  why: Service pattern - async functions, db session, select(), HU_MESSAGES errors

- file: w7-WHv1/backend/app/schemas/inventory.py
  why: Pydantic v2 pattern - ConfigDict, field_validator, Field constraints

- file: w7-WHv1/backend/app/tests/test_bins.py
  why: Test pattern - pytest classes, fixtures from conftest, auth_header

- file: w7-WHv1/backend/app/tests/conftest.py
  why: Test fixtures - admin_user, warehouse_user, viewer_user, sample_bin, etc.

- file: w7-WHv1/backend/app/api/deps.py
  why: RBAC pattern - RequireAdmin, RequireManager, RequireWarehouse, RequireViewer

- file: w7-WHv1/backend/app/services/fefo.py
  why: FEFO algorithm - sort by use_by_date, batch_number, received_date

- file: w7-WHv1/backend/app/db/models/bin_content.py
  why: SQLAlchemy 2.0 model pattern - Mapped, mapped_column, GUID type

- file: w7-WHv1/backend/app/core/i18n.py
  why: Hungarian messages - HU_MESSAGES dict, HU_ERRORS dict

- file: INITIAL4.md
  why: Complete feature specification with API examples and validation rules

# External Documentation
- url: https://docs.celeryq.dev/en/stable/getting-started/first-steps-with-celery.html
  why: Celery setup, task definition, broker configuration

- url: https://aiosmtplib.readthedocs.io/en/latest/usage.html
  why: Async email sending with TLS/STARTTLS

- url: https://testdriven.io/blog/fastapi-and-celery/
  why: FastAPI + Celery integration patterns

- url: https://docs.pydantic.dev/latest/concepts/validators/
  why: Pydantic v2 field_validator syntax
```

### Current Codebase Tree

```bash
w7-WHv1/backend/app/
├── api/
│   ├── v1/
│   │   ├── auth.py, bins.py, inventory.py, movements.py
│   │   ├── products.py, reports.py, suppliers.py, users.py, warehouses.py
│   │   └── router.py           # Add: transfers.py, reservations.py, jobs.py
│   └── deps.py                 # RBAC dependencies
├── core/
│   ├── config.py, i18n.py, security.py
├── db/
│   ├── models/
│   │   ├── bin.py, bin_content.py, bin_movement.py
│   │   ├── product.py, supplier.py, user.py, warehouse.py
│   │   └── __init__.py         # Add: stock_reservation.py, reservation_item.py,
│   │                           #      warehouse_transfer.py, job_execution.py
│   ├── base.py, session.py, seed.py
├── schemas/
│   ├── auth.py, bin.py, expiry.py, inventory.py, movement.py
│   ├── product.py, supplier.py, user.py, warehouse.py
│   └── __init__.py             # Add: transfer.py, reservation.py, job.py
├── services/
│   ├── auth.py, bin.py, expiry.py, fefo.py, inventory.py
│   ├── movement.py, pagination.py, product.py, supplier.py
│   ├── user.py, warehouse.py
│   └── __init__.py             # Add: transfer.py, reservation.py, email.py, job.py
├── tasks/                      # NEW - Celery tasks
│   ├── __init__.py
│   ├── celery_app.py           # Celery configuration
│   ├── expiry.py               # Daily expiry check task
│   ├── reservation.py          # Hourly reservation cleanup task
│   └── consistency.py          # Daily consistency check task
└── tests/
    ├── conftest.py, test_auth.py, test_bins.py, test_products.py
    ├── test_suppliers.py, test_users.py, test_warehouses.py
    └── __init__.py             # Add: test_inventory.py, test_fefo.py,
                                #      test_movements.py, test_expiry.py,
                                #      test_transfers.py, test_reservations.py,
                                #      test_jobs.py, test_email.py
```

### Known Gotchas & Library Quirks

```python
# CRITICAL: Pydantic v2 syntax (NOT v1!)
# ❌ WRONG:
class OldModel(BaseModel):
    class Config:
        orm_mode = True
    @validator("name")
    def validate_name(cls, v): ...

# ✅ CORRECT:
class NewModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str: ...

# CRITICAL: SQLAlchemy 2.0 async syntax (NOT 1.x!)
# ❌ WRONG: session.query(User).filter(User.id == id).first()
# ✅ CORRECT: result = await session.execute(select(User).where(User.id == id))
#            user = result.scalar_one_or_none()

# CRITICAL: Timezone-aware datetime
# ❌ WRONG: datetime.utcnow()
# ✅ CORRECT: datetime.now(UTC) or datetime.now(timezone.utc)

# CRITICAL: GUID type for SQLite/PostgreSQL compatibility
# Use: from app.db.base import GUID
# In model: id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)

# CRITICAL: Hungarian messages required for ALL user-facing text
# Use: from app.core.i18n import HU_MESSAGES
# Raise: ValueError(HU_MESSAGES["error_key"])

# CRITICAL: Celery uses Redis URL format even for Valkey
# broker = settings.VALKEY_URL.replace("valkey://", "redis://")

# GOTCHA: Celery tasks are synchronous - use asyncio.run() for async code
# @celery_app.task
# def my_task():
#     asyncio.run(async_function())

# GOTCHA: Tests use SQLite in-memory, migrations use PostgreSQL
# GUID type handles this automatically

# GOTCHA: BinContent.quantity can be 0 after issue (don't delete, update status)
```

---

## Implementation Blueprint

### Phase A: Phase 3 Test Gap (48 tests)

Create tests for existing Phase 3 API endpoints. Reference test patterns from `test_bins.py`.

**Files to create:**
- `app/tests/test_inventory.py` (~20 tests)
- `app/tests/test_fefo.py` (~8 tests)
- `app/tests/test_movements.py` (~10 tests)
- `app/tests/test_expiry.py` (~10 tests)

**Test fixtures needed in conftest.py:**
```python
@pytest.fixture
async def sample_bin_content(
    db_session: AsyncSession,
    sample_bin: Bin,
    sample_product: Product,
    sample_supplier: Supplier,
) -> BinContent:
    """Create sample bin content for inventory tests."""
    from datetime import date, timedelta
    from decimal import Decimal
    from app.db.models.bin_content import BinContent

    bin_content = BinContent(
        id=uuid.uuid4(),
        bin_id=sample_bin.id,
        product_id=sample_product.id,
        supplier_id=sample_supplier.id,
        batch_number="BATCH-TEST-001",
        use_by_date=date.today() + timedelta(days=30),
        quantity=Decimal("100.0"),
        unit="kg",
        status="available",
        received_date=datetime.now(UTC),
    )
    db_session.add(bin_content)
    await db_session.flush()
    await db_session.refresh(bin_content)
    return bin_content
```

### Phase B: Phase 4 Database Models

**Files to create:**
- `app/db/models/stock_reservation.py`
- `app/db/models/reservation_item.py`
- `app/db/models/warehouse_transfer.py`
- `app/db/models/job_execution.py`

**Model updates:**
- `app/db/models/bin_content.py` - Add `reserved_quantity` column

**StockReservation model pattern:**
```python
"""Stock reservation model."""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, GUID

if TYPE_CHECKING:
    from app.db.models.product import Product
    from app.db.models.user import User


class StockReservation(Base):
    """Stock reservation for pending orders."""

    __tablename__ = "stock_reservations"

    id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    order_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    reserved_until: Mapped[datetime] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="active", nullable=False
    )  # active, fulfilled, cancelled, expired
    fulfilled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    product: Mapped["Product"] = relationship(back_populates="reservations")
    created_by_user: Mapped["User"] = relationship(foreign_keys=[created_by])
    items: Mapped[list["ReservationItem"]] = relationship(
        back_populates="reservation", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_stock_reservations_status_until", "status", "reserved_until"),
        Index("ix_stock_reservations_product_status", "product_id", "status"),
    )
```

### Phase C: Transfers Service & API

**Files to create:**
- `app/schemas/transfer.py`
- `app/services/transfer.py`
- `app/api/v1/transfers.py`
- `app/tests/test_transfers.py`

**Transfer service pseudocode:**
```python
async def transfer_within_warehouse(
    db: AsyncSession,
    transfer_data: TransferCreate,
    user_id: UUID,
) -> TransferResponse:
    """
    Transfer stock from one bin to another within same warehouse.

    Steps:
    1. Validate source bin_content exists with sufficient AVAILABLE quantity
       (quantity - reserved_quantity >= transfer_data.quantity)
    2. Validate target bin is active and either:
       - Empty (status='empty')
       - Contains same product (add to existing bin_content)
    3. If target has different product, reject
    4. Reduce source quantity (or delete bin_content if zero)
    5. Create/update target bin_content
    6. Create TWO movement records:
       - Source: movement_type='transfer', quantity=-X, reason='transfer_out'
       - Target: movement_type='transfer', quantity=+X, reason='transfer_in'
    7. Update bin statuses (empty/occupied)
    8. Return transfer response with movement IDs
    """
    # CRITICAL: Cannot transfer reserved stock
    available = source_bin_content.quantity - source_bin_content.reserved_quantity
    if transfer_data.quantity > available:
        raise ValueError(HU_MESSAGES["transfer_insufficient_quantity"])

    # ... implementation
```

### Phase D: Reservations Service & API

**Files to create:**
- `app/schemas/reservation.py`
- `app/services/reservation.py`
- `app/api/v1/reservations.py`
- `app/tests/test_reservations.py`

**FEFO integration - update `app/services/fefo.py`:**
```python
async def get_fefo_recommendation(
    db: AsyncSession,
    product_id: UUID,
    quantity: Decimal,
    exclude_reserved: bool = True,  # NEW parameter
) -> FEFORecommendationResponse:
    """
    Get FEFO-compliant picking recommendation.

    CRITICAL: When exclude_reserved=True (default), calculate:
    available_quantity = bin_content.quantity - bin_content.reserved_quantity
    Only include bins where available_quantity > 0
    """
    # ... update query to consider reserved_quantity
```

**Reservation service pseudocode:**
```python
async def create_reservation(
    db: AsyncSession,
    reservation_data: ReservationCreate,
    user_id: UUID,
) -> ReservationResponse:
    """
    Create reservation following FEFO order.

    Steps:
    1. Validate product exists and is active
    2. Get all bin_contents for product, FEFO sorted
    3. Filter: status='available', not expired, available > 0
    4. Calculate available = quantity - reserved_quantity for each
    5. Allocate from oldest expiry until request satisfied
    6. Create StockReservation record
    7. Create ReservationItem for each allocation
    8. Update bin_content.reserved_quantity for each
    9. Return reservation with allocated items
    """
    # CRITICAL: Partial reservations allowed
    # If insufficient stock, reserve what's available and return warning
```

### Phase E: Celery Infrastructure

**Files to create:**
- `app/tasks/__init__.py`
- `app/tasks/celery_app.py`
- `app/tasks/expiry.py`
- `app/tasks/reservation.py`
- `app/tasks/consistency.py`
- `app/schemas/job.py`
- `app/services/job.py`
- `app/api/v1/jobs.py`
- `app/tests/test_jobs.py`

**Celery configuration:**
```python
# app/tasks/celery_app.py
from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

# CRITICAL: Valkey uses Redis protocol
broker_url = settings.VALKEY_URL.replace("valkey://", "redis://")
backend_url = settings.VALKEY_URL.replace("valkey://", "redis://")

celery_app = Celery(
    "wms",
    broker=broker_url,
    backend=backend_url,
    include=[
        "app.tasks.expiry",
        "app.tasks.reservation",
        "app.tasks.consistency",
    ],
)

celery_app.conf.update(
    timezone="Europe/Budapest",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_soft_time_limit=300,  # 5 minutes
    broker_connection_retry_on_startup=True,
)

# Beat schedule
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

**Task pattern (synchronous with async DB):**
```python
# app/tasks/expiry.py
import asyncio
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.db.session import async_session_factory
from app.services.expiry import get_expiry_warnings
from app.services.email import send_expiry_alert
from app.services.job import log_job_execution


@celery_app.task(bind=True, max_retries=3)
def check_expiring_products(self):
    """
    Daily task to check expiring products and send alerts.

    CRITICAL: Celery tasks are synchronous - use asyncio.run()
    """
    return asyncio.run(_check_expiring_products_async())


async def _check_expiring_products_async():
    """Async implementation of expiry check."""
    async with async_session_factory() as db:
        try:
            # Log job start
            job_id = await log_job_execution(db, "expiry_check", "running")

            # Get expiry warnings
            warnings = await get_expiry_warnings(db, days_threshold=30)

            # Send email if critical items exist
            if warnings.summary.critical > 0:
                await send_expiry_alert(
                    critical_items=warnings.critical,
                    high_items=warnings.high,
                    medium_items=warnings.medium,
                )

            # Log job success
            await log_job_execution(
                db, "expiry_check", "success",
                job_id=job_id,
                result={
                    "critical": warnings.summary.critical,
                    "high": warnings.summary.high,
                    "medium": warnings.summary.medium,
                }
            )

            await db.commit()
            return {"status": "success", "critical": warnings.summary.critical}

        except Exception as e:
            await log_job_execution(db, "expiry_check", "failed", error=str(e))
            await db.commit()
            raise
```

### Phase F: Email Service

**Files to create:**
- `app/services/email.py`
- `app/tests/test_email.py`

**Config additions (`app/core/config.py`):**
```python
# SMTP settings
smtp_host: str = Field(default="localhost")
smtp_port: int = Field(default=587)
smtp_user: str | None = Field(default=None)
smtp_password: str | None = Field(default=None)
smtp_from: str = Field(default="WMS <noreply@localhost>")
smtp_tls: bool = Field(default=True)
alert_recipients: str = Field(default="")  # Comma-separated

@property
def alert_recipients_list(self) -> list[str]:
    """Parse comma-separated alert recipients."""
    if not self.alert_recipients:
        return []
    return [r.strip() for r in self.alert_recipients.split(",") if r.strip()]
```

**Email service pattern:**
```python
# app/services/email.py
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import date

from app.core.config import settings
from app.core.i18n import HU_MESSAGES


async def send_expiry_alert(
    critical_items: list[dict],
    high_items: list[dict],
    medium_items: list[dict],
) -> bool:
    """
    Send Hungarian expiry warning email.

    Returns True if sent successfully, False otherwise.
    Does NOT raise exceptions - logs failures instead.
    """
    if not settings.alert_recipients_list:
        return False

    # Build Hungarian email content
    today = date.today().strftime("%Y. %m. %d.")
    subject = f"WMS Lejárati Figyelmeztetés - {today}"

    body = _build_hungarian_email_body(critical_items, high_items, medium_items)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = ", ".join(settings.alert_recipients_list)
    msg.attach(MIMEText(body, "html", "utf-8"))

    try:
        # aiosmtplib handles STARTTLS automatically for port 587
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=settings.smtp_tls,
        )
        return True
    except Exception as e:
        # Log but don't raise - email failure shouldn't crash the job
        import logging
        logging.error(f"Email send failed: {e}")
        return False


def _build_hungarian_email_body(critical, high, medium) -> str:
    """Build Hungarian HTML email body."""
    return f"""
    <html>
    <body>
    <h2>WMS Lejárati Figyelmeztetés</h2>
    <h3>Összefoglaló</h3>
    <ul>
        <li><strong style="color:red">Kritikus (&lt;7 nap):</strong> {len(critical)} tétel</li>
        <li><strong style="color:orange">Magas (7-14 nap):</strong> {len(high)} tétel</li>
        <li><strong style="color:yellow">Közepes (15-30 nap):</strong> {len(medium)} tétel</li>
    </ul>
    <!-- ... item tables ... -->
    </body>
    </html>
    """
```

---

## Task List

### Phase A: Phase 3 Tests (PREREQUISITE)

```yaml
Task A1:
CREATE app/tests/test_inventory.py:
  - MIRROR pattern from: app/tests/test_bins.py
  - IMPLEMENT 20 tests covering:
    - test_receive_goods_success
    - test_receive_goods_same_product
    - test_receive_goods_different_product_reject
    - test_receive_goods_inactive_bin_reject
    - test_receive_goods_past_expiry_reject
    - test_receive_goods_warehouse_user
    - test_receive_goods_viewer_forbidden
    - test_issue_goods_fefo_compliant
    - test_issue_goods_fefo_violation_warehouse_reject
    - test_issue_goods_fefo_override_manager
    - test_issue_goods_insufficient_quantity
    - test_issue_goods_expired_reject
    - test_adjust_stock_manager
    - test_adjust_stock_warehouse_forbidden
    - test_scrap_stock_manager
    - test_scrap_stock_warehouse_forbidden
    - test_fefo_recommendation_single_batch
    - test_fefo_recommendation_multi_batch
    - test_stock_levels_aggregation
    - test_stock_levels_filter_warehouse

Task A2:
CREATE app/tests/test_fefo.py:
  - IMPLEMENT 8 tests covering FEFO algorithm:
    - test_fefo_sort_by_use_by_date
    - test_fefo_sort_by_batch_number
    - test_fefo_sort_by_received_date
    - test_fefo_excludes_expired
    - test_fefo_excludes_scrapped
    - test_fefo_partial_quantity
    - test_fefo_exact_quantity
    - test_fefo_insufficient_stock

Task A3:
CREATE app/tests/test_movements.py:
  - IMPLEMENT 10 tests covering movement audit trail:
    - test_list_movements_success
    - test_list_movements_filter_product
    - test_list_movements_filter_bin
    - test_list_movements_filter_type
    - test_list_movements_filter_date_range
    - test_list_movements_filter_user
    - test_list_movements_pagination
    - test_get_movement_by_id
    - test_get_movement_not_found
    - test_movements_immutable

Task A4:
CREATE app/tests/test_expiry.py:
  - IMPLEMENT 10 tests covering expiry warnings:
    - test_expiry_warnings_critical
    - test_expiry_warnings_high
    - test_expiry_warnings_medium
    - test_expiry_warnings_summary
    - test_expiry_warnings_filter_warehouse
    - test_expiry_warnings_threshold
    - test_expired_products_list
    - test_expired_products_filter_warehouse
    - test_expired_products_days_since
    - test_expired_products_action_required

Task A5:
MODIFY app/tests/conftest.py:
  - ADD sample_bin_content fixture
  - ADD sample_bin_content_expired fixture
  - ADD sample_movement fixture
  - IMPORT BinContent, BinMovement models
```

### Phase B: Database Models & Migration

```yaml
Task B1:
CREATE app/db/models/stock_reservation.py:
  - MIRROR pattern from: app/db/models/bin_content.py
  - INCLUDE all fields from INITIAL4.md specification
  - ADD indexes for performance

Task B2:
CREATE app/db/models/reservation_item.py:
  - LINK to stock_reservations (CASCADE delete)
  - LINK to bin_contents (RESTRICT delete)

Task B3:
CREATE app/db/models/warehouse_transfer.py:
  - INCLUDE status tracking (pending, in_transit, received, cancelled)
  - LINK to source/target warehouses, bins, bin_contents

Task B4:
CREATE app/db/models/job_execution.py:
  - STORE job_name, started_at, finished_at, status, result JSON, error_message

Task B5:
MODIFY app/db/models/bin_content.py:
  - ADD reserved_quantity column: Numeric(10, 2), default=0

Task B6:
MODIFY app/db/models/__init__.py:
  - IMPORT all new models
  - EXPORT in __all__

Task B7:
RUN migration:
  - cd w7-WHv1/backend
  - source ../../venv_linux/bin/activate
  - alembic revision --autogenerate -m "phase4_transfers_reservations_jobs"
  - alembic upgrade head
```

### Phase C: Transfers

```yaml
Task C1:
CREATE app/schemas/transfer.py:
  - TransferCreate (source_bin_content_id, target_bin_id, quantity, reason, notes)
  - TransferResponse (success, transfer_id, movement_ids, source_bin, target_bin, message)
  - CrossWarehouseTransferCreate (+ target_warehouse_id, transport_reference)
  - CrossWarehouseTransferResponse
  - TransferConfirmRequest (received_quantity, condition, notes)

Task C2:
CREATE app/services/transfer.py:
  - transfer_within_warehouse()
  - transfer_cross_warehouse()
  - confirm_cross_warehouse_transfer()
  - cancel_transfer()
  - get_pending_transfers()

Task C3:
CREATE app/api/v1/transfers.py:
  - POST / - Same warehouse transfer (warehouse+)
  - POST /cross-warehouse - Cross warehouse (manager+)
  - GET / - List transfers
  - GET /{id} - Get transfer details
  - GET /pending - Pending cross-warehouse
  - POST /{id}/confirm - Confirm receipt (warehouse+)
  - POST /{id}/cancel - Cancel transfer (manager+)

Task C4:
MODIFY app/api/v1/router.py:
  - ADD: from app.api.v1.transfers import router as transfers_router
  - ADD: router.include_router(transfers_router)

Task C5:
MODIFY app/core/i18n.py:
  - ADD all transfer-related Hungarian messages from INITIAL4.md

Task C6:
CREATE app/tests/test_transfers.py:
  - ~12 tests covering all transfer scenarios
```

### Phase D: Reservations

```yaml
Task D1:
CREATE app/schemas/reservation.py:
  - ReservationCreate (product_id, quantity, order_reference, customer_name, reserved_until, notes)
  - ReservationResponse (success, reservation_id, reserved_items, total_reserved, expires_at, message)
  - ReservationItem (bin_content_id, bin_code, batch_number, quantity_reserved, use_by_date)
  - ReservationFulfillRequest (notes)
  - ReservationCancelRequest (reason, notes)

Task D2:
CREATE app/services/reservation.py:
  - create_reservation() - FEFO allocation
  - fulfill_reservation() - Create issue movements
  - cancel_reservation() - Release reserved quantities
  - get_reservations() - List with filters
  - cleanup_expired_reservations() - For scheduled job

Task D3:
MODIFY app/services/fefo.py:
  - UPDATE get_fefo_recommendation() to exclude reserved stock
  - ADD exclude_reserved parameter (default True)

Task D4:
CREATE app/api/v1/reservations.py:
  - POST / - Create reservation (warehouse+)
  - GET / - List reservations
  - GET /{id} - Get reservation details
  - POST /{id}/fulfill - Fulfill reservation (warehouse+)
  - DELETE /{id} - Cancel reservation (manager+)
  - GET /expiring - Reservations expiring soon

Task D5:
MODIFY app/api/v1/router.py:
  - ADD reservations_router

Task D6:
MODIFY app/core/i18n.py:
  - ADD all reservation-related Hungarian messages

Task D7:
CREATE app/tests/test_reservations.py:
  - ~12 tests covering all reservation scenarios
```

### Phase E: Celery & Jobs

```yaml
Task E1:
CREATE app/tasks/__init__.py:
  - Empty init file

Task E2:
CREATE app/tasks/celery_app.py:
  - Celery configuration with Valkey broker
  - Beat schedule for all tasks

Task E3:
CREATE app/tasks/expiry.py:
  - check_expiring_products task

Task E4:
CREATE app/tasks/reservation.py:
  - cleanup_expired task

Task E5:
CREATE app/tasks/consistency.py:
  - check_bin_status task

Task E6:
CREATE app/schemas/job.py:
  - JobStatus, JobHistory, JobResult schemas

Task E7:
CREATE app/services/job.py:
  - log_job_execution()
  - get_job_status()
  - get_job_history()
  - trigger_job()

Task E8:
CREATE app/api/v1/jobs.py:
  - GET /status - All jobs status (viewer+)
  - GET /{job_name}/history - Job history (viewer+)
  - POST /{job_name}/run - Trigger job (admin only)

Task E9:
MODIFY app/api/v1/router.py:
  - ADD jobs_router

Task E10:
MODIFY app/core/i18n.py:
  - ADD job-related Hungarian messages

Task E11:
MODIFY app/core/config.py:
  - ADD SMTP settings
  - ADD alert_recipients setting

Task E12:
MODIFY requirements.txt:
  - ADD celery>=5.3.0
  - ADD aiosmtplib>=3.0.0

Task E13:
CREATE app/tests/test_jobs.py:
  - Test job status endpoint
  - Test job history endpoint
  - Test manual trigger (admin only)
```

### Phase F: Email

```yaml
Task F1:
CREATE app/services/email.py:
  - send_expiry_alert() - Async email sending
  - _build_hungarian_email_body() - HTML template

Task F2:
CREATE app/tests/test_email.py:
  - Test email building (mock SMTP)
  - Test Hungarian content
  - Test failure handling (no exception)

Task F3:
MODIFY w7-WHv1/docker-compose.yml:
  - ADD celery-worker service
  - ADD celery-beat service
  - ADD SMTP environment variables
```

---

## Validation Loop

### Level 1: Syntax & Style (Run after EACH file creation)

```bash
cd /home/w7-shellsnake/w7-DEV_X1/w7-WAREHOUSE/w7-WHv1/backend
source ../../venv_linux/bin/activate

# Auto-fix linting issues
ruff check app/ --fix

# Format code
ruff format app/

# Expected: No errors
```

### Level 2: Unit Tests (Run after each Phase)

```bash
# After Phase A (Phase 3 tests)
pytest app/tests/test_inventory.py app/tests/test_fefo.py app/tests/test_movements.py app/tests/test_expiry.py -v
# Expected: 48 new tests pass (140 total)

# After Phase C (Transfers)
pytest app/tests/test_transfers.py -v
# Expected: All transfer tests pass

# After Phase D (Reservations)
pytest app/tests/test_reservations.py -v
# Expected: All reservation tests pass

# After Phase E (Jobs)
pytest app/tests/test_jobs.py -v
# Expected: All job tests pass

# Full test suite
pytest app/tests/ -v
# Expected: All tests pass
```

### Level 3: Type Checking (Advisory)

```bash
mypy app/ --ignore-missing-imports
# Expected: May have some warnings, but no critical errors
```

### Level 4: Migration Check

```bash
# Test migration up/down
alembic upgrade head
alembic downgrade -1
alembic upgrade head
# Expected: No errors
```

### Level 5: Integration Test (Manual)

```bash
# Start services
docker-compose up -d db valkey

# Run backend
uvicorn app.main:app --reload

# Test transfer endpoint
curl -X POST http://localhost:8000/api/v1/transfers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_bin_content_id": "...", "target_bin_id": "...", "quantity": 10.0, "reason": "test"}'

# Expected: 201 Created with transfer response
```

---

## Final Validation Checklist

- [ ] All Phase 3 tests pass (48 tests): `pytest app/tests/test_inventory.py test_fefo.py test_movements.py test_expiry.py -v`
- [ ] All Phase 4 tests pass: `pytest app/tests/test_transfers.py test_reservations.py test_jobs.py test_email.py -v`
- [ ] Full test suite passes: `pytest app/tests/ -v`
- [ ] No linting errors: `ruff check app/`
- [ ] Code formatted: `ruff format --check app/`
- [ ] Migration applies cleanly: `alembic upgrade head`
- [ ] Hungarian messages complete in i18n.py
- [ ] All new routers registered in router.py
- [ ] docker-compose.yml updated with Celery services
- [ ] requirements.txt updated with celery and aiosmtplib

---

## Anti-Patterns to Avoid

- ❌ Don't use Pydantic v1 `@validator` - use `@field_validator` with `@classmethod`
- ❌ Don't use SQLAlchemy 1.x `session.query()` - use `select().where()`
- ❌ Don't use `datetime.utcnow()` - use `datetime.now(UTC)`
- ❌ Don't forget Hungarian messages for user-facing errors
- ❌ Don't transfer reserved stock - check `quantity - reserved_quantity`
- ❌ Don't make Celery tasks async - use `asyncio.run()` wrapper
- ❌ Don't raise exceptions in email service - log and return False
- ❌ Don't skip FEFO order in reservation allocation
- ❌ Don't delete bin_content when quantity=0 - update status instead

---

## Confidence Score: 7/10

**Strengths:**
- Comprehensive codebase patterns documented
- Clear task breakdown with specific files
- Validation gates at each phase
- External documentation URLs provided
- Hungarian message requirements explicit

**Risks:**
- Large scope (6 phases) may require multiple iterations
- Celery + Valkey integration has external dependencies
- Email testing requires SMTP mocking
- Phase 3 test gap must be resolved first

**Recommendation:** Execute phases sequentially with validation between each. If Phase A (tests) reveals bugs in Phase 3 implementation, fix those before proceeding.

---

## Sources

- [FastAPI + Celery Tutorial](https://testdriven.io/blog/fastapi-and-celery/)
- [Celery First Steps](https://docs.celeryq.dev/en/stable/getting-started/first-steps-with-celery.html)
- [aiosmtplib Documentation](https://aiosmtplib.readthedocs.io/en/latest/usage.html)
- [Pydantic v2 Validators](https://docs.pydantic.dev/latest/concepts/validators/)
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
