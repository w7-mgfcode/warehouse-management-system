# TASK

Last updated: 2025-12-21

## Active

### Phase 5: Frontend (React 19 + Tailwind v4 + shadcn/ui)
**Branch**: `05-Frontend-Phase_5`
**Specification**: `INITIAL5.md`
**PRP**: `PRPs/phase5-frontend-react19-tailwind4.md`
**Confidence Score**: 6/10 (large scope ~130 files, bleeding edge stack)

#### Milestone 1: Foundation
- [ ] Initialize Vite project with React 19 + TypeScript
- [ ] Configure Tailwind CSS v4 with `@theme` directive
- [ ] Initialize shadcn/ui (canary) components
- [ ] Set up API client with axios interceptors
- [ ] Create Zustand auth store with persistence
- [ ] Implement protected routes
- [ ] Build login page

#### Milestone 2: Layout & Navigation
- [ ] Create app layout with sidebar
- [ ] Build navigation menu with Hungarian labels
- [ ] Add breadcrumb component
- [ ] Implement dark mode toggle
- [ ] Make layout responsive

#### Milestone 3: Dashboard
- [ ] Build KPI cards component
- [ ] Add occupancy chart (Recharts)
- [ ] Add movement history chart
- [ ] Create expiry warnings list
- [ ] Implement quick actions

#### Milestone 4: Master Data CRUD
- [ ] Warehouses list/form pages
- [ ] Products list/form pages
- [ ] Suppliers list/form pages
- [ ] Bins list/form pages
- [ ] Bulk bin generation page

#### Milestone 5: Inventory Operations
- [ ] Receipt form with validation
- [ ] Issue form with FEFO recommendation
- [ ] Stock overview table
- [ ] Expiry warnings page
- [ ] Movement history page

#### Milestone 6: Advanced Features
- [ ] Same-warehouse transfer form
- [ ] Cross-warehouse transfer form
- [ ] Reservations list/form
- [ ] Reservation fulfillment

#### Milestone 7: Reports & Polish
- [ ] Stock levels report
- [ ] Expiry timeline report
- [ ] Movements report
- [ ] Export functionality (CSV/Excel)
- [ ] User management (admin only)

#### Milestone 8: Testing & Documentation
- [ ] Unit tests (Vitest + Testing Library)
- [ ] Integration tests with MSW
- [ ] E2E tests (Playwright)
- [ ] Frontend README documentation

### Backlog
- **Phase 3 Tests**: Implement 48 missing tests for inventory, FEFO, movements, and expiry endpoints (see INITIAL4.md for details)

Note: Implementation work items belong here; GitHub ops (branches/PR hygiene/labels/checks) are handled by Copilot per `AGENTS.md`.

## Completed
- 2025-12-21 — Create Phase 5 PRP (`PRPs/phase5-frontend-react19-tailwind4.md`) with 8 implementation phases.
- 2025-12-21 — Create INITIAL5.md Phase 5 frontend specification (React 19 + Tailwind v4 + shadcn/ui).
- 2025-12-21 — Add lightweight GitHub governance (PR template, issue templates, CODEOWNERS, CI with Postgres).
- 2025-12-21 — Add agent governance docs (`AGENTS.md`, `specs/*`, `.github/copilot-instructions.md`).
- 2025-12-21 — Phase 2: Implement Products, Suppliers, Bins CRUD with bulk generation (88 tests passing).
- 2025-12-21 — Create comprehensive Phase 2 documentation (5 files, ~4,261 lines covering API, database, algorithms, testing).
- 2025-12-21 — Phase 3: Implement Inventory Receipt/Issue with FEFO enforcement, Movement audit trail, and Expiry warnings (core implementation complete).
- 2025-12-21 — Create comprehensive Phase 3 documentation (6 files, ~5,400 lines covering API, database, FEFO compliance, movement audit, and testing).
- 2025-12-21 — Phase 4: Implement transfers, reservations, jobs, and email services (18 endpoints, 4 new tables).
- 2025-12-21 — Create comprehensive Phase 4 documentation (4 files, ~2,840 lines covering API, database, testing).

## Phase 3 Implementation Details
**Completed**: 2025-12-21
**Branch**: 03-Phase_3

### Database Layer
- Modified `BinContent` model: Added `batch_number`, `quantity`, `unit`, `status`, `received_date`, `weight_kg`
- Created `BinMovement` model: Immutable audit trail for all inventory transactions
- Deleted obsolete `BinHistory` model
- Generated Alembic migration: `20251221_074407_fb475d91443e_phase3_inventory_movements.py`
- Updated model relationships: Bin → contents (one-to-many for multiple batches)

### Schemas Layer (Pydantic v2)
- `app/schemas/inventory.py`: Receipt/issue requests, FEFO recommendations, stock levels
- `app/schemas/movement.py`: Movement history and filtering
- `app/schemas/expiry.py`: Expiry warnings with urgency levels

### Service Layer
- `app/services/fefo.py`: FEFO recommendation algorithm (sort by use_by_date → batch_number → received_date)
- `app/services/movement.py`: Movement tracking and audit queries
- `app/services/expiry.py`: Expiry warnings (critical <7d, high 7-14d, medium 15-30d)
- `app/services/inventory.py`: Receipt, issue, adjustment, scrap operations with FEFO enforcement

