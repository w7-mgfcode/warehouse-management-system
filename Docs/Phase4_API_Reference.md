# WMS Phase 4: API Reference

**Version**: 4.0
**Last Updated**: December 2025

## Overview

Phase 4 adds **18 new API endpoints** for stock transfers, reservations, and background job management.

| Resource | Base Path | Endpoints | Description |
|----------|-----------|-----------|-------------|
| Transfers | `/api/v1/transfers` | 8 | Same-warehouse and cross-warehouse transfers |
| Reservations | `/api/v1/reservations` | 6 | FEFO-ordered stock reservations |
| Jobs | `/api/v1/jobs` | 4 | Background job monitoring and triggers |

---

## Transfers API

### POST /transfers

**Create a same-warehouse transfer (warehouse+ only)**

Moves stock from one bin to another within the same warehouse. Creates paired transfer_out/transfer_in movement records.

**Authentication**: `warehouse`, `manager`, `admin`

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `source_bin_content_id` | UUID | Yes | Must exist | Source bin content |
| `target_bin_id` | UUID | Yes | Must exist, same warehouse | Target bin |
| `quantity` | Decimal | Yes | > 0 | Quantity to transfer |
| `reason` | string | No | max 50 chars | Transfer reason (default: "reorganization") |
| `notes` | string | No | - | Additional notes |

**Success Response (201 Created)**:

```json
{
  "source_movement_id": "550e8400-e29b-41d4-a716-446655440001",
  "target_movement_id": "550e8400-e29b-41d4-a716-446655440002",
  "source_bin_code": "A-01-01-01",
  "target_bin_code": "A-02-02-02",
  "quantity_transferred": 50.00,
  "unit": "kg",
  "product_name": "Csirkemell filé",
  "batch_number": "BATCH-2025-001",
  "message": "Átmozgatás sikeresen végrehajtva."
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "A forrás és cél tárolóhely nem lehet ugyanaz." | Same source and target bin |
| 400 | "A tárolóhelyek különböző raktárakban vannak." | Different warehouses |
| 400 | "Nincs elegendő elérhető mennyiség az átmozgatáshoz." | Insufficient quantity |
| 400 | "A cél tárolóhely más termékkel foglalt." | Target bin has different product |
| 401 | "Nem azonosított felhasználó." | Missing/invalid token |
| 403 | "Nincs megfelelő jogosultsága ehhez a művelethez." | Viewer role |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/transfers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_bin_content_id": "550e8400-e29b-41d4-a716-446655440005",
    "target_bin_id": "550e8400-e29b-41d4-a716-446655440010",
    "quantity": 50.0,
    "reason": "optimization",
    "notes": "Átszervezés miatt"
  }'
```

---

### POST /transfers/cross-warehouse

**Create a cross-warehouse transfer (manager+ only)**

Creates a pending transfer between warehouses. Stock is reserved at source until confirmed at target.

**Authentication**: `manager`, `admin`

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `source_bin_content_id` | UUID | Yes | Must exist | Source bin content |
| `target_warehouse_id` | UUID | Yes | Must exist, different from source | Target warehouse |
| `target_bin_id` | UUID | No | Must exist in target warehouse | Pre-assigned target bin |
| `quantity` | Decimal | Yes | > 0 | Quantity to transfer |
| `transport_reference` | string | No | max 100 chars | Transport tracking ID |
| `notes` | string | No | - | Additional notes |

**Success Response (201 Created)**:

```json
{
  "transfer_id": "550e8400-e29b-41d4-a716-446655440030",
  "source_warehouse_name": "Budapest Központi Raktár",
  "target_warehouse_name": "Debrecen Raktár",
  "source_bin_code": "A-01-01-01",
  "quantity_sent": 100.00,
  "unit": "kg",
  "product_name": "Csirkemell filé",
  "batch_number": "BATCH-2025-001",
  "status": "pending",
  "transport_reference": "TRUCK-2025-001",
  "message": "Raktárközi átmozgatás létrehozva."
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "Nincs elegendő elérhető mennyiség az átmozgatáshoz." | Insufficient quantity |
| 403 | "Ez a művelet legalább menedzser jogosultságot igényel." | Warehouse role |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/transfers/cross-warehouse" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_bin_content_id": "550e8400-e29b-41d4-a716-446655440005",
    "target_warehouse_id": "550e8400-e29b-41d4-a716-446655440200",
    "quantity": 100.0,
    "transport_reference": "TRUCK-2025-001"
  }'
```

