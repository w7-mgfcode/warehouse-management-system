# PRP: Phase 2 - Products, Suppliers, Bins CRUD + Bulk Generation

**Version**: 1.0
**Created**: 2025-12-21
**Status**: Ready for Implementation
**Confidence Score**: 9/10

---

## Goal

Implement complete CRUD operations for Products, Suppliers, and Bins entities, plus a sophisticated bulk bin generation feature that creates multiple storage locations based on warehouse bin structure templates.

## Why

- **Business Value**: Enables warehouse operators to manage their product catalog, supplier relationships, and storage locations efficiently
- **Foundation for Inventory**: Products, Suppliers, and Bins are prerequisite entities for the BinContents/Inventory feature (Phase 3)
- **Operational Efficiency**: Bulk bin generation saves hours of manual data entry when setting up new warehouses with hundreds of bins
- **FEFO Compliance**: Product tracking is essential for First Expired, First Out inventory management

## What

### User-Visible Behavior

1. **Products CRUD**: Full management of product catalog with optional SKU, categories, and search
2. **Suppliers CRUD**: Vendor management with contact details and Hungarian tax number validation
3. **Bins CRUD**: Individual storage location management within warehouses
4. **Bins Bulk Generation**: Generate 10-1000+ bins from range specifications with preview capability

### Success Criteria

- [ ] Products: List, Create, Read, Update, Delete with pagination, filters, search
- [ ] Suppliers: List, Create, Read, Update, Delete with pagination, filters, search
- [ ] Bins: List, Create, Read, Update, Delete with warehouse filtering
- [ ] Bins Bulk: Preview mode returns count + sample codes + conflicts
- [ ] Bins Bulk: Create mode batch-inserts bins with conflict detection
- [ ] All messages in Hungarian (HU_MESSAGES)
- [ ] RBAC enforced per specification
- [ ] Tests pass: minimum 30 new tests covering happy paths, validation, RBAC

---

## All Needed Context

### Documentation & References

```yaml
# MUST READ - Pattern files in codebase
- file: w7-WHv1/backend/app/services/warehouse.py
  why: "Service layer pattern - CRUD functions, pagination, calculate_pages helper"

- file: w7-WHv1/backend/app/schemas/warehouse.py
  why: "Schema pattern - Create/Update/Response/List schemas, ConfigDict, field_validator"

- file: w7-WHv1/backend/app/api/v1/warehouses.py
  why: "Router pattern - endpoint structure, RBAC deps, HTTP status codes, error handling"

- file: w7-WHv1/backend/app/tests/test_warehouses.py
  why: "Test pattern - class organization, fixture usage, auth_header helper"

- file: w7-WHv1/backend/app/api/deps.py
  why: "RBAC dependencies - RequireAdmin, RequireManager, RequireWarehouse, RequireViewer"

- file: w7-WHv1/backend/app/core/i18n.py
  why: "Hungarian messages - HU_MESSAGES dict pattern"

- file: w7-WHv1/backend/app/tests/conftest.py
  why: "Test fixtures - user fixtures, sample_warehouse, auth_header"

# External documentation
- url: <https://docs.sqlalchemy.org/en/20/orm/queryguide/dml.html>
  why: "SQLAlchemy 2.0 bulk insert pattern using insert() statement"

- url: <https://github.com/zhanymkanov/fastapi-best-practices>
  why: "FastAPI best practices - thin routes, fat services pattern"
```

### Current Codebase Tree

```
w7-WHv1/backend/app/
├── api/
│   ├── deps.py              # RBAC dependencies (USE AS-IS)
│   └── v1/
│       ├── router.py        # ADD new routers here
│       ├── warehouses.py    # PATTERN to follow
│       ├── products.py      # CREATE
│       ├── suppliers.py     # CREATE
│       └── bins.py          # CREATE
├── core/
│   └── i18n.py              # MODIFY - add Phase 2 messages
├── db/models/
│   ├── product.py           # EXISTS - no changes needed
│   ├── supplier.py          # EXISTS - no changes needed
│   ├── bin.py               # EXISTS - no changes needed
│   └── warehouse.py         # EXISTS - has bin_structure_template
├── schemas/
│   ├── warehouse.py         # PATTERN to follow
│   ├── product.py           # CREATE
│   ├── supplier.py          # CREATE
│   └── bin.py               # CREATE
├── services/
│   ├── warehouse.py         # PATTERN to follow
│   ├── product.py           # CREATE
│   ├── supplier.py          # CREATE
│   └── bin.py               # CREATE
└── tests/
    ├── conftest.py          # MODIFY - add fixtures
    ├── test_warehouses.py   # PATTERN to follow
    ├── test_products.py     # CREATE
    ├── test_suppliers.py    # CREATE
    └── test_bins.py         # CREATE
```

