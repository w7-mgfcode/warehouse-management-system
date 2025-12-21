# WMS Phase 2: Database Schema

**Version**: 2.0
**Last Updated**: December 2025

## Overview

Phase 2 adds 3 new tables to the WMS database: `products`, `suppliers`, and `bins`. These tables enable master data management and storage location tracking, building on the Phase 1 foundation (`users`, `warehouses`).

All tables use PostgreSQL 17 with SQLAlchemy 2.0.45 async ORM, timezone-aware timestamps (Europe/Budapest), and UUID primary keys.

---

## Updated Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│   (Phase 1)     │
│   (auth/rbac)   │
└─────────────────┘


┌─────────────────┐       1:N       ┌─────────────────┐
│   warehouses    │ ───────────────▶│      bins       │
│   (Phase 1)     │                 │  (Phase 2 NEW)  │
│ (storage sites) │                 │   (locations)   │
└─────────────────┘                 └────────┬────────┘
                                             │
                                             │ 1:1 (Phase 3)
                                             ▼
┌─────────────────┐       N:1       ┌─────────────────┐
│    products     │ ◀──────Future───│  bin_contents   │
│  (Phase 2 NEW)  │                 │   (Phase 3)     │
│ (item catalog)  │                 │ (current stock) │
└─────────────────┘                 └────────┬────────┘
        ▲                                    │
        │ N:1 (Phase 3)                      │ N:1 (Phase 3)
        │                                    ▼
┌───────┴─────────┐                 ┌─────────────────┐
│   bin_history   │                 │   suppliers     │
│   (Phase 3)     │ ───────Future──▶│  (Phase 2 NEW)  │
│ (audit trail)   │       N:1       │   (vendors)     │
└─────────────────┘                 └─────────────────┘
```

**Phase 2 Status**:
- **Solid boxes**: Tables exist in Phase 2
- **"Future" arrows**: Relationships will be implemented in Phase 3 (bin_contents, bin_history)
- Currently: products, suppliers, and bins are independent tables
- Phase 3: Will add foreign keys for inventory tracking

---

## New Tables in Phase 2

### 1. products

Product catalog for items that can be stored in warehouse bins.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Product name (Hungarian) |
| `sku` | VARCHAR(100) | UNIQUE, NULL | Stock Keeping Unit for tracking |
| `category` | VARCHAR(100) | NULL | Product category |
| `default_unit` | VARCHAR(50) | NOT NULL, DEFAULT 'db' | Unit of measurement |
| `description` | TEXT | NULL | Product description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status (soft delete) |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Indexes**:
- Primary key on `id`
- Unique index on `sku` (when not null)

**Unique Constraints**:
- `sku` must be unique across all products (enforced at API level and database level)

**Business Rules**:
- `name` is required, minimum 2 characters
- `sku` is optional but must be unique if provided (3-100 characters)
- `default_unit` defaults to "db" (darab/pieces) - Hungarian measurement unit
- Products with `is_active=false` are soft-deleted (hidden from normal operations)

**Phase 3 Relationships** (not yet implemented):
- `bin_contents`: One-to-many (one product can be in multiple bins)
- `bin_history`: One-to-many (audit trail of product movements)

**Example Data**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Tej 2.8%",
  "sku": "MILK-2.8-1L",
  "category": "tejtermékek",
  "default_unit": "db",
  "description": "Friss tej 1 literes kiszerelés",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00+01:00",
  "updated_at": "2025-12-21T10:00:00+01:00"
}
```

**SQLAlchemy Model**:
```python
from app.db.base import GUID, Base

class Product(Base):
    """Product model representing items that can be stored in bins."""

    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    default_unit: Mapped[str] = mapped_column(String(50), default="db", nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
```

---

### 2. suppliers

Supplier/vendor information for product traceability and sourcing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `company_name` | VARCHAR(255) | NOT NULL | Company name (Hungarian) |
| `contact_person` | VARCHAR(255) | NULL | Primary contact name |
| `email` | VARCHAR(255) | NULL | Contact email address |
| `phone` | VARCHAR(50) | NULL | Contact phone number |
| `address` | TEXT | NULL | Full postal address |
| `tax_number` | VARCHAR(50) | NULL | Hungarian tax identification number |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status (soft delete) |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Indexes**:
- Primary key on `id`

**Business Rules**:
- `company_name` is required, minimum 2 characters
- `tax_number` is optional but must match Hungarian format if provided
- `email` must be valid email format if provided
- Suppliers with `is_active=false` are soft-deleted

