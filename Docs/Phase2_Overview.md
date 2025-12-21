# WMS Phase 2: Overview

**Version**: 2.0
**Last Updated**: December 2025

## What's New in Phase 2

Phase 2 expands the Warehouse Management System with master data management and storage location capabilities. Building on Phase 1's authentication and warehouse foundation, Phase 2 adds three new resources that enable complete warehouse operations:

### New Resources

1. **Products** - Product catalog management with SKU tracking and category filtering
2. **Suppliers** - Vendor management with Hungarian tax number validation
3. **Bins** - Storage location management with automated bulk generation

### Key Capabilities

- **Master Data Management**: Maintain product and supplier catalogs
- **Storage Organization**: Create and manage storage locations (bins) within warehouses
- **Bulk Operations**: Generate hundreds of bins at once using range specifications
- **Advanced Search**: Full-text search across products, suppliers, and bins
- **Hungarian Localization**: All user-facing messages in Hungarian

---

## Quick Reference

### New API Endpoints: 15

| Resource | Endpoints | Key Features |
|----------|-----------|--------------|
| Products | 5 | CRUD, SKU validation, category filtering, search |
| Suppliers | 5 | CRUD, Hungarian tax number validation, search |
| Bins | 7 | CRUD, warehouse filtering, bulk generation, bulk preview |

### New Database Tables: 3

| Table | Description | Key Constraints |
|-------|-------------|-----------------|
| `products` | Product catalog | Unique SKU |
| `suppliers` | Vendor information | Hungarian tax number format |
| `bins` | Storage locations | Unique code, status enum |

### Test Coverage: 48 New Tests

| Resource | Tests | Coverage |
|----------|-------|----------|
| Products | 16 | CRUD, validation, RBAC, search |
| Suppliers | 16 | CRUD, tax number validation, RBAC |
| Bins | 16 | CRUD, bulk generation, conflict detection |
| **Total** | **48** | **~85% coverage** |

---

## Phase 1 vs Phase 2 Comparison

| Aspect | Phase 1 | Phase 2 | Total |
|--------|---------|---------|-------|
| **Resources** | Users, Warehouses | +Products, Suppliers, Bins | 5 resources |
| **API Endpoints** | 12 | +15 | 27 endpoints |
| **Database Tables** | 2 | +3 | 5 tables |
| **Test Suite** | 40 tests | +48 tests | 88 tests |
| **Features** | Auth, RBAC, Warehouses | +Master data, Storage locations | Complete foundation |

---

## New Features in Detail

### Products Management

Maintain a centralized product catalog with:
- **Unique SKU tracking** for inventory control
- **Category organization** for filtering and reporting
- **Default units** (db, kg, l, etc.) for Hungarian measurements
- **Soft delete** with `is_active` flag
- **Full-text search** in name, SKU, and category

**RBAC**: Manager+ can create/update/delete, Viewer+ can read

### Suppliers Management

Track vendor information with:
- **Hungarian tax number validation** (format: `XXXXXXXX-X-XX`)
- **Contact information** (person, email, phone)
- **Address tracking** for delivery coordination
- **Soft delete** with `is_active` flag
- **Search** across company name, contact, and email

**RBAC**: Manager+ can create/update/delete, Viewer+ can read

### Bins Management

Organize warehouse storage with:
- **Template-based structure** from warehouse bin_structure_template
- **Status tracking** (empty, occupied, reserved, inactive)
- **Physical constraints** (max_weight, max_height)
- **Bulk generation** for rapid warehouse setup
- **Conflict detection** before bulk creation

**RBAC**:
- Warehouse+ can create/update/delete individual bins
- Manager+ required for bulk operations
- Viewer+ can read

---

## Bulk Bin Generation

The most powerful Phase 2 feature: create hundreds of bins in seconds.

### How It Works

1. Define warehouse structure template (Phase 1)
2. Specify ranges for each field (e.g., aisles A-C, racks 1-10, levels 1-5)
3. Preview generation (count, sample codes, conflicts)
4. Create all bins in one transaction

### Example

**Input**:
```json
{
  "warehouse_id": "uuid",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 10},
    "level": {"start": 1, "end": 5},
    "position": {"start": 1, "end": 4}
  }
}
```

**Result**: 600 bins created (3 × 10 × 5 × 4) with codes like:
- A-01-01-01, A-01-01-02, A-01-01-03, A-01-01-04
- A-01-02-01, A-01-02-02, ...
- B-01-01-01, B-01-01-02, ...
- C-10-05-04 (last bin)

