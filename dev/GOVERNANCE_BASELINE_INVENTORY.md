# Governance Baseline Inventory (Pre-Refactor Must-Preserve)

Purpose: capture the original intent, positioning, and operational value of WORKSPACE_GOVERNANCE before structural refactor.
Rule: any refactor that changes behavior must prove it preserves or improves every baseline item below.

## 1) Original Goal and Positioning

Source references:
1. `VALUE_POSITIONING_AND_FACTORY_GAP.md`
2. `VALUE_POSITIONING_AND_FACTORY_GAP.en.md`
3. `README.md`
4. `README.zh-HK.md`

Must-preserve positioning:
1. This project is an operational governance layer on top of OpenClaw, not a replacement for OpenClaw runtime.
2. Core value is long-running workspace stability: controllable, verifiable, traceable.
3. Main risk model is workflow drift, not only model quality.
4. Default posture is evidence-first + fail-closed when critical evidence is missing.

## 2) Functional Requirement Baseline

Must-preserve functional pillars:
1. Fixed lifecycle for write-capable work: `PLAN -> READ -> CHANGE -> QC -> PERSIST`.
2. Compatibility SOP: governance must not falsely block official OpenClaw daily flows.
3. Governance lifecycle chain must stay executable:
   - `/gov_setup check/install/upgrade`
   - `/gov_migrate`
   - `/gov_audit`
   - `/gov_openclaw_json`
   - `/gov_apply <NN>`
   - `/gov_brain_audit`
4. BOOT model remains read-only proposal first, human approval second, controlled apply third.
5. Every block must be presented as governance policy gate (not system crash) with copy-paste remediation.
6. Natural-language-first usage must remain first-class:
   - slash commands are recommended shortcuts, not the only usable interface.
7. Cross-platform path compatibility must remain explicit:
   - runtime-resolved workspace root
   - no Linux-only hardcoded assumptions
   - Windows/PowerShell path and quoting scenarios must stay supported.

## 3) Mode A/B/C Baseline

Source references:
1. `WORKSPACE_GOVERNANCE_MIGRATION.md`
2. `WORKSPACE_GOVERNANCE_README.md`
3. `WORKSPACE_GOVERNANCE_README.en.md`

Must-preserve mode contract:
1. Mode A:
   - conversational only
   - no persistence
   - no unverified system-truth claims
2. Mode B:
   - verified answer only
   - no writes
   - OpenClaw system claims must verify official docs
   - latest/version-sensitive claims must verify official releases
   - date/time claims must include runtime-verified absolute date/time context
3. Mode C:
   - any write/update/save/persist action
   - full 5-gate lifecycle is mandatory
   - if write intent is uncertain, classify as Mode C (fail-closed)
   - Brain Docs writes require explicit READ evidence before write
4. Multilingual UX:
   - safety and remediation messaging must be language-adaptive (not fixed to one language)
   - command snippets remain copy-paste executable regardless of UI language.

## 4) `gov_*` Command Baseline (Function + Value)

Source references:
1. `skills/gov_setup/SKILL.md`
2. `skills/gov_migrate/SKILL.md`
3. `skills/gov_audit/SKILL.md`
4. `skills/gov_apply/SKILL.md`
5. `skills/gov_openclaw_json/SKILL.md`
6. `skills/gov_brain_audit/SKILL.md`

`gov_setup`:
1. Function:
   - `check`: readiness diagnosis (files + allowlist + sync state)
   - `install`: first deployment
   - `upgrade`: package refresh for existing workspace
2. User value:
   - gives deterministic next action
   - prevents wrong install/upgrade branch decisions
3. Hard preserve:
   - explicit `/gov_setup upgrade` must execute upgrade workflow
   - do not return `SKIPPED (No-op upgrade)` for explicit upgrade
   - preserve existing `plugins.allow` trusted ids while adding governance id

`gov_migrate`:
1. Function:
   - align workspace behavior with migration contract
2. User value:
   - removes policy drift after setup/upgrade
3. Hard preserve:
   - do not run old pre-change canonical precheck flow
   - required sequence is CHANGE first, canonical equality at QC
   - stale migration prompt must trigger remediation to run setup upgrade first

`gov_audit`:
1. Function:
   - post-change integrity verification with fixed denominator checks
2. User value:
   - prevents false completion claims
   - catches drift before handoff
3. Hard preserve:
   - fixed-denominator audit discipline
   - evidence completeness checks for Brain Docs/platform/coding writes

`gov_apply <NN>`:
1. Function:
   - execute only approved BOOT menu item
2. User value:
   - prevents ad-hoc unapproved patching
3. Hard preserve:
   - strict item-id input contract
   - only approved item scope may be changed

`gov_openclaw_json`:
1. Function:
   - controlled OpenClaw control-plane updates (`openclaw.json`, bounded extension scope)
2. User value:
   - safe backup/validate/rollback for platform config changes
3. Hard preserve:
   - minimal patch policy
   - workspace-local backup evidence
   - runtime policy/allowlist adjustments must remain recoverable

`gov_brain_audit`:
1. Function:
   - conservative semantic Brain Docs risk review
   - preview first, approval-based apply, rollback path
2. User value:
   - reduces action-before-verification and unsupported-certainty drift
   - preserves persona intent with minimal diffs
3. Hard preserve:
   - semantic-first language-agnostic review (keyword-only is insufficient)
   - preview must remain read-only
   - apply/rollback requires explicit operator intent

## 5) Anti-Self-Lock Red Lines

These are release-blocking invariants:
1. Official `openclaw ...` flows are default ALLOW/ROUTE paths, not generic blocks.
   - scope includes plugins/extensions/skills/hooks/cron and plugin-added/future root commands.
2. Governance lifecycle commands must not deadlock each other.
3. Runtime health-check suggestions must not block core governance recovery chain.
4. Any governance block must include practical copy-paste self-recovery commands.
5. Historical blocked runs are context; only active unresolved blockers can drive WARN/BLOCK decisions.
6. Post-update operator guidance must remain actionable:
   - `plugins update`/`gateway restart` should lead users to `check -> (if needed openclaw_json) -> upgrade -> migrate -> audit`.
7. Unknown/new command evolution must remain operable via self-serve policy controls:
   - users can adjust runtime allow/deny policy safely through `gov_openclaw_json`.

## 6) Refactor Preservation Checklist (Use Before Merge)

Pass criteria:
1. Every item in sections 1-5 is mapped to one executable test or one deterministic contract check.
2. Refactor removes duplicated logic/text where possible, but does not weaken hard contracts.
3. `dev/check_release_consistency.mjs` passes.
4. `dev/run_runtime_regression.mjs` passes full summary denominator.
5. Public-flow and BOOT acceptance evidence is updated for the target release.