**Hungarian Tax Number Format**:
- Pattern: `^\d{8}-\d-\d{2}$`
- Structure: 8 digits - 1 digit - 2 digits
- Example: `12345678-2-42`
- Validation enforced at API level (Pydantic validator)

**Phase 3 Relationships** (not yet implemented):
- `bin_contents`: One-to-many (supplier provides products in bins)

**Example Data**:
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "company_name": "Tejgazdaság Kft.",
  "contact_person": "Nagy János",
  "email": "janos.nagy@tejgazdasag.hu",
  "phone": "+36 1 234 5678",
  "address": "1117 Budapest, Irinyi József utca 42.",
  "tax_number": "12345678-2-42",
  "is_active": true,
  "created_at": "2025-12-21T09:00:00+01:00",
  "updated_at": "2025-12-21T09:00:00+01:00"
}
```

**SQLAlchemy Model**:
```python
from app.db.base import GUID, Base

class Supplier(Base):
    """Supplier model representing product vendors."""

    __tablename__ = "suppliers"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    tax_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
```

---

### 3. bins

Storage locations (pallet positions) within warehouses. This table was introduced in Phase 2 but referenced in Phase 1 documentation as a future enhancement.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `warehouse_id` | UUID | FK → warehouses.id, NOT NULL | Parent warehouse |
| `code` | VARCHAR(100) | UNIQUE, NOT NULL | Human-readable location code |
| `structure_data` | JSON | NOT NULL | Parsed bin location data |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'empty' | Current bin status |
| `max_weight` | FLOAT | NULL, CHECK > 0 | Weight capacity (kg) |
| `max_height` | FLOAT | NULL, CHECK > 0 | Height limit (cm) |
| `accessibility` | VARCHAR(50) | NULL | Access method/notes |
| `notes` | TEXT | NULL | Additional information |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Active status |
| `created_at` | TIMESTAMP WITH TZ | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP WITH TZ | NOT NULL | Last update timestamp |

**Check Constraints**:
- `check_bin_status`: `status IN ('empty', 'occupied', 'reserved', 'inactive')`
- `max_weight > 0` (if provided)
- `max_height > 0` (if provided)

**Foreign Keys**:
- `warehouse_id` → `warehouses.id` (ON DELETE CASCADE)

**Indexes**:
- Primary key on `id`
- Unique index on `code` (globally unique across all warehouses)
- Index on `warehouse_id` (for warehouse-scoped queries)
- Index on `status` (for filtering by status)

**Relationships**:
- `warehouse`: Many-to-one with `warehouses` table (Phase 1)
- `content`: One-to-one with `bin_contents` (Phase 3, cascade delete)

**Bin Status Values**:
| Value | Hungarian | Description | Usage |
|-------|-----------|-------------|-------|
| `empty` | Üres | No product in bin | Default state, can be deleted |
| `occupied` | Foglalt | Contains product | Cannot be deleted |
| `reserved` | Lefoglalt | Reserved for incoming | Cannot be deleted |
| `inactive` | Inaktív | Temporarily unavailable | Maintenance, repairs |

**Business Rules**:
- `code` is globally unique across all warehouses
- `structure_data` must conform to warehouse's `bin_structure_template`
- Bins can only be deleted if status is "empty"
- `code` is generated from warehouse template or manually specified

**Structure Data Format**:
Generated from warehouse `bin_structure_template`. Example:
```json
{
  "aisle": "A",
  "rack": "01",
  "level": "02",
  "position": "03"
}
```

Field names, order, and formatting rules come from warehouse template:
- `auto_uppercase`: true → "a" becomes "A"
- `zero_padding`: true → "1" becomes "01"
- `code_format`: "{aisle}-{rack}-{level}-{position}" → "A-01-02-03"

**Example Data**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440002",
  "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
  "code": "A-01-02-03",
  "structure_data": {
    "aisle": "A",
    "rack": "01",
    "level": "02",
    "position": "03"
  },
  "status": "empty",
  "max_weight": 1000.0,
  "max_height": 200.0,
  "accessibility": "forklift",
  "notes": "Ground level bin, easy access",
  "is_active": true,
  "created_at": "2025-12-21T08:00:00+01:00",
  "updated_at": "2025-12-21T08:00:00+01:00"
}
```