### Desired Codebase Tree (Files to Create)

```
app/
├── schemas/
│   ├── product.py      # ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
│   ├── supplier.py     # SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse
│   └── bin.py          # BinCreate, BinUpdate, BinResponse, BinListResponse,
│                       # BulkBinCreate, BulkBinPreview, BulkBinRange
├── services/
│   ├── product.py      # CRUD operations for products
│   ├── supplier.py     # CRUD operations for suppliers
│   └── bin.py          # CRUD + bulk generation logic
├── api/v1/
│   ├── products.py     # /api/v1/products endpoints
│   ├── suppliers.py    # /api/v1/suppliers endpoints
│   └── bins.py         # /api/v1/bins + /bulk + /bulk/preview endpoints
└── tests/
    ├── test_products.py   # Product endpoint tests
    ├── test_suppliers.py  # Supplier endpoint tests
    └── test_bins.py       # Bin + bulk generation tests
```

### Known Gotchas & Library Quirks

```python
# CRITICAL: Models already exist - do NOT create migrations
# Product, Supplier, Bin models in app/db/models/ are ready to use

# CRITICAL: Pydantic v2 syntax required
from pydantic import BaseModel, ConfigDict, Field, field_validator
# NOT: @validator (deprecated), class Config (deprecated)

# CRITICAL: SQLAlchemy 2.0 async syntax
from sqlalchemy import select, func, insert
result = await db.execute(select(Model).where(...))
# NOT: session.query(Model).filter(...)

# CRITICAL: Bulk insert pattern for SQLAlchemy 2.0 async
await db.execute(insert(Bin), [{"col": val}, ...])  # list of dicts
await db.flush()

# CRITICAL: Hungarian messages only
# All user-facing error messages must use HU_MESSAGES keys

# CRITICAL: Bin.code is UNIQUE across all warehouses
# Must check for conflicts during bulk generation

# CRITICAL: Bin status CHECK constraint
# status IN ('empty', 'occupied', 'reserved', 'inactive')

# GOTCHA: Warehouse bin_structure_template is JSON dict
# Access via warehouse.bin_structure_template["fields"], etc.

# GOTCHA: GUID type for UUID portability (SQLite tests, PostgreSQL prod)
from app.db.base import GUID  # Already used in models

# GOTCHA: datetime with timezone
from datetime import UTC, datetime
datetime.now(UTC)  # NOT datetime.utcnow()
```

---

## Implementation Blueprint

### Data Models (Schemas)

#### product.py
```python
"""Product schemas for CRUD operations."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.core.i18n import HU_MESSAGES

class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    sku: str | None = Field(None, min_length=3, max_length=100)
    category: str | None = Field(None, max_length=100)
    default_unit: str = Field(default="db", max_length=50)
    description: str | None = None
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["product_name_required"])
        return v.strip()

class ProductUpdate(BaseModel):
    # All fields optional for partial update
    name: str | None = Field(None, min_length=2, max_length=255)
    sku: str | None = Field(None, min_length=3, max_length=100)
    category: str | None = Field(None, max_length=100)
    default_unit: str | None = Field(None, max_length=50)
    description: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

class ProductResponse(BaseModel):
    id: UUID
    name: str
    sku: str | None
    category: str | None
    default_unit: str
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int
    pages: int
```

#### supplier.py
```python
"""Supplier schemas for CRUD operations."""
import re
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, EmailStr
from app.core.i18n import HU_MESSAGES

# Hungarian tax number pattern: 8 digits-1 digit-2 digits (e.g., 12345678-2-42)
TAX_NUMBER_PATTERN = re.compile(r"^\d{8}-\d-\d{2}$")

class SupplierCreate(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=255)
    contact_person: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    tax_number: str | None = Field(None, max_length=50)
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["supplier_name_required"])
        return v.strip()

    @field_validator("tax_number")
    @classmethod
    def validate_tax_number(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not TAX_NUMBER_PATTERN.match(v):
            raise ValueError(HU_MESSAGES["invalid_tax_number"])
        return v

class SupplierUpdate(BaseModel):
    company_name: str | None = Field(None, min_length=2, max_length=255)
    contact_person: str | None = Field(None, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=50)
    address: str | None = None
    tax_number: str | None = Field(None, max_length=50)
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("tax_number")
    @classmethod
    def validate_tax_number(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not TAX_NUMBER_PATTERN.match(v):
            raise ValueError(HU_MESSAGES["invalid_tax_number"])
        return v

class SupplierResponse(BaseModel):
    id: UUID
    company_name: str
    contact_person: str | None
    email: str | None
    phone: str | None
    address: str | None
    tax_number: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SupplierListResponse(BaseModel):
    items: list[SupplierResponse]
    total: int
    page: int
    page_size: int
    pages: int
```

