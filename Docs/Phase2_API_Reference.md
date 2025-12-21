# WMS Phase 2: API Reference

**Version**: 2.0
**Base URL**: `/api/v1`
**Last Updated**: December 2025

## Overview

Phase 2 adds 15 new API endpoints for managing products, suppliers, and storage bins. All endpoints require JWT authentication via Bearer token unless otherwise noted.

**Authentication Header**:
```
Authorization: Bearer <access_token>
```

---

## Products Endpoints

### GET /products

List all products with pagination and optional filtering.

**Authentication**: Required (viewer or higher)

**Query Parameters**:
| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| page | integer | 1 | ≥ 1 | Page number (1-indexed) |
| page_size | integer | 50 | 1-200 | Items per page |
| is_active | boolean | null | - | Filter by active status |
| category | string | null | max 100 chars | Filter by exact category match |
| search | string | null | - | Search in name, SKU, or category (case-insensitive) |

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Tej 2.8%",
      "sku": "MILK-2.8-1L",
      "category": "tejtermékek",
      "default_unit": "db",
      "description": "Friss tej 1 literes kiszerelés",
      "is_active": true,
      "created_at": "2025-12-21T10:00:00Z",
      "updated_at": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 422 | Érvényesítési hiba. | Invalid query parameters (e.g., page < 1, page_size > 200) |

**Example**:
```bash
# List all active products in dairy category
curl -X GET "http://localhost:8000/api/v1/products?category=tejtermékek&is_active=true" \
  -H "Authorization: Bearer <token>"

# Search for products containing "tej"
curl -X GET "http://localhost:8000/api/v1/products?search=tej" \
  -H "Authorization: Bearer <token>"
```

---

### POST /products

Create a new product.

**Authentication**: Required (manager or admin)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "name": "Tej 2.8%",
  "sku": "MILK-2.8-1L",
  "category": "tejtermékek",
  "default_unit": "db",
  "description": "Friss tej 1 literes kiszerelés",
  "is_active": true
}
```

**Field Validation**:
| Field | Type | Required | Constraints | Default |
|-------|------|----------|-------------|---------|
| name | string | Yes | 2-255 chars | - |
| sku | string | No | 3-100 chars, unique | null |
| category | string | No | max 100 chars | null |
| default_unit | string | No | max 50 chars | "db" |
| description | string | No | - | null |
| is_active | boolean | No | - | true |

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Tej 2.8%",
  "sku": "MILK-2.8-1L",
  "category": "tejtermékek",
  "default_unit": "db",
  "description": "Friss tej 1 literes kiszerelés",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T10:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 409 | Ilyen SKU-val már létezik termék. | SKU already exists |
| 422 | A termék neve kötelező. | Name is less than 2 characters |

**Example**:
```bash
curl -X POST "http://localhost:8000/api/v1/products" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tej 2.8%",
    "sku": "MILK-2.8-1L",
    "category": "tejtermékek",
    "default_unit": "db",
    "description": "Friss tej 1 literes kiszerelés"
  }'
```

---

### GET /products/{product_id}

Get a single product by ID.

**Authentication**: Required (viewer or higher)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| product_id | UUID | Product unique identifier |

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Tej 2.8%",
  "sku": "MILK-2.8-1L",
  "category": "tejtermékek",
  "default_unit": "db",
  "description": "Friss tej 1 literes kiszerelés",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T10:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 404 | A termék nem található. | Product ID does not exist |
| 422 | Érvényesítési hiba. | Invalid UUID format |

**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/products/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

---

### PUT /products/{product_id}

Update an existing product.

**Authentication**: Required (manager or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| product_id | UUID | Product unique identifier |

**Request Body** (all fields optional):
```json
{
  "name": "Tej 2.8% (friss)",
  "sku": "MILK-2.8-1L-V2",
  "category": "tejtermékek",
  "default_unit": "db",
  "description": "Friss tej 1 literes kiszerelés, új csomagolás",
  "is_active": true
}
```

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Tej 2.8% (friss)",
  "sku": "MILK-2.8-1L-V2",
  "category": "tejtermékek",
  "default_unit": "db",
  "description": "Friss tej 1 literes kiszerelés, új csomagolás",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T11:30:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 404 | A termék nem található. | Product ID does not exist |
| 409 | Ilyen SKU-val már létezik termék. | New SKU conflicts with existing product |
| 422 | Érvényesítési hiba. | Invalid field values |

**Example**:
```bash
curl -X PUT "http://localhost:8000/api/v1/products/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

