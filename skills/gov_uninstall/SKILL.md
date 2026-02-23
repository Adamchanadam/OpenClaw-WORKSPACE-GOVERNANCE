---
name: gov_uninstall
description: Check or remove workspace governance artifacts with backup and legacy restore.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧹","requires":{"bins":["openclaw"]}}}
---
# /gov_uninstall

## Purpose
Provide an official uninstall path for workspace governance artifacts created by bootstrap/migration.
This command is for workspace cleanup + legacy restore, not plugin package removal.

## Inputs
- Optional mode: `check` (default) or `uninstall`.

## Hard rules
1. Explicit `/gov_uninstall uninstall` MUST execute uninstall workflow; do not downgrade to read-only.
2. Uninstall must create workspace backup evidence under `archive/_gov_uninstall_backup_<ts>/` before removals.
3. Legacy restore must prefer latest `archive/_bootstrap_backup_<ts>/` when available.
4. Do not patch platform control-plane files (for example `~/.openclaw/openclaw.json`) inside this command.
5. This command must never claim completion without a run report under `_runs/`.

## Deterministic runner (authoritative)
- `check`: `node {plugin_root}/tools/gov_uninstall_sync.mjs check`
- `uninstall`: `node {plugin_root}/tools/gov_uninstall_sync.mjs uninstall`

## Expected behavior
1. `check` mode:
   - detect governance residuals under workspace (`prompts/governance`, `skills/gov_*`, governance `_control/*`, governance run files, governance BOOT markers)
   - report restore candidates from latest bootstrap backup
   - detect Brain Docs autofix backup roots (`archive/_brain_docs_autofix_<ts>/`) and restore candidates
   - return `CLEAN` or `RESIDUAL`
2. `uninstall` mode:
   - backup detected residual paths first
   - remove detected governance residual paths
   - restore legacy files from latest bootstrap backup when available
   - restore Brain Docs from detected autofix backup plan (deterministic strategy reported in output)
   - write run report `_runs/gov_uninstall_<ts>.md`
   - return `PASS` or `BLOCKED`

## Output order
1. `STATUS`
2. `WHY`
3. `NEXT STEP (Operator)`
4. `COMMAND TO COPY`

## Operator notes
- Never uninstall plugin package first. Run `/gov_uninstall check` -> `/gov_uninstall uninstall` -> `/gov_uninstall check` first.
- After workspace uninstall `PASS`, disable or uninstall the plugin package with official OpenClaw commands.
- If `warnings` mention missing legacy backups, recovery files are still preserved in `_gov_uninstall_backup_<ts>`.
