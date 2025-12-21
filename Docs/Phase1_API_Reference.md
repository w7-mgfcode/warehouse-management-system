# WMS Phase 1: API Reference

**Version**: 1.0
**Base URL**: `/api/v1`
**Last Updated**: December 2025

## Overview

All API endpoints require authentication unless otherwise noted. Authentication uses JWT Bearer tokens passed in the `Authorization` header.

```
Authorization: Bearer <access_token>
```

## Authentication Endpoints

### POST /auth/login

Authenticate user and receive JWT tokens.

**Authentication**: Not required

**Content-Type**: `application/x-www-form-urlencoded`

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | User's username |
| password | string | Yes | User's password |

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Ervenytelen felhasznalonev vagy jelszo. | Invalid credentials |
| 403 | A felhasznaloi fiok inaktiv. | User account is disabled |

**Example**:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin123!"
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Authentication**: Not required

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Ervenytelen token. | Invalid or expired refresh token |

---

### GET /auth/me

Get current authenticated user information.

**Authentication**: Required (any role)

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@wms.local",
  "full_name": "System Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T10:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 401 | Ervenytelen felhasznalonev vagy jelszo. | Invalid/expired token |

---

## User Management Endpoints

> **Note**: All user management endpoints require `admin` role.

### GET /users

List all users with pagination.

**Authentication**: Required (admin only)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (1-indexed) |
| page_size | integer | 50 | Items per page (1-200) |

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "email": "admin@wms.local",
      "full_name": "System Administrator",
      "role": "admin",
      "is_active": true,
      "created_at": "2025-12-21T10:00:00Z",
      "updated_at": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 403 | Nincs megfelelo jogosultsaga ehhez a muvelethez. | Non-admin user |

---

### POST /users

Create a new user.

**Authentication**: Required (admin only)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "full_name": "New User",
  "role": "warehouse",
  "is_active": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| username | string | Yes | 3-100 characters |
| email | string | Yes | Valid email format |
| password | string | Yes | Min 8 chars, upper+lower+digit |
| full_name | string | No | Max 255 characters |
| role | string | No | admin, manager, warehouse, viewer (default: warehouse) |
| is_active | boolean | No | Default: true |

**Success Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "username": "newuser",
  "email": "newuser@example.com",
  "full_name": "New User",
  "role": "warehouse",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T10:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 409 | Ez a felhasznalonev mar foglalt. | Username already exists |
| 409 | Ez az email cim mar hasznalatban van. | Email already exists |
| 422 | A jelszo legalabb 8 karakter hosszu kell legyen. | Password too short |
| 422 | A jelszo tul gyenge. Hasznaljon kis- es nagybetuk, szamot. | Weak password |

---

### GET /users/{user_id}

Get user by ID.

**Authentication**: Required (admin only)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | UUID | User ID |

**Success Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@wms.local",
  "full_name": "System Administrator",
  "role": "admin",
  "is_active": true,
  "created_at": "2025-12-21T10:00:00Z",
  "updated_at": "2025-12-21T10:00:00Z"
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | A keresett elem nem talalhato. | User not found |

---

### PUT /users/{user_id}

Update user by ID.

**Authentication**: Required (admin only)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | UUID | User ID |

**Request Body** (all fields optional):
```json
{
  "username": "updateduser",
  "email": "updated@example.com",
  "password": "NewPass123!",
  "full_name": "Updated Name",
  "role": "manager",
  "is_active": false
}
```

**Success Response** (200 OK): Returns updated user object.

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | A keresett elem nem talalhato. | User not found |
| 409 | Ez a felhasznalonev mar foglalt. | Username conflict |
| 409 | Ez az email cim mar hasznalatban van. | Email conflict |

---

### DELETE /users/{user_id}

Delete user by ID.

**Authentication**: Required (admin only)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| user_id | UUID | User ID |

**Success Response** (204 No Content): Empty response.

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | A keresett elem nem talalhato. | User not found |

---

## Warehouse Endpoints

### GET /warehouses

List all warehouses with pagination and filtering.

**Authentication**: Required (viewer or higher)

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (1-indexed) |
| page_size | integer | 50 | Items per page (1-200) |
| is_active | boolean | null | Filter by active status |