---

### DELETE /products/{product_id}

Delete a product.

**Authentication**: Required (manager or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| product_id | UUID | Product unique identifier |

**Success Response** (204 No Content):
```
(empty body)
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 404 | A termék nem található. | Product ID does not exist |

**Note**: In Phase 3, products with inventory in bins cannot be deleted.

**Example**:
```bash
curl -X DELETE "http://localhost:8000/api/v1/products/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

---

## Suppliers Endpoints

### GET /suppliers

List all suppliers with pagination and optional filtering.

**Authentication**: Required (viewer or higher)

**Query Parameters**:
| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| page | integer | 1 | ≥ 1 | Page number (1-indexed) |
| page_size | integer | 50 | 1-200 | Items per page |
| is_active | boolean | null | - | Filter by active status |
| search | string | null | - | Search in company_name, contact_person, or email (case-insensitive) |

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": "650e8400-e29b-41d4-a716-446655440001",
      "company_name": "Tejgazdaság Kft.",
      "contact_person": "Nagy János",
      "email": "janos.nagy@tejgazdasag.hu",
      "phone": "+36 1 234 5678",
      "address": "1117 Budapest, Irinyi József utca 42.",
      "tax_number": "12345678-2-42",
      "is_active": true,
      "created_at": "2025-12-21T09:00:00Z",
      "updated_at": "2025-12-21T09:00:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 422 | Érvényesítési hiba. | Invalid query parameters |

**Example**:
```bash
# Search for suppliers containing "tej"
curl -X GET "http://localhost:8000/api/v1/suppliers?search=tej" \
  -H "Authorization: Bearer <token>"

# List only active suppliers
curl -X GET "http://localhost:8000/api/v1/suppliers?is_active=true" \
  -H "Authorization: Bearer <token>"
```

---

### POST /suppliers

Create a new supplier.

**Authentication**: Required (manager or admin)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "company_name": "Tejgazdaság Kft.",
  "contact_person": "Nagy János",
  "email": "janos.nagy@tejgazdasag.hu",
  "phone": "+36 1 234 5678",
  "address": "1117 Budapest, Irinyi József utca 42.",
  "tax_number": "12345678-2-42",
  "is_active": true
}
```

**Field Validation**:
| Field | Type | Required | Constraints | Default |
|-------|------|----------|-------------|---------|
| company_name | string | Yes | 2-255 chars | - |
| contact_person | string | No | max 255 chars | null |
| email | string | No | valid email format | null |
| phone | string | No | max 50 chars | null |
| address | string | No | - | null |
| tax_number | string | No | Hungarian format: `XXXXXXXX-X-XX` | null |
| is_active | boolean | No | - | true |

**Hungarian Tax Number Format**:
- Pattern: `^\d{8}-\d-\d{2}$`
- Example: `12345678-2-42`
- 8 digits, dash, 1 digit, dash, 2 digits

**Success Response** (201 Created):
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
  "created_at": "2025-12-21T09:00:00Z",
  "updated_at": "2025-12-21T09:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 422 | A cég neve kötelező. | company_name is less than 2 characters |
| 422 | Érvénytelen adószám formátum. | tax_number doesn't match Hungarian format |

**Example**:
```bash
curl -X POST "http://localhost:8000/api/v1/suppliers" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Tejgazdaság Kft.",
    "contact_person": "Nagy János",
    "email": "janos.nagy@tejgazdasag.hu",
    "phone": "+36 1 234 5678",
    "tax_number": "12345678-2-42"
  }'
```

---

### GET /suppliers/{supplier_id}

Get a single supplier by ID.

**Authentication**: Required (viewer or higher)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| supplier_id | UUID | Supplier unique identifier |

**Success Response** (200 OK):
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
  "created_at": "2025-12-21T09:00:00Z",
  "updated_at": "2025-12-21T09:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 404 | A beszállító nem található. | Supplier ID does not exist |

**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/suppliers/650e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <token>"
```

