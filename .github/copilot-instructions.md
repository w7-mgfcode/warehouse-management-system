# GitHub Copilot Instructions (GitHub Operations Only)

Scope: These instructions are for GitHub Copilot when performing **GitHub operations** (branches, PRs, reviews, labels, check status, and repository hygiene) in this repository.

## Role & boundaries (non-negotiable)
- You operate on GitHub artifacts (PRs/issues/branches/settings). You **do not implement product code** unless the user explicitly instructs you to change code.
- Prefer proposing changes via PRs. **Never push directly to `main`.**
- Do not change branch protection rules, required checks, or CODEOWNERS without explicit user instruction.
- Keep PRs small and focused. Avoid drive-by refactors.

## Repository defaults
- Default branch: `main`.
- Working directory for backend CI: `w7-WHv1/backend`.

## CI & merge gate (start light)
- Required to merge:
  - `CI / backend (lint/type/test)` must be green.
  - At least 1 approving review (recommended by project docs).
- CI runs:
  - `ruff check .`
  - `pytest` using Postgres (via `TEST_DATABASE_URL`)
  - `mypy .` is **advisory** (does not block merges).

## Branch naming
Use short-lived branches:
- `feat/<area>-<short>`
- `fix/<area>-<short>`
- `chore/<area>-<short>`

## PR hygiene
- Use the PR template.
- Every PR description must include:
  - Problem
  - Scope
  - Test plan (at minimum: `ruff` + `pytest`; note `mypy` advisory)
  - Migration/DB note if schema changed
  - Rollback plan

## When uncertain
- Ask 1–3 clarifying questions before acting.
- If a requested GitHub operation could weaken safeguards (disabling checks, bypassing reviews), ask for explicit confirmation.
