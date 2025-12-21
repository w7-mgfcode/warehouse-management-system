# WMS Phase 1: Database Schema

**Version**: 1.0
**Last Updated**: December 2025

## Overview

The WMS database uses PostgreSQL 17 with SQLAlchemy 2.0.45 async ORM. All models use timezone-aware timestamps (Europe/Budapest) and UUID primary keys for global uniqueness.

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│   (auth/rbac)   │
└─────────────────┘

┌─────────────────┐       1:N       ┌─────────────────┐
│   warehouses    │ ───────────────▶│      bins       │
│ (storage sites) │                 │ (locations)     │
└─────────────────┘                 └────────┬────────┘
                                             │
                                             │ 1:1
                                             ▼
┌─────────────────┐       N:1       ┌─────────────────┐
│    products     │ ◀───────────────│  bin_contents   │
│ (item catalog)  │                 │ (current stock) │
└─────────────────┘                 └────────┬────────┘
        ▲                                    │
        │ N:1                                │ N:1
        │                                    ▼
┌───────┴─────────┐                 ┌─────────────────┐
│   bin_history   │                 │    suppliers    │
│ (audit trail)   │ ───────────────▶│ (vendors)       │
└─────────────────┘       N:1       └─────────────────┘
```

## Database Portability

### Custom GUID Type

A custom `GUID` TypeDecorator enables database portability:

```python
class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))
```

**Purpose**: Uses native PostgreSQL UUID in production while allowing SQLite String(36) for testing.

---

## Tables

### 1. users

Stores user accounts for authentication and RBAC.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `username` | VARCHAR(100) | UNIQUE, NOT NULL | Login username |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email address |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| `full_name` | VARCHAR(255) | NULL | Display name |
| `role` | VARCHAR(50) | NOT NULL, DEFAULT 'warehouse' | User role |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Account status |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Check Constraints**:
- `check_user_role`: `role IN ('admin', 'manager', 'warehouse', 'viewer')`

**Indexes**:
- Primary key on `id`
- Unique index on `username`
- Unique index on `email`

---

### 2. warehouses

Physical storage locations containing bins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Warehouse name |
| `location` | VARCHAR(255) | NULL | Physical address |
| `description` | TEXT | NULL | Additional details |
| `bin_structure_template` | JSON | NOT NULL | Bin naming configuration |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Relationships**:
- `bins`: One-to-many with `bins` table (cascade delete)

**Bin Structure Template Schema**:
```json
{
  "fields": [
    {"name": "aisle", "label": "Sor", "required": true, "order": 1},
    {"name": "rack", "label": "Allvany", "required": true, "order": 2},
    {"name": "level", "label": "Szint", "required": true, "order": 3},
    {"name": "position", "label": "Pozicio", "required": true, "order": 4}
  ],
  "code_format": "{aisle}-{rack}-{level}-{position}",
  "separator": "-",
  "auto_uppercase": true,
  "zero_padding": true
}
```

---

### 3. bins

Individual storage locations (pallet positions) within warehouses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `warehouse_id` | UUID | FK → warehouses.id, NOT NULL | Parent warehouse |
| `code` | VARCHAR(100) | UNIQUE, NOT NULL | Human-readable location code |
| `structure_data` | JSON | NOT NULL | Parsed bin location data |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'empty' | Current status |
| `max_weight` | FLOAT | NULL | Weight capacity (kg) |
| `max_height` | FLOAT | NULL | Height limit (cm) |
| `accessibility` | VARCHAR(50) | NULL | Access notes |
| `notes` | TEXT | NULL | Additional notes |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Check Constraints**:
- `check_bin_status`: `status IN ('empty', 'occupied', 'reserved', 'inactive')`

**Foreign Keys**:
- `warehouse_id` → `warehouses.id` (ON DELETE CASCADE)

**Relationships**:
- `warehouse`: Many-to-one with `warehouses`
- `content`: One-to-one with `bin_contents` (cascade delete)

**Status Values (Hungarian)**:
| Value | Hungarian | Description |
|-------|-----------|-------------|
| `empty` | Ures | No content |
| `occupied` | Foglalt | Has product |
| `reserved` | Fenntartott | Reserved for incoming |
| `inactive` | Inaktiv | Temporarily unavailable |

---

### 4. products

Product catalog for items stored in the warehouse.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `sku` | VARCHAR(100) | UNIQUE, NULL | Stock keeping unit |
| `category` | VARCHAR(100) | NULL | Product category |
| `default_unit` | VARCHAR(50) | NOT NULL, DEFAULT 'db' | Unit of measure |
| `description` | TEXT | NULL | Product description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Notes**:
- `default_unit` uses Hungarian abbreviations (db = darab/pieces, kg, l, etc.)

---

### 5. suppliers

Vendor/supplier information for traceability.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `company_name` | VARCHAR(255) | NOT NULL | Supplier company name |
| `contact_person` | VARCHAR(255) | NULL | Primary contact |
| `email` | VARCHAR(255) | NULL | Contact email |
| `phone` | VARCHAR(50) | NULL | Phone number |
| `address` | TEXT | NULL | Full address |
| `tax_number` | VARCHAR(50) | NULL | Tax identification |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

---

### 6. bin_contents

Current inventory stored in bins. **One bin = one product** at a time.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `bin_id` | UUID | FK, UNIQUE, NOT NULL | Parent bin |
| `product_id` | UUID | FK, NOT NULL | Product stored |
| `supplier_id` | UUID | FK, NULL | Product supplier |
| `pallet_count` | INTEGER | NOT NULL, DEFAULT 1 | Number of pallets |
| `net_weight` | FLOAT | NOT NULL | Net weight (kg) |
| `gross_weight` | FLOAT | NULL | Gross weight (kg) |
| `delivery_date` | DATE | NOT NULL | Receipt date |
| `best_before_date` | DATE | NULL | Best before date |
| `freeze_date` | DATE | NULL | Freeze date (if frozen) |
| `use_by_date` | DATE | NOT NULL | **FEFO key date** |
| `cmr_number` | VARCHAR(100) | NULL | CMR document number |
| `notes` | TEXT | NULL | Additional notes |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Check Constraints**:
- `check_use_by_after_best_before`: `use_by_date >= best_before_date OR best_before_date IS NULL`
- `check_positive_net_weight`: `net_weight > 0`
- `check_positive_pallet_count`: `pallet_count > 0`

**Foreign Keys**:
- `bin_id` → `bins.id` (ON DELETE CASCADE, UNIQUE)
- `product_id` → `products.id` (ON DELETE RESTRICT)
- `supplier_id` → `suppliers.id` (ON DELETE SET NULL)

**FEFO Implementation**:
The `use_by_date` field is the primary sorting key for First Expired, First Out logic. When picking products, the system recommends bins with the earliest `use_by_date`.

---

### 7. bin_history

Archived records of removed inventory for audit and reporting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `bin_id` | UUID | NOT NULL | Original bin ID |
| `bin_code` | VARCHAR(100) | NOT NULL | Original bin code (denormalized) |
| `warehouse_id` | UUID | NOT NULL | Original warehouse ID |
| `product_id` | UUID | FK, NULL | Product (may be deleted) |
| `supplier_id` | UUID | FK, NULL | Supplier (may be deleted) |
| `pallet_count` | INTEGER | NOT NULL | Pallets removed |
| `net_weight` | FLOAT | NOT NULL | Net weight removed |
| `gross_weight` | FLOAT | NULL | Gross weight removed |
| `delivery_date` | DATE | NOT NULL | Original delivery date |
| `best_before_date` | DATE | NULL | Original best before |
| `freeze_date` | DATE | NULL | Original freeze date |
| `use_by_date` | DATE | NOT NULL | Original use by date |
| `cmr_number` | VARCHAR(100) | NULL | Original CMR number |
| `notes` | TEXT | NULL | Original content notes |
| `removal_reason` | VARCHAR(50) | NOT NULL | Why removed |
| `removal_notes` | TEXT | NULL | Removal details |
| `removed_by` | UUID | NULL | User who removed |
| `received_at` | TIMESTAMP WITH TZ | NOT NULL | Original receipt time |
| `removed_at` | TIMESTAMP WITH TZ | NOT NULL | Removal timestamp |

**Foreign Keys**:
- `product_id` → `products.id` (ON DELETE SET NULL)
- `supplier_id` → `suppliers.id` (ON DELETE SET NULL)

**Removal Reasons (Hungarian)**:
| Value | Hungarian | Description |
|-------|-----------|-------------|
| `shipped` | Kiszallitva | Shipped to customer |
| `internal_use` | Belso hasznalat | Used internally |
| `damaged` | Serult | Damaged goods |
| `expired` | Lejart | Past use_by_date |
| `returned` | Visszavetel | Returned to supplier |
| `adjustment` | Korrekció | Inventory adjustment |

**Note**: `bin_id`, `bin_code`, and `warehouse_id` are denormalized to preserve history even if the original bin is deleted.

---

## Migrations

Alembic handles database migrations with async support.

### Configuration (`alembic/env.py`)

```python
from app.db.base import Base
from app.db.models import *  # Import all models

