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
2. Governance lifecycle (`gov_setup`, `gov_migrate`, `gov_audit`, `gov_openclaw_json`, `gov_brain_audit`, `gov_uninstall`) dead-locks itself.
3. BLOCK messages do not clearly say this is governance safety gate (not OpenClaw system error) and do not provide copy-paste unblock steps.
4. Upgrade path (`plugins update` -> `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`) cannot complete on existing workspace.

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

Expected:
1. No dead-lock where governance blocks governance lifecycle itself.
2. If blocked, message must be governance policy wording + copy-paste unblock commands.
3. Migration canonical checks run after change path (no pre-change historical mismatch hard-stop).
4. Explicit `/gov_setup upgrade` must execute upgrade workflow (or `PASS: already up-to-date`), never `SKIPPED (No-op upgrade)`.
5. After upgrade, legacy `<workspace>/skills/gov_*` shadow copies (if any) are reconciled into `archive/_gov_setup_shadow_backup_<ts>/...`.
6. `gov_setup` / `gov_migrate` / `gov_audit` should execute deterministic plugin command handlers first (not LLM free-form skill reasoning path).
7. `/gov_uninstall check` must detect governance residuals after prior install/bootstrap.
8. `/gov_uninstall uninstall` must clear governance residuals with backup + run report and restore legacy files from `archive/_bootstrap_backup_*` when present.

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
3. Phase C
4. Phase D
5. Phase F
6. Phase G

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