---

### PUT /suppliers/{supplier_id}

Update an existing supplier.

**Authentication**: Required (manager or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| supplier_id | UUID | Supplier unique identifier |

**Request Body** (all fields optional):
```json
{
  "company_name": "Tejgazdaság Kft. (Új név)",
  "contact_person": "Kiss Péter",
  "email": "peter.kiss@tejgazdasag.hu",
  "phone": "+36 1 234 9999",
  "tax_number": "87654321-1-43",
  "is_active": true
}
```

**Success Response** (200 OK):
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440001",
  "company_name": "Tejgazdaság Kft. (Új név)",
  "contact_person": "Kiss Péter",
  "email": "peter.kiss@tejgazdasag.hu",
  "phone": "+36 1 234 9999",
  "address": "1117 Budapest, Irinyi József utca 42.",
  "tax_number": "87654321-1-43",
  "is_active": true,
  "created_at": "2025-12-21T09:00:00Z",
  "updated_at": "2025-12-21T10:30:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 404 | A beszállító nem található. | Supplier ID does not exist |
| 422 | Érvénytelen adószám formátum. | tax_number doesn't match format |

**Example**:
```bash
curl -X PUT "http://localhost:8000/api/v1/suppliers/650e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+36 1 234 9999"}'
```

---

### DELETE /suppliers/{supplier_id}

Delete a supplier.

**Authentication**: Required (manager or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| supplier_id | UUID | Supplier unique identifier |

**Success Response** (204 No Content):
```
(empty body)
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 404 | A beszállító nem található. | Supplier ID does not exist |

**Note**: In Phase 3, suppliers with inventory cannot be deleted.

**Example**:
```bash
curl -X DELETE "http://localhost:8000/api/v1/suppliers/650e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer <token>"
```

---

## Bins Endpoints

### GET /bins

List all bins with pagination and optional filtering.

**Authentication**: Required (viewer or higher)

**Query Parameters**:
| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| page | integer | 1 | ≥ 1 | Page number (1-indexed) |
| page_size | integer | 50 | 1-200 | Items per page |
| warehouse_id | UUID | null | - | Filter by warehouse |
| status | string | null | enum | Filter by status (empty, occupied, reserved, inactive) |
| search | string | null | - | Search in bin code (case-insensitive) |

**Success Response** (200 OK):
```json
{
  "items": [
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
      "notes": null,
      "is_active": true,
      "created_at": "2025-12-21T08:00:00Z",
      "updated_at": "2025-12-21T08:00:00Z"
    }
  ],
  "total": 600,
  "page": 1,
  "page_size": 50,
  "pages": 12
}
```

**Bin Status Values**:
| Value | Hungarian | Description |
|-------|-----------|-------------|
| empty | Üres | No product in bin |
| occupied | Foglalt | Contains product |
| reserved | Lefoglalt | Reserved for incoming goods |
| inactive | Inaktív | Temporarily unavailable |

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 422 | Érvényesítési hiba. | Invalid query parameters |

**Example**:
```bash
# List bins in warehouse A
curl -X GET "http://localhost:8000/api/v1/bins?warehouse_id=450e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"

# Search for bins in aisle A
curl -X GET "http://localhost:8000/api/v1/bins?search=A-" \
  -H "Authorization: Bearer <token>"

# Filter by status
curl -X GET "http://localhost:8000/api/v1/bins?status=empty" \
  -H "Authorization: Bearer <token>"
```

---

### POST /bins

Create a new bin.

**Authentication**: Required (warehouse, manager, or admin)

**Content-Type**: `application/json`

**Request Body**:
```json
{
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
  "notes": "Ground level bin",
  "is_active": true
}
```

**Field Validation**:
| Field | Type | Required | Constraints | Default |
|-------|------|----------|-------------|---------|
| warehouse_id | UUID | Yes | must exist | - |
| code | string | Yes | 1-100 chars, unique | - |
| structure_data | object | Yes | matches warehouse template | - |
| status | string | No | enum (empty, occupied, reserved, inactive) | "empty" |
| max_weight | number | No | > 0 (kg) | null |
| max_height | number | No | > 0 (cm) | null |
| accessibility | string | No | max 50 chars | null |
| notes | string | No | - | null |
| is_active | boolean | No | - | true |

**Success Response** (201 Created):
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
  "notes": "Ground level bin",
  "is_active": true,
  "created_at": "2025-12-21T08:00:00Z",
  "updated_at": "2025-12-21T08:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is viewer only |
| 409 | Ilyen kódú tárolóhely már létezik. | Bin code already exists |
| 422 | Érvényesítési hiba. | Invalid field values |

**Example**:
```bash
curl -X POST "http://localhost:8000/api/v1/bins" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
    "code": "A-01-02-03",
    "structure_data": {"aisle": "A", "rack": "01", "level": "02", "position": "03"},
    "max_weight": 1000.0,
    "max_height": 200.0
  }'
