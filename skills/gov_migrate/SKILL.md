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
1. If `_control/GOVERNANCE_BOOTSTRAP.md` is missing, stop and instruct the operator to run bootstrap first.
2. Follow the migration prompt exactly (no skipped gates).
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