---

### GET /transfers

**List cross-warehouse transfers (viewer+ only)**

Returns paginated list of cross-warehouse transfers with optional filters.

**Authentication**: `viewer`, `warehouse`, `manager`, `admin`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number (≥1) |
| `page_size` | int | 50 | Items per page (1-100) |
| `source_warehouse_id` | UUID | - | Filter by source warehouse |
| `target_warehouse_id` | UUID | - | Filter by target warehouse |
| `status` | string | - | Filter by status (pending/in_transit/received/cancelled) |

**Success Response (200 OK)**:

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440030",
      "source_warehouse_name": "Budapest Központi Raktár",
      "target_warehouse_name": "Debrecen Raktár",
      "source_bin_code": "A-01-01-01",
      "target_bin_code": null,
      "product_name": "Csirkemell filé",
      "quantity_sent": 100.00,
      "unit": "kg",
      "status": "in_transit",
      "transport_reference": "TRUCK-2025-001",
      "created_at": "2025-12-21T10:00:00+01:00"
    }
  ],
  "total": 25,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

**Example**:

```bash
curl "http://localhost:8000/api/v1/transfers?status=pending&page=1" \
  -H "Authorization: Bearer $TOKEN"
```

---

### GET /transfers/pending

**List pending transfers awaiting receipt (warehouse+ only)**

Returns transfers with status `pending` or `in_transit` for a warehouse.

**Authentication**: `warehouse`, `manager`, `admin`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `warehouse_id` | UUID | No | Filter by target warehouse |

**Success Response (200 OK)**:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440030",
    "source_warehouse_name": "Budapest Központi Raktár",
    "target_warehouse_name": "Debrecen Raktár",
    "source_bin_code": "A-01-01-01",
    "target_bin_code": null,
    "product_name": "Csirkemell filé",
    "quantity_sent": 100.00,
    "unit": "kg",
    "status": "in_transit",
    "transport_reference": "TRUCK-2025-001",
    "created_at": "2025-12-21T10:00:00+01:00"
  }
]
```

---

### GET /transfers/{transfer_id}

**Get transfer details (viewer+ only)**

Returns complete details of a cross-warehouse transfer.

**Authentication**: `viewer`, `warehouse`, `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `transfer_id` | UUID | Transfer ID |

**Success Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440030",
  "source_warehouse_id": "550e8400-e29b-41d4-a716-446655440100",
  "source_warehouse_name": "Budapest Központi Raktár",
  "target_warehouse_id": "550e8400-e29b-41d4-a716-446655440200",
  "target_warehouse_name": "Debrecen Raktár",
  "source_bin_code": "A-01-01-01",
  "target_bin_code": null,
  "product_name": "Csirkemell filé",
  "sku": "CHICK-001",
  "batch_number": "BATCH-2025-001",
  "use_by_date": "2025-03-15",
  "quantity_sent": 100.00,
  "quantity_received": null,
  "unit": "kg",
  "status": "in_transit",
  "transport_reference": "TRUCK-2025-001",
  "condition_on_receipt": null,
  "dispatched_at": "2025-12-21T14:00:00+01:00",
  "received_at": null,
  "cancelled_at": null,
  "cancellation_reason": null,
  "created_by": "admin",
  "received_by": null,
  "notes": null,
  "created_at": "2025-12-21T10:00:00+01:00"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "Az átmozgatás nem található." | Transfer not found |

---

### POST /transfers/{transfer_id}/dispatch

**Mark transfer as dispatched (warehouse+ only)**

Changes transfer status from `pending` to `in_transit`.

**Authentication**: `warehouse`, `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `transfer_id` | UUID | Transfer ID |

**Success Response (200 OK)**:

Returns `TransferDetail` with updated status `in_transit` and `dispatched_at` timestamp.

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "Az átmozgatás már befejezve." | Already received/cancelled |
| 404 | "Az átmozgatás nem található." | Transfer not found |

---

### POST /transfers/{transfer_id}/confirm

**Confirm transfer receipt (warehouse+ only)**

Confirms receipt at target warehouse. Creates bin content at target, records movement.

**Authentication**: `warehouse`, `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `transfer_id` | UUID | Transfer ID |

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `target_bin_id` | UUID | Yes | Must exist in target warehouse | Destination bin |
| `received_quantity` | Decimal | Yes | > 0 | Actual quantity received |
| `condition_on_receipt` | string | No | max 50 chars | Condition (good/damaged/partial) |
| `notes` | string | No | - | Receipt notes |

