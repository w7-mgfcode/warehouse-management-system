# TASK

Last updated: 2025-12-28

## Active

### Phase 6: Testing, Quality Assurance & DevOps
**Branch**: `06-Testing-Phase_6`
**Specification**: `INITIAL6.md`
**PRP**: `PRPs/phase6-testing-devops.md`
**Status**: 🔄 IN PROGRESS
**Progress**: 0/6 sub-phases complete
**Confidence Score**: 8/10

#### Phase 6A: Frontend E2E Testing (Playwright) - PENDING
- [ ] Install Playwright and configure multi-browser testing
- [ ] Create authentication setup (storageState for reusable sessions)
- [ ] Create auth tests (4 tests: login, logout, invalid, RBAC)
- [ ] Create inventory tests (6 tests: receipt, issue, FEFO)
- [ ] Create master data tests (5 tests: warehouses, products, suppliers, bins, bulk)
- [ ] Create reports tests (2 tests: CSV export)
- [ ] Create accessibility tests (3 tests: a11y, keyboard nav)

#### Phase 6B: Frontend Unit Testing (Vitest) - PENDING
- [ ] Install Vitest + React Testing Library
- [ ] Create test setup and utilities
- [ ] Create utility tests (15 tests: date, number, export)
- [ ] Create component tests (20 tests: expiry-badge, FEFO, search)
- [ ] Create hook tests (10 tests: debounce)

#### Phase 6C: Production Docker Setup - PENDING
- [ ] Create backend Dockerfile.prod (multi-stage, non-root, health check)
- [ ] Create frontend Dockerfile.prod (multi-stage with nginx)
- [ ] Create nginx.conf (SPA routing, security headers, gzip)
- [ ] Create docker-compose.prod.yml (all services)
- [ ] Add health endpoint to backend

#### Phase 6D: CI/CD Pipeline - PENDING
- [ ] Enhance .github/workflows/ci.yml (frontend tests, E2E)
- [ ] Create .github/workflows/deploy-prod.yml
- [ ] Create deployment scripts (install, deploy, backup)

#### Phase 6E: Backend Enhancements - PENDING
- [ ] Add Prometheus metrics
- [ ] Add structured JSON logging
- [ ] Add rate limiting (SlowAPI)
- [ ] Create integration tests

#### Phase 6F: Documentation & Scripts - PENDING
- [ ] Create Production_Deployment.md
- [ ] Create Operations_Runbook.md
- [ ] Create Security_Hardening.md
- [ ] Create Backup_Recovery.md
- [ ] Create install-production.sh
- [ ] Create deploy.sh, backup/restore scripts

---

### Phase 5: Frontend (React 19 + Tailwind v4 + shadcn/ui) ✅ COMPLETE
**Branch**: `05-Frontend-Phase_5`
**Specification**: `INITIAL5.md`
**PRP**: `PRPs/phase5-frontend-react19-tailwind4.md`
**Status**: ✅ COMPLETE + Code Review Fixes (14 commits, ready for merge to main)
**Progress**: 8/8 phases complete + 9 CodeRabbit fixes (100% DONE)
**Confidence Score**: 10/10 (Production ready, all issues resolved)

#### Phase A: Foundation ✅ (COMPLETED 2025-12-21)
- ✅ Initialize Vite project with React 19 + TypeScript
- ✅ Configure Tailwind CSS v4 with `@theme` directive and custom colors
- ✅ Initialize shadcn/ui (canary) with 17+ components
- ✅ Configure TypeScript path aliases (@/ imports)
- ✅ Build successful (416KB JS, 23KB CSS)

#### Phase B: Authentication & Protected Routes ✅ (COMPLETED 2025-12-21)
- ✅ Create TypeScript types (User, Token, models) matching backend
- ✅ Set up API client with token refresh interceptors
- ✅ Create Zustand auth store with persistence (refreshToken only)
- ✅ Create TanStack Query client with error handling
- ✅ Create auth queries (login with form data, refresh, logout)
- ✅ Build login page with Hungarian validation
- ✅ Implement protected routes with RBAC support
- ✅ Set up routing (login, dashboard, protected routes)

#### Phase C: Layout & Navigation ✅ (COMPLETED 2025-12-21)
- ✅ Create Hungarian translations (i18n.ts) with 100+ UI strings
- ✅ Create UI store for dark mode and sidebar state
- ✅ Build sidebar component with RBAC menu filtering
- ✅ Create header with user menu and dark mode toggle
- ✅ Add breadcrumb navigation with route mapping
- ✅ Create app layout with Outlet for nested routes
- ✅ Create role guard component for RBAC UI enforcement
- ✅ Update index.html with Hungarian lang and dark mode script
- ✅ Responsive layout (desktop: fixed sidebar, mobile: Sheet drawer)

#### Phase D: Dashboard ✅ (COMPLETED 2025-12-21)
- ✅ Create date/number formatting utilities (Hungarian locale)
- ✅ Create dashboard queries (stats, expiry warnings)
- ✅ Build KPI cards component (4 cards: stock, occupancy, warnings, movements)
- ✅ Add occupancy chart with Recharts (bar chart, color-coded)
- ✅ Add movement history chart (line chart, 7-day trend)
- ✅ Create expiry warnings list with urgency badges
- ✅ Suspense boundaries with skeleton loading states

