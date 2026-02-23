---
name: gov_setup
description: Install or upgrade governance files into the current OpenClaw workspace.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧰","requires":{"bins":["openclaw"]}}}
---
# /gov_setup

## Purpose
Deploy this plugin's governance files into the current workspace at `prompts/governance/`.
`check` mode is a read-only diagnostic for first-time setup and upgrade readiness.
In all modes, verify OpenClaw plugin trust allowlist alignment (`plugins.allow`) for this plugin.

## Inputs
- Optional mode: `install` (default), `upgrade`, or `check`.

## Mode precedence (hard)
1. Explicit operator intent takes precedence:
   - `/gov_setup upgrade` MUST execute upgrade workflow.
   - `/gov_setup install` MUST execute install workflow.
   - `/gov_setup check` is diagnostics only.
2. Never downgrade explicit `install`/`upgrade` into `check`.
3. Never return `SKIPPED (No-op upgrade)` for explicit `upgrade`.

## Deterministic runner (hard)
1. `gov_setup` decisions must be driven by:
   - `node {plugin_root}/tools/gov_setup_sync.mjs <mode>`
2. The runner output is authoritative:
   - do not replace it with heuristic "no-op" reasoning
   - if runner returns `PASS`, report `PASS` (never `SKIPPED`)
   - if runner returns `BLOCKED`, report `BLOCKED` and stop
3. For `upgrade`, runner execution is mandatory even when a previous `check` returned `READY`.
4. Runner also reconciles legacy workspace shadow skills (`<workspace-root>/skills/gov_*`) by moving them into workspace archive backup before continuing.

## Brain Docs routing (hard)
When the request touches Brain Docs (`USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`):
1. Read-only ask -> Mode B (verified answer): read the exact target files before answering.
2. Any write/update request -> Mode C: full governance lifecycle is mandatory.
3. If the same request also includes OpenClaw system claims, apply Mode B2 verification (`docs.openclaw.ai` + releases when version-sensitive).
4. If the request is specifically about auditing/hardening Brain Docs behavior wording, route to `gov_brain_audit` (single entry; preview by default).

## Required behavior
1. Resolve plugin root from this skill directory:
   - `plugin_root = {baseDir}/../..`
2. Resolve workspace root as the current OpenClaw workspace directory.
   - Do not assume `~/.openclaw/workspace` as a fixed path.
3. Resolve platform config path candidates (read-only probe):
   - Linux/macOS: `~/.openclaw/openclaw.json`
   - Windows: `%USERPROFILE%\\.openclaw\\openclaw.json`
   - Use the one that exists; if both exist, use the runtime-active one and report both paths.
4. In all modes, evaluate plugin allowlist status from `openclaw.json`:
   - `ALLOW_OK`: `plugins.allow` is an array and contains `openclaw-workspace-governance`
   - `ALLOW_NOT_SET`: `plugins.allow` key missing or not an array
   - `ALLOW_EMPTY`: `plugins.allow` is an empty array
   - `ALLOW_MISSING_GOV`: array exists but missing `openclaw-workspace-governance`
   - Preserve existing trusted ids; never suggest replacing allowlist with only one id.
5. Mandatory compatibility SOP check (every run):
   - Evaluate whether governance is compatible with official OpenClaw daily flows and governance lifecycle flows:
     - official flow families: `openclaw ...` system-channel operations (including plugin-added/future commands and chained `openclaw` segments)
    - governance lifecycle: `gov_setup check/install/upgrade`, `gov_migrate`, `gov_audit`, `gov_openclaw_json`, `gov_brain_audit`, `gov_uninstall check/uninstall`
   - Decision rules:
     - default outcome is `ALLOW/ROUTE` for these flows (no generic false block),
     - if prerequisite fails (for example allowlist misalignment), return governance policy warning with explicit copy-paste unblock commands.
   - For any allowlist remediation, keep existing trusted ids and append missing required id(s); never replace with governance id only.
6. If mode is `install` or `upgrade` and `allow_status != ALLOW_OK`:
   - do not hard-block governance workspace deployment
   - continue install/upgrade (best-effort) and mark `allowlist_alignment_required=true`
   - append immediate remediation commands (`/gov_openclaw_json` -> `/gov_setup check`) before migration/audit next steps
   - wording must clearly state this is a governance warning (not system error)