target_metadata = Base.metadata
```

### Common Commands

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# Show current revision
alembic current
```

---

## SQLAlchemy Patterns

### Async Session Usage

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def get_user_by_id(session: AsyncSession, user_id: UUID) -> User | None:
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()
```

### Relationship Loading

```python
from sqlalchemy.orm import selectinload

# Eager load bins with warehouse
result = await session.execute(
    select(Warehouse)
    .where(Warehouse.id == warehouse_id)
    .options(selectinload(Warehouse.bins))
)
```

### Session Factory

```python
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Required for async patterns
)
```

---

## Performance Considerations

### Indexes (Future Phase)

Consider adding indexes for:
- `bins.warehouse_id` - Frequent warehouse-scoped queries
- `bin_contents.use_by_date` - FEFO sorting
- `bin_contents.product_id` - Product inventory lookups
- `bin_history.removed_at` - Audit queries

### Connection Pool Settings

```python
create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Verify connections
    pool_size=10,            # Connection pool size
    max_overflow=20,         # Additional connections
)
```

---

## Seed Data

Initial data for development/testing:

```python
# Default admin user
User(
    username="admin",
    email="admin@wms.local",
    password_hash=hash("Admin123!"),
    full_name="System Administrator",
    role="admin",
    is_active=True,
)

# Sample warehouse
Warehouse(
    name="Foraktar",
    location="Budapest, Logisztikai Park",
    bin_structure_template={...},
    is_active=True,
)
```
