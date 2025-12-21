# WMS Phase 3: API Reference

**Version**: 3.0
**Last Updated**: December 2025

## Overview

Phase 3 introduces **12 new API endpoints** for complete inventory management with FEFO (First Expired, First Out) enforcement. All endpoints follow RESTful conventions, return JSON responses, and include Hungarian user-facing messages for warehouse operations.

### Base URL

```
http://localhost:8000/api/v1
```

### Authentication

All Phase 3 endpoints require **JWT Bearer token authentication**:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

See `Phase1_Authentication.md` for token acquisition via `/api/v1/auth/login`.

### Content Type

```
Content-Type: application/json
```

### Hungarian Localization

All user-facing messages (`message`, error `detail`, warnings) are in Hungarian to support warehouse operations in Hungary. Technical field names remain in English for API consistency.

---

## Endpoint Categories

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Inventory Operations** | 8 | Receipt, issue, stock levels, expiry warnings, adjustments |
| **Movement History** | 2 | Audit trail queries with filters |
| **Reports** | 2 | Inventory summary and product location reporting |

---

## Inventory Operations

### POST /inventory/receive

Receive incoming goods into a bin with full traceability.

**Authentication**: warehouse+  (RequireWarehouse dependency)

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bin_id` | UUID | Yes | Must exist, empty or same product | Target bin for receipt |
| `product_id` | UUID | Yes | Must exist and be active | Product being received |
| `supplier_id` | UUID | No | Must exist and be active if provided | Supplier of goods |
| `batch_number` | string | Yes | 1-100 chars | Batch/lot number for traceability |
| `use_by_date` | date | Yes | Must be future (> today) | Expiration date (YYYY-MM-DD) |
| `best_before_date` | date | No | - | Optional quality guarantee date |
| `freeze_date` | date | No | Must be past or today if provided | Date product was frozen |
| `quantity` | decimal | Yes | > 0 | Quantity being received |
| `unit` | string | Yes | 1-50 chars | Unit of measurement (kg, db, l) |
| `pallet_count` | integer | No | > 0 if provided | Number of pallets |
| `weight_kg` | decimal | No | > 0 if provided | Total weight in kilograms |
| `reference_number` | string | No | Max 100 chars | PO number or delivery note |
| `notes` | string | No | - | Additional notes |

**Success Response (201 Created)**:

```json
{
  "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
  "movement_id": "650e8400-e29b-41d4-a716-446655440001",
  "bin_code": "A-01-02-03",
  "product_name": "Csirkemell filé",
  "quantity": 100.0,
  "unit": "kg",
  "use_by_date": "2025-03-15",
  "days_until_expiry": 54,
  "message": "Termék sikeresen beérkeztetve"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "A tárolóhely már foglalt másik termékkel." | Bin contains different product |
| 400 | "A szavatossági dátum nem lehet múltbeli." | use_by_date is past/today |
| 400 | "A fagyasztás dátuma nem lehet jövőbeli." | freeze_date is future |
| 400 | "A tárolóhely nem található." | Bin ID doesn't exist |
| 400 | "A termék nem található." | Product ID doesn't exist |
| 400 | "A beszállító nem található." | Supplier ID doesn't exist |
| 401 | "Nincs jogosultság" | Missing/invalid token |
| 403 | "Nincs jogosultság" | User role < warehouse |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/receive" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_id": "650e8400-e29b-41d4-a716-446655440000",
    "supplier_id": "750e8400-e29b-41d4-a716-446655440000",
    "batch_number": "BATCH-2025-001",
    "use_by_date": "2025-03-15",
    "quantity": 100.0,
    "unit": "kg",
    "pallet_count": 5,
    "weight_kg": 500.0,
    "reference_number": "PO-2025-001"
  }'