**Success Response (200 OK)**:

```json
{
  "transfer_id": "550e8400-e29b-41d4-a716-446655440030",
  "target_bin_code": "B-01-01-01",
  "quantity_received": 98.50,
  "quantity_sent": 100.00,
  "condition_on_receipt": "damaged",
  "status": "received",
  "message": "Raktárközi átmozgatás visszaigazolva."
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "Az átmozgatás már befejezve." | Already received |
| 400 | "Az átmozgatás már visszavonva." | Already cancelled |

---

### POST /transfers/{transfer_id}/cancel

**Cancel a transfer (manager+ only)**

Cancels a pending or in_transit transfer. Returns stock to source if in_transit.

**Authentication**: `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `transfer_id` | UUID | Transfer ID |

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `reason` | string | Yes | 1-255 chars | Cancellation reason |
| `notes` | string | No | - | Additional notes |

**Success Response (200 OK)**:

Returns `TransferDetail` with status `cancelled`, `cancelled_at`, and `cancellation_reason`.

---

## Reservations API

### POST /reservations

**Create a stock reservation (warehouse+ only)**

Reserves stock for a customer order following FEFO order. Allocates from oldest expiry dates first.

**Authentication**: `warehouse`, `manager`, `admin`

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `product_id` | UUID | Yes | Must exist | Product to reserve |
| `quantity` | Decimal | Yes | > 0 | Quantity needed |
| `order_reference` | string | Yes | 1-100 chars | External order number |
| `customer_name` | string | No | max 255 chars | Customer name |
| `reserved_until` | datetime | Yes | Future datetime | Reservation expiry |
| `notes` | string | No | - | Additional notes |

**Success Response (201 Created)**:

```json
{
  "reservation_id": "550e8400-e29b-41d4-a716-446655440010",
  "product_id": "550e8400-e29b-41d4-a716-446655440001",
  "product_name": "Csirkemell filé",
  "sku": "CHICK-001",
  "order_reference": "ORD-2025-001",
  "customer_name": "Vendéglátó Kft.",
  "total_quantity": 150.00,
  "reserved_until": "2025-12-22T18:00:00+01:00",
  "status": "active",
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "bin_content_id": "550e8400-e29b-41d4-a716-446655440005",
      "bin_code": "A-01-01-01",
      "batch_number": "BATCH-2025-001",
      "use_by_date": "2025-03-15",
      "quantity_reserved": 100.00,
      "days_until_expiry": 84
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440021",
      "bin_content_id": "550e8400-e29b-41d4-a716-446655440006",
      "bin_code": "A-02-02-02",
      "batch_number": "BATCH-2025-002",
      "use_by_date": "2025-04-20",
      "quantity_reserved": 50.00,
      "days_until_expiry": 120
    }
  ],
  "is_partial": false,
  "message": "Foglalás sikeresen létrehozva."
}
```

**Partial Reservation** (insufficient stock):

When available stock is less than requested, a partial reservation is created:

```json
{
  "total_quantity": 80.00,
  "is_partial": true,
  "message": "Részleges foglalás - nem áll rendelkezésre elegendő készlet."
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "Nincs elérhető készlet a foglaláshoz." | No available stock |
| 400 | "A termék nem található." | Product not found |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "550e8400-e29b-41d4-a716-446655440001",
    "quantity": 150.0,
    "order_reference": "ORD-2025-001",
    "customer_name": "Vendéglátó Kft.",
    "reserved_until": "2025-12-22T18:00:00+01:00"
  }'
```

---

### GET /reservations

**List reservations (viewer+ only)**

Returns paginated list of reservations with optional filters.

**Authentication**: `viewer`, `warehouse`, `manager`, `admin`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number (≥1) |
| `page_size` | int | 50 | Items per page (1-100) |
| `product_id` | UUID | - | Filter by product |
| `status` | string | - | Filter by status (active/fulfilled/cancelled/expired) |
| `order_reference` | string | - | Search by order reference (partial match) |

**Success Response (200 OK)**:

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "product_name": "Csirkemell filé",
      "sku": "CHICK-001",
      "order_reference": "ORD-2025-001",
      "customer_name": "Vendéglátó Kft.",
      "total_quantity": 150.00,
      "reserved_until": "2025-12-22T18:00:00+01:00",
      "status": "active",
      "created_at": "2025-12-21T10:00:00+01:00"
    }
  ],
  "total": 15,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

---

### GET /reservations/expiring

