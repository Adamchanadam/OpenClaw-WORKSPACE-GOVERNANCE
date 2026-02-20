---
name: gov_setup
description: Install or upgrade governance prompt assets into the current OpenClaw workspace.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧰","requires":{"bins":["openclaw"]}}}
---
# /gov_setup

## Purpose
Deploy this plugin's governance prompt assets into the current workspace at `prompts/governance/`.
`check` mode is a read-only diagnostic for first-time setup and upgrade readiness.

## Inputs
- Optional mode: `install` (default), `upgrade`, or `check`.

## Brain Docs routing (hard)
When the request touches Brain Docs (`USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`):
1. Read-only ask -> Mode B (verified answer): read the exact target files before answering.
2. Any write/update request -> Mode C: full governance lifecycle is mandatory.
3. If the same request also includes OpenClaw system claims, apply Mode B2 verification (`docs.openclaw.ai` + releases when version-sensitive).

## Required behavior
1. Resolve plugin root from this skill directory:
   - `plugin_root = {baseDir}/../..`
2. Resolve workspace root as the current OpenClaw workspace directory.
   - Do not assume `~/.openclaw/workspace` as a fixed path.
3. For `install` and `upgrade` only, ensure target folders exist:
   - `prompts/governance/`
   - `prompts/governance/manual_prompt/`
   For `check`, do not create folders (read-only).
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
   - Try to report installed plugin version via `openclaw plugins info openclaw-workspace-governance` (if available).
   - Return one status:
      - `NOT_INSTALLED`: target folder missing or target files absent (common right after plugin install).
      - `PARTIAL`: target exists but one or more required files are missing/out-of-sync.
      - `READY`: all required files are present.
   - Provide next action:
     - `NOT_INSTALLED` -> run `/gov_setup install`
     - `PARTIAL` -> run `/gov_setup upgrade`
     - `READY` -> continue with `/gov_migrate` and `/gov_audit` as needed
7. After install or upgrade:
   - Print next steps:
     - First adoption: run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
     - Existing workspace: run `/gov_migrate`, then `/gov_audit`
8. If operator asks OpenClaw system questions (commands/config/paths) during setup:
   - Verify against local skill docs and official docs `https://docs.openclaw.ai` before answering.
   - For latest/version-sensitive claims, also verify official releases `https://github.com/openclaw/openclaw/releases`.
   - If verification cannot be completed, report uncertainty and required next check; do not infer.
9. If operator asks date/time-sensitive setup questions:
   - Verify runtime current time context (session status) before answering.
10. If operator asks to patch platform control-plane config (for example `~/.openclaw/openclaw.json`) during setup:
   - do not patch inside `gov_setup`
   - route to `gov_platform_change`

## Output requirements
- Report source root, target root, files copied (or checked), and backup path if created.
- If any required source file is missing, stop and report missing paths.
- Include `FILES_READ` (exact paths) and `TARGET_FILES_TO_CHANGE` (exact paths, or `none` for read-only `check`).
- If required evidence fields are missing, output `BLOCKED (missing read/change evidence)` instead of completion.
- Use this output order for UX consistency:
  1. `STATUS`
  2. `WHY`
  3. `NEXT STEP (Operator)`
  4. `COMMAND TO COPY`
- Always include a final `NEXT STEP (Operator)` section with:
  - one primary command
  - one fallback `/skill ...` command
- In `check` mode, include:
  - `status` (`NOT_INSTALLED` / `PARTIAL` / `READY`)
  - `next_action`
  - file lists in code blocks (one path per line) to avoid UI table-wrap ambiguity.
  - if `status=NOT_INSTALLED`, append a `Quick Start` command block:
    - `/gov_setup install`
    - fallback: `/skill gov_setup install`
  - if `status=PARTIAL`, append:
    - `/gov_setup upgrade`
    - fallback: `/skill gov_setup upgrade`
  - if `status=READY`, append:
    - `/gov_migrate` then `/gov_audit`
    - fallback: `/skill gov_migrate` then `/skill gov_audit`
  - append version visibility commands for operator-side check:
    - installed: `openclaw plugins info openclaw-workspace-governance`
    - latest: `npm view @adamchanadam/openclaw-workspace-governance version`
