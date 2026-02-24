# Governance Master Spec (SSOT for Engineering)

Purpose:
1. Provide one complete technical and operational reference for this plugin.
2. Reflect actual implemented behavior first, then target-state gaps.
3. Give future Codex sessions a stable development axis without re-discovery cost.

Scope:
1. Plugin code under `workspace/prompts/governance/`.
2. Runtime gate behavior in `index.ts`.
3. Deterministic runners under `tools/`.
4. Skills contracts under `skills/`.
5. Release gates under `dev/`.

Out of scope:
1. OpenClaw core runtime internals outside plugin boundary.
2. Product marketing copy.

## 1) System Role Map

1. Operator layer:
   - Gives explicit governance intent (`/gov_*` or `/skill gov_*`).
   - Approves risky apply actions (`/gov_apply <NN>`).
2. Runtime policy layer (`index.ts`):
   - Enforces Mode C guard (`PLAN -> READ` evidence before write).
   - Applies tool-exposure guard (default fail-closed explicit governance intent).
   - Preserves official `openclaw ...` system command operability.
3. Deterministic command layer:
   - `gov_help`, `gov_setup`, `gov_migrate`, `gov_apply`, `gov_audit`, `gov_uninstall`.
   - Output format: `STATUS -> WHY -> NEXT STEP (Operator) -> COMMAND TO COPY`.
4. Skill contract layer:
   - Defines command intent, constraints, and fallback behavior.
5. Runner layer (`tools/*_sync.mjs`):
   - Performs deterministic file operations and writes run reports.
6. Validation and release gate layer (`dev/`):
   - Consistency check + runtime regression + public flow UAT plan.

## 2) Capability Inventory (Current)

### 2.1 GA Baseline

1. `/gov_setup quick|check|install|upgrade` (deterministic command + runner)
   - includes one-click `quick|auto` command orchestration
2. `/gov_migrate` (deterministic command + runner)
3. `/gov_audit` (deterministic command + runner)
4. `/gov_uninstall quick|check|uninstall` (deterministic command + runner)
   - includes one-click `quick|auto` command orchestration
5. `/gov_help` (deterministic command catalog for operator UX)
6. `/gov_openclaw_json` (skill contract, controlled platform change path)
7. `/gov_brain_audit` (skill contract, preview/approve/rollback path)
7. Runtime gate + tool exposure guard in plugin hooks.

### 2.2 Experimental Baseline

1. `/gov_apply <NN>`:
   - deterministic command + runner exists
   - deterministic runtime regression coverage exists
   - still controlled-UAT scope, not unattended GA automation.

## 3) Mode Contract (A/B/C)

1. Mode A:
   - conversation only
   - no writes
   - no unverified system-truth claims
2. Mode B:
   - no writes
   - system/version/time-sensitive claims require source verification
   - current enforcement is mostly contract/prompt-level, not full hard runtime enforcement
3. Mode C:
   - any write/update/save
   - mandatory evidence gates before write tool execution
   - fail-closed on uncertainty.

## 4) Deterministic Command Contracts

1. `gov_setup`:
   - `quick`/`auto` one-click path: check -> install/upgrade/skip -> migrate -> audit
   - `check` returns status + allowlist readiness + next action
   - `install` deploys plugin-local governance assets
   - `upgrade` refreshes assets and reconciles shadow `skills/gov_*`
2. `gov_migrate`:
   - applies canonical marker content + repair pass
   - rejects stale migration contract
3. `gov_apply`:
   - accepts two-digit approved menu id only
   - requires latest BOOT menu context in `_runs/`
   - supported item types:
     - `Elevate QC#<n> (...)`
     - `Elevate Guard#<id> (...)`
   - deterministic write scope:
     - `_control/ACTIVE_GUARDS.md` append
     - `_control/LESSONS.md` append
     - `_control/WORKSPACE_INDEX.md` run-link append
     - `_runs/<ts>_apply_upgrade_from_boot_v1.md`
     - `archive/_apply_backup_<ts>/...`
   - follow-up chain required: `/gov_migrate` then `/gov_audit`
4. `gov_audit`:
   - fixed denominator discipline
   - folder checks + canonical equality checks
5. `gov_uninstall`:
   - `quick`/`auto` one-click path: check -> uninstall (if residual exists)
   - residual detection + backup-first cleanup + restore plan from bootstrap backup and brain-doc autofix backups
   - cleanup scope is explicit-target only (no broad recursive delete of shared user folders)
   - `check` reports brain backup roots/candidates/strategy when detected
   - `uninstall` output includes brain backup evidence fields (`brain_backup_used`, `brain_backup_strategy`)

## 5) Runtime Guard Contracts

1. Tool-exposure guard:
   - default enabled
   - default mode `enforce`
   - default permissive contexts include `default`, `agents.list.main`
   - default explicit intent requirement enabled
2. Governance lifecycle anti-self-lock:
   - official `openclaw ...` channel commands should remain allowed
   - governance commands should not deadlock governance recovery path
3. Evidence requirements:
   - write completion should include evidence fields and run-report references.

## 6) Evidence Artifacts

Primary evidence locations:
1. `_runs/*.md` run reports
2. `_control/WORKSPACE_INDEX.md` run links
3. backup roots:
   - `_gov_setup_backup_*`
   - `_gov_setup_shadow_backup_*`
   - `_migration_backup_*`
   - `_apply_backup_*`
   - `_gov_uninstall_backup_*`
   - `_brain_docs_autofix_*` (detected/restored by uninstall when present)

## 7) Validation Stack

1. Machine consistency:
   - `node dev/check_release_consistency.mjs`
2. Executable runtime regression:
   - `node dev/run_runtime_regression.mjs`
   - current denominator baseline: `40/40`
3. Public-flow host UAT:
   - `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md`
   - mandatory phases include A/B/B0/B2/B3/B4/C/D/F/G
   - add B5 when release touches `gov_apply`.

## 8) Implemented vs Not Fully Implemented

### 8.1 Implemented

1. Deterministic command framework and standardized operator output.
2. Deterministic runners for setup/migrate/apply/audit/uninstall.
3. Root-fix explicit governance intent guard (default fail-closed).
4. Regression gate includes `gov_apply` command-flow cases.
5. Canonical payload alignment checks in release consistency script.

### 8.2 Partially Implemented / Pending

1. Mode B hard enforcement:
   - currently mostly contract-level; not fully deterministic runtime-enforced verification.
2. `gov_openclaw_json` / `gov_brain_audit` deterministic command parity:
   - still primarily skill-driven paths (not yet moved to deterministic command handler in `index.ts`).
3. Host-side B5 recurring evidence:
   - deterministic local regression exists; multi-host UAT evidence still required per release touching apply.
4. GA promotion criteria for `gov_apply`:
   - stability evidence across releases still pending; keep Experimental.

## 9) Target-State Definition

Target state for "100% deployable alignment" means:
1. Every claimed capability maps to deterministic behavior or explicit experimental boundary.
2. Every critical behavior has executable regression + host UAT procedure.
3. No doc claims exceed current implementation.
4. Release gate blocks mismatched docs/behavior.
5. New sessions can resume from `SESSION_HANDOFF.md` without rediscovery.

## 10) Session Start Protocol (for Codex)

At session start for governance work:
1. Read `SESSION_HANDOFF.md`.
2. Read `GOVERNANCE_GAP_REGISTER.md` top priorities.
3. Confirm baseline from `GOVERNANCE_TRACEABILITY_MATRIX.md`.
4. If implementing behavior change:
   - update code
   - update matrix + gap register + relevant docs
   - run consistency + runtime regression
   - report deltas with file refs.
