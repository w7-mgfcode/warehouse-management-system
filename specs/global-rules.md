# Global Rules (Source of Truth)

These rules apply to all work in this repository (human and agents). If a rule conflicts with ad-hoc instructions, the user/maintainer may override explicitly.

## Workflow
- Default branch is `main`.
- All changes land via Pull Request (no direct commits to `main`).
- Keep PRs small, single-purpose, and easy to review.

## Quality gates (start light)
- CI must pass before merging.
- CI check to watch for branch protection: `CI / backend (lint/type/test)`.
- CI currently enforces:
  - `ruff check .` (required)
  - `pytest` (required)
  - `mypy .` (advisory; visible but non-blocking)

## Testing environment
- CI runs tests against Postgres 17 (GitHub Actions service).
- Tests may use SQLite in-memory locally by default.
- CI uses `TEST_DATABASE_URL` to force Postgres.

## Documentation & consistency
- Update governance docs when changing CI behavior, repo workflow, or protection rules.
- Avoid drive-by refactors unrelated to the task/issue.