**List expiring reservations (warehouse+ only)**

Returns reservations expiring within the threshold period.

**Authentication**: `warehouse`, `manager`, `admin`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hours_threshold` | int | 24 | Hours ahead to check (1-168) |

**Success Response (200 OK)**:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "product_name": "Csirkemell filé",
    "sku": "CHICK-001",
    "order_reference": "ORD-2025-001",
    "customer_name": "Vendéglátó Kft.",
    "total_quantity": 150.00,
    "reserved_until": "2025-12-21T18:00:00+01:00",
    "status": "active",
    "created_at": "2025-12-21T10:00:00+01:00"
  }
]
```

---

### GET /reservations/{reservation_id}

**Get reservation details (viewer+ only)**

Returns complete details of a reservation including all allocated items.

**Authentication**: `viewer`, `warehouse`, `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `reservation_id` | UUID | Reservation ID |

**Success Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "product_id": "550e8400-e29b-41d4-a716-446655440001",
  "product_name": "Csirkemell filé",
  "sku": "CHICK-001",
  "order_reference": "ORD-2025-001",
  "customer_name": "Vendéglátó Kft.",
  "total_quantity": 150.00,
  "reserved_until": "2025-12-22T18:00:00+01:00",
  "status": "active",
  "fulfilled_at": null,
  "cancelled_at": null,
  "cancellation_reason": null,
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "bin_content_id": "550e8400-e29b-41d4-a716-446655440005",
      "bin_code": "A-01-01-01",
      "batch_number": "BATCH-2025-001",
      "use_by_date": "2025-03-15",
      "quantity_reserved": 100.00,
      "days_until_expiry": 84
    }
  ],
  "created_by": "warehouse_user",
  "notes": null,
  "created_at": "2025-12-21T10:00:00+01:00",
  "updated_at": "2025-12-21T10:00:00+01:00"
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "A foglalás nem található." | Reservation not found |

---

### POST /reservations/{reservation_id}/fulfill

**Fulfill a reservation (warehouse+ only)**

Converts reservation to actual issue. Creates issue movements, decrements stock.

**Authentication**: `warehouse`, `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `reservation_id` | UUID | Reservation ID |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notes` | string | No | Fulfillment notes |

**Success Response (200 OK)**:

```json
{
  "reservation_id": "550e8400-e29b-41d4-a716-446655440010",
  "movement_ids": [
    "550e8400-e29b-41d4-a716-446655440050",
    "550e8400-e29b-41d4-a716-446655440051"
  ],
  "total_fulfilled": 150.00,
  "message": "Foglalás teljesítve."
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "A foglalás már teljesítve." | Already fulfilled |
| 400 | "A foglalás már visszavonva." | Already cancelled |
| 400 | "Foglalás lejárt." | Reservation expired |

---

### DELETE /reservations/{reservation_id}

**Cancel a reservation (manager+ only)**

Cancels reservation and releases reserved quantities back to available stock.

**Authentication**: `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `reservation_id` | UUID | Reservation ID |

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `reason` | string | Yes | 1-50 chars | Cancellation reason |
| `notes` | string | No | - | Additional notes |

**Success Response (200 OK)**:

Returns `ReservationDetail` with status `cancelled`, `cancelled_at`, and `cancellation_reason`.

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "A foglalás már teljesítve." | Already fulfilled |
| 400 | "A foglalás már visszavonva." | Already cancelled |

---

## Jobs API

### POST /jobs/trigger

**Manually trigger a job (admin only)**

Triggers a background job immediately instead of waiting for schedule.

**Authentication**: `admin`

**Request Body**:

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `job_name` | string | Yes | Valid job name | Job to trigger |

**Valid Job Names**:

| Job Name | Description |
|----------|-------------|
| `cleanup_expired_reservations` | Release expired reservation holds |
| `check_expiry_warnings` | Scan for expiring products |
| `send_expiry_alerts` | Send email notifications |

**Success Response (202 Accepted)**:

```json
{
  "job_name": "check_expiry_warnings",
  "task_id": "abc123-def456-ghi789",
  "message": "Feladat sikeresen elindítva."
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 400 | "A feladat nem található." | Invalid job name |
| 403 | "Ez a művelet adminisztrátori jogosultságot igényel." | Non-admin role |

**Example**:

```bash
curl -X POST "http://localhost:8000/api/v1/jobs/trigger" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"job_name": "check_expiry_warnings"}'
```

---

### GET /jobs/status/{task_id}

**Check job status by Celery task ID (manager+ only)**

Returns the current status and result of a triggered job.

**Authentication**: `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Celery task ID |

**Success Response (200 OK)**:

```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "SUCCESS",
  "result": {
    "warning_counts": {
      "critical": 3,
      "high": 8,
      "medium": 15,
      "low": 22,
      "total": 48
    },
    "expired_count": 2,
    "message": "Figyelmeztetések: 48, Lejárt: 2"
  },
  "error": null
}
```

**Possible Status Values**:

| Status | Description |
|--------|-------------|
| `PENDING` | Task is waiting to be executed |
| `STARTED` | Task has started |
| `SUCCESS` | Task completed successfully |
| `FAILURE` | Task failed with error |
| `REVOKED` | Task was cancelled |

---

### GET /jobs/executions

**List job execution history (manager+ only)**

Returns paginated list of job executions with optional filters.

**Authentication**: `manager`, `admin`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int | 1 | Page number (≥1) |
| `page_size` | int | 50 | Items per page (1-100) |
| `job_name` | string | - | Filter by job name |
| `status` | string | - | Filter by status (running/completed/failed) |

**Success Response (200 OK)**:

```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440040",
      "job_name": "check_expiry_warnings",
      "status": "completed",
      "started_at": "2025-12-21T06:00:00+01:00",
      "completed_at": "2025-12-21T06:00:05+01:00",
      "duration_seconds": 5.234,
      "result": {
        "warning_counts": {"critical": 3, "high": 8, "total": 48},
        "message": "Figyelmeztetések: 48, Lejárt: 2"
      },
      "error_message": null
    }
  ],
  "total": 120,
  "page": 1,
  "page_size": 50,
  "pages": 3
}
```

---

### GET /jobs/executions/{execution_id}

**Get job execution details (manager+ only)**

Returns complete details of a specific job execution.

**Authentication**: `manager`, `admin`

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `execution_id` | UUID | Execution record ID |

**Success Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440040",
  "job_name": "cleanup_expired_reservations",
  "status": "completed",
  "started_at": "2025-12-21T06:00:00+01:00",
  "completed_at": "2025-12-21T06:00:02+01:00",
  "duration_seconds": 2.156,
  "result": {
    "expired_reservations_count": 5,
    "message": "5 db lejárt foglalás feloldva"
  },
  "error_message": null
}
```

