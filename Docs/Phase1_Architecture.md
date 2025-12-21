# WMS Phase 1: Backend Architecture

**Version**: 1.0
**Last Updated**: December 2025

## Overview

The WMS (Warehouse Management System) Phase 1 establishes the foundational backend infrastructure using modern Python technologies. This document describes the architectural decisions, project structure, and component interactions.

## Technology Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.13+ | Runtime environment |
| FastAPI | 0.125.0+ | Async web framework |
| SQLAlchemy | 2.0.45 | Async ORM with asyncpg |
| PostgreSQL | 17 | Primary database |
| Valkey | 8.1 | Cache/message broker (Redis alternative) |
| Pydantic | 2.11+ | Data validation |
| Alembic | 1.14+ | Database migrations |
| python-jose | 3.3+ | JWT token handling |
| passlib | 1.7+ | Password hashing (bcrypt) |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Applications                       │
│                    (Frontend, Mobile, External)                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FastAPI Application                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routers   │  │ Middleware  │  │     Dependencies        │  │
│  │  (api/v1/)  │  │   (CORS)    │  │ (Auth, DB Session)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                      │                 │
│         ▼                                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      Service Layer                          ││
│  │  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐ ││
│  │  │   Auth   │  │    User      │  │      Warehouse        │ ││
│  │  │ Service  │  │   Service    │  │       Service         │ ││
│  │  └──────────┘  └──────────────┘  └───────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLAlchemy ORM Layer                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Async Session                          │ │
│  │              (asyncpg driver, pool_pre_ping)               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Valkey      │  │   File System   │
│   (Database)    │  │    (Cache)      │  │   (Backups)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Project Structure

```
w7-WHv1/backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app factory
│   │
│   ├── api/                    # API Layer
│   │   ├── __init__.py
│   │   ├── deps.py             # Shared dependencies (auth, db)
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py       # Main router combining all endpoints
│   │       ├── auth.py         # Authentication endpoints
│   │       ├── users.py        # User management (admin)
│   │       └── warehouses.py   # Warehouse CRUD endpoints
│   │
│   ├── core/                   # Core Configuration
│   │   ├── __init__.py
│   │   ├── config.py           # Pydantic Settings
│   │   ├── security.py         # JWT & password utilities
│   │   └── i18n.py             # Hungarian messages
│   │
│   ├── db/                     # Database Layer
│   │   ├── __init__.py
│   │   ├── base.py             # SQLAlchemy Base & mixins
│   │   ├── session.py          # Async engine & session
│   │   ├── seed.py             # Initial data seeding
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── user.py
│   │       ├── warehouse.py
│   │       ├── bin.py
│   │       ├── product.py
│   │       ├── supplier.py
│   │       ├── bin_content.py
│   │       └── bin_history.py
│   │
│   ├── schemas/                # Pydantic Schemas
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   └── warehouse.py
│   │
│   ├── services/               # Business Logic
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── user.py
│   │   └── warehouse.py
│   │
│   └── tests/                  # Test Suite
│       ├── __init__.py
│       ├── conftest.py         # Fixtures
│       ├── test_auth.py
│       ├── test_users.py
│       └── test_warehouses.py
│
├── alembic/                    # Database Migrations
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
│
├── alembic.ini
├── pyproject.toml
├── requirements.txt
└── Dockerfile
```

## Layer Responsibilities

### 1. API Layer (`app/api/`)

**Purpose**: HTTP request/response handling, input validation, routing

**Components**:
- **Routers**: Define endpoints and HTTP methods
- **Dependencies** (`deps.py`): Shared dependency injection
  - `get_async_session`: Database session provider
  - `get_current_user`: JWT token validation
  - `require_roles()`: RBAC enforcement

**Design Principles**:
- Thin controllers - delegate to services
- Input validation via Pydantic schemas
- Consistent error responses in Hungarian

### 2. Service Layer (`app/services/`)

**Purpose**: Business logic, data transformation, multi-step operations

**Components**:
- `auth.py`: Authentication logic (login, token refresh)
- `user.py`: User CRUD operations
- `warehouse.py`: Warehouse management and statistics

**Design Principles**:
- Database-agnostic business logic
- Single responsibility per service
- Proper error handling with domain exceptions

### 3. Database Layer (`app/db/`)

