name: "WMS Phase 1: Backend Foundation"
description: |

## Purpose
Build the foundational backend infrastructure for the Warehouse Management System (WMS) including project structure, database models, authentication, RBAC, and the first CRUD entity (Warehouses) as a pattern for all other entities.

## Core Principles
1. **Context is King**: Include ALL necessary documentation, examples, and caveats
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance
5. **Global rules**: Be sure to follow all rules in CLAUDE.md

---

## Goal
Create a production-ready FastAPI backend with:
- Async SQLAlchemy 2.0.45 + PostgreSQL 17 database layer
- Alembic migrations for all core tables
- JWT authentication with access/refresh tokens
- Role-based access control (admin, manager, warehouse, viewer)
- Complete Warehouses CRUD as the template for all future entities
- Docker Compose development environment with Valkey (Redis alternative)
- Comprehensive test suite with >80% coverage

## Why
- **Foundation**: All other WMS features depend on this infrastructure
- **Pattern Establishment**: Warehouses CRUD establishes patterns for Products, Suppliers, Bins, Inventory
- **Security First**: Auth and RBAC must be in place before any data operations
- **Hungarian UI**: Backend must support Hungarian validation messages and localization
- **2025 WMS Trends**: Built for AI-driven optimization, RFID integration, and IoT temperature monitoring readiness

## What
A working FastAPI backend where:
- Docker Compose spins up PostgreSQL 17, Valkey 8, and the API
- Alembic migrations create all core tables
- Users can authenticate via JWT tokens
- RBAC restricts endpoints based on user roles
- Warehouses can be created, read, updated, deleted with full validation
- All validation messages are in Hungarian

### Success Criteria
- [ ] `docker-compose up` starts all services successfully
- [ ] `alembic upgrade head` creates all tables without errors
- [ ] POST `/api/v1/auth/login` returns valid JWT tokens
- [ ] GET `/api/v1/auth/me` returns authenticated user info
- [ ] Warehouses CRUD endpoints work with proper validation
- [ ] RBAC correctly restricts access by role
- [ ] All tests pass: `pytest tests/ -v --cov=app --cov-report=term-missing`
- [ ] No linting errors: `ruff check . --fix`
- [ ] No type errors: `mypy .`

## All Needed Context

### Technology Stack (December 2025 - Latest Versions)

#### Backend
| Component | Version | Notes |
|-----------|---------|-------|
| Python | 3.13+ | FastAPI 0.125.0 supports 3.9-3.14 |
| FastAPI | 0.125.0 | Released Dec 17, 2025 |
| SQLAlchemy | 2.0.45 | Released Dec 9, 2025 - async with asyncpg |
| Pydantic | 2.11+ | 4-50x faster than v1, @field_validator syntax |
| PostgreSQL | 17.7 | Released Nov 13, 2025 - incremental backups, JSON_TABLE |
| Valkey | 8.1 | Open-source Redis fork, BSD 3-clause, 230% perf gains |
| Alembic | 1.14+ | Async template support |
| python-jose | 3.3+ | JWT with cryptography backend |
| passlib | 1.7+ | bcrypt password hashing |

#### Frontend (Phase 5 - Reference)
| Component | Version | Notes |
|-----------|---------|-------|
| React | 19.0.1 | Released Dec 3, 2025 - useActionState, useOptimistic |
| Tailwind CSS | 4.0 | CSS-first config, @theme directive, 5x faster |
| shadcn/ui | Latest | Updated for React 19 + Tailwind v4 |
| TanStack Query | 5.90+ | useSuspenseQuery, queryOptions pattern |
| Zustand | 5.x | useSyncExternalStore for concurrent rendering |

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://fastapi.tiangolo.com/release-notes/
  why: FastAPI 0.125.0 release notes and new features

- url: https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/
  why: Official JWT authentication implementation

- url: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
  why: SQLAlchemy 2.0 async best practices

- url: https://docs.pydantic.dev/latest/migration/
  why: Pydantic v2 migration guide - @field_validator syntax

- url: https://github.com/zhanymkanov/fastapi-best-practices
  why: Production FastAPI patterns and project structure

- url: https://www.postgresql.org/docs/17/release-17.html
  why: PostgreSQL 17 new features (JSON_TABLE, MERGE improvements)

- url: https://valkey.io/
  why: Valkey 8.1 - open-source Redis alternative

- file: INITIAL.md
  why: Complete technical specification with database schema

- file: Docs/pre_Technical-Specification.MD
  why: Full feature requirements and API endpoints

