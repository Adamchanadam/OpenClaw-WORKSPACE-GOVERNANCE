# OpenClaw Public-Flow Regression Suite (Governance)

Purpose: validate that governance improves safety without self-locking normal OpenClaw usage.
Scope: public-user workflows in OpenClaw CLI/TUI, including official commands, plugin lifecycle, governance lifecycle, and recovery UX.

Important:
1. This suite is designed for real OpenClaw environments (for example VPS Ubuntu).
2. Current local workspace does not run OpenClaw runtime; run this suite in target OpenClaw host.
3. Every test records governance result only: `ALLOW`, `ROUTE`, or `BLOCKED`.

## 0) Pass Gate (Release Blocking)

Release is blocked if any of these fail:
1. Official `openclaw ...` system-channel flows are falsely blocked by governance.
2. Governance lifecycle (`gov_setup`, `gov_migrate`, `gov_apply`, `gov_audit`, `gov_openclaw_json`, `gov_brain_audit`, `gov_uninstall`) dead-locks itself.
3. BLOCK messages do not clearly say this is governance safety gate (not OpenClaw system error) and do not provide copy-paste unblock steps.
4. Upgrade path (`plugins update` -> `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`) cannot complete on existing workspace.
5. First-install path misroutes users from `/gov_setup install` directly into `/gov_migrate` before bootstrap.
6. When `/gov_migrate` is blocked by missing bootstrap `_control/*` files, remediation does not explicitly route to bootstrap document first.

## 1) Test Environment Matrix

Run at least:
1. Linux host (primary): Ubuntu VPS with active OpenClaw installation.
2. Windows host (secondary): PowerShell command/path compatibility spot-check.

Minimal preconditions:
1. Plugin installed: `openclaw-workspace-governance`.
2. Gateway restart available.
3. Workspace with existing governance files for upgrade/migrate tests.
4. One session in English, one session in Chinese (for UX language checks).

## 2) Test Recording Format

For each case, record:
1. Case ID
2. Command / prompt
3. Expected governance decision (`ALLOW` / `ROUTE` / `BLOCKED`)
4. Actual result
5. Evidence (terminal/tui output snippet)
6. Verdict (`PASS` / `FAIL`)

## 3) Phase A: Official OpenClaw CLI Compatibility (Must ALLOW/ROUTE)

Goal: governance must not falsely block official or future OpenClaw system-channel commands.

Run (host shell):
1. `openclaw --help`
2. `openclaw plugins list`
3. `openclaw plugins info openclaw-workspace-governance`
4. `openclaw skills list --eligible`
5. `openclaw hooks list --verbose`
6. `openclaw cron list`
7. `openclaw gateway restart`
8. `openclaw plugins update openclaw-workspace-governance`
9. `openclaw plugins update openclaw-workspace-governance && openclaw gateway restart`
10. `openclaw plugins update openclaw-workspace-governance; openclaw gateway restart`
11. `openclaw plugins update openclaw-workspace-governance & openclaw gateway restart` (Windows shell spot-check)
12. `openclaw onboard --help`
13. `openclaw configure --help`
14. `openclaw future-cmd --help` (or any unknown/new command name)

Expected:
1. No governance false block for official/future command channel.
2. Unknown command may fail with normal CLI error, but not governance gate error.

## 4) Phase B: Governance Lifecycle Compatibility (Must not self-lock)

Run in OpenClaw TUI:
1. `/gov_setup check`
2. If allowlist not ready: `/gov_openclaw_json` -> `/gov_setup check`
3. If `workspace_gov_skill_dirs_detected` is non-empty (legacy shadow copies): status must be `PARTIAL` and next step must be `/gov_setup upgrade`
4. `/gov_setup upgrade`
5. `/gov_migrate`
6. `/gov_audit`
7. `/gov_apply <NN>` (only when an approved BOOT menu item exists)

Expected:
1. No dead-lock where governance blocks governance lifecycle itself.
2. If blocked, message must be governance policy wording + copy-paste unblock commands.
3. Migration canonical checks run after change path (no pre-change historical mismatch hard-stop).
4. Explicit `/gov_setup upgrade` must execute upgrade workflow (or `PASS: already up-to-date`), never `SKIPPED (No-op upgrade)`.
5. After upgrade, legacy `<workspace>/skills/gov_*` shadow copies (if any) are reconciled into `archive/_gov_setup_shadow_backup_<ts>/...`.
6. `gov_setup` / `gov_migrate` / `gov_apply` / `gov_audit` should execute deterministic plugin command handlers first (not LLM free-form skill reasoning path).
7. `/gov_uninstall check` must detect governance residuals after prior install/bootstrap.
8. `/gov_uninstall uninstall` must clear governance residuals with backup + run report and restore legacy files from `archive/_bootstrap_backup_*` when present.

