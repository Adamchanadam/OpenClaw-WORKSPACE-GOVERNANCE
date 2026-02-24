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
Common governance profile:
1. Ensure `plugins.allow` keeps existing trusted ids and includes `openclaw-workspace-governance`.
2. Manage governance runtime policy for unknown future commands:
   - `plugins.entries[].config.runtimeGatePolicy.allowShellPrefixes`
   - `plugins.entries[].config.runtimeGatePolicy.allowShellRegex`
   - `plugins.entries[].config.runtimeGatePolicy.denyShellPrefixes`
   - `plugins.entries[].config.runtimeGatePolicy.denyShellRegex`

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
   - For `plugins.allow` alignment:
     - if `plugins.allow` is missing/non-array, create it as array
     - append `openclaw-workspace-governance` only if missing
     - preserve existing ids and order; do not drop unrelated trusted ids
   - For `runtimeGatePolicy` alignment:
     - keep existing rules unless operator explicitly removes them
     - add only requested allow/deny prefixes/regex entries
     - do not widen scope beyond operator intent
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
Exception:
1. If operator intent is clearly "align plugin allowlist for governance setup/upgrade", use built-in profile above without forcing extra prompts.
2. If operator intent is clearly "unblock a governance false block for official/new custom command", use built-in runtimeGatePolicy profile above without forcing extra prompts.

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
   - if PASS and change touched `plugins.allow`: `/gov_setup check` (fallback: `/skill gov_setup check`)
   - if PASS and change touched `runtimeGatePolicy`: `openclaw gateway restart`, then retry original command
   - if PASS and no allowlist change: `/gov_audit` (fallback: `/skill gov_audit`)
   - if FAIL/BLOCKED: one unblock action + retry command
10. Use branded output format (match `formatCommandOutput` style):
   - First line: `🐾 OpenClaw Governance · /gov_openclaw_json`
   - `─────────────────────────────────` dividers between sections
   - Status line: `✅  STATUS` / `⚠️  STATUS` / `❌  STATUS` (emoji prefix, then status value on next line)
   - Bullet items: `  •` prefix (not `- `)
   - Next step: `👉` prefix on action text
   - Commands: indented with 2 spaces (no `COMMAND TO COPY` label)

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_openclaw_json`