```

---

### POST /inventory/issue

Issue goods from a bin with FEFO enforcement.

**Authentication**: warehouse+ (RequireWarehouse dependency)

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bin_content_id` | UUID | Yes | Must exist with sufficient quantity | Bin content to issue from |
| `quantity` | decimal | Yes | > 0 and ≤ available | Quantity to issue |
| `reason` | string | Yes | 1-50 chars | Reason code (e.g., "sales_order") |
| `reference_number` | string | No | Max 100 chars | SO number or order reference |
| `force_non_fefo` | boolean | No | Default: false | Override FEFO (manager+ only) |
| `override_reason` | string | No | Required if force_non_fefo=true | Justification for override |
| `notes` | string | No | - | Additional notes |

**Success Response (200 OK)**:

```json
{
  "movement_id": "850e8400-e29b-41d4-a716-446655440002",
  "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
  "quantity_issued": 50.0,
  "remaining_quantity": 50.0,
  "use_by_date": "2025-03-15",
  "days_until_expiry": 54,
  "fefo_compliant": true,
  "warning": null,
  "message": "Termék sikeresen kiadva"
}
```

**Success Response with Warning (200 OK - Non-FEFO with Override)**:

```json
{
  "movement_id": "850e8400-e29b-41d4-a716-446655440002",
  "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
  "quantity_issued": 30.0,
  "remaining_quantity": 70.0,
  "use_by_date": "2025-06-30",
  "days_until_expiry": 161,
  "fefo_compliant": false,
  "warning": {
    "type": "fefo_violation",
    "message": "Figyelem: Ez nem a legrégebbi lejáratú tétel!"
  },
  "message": "Termék sikeresen kiadva"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "Nincs elegendő mennyiség a tárolóhelyen." | Quantity exceeds available |
| 400 | "A termék lejárt." | Product past use_by_date |
| 400 | "FEFO felülíráshoz adminisztrátori jóváhagyás szükséges." | force_non_fefo without override_reason |
| 409 | "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető." | Attempt to issue non-oldest without override |
| 401 | "Nincs jogosultság" | Missing/invalid token |
| 403 | "Nincs jogosultság" | force_non_fefo=true with role < manager |

**Example (FEFO-Compliant Issue)**:

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 50.0,
    "reason": "sales_order",
    "reference_number": "SO-2025-001"
  }'
```

**Example (Force Non-FEFO - Manager Override)**:

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/issue" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_content_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 30.0,
    "reason": "customer_request",
    "force_non_fefo": true,
    "override_reason": "Vevő kifejezett kérése",
    "notes": "Nem FEFO szerint"
  }'
