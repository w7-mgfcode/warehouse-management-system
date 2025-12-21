# INITIAL2 — WMS Phase 2: Products, Suppliers, Bins CRUD + Bulk Generation

This document defines Phase 2 implementation requirements, building on the Phase 1 foundation (auth, RBAC, warehouses).

**Last Updated**: December 2025
**Prerequisite**: Phase 1 complete (auth, users, warehouses CRUD)

## FEATURE

### Phase 2 Scope

1. **Products CRUD** - Product catalog management with optional SKU, categories, and Hungarian UI
2. **Suppliers CRUD** - Vendor management with contact details and tax number
3. **Bins CRUD** - Storage location management within warehouses
4. **Bins Bulk Generation** - Generate multiple bins from range specifications based on warehouse templates

### Key Constraints

- All user-facing messages in **Hungarian**
- Database models already exist from Phase 1 migrations
- Follow Phase 1 patterns (services, schemas, routers, tests)
- RBAC enforcement on all endpoints

## EXAMPLES

### Products API

```bash
# Create product
POST /api/v1/products
{
  "name": "Csirkemell filé",
  "sku": "CSIRKE-001",
  "category": "Hús",
  "default_unit": "kg",
  "description": "Friss csirkemell filé"
}

# List with filters
GET /api/v1/products?category=Hús&is_active=true&page=1&page_size=50

# Search by name/SKU
GET /api/v1/products?search=csirke
```

### Suppliers API

```bash
# Create supplier
POST /api/v1/suppliers
{
  "company_name": "Magyar Hús Kft.",
  "contact_person": "Kiss János",
  "email": "kiss.janos@magyarhus.hu",
  "phone": "+36 30 123 4567",
  "address": "Budapest, Logisztikai út 15.",
  "tax_number": "12345678-2-42"
}

# List with filters
GET /api/v1/suppliers?is_active=true&search=magyar
```

### Bins API

```bash
# Create single bin
POST /api/v1/bins
{
  "warehouse_id": "uuid-here",
  "code": "A-01-1-01",
  "structure_data": {
    "aisle": "A",
    "rack": "01",
    "level": "1",
    "position": "01"
  },
  "max_weight": 1000.0,
  "max_height": 180.0,
  "accessibility": "forklift"
}

# Bulk generation
POST /api/v1/bins/bulk
{
  "warehouse_id": "uuid-here",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 10},
    "level": {"start": 1, "end": 4},
    "position": {"start": 1, "end": 2}
  },
  "defaults": {
    "max_weight": 1000.0,
    "max_height": 180.0
  }
}
# Creates: A-01-1-01, A-01-1-02, A-01-2-01, ... C-10-4-02 (240 bins)

# Preview bulk generation (dry run)
POST /api/v1/bins/bulk/preview
{
  "warehouse_id": "uuid-here",
  "ranges": { ... }
}
# Returns: { "count": 240, "codes": ["A-01-1-01", ...], "conflicts": [] }

# Search bins
GET /api/v1/bins?warehouse_id=uuid&status=empty&search=A-01

# Get bin with content info
GET /api/v1/bins/{bin_id}
```

### Bin Structure Template Reference

Warehouse `bin_structure_template` example (from Phase 1):
```json
{
  "fields": [
    {"name": "aisle", "label": "Sor", "required": true, "order": 1},
    {"name": "rack", "label": "Állvány", "required": true, "order": 2},
    {"name": "level", "label": "Szint", "required": true, "order": 3},
    {"name": "position", "label": "Pozíció", "required": true, "order": 4}
  ],
  "code_format": "{aisle}-{rack}-{level}-{position}",
  "separator": "-",
  "auto_uppercase": true,
  "zero_padding": true
}
```

## DOCUMENTATION

### Existing Code References
- `app/db/models/product.py` - Product model (already created)
- `app/db/models/supplier.py` - Supplier model (already created)
- `app/db/models/bin.py` - Bin model with warehouse relationship
- `app/db/models/warehouse.py` - Warehouse with `bin_structure_template`
- `app/api/v1/warehouses.py` - Reference for CRUD pattern
- `app/services/warehouse.py` - Reference for service pattern
- `app/schemas/warehouse.py` - Reference for schema pattern
- `app/tests/test_warehouses.py` - Reference for test pattern
- `Docs/Phase1_API_Reference.md` - API conventions

### Hungarian Messages to Add (`app/core/i18n.py`)
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

# Bins
"bin_not_found": "A tárolóhely nem található.",
"bin_code_exists": "Ilyen kódú tárolóhely már létezik.",
"bin_not_empty": "A tárolóhely nem üres, nem törölhető.",
"bin_inactive": "A tárolóhely inaktív.",
"bin_occupied": "A tárolóhely foglalt.",
"bin_invalid_structure": "A tárolóhely adatai nem felelnek meg a raktár sablonjának.",
"bulk_generation_failed": "A tömeges létrehozás sikertelen.",
"bulk_conflicts_found": "Ütköző kódok találhatók: {codes}",
```

## OTHER CONSIDERATIONS

### Database Models (Already Exist)

Models were created in Phase 1 migration. No schema changes needed.

**Product** (`products` table):
- `id` UUID PK
- `name` VARCHAR(255) NOT NULL
- `sku` VARCHAR(100) UNIQUE NULL
- `category` VARCHAR(100) NULL
- `default_unit` VARCHAR(50) DEFAULT 'db'
- `description` TEXT NULL
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at` TIMESTAMP WITH TZ

