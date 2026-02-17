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

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_migrate`