#### bin.py (more complex - includes bulk)
```python
"""Bin schemas for CRUD and bulk generation."""
from datetime import datetime
from typing import Any, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.core.i18n import HU_MESSAGES

BinStatus = Literal["empty", "occupied", "reserved", "inactive"]

class BinCreate(BaseModel):
    warehouse_id: UUID
    code: str = Field(..., min_length=1, max_length=100)
    structure_data: dict[str, Any]
    status: BinStatus = "empty"
    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)
    notes: str | None = None
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

class BinUpdate(BaseModel):
    code: str | None = Field(None, min_length=1, max_length=100)
    structure_data: dict[str, Any] | None = None
    status: BinStatus | None = None
    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)
    notes: str | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

class BinResponse(BaseModel):
    id: UUID
    warehouse_id: UUID
    code: str
    structure_data: dict[str, Any]
    status: str
    max_weight: float | None
    max_height: float | None
    accessibility: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BinListResponse(BaseModel):
    items: list[BinResponse]
    total: int
    page: int
    page_size: int
    pages: int

# Bulk generation schemas
class RangeSpec(BaseModel):
    """Range specification: either start/end or list of values."""
    start: int | None = None
    end: int | None = None

    @model_validator(mode="after")
    def validate_range(self) -> "RangeSpec":
        if self.start is not None and self.end is not None:
            if self.start > self.end:
                raise ValueError("start must be <= end")
        return self

class BulkBinRanges(BaseModel):
    """Range specifications for each template field."""
    # Dynamic - keys match warehouse template field names
    # Values are either list[str] or RangeSpec

    model_config = ConfigDict(extra="allow")

class BulkBinDefaults(BaseModel):
    """Default values for bulk-created bins."""
    max_weight: float | None = Field(None, gt=0)
    max_height: float | None = Field(None, gt=0)
    accessibility: str | None = Field(None, max_length=50)

class BulkBinCreate(BaseModel):
    """Request body for bulk bin creation."""
    warehouse_id: UUID
    ranges: dict[str, Any]  # field_name -> list or {start, end}
    defaults: BulkBinDefaults | None = None

class BulkBinPreviewResponse(BaseModel):
    """Response for bulk generation preview."""
    count: int
    sample_codes: list[str]  # First 20 codes
    conflicts: list[str]     # Existing codes that would conflict
    valid: bool              # True if no conflicts
```

### Task List (Ordered)

#### Task 1: Add Hungarian messages to i18n.py
```yaml
MODIFY: w7-WHv1/backend/app/core/i18n.py
  - FIND: HU_MESSAGES dict
  - ADD entries for Products, Suppliers, Bins (use keys from INITIAL2.md)
```

Required messages to add:
```python
# Products
"product_not_found": "A termék nem található.",
"product_sku_exists": "Ilyen SKU-val már létezik termék.",
"product_name_required": "A termék neve kötelező.",
"product_has_inventory": "A termék nem törölhető, mert van belőle készlet.",

# Suppliers
"supplier_not_found": "A beszállító nem található.",
"supplier_name_required": "A cég neve kötelező.",
"supplier_has_inventory": "A beszállító nem törölhető, mert van hozzá tartozó készlet.",
"invalid_tax_number": "Érvénytelen adószám formátum.",

# Bins (some already exist - add missing)
"bin_invalid_structure": "A tárolóhely adatai nem felelnek meg a raktár sablonjának.",
"bulk_generation_failed": "A tömeges létrehozás sikertelen.",
"bulk_conflicts_found": "Ütköző kódok találhatók: {codes}",
"bulk_no_bins_generated": "Nem jött létre egyetlen tárolóhely sem.",
```