```

---

### GET /inventory/fefo-recommendation

Get FEFO-compliant picking recommendations for a product.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `product_id` | UUID | Yes | Must exist | Product to get recommendations for |
| `quantity` | decimal | Yes | > 0 | Requested quantity |

**Success Response (200 OK)**:

```json
{
  "product_id": "650e8400-e29b-41d4-a716-446655440000",
  "product_name": "Csirkemell filé",
  "sku": "CSIRKE-001",
  "requested_quantity": 150.0,
  "recommendations": [
    {
      "bin_id": "550e8400-e29b-41d4-a716-446655440000",
      "bin_content_id": "660e8400-e29b-41d4-a716-446655440000",
      "bin_code": "A-01-02-03",
      "batch_number": "BATCH-2025-001",
      "use_by_date": "2025-03-15",
      "days_until_expiry": 54,
      "available_quantity": 100.0,
      "suggested_quantity": 100.0,
      "is_fefo_compliant": true,
      "warning": "Figyelem! Lejárat 54 nap múlva"
    },
    {
      "bin_id": "551e8400-e29b-41d4-a716-446655440000",
      "bin_content_id": "661e8400-e29b-41d4-a716-446655440000",
      "bin_code": "A-02-01-01",
      "batch_number": "BATCH-2025-002",
      "use_by_date": "2025-06-30",
      "days_until_expiry": 161,
      "available_quantity": 80.0,
      "suggested_quantity": 50.0,
      "is_fefo_compliant": true,
      "warning": null
    }
  ],
  "total_available": 180.0,
  "fefo_warnings": []
}
```

**Response with Critical Expiry Warning**:

```json
{
  "product_id": "650e8400-e29b-41d4-a716-446655440000",
  "product_name": "Tejföl",
  "sku": "TEJFOL-001",
  "requested_quantity": 20.0,
  "recommendations": [
    {
      "bin_id": "552e8400-e29b-41d4-a716-446655440000",
      "bin_content_id": "662e8400-e29b-41d4-a716-446655440000",
      "bin_code": "B-03-01-02",
      "batch_number": "BATCH-2025-045",
      "use_by_date": "2025-02-05",
      "days_until_expiry": 5,
      "available_quantity": 20.0,
      "suggested_quantity": 20.0,
      "is_fefo_compliant": true,
      "warning": "KRITIKUS! Lejárat 5 nap múlva"
    }
  ],
  "total_available": 20.0,
  "fefo_warnings": [
    "KRITIKUS: A legrégebbi tétel 7 napon belül lejár!"
  ]
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "A termék nem található." | Product ID doesn't exist |
| 401 | "Nincs jogosultság" | Missing/invalid token |

**Example**:

```bash
curl "http://localhost:8000/api/v1/inventory/fefo-recommendation?product_id=650e8400-e29b-41d4-a716-446655440000&quantity=150" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /inventory/stock-levels

Get aggregated stock levels by product.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `warehouse_id` | UUID | No | Filter by specific warehouse |
| `product_id` | UUID | No | Filter by specific product |

**Success Response (200 OK)**:

```json
[
  {
    "product_id": "650e8400-e29b-41d4-a716-446655440000",
    "product_name": "Csirkemell filé",
    "sku": "CSIRKE-001",
    "total_quantity": 180.0,
    "unit": "kg",
    "bin_count": 2,
    "batch_count": 2,
    "oldest_expiry": "2025-03-15",
    "newest_expiry": "2025-06-30",
    "locations": ["A-01-02-03", "A-02-01-01"]
  },
  {
    "product_id": "651e8400-e29b-41d4-a716-446655440000",
    "product_name": "Tejföl",
    "sku": "TEJFOL-001",
    "total_quantity": 50.0,
    "unit": "kg",
    "bin_count": 3,
    "batch_count": 3,
    "oldest_expiry": "2025-02-05",
    "newest_expiry": "2025-04-20",
    "locations": ["B-03-01-02", "B-04-02-01", "C-01-01-01"]
  }
]
```

**Response** (Empty): `[]` if no stock available

**Example**:

```bash
# All products in all warehouses
curl "http://localhost:8000/api/v1/inventory/stock-levels" \
  -H "Authorization: Bearer $TOKEN"

# Filter by warehouse
curl "http://localhost:8000/api/v1/inventory/stock-levels?warehouse_id=450e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"

# Filter by product
curl "http://localhost:8000/api/v1/inventory/stock-levels?product_id=650e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /inventory/expiry-warnings

Get expiry warnings for products approaching expiration.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `days_threshold` | integer | No | 1-365, default: 30 | Days ahead to check for expiry |
| `warehouse_id` | UUID | No | - | Filter by specific warehouse |

**Success Response (200 OK)**:

```json
{
  "items": [
    {
      "bin_content_id": "660e8400-e29b-41d4-a716-446655440000",
      "bin_code": "B-03-01-02",
      "warehouse_name": "Budapest Central",
      "product_name": "Tejföl",
      "sku": "TEJFOL-001",
      "batch_number": "BATCH-2025-045",
      "quantity": 20.0,
      "unit": "kg",
      "use_by_date": "2025-02-05",
      "days_until_expiry": 5,
      "urgency": "critical",
      "warning_message": "KRITIKUS! Lejárat 5 nap múlva"
    },
    {
      "bin_content_id": "661e8400-e29b-41d4-a716-446655440000",
      "bin_code": "A-01-02-03",
      "warehouse_name": "Budapest Central",
      "product_name": "Csirkemell filé",
      "sku": "CSIRKE-001",
      "batch_number": "BATCH-2025-001",
      "quantity": 100.0,
      "unit": "kg",
      "use_by_date": "2025-02-12",
      "days_until_expiry": 12,
      "urgency": "high",
      "warning_message": "FIGYELEM! Lejárat közel (12 nap)"
    },
    {
      "bin_content_id": "662e8400-e29b-41d4-a716-446655440000",
      "bin_code": "C-02-01-01",
      "warehouse_name": "Budapest Central",
      "product_name": "Joghurt",
      "sku": "JOGHURT-001",
      "batch_number": "BATCH-2025-089",
      "quantity": 30.0,
      "unit": "kg",
      "use_by_date": "2025-02-25",
      "days_until_expiry": 25,
      "urgency": "medium",
      "warning_message": "Figyelem: lejárat 25 nap múlva"
    }
  ],
  "summary": {
    "critical": 5,
    "high": 12,
    "medium": 25,
    "low": 8,
    "total": 50
  },
  "warehouse_id": null
}
```

**Urgency Levels**:
- **critical**: < 7 days
- **high**: 7-14 days
- **medium**: 15-30 days
- **low**: 31-60 days

**Example**:

```bash
# Default 30 days threshold
curl "http://localhost:8000/api/v1/inventory/expiry-warnings" \
  -H "Authorization: Bearer $TOKEN"

# Custom threshold (7 days)
curl "http://localhost:8000/api/v1/inventory/expiry-warnings?days_threshold=7" \
  -H "Authorization: Bearer $TOKEN"

# Filter by warehouse
curl "http://localhost:8000/api/v1/inventory/expiry-warnings?warehouse_id=450e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /inventory/expired

Get products that have already expired.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `warehouse_id` | UUID | No | Filter by specific warehouse |

**Success Response (200 OK)**:

```json
{
  "items": [
    {
      "bin_content_id": "663e8400-e29b-41d4-a716-446655440000",
      "bin_code": "C-05-02-01",
      "warehouse_name": "Budapest Central",
      "product_name": "Joghurt",
      "sku": "JOGHURT-001",
      "batch_number": "BATCH-2024-999",
      "quantity": 10.0,
      "unit": "kg",
      "use_by_date": "2025-01-10",
      "days_since_expiry": 21,
      "status": "expired",
      "action_required": "Selejtezés szükséges"
    }
  ],
  "total": 1,
  "warehouse_id": null
}
```

**Example**:

```bash
curl "http://localhost:8000/api/v1/inventory/expired" \
  -H "Authorization: Bearer $TOKEN"
```

---

### POST /inventory/adjust

Adjust stock quantity (manager+ only).

**Authentication**: manager+ (RequireManager dependency)

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bin_content_id` | UUID | Yes | Must exist | Bin content to adjust |
| `new_quantity` | decimal | Yes | ≥ 0 | New quantity (can be any value) |
| `reason` | string | Yes | 1-50 chars | Reason code (e.g., "stocktake") |
| `reference_number` | string | No | Max 100 chars | Reference document |
| `notes` | string | No | - | Additional notes |

**Success Response (200 OK)**:

```json
{
  "movement_id": "950e8400-e29b-41d4-a716-446655440003",
  "quantity_before": 100.0,
  "quantity_after": 95.0,
  "message": "Készlet módosítva"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "A tárolóhely tartalma nem található." | Bin content ID doesn't exist |
| 401 | "Nincs jogosultság" | Missing/invalid token |
| 403 | "Nincs jogosultság" | User role < manager |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/adjust" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_content_id": "660e8400-e29b-41d4-a716-446655440000",
    "new_quantity": 95.0,
    "reason": "stocktake",
    "reference_number": "STOCK-2025-001",
    "notes": "Leltári korrekció"
  }'
```

---

### POST /inventory/scrap

Scrap expired or damaged stock (manager+ only).

**Authentication**: manager+ (RequireManager dependency)

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `bin_content_id` | UUID | Yes | Must exist | Bin content to scrap |
| `reason` | string | Yes | 1-50 chars | Reason code (e.g., "expired") |
| `reference_number` | string | No | Max 100 chars | Scrap documentation |
| `notes` | string | No | - | Additional notes |

**Success Response (200 OK)**:

```json
{
  "movement_id": "960e8400-e29b-41d4-a716-446655440004",
  "quantity_scrapped": 10.0,
  "message": "Termék selejtezve"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "A tárolóhely tartalma nem található." | Bin content ID doesn't exist |
| 401 | "Nincs jogosultság" | Missing/invalid token |
| 403 | "Nincs jogosultság" | User role < manager |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/inventory/scrap" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_content_id": "663e8400-e29b-41d4-a716-446655440000",
    "reason": "expired",
    "reference_number": "SCRAP-2025-001",
    "notes": "Lejárt termék selejtezése"
  }'
```

---

## Movement History

### GET /movements

List all movements with filters (immutable audit trail).

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Validation | Description |
|-----------|------|----------|------------|-------------|
| `page` | integer | No | ≥ 1, default: 1 | Page number (1-indexed) |
| `page_size` | integer | No | 1-200, default: 50 | Items per page |
| `product_id` | UUID | No | - | Filter by product |
| `bin_id` | UUID | No | - | Filter by bin |
| `movement_type` | string | No | Enum: receipt, issue, adjustment, transfer, scrap | Filter by type |
| `start_date` | date | No | YYYY-MM-DD | Filter by start date (inclusive) |
| `end_date` | date | No | YYYY-MM-DD | Filter by end date (inclusive) |
| `created_by` | UUID | No | - | Filter by user who performed action |

**Success Response (200 OK)**:

```json
{
  "items": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440002",
      "movement_type": "issue",
      "bin_code": "A-01-02-03",
      "product_name": "Csirkemell filé",
      "sku": "CSIRKE-001",
      "batch_number": "BATCH-2025-001",
      "quantity": -50.0,
      "unit": "kg",
      "quantity_before": 100.0,
      "quantity_after": 50.0,
      "use_by_date": "2025-03-15",
      "reason": "sales_order",
      "reference_number": "SO-2025-001",
      "fefo_compliant": true,
      "force_override": false,
      "override_reason": null,
      "notes": null,
      "created_by": "warehouse_user",
      "created_at": "2025-01-20T14:15:00+01:00"
    },
    {
      "id": "750e8400-e29b-41d4-a716-446655440001",
      "movement_type": "receipt",
      "bin_code": "A-01-02-03",
      "product_name": "Csirkemell filé",
      "sku": "CSIRKE-001",
      "batch_number": "BATCH-2025-001",
      "quantity": 100.0,
      "unit": "kg",
      "quantity_before": 0.0,
      "quantity_after": 100.0,
      "use_by_date": "2025-03-15",
      "reason": "supplier_delivery",
      "reference_number": "PO-2025-001",
      "fefo_compliant": null,
      "force_override": false,
      "override_reason": null,
      "notes": "Friss áru beérkeztetés",
      "created_by": "admin",
      "created_at": "2025-01-15T08:30:00+01:00"
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

**Notes**:
- Movements are ordered by `created_at DESC` (newest first)
- Positive `quantity` = receipt, negative = issue/scrap
- `fefo_compliant` is `null` for non-issue movements
- Movement records are **immutable** (never updated or deleted)

**Example**:

```bash
# All movements (paginated)
curl "http://localhost:8000/api/v1/movements?page=1&page_size=50" \
  -H "Authorization: Bearer $TOKEN"

# Filter by product
curl "http://localhost:8000/api/v1/movements?product_id=650e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"

# Filter by movement type and date range
curl "http://localhost:8000/api/v1/movements?movement_type=issue&start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer $TOKEN"

# Filter by user
curl "http://localhost:8000/api/v1/movements?created_by=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /movements/{movement_id}

Get movement details by ID.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `movement_id` | UUID | Yes | Movement UUID |

**Success Response (200 OK)**:

```json
{
  "id": "850e8400-e29b-41d4-a716-446655440002",
  "movement_type": "issue",
  "bin_code": "A-01-02-03",
  "product_name": "Csirkemell filé",
  "sku": "CSIRKE-001",
  "batch_number": "BATCH-2025-001",
  "quantity": -50.0,
  "unit": "kg",
  "quantity_before": 100.0,
  "quantity_after": 50.0,
  "use_by_date": "2025-03-15",
  "reason": "sales_order",
  "reference_number": "SO-2025-001",
  "fefo_compliant": true,
  "force_override": false,
  "override_reason": null,
  "notes": "Vevői rendelés",
  "created_by": "warehouse_user",
  "created_at": "2025-01-20T14:15:00+01:00"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "A mozgás nem található." | Movement ID doesn't exist |
| 401 | "Nincs jogosultság" | Missing/invalid token |

**Example**:

```bash
curl "http://localhost:8000/api/v1/movements/850e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Reports

### GET /reports/inventory-summary

Get overall inventory summary.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `warehouse_id` | UUID | No | Filter by specific warehouse |

**Success Response (200 OK)**:

```json
[
  {
    "product_id": "650e8400-e29b-41d4-a716-446655440000",
    "product_name": "Csirkemell filé",
    "sku": "CSIRKE-001",
    "total_quantity": 180.0,
    "unit": "kg",
    "bin_count": 2,
    "batch_count": 2,
    "oldest_expiry": "2025-03-15",
    "newest_expiry": "2025-06-30",
    "locations": ["A-01-02-03", "A-02-01-01"]
  }
]
```

**Example**:

```bash
curl "http://localhost:8000/api/v1/reports/inventory-summary" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /reports/product-locations

Get all locations for a specific product.

**Authentication**: viewer+ (RequireViewer dependency - all roles)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | UUID | Yes | Product UUID |

**Success Response (200 OK)**:

```json
[
  {
    "product_id": "650e8400-e29b-41d4-a716-446655440000",
    "product_name": "Csirkemell filé",
    "sku": "CSIRKE-001",
    "total_quantity": 180.0,
    "unit": "kg",
    "bin_count": 2,
    "batch_count": 2,
    "oldest_expiry": "2025-03-15",
    "newest_expiry": "2025-06-30",
    "locations": ["A-01-02-03", "A-02-01-01"]
  }
]
```

**Example**:

```bash
curl "http://localhost:8000/api/v1/reports/product-locations?product_id=650e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"
```

---

## RBAC Permission Matrix

| Endpoint | admin | manager | warehouse | viewer |
|----------|-------|---------|-----------|--------|
| **Inventory Operations** |
| POST /inventory/receive | ✓ | ✓ | ✓ | - |
| POST /inventory/issue (FEFO) | ✓ | ✓ | ✓ | - |
| POST /inventory/issue (force) | ✓ | ✓ | - | - |
| GET /inventory/fefo-recommendation | ✓ | ✓ | ✓ | ✓ |
| GET /inventory/stock-levels | ✓ | ✓ | ✓ | ✓ |
| GET /inventory/expiry-warnings | ✓ | ✓ | ✓ | ✓ |
| GET /inventory/expired | ✓ | ✓ | ✓ | ✓ |
| POST /inventory/adjust | ✓ | ✓ | - | - |
| POST /inventory/scrap | ✓ | ✓ | - | - |
| **Movement History** |
| GET /movements | ✓ | ✓ | ✓ | ✓ |
| GET /movements/{id} | ✓ | ✓ | ✓ | ✓ |
| **Reports** |
| GET /reports/inventory-summary | ✓ | ✓ | ✓ | ✓ |
| GET /reports/product-locations | ✓ | ✓ | ✓ | ✓ |

**Role Hierarchy**: admin > manager > warehouse > viewer

**Key Points**:
- Warehouse users can receive/issue goods following FEFO
- Only managers can override FEFO with documented reason
- Only managers can adjust/scrap inventory
- All roles can view stock, warnings, and movements (read-only)

---

## Common Error Format

All errors follow this structure:

```json
{
  "detail": "A tárolóhely már foglalt másik termékkel."
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, POST for issue/adjust/scrap) |
| 201 | Created (POST /receive) |
| 400 | Bad Request (validation errors, business logic violations) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (FEFO violations) |
| 422 | Unprocessable Entity (Pydantic validation errors) |

---

## Pagination

Endpoints that return lists support pagination:

```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "pages": 3
}
```

**Default**: page=1, page_size=50
**Maximum**: page_size=200

---

## Date Formats

All dates use **ISO 8601** format:
- **Date**: `YYYY-MM-DD` (e.g., `2025-03-15`)
- **Datetime**: `YYYY-MM-DDTHH:MM:SS+TZ` (e.g., `2025-01-20T14:15:00+01:00`)

Timezone: **Europe/Budapest** (UTC+1, DST aware)

---

## Hungarian Error Messages Reference

| English Concept | Hungarian Message |
|----------------|-------------------|
| Receipt successful | "Termék sikeresen beérkeztetve" |
| Issue successful | "Termék sikeresen kiadva" |
| Stock adjusted | "Készlet módosítva" |
| Product scrapped | "Termék selejtezve" |
| FEFO violation | "FEFO szabály megsértése! Korábbi lejáratú tétel elérhető." |
| FEFO warning | "Figyelem: Ez nem a legrégebbi lejáratú tétel!" |
| Override required | "FEFO felülíráshoz adminisztrátori jóváhagyás szükséges." |
| Bin occupied | "A tárolóhely már foglalt másik termékkel." |
| Insufficient quantity | "Nincs elegendő mennyiség a tárolóhelyen." |
| Product expired | "A termék lejárt." |
| Expiry past | "A szavatossági dátum nem lehet múltbeli." |
| Freeze future | "A fagyasztás dátuma nem lehet jövőbeli." |
| Product not found | "A termék nem található." |
| Bin not found | "A tárolóhely nem található." |
| Supplier not found | "A beszállító nem található." |
| Movement not found | "A mozgás nem található." |
| Bin content not found | "A tárolóhely tartalma nem található." |
| No authorization | "Nincs jogosultság" |

---

## Testing Examples

### Happy Path: Full Workflow

```bash
# 1. Receive goods
RECEIPT=$(curl -X POST "http://localhost:8000/api/v1/inventory/receive" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bin_id": "...",
    "product_id": "...",
    "batch_number": "BATCH-2025-001",
    "use_by_date": "2025-03-15",
    "quantity": 100.0,
    "unit": "kg"
  }' | jq -r '.bin_content_id')

# 2. Get FEFO recommendation
curl "http://localhost:8000/api/v1/inventory/fefo-recommendation?product_id=...&quantity=50" \
  -H "Authorization: Bearer $TOKEN"

# 3. Issue goods (FEFO-compliant)
curl -X POST "http://localhost:8000/api/v1/inventory/issue" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"bin_content_id\": \"$RECEIPT\",
    \"quantity\": 50.0,
    \"reason\": \"sales_order\"
  }"

# 4. Check movement history
curl "http://localhost:8000/api/v1/movements?bin_id=..." \
  -H "Authorization: Bearer $TOKEN"

# 5. View stock levels
curl "http://localhost:8000/api/v1/inventory/stock-levels" \
  -H "Authorization: Bearer $TOKEN"
```

---

## See Also

- **Phase3_Overview.md** - Business context and feature summary
- **Phase3_Database_Schema.md** - BinContent, BinMovement table structures
- **Phase3_FEFO_Compliance.md** - FEFO algorithm deep dive
- **Phase3_Movement_Audit.md** - Audit trail and traceability
- **Phase3_Testing_Guide.md** - Test patterns for all endpoints
- **Phase1_Authentication.md** - JWT token acquisition and RBAC