**Purpose**: Data persistence, ORM models, database session management

**Components**:
- `base.py`: SQLAlchemy declarative base, GUID type, mixins
- `session.py`: Async engine and session factory
- `models/`: SQLAlchemy ORM models

**Design Principles**:
- SQLAlchemy 2.0 async patterns (`select()` syntax)
- `expire_on_commit=False` for async safety
- `pool_pre_ping=True` for connection verification

### 4. Schema Layer (`app/schemas/`)

**Purpose**: Request/response validation, data serialization

**Components**:
- Pydantic v2.11+ models with `ConfigDict`
- `@field_validator` for custom validation
- `from_attributes=True` for ORM compatibility

## Key Design Decisions

### 1. Portable UUID Type

A custom `GUID` type decorator enables database portability:

```python
class GUID(TypeDecorator):
    """Platform-independent GUID type."""
    impl = String(36)

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(String(36))
```

**Rationale**: Allows SQLite for testing while using native UUID in PostgreSQL production.

### 2. Async-First Architecture

All database operations use async/await:

```python
async def get_async_session() -> AsyncGenerator[AsyncSession]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

**Rationale**: Better performance under concurrent load, modern FastAPI pattern.

### 3. Dependency Injection

FastAPI's dependency injection for cross-cutting concerns:

```python
# Type aliases for cleaner code
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_async_session)]
RequireAdmin = Annotated[User, Depends(require_roles("admin"))]
```

**Rationale**: Testability, separation of concerns, clean endpoint signatures.

### 4. Hungarian Localization

Centralized message dictionaries in `i18n.py`:

```python
HU_MESSAGES = {
    "name_min_length": "A nev legalabb 2 karakter hosszu kell legyen.",
    "warehouse_not_found": "A raktar nem talalhato.",
    # ...
}
```

**Rationale**: Single source of truth for UI text, easy maintenance.

## Security Architecture

### Authentication Flow

```
┌────────┐     POST /auth/login      ┌─────────┐
│ Client │ ──────────────────────────▶│  Auth   │
└────────┘     username/password      │ Endpoint│
     │                                └────┬────┘
     │                                     │
     │                                     ▼
     │                            ┌─────────────────┐
     │                            │  Auth Service   │
     │                            │ - verify pass   │
     │                            │ - create tokens │
     │                            └────────┬────────┘
     │                                     │
     │      JWT Tokens                     │
     │◀────────────────────────────────────┘
     │   access_token (15min)
     │   refresh_token (7 days)
     │
     │     GET /auth/me
     │     Authorization: Bearer <token>
     ├──────────────────────────────────────▶
     │                                      │
     │                               ┌──────┴──────┐
     │                               │ JWT Decode  │
     │                               │ User Lookup │
     │                               └──────┬──────┘
     │      User Data                       │
     │◀─────────────────────────────────────┘
```

### Role-Based Access Control

| Role | Users | Warehouses | Bins | Inventory |
|------|-------|------------|------|-----------|
| admin | CRUD | CRUD | CRUD | Full |
| manager | Read | CRUD | CRUD | Full |
| warehouse | Read own | Read | CRUD | Full |
| viewer | Read own | Read | Read | Read |

## Configuration

Environment variables loaded via `pydantic-settings`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql+asyncpg://...` |
| `JWT_SECRET` | Token signing key | (required) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `VALKEY_URL` | Cache connection | `valkey://valkey:6379` |
| `TIMEZONE` | Application timezone | `Europe/Budapest` |
| `DEBUG` | Enable debug mode | `true` |

## Error Handling

All errors return consistent JSON structure:

```json
{
  "detail": "Hungarian error message"
}
```

HTTP status codes:
- `400` - Validation error
- `401` - Authentication required
- `403` - Insufficient permissions
- `404` - Resource not found
- `409` - Conflict (duplicate)
- `422` - Validation error (Pydantic)
- `500` - Internal server error

## Future Considerations (Phase 2+)

1. **Bins CRUD + Bulk Generation** - Storage location management
2. **Inventory Operations** - Receipt, Issue, FEFO logic
3. **Celery Tasks** - Scheduled jobs, email alerts
4. **Reports** - Dashboard, FEFO report, exports
5. **Frontend** - React 19 + Tailwind v4 + shadcn/ui