#### Task 2: Create Product schemas
```yaml
CREATE: w7-WHv1/backend/app/schemas/product.py
  - MIRROR pattern from: schemas/warehouse.py
  - Include: ProductCreate, ProductUpdate, ProductResponse, ProductListResponse
```

#### Task 3: Create Product service
```yaml
CREATE: w7-WHv1/backend/app/services/product.py
  - MIRROR pattern from: services/warehouse.py
  - Functions: create_product, get_product_by_id, get_product_by_sku,
               get_products (with search, category, is_active filters),
               update_product, delete_product, calculate_pages
  - Add search across name, sku, category fields using ILIKE
```

Search implementation pseudocode:
```python
async def get_products(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    is_active: bool | None = None,
    category: str | None = None,
    search: str | None = None,
) -> tuple[list[Product], int]:
    query = select(Product)

    if is_active is not None:
        query = query.where(Product.is_active == is_active)
    if category:
        query = query.where(Product.category == category)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
                Product.category.ilike(search_term),
            )
        )

    # Count and paginate (same pattern as warehouse.py)
    ...
```

#### Task 4: Create Product router
```yaml
CREATE: w7-WHv1/backend/app/api/v1/products.py
  - MIRROR pattern from: api/v1/warehouses.py
  - Endpoints: GET /, POST /, GET /{id}, PUT /{id}, DELETE /{id}
  - RBAC: Read=viewer+, Write=manager+
```

#### Task 5: Create Supplier schemas
```yaml
CREATE: w7-WHv1/backend/app/schemas/supplier.py
  - Include tax_number validation (Hungarian format)
  - Include email validation using EmailStr
```

#### Task 6: Create Supplier service
```yaml
CREATE: w7-WHv1/backend/app/services/supplier.py
  - Same pattern as product service
  - Search across company_name, contact_person, email
```

#### Task 7: Create Supplier router
```yaml
CREATE: w7-WHv1/backend/app/api/v1/suppliers.py
  - Same pattern as products router
```

#### Task 8: Create Bin schemas
```yaml
CREATE: w7-WHv1/backend/app/schemas/bin.py
  - Include standard CRUD schemas
  - Include bulk generation schemas (BulkBinCreate, BulkBinPreviewResponse)
```

#### Task 9: Create Bin service (most complex)
```yaml
CREATE: w7-WHv1/backend/app/services/bin.py
  - Standard CRUD functions
  - Bulk generation functions:
    - generate_bin_codes(warehouse, ranges) -> list of codes
    - validate_structure_data(warehouse, structure_data) -> bool
    - preview_bulk_bins(db, warehouse_id, ranges) -> preview dict
    - create_bulk_bins(db, warehouse_id, ranges, defaults) -> count
```