**Success Response** (200 OK):
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Foraktar",
      "location": "Budapest, Logisztikai Park",
      "description": "Fo elosztokozpont raklaphelyes tarolassal",
      "bin_structure_template": {
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
      },
      "is_active": true,
      "created_at": "2025-12-21T10:00:00Z",
      "updated_at": "2025-12-21T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "pages": 1
}
```

---

### POST /warehouses

Create a new warehouse.

**Authentication**: Required (manager or admin)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "name": "Uj Raktar",
  "location": "Debrecen",
  "description": "Uj raktarhely",
  "bin_structure_template": {
    "fields": [
      {"name": "aisle", "label": "Sor", "required": true, "order": 1},
      {"name": "level", "label": "Szint", "required": true, "order": 2},
      {"name": "position", "label": "Pozicio", "required": true, "order": 3}
    ],
    "code_format": "{aisle}-{level}-{position}",
    "separator": "-",
    "auto_uppercase": true,
    "zero_padding": true
  },
  "is_active": true
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | Yes | 2-255 characters |
| location | string | No | Max 255 characters |
| description | string | No | Text |
| bin_structure_template | object | Yes | Valid template object |
| is_active | boolean | No | Default: true |

**Bin Structure Template Schema**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fields | array | Yes | Min 1 field |
| fields[].name | string | Yes | Field identifier |
| fields[].label | string | Yes | Hungarian display label |
| fields[].required | boolean | Yes | Is field required |
| fields[].order | integer | Yes | Display order (>= 1) |
| code_format | string | Yes | Must contain `{placeholder}` |
| separator | string | No | Default: "-", max 5 chars |
| auto_uppercase | boolean | No | Default: true |
| zero_padding | boolean | No | Default: true |

**Success Response** (201 Created): Returns created warehouse object.

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 403 | Nincs megfelelo jogosultsaga ehhez a muvelethez. | Insufficient role |
| 409 | Ilyen nevu raktar mar letezik. | Name already exists |
| 422 | A nev legalabb 2 karakter hosszu kell legyen. | Name too short |
| 422 | Ervenytelen tarolohely sablon. | Invalid template |

---

### GET /warehouses/{warehouse_id}

Get warehouse by ID.

**Authentication**: Required (viewer or higher)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouse_id | UUID | Warehouse ID |

**Success Response** (200 OK): Returns warehouse object.

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | A raktar nem talalhato. | Warehouse not found |

---

### PUT /warehouses/{warehouse_id}

Update warehouse by ID.

**Authentication**: Required (manager or admin)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouse_id | UUID | Warehouse ID |

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "location": "New Location",
  "description": "Updated description",
  "bin_structure_template": { ... },
  "is_active": false
}
```

**Success Response** (200 OK): Returns updated warehouse object.

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 403 | Nincs megfelelo jogosultsaga ehhez a muvelethez. | Insufficient role |
| 404 | A raktar nem talalhato. | Warehouse not found |
| 409 | Ilyen nevu raktar mar letezik. | Name conflict |

---

### DELETE /warehouses/{warehouse_id}

Delete warehouse by ID.

**Authentication**: Required (admin only)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouse_id | UUID | Warehouse ID |

**Success Response** (204 No Content): Empty response.

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 403 | Nincs megfelelo jogosultsaga ehhez a muvelethez. | Non-admin user |
| 404 | A raktar nem talalhato. | Warehouse not found |
| 409 | A raktar nem torolheto, mert tartalmaz tarolohelyeket. | Warehouse has bins |

---

### GET /warehouses/{warehouse_id}/stats

Get warehouse statistics.

**Authentication**: Required (viewer or higher)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| warehouse_id | UUID | Warehouse ID |

**Success Response** (200 OK):
```json
{
  "total_bins": 100,
  "occupied_bins": 45,
  "empty_bins": 50,
  "reserved_bins": 3,
  "inactive_bins": 2,
  "utilization_percent": 45.0
}
```

**Error Responses**:
| Status | Detail (Hungarian) | Cause |
|--------|-------------------|-------|
| 404 | A raktar nem talalhato. | Warehouse not found |

---

## Health Check

### GET /health

Check API health status.

**Authentication**: Not required

**Success Response** (200 OK):
```json
{
  "status": "healthy"
}
```

---

## Common Error Format

All errors return a consistent JSON format:

```json
{
  "detail": "Hungarian error message"
}
```

For validation errors (422), Pydantic returns:
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Error description",
      "type": "error_type"
    }
  ]
}
```

## Rate Limiting

Currently not implemented. Planned for Phase 2.

## API Versioning

The API uses URL path versioning (`/api/v1/`). Future breaking changes will be released under `/api/v2/`.