- file: CLAUDE.md
  why: Project conventions and rules
```

### 2025 WMS Market Trends (Integrate Where Applicable)
```yaml
AI_Features:
  - Demand forecasting and inventory optimization
  - Predictive analytics for bottleneck prevention
  - AI-driven picking route optimization

RFID_Integration:
  - Bulk scanning capability (vs single barcode)
  - Through-object scanning (UHF tags)
  - Hands-free inventory tracking

IoT_Temperature_Monitoring:
  - Real-time cold chain visibility
  - Automatic expiration date adjustments based on temperature
  - Compliance record maintenance

Future_Ready:
  - Drone inventory scanning readiness
  - Voice-directed picking integration points
  - AR/smart glasses compatibility
  - Low-code workflow customization
```

### Target Project Structure
```bash
w7-WHv1/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app factory
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                # Shared dependencies (get_db, get_current_user)
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py          # Main API router
│   │   │       ├── auth.py            # Auth endpoints
│   │   │       ├── users.py           # User management endpoints
│   │   │       └── warehouses.py      # Warehouse CRUD endpoints
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py              # Pydantic Settings
│   │   │   ├── security.py            # JWT, password hashing
│   │   │   └── i18n.py                # Hungarian messages
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # SQLAlchemy Base
│   │   │   ├── session.py             # Async engine and session
│   │   │   └── models/
│   │   │       ├── __init__.py
│   │   │       ├── user.py
│   │   │       ├── warehouse.py
│   │   │       ├── bin.py
│   │   │       ├── product.py
│   │   │       ├── supplier.py
│   │   │       ├── bin_content.py
│   │   │       └── bin_history.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   └── warehouse.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   └── warehouse.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── conftest.py            # Pytest fixtures
│   │       ├── test_auth.py
│   │       ├── test_users.py
│   │       └── test_warehouses.py
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

### Known Gotchas & Library Quirks (2025 Updated)
```python
# CRITICAL: SQLAlchemy 2.0.45 async best practices
# - Use `select(User).where(...)` NOT `session.query(User).filter(...)`
# - Set `expire_on_commit=False` in async_sessionmaker to prevent detached objects
# - Use `pool_pre_ping=True` for long-running applications
# - asyncpg driver: use `postgresql+asyncpg://` connection string

# CRITICAL: FastAPI 0.125.0 changes
# - Python 3.8 no longer supported (minimum 3.9)
# - Pydantic v2 is the default - use model_config = ConfigDict(...)
# - New scope="request" for dependencies with yield

# CRITICAL: Pydantic v2.11 syntax
# - Use `@field_validator` instead of deprecated `@validator`
# - Use `model_config = ConfigDict(from_attributes=True)` not `class Config: orm_mode = True`
# - Use `model_dump()` not `.dict()`, `model_dump_json()` not `.json()`
# - Field validation: `Field(..., min_length=2)` for string length

# CRITICAL: PostgreSQL 17 new features to leverage
# - JSON_TABLE() function for converting JSON to table format
# - MERGE with RETURNING clause for upserts
# - Incremental backups for large databases

# CRITICAL: Valkey 8.1 (Redis replacement)
# - Drop-in replacement for Redis - same API
# - BSD 3-clause license (fully open source)
# - Use `valkey://` or `redis://` connection strings (both work)

# CRITICAL: Alembic async setup
# - Initialize with: `alembic init -t async alembic`
# - Use `run_async` in env.py for async migrations

# CRITICAL: Hungarian validation messages
# - ALL user-facing error messages MUST be in Hungarian
# - Store messages in app/core/i18n.py for centralized management
```

## Implementation Blueprint

### Data Models (SQLAlchemy 2.0.45 Style)

```python
# db/models/user.py
from sqlalchemy import String, Boolean, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime, timezone

from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="warehouse")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'manager', 'warehouse', 'viewer')",
            name="check_role"
        ),
    )


# db/models/warehouse.py
from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.db.base import Base

if TYPE_CHECKING:
    from app.db.models.bin import Bin

class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    bin_structure_template: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    bins: Mapped[list["Bin"]] = relationship(
        back_populates="warehouse",
        cascade="all, delete-orphan"
    )
```

### Pydantic Schemas (V2.11 Style)

```python
# schemas/warehouse.py
from pydantic import BaseModel, Field, ConfigDict, field_validator
from uuid import UUID
from datetime import datetime
from typing import Any

# Hungarian validation messages - centralized in i18n.py
from app.core.i18n import HU_MESSAGES

