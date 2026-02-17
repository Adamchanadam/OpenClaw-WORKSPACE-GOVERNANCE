---
name: gov_setup
description: Install or upgrade governance prompt assets into the current OpenClaw workspace.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧰","requires":{"bins":["openclaw"]}}}
---
# /gov_setup

## Purpose
Deploy this plugin's governance prompt assets into the current workspace at `prompts/governance/`.

## Inputs
- Optional mode: `install` (default), `upgrade`, or `check`.

## Required behavior
1. Resolve plugin root from this skill directory:
   - `plugin_root = {baseDir}/../..`
2. Resolve workspace root as the current OpenClaw workspace directory.
   - Do not assume `~/.openclaw/workspace` as a fixed path.
3. Ensure target folders exist:
   - `prompts/governance/`
   - `prompts/governance/manual_prompt/`
4. If mode is `upgrade` and target files already exist:
   - Create backup under `archive/_gov_setup_backup_<ts>/prompts/governance/...`
5. Copy the following source files from `plugin_root` into workspace `prompts/governance/`:
   - `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
   - `WORKSPACE_GOVERNANCE_MIGRATION.md`
   - `APPLY_UPGRADE_FROM_BOOT.md`
   - `WORKSPACE_GOVERNANCE_README.md`
   - `manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md`
   - `manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md`
6. If mode is `check`:
   - Do not copy files.
   - Only report whether each target file exists and whether source files are discoverable.
7. After install or upgrade:
   - Print next steps:
     - First adoption: run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
     - Existing workspace: run `/gov_migrate`, then `/gov_audit`
8. If operator asks OpenClaw system questions (commands/config/paths) during setup:
   - Verify against local skill docs and official docs `https://docs.openclaw.ai` before answering.
9. If operator asks date/time-sensitive setup questions:
   - Verify runtime current time context (session status) before answering.

## Output requirements
- Report source root, target root, files copied (or checked), and backup path if created.
- If any required source file is missing, stop and report missing paths.