## 4.0) Phase B0: First-Install + Control-Plane Alignment (Mandatory)

Goal: make first adoption deterministic, including trust/allowlist remediation path.

Run in OpenClaw TUI:
1. `/gov_setup check`
2. If check says allowlist/trust not ready, run `/gov_openclaw_json`
3. `/gov_setup check` (confirm allowlist/trust aligned)
4. `/gov_setup install`
5. Run bootstrap document:
   - `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
6. `/gov_audit`

Expected:
1. `/gov_setup check` must provide deterministic next action for both trust-ready and trust-not-ready branches.
2. Trust-not-ready branch must explicitly route to `/gov_openclaw_json` first.
3. `/gov_setup install` must complete without misleading direct-migrate instruction before bootstrap.
4. Bootstrap + audit path must complete on first-install workspace.

## 4.1) Phase B2: Uninstall Cleanup Integrity (Must not leave governance residue)

Run in OpenClaw TUI:
1. `/gov_uninstall check`
2. `/gov_uninstall uninstall`
3. `/gov_uninstall check`

Expected:
1. Pre-uninstall check returns `RESIDUAL` when governance artifacts exist.
2. Uninstall returns `PASS` and writes `_runs/gov_uninstall_<ts>.md`.
3. Post-uninstall check returns `CLEAN` (or residual only if explicitly warned/manual by runner).
4. Uninstall creates `archive/_gov_uninstall_backup_<ts>/...` and never performs destructive remove without backup.

## 4.2) Phase B3: First-Install Bootstrap Routing Integrity (Regression-Critical)

Goal: prevent install-flow self-lock where users are told to run migrate before bootstrap assets exist.

Precondition (new workspace case):
1. Governance prompts are deployable via `/gov_setup install`.
2. Bootstrap-generated files are absent before bootstrap:
   - `_control/GOVERNANCE_BOOTSTRAP.md`
   - `_control/REGRESSION_CHECK.md`
   - `_control/WORKSPACE_INDEX.md`

Run in OpenClaw TUI:
1. `/gov_setup check` (expect `NOT_INSTALLED` on clean workspace).
2. `/gov_setup install`.
3. Verify install response `NEXT STEP` requires bootstrap document first:
   - `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
4. Negative-path guard test: run `/gov_migrate` before bootstrap.
5. Verify migrate response is `BLOCKED` with:
   - `reason: MISSING_REQUIRED_FILES`
   - missing `_control/*` evidence in `WHY`
   - remediation points to bootstrap document first (not only `/gov_setup upgrade`)
6. Run bootstrap document, then `/gov_migrate`, then `/gov_audit`.

Expected:
1. No misleading "install -> migrate immediately" guidance on first install.
2. Missing bootstrap prerequisites are diagnosed with explicit file evidence.
3. Recovery route is deterministic: bootstrap first, then migrate/audit.
4. After bootstrap, migrate/audit path should proceed normally.

## 4.3) Phase B4: Migrate Deep-Dive (Grounded Failure Matrix)

Goal: validate `/gov_migrate` behavior against real operator failure surfaces, not only happy-path.

Case M1 - Missing bootstrap `_control/*`:
1. Preconditions:
   - `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` exists
   - `prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md` exists
   - `_control/GOVERNANCE_BOOTSTRAP.md` and/or `_control/REGRESSION_CHECK.md` missing
2. Run: `/gov_migrate`
3. Expect:
   - `BLOCKED`
   - `reason: MISSING_REQUIRED_FILES`
   - `WHY` includes missing path evidence
   - remediation points to bootstrap doc first:
     - `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`

Case M2 - Missing governance prompts:
1. Preconditions:
   - target files (`AGENTS.md`, `_control/GOVERNANCE_BOOTSTRAP.md`, `_control/REGRESSION_CHECK.md`) exist
   - canonical or migration prompt missing under `prompts/governance/`
2. Run: `/gov_migrate`
3. Expect:
   - `BLOCKED`
   - `reason: MISSING_REQUIRED_FILES`
   - remediation points to `/gov_setup upgrade` first (not bootstrap-only wording)

Case M3 - Stale migration contract text:
1. Preconditions:
   - `WORKSPACE_GOVERNANCE_MIGRATION.md` missing either required clause:
     - `Do NOT run canonical equality as a pre-change blocker`
     - `CHANGE first, then canonical equality at QC`