Bulk generation pseudocode:
```python
from itertools import product as cartesian_product

def expand_range(spec: Any) -> list[str]:
    """Expand a range specification to list of values."""
    if isinstance(spec, list):
        return [str(v) for v in spec]
    if isinstance(spec, dict) and "start" in spec and "end" in spec:
        return [str(i) for i in range(spec["start"], spec["end"] + 1)]
    raise ValueError("Invalid range specification")

def generate_bin_codes(
    template: dict,  # warehouse.bin_structure_template
    ranges: dict[str, Any],
) -> list[tuple[str, dict]]:
    """Generate bin codes and structure_data from ranges."""
    fields = template["fields"]
    code_format = template["code_format"]
    auto_uppercase = template.get("auto_uppercase", True)
    zero_padding = template.get("zero_padding", True)

    # Get ordered field names
    sorted_fields = sorted(fields, key=lambda f: f["order"])
    field_names = [f["name"] for f in sorted_fields]

    # Expand ranges for each field
    field_values = []
    for name in field_names:
        if name not in ranges:
            raise ValueError(f"Missing range for field: {name}")
        field_values.append(expand_range(ranges[name]))

    # Generate cartesian product
    results = []
    for combo in cartesian_product(*field_values):
        structure_data = dict(zip(field_names, combo))

        # Apply formatting
        formatted = {}
        for name, value in structure_data.items():
            if auto_uppercase and isinstance(value, str):
                value = value.upper()
            if zero_padding and value.isdigit():
                value = value.zfill(2)
            formatted[name] = value

        # Generate code from format string
        code = code_format.format(**formatted)
        results.append((code, formatted))

    return results

async def preview_bulk_bins(
    db: AsyncSession,
    warehouse_id: UUID,
    ranges: dict[str, Any],
) -> dict:
    """Preview bulk bin generation - check conflicts without creating."""
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise ValueError("Warehouse not found")

    codes_and_data = generate_bin_codes(warehouse.bin_structure_template, ranges)
    codes = [c[0] for c in codes_and_data]

    # Check for existing codes
    existing = await db.execute(
        select(Bin.code).where(Bin.code.in_(codes))
    )
    conflicts = [row[0] for row in existing.fetchall()]

    return {
        "count": len(codes),
        "sample_codes": codes[:20],
        "conflicts": conflicts,
        "valid": len(conflicts) == 0,
    }

async def create_bulk_bins(
    db: AsyncSession,
    warehouse_id: UUID,
    ranges: dict[str, Any],
    defaults: dict | None = None,
) -> int:
    """Create bins in bulk. Returns count of created bins."""
    warehouse = await get_warehouse_by_id(db, warehouse_id)
    if not warehouse:
        raise ValueError("Warehouse not found")

    codes_and_data = generate_bin_codes(warehouse.bin_structure_template, ranges)

    # Check conflicts first
    codes = [c[0] for c in codes_and_data]
    existing = await db.execute(
        select(Bin.code).where(Bin.code.in_(codes))
    )
    conflicts = set(row[0] for row in existing.fetchall())

    if conflicts:
        raise ValueError(f"Conflicting codes: {', '.join(list(conflicts)[:5])}")

    # Prepare bulk insert data
    defaults = defaults or {}
    bins_data = []
    for code, structure_data in codes_and_data:
        bins_data.append({
            "warehouse_id": warehouse_id,
            "code": code,
            "structure_data": structure_data,
            "status": "empty",
            "max_weight": defaults.get("max_weight"),
            "max_height": defaults.get("max_height"),
            "accessibility": defaults.get("accessibility"),
            "is_active": True,
        })

    # Bulk insert using SQLAlchemy 2.0 pattern
    await db.execute(insert(Bin), bins_data)
    await db.flush()

    return len(bins_data)
```

#### Task 10: Create Bin router
```yaml
CREATE: w7-WHv1/backend/app/api/v1/bins.py
  - Standard CRUD endpoints
  - POST /bulk - bulk create (RequireManager)
  - POST /bulk/preview - preview bulk (RequireManager)
```

#### Task 11: Register new routers
```yaml
MODIFY: w7-WHv1/backend/app/api/v1/router.py
  - ADD: from app.api.v1.products import router as products_router
  - ADD: from app.api.v1.suppliers import router as suppliers_router
  - ADD: from app.api.v1.bins import router as bins_router
  - ADD: router.include_router(products_router)
  - ADD: router.include_router(suppliers_router)
  - ADD: router.include_router(bins_router)
```

#### Task 12: Add test fixtures to conftest.py
```yaml
MODIFY: w7-WHv1/backend/app/tests/conftest.py
  - ADD: sample_product fixture
  - ADD: sample_supplier fixture
  - ADD: sample_bin fixture (requires sample_warehouse)
```

```python
@pytest.fixture
async def sample_product(db_session: AsyncSession) -> Product:
    """Create a sample product for testing."""
    from app.db.models.product import Product
    product = Product(
        id=uuid.uuid4(),
        name="Test Product",
        sku="TEST-001",
        category="Test Category",
        default_unit="db",
        description="Test description",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(product)
    await db_session.flush()
    await db_session.refresh(product)
    return product

@pytest.fixture
async def sample_supplier(db_session: AsyncSession) -> Supplier:
    """Create a sample supplier for testing."""
    from app.db.models.supplier import Supplier
    supplier = Supplier(
        id=uuid.uuid4(),
        company_name="Test Supplier Kft.",
        contact_person="Test Contact",
        email="test@supplier.hu",
        phone="+36 30 123 4567",
        address="Budapest, Test utca 1.",
        tax_number="12345678-2-42",
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(supplier)
    await db_session.flush()
    await db_session.refresh(supplier)
    return supplier

@pytest.fixture
async def sample_bin(db_session: AsyncSession, sample_warehouse: Warehouse) -> Bin:
    """Create a sample bin for testing."""
    from app.db.models.bin import Bin
    bin_obj = Bin(
        id=uuid.uuid4(),
        warehouse_id=sample_warehouse.id,
        code="A-01",
        structure_data={"aisle": "A", "level": "01"},
        status="empty",
        max_weight=1000.0,
        max_height=180.0,
        is_active=True,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db_session.add(bin_obj)
    await db_session.flush()
    await db_session.refresh(bin_obj)
    return bin_obj
```