**Supplier** (`suppliers` table):
- `id` UUID PK
- `company_name` VARCHAR(255) NOT NULL
- `contact_person` VARCHAR(255) NULL
- `email` VARCHAR(255) NULL
- `phone` VARCHAR(50) NULL
- `address` TEXT NULL
- `tax_number` VARCHAR(50) NULL
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at` TIMESTAMP WITH TZ

**Bin** (`bins` table):
- `id` UUID PK
- `warehouse_id` UUID FK → warehouses.id (CASCADE)
- `code` VARCHAR(100) UNIQUE NOT NULL
- `structure_data` JSON NOT NULL
- `status` VARCHAR(20) CHECK IN ('empty', 'occupied', 'reserved', 'inactive')
- `max_weight` FLOAT NULL
- `max_height` FLOAT NULL
- `accessibility` VARCHAR(50) NULL
- `notes` TEXT NULL
- `is_active` BOOLEAN DEFAULT true
- `created_at`, `updated_at` TIMESTAMP WITH TZ

### RBAC Requirements

| Endpoint | admin | manager | warehouse | viewer |
|----------|-------|---------|-----------|--------|
| Products CRUD | Full | Full | Read | Read |
| Suppliers CRUD | Full | Full | Read | Read |
| Bins Create/Update/Delete | Full | Full | Full | - |
| Bins Read | Full | Full | Full | Full |
| Bins Bulk Generate | Full | Full | - | - |

### Bulk Generation Logic

1. **Validate warehouse exists** and get `bin_structure_template`
2. **Parse ranges** for each field in template:
   - Array: `["A", "B", "C"]` → iterate values
   - Range object: `{"start": 1, "end": 10}` → generate sequence
3. **Apply template rules**:
   - `auto_uppercase`: Convert letters to uppercase
   - `zero_padding`: Pad numbers (01, 02, ...)
4. **Generate codes** using `code_format` template
5. **Check conflicts** against existing bin codes
6. **Preview mode**: Return count + sample codes + conflicts
7. **Create mode**: Batch insert with progress tracking

### Validation Rules

**Products**:
- `name`: Required, 2-255 characters
- `sku`: Optional, unique if provided, 3-100 characters
- `category`: Optional, max 100 characters
- `default_unit`: Required, common values: `db`, `kg`, `l`, `m`, `csomag`

**Suppliers**:
- `company_name`: Required, 2-255 characters
- `email`: Valid email format if provided
- `phone`: Valid phone format if provided (Hungarian: +36...)
- `tax_number`: Hungarian format if provided (8 digits-1 digit-2 digits)

**Bins**:
- `warehouse_id`: Required, must exist
- `code`: Required, unique, generated from `structure_data` + template
- `structure_data`: Must match warehouse template fields
- `status`: Must be valid enum value
- `max_weight`: Positive number if provided
- `max_height`: Positive number if provided

### Delete Constraints

- **Products**: Cannot delete if referenced in `bin_contents` (use soft delete via `is_active`)
- **Suppliers**: Cannot delete if referenced in `bin_contents` (use soft delete)
- **Bins**: Cannot delete if `status != 'empty'` or has content

### Test Coverage Requirements

Each entity needs:
- CRUD happy path tests
- Validation error tests
- RBAC restriction tests
- Edge cases (duplicate SKU, delete constraints)

Bins bulk generation needs:
- Preview mode test
- Successful bulk create test
- Conflict detection test
- Invalid range test

### Files to Create

```
app/
├── schemas/
│   ├── product.py      # ProductCreate, ProductUpdate, ProductResponse
│   ├── supplier.py     # SupplierCreate, SupplierUpdate, SupplierResponse
│   └── bin.py          # BinCreate, BinUpdate, BinResponse, BulkBinCreate, BulkPreview
├── services/
│   ├── product.py      # CRUD operations
│   ├── supplier.py     # CRUD operations
│   └── bin.py          # CRUD + bulk generation logic
├── api/v1/
│   ├── products.py     # Product endpoints
│   ├── suppliers.py    # Supplier endpoints
│   └── bins.py         # Bin endpoints + bulk
└── tests/
    ├── test_products.py
    ├── test_suppliers.py
    └── test_bins.py
```

### API Endpoints Summary

**Products** (`/api/v1/products`):
- `GET /` - List with pagination, filters (category, is_active, search)
- `POST /` - Create (manager+)
- `GET /{id}` - Get by ID
- `PUT /{id}` - Update (manager+)
- `DELETE /{id}` - Delete/deactivate (manager+)

**Suppliers** (`/api/v1/suppliers`):
- `GET /` - List with pagination, filters (is_active, search)
- `POST /` - Create (manager+)
- `GET /{id}` - Get by ID
- `PUT /{id}` - Update (manager+)
- `DELETE /{id}` - Delete/deactivate (manager+)

**Bins** (`/api/v1/bins`):
- `GET /` - List with pagination, filters (warehouse_id, status, search)
- `POST /` - Create single (warehouse+)
- `POST /bulk` - Bulk create (manager+)
- `POST /bulk/preview` - Preview bulk (manager+)
- `GET /{id}` - Get by ID with content info
- `PUT /{id}` - Update (warehouse+)
- `DELETE /{id}` - Delete if empty (warehouse+)

### Pagination Response Format

Follow Phase 1 pattern:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "page_size": 50,
  "pages": 2
}
```

### Search Implementation

- Products: Search in `name`, `sku`, `category`
- Suppliers: Search in `company_name`, `contact_person`, `email`
- Bins: Search in `code`, filter by `structure_data` fields