**SQLAlchemy Model**:
```python
from app.db.base import GUID, Base

class Bin(Base):
    """Bin (storage location) model within a warehouse."""

    __tablename__ = "bins"

    id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        primary_key=True,
        default=uuid.uuid4,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    structure_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="empty", nullable=False)
    max_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_height: Mapped[float | None] = mapped_column(Float, nullable=True)
    accessibility: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('empty', 'occupied', 'reserved', 'inactive')",
            name="check_bin_status",
        ),
    )

    # Relationships
    warehouse: Mapped["Warehouse"] = relationship(back_populates="bins")
    content: Mapped["BinContent | None"] = relationship(
        back_populates="bin",
        uselist=False,
        cascade="all, delete-orphan",
    )  # Phase 3
```

---

## Database Portability (Inherited from Phase 1)

### Custom GUID Type

Phase 2 tables use the same `GUID` TypeDecorator as Phase 1:

```python
from sqlalchemy import TypeDecorator, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))
```

**Purpose**:
- **PostgreSQL**: Uses native `UUID` type for performance
- **SQLite**: Uses `String(36)` for testing compatibility

This enables:
- Fast in-memory testing with SQLite
- Production deployment with PostgreSQL
- Same Python `uuid.UUID` interface in both

---

## Query Patterns

### Pagination

All list queries use consistent pagination:

```python
from sqlalchemy import select, func

# Count total
count_query = select(func.count()).select_from(Product)
total = (await db.execute(count_query)).scalar()

# Get page
offset = (page - 1) * page_size
result = await db.execute(
    select(Product)
    .where(Product.is_active == True)
    .order_by(Product.created_at.desc())
    .offset(offset)
    .limit(page_size)
)
products = result.scalars().all()
```

### Search (Case-Insensitive)

Products search across multiple fields:

```python
from sqlalchemy import or_

search_term = f"%{search}%"
query = select(Product).where(
    or_(
        Product.name.ilike(search_term),
        Product.sku.ilike(search_term),
        Product.category.ilike(search_term),
    )
)
```

Suppliers search:

```python
search_term = f"%{search}%"
query = select(Supplier).where(
    or_(
        Supplier.company_name.ilike(search_term),
        Supplier.contact_person.ilike(search_term),
        Supplier.email.ilike(search_term),
    )
)
```

Bins search:

```python
search_term = f"%{search}%"
query = select(Bin).where(Bin.code.ilike(search_term))
```

### Filtering

Category filtering (exact match):

```python
query = select(Product).where(Product.category == category)
```

Status filtering with enum:

```python
query = select(Bin).where(Bin.status == "empty")
```

Warehouse filtering:

```python
query = select(Bin).where(Bin.warehouse_id == warehouse_id)
```

### Bulk Insert (Bins)

Efficient bulk insertion using SQLAlchemy Core:

```python
from sqlalchemy import insert

bins_data = [
    {
        "id": uuid.uuid4(),
        "warehouse_id": warehouse_id,
        "code": f"A-{i:02d}",
        "structure_data": {"aisle": "A", "rack": f"{i:02d}"},
        "status": "empty",
        "is_active": True,
    }
    for i in range(1, 601)  # 600 bins
]

await db.execute(insert(Bin), bins_data)
await db.flush()
```

---

## Migration Scripts

Phase 2 migrations create the 3 new tables:

### Migration: Create products table
```python
def upgrade() -> None:
    op.create_table(
        'products',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('sku', sa.String(100), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('default_unit', sa.String(50), nullable=False, server_default='db'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sku', name='uq_products_sku')
    )
```

### Migration: Create suppliers table
```python
def upgrade() -> None:
    op.create_table(
        'suppliers',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('company_name', sa.String(255), nullable=False),
        sa.Column('contact_person', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('phone', sa.String(50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('tax_number', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
```

### Migration: Create bins table
```python
def upgrade() -> None:
    op.create_table(
        'bins',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('warehouse_id', GUID(), nullable=False),
        sa.Column('code', sa.String(100), nullable=False),
        sa.Column('structure_data', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='empty'),
        sa.Column('max_weight', sa.Float(), nullable=True),
        sa.Column('max_height', sa.Float(), nullable=True),
        sa.Column('accessibility', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_bins_code'),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id'], ondelete='CASCADE'),
        sa.CheckConstraint(
            "status IN ('empty', 'occupied', 'reserved', 'inactive')",
            name='check_bin_status'
        )
    )

    # Create indexes
    op.create_index('ix_bins_warehouse_id', 'bins', ['warehouse_id'])
    op.create_index('ix_bins_status', 'bins', ['status'])
```