class BinStructureField(BaseModel):
    name: str = Field(..., min_length=1)
    label: str = Field(..., min_length=1)  # Hungarian label
    required: bool = True
    order: int = Field(..., ge=1)

    model_config = ConfigDict(str_strip_whitespace=True)

class BinStructureTemplate(BaseModel):
    fields: list[BinStructureField] = Field(..., min_length=1)
    code_format: str = Field(..., pattern=r".*\{.*\}.*")
    separator: str = Field(default="-", max_length=5)
    auto_uppercase: bool = True
    zero_padding: bool = True

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "fields": [
                    {"name": "aisle", "label": "Sor", "required": True, "order": 1},
                    {"name": "rack", "label": "Állvány", "required": False, "order": 2},
                    {"name": "level", "label": "Szint", "required": True, "order": 3},
                    {"name": "position", "label": "Pozíció", "required": True, "order": 4}
                ],
                "code_format": "{aisle}-{rack}-{level}-{position}",
                "separator": "-",
                "auto_uppercase": True,
                "zero_padding": True
            }
        }
    )

class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=2)
    location: str | None = None
    description: str | None = None
    bin_structure_template: BinStructureTemplate
    is_active: bool = True

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError(HU_MESSAGES["name_min_length"])
        return v.strip()

class WarehouseUpdate(BaseModel):
    name: str | None = Field(None, min_length=2)
    location: str | None = None
    description: str | None = None
    bin_structure_template: BinStructureTemplate | None = None
    is_active: bool | None = None

    model_config = ConfigDict(str_strip_whitespace=True)

class WarehouseResponse(BaseModel):
    id: UUID
    name: str
    location: str | None
    description: str | None
    bin_structure_template: dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WarehouseStats(BaseModel):
    total_bins: int
    occupied_bins: int
    empty_bins: int
    utilization_percent: float
```

### JWT Authentication Pattern (2025 Best Practices)

```python
# core/security.py
from datetime import datetime, timedelta, timezone
from typing import Any
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(subject: str | Any) -> str:
    """Create JWT refresh token."""
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def decode_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
```

### Async Database Session (SQLAlchemy 2.0.45)

```python
# db/session.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from typing import AsyncGenerator

from app.core.config import settings

# Create async engine with best practices for 2025
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # Verify connections before use
    pool_size=5,
    max_overflow=10,
)

# Create async session factory
# expire_on_commit=False prevents detached instance errors in async context
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides an async database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### RBAC Dependency Pattern

```python
# api/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_async_session
from app.db.models.user import User
from app.core.security import decode_token
from app.core.i18n import HU_ERRORS

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_session)]
) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=HU_ERRORS["invalid_credentials"],
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=HU_ERRORS["inactive_user"]
        )

    return user

def require_roles(*allowed_roles: str):
    """Dependency factory for role-based access control."""
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=HU_ERRORS["not_enough_permissions"]
            )
        return current_user
    return role_checker

# Pre-defined role dependencies
RequireAdmin = Annotated[User, Depends(require_roles("admin"))]
RequireManager = Annotated[User, Depends(require_roles("admin", "manager"))]
RequireWarehouse = Annotated[User, Depends(require_roles("admin", "manager", "warehouse"))]
RequireViewer = Annotated[User, Depends(require_roles("admin", "manager", "warehouse", "viewer"))]
```

### List of Tasks

