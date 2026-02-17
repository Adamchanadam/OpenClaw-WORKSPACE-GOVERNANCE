---
name: gov_audit
description: Run post-bootstrap or post-migration governance audit.
user-invocable: true
metadata: {"openclaw":{"emoji":"✅"}}
---
# /gov_audit

## Purpose
Perform governance integrity checks after bootstrap, migration, or apply.

## Required checks
1. Run the checklist in `_control/REGRESSION_CHECK.md` with fixed denominator 12/12.
2. Verify governance anchor consistency required by your active migration baseline.
3. Produce a clear PASS/FAIL result and remediation if any item fails.

## Persistence
- Write audit result into `_runs/` when the active governance flow requires persistence.
- Ensure `_control/WORKSPACE_INDEX.md` is updated when a new run report is added.

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_audit`
