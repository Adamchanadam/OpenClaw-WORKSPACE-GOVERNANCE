# Governance Master Spec (Complete Plugin Reference)

Purpose:
1. Provide one complete technical and operational reference for this plugin.
2. Reflect actual implemented behavior first, then target-state gaps.
3. Give future Codex sessions a stable development axis without re-discovery cost.
4. Serve as the single authoritative reference across product, operations, and engineering.

Scope:
1. Plugin code under `workspace/prompts/governance/`.
2. Runtime gate behavior in `index.ts`.
3. Deterministic runners under `tools/`.
4. Skills contracts under `skills/`.
5. Release gates under `dev/`.
6. Product positioning and value proposition.
7. Operator reference and troubleshooting.

Out of scope:
1. OpenClaw core runtime internals outside plugin boundary.

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
6. `/gov_openclaw_json` (hybrid command: check=deterministic Platform Health Score 0-10, apply/default=SKILL)
7. `/gov_brain_audit` (hybrid command: preview=deterministic Brain Docs Health Score 0-100, approve/rollback=SKILL)
8. `/gov_boot_audit` (deterministic recurrence scanner + upgrade menu generator)
9. Runtime gate + tool exposure guard + Mode B enforcement in plugin hooks.

### 2.2 Experimental Baseline

1. `/gov_apply <NN>`:
   - deterministic command + runner exists (includes `governance_maturity` delta)
   - deterministic runtime regression coverage exists
   - still controlled-UAT scope, not unattended GA automation.
   - B5 evidence accumulation protocol defined (see gap register).

## 3) Mode Contract (A/B/C)

1. Mode A:
   - conversation only
   - no writes
   - no unverified system-truth claims
2. Mode B:
   - no writes
   - system/version/time-sensitive claims require source verification
   - hard deterministic enforcement via `isModeBSystemSensitive()` detection + `prependContext` verification directive
   - fires only for read-only intent (Mode C takes precedence when write intent detected)
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
   - current denominator baseline: `54/54`
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
6. Mode B hard enforcement (`isModeBSystemSensitive()` + `prependContext` directive).
7. `gov_openclaw_json` / `gov_brain_audit` hybrid commands (deterministic check/preview + skill apply paths).
8. Cross-doc normalization: BASELINE_INVENTORY cross-references MASTER_SPEC/TRACEABILITY_MATRIX; handbooks annotated.
9. Regression denominator drift auto-check in `check_release_consistency.mjs`.

### 8.2 Partially Implemented / Pending

1. Host-side B5 recurring evidence:
   - deterministic local regression exists; multi-host UAT evidence still required per release touching apply.
2. GA promotion criteria for `gov_apply`:
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

## 11) Product Positioning & Value Proposition

> Canonical source for all positioning content. Condensed from `VALUE_POSITIONING_AND_FACTORY_GAP.en.md`.

One-sentence positioning:
OpenClaw WORKSPACE_GOVERNANCE adds a governance control plane on top of OpenClaw's runtime, so long-running workspaces remain controllable, verifiable, and traceable.

Factory baseline vs governance layer:
1. Factory baseline is optimized for: fast startup, assistant-style interaction, extensibility.
2. Governance layer is optimized for: ordered execution on risky tasks, evidence-first decisions, consistent audit and rollback readiness.
3. This is not replacement. It is operational hardening.

What governance adds:
1. Fixed execution order: `PLAN -> READ -> CHANGE -> QC -> PERSIST`
2. Fail-Closed default when evidence is missing
3. Mode routing for conversation vs verified-answer vs write tasks
4. BOOT read-only proposals with human-approved controlled apply (Experimental)
5. Run-report traceability for review and recurrence reduction
6. Conservative Brain Docs hardening (`gov_brain_audit`) with preview-first approval and rollback
7. Branded command output: all `/gov_*` responses include branded header, emoji status prefix, structured dividers

User value (non-technical):
1. Fewer avoidable breakages
2. Less manual cleanup after wrong edits
3. Better visibility of what changed and why
4. Easier team handover and accountability

Boundaries (no over-selling):
1. Does not make any model error-free
2. Does not remove need for human decisions
3. Does not eliminate ongoing maintenance work

Maturity boundary:
1. GA: `gov_help`, `gov_setup`, `gov_migrate`, `gov_audit`, `gov_openclaw_json`, `gov_brain_audit`, `gov_uninstall` + runtime hard-gate + branded UX output
2. Experimental: `gov_apply <NN>` (BOOT controlled apply, controlled UAT only)

## 12) UX Output Contract

> Canonical source for branded output format spec. Previously scattered across handbooks, BASELINE_INVENTORY §2, TRACEABILITY_MATRIX CAP-016.

Branded header format:
```
🐾 OpenClaw Governance · v${VERSION}
─────────────────────────────────
```

