# PLANNING

Last updated: 2025-12-21

## Purpose
This file is the lightweight “source of truth” for project direction, constraints, and working agreements.

## Project
Warehouse Management System (WMS) for pallet racking warehouses with FEFO inventory.

## Key constraints
- **Hungarian UI requirement**: all user-facing UI text/messages/validation must be Hungarian (code identifiers and DB schema remain English).
- Prefer small, reviewable PRs.

## Repo layout
- Main app lives under `w7-WHv1/`.
- Backend code: `w7-WHv1/backend/app/`.
- DB migrations: `w7-WHv1/backend/alembic/`.
- Governance/automation:
  - CI: `.github/workflows/ci.yml`
  - PR template: `.github/pull_request_template.md`
  - Operating rules: `specs/` and `AGENTS.md`

## Workflow (start light)
- Default branch: `main`.
- All changes via PR.
- Recommended merge gate:
  - `CI / backend (lint/type/test)` green
  - 1 approving review

## CI behavior (current)
- Required:
  - `ruff check .`
  - `pytest` (runs against Postgres in CI via `TEST_DATABASE_URL`)
- Advisory:
  - `mypy .`

## How agents work here
- Implementation agent (Claude Code): edits application code.
- GitHub ops agent (Copilot): branches/PRs/reviews/labels/checks only.

For details, read `AGENTS.md`, `specs/global-rules.md`, and `specs/copilot-instructions.md` (plus `.github/copilot-instructions.md` for GitHub-side execution guardrails).

If any of the above changes, update this file and the relevant governance docs.