```

---

### GET /bins/{bin_id}

Get a single bin by ID.

**Authentication**: Required (viewer or higher)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| bin_id | UUID | Bin unique identifier |

**Success Response** (200 OK):
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
  "notes": "Ground level bin",
  "is_active": true,
  "created_at": "2025-12-21T08:00:00Z",
  "updated_at": "2025-12-21T08:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 404 | A tárolóhely nem található. | Bin ID does not exist |

**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/bins/750e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer <token>"
```

---

### PUT /bins/{bin_id}

Update an existing bin.

**Authentication**: Required (warehouse, manager, or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| bin_id | UUID | Bin unique identifier |

**Request Body** (all fields optional):
```json
{
  "code": "A-01-02-04",
  "max_weight": 1500.0,
  "max_height": 220.0,
  "accessibility": "narrow forklift",
  "notes": "Updated capacity",
  "is_active": false
}
```

**Success Response** (200 OK):
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440002",
  "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
  "code": "A-01-02-04",
  "structure_data": {
    "aisle": "A",
    "rack": "01",
    "level": "02",
    "position": "03"
  },
  "status": "empty",
  "max_weight": 1500.0,
  "max_height": 220.0,
  "accessibility": "narrow forklift",
  "notes": "Updated capacity",
  "is_active": false,
  "created_at": "2025-12-21T08:00:00Z",
  "updated_at": "2025-12-21T11:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is viewer only |
| 404 | A tárolóhely nem található. | Bin ID does not exist |
| 409 | Ilyen kódú tárolóhely már létezik. | New code conflicts with existing bin |

**Example**:
```bash
curl -X PUT "http://localhost:8000/api/v1/bins/750e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"max_weight": 1500.0}'
```

---

### DELETE /bins/{bin_id}

Delete a bin.

**Authentication**: Required (warehouse, manager, or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| bin_id | UUID | Bin unique identifier |

**Success Response** (204 No Content):
```
(empty body)
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is viewer only |
| 404 | A tárolóhely nem található. | Bin ID does not exist |
| 409 | A tárolóhely nem üres, nem törölhető. | Bin status is not "empty" |

**Important**: Bins can only be deleted if their status is "empty". Bins with status "occupied", "reserved", or "inactive" cannot be deleted.

**Example**:
```bash
curl -X DELETE "http://localhost:8000/api/v1/bins/750e8400-e29b-41d4-a716-446655440002" \
  -H "Authorization: Bearer <token>"
```

---

### POST /bins/bulk/preview

Preview bulk bin generation without creating bins.

**Authentication**: Required (manager or admin)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 10},
    "level": {"start": 1, "end": 5},
    "position": {"start": 1, "end": 4}
  }
}
```

**Range Specification Formats**:
- **List format**: `["A", "B", "C"]` - discrete values
- **Range format**: `{"start": 1, "end": 10}` - numeric sequence (inclusive)

**Success Response** (200 OK):
```json
{
  "count": 600,
  "sample_codes": [
    "A-01-01-01",
    "A-01-01-02",
    "A-01-01-03",
    "A-01-01-04",
    "A-01-02-01",
    "A-01-02-02",
    "A-01-02-03",
    "A-01-02-04",
    "A-01-03-01",
    "A-01-03-02",
    "A-01-03-03",
    "A-01-03-04",
    "A-01-04-01",
    "A-01-04-02",
    "A-01-04-03",
    "A-01-04-04",
    "A-01-05-01",
    "A-01-05-02",
    "A-01-05-03",
    "A-01-05-04"
  ],
  "conflicts": [],
  "valid": true
}
```

**Response Fields**:
| Field | Type | Description |
|-------|------|-------------|
| count | integer | Total number of bins that will be created |
| sample_codes | array | First 20 bin codes (preview) |
| conflicts | array | Existing bin codes that conflict (prevents creation) |
| valid | boolean | True if no conflicts, false if conflicts exist |

**If Conflicts Exist**:
```json
{
  "count": 600,
  "sample_codes": ["A-01-01-01", "..."],
  "conflicts": ["A-01-01-01", "A-01-01-05", "B-02-03-01"],
  "valid": false
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 400 | A raktár nem található. | Warehouse ID does not exist |
| 400 | Missing range for field: rack | Range not provided for required field |
| 400 | Invalid range specification | Range format is invalid |

**Example**:
```bash
curl -X POST "http://localhost:8000/api/v1/bins/bulk/preview" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
    "ranges": {
      "aisle": ["A", "B"],
      "rack": {"start": 1, "end": 5},
      "level": {"start": 1, "end": 3},
      "position": {"start": 1, "end": 2}
    }
  }'
```

---

### POST /bins/bulk

Create bins in bulk based on range specifications.

**Authentication**: Required (manager or admin)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 10},
    "level": {"start": 1, "end": 5},
    "position": {"start": 1, "end": 4}
  },
  "defaults": {
    "max_weight": 1000.0,
    "max_height": 200.0,
    "accessibility": "forklift"
  }
}
```

**Request Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| warehouse_id | UUID | Yes | Target warehouse |
| ranges | object | Yes | Range specifications for each template field |
| defaults | object | No | Default values for all generated bins |

**Defaults Object** (all optional):
| Field | Type | Description |
|-------|------|-------------|
| max_weight | number | Weight capacity for all bins (kg) |
| max_height | number | Height limit for all bins (cm) |
| accessibility | string | Accessibility notes for all bins |

**Success Response** (201 Created):
```json
{
  "created": 600,
  "message": "600 tárolóhely létrehozva"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Nem azonosított felhasználó. | Missing or invalid token |
| 403 | Nincs megfelelő jogosultsága ehhez a művelethez. | User is not manager or admin |
| 400 | A raktár nem található. | Warehouse ID does not exist |
| 400 | Ütköző kódok találhatók: A-01-01-01, A-01-02-03, ... | Conflict with existing bins |
| 400 | Nem jött létre egyetlen tárolóhely sem. | Empty ranges (no bins to create) |
| 400 | Missing range for field: rack | Range not provided for required field |

**Algorithm Details**:
1. Extract fields from warehouse `bin_structure_template`
2. Expand each range to list of values
3. Compute Cartesian product of all field values
4. Apply formatting (auto_uppercase, zero_padding) per template
5. Generate bin code from template format string
6. Check for conflicts with existing bins
7. Bulk insert all bins in single transaction

See [Phase2_Bulk_Generation.md](Phase2_Bulk_Generation.md) for detailed algorithm explanation.

**Example**:
```bash
# Create 60 bins (2 aisles × 5 racks × 3 levels × 2 positions)
curl -X POST "http://localhost:8000/api/v1/bins/bulk" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
    "ranges": {
      "aisle": ["A", "B"],
      "rack": {"start": 1, "end": 5},
      "level": {"start": 1, "end": 3},
      "position": {"start": 1, "end": 2}
    },
    "defaults": {
      "max_weight": 1000.0,
      "max_height": 180.0,
      "accessibility": "forklift"
    }
  }'
