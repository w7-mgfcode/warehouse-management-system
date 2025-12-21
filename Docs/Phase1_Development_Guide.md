# WMS Phase 1: Development Guide

**Version**: 1.0
**Last Updated**: December 2025

## Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Python | 3.13+ | [python.org](https://python.org) |
| Docker | 24.0+ | [docker.com](https://docker.com) |
| Docker Compose | 2.20+ | Included with Docker Desktop |
| Git | 2.40+ | [git-scm.com](https://git-scm.com) |

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd w7-WAREHOUSE
```

### 2. Start Infrastructure Services

```bash
cd w7-WHv1
docker-compose up -d db valkey
```

Wait for services to be healthy:
```bash
docker-compose ps
```

### 3. Setup Python Environment

```bash
cd backend

# Create virtual environment
python3.13 -m venv ../venv_linux
source ../venv_linux/bin/activate

# Install dependencies
pip install -r requirements.txt

# Or using pyproject.toml with dev dependencies
pip install -e ".[dev]"
```

### 4. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit configuration
nano .env
```

### 5. Run Database Migrations

```bash
alembic upgrade head
```

### 6. Seed Initial Data

```bash
python -m app.db.seed
```

### 7. Start Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 8. Access the Application

- **API Documentation**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>
- **Health Check**: <http://localhost:8000/api/v1/health>

---

## Docker Compose Setup

### Full Stack (Development)

```bash
cd w7-WHv1
docker-compose up -d
```

### Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| db | wms_postgres | 5432 | PostgreSQL 17 database |
| valkey | wms_valkey | 6379 | Cache/message broker |
| backend | wms_backend | 8000 | FastAPI application |

### Service Commands

```bash
# View logs
docker-compose logs -f backend

# Restart backend
docker-compose restart backend

# Stop all services
docker-compose down

# Stop and remove volumes (clean reset)
docker-compose down -v
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `your-super-secret-key-min-32-chars` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `VALKEY_URL` | Valkey connection string | `valkey://localhost:6379` |
| `TIMEZONE` | Application timezone | `Europe/Budapest` |
| `LANGUAGE` | UI language | `hu` |
| `DEBUG` | Debug mode | `true` |

### Example `.env` File

```bash
# Database - PostgreSQL 17
DATABASE_URL=postgresql+asyncpg://wms_user:wms_password@localhost:5432/wms
DB_PASSWORD=wms_password

# JWT
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Valkey (Redis replacement)
VALKEY_URL=valkey://localhost:6379

# Application
TIMEZONE=Europe/Budapest
LANGUAGE=hu
DEBUG=true
```

---

## Database Management

### Alembic Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Add new table"

# Apply all migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# Show current revision
alembic current

# Show migration history
alembic history
```

### Direct Database Access

```bash
# Connect via Docker
docker exec -it wms_postgres psql -U wms_user -d wms

# Useful PostgreSQL commands
\dt                  # List tables
\d+ users            # Describe table
\q                   # Quit
```

### Reset Database

```bash
# Drop and recreate (Docker)
docker-compose down -v
docker-compose up -d db
sleep 5
alembic upgrade head
python -m app.db.seed
```

---

## Testing

### Run All Tests

```bash
# Activate virtual environment
source ../venv_linux/bin/activate

# Run tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Verbose output
pytest -v

# Run specific test file
pytest app/tests/test_auth.py

# Run specific test
pytest -k "test_login_success"
```

### Test Configuration

Tests use SQLite in-memory database for speed:
- No Docker services required for tests
- Isolated test database per test function
- Factory fixtures for test data

### Test Structure

```
app/tests/
├── __init__.py
├── conftest.py          # Fixtures and configuration
├── test_auth.py         # Authentication tests
├── test_users.py        # User management tests
└── test_warehouses.py   # Warehouse CRUD tests
```

### Coverage Report

```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

---

## Code Quality

### Ruff (Linting & Formatting)

```bash
# Check for issues
ruff check .

# Auto-fix issues
ruff check . --fix

# Format code
ruff format .
```

### MyPy (Type Checking)

```bash
mypy .
```

### Pre-commit Workflow

```bash
# Run all checks before commit
ruff check . --fix && ruff format . && pytest
```

---

## API Development

### Interactive Documentation

After starting the server, visit:
- **Swagger UI**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>

### Authentication Testing

```bash
# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=Admin123!"

# Use access token
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

### HTTPie (Alternative to curl)

```bash
# Install
pip install httpie

# Login
http -f POST localhost:8000/api/v1/auth/login username=admin password=Admin123!

# Authenticated request
http GET localhost:8000/api/v1/auth/me "Authorization: Bearer <token>"
```

---

## Project Structure

```
w7-WHv1/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app factory
│   │   ├── api/
│   │   │   ├── deps.py          # Shared dependencies
│   │   │   └── v1/
│   │   │       ├── router.py    # Main router
│   │   │       ├── auth.py      # Auth endpoints
│   │   │       ├── users.py     # User endpoints
│   │   │       └── warehouses.py
│   │   ├── core/
│   │   │   ├── config.py        # Settings
│   │   │   ├── security.py      # JWT utilities
│   │   │   └── i18n.py          # Hungarian messages
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy base
│   │   │   ├── session.py       # Session factory
│   │   │   ├── seed.py          # Initial data
│   │   │   └── models/          # ORM models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic
│   │   └── tests/               # Test suite
│   ├── alembic/                 # Migrations
│   ├── alembic.ini
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Development Workflow

### Adding a New Entity

1. **Create Model** (`app/db/models/entity.py`)
   ```python
   class Entity(Base):
       __tablename__ = "entities"
       id: Mapped[uuid.UUID] = mapped_column(GUID(), primary_key=True)
       # ... fields
   ```

2. **Create Schemas** (`app/schemas/entity.py`)
   ```python
   class EntityCreate(BaseModel):
       # ... input fields

   class EntityResponse(BaseModel):
       model_config = ConfigDict(from_attributes=True)
       # ... output fields
   ```

3. **Create Service** (`app/services/entity.py`)
   ```python
   async def create_entity(db: AsyncSession, entity_in: EntityCreate) -> Entity:
       # ... business logic
   ```

4. **Create Router** (`app/api/v1/entity.py`)
   ```python
   @router.post("/", response_model=EntityResponse, status_code=201)
   async def create_entity(entity_in: EntityCreate, db: DbSession):
       # ... endpoint
   ```

5. **Register Router** (`app/api/v1/router.py`)
   ```python
   from app.api.v1.entity import router as entity_router
   router.include_router(entity_router, prefix="/entities", tags=["Entities"])
   ```

6. **Create Migration**
   ```bash
   alembic revision --autogenerate -m "Add entities table"
   alembic upgrade head
   ```

7. **Write Tests** (`app/tests/test_entities.py`)

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs db

# Verify connection
docker exec -it wms_postgres pg_isready -U wms_user -d wms
```

### bcrypt Version Error

If you see `ValueError: password cannot be longer than 72 bytes`:

```bash
# Downgrade bcrypt
pip install 'bcrypt>=4.0.0,<5.0.0'
```

### Import Errors

```bash
# Ensure virtual environment is activated
source ../venv_linux/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Alembic Errors

```bash
# Reset migrations (development only)
rm -rf alembic/versions/*
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

## VS Code Configuration

### Recommended Extensions

- Python
- Pylance
- Ruff
- Docker

### Workspace Settings (`.vscode/settings.json`)

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/../venv_linux/bin/python",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll": "explicit",
      "source.organizeImports": "explicit"
    }
  },
  "python.testing.pytestEnabled": true,
  "python.testing.pytestPath": "${workspaceFolder}/../venv_linux/bin/pytest"
}
```

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | Admin123! | admin |

**Warning**: Change credentials before production deployment.