#### Task 13: Create Product tests
```yaml
CREATE: w7-WHv1/backend/app/tests/test_products.py
  - Test classes: TestListProducts, TestCreateProduct, TestGetProduct,
                  TestUpdateProduct, TestDeleteProduct
  - Follow test_warehouses.py pattern exactly
```

#### Task 14: Create Supplier tests
```yaml
CREATE: w7-WHv1/backend/app/tests/test_suppliers.py
  - Same pattern as products
  - Additional: test_invalid_tax_number validation
```

#### Task 15: Create Bin tests
```yaml
CREATE: w7-WHv1/backend/app/tests/test_bins.py
  - Standard CRUD tests
  - TestBulkGeneration class:
    - test_bulk_preview_success
    - test_bulk_create_success
    - test_bulk_conflict_detection
    - test_bulk_invalid_range
```

---

## Validation Loop

### Level 1: Syntax & Style
```bash
cd w7-WHv1/backend
source ../../venv_linux/bin/activate

# After creating each file:
ruff check app/schemas/product.py app/services/product.py app/api/v1/products.py --fix
ruff format app/schemas/product.py app/services/product.py app/api/v1/products.py

# Expected: No errors. Fix any issues before proceeding.
```

### Level 2: Unit Tests
```bash
cd w7-WHv1/backend
source ../../venv_linux/bin/activate

# Run tests incrementally:
pytest app/tests/test_products.py -v
pytest app/tests/test_suppliers.py -v
pytest app/tests/test_bins.py -v

# Run all tests to ensure no regressions:
pytest -v

# Expected: All 70+ tests pass (40 existing + 30+ new)
```

### Level 3: Integration Verification
```bash
# Start services
cd w7-WHv1
docker-compose up -d db valkey

# Run backend
cd backend
source ../../venv_linux/bin/activate
uvicorn app.main:app --reload

# Test endpoints manually:
# 1. Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin123!"

# 2. Create product (use token from above)
curl -X POST http://localhost:8000/api/v1/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Product", "sku": "TEST-001"}'

# 3. Test bulk preview
curl -X POST http://localhost:8000/api/v1/bins/bulk/preview \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "<warehouse-uuid>",
    "ranges": {
      "aisle": ["A", "B"],
      "level": {"start": 1, "end": 3}
    }
  }'
```

---

## Final Validation Checklist

- [ ] All tests pass: `pytest -v` (70+ tests)
- [ ] No linting errors: `ruff check app/`
- [ ] No formatting issues: `ruff format --check app/`
- [ ] Products CRUD works via API
- [ ] Suppliers CRUD works via API
- [ ] Bins CRUD works via API
- [ ] Bins bulk preview returns correct count and conflicts
- [ ] Bins bulk create generates all expected bins
- [ ] Hungarian messages displayed for all errors
- [ ] RBAC restrictions enforced (viewer can read, manager+ can write)
- [ ] API documentation auto-generated at /docs

---

## Anti-Patterns to Avoid

- Don't create new model migrations - models exist
- Don't use deprecated Pydantic v1 syntax (@validator, class Config)
- Don't use SQLAlchemy 1.x query syntax (session.query)
- Don't hardcode English error messages - use HU_MESSAGES
- Don't skip validation for bulk operations
- Don't create bins without checking code uniqueness
- Don't use sync database operations in async context

---

## RBAC Reference Table

| Endpoint | admin | manager | warehouse | viewer |
|----------|-------|---------|-----------|--------|
| Products GET | Yes | Yes | Yes | Yes |
| Products POST/PUT/DELETE | Yes | Yes | No | No |
| Suppliers GET | Yes | Yes | Yes | Yes |
| Suppliers POST/PUT/DELETE | Yes | Yes | No | No |
| Bins GET | Yes | Yes | Yes | Yes |
| Bins POST/PUT/DELETE | Yes | Yes | Yes | No |
| Bins Bulk | Yes | Yes | No | No |

Use these dependency types:
- `RequireViewer` - all authenticated users
- `RequireWarehouse` - warehouse, manager, admin
- `RequireManager` - manager, admin only
- `RequireAdmin` - admin only

---

## Sources

- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [SQLAlchemy 2.0 Bulk Inserts](https://docs.sqlalchemy.org/en/20/_modules/examples/performance/bulk_inserts.html)
- [FastAPI Official Documentation](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
