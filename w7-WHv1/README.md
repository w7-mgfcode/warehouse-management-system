# WMS - Warehouse Management System

A modern Warehouse Management System with FEFO (First Expired, First Out) inventory management, built with FastAPI and PostgreSQL.

## Technology Stack

### Backend (December 2025 - Latest Versions)
- **Python 3.13+**
- **FastAPI 0.125.0** - High-performance async web framework
- **SQLAlchemy 2.0.45** - Async ORM with asyncpg driver
- **PostgreSQL 17** - Primary database
- **Valkey 8.1** - Redis-compatible cache (BSD 3-clause license)
- **Pydantic 2.11+** - Data validation with `@field_validator` syntax
- **Alembic 1.14+** - Database migrations

### Authentication & Security
- JWT access tokens (15 min expiry)
- JWT refresh tokens (7 days expiry)
- bcrypt password hashing
- Role-based access control (admin, manager, warehouse, viewer)

## Project Structure

```
w7-WHv1/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers
│   │   │   ├── deps.py     # Shared dependencies
│   │   │   └── v1/         # API v1 endpoints
│   │   ├── core/           # Config, security, i18n
│   │   ├── db/             # Database models and session
│   │   │   └── models/     # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── tests/          # Test suite
│   ├── alembic/            # Database migrations
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.13+ (for local development)

### Using Docker (Recommended)

1. **Clone and configure environment:**
   ```bash
   cd w7-WHv1
   cp .env.example .env
   # Edit .env with your settings (especially JWT_SECRET for production)
   ```

2. **Start services:**
   ```bash
   docker-compose up -d
   ```

3. **Run migrations:**
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. **Seed initial data:**
   ```bash
   docker-compose exec backend python -m app.db.seed
   ```

5. **Access the API:**
   - API: [http://localhost:8000](http://localhost:8000)
   - Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Health: [http://localhost:8000/health](http://localhost:8000/health)

### Local Development

1. **Create virtual environment:**
   ```bash
   cd w7-WHv1/backend
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or: venv\Scripts\activate  # Windows
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set environment variables:**
   ```bash
   export DATABASE_URL="postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms"
   export JWT_SECRET="your-super-secret-key-change-in-production-min-32-chars"
   ```

4. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

5. **Start development server:**
   ```bash
   uvicorn app.main:app --reload
   ```

## Running Tests

```bash
cd w7-WHv1/backend
pytest app/tests/ -v --cov=app --cov-report=term-missing
```

**Current Status**: 136 tests passing (40 Phase 1 + 48 Phase 2 + 48 Phase 3)

## Linting and Type Checking

```bash
# Auto-fix linting issues
ruff check . --fix

# Type checking
mypy .
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - OAuth2 password login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Users (Admin only)
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/{id}` - Get user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Warehouses
- `GET /api/v1/warehouses` - List warehouses
- `POST /api/v1/warehouses` - Create warehouse (admin/manager)
- `GET /api/v1/warehouses/{id}` - Get warehouse
- `PUT /api/v1/warehouses/{id}` - Update warehouse (admin/manager)
- `DELETE /api/v1/warehouses/{id}` - Delete warehouse (admin)
- `GET /api/v1/warehouses/{id}/stats` - Get warehouse statistics

### Products
- `GET /api/v1/products` - List products (with filters: category, is_active, search)
- `POST /api/v1/products` - Create product (admin/manager)
- `GET /api/v1/products/{id}` - Get product
- `PUT /api/v1/products/{id}` - Update product (admin/manager)
- `DELETE /api/v1/products/{id}` - Delete product (admin/manager)

### Suppliers
- `GET /api/v1/suppliers` - List suppliers (with filters: is_active, search)
- `POST /api/v1/suppliers` - Create supplier (admin/manager)
- `GET /api/v1/suppliers/{id}` - Get supplier
- `PUT /api/v1/suppliers/{id}` - Update supplier (admin/manager)
- `DELETE /api/v1/suppliers/{id}` - Delete supplier (admin/manager)

### Bins
- `GET /api/v1/bins` - List bins (with filters: warehouse_id, status, search)
- `POST /api/v1/bins` - Create bin (warehouse+)
- `GET /api/v1/bins/{id}` - Get bin
- `PUT /api/v1/bins/{id}` - Update bin (warehouse+)
- `DELETE /api/v1/bins/{id}` - Delete bin (warehouse+)
- `POST /api/v1/bins/bulk/preview` - Preview bulk generation (manager+)
- `POST /api/v1/bins/bulk` - Bulk create bins (manager+)

### Inventory Operations (Phase 3)
- `POST /api/v1/inventory/receive` - Receive goods into bin (warehouse+)
- `POST /api/v1/inventory/issue` - Issue goods from bin with FEFO (warehouse+)
- `GET /api/v1/inventory/fefo-recommendation` - Get FEFO-compliant picking list
- `GET /api/v1/inventory/stock-levels` - Get stock levels by product
- `GET /api/v1/inventory/expiry-warnings` - Get products approaching expiry
- `GET /api/v1/inventory/expired` - Get expired products
- `POST /api/v1/inventory/adjust` - Adjust inventory (manager+)
- `POST /api/v1/inventory/scrap` - Scrap inventory (manager+)

### Movements (Phase 3)
- `GET /api/v1/movements` - List movements with filters (by bin, product, date range)
- `GET /api/v1/movements/{id}` - Get movement details

### Reports (Phase 3)
- `GET /api/v1/reports/inventory-summary` - Inventory summary by warehouse
- `GET /api/v1/reports/product-locations` - Find all bins containing a product

## Key Features

### FEFO (First Expired, First Out) Compliance
Phase 3 implements automated FEFO enforcement for food safety:
- **3-level sort priority**: use_by_date → batch_number → received_date
- **Multi-bin allocation**: Automatically recommends picking from multiple bins
- **Manager override**: Managers can override FEFO with documented reason
- **Expiry warnings**: 4 urgency levels (critical < 7 days, high 7-14 days, medium 15-30 days, low 31-60 days)

### Immutable Audit Trail
All inventory movements tracked in append-only log:
- **Movement types**: receipt, issue, adjustment, scrap, transfer
- **Quantity snapshots**: Before/after tracking
- **FEFO compliance tracking**: Records violations and overrides
- **User attribution**: Complete chain of custody
- **No modifications**: Movements cannot be updated or deleted

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://wms_user:wms_password@db:5432/wms` |
| `JWT_SECRET` | Secret key for JWT tokens | (required, min 32 chars) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | `7` |
| `VALKEY_URL` | Valkey connection string | `valkey://valkey:6379` |
| `TIMEZONE` | Application timezone | `Europe/Budapest` |
| `LANGUAGE` | Default language | `hu` |
| `DEBUG` | Debug mode | `true` |

## Default Admin User

After running the seed script:
- **Username:** `admin`
- **Password:** `Admin123!`
- **Role:** `admin`

## Hungarian Localization

All user-facing messages are in Hungarian:
- Validation error messages
- RBAC permission errors
- Date format: `yyyy. MM. dd.`
- Number format: comma decimal, space thousands

## License

Proprietary - All rights reserved.
