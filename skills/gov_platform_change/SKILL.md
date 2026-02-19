---
name: gov_platform_change
description: Controlled OpenClaw platform config change with backup, validation, and rollback.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧱","requires":{"bins":["openclaw"]}}}
---
# /gov_platform_change

## Purpose
Handle OpenClaw platform control-plane changes safely.
Default target is `~/.openclaw/openclaw.json`.

## Allowed scope (hard)
1. `~/.openclaw/openclaw.json`
2. `~/.openclaw/extensions/` only when plugin install/enable/disable/uninstall requires it

## Required workflow (hard)
1. Classify request as Mode C governance change.
2. Output `PLAN GATE` first (no writes before PLAN + READ).
3. Read governance files + target platform file before changing.
4. Create workspace-local backup first:
   - `archive/_platform_backup_<ts>/...`
5. Confirm expected old value exists before patching.
6. Apply minimal patch only to approved keys/sections.
7. Validate result:
   - preferred: `openclaw config check`
   - fallback: read-back evidence of changed keys/sections
8. If validation fails: rollback from backup and stop.
9. Persist evidence:
   - run report in `_runs/`
   - update `_control/WORKSPACE_INDEX.md`
   - include before/after excerpts + backup path

## Input contract
If request does not provide enough detail, ask for missing fields before any patch:
1. target path/key path
2. expected old value
3. new value
4. whether restart is allowed if required

## Output contract
Always report:
1. workspace root
2. target platform path
3. backup path
4. changed key paths
5. validation result
6. rollback result (if triggered)
7. `NEXT STEP (Operator)`:
   - if PASS: `/gov_audit` (fallback: `/skill gov_audit`)
   - if FAIL/BLOCKED: one unblock action + retry command

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_platform_change`