Emoji status prefix mapping:
1. ✅ — PASS, READY, CLEAN
2. ⚠️ — WARNING, PARTIAL
3. ❌ — BLOCKED, FAIL
4. ℹ️ — default / informational

Bullet style: `  •` (two-space indent + bullet)
Next-step prefix: `👉`
Section dividers: `─────────────────────────────────`

Visibility contracts (command-specific output blocks):
1. `flow_trace` — included in `gov_setup quick|auto`
2. `execution_items` — included in `gov_setup`, `gov_migrate`
3. `qc_12_item` — included in `gov_audit`
4. `governance_maturity` — included in `gov_apply` (delta: `guards=N→N+1, lessons=N→N+1`)

## 13) Skill Contract Summary

> One block per skill. Full detail: individual `skills/*/SKILL.md` files.

1. `gov_help`:
   - Purpose: display full governance command catalog with one-click entrypoint suggestions.
   - Built-in deterministic command (no separate SKILL.md payload).

2. `gov_setup`:
   - Purpose: install or upgrade governance files and verify plugin trust alignment.
   - Sub-commands: `quick|auto` (one-click chain), `check`, `install`, `upgrade`.
   - Hard rules: explicit operator intent takes precedence; never downgrade to read-only check; route platform config to `gov_openclaw_json`.

3. `gov_migrate`:
   - Purpose: apply canonical marker content and repair pass for running workspaces.
   - Hard rules: follow migration prompt exactly with no skipped gates; Brain Docs writes require Mode C with fail-closed evidence.

4. `gov_audit`:
   - Purpose: fixed 12/12 checklist validation after bootstrap, migration, or apply.
   - Hard rules: fixed denominator discipline; verify version-sensitive claims against official sources.

5. `gov_apply` (Experimental):
   - Purpose: execute an approved BOOT upgrade item via deterministic runner.
   - Hard rules: requires explicit two-digit item number; output must include `FILES_READ` and `TARGET_FILES_TO_CHANGE`; follow-up chain required (`/gov_migrate` then `/gov_audit`).

6. `gov_openclaw_json`:
   - Purpose: safely handle platform control-plane changes (`openclaw.json`, extensions).
   - Hybrid: `check` mode is deterministic (Platform Health Score 0-10); default/apply mode is skill-driven.
   - Hard rules: scope limited to `~/.openclaw/openclaw.json` and `~/.openclaw/extensions/`; must create backup first; rollback on validation failure.

7. `gov_brain_audit`:
   - Purpose: conservatively audit Brain Docs to reduce action-before-verification risks.
   - Hybrid: `preview` mode is deterministic (Brain Docs Health Score 0-100); `APPROVE`/`ROLLBACK` are skill-driven.
   - Hard rules: preview is default (read-only); apply only with explicit approval; preserve persona intent with minimal-diff edits.

8. `gov_uninstall`:
   - Purpose: safely remove workspace governance artifacts with backup and legacy restore.
   - Sub-commands: `quick|auto` (one-click chain), `check`, `uninstall`.
   - Hard rules: must create backup before any removal; never claim completion without run report; do not patch platform control-plane files.

## 14) Governance Execution Order & File Scope

> Canonical source for lifecycle definition. Referenced by handbooks §3.

5-gate lifecycle (mandatory for any write/update/save):
1. `PLAN` — determine intent and scope
2. `READ` — gather evidence from actual files
3. `CHANGE` — execute the modification
4. `QC` — validate against fixed checklist
5. `PERSIST` — commit evidence (run report, index update)

Fail-closed principle:
1. Missing evidence or path ambiguity → stop.
2. Any QC fail → do not claim completion.

File-scope map:
1. Workspace governance files: `<workspace-root>/prompts/governance/` — managed by `gov_setup install|upgrade|check`.
2. Platform control plane: `~/.openclaw/openclaw.json`, `~/.openclaw/extensions/` — managed by `gov_openclaw_json`.
3. Brain Docs: `USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md` — managed by `gov_brain_audit`.

Mode routing summary (full contract: §3):
1. Mode A: conversation only, no writes, no unverified system-truth claims.
2. Mode B: evidence-based answer, no writes, hard deterministic enforcement via `isModeBSystemSensitive()`.
3. Mode C: any write/update/save, mandatory 5-gate flow, fail-closed on uncertainty.

## 15) Operator Runbook Summary

> Condensed reference. Full step-by-step detail: `WORKSPACE_GOVERNANCE_README.en.md` §6 / `WORKSPACE_GOVERNANCE_README.md` §6.

A) New workspace:
   - Install plugin → `gov_setup quick` (one-click chain: check → install → migrate → audit).
   - If allowlist not ready: run `gov_openclaw_json` first, then retry `gov_setup quick`.

