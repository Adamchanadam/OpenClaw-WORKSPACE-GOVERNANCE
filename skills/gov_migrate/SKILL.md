---
name: gov_migrate
description: Run workspace governance migration for an already-running OpenClaw workspace.
user-invocable: true
metadata: {"openclaw":{"emoji":"🛡️"}}
---
# /gov_migrate

## Purpose
Execute the migration workflow defined by:
- `prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md`

## Hard contract
1. If `_control/GOVERNANCE_BOOTSTRAP.md` / `_control/REGRESSION_CHECK.md` is missing, seed them from canonical payload in `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`, then continue migration (do not bounce operator back to manual bootstrap path).
2. Follow the migration prompt exactly (no skipped gates).
2.1 Before execution, validate migration prompt contract at `prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md`:
   - Must include anti-precheck clause equivalent to `Do NOT run canonical equality as a pre-change blocker`.
   - Must include required order equivalent to `CHANGE first, then canonical equality at QC`.
   - If either clause is missing, treat workspace prompt as stale and stop with governance remediation:
     - primary: `/gov_setup upgrade` then `/gov_migrate`
     - fallback: `/skill gov_setup upgrade` then `/skill gov_migrate`
   - Do not run old pre-change canonical precheck flow.
3. Preserve non-target user files.
4. After migration, instruct operator to run `/gov_audit`.
5. Treat workspace root as runtime-resolved `<workspace-root>`; do not hardcode `~/.openclaw/workspace`.
6. For OpenClaw system claims (commands/config/plugins/skills/hooks), verify using:
   - relevant local skill docs under `skills/`
   - official docs at `https://docs.openclaw.ai`
   - official releases at `https://github.com/openclaw/openclaw/releases` for latest/version-sensitive claims
   - if verification cannot be completed, report uncertainty and required next check; do not infer
7. For date/time-sensitive claims, verify runtime current time context first (session status).
8. If the operator asks to change platform control-plane state (for example `~/.openclaw/openclaw.json`), route execution to `gov_openclaw_json` and do not patch platform files inside `gov_migrate`.
9. Brain Docs routing:
   - If the task touches Brain Docs (`USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`), treat read-only asks as Mode B and any write/update as Mode C.
   - For Brain Docs writes, missing READ evidence is fail-closed.
   - For conservative Brain Docs behavior audits/fixes, route to `gov_brain_audit` (single entry; preview by default).
10. Coding-task routing:
   - Any request that creates or modifies workspace code/files (for example: build, implement, fix, refactor) is Mode C, even without `/gov_*` command wording.
   - If write intent is uncertain, treat as Mode C (Fail-Closed).
11. Canonical self-check behavior:
   - If canonical equality check reports mismatch on AUTOGEN core blocks, perform one deterministic repair pass (re-apply canonical AUTOGEN inner content, keep markers unchanged), then re-run equality once before declaring `BLOCKED`.
   - Do not treat pre-change mismatch or historical mismatch run reports as immediate blockers.
   - Required sequence: CHANGE first, then canonical equality + optional repair pass at QC.
12. Official-flow compatibility SOP (anti-self-lock):
   - Treat OpenClaw system operation flows (`openclaw ...`, including plugin-added/future commands) and governance lifecycle flows (`gov_setup check/install/upgrade`, `gov_migrate`, `gov_audit`, `gov_openclaw_json`, `gov_brain_audit`, `gov_uninstall check/uninstall`) as default ALLOW/ROUTE paths, not generic blocks.
   - If a hard prerequisite requires block, label it as governance policy gate (not system error) and provide copy-paste unblock commands.

## Output requirements
- Include `FILES_READ` (exact paths) and `TARGET_FILES_TO_CHANGE` (exact paths).
- If either field is missing, output `BLOCKED (missing read/change evidence)` and stop.
- Use this output order for UX consistency:
  1. `STATUS`
  2. `WHY`
  3. `NEXT STEP (Operator)`
  4. `COMMAND TO COPY`
- Always include a final `NEXT STEP (Operator)` section.
- If migration PASS:
  - primary: `/gov_audit`
  - fallback: `/skill gov_audit`
- If migration FAIL or BLOCKED:
  - primary: `fix blocker, then rerun /gov_migrate`
  - fallback: `fix blocker, then rerun /skill gov_migrate`

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_migrate`
