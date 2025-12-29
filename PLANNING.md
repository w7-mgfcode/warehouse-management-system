# PLANNING

Last updated: 2025-12-28

## Purpose
This file is the lightweight "source of truth" for project direction, constraints, and working agreements.

## Project
Warehouse Management System (WMS) for pallet racking warehouses with FEFO inventory.

## Current Status

| Phase | Status | Branch | Description |
|-------|--------|--------|-------------|
| Phase 1 | ✅ Complete | `main` | Backend foundation, auth, RBAC, warehouses |
| Phase 2 | ✅ Complete | `main` | Products, suppliers, bins CRUD + bulk generation |
| Phase 3 | ✅ Complete | `main` | Inventory operations, FEFO, movements, expiry |
| Phase 4 | ✅ Complete | `main` | Transfers, reservations, jobs, email alerts |
| Phase 5 | ✅ Complete | `05-Frontend-Phase_5` → Ready for merge | React 19 frontend + all fixes |
| Phase 6 | ✅ Complete | `06-Testing-Phase_6` → Ready for merge | Testing, QA & DevOps (100% complete: A-F done + comprehensive documentation + E2E fixes) |

**Test Coverage**: 173 backend + 106 frontend (47 E2E: 41 passed + 6 skipped | 59 Vitest unit) = 279 total tests - Phase 1-6: 100%
**E2E Status**: CI passing ✅ (chromium), 47 total specs (41 pass, 6 skip when backend unavailable)
**Documentation**: Phase 6 comprehensive guide created (`Docs/Phase6_Testing_DevOps.md` - 11,000 words, 22 sections)

## Key constraints
- **Hungarian UI requirement**: all user-facing UI text/messages/validation must be Hungarian (code identifiers and DB schema remain English).
- **Date format**: `yyyy. MM. dd.` (e.g., `2025. 12. 21.`)
- **Number format**: comma decimal, space thousands (e.g., `1 234,56`)
- Prefer small, reviewable PRs.

## Repo layout
- Main app lives under `w7-WHv1/`.
- Backend code: `w7-WHv1/backend/app/`.
- Frontend code: `w7-WHv1/frontend/src/` (Phase 5).
- DB migrations: `w7-WHv1/backend/alembic/`.
- Specifications: `INITIAL.md` through `INITIAL5.md`.
- PRPs (Planning & Requirements Prompts):
  - `PRPs/phase6-testing-devops.md` - Testing, QA & DevOps (active)
  - `PRPs/phase5-frontend-react19-tailwind4.md` - Frontend implementation
  - `PRPs/phase4-transfers-reservations-jobs.md` - Phase 4
  - `PRPs/phase3-inventory-fefo.md` - Phase 3
  - `PRPs/phase2-products-suppliers-bins.md` - Phase 2
  - `PRPs/WMS_Phase1_Backend_Foundation.md` - Phase 1
- Governance/automation:
  - CI: `.github/workflows/ci.yml`
  - PR template: `.github/pull_request_template.md`
  - Operating rules: `specs/` and `AGENTS.md`

## Technology Stack

### Backend (Phases 1-4)
- Python 3.13+, FastAPI 0.125.0, SQLAlchemy 2.0.45
- PostgreSQL 17, Valkey 8.1, Celery 5.4+

### Frontend (Phase 5)
- React 19.0+, TypeScript 5.7+, Vite 6.0+
- Tailwind CSS 4.0 (CSS-first with `@theme`)
- shadcn/ui (canary for React 19 + Tailwind v4)
- TanStack Query 5.90+, Zustand 5.x
- React Hook Form 7.54+ with Zod validation

## Workflow (start light)
- Default branch: `main`.
- All changes via PR.
- Recommended merge gate:
  - `CI / backend (lint/type/test)` green
  - 1 approving review

## CI behavior (current - Phase 6D enhanced)
- **Backend job**:
  - `ruff check .` (required)
  - `pytest` with Postgres (required)
  - `mypy .` (advisory)
- **Frontend job** (Phase 6D):
  - `npm run lint` (required)
  - `npm run build` (required)
  - `npm run test:run` - Vitest unit tests (required)
- **E2E job** (Phase 6D):
  - `npx playwright test` - 20+ E2E tests (required)
  - Full stack: Postgres + Backend + Frontend
  - Runs after backend + frontend jobs pass
- **Observability** (Phase 6E):
  - Prometheus metrics (HTTP, inventory, Celery, DB, errors)
  - Structured JSON logging for production
  - SlowAPI rate limiting (100 req/min default, configurable)
- **DevOps** (Phase 6F):
  - Production deployment docs (4 guides)
  - Deployment scripts (install, deploy, backup, restore)

## How agents work here
- Implementation agent (Claude Code): edits application code.
- GitHub ops agent (Copilot): branches/PRs/reviews/labels/checks only.

For details, read `AGENTS.md`, `specs/global-rules.md`, and `specs/copilot-instructions.md` (plus `.github/copilot-instructions.md` for GitHub-side execution guardrails).

If any of the above changes, update this file and the relevant governance docs.