#### Phase E: Master Data CRUD ✅ (COMPLETED 2025-12-21)
- ✅ Shared components (search input, delete dialog)
- ✅ Warehouses full CRUD (7 files: queries, schema, form, list, pages)
- ✅ Products full CRUD (8 files: with unit select, search, product-select)
- ✅ Suppliers full CRUD (8 files: Hungarian tax validation `12345678-2-42`)
- ✅ Bins full CRUD (11 files: status badges, warehouse filter)
- ✅ Bulk bin generation (Cartesian product with preview: A-C × 1-10 × 1-5 × 1-4 = 600 bins)
- ✅ 13 new routes added (warehouses, products, suppliers, bins)
- ✅ Reusable components (product-select, supplier-select for inventory forms)

#### Phase F: Inventory Operations ✅ (COMPLETED 2025-12-21)
- ✅ Inventory queries (receipt, issue, FEFO, stock levels, movements)
- ✅ Receipt form with batch tracking and future expiry validation
- ✅ Issue form with FEFO recommendation display
- ✅ FEFO component showing ordered picking list (oldest expiry first)
- ✅ Expiry badge component (critical/high/medium/low with pulse animation)
- ✅ Stock overview table with filters and expiry badges
- ✅ Movement history table (immutable audit trail)
- ✅ Bin-select helper component with warehouse filtering
- ✅ 4 inventory pages (overview, receipt, issue, expiry warnings)
- ✅ Manager FEFO override with required reason (RBAC protected)

#### Phase G: Transfers & Reservations ✅ (COMPLETED 2025-12-21)
- ✅ Transfer queries (same-warehouse, cross-warehouse, pending, confirm, cancel)
- ✅ Reservation queries (create, list, fulfill, cancel, expiring)
- ✅ Transfer schemas (Zod validation)
- ✅ Reservation schemas (Zod validation with expiry)
- ✅ Transfer list component with status badges
- ✅ Reservation list component with status tracking
- ✅ 2 pages (transfers index, reservations index)
- ✅ Status workflows (pending → dispatched → completed)

#### Phase H: Reports & Testing ✅ (COMPLETED 2025-12-21)
- ✅ CSV export utility (native browser download)
- ✅ Reports index page (3 report cards)
- ✅ Stock levels report with filters and CSV export
- ✅ Expiry report with urgency grouping and CSV export
- ✅ Movements report with date range filter and CSV export
- ✅ Frontend README.md (comprehensive documentation)
- ✅ 4 reports routes added
- ✅ Production-ready documentation

#### Code Review Fixes ✅ (COMPLETED 2025-12-28)
- ✅ CodeRabbit review: 9 issues fixed (delete dialog, search debounce, field mismatches, etc.)
- ✅ Type safety improvements (Alert refs, AxiosError<APIError> error handling)
- ✅ i18n consolidation (all hardcoded Hungarian strings moved to HU object)
- ✅ Scalability guards (1000-item limits with truncation warnings)
- ✅ UX improvements (dialog dismissal prevention, warehouse/product names vs IDs)
- ✅ Cleanup (removed "use client" directives, unused enumerate variables)
- ✅ Build: 1,086 KB (327 KB gzipped), TypeScript strict mode: 0 errors

### Backlog
- **Bundle Optimization**: Implement code splitting to reduce main bundle from 1,085 KB (post-Phase 6)

Note: Implementation work items belong here; GitHub ops (branches/PR hygiene/labels/checks) are handled by Copilot per `AGENTS.md`.

## Completed
- 2025-12-28 — **Phase 6 PRP Created**: `PRPs/phase6-testing-devops.md` (8/10 confidence, 6 sub-phases).
- 2025-12-28 — **Phase 5 Code Review**: Fixed 9 CodeRabbit issues (14 commits, production-ready).
- 2025-12-28 — **Phase 3 Tests COMPLETE**: Implemented 6 missing tests (146 total tests, 100% Phase 3 coverage).
- 2025-12-21 — **Phase 5 COMPLETE (A-H)**: Full frontend implementation (111 files, 100% done).
  - Phase A-B: Vite + React 19 + Tailwind v4 + shadcn/ui, auth with token refresh
  - Phase C: Layout (sidebar, dark mode, breadcrumb), Hungarian i18n (100+ translations)
  - Phase D: Dashboard (4 KPIs, 2 charts, expiry warnings, date/number formatting)
  - Phase E: Master Data CRUD (Warehouses, Products, Suppliers, Bins + bulk generation)
  - Phase F: Inventory Operations (Receipt, Issue, FEFO recommendation, Stock, Movement history)
  - Phase G: Transfers & Reservations (same-warehouse, cross-warehouse, FEFO allocation)
  - Phase H: Reports (Stock levels, Expiry, Movements) with CSV export + README
  - Build: 1067KB JS, 32KB CSS, 25 routes, Hungarian validation, FEFO compliance
- 2025-12-21 — Create Phase 5 PRP (`PRPs/phase5-frontend-react19-tailwind4.md`) with 8 implementation phases.
- 2025-12-21 — Add Playwright MCP use cases to Phase 5 PRP (15 scenarios for frontend testing).
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