```yaml
Task 1: Project Setup and Docker Environment
CREATE w7-WHv1/backend/pyproject.toml:
  - Python 3.13+ requirement
  - Dependencies (2025 versions):
    - fastapi>=0.125.0
    - uvicorn[standard]>=0.34.0
    - sqlalchemy[asyncio]>=2.0.45
    - asyncpg>=0.30.0
    - alembic>=1.14.0
    - pydantic>=2.11.0
    - pydantic-settings>=2.7.0
    - python-jose[cryptography]>=3.3.0
    - passlib[bcrypt]>=1.7.4
    - python-multipart>=0.0.20
    - httpx>=0.28.0
    - pytest>=8.3.0
    - pytest-asyncio>=0.24.0
    - pytest-cov>=6.0.0
    - factory-boy>=3.3.0
    - ruff>=0.8.0
    - mypy>=1.13.0

CREATE w7-WHv1/backend/requirements.txt:
  - Mirror pyproject.toml dependencies for pip compatibility

CREATE w7-WHv1/backend/Dockerfile:
  - Python 3.13-slim base
  - Install dependencies
  - Copy app code
  - Uvicorn entrypoint

CREATE w7-WHv1/docker-compose.yml:
  - PostgreSQL 17 service with persistent volume
  - Valkey 8 service (Redis replacement, open-source)
  - Backend service with env vars
  - Network configuration

CREATE w7-WHv1/.env.example:
  - All required environment variables with descriptions

Task 2: Core Configuration Module
CREATE w7-WHv1/backend/app/core/config.py:
  - Pydantic Settings class with model_config
  - Load from .env file
  - DATABASE_URL (postgresql+asyncpg://), JWT_SECRET, VALKEY_URL
  - Token expiration settings
  - Timezone (Europe/Budapest)

CREATE w7-WHv1/backend/app/core/i18n.py:
  - Hungarian message dictionaries (HU_MESSAGES, HU_ERRORS)
  - Validation messages
  - Error messages
  - Date/number formatting helpers (Hungarian locale)

Task 3: Database Layer Setup
CREATE w7-WHv1/backend/app/db/base.py:
  - SQLAlchemy declarative base
  - Mixins for common columns (id, created_at, updated_at)
  - Use timezone-aware datetime

CREATE w7-WHv1/backend/app/db/session.py:
  - Async engine creation with pool_pre_ping=True
  - Async session factory with expire_on_commit=False
  - get_async_session dependency with proper cleanup

RUN alembic init -t async alembic:
  - Initialize Alembic with async template

MODIFY w7-WHv1/backend/alembic/env.py:
  - Import Base metadata from all models
  - Configure DATABASE_URL from settings
  - Setup async context with run_async

Task 4: Database Models (All Core Tables)
CREATE w7-WHv1/backend/app/db/models/__init__.py:
  - Import all models for Alembic discovery

CREATE w7-WHv1/backend/app/db/models/user.py:
  - User model with role constraint
  - Password hash column
  - Active status
  - Timezone-aware timestamps

CREATE w7-WHv1/backend/app/db/models/warehouse.py:
  - Warehouse model with JSONB template
  - Relationship to bins

CREATE w7-WHv1/backend/app/db/models/bin.py:
  - Bin model with status constraint (empty|occupied|reserved|inactive)
  - JSONB structure_data
  - Relationship to warehouse and contents

CREATE w7-WHv1/backend/app/db/models/product.py:
  - Product model with optional unique SKU
  - Category, default unit

CREATE w7-WHv1/backend/app/db/models/supplier.py:
  - Supplier model with contact info
  - Tax number field

CREATE w7-WHv1/backend/app/db/models/bin_content.py:
  - BinContent model with all date fields
  - Check constraints: use_by_date >= best_before_date
  - Relationships to bin, product, supplier

CREATE w7-WHv1/backend/app/db/models/bin_history.py:
  - BinHistory model for archived contents
  - Removal reason field

RUN alembic revision --autogenerate -m "initial_schema":
  - Generate migration for all models

RUN alembic upgrade head:
  - Apply migration

Task 5: Pydantic Schemas (V2.11 Syntax)
CREATE w7-WHv1/backend/app/schemas/auth.py:
  - Token, TokenPayload schemas
  - LoginRequest, LoginResponse schemas
  - Use model_config = ConfigDict(...)

CREATE w7-WHv1/backend/app/schemas/user.py:
  - UserCreate, UserUpdate, UserResponse schemas
  - Password validation with @field_validator
  - Role enum validation

CREATE w7-WHv1/backend/app/schemas/warehouse.py:
  - BinStructureTemplate, BinStructureField schemas
  - WarehouseCreate, WarehouseUpdate, WarehouseResponse schemas
  - WarehouseStats schema
  - Hungarian validation messages

Task 6: Security Module
CREATE w7-WHv1/backend/app/core/security.py:
  - Password hashing with bcrypt
  - JWT token creation (access + refresh)
  - Token verification
  - Use timezone-aware datetime

Task 7: API Dependencies
CREATE w7-WHv1/backend/app/api/deps.py:
  - get_async_session dependency
  - get_current_user dependency
  - RBAC role checker factory
  - Pre-defined role dependencies (RequireAdmin, RequireManager, etc.)

Task 8: Service Layer
CREATE w7-WHv1/backend/app/services/auth.py:
  - authenticate_user function
  - create_tokens function

CREATE w7-WHv1/backend/app/services/user.py:
  - create_user, get_user, update_user, delete_user
  - get_users with pagination
  - Use SQLAlchemy 2.0 select() syntax

CREATE w7-WHv1/backend/app/services/warehouse.py:
  - create_warehouse, get_warehouse, update_warehouse, delete_warehouse
  - get_warehouses with pagination and filters
  - get_warehouse_stats (count bins by status)

Task 9: API Endpoints
CREATE w7-WHv1/backend/app/api/v1/auth.py:
  - POST /login - OAuth2 password flow
  - POST /logout - Invalidate token (optional)
  - POST /refresh - Refresh access token
  - GET /me - Current user info

CREATE w7-WHv1/backend/app/api/v1/users.py:
  - Admin-only user CRUD
  - GET /users - List users with pagination
  - POST /users - Create user
  - GET /users/{id} - Get user
  - PUT /users/{id} - Update user
  - DELETE /users/{id} - Delete user

CREATE w7-WHv1/backend/app/api/v1/warehouses.py:
  - GET /warehouses - List warehouses
  - POST /warehouses - Create warehouse (admin/manager)
  - GET /warehouses/{id} - Get warehouse
  - PUT /warehouses/{id} - Update warehouse (admin/manager)
  - DELETE /warehouses/{id} - Delete warehouse (admin only)
  - GET /warehouses/{id}/stats - Get warehouse statistics

CREATE w7-WHv1/backend/app/api/v1/router.py:
  - Include all routers with prefixes

CREATE w7-WHv1/backend/app/main.py:
  - FastAPI app factory
  - CORS middleware
  - Include v1 router
  - Health check endpoint (/health)
  - OpenAPI docs at /docs

Task 10: Test Suite
CREATE w7-WHv1/backend/app/tests/conftest.py:
  - Async test database fixture (use test database)
  - Test client fixture with httpx.AsyncClient
  - User factory with factory-boy
  - Auth header fixture

CREATE w7-WHv1/backend/app/tests/test_auth.py:
  - Test login success
  - Test login failure (wrong password)
  - Test login failure (inactive user)
  - Test refresh token
  - Test get /me

CREATE w7-WHv1/backend/app/tests/test_users.py:
  - Test create user (admin only)
  - Test list users with pagination
  - Test update user
  - Test delete user
  - Test RBAC restrictions

CREATE w7-WHv1/backend/app/tests/test_warehouses.py:
  - Test create warehouse with valid template
  - Test create warehouse with invalid template (edge case)
  - Test get warehouse by id
  - Test list warehouses with filters
  - Test update warehouse
  - Test delete warehouse (only if no bins)
  - Test warehouse stats
  - Test RBAC restrictions

Task 11: Seed Data Script
CREATE w7-WHv1/backend/app/db/seed.py:
  - Create admin user (username: admin, password: admin123)
  - Create sample warehouse with predefined templates
  - Idempotent (can run multiple times safely)

Task 12: Documentation
UPDATE w7-WHv1/README.md:
  - Setup instructions
  - Environment configuration
  - Docker commands
  - Running tests
  - API documentation link
  - Version requirements
```