### API Layer (FastAPI)
- `app/api/v1/inventory.py`: 8 endpoints (receive, issue, FEFO recommendation, stock levels, expiry warnings, adjust, scrap)
- `app/api/v1/movements.py`: 2 endpoints (list movements with filters, get by ID)
- `app/api/v1/reports.py`: 2 endpoints (inventory summary, product locations)
- Registered all routers in `app/api/v1/router.py`

### Localization
- Added 24 Hungarian messages to `app/core/i18n.py` for Phase 3 features

### Code Quality
- ✅ Ruff linter: All checks passed
- ⚠️ Mypy: 19 advisory warnings (mostly from existing Phase 1/2 code)
- ✅ App imports successfully

### Key Features Implemented
1. **Receipt Operations**: Full traceability with batch numbers, expiry dates, supplier tracking
2. **FEFO Algorithm**: Strict enforcement with oldest-expiry-first picking recommendations
3. **Issue Operations**: Warehouse users follow FEFO; managers can override with documented reason
4. **Immutable Audit Trail**: All movements recorded in `bin_movements` (never updated/deleted)
5. **Expiry Warnings**: Automatic alerts for products approaching expiration
6. **Stock Reports**: Real-time inventory levels by product/warehouse/bin

### Technical Highlights
- One bin = one product (multiple batches allowed)
- FEFO sort: `use_by_date ASC, batch_number ASC, received_date ASC`
- Movement types: receipt, issue, adjustment, transfer, scrap
- RBAC: Warehouse+ for receipt/issue; Manager+ for FEFO override/adjust/scrap
- Hungarian UI: All user-facing messages localized

### Files Created (17 new files)
- Models: `bin_movement.py` (modified: `bin_content.py`, `bin.py`)
- Schemas: `inventory.py`, `movement.py`, `expiry.py`
- Services: `fefo.py`, `movement.py`, `expiry.py`, `inventory.py`
- API: `inventory.py`, `movements.py`, `reports.py`
- Migration: `20251221_074407_fb475d91443e_phase3_inventory_movements.py`

### Testing
- ⚠️ API endpoints implemented but tests NOT created
- **TODO**: Create test_inventory.py, test_fefo.py, test_movements.py, test_expiry.py (~48 tests)
- Test coverage: Inventory operations, FEFO algorithm, movement audit, expiry warnings
- All tests documented in `Docs/Phase3_Testing_Guide.md`

### Documentation
- ✅ 6 comprehensive documentation files created (~5,400 lines total)
- `Phase3_Overview.md`: Business context and quick reference
- `Phase3_API_Reference.md`: All 12 endpoints with examples
- `Phase3_Database_Schema.md`: Database design and migrations
- `Phase3_FEFO_Compliance.md`: Algorithm deep dive and food safety
- `Phase3_Movement_Audit.md`: Audit trail and traceability
- `Phase3_Testing_Guide.md`: Test patterns and CI/CD

### Next Steps (Phase 4+)
- Apply migration to production database
- Stock reservations, bin transfers, barcode integration

## Phase 4 Implementation Details
**Completed**: 2025-12-21
**Branch**: 04-Phase_4

### Database Layer
- Created `StockReservation` model: FEFO-ordered reservations with status workflow
- Created `ReservationItem` model: Links reservations to bin_contents
- Created `WarehouseTransfer` model: Cross-warehouse transfer tracking
- Created `JobExecution` model: Background job execution logging
- Modified `BinContent` model: Added `reserved_quantity` column
- Generated Alembic migration for Phase 4 tables

### Schemas Layer (Pydantic v2)
- `app/schemas/transfer.py`: Transfer requests, cross-warehouse, dispatch/confirm
- `app/schemas/reservation.py`: Reservation create/fulfill, FEFO allocation
- `app/schemas/jobs.py`: Job trigger, status, execution history

### Service Layer
- `app/services/transfer.py`: Same-warehouse and cross-warehouse transfer logic
- `app/services/reservation.py`: FEFO allocation, fulfill, cancel operations
- `app/services/email.py`: Hungarian email templates for expiry alerts

### API Layer (FastAPI) - 18 new endpoints
- `app/api/v1/transfers.py`: 8 endpoints (same-warehouse, cross-warehouse, dispatch, confirm, cancel)
- `app/api/v1/reservations.py`: 6 endpoints (create, list, fulfill, cancel, expiring)
- `app/api/v1/jobs.py`: 4 endpoints (trigger, status, executions)

### Background Jobs (Celery)
- `app/tasks/jobs.py`: Scheduled tasks for reservation cleanup and expiry alerts

### Localization
- Added 32 Hungarian messages to `app/core/i18n.py` (transfers, reservations, jobs)

### Documentation
- ✅ 4 comprehensive documentation files created (~2,840 lines total)
- `Phase4_Overview.md`: Business context and quick reference
- `Phase4_API_Reference.md`: All 18 endpoints with examples
- `Phase4_Database_Schema.md`: Database design and migrations
- `Phase4_Testing_Guide.md`: Test patterns and fixtures

## Discovered during work
- Consider tightening CI later (make `mypy` blocking once the codebase is type-clean).
- Confirm exact branch protection required-check name in GitHub UI and set it to `CI / backend (lint/type/test)`.

