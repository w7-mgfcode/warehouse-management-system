# GitHub Workflow (WMS Phase 1)

Rules of engagement: see `AGENTS.md` and `specs/`.

## Default branch
- Use `main` as the default branch.

## Branch strategy (light)
- Create short-lived branches:
  - `feat/<area>-<short>`
  - `fix/<area>-<short>`
  - `chore/<area>-<short>`
- Keep PRs small and focused (one vertical slice).

## Pull requests
- Use the PR template (Problem / Scope / Test plan / Migration / Rollback).
- Definition of done:
  - `ruff check .` passes
  - `pytest` passes
  - If DB schema changes: Alembic migration included and reviewed

Type checking:
- `mypy .` is advisory initially (CI will report it but not block merges).

## CI
- GitHub Actions runs on PRs and pushes to `main`.
- CI provisions Postgres 17 and runs backend checks from `w7-WHv1/backend`:
  - `ruff check .`
  - `pytest`

It also runs `mypy .` in advisory mode.

## Postgres-backed tests
- Locally, tests default to in-memory SQLite.
- In CI, tests use Postgres by setting `TEST_DATABASE_URL`.

## Recommended GitHub settings (start light)
- Protect `main`:
  - Require pull requests
  - Require 1 approving review
  - Require status checks to pass before merging

Later tighten (optional): CODEOWNERS required, signed commits, linear history.