**Error Responses**:

| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | "A feladat nem található." | Execution not found |

---

## Authentication

All Phase 4 endpoints require JWT authentication via Bearer token.

```bash
# Get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin123!"

# Use token
curl "http://localhost:8000/api/v1/reservations" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## Role Requirements Summary

| Endpoint | viewer | warehouse | manager | admin |
|----------|--------|-----------|---------|-------|
| `POST /transfers` | - | ✓ | ✓ | ✓ |
| `POST /transfers/cross-warehouse` | - | - | ✓ | ✓ |
| `GET /transfers` | ✓ | ✓ | ✓ | ✓ |
| `GET /transfers/pending` | - | ✓ | ✓ | ✓ |
| `GET /transfers/{id}` | ✓ | ✓ | ✓ | ✓ |
| `POST /transfers/{id}/dispatch` | - | ✓ | ✓ | ✓ |
| `POST /transfers/{id}/confirm` | - | ✓ | ✓ | ✓ |
| `POST /transfers/{id}/cancel` | - | - | ✓ | ✓ |
| `POST /reservations` | - | ✓ | ✓ | ✓ |
| `GET /reservations` | ✓ | ✓ | ✓ | ✓ |
| `GET /reservations/expiring` | - | ✓ | ✓ | ✓ |
| `GET /reservations/{id}` | ✓ | ✓ | ✓ | ✓ |
| `POST /reservations/{id}/fulfill` | - | ✓ | ✓ | ✓ |
| `DELETE /reservations/{id}` | - | - | ✓ | ✓ |
| `POST /jobs/trigger` | - | - | - | ✓ |
| `GET /jobs/status/{id}` | - | - | ✓ | ✓ |
| `GET /jobs/executions` | - | - | ✓ | ✓ |
| `GET /jobs/executions/{id}` | - | - | ✓ | ✓ |

---

## See Also

- **Phase4_Overview.md** - Feature summary and business context
- **Phase4_Database_Schema.md** - Database tables and models
- **Phase4_Testing_Guide.md** - Test patterns and fixtures
- **Phase3_API_Reference.md** - Inventory and movement endpoints