### Integration Points
```yaml
DATABASE:
  - PostgreSQL 17 with asyncpg driver
  - All tables created via Alembic migration
  - Indexes as specified in INITIAL.md
  - JSON_TABLE ready for advanced queries

CONFIG:
  - All settings via environment variables
  - .env file loaded by pydantic-settings
  - No hardcoded values

CACHE:
  - Valkey 8.1 (Redis-compatible, BSD 3-clause license)
  - Used for Celery broker (Phase 2)
  - Session caching ready

API:
  - All endpoints under /api/v1/
  - OpenAPI docs at /docs
  - Health check at /health
  - CORS configured for frontend
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
cd w7-WHv1/backend
source ../venv_linux/bin/activate  # Or use docker exec

ruff check . --fix              # Auto-fix style issues
mypy .                          # Type checking

# Expected: No errors. If errors, READ and fix.
```

### Level 2: Unit Tests
```bash
# Run tests with coverage
cd w7-WHv1/backend
pytest tests/ -v --cov=app --cov-report=term-missing

# Expected: All tests pass, coverage >80%
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start services
docker-compose up -d

# Wait for healthy status
docker-compose ps

# Run migrations
docker-compose exec backend alembic upgrade head

# Run seed script
docker-compose exec backend python -m app.db.seed

# Test endpoints manually
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"

# Expected: {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}

# Test authenticated endpoint
TOKEN="<access_token_from_above>"
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"id": "...", "username": "admin", "role": "admin", ...}

# Test warehouses CRUD
curl -X POST http://localhost:8000/api/v1/warehouses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Főraktár",
    "location": "Budapest",
    "bin_structure_template": {
      "fields": [
        {"name": "aisle", "label": "Sor", "required": true, "order": 1},
        {"name": "level", "label": "Szint", "required": true, "order": 2},
        {"name": "position", "label": "Pozíció", "required": true, "order": 3}
      ],
      "code_format": "{aisle}-{level}-{position}",
      "separator": "-",
      "auto_uppercase": true,
      "zero_padding": true
    }
  }'

# Expected: 201 Created with warehouse data
```

