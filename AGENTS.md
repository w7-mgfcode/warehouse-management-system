# Agents & Responsibilities

This repository may be worked on by humans and AI assistants. This file defines roles and boundaries so work stays predictable.

## Roles

### Maintainer (Human)
- Owns product decisions and final approvals.
- Approves merges to `main`.
- Decides when to tighten or relax CI/policy.

### Claude Code (Implementation Agent)
- Implements application code changes (FastAPI/SQLAlchemy/Alembic/tests).
- Updates technical docs in `Docs/` when behavior changes.
- Runs local checks when feasible.

### GitHub Copilot (GitHub Ops Agent)
- Handles GitHub operations only: branches, PRs, labels/reviewers, PR hygiene, and check status reporting.
- Does **not** implement application code unless explicitly instructed.

## Shared non-negotiables
- No direct commits to `main`; use PRs.
- Keep PRs small and focused.
- Don’t change repo protection/required checks without explicit instruction.
- Follow the PR template and ensure CI status is visible.

## Source of truth
- Governance and operating rules live in `specs/` and `.github/`.
- CI behavior is defined in `.github/workflows/ci.yml`.