**Time Saved**: ~3 hours of manual work → 1 second

See [Phase2_Bulk_Generation.md](Phase2_Bulk_Generation.md) for algorithm details.

---

## Migration Path

### Prerequisites

- Phase 1 must be deployed and running
- PostgreSQL 17+ or compatible database
- Python 3.13+ with all Phase 2 dependencies

### Database Migrations

Three new tables will be created:

```bash
# Apply Phase 2 migrations
cd w7-WHv1/backend
alembic upgrade head
```

This creates:
1. `products` table with SKU uniqueness constraint
2. `suppliers` table with tax number field
3. `bins` table with foreign key to `warehouses`

### Breaking Changes

**None** - Phase 2 is fully backward compatible with Phase 1.

### Rollback Plan

If needed, rollback migrations:

```bash
# Find current revision
alembic current

# Rollback to Phase 1 (last revision before Phase 2)
alembic downgrade <phase1_revision>
```

---

## API Authentication

All Phase 2 endpoints use the same JWT authentication as Phase 1:

```bash
# Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin123!"

# Use token in subsequent requests
curl -X GET "http://localhost:8000/api/v1/products" \
  -H "Authorization: Bearer <access_token>"
```

---

## RBAC Summary

Phase 2 follows Phase 1 RBAC patterns:

| Role | Products | Suppliers | Bins (Single) | Bins (Bulk) |
|------|----------|-----------|---------------|-------------|
| **viewer** | Read | Read | Read | - |
| **warehouse** | Read | Read | Full CRUD | - |
| **manager** | Full CRUD | Full CRUD | Full CRUD | Full CRUD |
| **admin** | Full CRUD | Full CRUD | Full CRUD | Full CRUD |

See [Phase2_API_Reference.md](Phase2_API_Reference.md) for detailed permission matrix.

---

## Documentation Structure

Phase 2 documentation is organized as follows:

### Core Documentation

- **[Phase2_Overview.md](Phase2_Overview.md)** (this file) - Quick reference and summary
- **[Phase2_API_Reference.md](Phase2_API_Reference.md)** - Complete endpoint documentation with examples
- **[Phase2_Database_Schema.md](Phase2_Database_Schema.md)** - ERD and table schemas
- **[Phase2_Bulk_Generation.md](Phase2_Bulk_Generation.md)** - Bulk generation algorithm deep dive
- **[Phase2_Testing_Guide.md](Phase2_Testing_Guide.md)** - Test patterns and examples

### Phase 1 Documentation (Still Relevant)

- [Phase1_Architecture.md](Phase1_Architecture.md) - System architecture (applies to Phase 2)
- [Phase1_Authentication.md](Phase1_Authentication.md) - JWT and RBAC (no changes)
- [Phase1_Development_Guide.md](Phase1_Development_Guide.md) - Setup and workflow

---

## What's Next: Phase 3+

Phase 2 provides the foundation for inventory operations. Planned for Phase 3:

- **Bin Contents** - Track what products are in which bins
- **FEFO Logic** - First Expired, First Out inventory management
- **Stock Movements** - Incoming goods, outgoing shipments, transfers
- **Batch/Lot Tracking** - Track product batches with expiry dates
- **Reporting** - Inventory reports, movement history, FEFO warnings
- **Frontend** - React 19 + Tailwind v4 web interface

---

## Getting Started

### For API Consumers

1. Read [Phase2_API_Reference.md](Phase2_API_Reference.md) for endpoint details
2. Test with curl examples or import into Postman
3. Check Hungarian error messages for proper error handling

### For Backend Developers

1. Review [Phase2_Database_Schema.md](Phase2_Database_Schema.md) for table structures
2. Study [Phase2_Bulk_Generation.md](Phase2_Bulk_Generation.md) for algorithm understanding
3. Review [Phase2_Testing_Guide.md](Phase2_Testing_Guide.md) for test patterns

### For Frontend Developers

1. Start with [Phase2_API_Reference.md](Phase2_API_Reference.md) for endpoint contracts
2. Note Hungarian localization requirements
3. Plan UI flows for bulk bin generation

---

## Support

- **Documentation**: See links above
- **API Playground**: http://localhost:8000/docs (Swagger UI)
- **Health Check**: http://localhost:8000/health
- **Test Suite**: `pytest w7-WHv1/backend/app/tests/` (88 tests)

---

## License

Proprietary - All rights reserved.