```

---

## RBAC Permission Matrix

Phase 2 endpoints follow role-based access control:

| Resource | Action | viewer | warehouse | manager | admin |
|----------|--------|--------|-----------|---------|-------|
| **Products** | List (GET) | ✓ | ✓ | ✓ | ✓ |
| | Create (POST) | ✗ | ✗ | ✓ | ✓ |
| | Read (GET /{id}) | ✓ | ✓ | ✓ | ✓ |
| | Update (PUT) | ✗ | ✗ | ✓ | ✓ |
| | Delete (DELETE) | ✗ | ✗ | ✓ | ✓ |
| **Suppliers** | List (GET) | ✓ | ✓ | ✓ | ✓ |
| | Create (POST) | ✗ | ✗ | ✓ | ✓ |
| | Read (GET /{id}) | ✓ | ✓ | ✓ | ✓ |
| | Update (PUT) | ✗ | ✗ | ✓ | ✓ |
| | Delete (DELETE) | ✗ | ✗ | ✓ | ✓ |
| **Bins** | List (GET) | ✓ | ✓ | ✓ | ✓ |
| | Create (POST) | ✗ | ✓ | ✓ | ✓ |
| | Read (GET /{id}) | ✓ | ✓ | ✓ | ✓ |
| | Update (PUT) | ✗ | ✓ | ✓ | ✓ |
| | Delete (DELETE) | ✗ | ✓ | ✓ | ✓ |
| | Bulk Preview (POST) | ✗ | ✗ | ✓ | ✓ |
| | Bulk Create (POST) | ✗ | ✗ | ✓ | ✓ |

**Role Hierarchy**:
- **admin** - Full system access
- **manager** - All CRUD operations + bulk operations
- **warehouse** - Products/Suppliers read + Bins CRUD (no bulk)
- **viewer** - Read-only access to all resources

---

## Search and Filtering Patterns

### Products Search
Search is performed across multiple fields with case-insensitive partial matching:
- `name` - Product name
- `sku` - Stock Keeping Unit
- `category` - Category name

Example: `?search=tej` matches products with "tej" in name, SKU, or category.

### Suppliers Search
Search is performed across:
- `company_name` - Company name
- `contact_person` - Contact person name
- `email` - Email address

Example: `?search=nagy` matches suppliers with "nagy" in any of these fields.

### Bins Search
Search is performed on:
- `code` - Bin code (case-insensitive)

Example: `?search=A-01` matches all bins with codes containing "A-01".

---

## Common Error Response Format

All Phase 2 endpoints return errors in a consistent format:

**Standard Error** (4xx, 5xx):
```json
{
  "detail": "A termék nem található."
}
```

**Validation Error** (422):
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "name"],
      "msg": "A termék neve kötelező.",
      "input": "x"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT requests |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | User lacks required role/permission |
| 404 | Not Found | Resource ID does not exist |
| 409 | Conflict | Unique constraint violation (SKU, code, etc.) |
| 422 | Unprocessable Entity | Validation error (invalid field values) |
| 500 | Internal Server Error | Unexpected server error |

---

## Pagination

All list endpoints return paginated results with metadata:

**Response Structure**:
```json
{
  "items": [...],
  "total": 100,
  "page": 2,
  "page_size": 50,
  "pages": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| items | array | Current page of results |
| total | integer | Total number of items matching filters |
| page | integer | Current page number (1-indexed) |
| page_size | integer | Number of items per page |
| pages | integer | Total number of pages |

**Constraints**:
- `page` must be ≥ 1
- `page_size` must be 1-200
- Default `page_size` is 50

---

## Rate Limiting

Phase 2 uses the same rate limiting as Phase 1:
- **Global limit**: 100 requests per minute per IP
- **Authenticated limit**: 1000 requests per minute per user

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1703167200
```

---

## API Versioning

All Phase 2 endpoints are under `/api/v1`. Future versions will use `/api/v2`, etc.

**Version Header** (optional):
```
Accept: application/json; version=1
```

---

## Additional Resources

- **[Phase2_Overview.md](Phase2_Overview.md)** - Quick reference and feature summary
- **[Phase2_Database_Schema.md](Phase2_Database_Schema.md)** - Database tables and relationships
- **[Phase2_Bulk_Generation.md](Phase2_Bulk_Generation.md)** - Detailed bulk generation algorithm
- **[Phase2_Testing_Guide.md](Phase2_Testing_Guide.md)** - Test patterns and examples
- **[Phase1_Authentication.md](Phase1_Authentication.md)** - JWT and RBAC details

---

## Support

- **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
