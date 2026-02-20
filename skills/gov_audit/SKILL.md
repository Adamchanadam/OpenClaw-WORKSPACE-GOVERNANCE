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
4. Verify path compatibility:
   - governance content must use runtime `<workspace-root>` semantics
   - no hardcoded `~/.openclaw/workspace` assumptions in changed governance content
5. Verify system-truth evidence:
   - OpenClaw system claims must cite `https://docs.openclaw.ai` sources
   - latest/version-sensitive OpenClaw claims must also cite `https://github.com/openclaw/openclaw/releases` sources
   - date/time claims must include runtime current time evidence (session status)
6. If a run includes platform control-plane changes, verify:
   - backup path exists under `archive/_platform_backup_<ts>/...`
   - before/after key excerpts are present
   - change was executed via `gov_platform_change` path (or equivalent documented fallback)
7. If a run touches Brain Docs (`USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`), verify run report includes:
   - `FILES_READ` exact paths
   - `TARGET_FILES_TO_CHANGE` exact paths (or `none` for read-only)
   Missing either field => FAIL (evidence incomplete).
8. If a run includes coding/workspace file writes (for example under `projects/`), verify it was treated as Mode C with:
   - explicit PLAN gate evidence
   - READ evidence
   - QC 12/12 outcome
   Missing evidence => FAIL (workflow bypass).

## Persistence
- Write audit result into `_runs/` when the active governance flow requires persistence.
- Ensure `_control/WORKSPACE_INDEX.md` is updated when a new run report is added.

## Output requirements
- Always include a final `NEXT STEP (Operator)` section.
- If audit PASS:
  - primary: continue normal operation, or run `/gov_apply <NN>` only when an approved BOOT menu item exists.
  - fallback: `/skill gov_apply <NN>`
- If audit FAIL:
  - primary: run `/gov_migrate` after remediation.
  - fallback: `/skill gov_migrate`

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_audit`
