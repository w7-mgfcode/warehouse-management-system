# Warehouse Management System (WMS)

A comprehensive web-based warehouse management system designed for pallet racking warehouses with support for food products requiring strict date tracking and FEFO (First Expired, First Out) inventory management.

## Features

### Completed (Phase 1, 2, 3 & 4)

**Phase 1 - Foundation**
- ✅ JWT authentication with access/refresh tokens
- ✅ Role-based access control (admin, manager, warehouse, viewer)
- ✅ Warehouses CRUD with customizable bin structure templates
- ✅ Hungarian localization for all user-facing messages

**Phase 2 - Master Data & Storage**
- ✅ Products CRUD with SKU validation and category filtering
- ✅ Suppliers CRUD with Hungarian tax number validation
- ✅ Bins CRUD with warehouse filtering and status management
- ✅ Bulk bin generation from range specifications (e.g., 3×10×5×4 = 600 bins)

**Phase 3 - Inventory Operations & FEFO**
- ✅ Inventory receipt with batch tracking and expiry dates
- ✅ Inventory issue with FEFO (First Expired, First Out) enforcement
- ✅ FEFO algorithm with 3-level sort priority for food safety
- ✅ Movement audit trail (immutable history of all transactions)
- ✅ Expiry warnings with 4 urgency levels (critical < 7 days)
- ✅ Stock reports (levels, locations, summaries)

**Phase 4 - Advanced Operations & Automation**
- ✅ Stock reservations with FEFO allocation for customer orders
- ✅ Same-warehouse transfers between bins
- ✅ Cross-warehouse transfers with dispatch/confirm workflow
- ✅ Celery background jobs for automated maintenance
- ✅ Hungarian email alerts for expiring products
- ✅ Job monitoring and manual trigger capabilities

**Test Coverage**: 140 tests passing (Phase 1 + 2 + 3 + 4)

### Completed (Phase 5)
- ✅ **Phase 5: Frontend (React 19 + Tailwind v4 + shadcn/ui)** - 100% Complete!
  - ✅ Phase A: Foundation (Vite, Tailwind v4, shadcn/ui)
  - ✅ Phase B: Authentication & Protected Routes
  - ✅ Phase C: Layout & Navigation (sidebar, dark mode, breadcrumb)
  - ✅ Phase D: Dashboard (KPIs, charts, expiry warnings)
  - ✅ Phase E: Master Data CRUD (Warehouses, Products, Suppliers, Bins + bulk)
  - ✅ Phase F: Inventory Operations (Receipt, Issue, FEFO, Stock, Movement history)
  - ✅ Phase G: Transfers & Reservations (same-warehouse, cross-warehouse, FEFO allocation)
  - ✅ Phase H: Reports (Stock levels, Expiry, Movements) with CSV export + README

## Technology Stack

**Backend**: Python 3.13+, FastAPI 0.125.0, SQLAlchemy 2.0.45, PostgreSQL 17, Valkey 8.1
**Frontend**: React 19, Tailwind CSS 4.0, shadcn/ui, TanStack Query 5.90+, Zustand 5.x
**Testing**: pytest with 140 tests passing (Phase 1 + 2 + 3 + 4)
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
│   ├── backend/          # FastAPI backend (140 tests)
│   └── frontend/         # React 19 frontend (111 files, COMPLETE ✅)
├── PRPs/                 # Planning & Requirements Prompts
├── Docs/                 # Documentation (26 files)
├── CLAUDE.md             # AI assistant guidance
├── PLANNING.md           # Project direction
└── TASK.md               # Task tracking
```

## Documentation

### Getting Started
- [Setup Guide](w7-WHv1/README.md) - Installation and configuration
- [GitHub Workflow](Docs/GitHub_Workflow.md) - Development workflow and conventions

### Phase 1 - Foundation
- [Architecture](Docs/Phase1_Architecture.md) - System design and patterns
- [API Reference](Docs/Phase1_API_Reference.md) - Authentication, users, warehouses
- [Database Schema](Docs/Phase1_Database_Schema.md) - Core tables and relationships
- [Authentication](Docs/Phase1_Authentication.md) - JWT and RBAC details
- [Development Guide](Docs/Phase1_Development_Guide.md) - Setup and workflow

### Phase 2 - Master Data & Storage
- [Overview](Docs/Phase2_Overview.md) - Phase 2 features and quick reference
- [API Reference](Docs/Phase2_API_Reference.md) - Products, suppliers, bins endpoints
- [Database Schema](Docs/Phase2_Database_Schema.md) - Master data tables
- [Bulk Generation](Docs/Phase2_Bulk_Generation.md) - Cartesian product algorithm
- [Testing Guide](Docs/Phase2_Testing_Guide.md) - Phase 2 test patterns

### Phase 3 - Inventory Operations & FEFO
- [Overview](Docs/Phase3_Overview.md) - Phase 3 features and quick reference
- [API Reference](Docs/Phase3_API_Reference.md) - Inventory, movements, reports endpoints
- [Database Schema](Docs/Phase3_Database_Schema.md) - Inventory and movement tables
- [FEFO Compliance](Docs/Phase3_FEFO_Compliance.md) - Algorithm deep dive and food safety
- [Movement Audit](Docs/Phase3_Movement_Audit.md) - Audit trail and traceability
- [Testing Guide](Docs/Phase3_Testing_Guide.md) - Phase 3 test patterns

### Phase 4 - Advanced Operations & Automation
- [Overview](Docs/Phase4_Overview.md) - Phase 4 features and quick reference
- [API Reference](Docs/Phase4_API_Reference.md) - Transfers, reservations, jobs endpoints
- [Database Schema](Docs/Phase4_Database_Schema.md) - New tables and modifications
- [Testing Guide](Docs/Phase4_Testing_Guide.md) - Phase 4 test patterns

### Phase 5 - Frontend (React 19 + Tailwind v4) ✅ COMPLETE
- [Live Implementation A & B](Docs/Phase5_Live-AB.md) - Foundation and Authentication
- [Live Implementation C & D](Docs/Phase5_Live-CD.md) - Layout and Dashboard
- [Live Implementation E](Docs/Phase5_Live-E.md) - Master Data CRUD
- [Live Implementation F-G-H](Docs/Phase5_Live-FGH.md) - Inventory, Transfers, Reports (completed)

## Repo Governance (Agents + Workflow)

This repo is designed to be worked on by both humans and AI assistants.

- Agent roles and boundaries: [AGENTS.md](AGENTS.md)
- Global rules / merge gates: [specs/global-rules.md](specs/global-rules.md)
- Copilot (GitHub Ops) operating rules: [specs/copilot-instructions.md](specs/copilot-instructions.md)
- GitHub workflow conventions: [Docs/GitHub_Workflow.md](Docs/GitHub_Workflow.md)

## CI & Testing Notes

- CI workflow definition: [.github/workflows/ci.yml](.github/workflows/ci.yml)
- CI runs in the backend working directory and provisions Postgres 17.
- Tests default to in-memory SQLite locally; CI forces Postgres by setting `TEST_DATABASE_URL`.

Backend CI checks (run from `w7-WHv1/backend`):

```bash
ruff check .
pytest
mypy .  # advisory in CI for now
```

## License

Proprietary - All rights reserved.