B) Existing workspace, first governance adoption:
   - Install/enable plugin → `gov_setup quick`.
   - Manual alternative: `gov_setup check` → `gov_setup install` → `gov_migrate` → `gov_audit`.

C) Daily maintenance (governance already installed):
   - Host side: `openclaw plugins update ...` → `openclaw gateway restart`.
   - In-session: `gov_setup quick` (or manual `gov_setup upgrade` → `gov_migrate` → `gov_audit`).

D) Brain Docs hardening:
   - `/gov_brain_audit` (read-only preview) → `/gov_brain_audit APPROVE: <IDs>` or `APPROVE: APPLY_ALL_SAFE` → `/gov_brain_audit ROLLBACK` if needed.
   - Checks: action-before-verification wording, unsupported certainty, missing evidence fields, read-claim vs file-existence mismatch, speculative memory as facts.

E) BOOT controlled apply (Experimental):
   - BOOT emits numbered proposals → human approves → `/gov_apply <NN>` → `/gov_migrate` → `/gov_audit`.
   - Record before/after indicators; mark `PARTIAL` if no measurable improvement.

F) Platform config change:
   - Entry: `gov_openclaw_json` → backup → minimal patch → validate → rollback on failure.
   - Scope: `~/.openclaw/openclaw.json` and `~/.openclaw/extensions/` only.

G) Clean uninstall:
   - `/gov_uninstall quick` (one-click chain: check → uninstall with backup/restore evidence).
   - Verify: `_runs/gov_uninstall_<ts>.md` and `archive/_gov_uninstall_backup_<ts>/` exist.

## 16) Troubleshooting Index

> One-liner per issue. Full detail: `WORKSPACE_GOVERNANCE_README.en.md` §10 / `WORKSPACE_GOVERNANCE_README.md` §10.

1. `plugin already exists` → use `openclaw plugins update openclaw-workspace-governance`.
2. Slash not responding → use `/skill ...` fallback or natural-language request.
3. `gov_setup check` returns `NOT_INSTALLED` → run `gov_setup quick` (or `gov_setup install`).
4. `gov_setup check` returns `PARTIAL` → run `gov_setup quick` (or `gov_setup upgrade`).
5. `plugins.allow is empty` warning → run `gov_setup check`; if `allow_status!=ALLOW_OK`, run `gov_openclaw_json` first.
6. Official command changed `openclaw.json` → run `gov_setup check` → `gov_openclaw_json` if needed → rerun check.
7. Audit mismatch after update → run `gov_migrate` then `gov_audit`.
8. Runtime gate block → not a crash; supply PLAN+READ evidence with `WG_PLAN_GATE_OK`+`WG_READ_GATE_OK`, then retry.
9. `gov_setup upgrade` stuck at gate → update plugin, restart gateway, rerun check then upgrade.
10. Source looks mixed (shadow) → check source with `openclaw skills info gov_* --json`; run `gov_setup upgrade` to reconcile.
11. No auto-update → use manual: `openclaw plugins update ...` → `openclaw gateway restart` → `gov_setup upgrade` → `gov_migrate` → `gov_audit`.
12. `gov_brain_audit APPROVE` blocked → provide explicit approval input with actual finding IDs from preview.
13. Old BOOT migration blocked warning → check if newer PASS exists for same flow family; if not, run `gov_migrate` → `gov_audit`.
14. Ran `plugins uninstall` before workspace cleanup → reinstall plugin, then `/gov_uninstall quick`.

## 17) Release & Distribution

> Canonical source for release gate summary. Full checklist: `PUBLISHING.md`.

Distribution channels:
1. npm: `@adamchanadam/openclaw-workspace-governance` (authoritative runtime distribution).
2. ClawHub installer: `openclaw-workspace-governance-installer` (discovery and guided onboarding).
3. GitHub releases (version-tagged archives).

Release gate summary (all must pass before publish):
1. Consistency check: `node dev/check_release_consistency.mjs` → `ALL_CHECKS_PASS`.
2. Runtime regression: `node dev/run_runtime_regression.mjs` → current baseline `SUMMARY 54/54 passed`.
3. Public-flow UAT: mandatory phases `A/B/B0/B2/B3/B4/C/D/F/G` (add `B5` when release touches `gov_apply`).
4. BOOT acceptance: `dev/BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md` with `G1=PASS` and `G2=PASS`.
5. Refactor preservation: baseline review against `dev/GOVERNANCE_BASELINE_INVENTORY.md`; no hard contract removed without replacement.

Denominator-update rule:
When adding/removing regression cases in `run_runtime_regression.mjs`, update the baseline count in `PUBLISHING.md` §2.1 and `dev/README.md`. The machine gate in `check_release_consistency.mjs` validates this automatically.
