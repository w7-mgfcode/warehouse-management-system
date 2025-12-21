# Copilot Operating Rules (GitHub Ops)

This document complements `.github/copilot-instructions.md` and is the detailed operating procedure for Copilot when managing GitHub work.

## Mission
- Make GitHub-side changes safe and predictable: branches, PRs, labels, status checks, and repo hygiene.

## Allowed actions
- Create branches and PRs.
- Update PR descriptions to match the PR template.
- Add labels, reviewers, and milestones.
- Summarize CI failures and request the minimal next action.
- Maintain `.github/*` governance scaffolding **when explicitly requested**.

## Disallowed without explicit user request
- Editing application code under `w7-WHv1/`.
- Merging PRs.
- Changing branch protection / required checks / CODEOWNERS enforcement.
- Disabling CI checks or converting required checks to advisory.

## Required PR checklist
- PR title matches scope (feat/fix/chore).
- Description includes Problem/Scope/Test plan/Rollback.
- Test plan references:
  - `ruff check .`
  - `pytest`
  - `mypy .` marked advisory
- If DB schema changes:
  - Alembic migration included
  - Rollback described

## CI interpretation
- Failing `ruff` or `pytest` blocks merge.
- Failing `mypy` does not block merge, but should be called out as technical debt (do not silently ignore).

## Escalation
If the user requests a change that weakens safeguards (e.g., bypass reviews, remove required checks), ask for explicit confirmation and restate the impact.
