# TASK

Last updated: 2025-12-21

## Active
- **Phase 3 Tests**: Implement 48 missing tests for inventory, FEFO, movements, and expiry endpoints (see INITIAL4.md for details)

Note: Implementation work items belong here; GitHub ops (branches/PR hygiene/labels/checks) are handled by Copilot per `AGENTS.md`.

## Completed
- 2025-12-21 — Add lightweight GitHub governance (PR template, issue templates, CODEOWNERS, CI with Postgres).
- 2025-12-21 — Add agent governance docs (`AGENTS.md`, `specs/*`, `.github/copilot-instructions.md`).
- 2025-12-21 — Phase 2: Implement Products, Suppliers, Bins CRUD with bulk generation (88 tests passing).
- 2025-12-21 — Create comprehensive Phase 2 documentation (5 files, ~4,261 lines covering API, database, algorithms, testing).
- 2025-12-21 — Phase 3: Implement Inventory Receipt/Issue with FEFO enforcement, Movement audit trail, and Expiry warnings (core implementation complete).
- 2025-12-21 — Create comprehensive Phase 3 documentation (6 files, ~5,400 lines covering API, database, FEFO compliance, movement audit, and testing).

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

## Discovered during work
- Consider tightening CI later (make `mypy` blocking once the codebase is type-clean).
- Confirm exact branch protection required-check name in GitHub UI and set it to `CI / backend (lint/type/test)`.