2. Run: `/gov_migrate`
3. Expect:
   - `BLOCKED`
   - `reason: STALE_MIGRATION_PROMPT_CONTRACT`
   - deterministic recovery: `/gov_setup upgrade` then rerun migrate

Case M4 - Target marker missing:
1. Preconditions:
   - one target file exists but missing corresponding AUTOGEN marker pair
2. Run: `/gov_migrate`
3. Expect:
   - `BLOCKED`
   - `reason: TARGET_MARKER_MISSING`
   - output identifies marker + target path

Case M5 - Drift auto-repair pass:
1. Preconditions:
   - marker exists in all target files
   - marker inner content intentionally drifted from canonical
2. Run: `/gov_migrate`
3. Expect:
   - auto-repair pass applied
   - final status `PASS`
   - `equality` shows 3/3 `MATCH` in run report

Case M6 - Persistence evidence integrity:
1. For every M1-M5 run, verify `_runs/migrate_governance_rev6_<ts>.md` is created.
2. Verify run report includes:
   - `FILES_READ`
   - `TARGET_FILES_TO_CHANGE`
   - status/reason fields
3. If `_control/WORKSPACE_INDEX.md` exists, verify run link is appended or already present.

## 4.4) Phase B5: BOOT Apply Deep-Dive (Experimental, Deterministic)

Goal: validate deterministic `/gov_apply <NN>` behavior on real operator paths.

Case A1 - Invalid input contract:
1. Run: `/gov_apply abc`
2. Expect:
   - `BLOCKED`
   - reason indicates invalid item id
   - remediation includes `/gov_apply 01`

Case A2 - Missing BOOT menu context:
1. Preconditions:
   - governance core files exist
   - `_runs/` has no report containing `BOOT UPGRADE MENU (BOOT+APPLY v1)`
2. Run: `/gov_apply 01`
3. Expect:
   - `BLOCKED`
   - `reason: BOOT_MENU_MISSING`
   - remediation routes to bootstrap/BOOT menu refresh first

Case A3 - QC recurrence apply path:
1. Preconditions:
   - latest BOOT menu report includes: `01) Elevate QC#<n> (...)`
2. Run: `/gov_apply 01`
3. Expect:
   - `PASS`
   - `_control/ACTIVE_GUARDS.md` gets one appended recurrence guard
   - `_control/LESSONS.md` gets one appended lesson entry
   - run report created: `_runs/<ts>_apply_upgrade_from_boot_v1.md`
   - next-step chain: `/gov_migrate` then `/gov_audit`

Case A4 - Guard escalation apply path:
1. Preconditions:
   - latest BOOT menu report includes: `01) Elevate Guard#<id> (...)`
   - corresponding guard exists in `_control/ACTIVE_GUARDS.md`
2. Run: `/gov_apply 01`
3. Expect:
   - `PASS`
   - `_control/LESSONS.md` gets escalation lesson entry
   - run report created with selected item + apply_type evidence

Case A5 - Missing required files:
1. Preconditions:
   - one required apply file missing (for example `_control/ACTIVE_GUARDS.md`)
2. Run: `/gov_apply 01`
3. Expect:
   - `BLOCKED`
   - `reason: MISSING_REQUIRED_FILES`
   - remediation routes to `/gov_setup upgrade` then retry

## 5) Phase C: Natural-Language User Flows (Public behavior)

Use natural language (not slash-first) in TUI:
1. "I just updated plugin, please run full governance upgrade flow for this workspace."
2. "I ran openclaw onboard/configure; re-check governance readiness and tell exact next step."
3. "Please modify only openclaw.json with backup+validation."
4. "Please run Brain Docs audit preview only, do not apply before my approval."

Expected:
1. Correct routing to governance commands without false block.
2. Clear next step and copy-paste action chain.
3. No requirement for users to know internal finding IDs beforehand.

## 6) Phase D: Runtime Gate Safety (Must block only right things)

In TUI, verify non-system custom write intent without evidence is blocked:
1. Ask agent to run write action without PLAN/READ evidence.
2. Confirm block reason says governance safety gate (not OpenClaw crash).
3. Confirm unblock steps include copy-paste remediation.

Then verify recovery:
1. Provide PLAN + READ evidence (`WG_PLAN_GATE_OK`, `WG_READ_GATE_OK`).
2. Retry the write task.
3. Confirm task proceeds.

Mixed-command guard:
1. Command pattern mixing system + non-system write (for example `openclaw ... && Copy-Item ...`) must not be auto-allowed by system-channel bypass.

