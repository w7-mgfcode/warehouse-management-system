# WMS Phase 1: Authentication & RBAC

**Version**: 1.0
**Last Updated**: December 2025

## Overview

The WMS uses JWT (JSON Web Token) authentication with role-based access control (RBAC). All user-facing error messages are in Hungarian.

## Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| python-jose | 3.3+ | JWT encoding/decoding |
| passlib | 1.7+ | Password hashing framework |
| bcrypt | 4.0-4.x | Password hashing algorithm |

## Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Authentication Flow                               │
└────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐                                      ┌──────────────────┐
     │  Client  │                                      │   WMS Backend    │
     └────┬─────┘                                      └────────┬─────────┘
          │                                                     │
          │  1. POST /api/v1/auth/login                        │
          │     username=admin&password=Admin123!               │
          ├────────────────────────────────────────────────────▶│
          │                                                     │
          │                                         ┌───────────┴───────────┐
          │                                         │ • Lookup user by      │
          │                                         │   username            │
          │                                         │ • Verify bcrypt hash  │
          │                                         │ • Check is_active     │
          │                                         │ • Generate JWT tokens │
          │                                         └───────────┬───────────┘
          │                                                     │
          │  2. 200 OK                                          │
          │     { access_token, refresh_token, token_type }     │
          │◀────────────────────────────────────────────────────┤
          │                                                     │
          │  3. GET /api/v1/auth/me                             │
          │     Authorization: Bearer <access_token>            │
          ├────────────────────────────────────────────────────▶│
          │                                                     │
          │                                         ┌───────────┴───────────┐
          │                                         │ • Decode JWT          │
          │                                         │ • Verify type=access  │
          │                                         │ • Lookup user by sub  │
          │                                         │ • Check is_active     │
          │                                         └───────────┬───────────┘
          │                                                     │
          │  4. 200 OK                                          │
          │     { id, username, email, role, ... }              │
          │◀────────────────────────────────────────────────────┤
          │                                                     │
          │                         ... 15 minutes later ...    │
          │                                                     │
          │  5. 401 Unauthorized (access token expired)         │
          │◀────────────────────────────────────────────────────┤
          │                                                     │
          │  6. POST /api/v1/auth/refresh                       │
          │     { "refresh_token": "<refresh_token>" }          │
          ├────────────────────────────────────────────────────▶│
          │                                                     │
          │  7. 200 OK                                          │
          │     { access_token, refresh_token, token_type }     │
          │◀────────────────────────────────────────────────────┤
          │                                                     │
```

---

## JWT Token Structure

### Access Token

**Purpose**: Short-lived token for API authentication
**Expiration**: 15 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "access",
  "exp": 1703153700
}
```

| Claim | Description |
|-------|-------------|
| `sub` | User ID (UUID) |
| `type` | Token type (`access`) |
| `exp` | Expiration timestamp (Unix) |

### Refresh Token

**Purpose**: Long-lived token for obtaining new access tokens
**Expiration**: 7 days (configurable via `REFRESH_TOKEN_EXPIRE_DAYS`)

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "exp": 1703758500
}
```

### Token Generation

```python
from datetime import UTC, datetime, timedelta
from jose import jwt

ALGORITHM = "HS256"

def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
```

---

## Password Security

### Hashing Algorithm

- **Algorithm**: bcrypt (via passlib)
- **Library Version**: bcrypt 4.0-4.x (4.3.0 recommended)
- **Cost Factor**: Default (12 rounds)

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

### Password Requirements

| Requirement | Validation | Hungarian Error |
|-------------|------------|-----------------|
| Minimum length | 8 characters | A jelszó legalább 8 karakter hosszú kell legyen. |
| Complexity | Upper + lower + digit | A jelszó túl gyenge. Használjon kis- és nagybetűket, számot. |

### Validation Implementation

```python
import re
from pydantic import field_validator

@field_validator("password")
@classmethod
def validate_password(cls, v: str) -> str:
    if len(v) < 8:
        raise ValueError("A jelszó legalább 8 karakter hosszú kell legyen.")

    if not re.search(r"[A-Z]", v):
        raise ValueError("A jelszó túl gyenge. Használjon kis- és nagybetűket, számot.")
    if not re.search(r"[a-z]", v):
        raise ValueError("A jelszó túl gyenge. Használjon kis- és nagybetűket, számot.")
    if not re.search(r"\d", v):
        raise ValueError("A jelszó túl gyenge. Használjon kis- és nagybetűket, számot.")

    return v
