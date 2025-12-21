# TASK

Last updated: 2025-12-21

## Active
- (none)

Note: Implementation work items belong here; GitHub ops (branches/PR hygiene/labels/checks) are handled by Copilot per `AGENTS.md`.

## Completed
- 2025-12-21 — Add lightweight GitHub governance (PR template, issue templates, CODEOWNERS, CI with Postgres).
- 2025-12-21 — Add agent governance docs (`AGENTS.md`, `specs/*`, `.github/copilot-instructions.md`).
- 2025-12-21 — Phase 2: Implement Products, Suppliers, Bins CRUD with bulk generation (88 tests passing).
- 2025-12-21 — Create comprehensive Phase 2 documentation (5 files, ~4,261 lines covering API, database, algorithms, testing).

## Discovered during work
- Consider tightening CI later (make `mypy` blocking once the codebase is type-clean).
- Confirm exact branch protection required-check name in GitHub UI and set it to `CI / backend (lint/type/test)`.
