---
name: gov_openclaw_json
description: Controlled OpenClaw platform config change with backup, validation, and rollback.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧱","requires":{"bins":["openclaw"]}}}
---
# /gov_openclaw_json

## Purpose
Handle OpenClaw platform control-plane changes safely.
Default target is `~/.openclaw/openclaw.json`.

## Allowed scope (hard)
1. `~/.openclaw/openclaw.json`
2. `~/.openclaw/extensions/` only when plugin install/enable/disable/uninstall requires it

## Not in scope (hard)
1. Brain Docs (`USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`)
2. Normal workspace coding/docs files under `<workspace-root>`
3. If request is non-platform file change, re-route to normal Mode C lifecycle (`PLAN -> READ -> CHANGE -> QC -> PERSIST`)
4. For conservative Brain Docs behavior hardening, route to `gov_brain_audit` (single entry; preview by default, then approved apply if needed).

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
2. `FILES_READ` (exact paths)
3. `TARGET_FILES_TO_CHANGE` (exact paths)
4. target platform path
5. backup path
6. changed key paths
7. validation result
8. rollback result (if triggered)
9. `NEXT STEP (Operator)`:
   - if PASS: `/gov_audit` (fallback: `/skill gov_audit`)
   - if FAIL/BLOCKED: one unblock action + retry command
10. Use this output order for UX consistency:
   - `STATUS`
   - `WHY`
   - `NEXT STEP (Operator)`
   - `COMMAND TO COPY`

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_openclaw_json`