---

## Performance Considerations

### Recommended Indexes

**Current Indexes** (already implemented):
- All primary keys (UUID)
- `products.sku` (unique)
- `bins.code` (unique)
- `bins.warehouse_id` (foreign key)
- `bins.status` (filtering)

**Future Indexes** (Phase 3, when inventory is added):
```sql
-- For category-based reporting
CREATE INDEX ix_products_category ON products(category);

-- For supplier-based queries
CREATE INDEX ix_suppliers_company_name ON suppliers(company_name);

-- For bin content lookups (Phase 3)
CREATE INDEX ix_bin_contents_product_id ON bin_contents(product_id);
CREATE INDEX ix_bin_contents_supplier_id ON bin_contents(supplier_id);
```

### Connection Pool

Phase 2 uses same connection pool settings as Phase 1:

```python
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Verify connections before use
    pool_size=10,        # Base connection pool size
    max_overflow=20,     # Extra connections under load
)
```

### Query Optimization

**Best Practices**:
1. **Use indexes**: All foreign keys and frequently filtered fields are indexed
2. **Lazy loading**: Only load relationships when needed
3. **Bulk operations**: Use SQLAlchemy Core `insert()` for bulk bin creation
4. **Pagination**: Always paginate list queries (max 200 items per page)
5. **Projection**: Select only needed columns for large result sets

---

## Data Integrity

### Constraints Summary

| Table | Unique Constraints | Check Constraints | Foreign Keys |
|-------|-------------------|-------------------|--------------|
| products | sku | - | - |
| suppliers | - | - | - |
| bins | code | status enum | warehouse_id → warehouses |

### Cascade Delete Rules

| Parent | Child | Rule | Impact |
|--------|-------|------|--------|
| warehouses | bins | CASCADE | Deleting warehouse deletes all its bins |
| bins | bin_contents | CASCADE | Deleting bin deletes its content (Phase 3) |

### Soft Delete Pattern

Products and suppliers use `is_active` flag for soft deletion:
- `is_active=false`: Hidden from normal queries
- Preserves historical data
- Can be reactivated
- Phase 3: Prevents deletion if inventory exists

---

## Testing Strategy

### In-Memory Testing

Phase 2 tests use SQLite in-memory database:

```python
@pytest.fixture
async def db_session():
    """Provide async SQLite in-memory database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()
```

### Test Data Factories

```python
def create_test_product():
    return Product(
        id=uuid.uuid4(),
        name="Test Product",
        sku="TEST-001",
        category="test",
        default_unit="db",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
```

---

## Phase 3 Preview

### Upcoming Tables

**bin_contents** (inventory tracking):
- Links bins, products, and suppliers
- Tracks batch numbers, expiry dates
- FEFO (First Expired, First Out) support

**bin_history** (audit trail):
- Records all bin movements
- Incoming goods, outgoing shipments
- User tracking for accountability

### Upcoming Foreign Keys

```sql
-- bin_contents table
ALTER TABLE bin_contents
  ADD CONSTRAINT fk_bin_contents_bin
    FOREIGN KEY (bin_id) REFERENCES bins(id) ON DELETE CASCADE;

ALTER TABLE bin_contents
  ADD CONSTRAINT fk_bin_contents_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE bin_contents
  ADD CONSTRAINT fk_bin_contents_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT;
```

---

## Additional Resources

- **[Phase2_Overview.md](Phase2_Overview.md)** - Quick reference and summary
- **[Phase2_API_Reference.md](Phase2_API_Reference.md)** - Complete endpoint documentation
- **[Phase2_Bulk_Generation.md](Phase2_Bulk_Generation.md)** - Bulk bin creation algorithm
- **[Phase1_Database_Schema.md](Phase1_Database_Schema.md)** - Phase 1 tables (users, warehouses)

---

## Summary

Phase 2 adds 3 independent tables:
- **products**: 9 columns, SKU uniqueness
- **suppliers**: 9 columns, Hungarian tax number
- **bins**: 12 columns, warehouse relationship, status enum

Total database:
- **5 tables** (2 Phase 1 + 3 Phase 2)
- **52 columns** across all tables
- **3 foreign keys** (warehouses → bins)
- **88 tests** covering all CRUD operations

Phase 3 will connect these tables through inventory tracking and audit history.