Permissive-context governance tool exposure guard:
1. In a known permissive context (for example `default` or `agents.list.main`), attempt an implicit governance plugin tool invocation without explicit `/gov_*` user command.
2. Confirm result is `BLOCKED` with wording that this is governance tool-exposure policy gate (not OpenClaw system crash).
3. Confirm remediation says to use restrictive profile/tool allowlist for general chat agents.
4. In the same permissive context, run explicit `/gov_setup check` (or another explicit `/gov_*`) and confirm governance command path is allowed.

Root-fix explicit-invocation guard (installation default):
1. In any context (including when policy-context metadata is missing), attempt implicit governance plugin tool invocation without explicit `/gov_*` intent.
2. Confirm result is `BLOCKED` (fail-closed) and remediation asks for explicit `/gov_*`.
3. Run explicit `/gov_setup check`, then confirm governance command path is allowed.

## 7) Phase E: Post-Update Guidance UX

After plugin update flow:
1. `openclaw plugins update openclaw-workspace-governance`
2. `openclaw gateway restart`
3. In next TUI turn, confirm user guidance points to:
   - `/gov_setup check`
   - `/gov_openclaw_json` if needed
   - `/gov_setup upgrade`
   - `/gov_migrate`
   - `/gov_audit`

Expected:
1. If automatic hint appears: must be actionable.
2. If automatic hint does not appear due host/runtime limits: manual chain above still works end-to-end.

## 8) Phase F: Multilingual UX

Run one English session + one Chinese session.

Expected:
1. Block and remediation hints follow user language preference.
2. Wording explicitly distinguishes governance policy block vs system error.
3. Copy-paste commands remain language-neutral and executable.

## 9) Phase G: BOOT Post-Flow Integrity (Must avoid misleading WARN)

Goal: BOOT report must reflect active blockers only, not stale historical noise.

Case G1 (resolved history):
1. Precondition: `_runs/` contains an older `migrate_governance_*` run with `BLOCKED` canonical mismatch.
2. Then run a newer `migrate_governance_*` with `PASS`.
3. Trigger BOOT audit in the normal governance entry flow.

Expected:
1. Old blocked migration is shown as resolved history (informational), not active blocker.
2. `Status` should be `OK` unless other active blockers/triggers exist.
3. Recommended action should continue normal flow (must not ask user to re-fix the already-resolved blocker).

Case G2 (active unresolved blocker):
1. Precondition: latest relevant `migrate_governance_*` run is `BLOCKED` and no newer PASS exists for that flow family.
2. Trigger BOOT audit in the normal governance entry flow.

Expected:
1. `Status` is `WARN`.
2. Recommended action points to concrete unblock chain (rerun migrate then audit).
3. Messaging clearly states governance decision context (not OpenClaw system crash).

Execution template:
1. Use `dev/BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md` for release evidence recording.
2. Every release must include both `G1` and `G2` records, with output snippets.

## 10) Exit Criteria

All required phases must pass:
1. Phase A
2. Phase B
3. Phase B0
4. Phase B2
5. Phase B3
6. Phase B4
7. Phase B5 (when release touches `gov_apply` command/runner/contract)
8. Phase C
9. Phase D
10. Phase F
11. Phase G

Phase E is best-effort for host/runtime hint channel, but manual upgrade chain must pass.

If any required phase fails:
1. Mark release as `BLOCKED`.
2. Record exact failing case ID + output evidence.
3. Fix and rerun full suite (not partial rerun only).

## 11) Packaging and Canonical Consistency Gate

Before publish, verify:
1. Run machine check:
   - `node dev/check_release_consistency.mjs`
2. Run local executable runtime-gate regression:
   - `npx -y tsc index.ts --target ES2020 --module ES2020 --moduleResolution node --lib ES2020 --skipLibCheck --noEmitOnError false --outDir dev/.tmp`
   - `node dev/run_runtime_regression.mjs`
3. `package.json` version equals `openclaw.plugin.json` version.
4. Plugin-local embedded canonical payload blocks in `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` match actual files:
   - `README.md`
   - `prompts/governance/APPLY_UPGRADE_FROM_BOOT.md`
   - `prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md`
   - `skills/gov_migrate/SKILL.md`
   - `skills/gov_audit/SKILL.md`
   - `skills/gov_apply/SKILL.md`
   - `skills/gov_openclaw_json/SKILL.md`
   - `skills/gov_brain_audit/SKILL.md`
5. Any mismatch is release-blocking because it can reintroduce migration canonical dead-lock.