```

---

## Role-Based Access Control (RBAC)

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        admin                                     │
│                     (Adminisztrátor)                             │
│  • Full system access                                           │
│  • User management (CRUD)                                       │
│  • Warehouse deletion                                           │
├─────────────────────────────────────────────────────────────────┤
│                       manager                                    │
│                      (Menedzser)                                 │
│  • Warehouse CRUD (except delete)                               │
│  • Bin management                                               │
│  • Inventory operations                                         │
│  • View users (own profile only)                                │
├─────────────────────────────────────────────────────────────────┤
│                      warehouse                                   │
│                      (Raktáros)                                  │
│  • View warehouses                                              │
│  • Bin CRUD                                                     │
│  • Full inventory operations                                    │
│  • View own profile                                             │
├─────────────────────────────────────────────────────────────────┤
│                       viewer                                     │
│                     (Megtekintő)                                 │
│  • View warehouses (read-only)                                  │
│  • View bins (read-only)                                        │
│  • View inventory (read-only)                                   │
│  • View own profile                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Resource | Action | admin | manager | warehouse | viewer |
|----------|--------|-------|---------|-----------|--------|
| **Users** | Create | Yes | - | - | - |
| **Users** | Read all | Yes | - | - | - |
| **Users** | Read own | Yes | Yes | Yes | Yes |
| **Users** | Update | Yes | - | - | - |
| **Users** | Delete | Yes | - | - | - |
| **Warehouses** | Create | Yes | Yes | - | - |
| **Warehouses** | Read | Yes | Yes | Yes | Yes |
| **Warehouses** | Update | Yes | Yes | - | - |
| **Warehouses** | Delete | Yes | - | - | - |
| **Bins** | Create | Yes | Yes | Yes | - |
| **Bins** | Read | Yes | Yes | Yes | Yes |
| **Bins** | Update | Yes | Yes | Yes | - |
| **Bins** | Delete | Yes | Yes | Yes | - |
| **Inventory** | Receipt | Yes | Yes | Yes | - |
| **Inventory** | Issue | Yes | Yes | Yes | - |
| **Inventory** | Read | Yes | Yes | Yes | Yes |

### Dependency Implementation

```python
from typing import Annotated
from fastapi import Depends, HTTPException, status

def require_roles(*allowed_roles: str):
    """Dependency factory for role-based access control."""

    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Nincs megfelelő jogosultsága ehhez a művelethez.",
            )
        return current_user

    return role_checker

# Pre-defined role dependencies
RequireAdmin = Annotated[User, Depends(require_roles("admin"))]
RequireManager = Annotated[User, Depends(require_roles("admin", "manager"))]
RequireWarehouse = Annotated[User, Depends(require_roles("admin", "manager", "warehouse"))]
RequireViewer = Annotated[User, Depends(require_roles("admin", "manager", "warehouse", "viewer"))]
```

### Usage in Endpoints

```python
from app.api.deps import RequireAdmin, RequireManager, RequireViewer

@router.get("/users")
async def list_users(
    current_user: RequireAdmin,  # Only admins
    db: DbSession,
) -> PaginatedResponse[UserResponse]:
    ...

@router.post("/warehouses")
async def create_warehouse(
    current_user: RequireManager,  # Admin or Manager
    warehouse_in: WarehouseCreate,
    db: DbSession,
) -> WarehouseResponse:
    ...

@router.get("/warehouses")
async def list_warehouses(
    current_user: RequireViewer,  # Any authenticated user
    db: DbSession,
) -> PaginatedResponse[WarehouseResponse]:
    ...
```

---

## OAuth2 Password Bearer

The API uses OAuth2 password bearer scheme for token transmission:

```python
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
```

### Request Format

```http
GET /api/v1/warehouses HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### OpenAPI Integration

The `OAuth2PasswordBearer` automatically adds:
- "Authorize" button in Swagger UI
- `security` scheme in OpenAPI spec

---

## Error Responses

### Authentication Errors (Hungarian)

| Status | Code | Hungarian Message | Cause |
|--------|------|-------------------|-------|
| 401 | invalid_credentials | Érvénytelen felhasználónév vagy jelszó. | Wrong username/password |
| 401 | token_expired | A munkamenet lejárt. Kérjük, jelentkezzen be újra. | Expired JWT |
| 401 | invalid_token | Érvénytelen token. | Malformed/tampered JWT |
| 401 | not_authenticated | Nem azonosított felhasználó. | Missing auth header |
| 403 | inactive_user | A felhasználói fiók inaktív. | `is_active=False` |
| 403 | not_enough_permissions | Nincs megfelelő jogosultsága ehhez a művelethez. | Insufficient role |

### Error Response Format

```json
{
  "detail": "Érvénytelen felhasználónév vagy jelszó."
}
```

---

## Security Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing JWTs | (required) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | 15 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | 7 |

### JWT_SECRET Requirements

- **Minimum length**: 32 characters
- **Generation**: Use cryptographically secure random generator

```bash
# Generate a secure secret
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Security Best Practices

### Implemented

1. **Password Hashing**: bcrypt with auto-upgrade on deprecated algorithms
2. **Token Typing**: Separate `type` claim prevents token confusion attacks
3. **Short-lived Access**: 15-minute access tokens limit exposure
4. **User Verification**: Each request validates user exists and is active
5. **Constant-time Comparison**: passlib uses constant-time comparison

### Future Considerations (Phase 2+)

1. **Token Blacklisting**: Store revoked tokens in Valkey
2. **Rate Limiting**: Prevent brute-force attacks
3. **Audit Logging**: Log authentication events
4. **MFA**: Optional two-factor authentication
5. **Session Management**: Track active sessions per user

---

## Localization Reference

### Role Names

| English | Hungarian |
|---------|-----------|
| admin | Adminisztrátor |
| manager | Menedzser |
| warehouse | Raktáros |
| viewer | Megtekintő |

### Error Messages Dictionary

```python
HU_ERRORS = {
    "invalid_credentials": "Érvénytelen felhasználónév vagy jelszó.",
    "inactive_user": "A felhasználói fiók inaktív.",
    "token_expired": "A munkamenet lejárt. Kérjük, jelentkezzen be újra.",
    "invalid_token": "Érvénytelen token.",
    "not_authenticated": "Nem azonosított felhasználó.",
    "not_enough_permissions": "Nincs megfelelő jogosultsága ehhez a művelethez.",
    "admin_required": "Ez a művelet adminisztrátori jogosultságot igényel.",
    "manager_required": "Ez a művelet legalább menedzser jogosultságot igényel.",
}
```

---

## Default Credentials

For development and testing:

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123! | admin |

**Note**: Change default credentials before production deployment.
