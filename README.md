# Warehouse Management System (WMS)

A comprehensive web-based warehouse management system designed for pallet racking warehouses with support for food products requiring strict date tracking and FEFO (First Expired, First Out) inventory management.

## Features

### Completed (Phase 1 & 2)
- ✅ JWT authentication with access/refresh tokens
- ✅ Role-based access control (admin, manager, warehouse, viewer)
- ✅ Warehouses CRUD with customizable bin structure templates
- ✅ Products CRUD with SKU validation and category filtering
- ✅ Suppliers CRUD with Hungarian tax number validation
- ✅ Bins CRUD with warehouse filtering and status management
- ✅ Bulk bin generation from range specifications
- ✅ Hungarian localization for all user-facing messages
- ✅ Comprehensive test coverage (88 tests passing)

### Planned (Phase 3+)
- 🔄 Bin contents (inventory tracking)
- 🔄 FEFO (First Expired, First Out) logic
- 🔄 Stock movements and history
- 🔄 Reporting and analytics
- 🔄 Frontend (React 19 + Tailwind v4)

## Technology Stack

**Backend**: Python 3.13+, FastAPI 0.125.0, SQLAlchemy 2.0.45, PostgreSQL 17, Valkey 8.1
**Frontend**: React 19, Tailwind CSS 4.0, shadcn/ui, TanStack Query 5.90+, Zustand 5.x
**Testing**: pytest with 88 passing tests
**Code Quality**: ruff (linting + formatting), mypy (type checking)

## Quick Start

See [w7-WHv1/README.md](w7-WHv1/README.md) for detailed setup instructions.

```bash
# Clone and start services
cd w7-WHv1
docker-compose up -d

# Run migrations and seed data
docker-compose exec backend alembic upgrade head
docker-compose exec backend python -m app.db.seed

# Access API
open http://localhost:8000/docs
```

## Project Structure

```
warehouse-management-system/
├── w7-WHv1/              # Main application
│   ├── backend/          # FastAPI backend
│   └── frontend/         # React frontend (Phase 3+)
├── PRPs/                 # Planning & Requirements Prompts
├── Docs/                 # Documentation
├── CLAUDE.md             # AI assistant guidance
├── PLANNING.md           # Project direction
└── TASK.md               # Task tracking
```

## Documentation

- [Setup Guide](w7-WHv1/README.md) - Installation and configuration
- [Architecture](Docs/Phase1_Architecture.md) - System design and patterns
- [API Reference](Docs/Phase1_API_Reference.md) - All endpoints with examples
- [Database Schema](Docs/Phase1_Database_Schema.md) - Tables and relationships
- [Authentication](Docs/Phase1_Authentication.md) - JWT and RBAC details

## License

Proprietary - All rights reserved.