## Final Validation Checklist
- [ ] All tests pass: `pytest tests/ -v --cov=app`
- [ ] No linting errors: `ruff check .`
- [ ] No type errors: `mypy .`
- [ ] Docker Compose starts all services: `docker-compose up -d`
- [ ] Migrations run successfully: `alembic upgrade head`
- [ ] Login endpoint works and returns tokens
- [ ] RBAC correctly restricts access
- [ ] Warehouses CRUD works with Hungarian validation
- [ ] API docs accessible at /docs
- [ ] Error messages are in Hungarian

---

## Anti-Patterns to Avoid
- ❌ Don't use SQLAlchemy 1.x query style - use 2.0 select() syntax
- ❌ Don't use sync database sessions in async endpoints
- ❌ Don't hardcode secrets - use environment variables
- ❌ Don't skip validation - all user input must be validated
- ❌ Don't use English error messages - all user-facing text must be Hungarian
- ❌ Don't create sync routes with async database calls
- ❌ Don't skip RBAC checks on sensitive endpoints
- ❌ Don't commit .env files - only .env.example
- ❌ Don't use deprecated Pydantic v1 syntax (@validator, .dict(), class Config)
- ❌ Don't use naive datetime - always use timezone-aware (datetime.now(timezone.utc))

## Deprecated Patterns (Do NOT Use)
```python
# ❌ DEPRECATED - Pydantic v1 syntax
class OldModel(BaseModel):
    class Config:
        orm_mode = True  # ❌ Use model_config = ConfigDict(from_attributes=True)

    @validator("name")  # ❌ Use @field_validator
    def validate_name(cls, v):
        return v

    def to_dict(self):
        return self.dict()  # ❌ Use model_dump()

# ❌ DEPRECATED - SQLAlchemy 1.x style
session.query(User).filter(User.id == id).first()  # ❌
# ✅ Use: result = await session.execute(select(User).where(User.id == id))

# ❌ DEPRECATED - Naive datetime
from datetime import datetime
datetime.utcnow()  # ❌ Use datetime.now(timezone.utc)
```

## Environment Variables Template
```bash
# Database - PostgreSQL 17
DATABASE_URL=postgresql+asyncpg://wms_user:wms_password@db:5432/wms
DB_PASSWORD=wms_password

# JWT
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Valkey (Redis replacement) - BSD 3-clause license
VALKEY_URL=valkey://valkey:6379

# App
TIMEZONE=Europe/Budapest
LANGUAGE=hu
DEBUG=true

# Email (for Phase 2 - Celery tasks)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@yourcompany.com
```

## Confidence Score: 9/10

High confidence due to:
- All libraries updated to December 2025 latest stable versions
- Well-documented tech stack with official examples
- Clear patterns from FastAPI 0.125.0 documentation
- Greenfield project with no legacy constraints
- Comprehensive validation gates
- Deprecated patterns explicitly called out

Minor uncertainty on:
- Valkey 8.1 vs Redis 8.0 edge case compatibility (99.9% compatible)
- PostgreSQL 17 JSON_TABLE advanced usage patterns

## Next Phases (Out of Scope for This PRP)
- Phase 2: Products, Suppliers, Bins CRUD + Bulk Generation
- Phase 3: Inventory Receipt/Issue + FEFO Logic
- Phase 4: Reports + Celery scheduled jobs + Hungarian email templates
- Phase 5: Frontend with React 19 + Tailwind v4 + shadcn/ui

## Sources
- [FastAPI Releases](https://github.com/fastapi/fastapi/releases)
- [SQLAlchemy 2.0 Async Documentation](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [PostgreSQL 17 Release Notes](https://www.postgresql.org/about/news/postgresql-17-released-2936/)
- [Valkey vs Redis Comparison](https://betterstack.com/community/comparisons/redis-vs-valkey/)
- [React 19 Features](https://react.dev/blog/2024/12/05/react-19)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [WMS Trends 2025](https://www.clickpost.ai/warehouse-management-software/trends)