7. Execute deterministic runner by mode:
   - `check` -> `node {plugin_root}/tools/gov_setup_sync.mjs check`
   - `install` -> `node {plugin_root}/tools/gov_setup_sync.mjs install`
   - `upgrade` -> `node {plugin_root}/tools/gov_setup_sync.mjs upgrade`
8. If mode is `check`:
   - Use runner JSON as source of truth for:
     - `status` (`NOT_INSTALLED` / `PARTIAL` / `READY`)
     - `allow_status`
     - `allowlist_alignment_required`
     - `file_sync_summary`
     - `shadow_reconcile_required`
     - `next_action`
   - If runner reports `shadow_reconcile_required=true` or non-empty `workspace_gov_skill_dirs_detected`,
     treat status as upgrade-required (`PARTIAL`) and instruct operator to run explicit `/gov_setup upgrade`.
9. After install or upgrade:
   - Print next steps:
     - Run `/gov_migrate`, then `/gov_audit` (migration will reconcile missing governance `_control` baseline files deterministically)
   - Explicit `upgrade` must still run even if `check` previously returned `READY`.
   - Idempotent upgrade is valid; report `PASS (already up-to-date)` from runner output.
10. If operator asks OpenClaw system questions (commands/config/paths) during setup:
   - Verify against local skill docs and official docs `https://docs.openclaw.ai` before answering.
   - For latest/version-sensitive claims, also verify official releases `https://github.com/openclaw/openclaw/releases`.
   - If verification cannot be completed, report uncertainty and required next check; do not infer.
11. If operator asks date/time-sensitive setup questions:
   - Verify runtime current time context (session status) before answering.
12. Platform config patching policy during setup:
   - do not patch inside `gov_setup`
   - route to `gov_openclaw_json`
   - copy-paste unblock intent:
     - `Please update openclaw.json so plugins.allow keeps existing trusted ids and includes openclaw-workspace-governance, then validate and back up before apply.`

## Output requirements
- Report source root, target root, deterministic runner command/result, and backup path if created.
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
  - `allow_status` (`ALLOW_OK` / `ALLOW_NOT_SET` / `ALLOW_EMPTY` / `ALLOW_MISSING_GOV`)
  - `allowlist_alignment_required` (`true` / `false`)
  - `compat_sop_status` (`ALLOW_OR_ROUTE` / `POLICY_BLOCK_WITH_REMEDIATION`)
  - `compat_sop_scope` (official flows + governance lifecycle coverage summary)
  - `platform_config_path` (resolved path used for check)
  - `next_action`
  - `file_sync_summary` (counts for `MISSING` / `OUT_OF_SYNC` / `IN_SYNC`)
  - `shadow_reconcile_required` (`true` / `false`)
  - `workspace_gov_skill_dirs_detected` (if any)
  - file lists in code blocks (one path per line) to avoid UI table-wrap ambiguity.
  - if `allow_status!=ALLOW_OK`, append `Align Allowlist` command block first:
    - `/gov_openclaw_json`
    - fallback: `/skill gov_openclaw_json`
    - then rerun: `/gov_setup check` (fallback: `/skill gov_setup check`)
  - if `allow_status=ALLOW_OK` and `shadow_reconcile_required=true`, append `Shadow Reconcile` command block first:
    - `/gov_setup upgrade`
    - fallback: `/skill gov_setup upgrade`
  - if `allow_status=ALLOW_OK` and `status=NOT_INSTALLED`, append a `Quick Start` command block:
    - `/gov_setup install`
    - fallback: `/skill gov_setup install`
  - if `allow_status=ALLOW_OK` and `status=PARTIAL`, append:
    - `/gov_setup upgrade`
    - fallback: `/skill gov_setup upgrade`
  - if `allow_status=ALLOW_OK` and `status=READY`, append:
    - `/gov_migrate` then `/gov_audit`
    - fallback: `/skill gov_migrate` then `/skill gov_audit`
  - append version visibility commands for operator-side check:
    - installed: `openclaw plugins info openclaw-workspace-governance`
    - latest: `npm view @adamchanadam/openclaw-workspace-governance version`
- In explicit `install`/`upgrade` mode:
  - `STATUS` must be either `PASS` or `BLOCKED`.
  - Do not output `SKIPPED` for explicit write-mode setup commands.
  - Include `workspace_gov_skill_dirs_reconciled` from runner output when present.
