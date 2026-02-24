# Dev Validation Index

This folder stores governance regression and release-gate validation assets.

## Files and Purpose

1. `RUNTIME_GATE_MINIMAL_CASES.md`
   - Quick regression checklist for runtime gate behavior.
   - Used as fast smoke gate before deeper validation.

2. `OPENCLAW_PUBLIC_FLOW_REGRESSION.md`
   - Full public-user workflow regression plan.
   - Covers CLI/TUI/natural-language/lifecycle/UX + BOOT post-flow integrity scenarios as release criteria.
   - Includes first-install bootstrap routing integrity guard (prevents install->migrate misroute before bootstrap).
   - Includes one-click operator paths (`/gov_setup quick`, `/gov_uninstall quick`) and fallback/manual-chain acceptance.
   - Includes mandatory first-install control-plane alignment branch (`/gov_setup check` -> `/gov_openclaw_json` when needed -> `/gov_setup install`).
   - Includes grounded migrate failure matrix (`MISSING_REQUIRED_FILES`, stale prompt contract, marker-missing, auto-repair pass, persistence evidence).

3. `BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md`
   - Fixed acceptance template for Phase G (BOOT post-flow integrity).
   - Used to record `G1` (resolved history) and `G2` (active unresolved blocker) each release.

4. `GOVERNANCE_BASELINE_INVENTORY.md`
   - Pre-refactor must-preserve baseline for positioning, functional goals, Mode A/B/C, and each `gov_*` command value.
   - Any refactor must map behavior changes against this baseline before merge.

5. `GOVERNANCE_MASTER_SPEC.md`
   - Full technical/flow/feature SSOT for engineering continuity.
   - Separates implemented baseline from pending target-state gaps.

6. `GOVERNANCE_TRACEABILITY_MATRIX.md`
   - Capability-to-code/test/doc mapping table.
   - Prevents implementation/claim drift.

7. `GOVERNANCE_GAP_REGISTER.md`
   - Prioritized engineering gap backlog with acceptance criteria.
   - Includes promotion gate conditions for Experimental features.

8. `SESSION_HANDOFF.md`
   - First-read file for each new session.
   - Contains current baseline snapshot and mandatory start checklist.

9. `LOCAL_PUBLISH_RUNBOOK_WINDOWS.md`
   - Machine-proven publish flow for this Windows host.
   - Includes npm offline-mode workaround, GitHub release command pattern, ClawHub publish path, and cleanup rules.

10. `check_release_consistency.mjs`
   - Machine check for release consistency.
   - Verifies:
     - `package.json` version == `openclaw.plugin.json` version
     - plugin-local embedded canonical payload blocks are aligned.

11. `run_runtime_regression.mjs`
   - Executable runtime regression runner.
   - Current baseline: 54 core anti-self-lock/runtime cases.
   - Includes UX transparency contract checks:
     - branded header (`🐾 OpenClaw Governance`) and emoji STATUS prefix (✅/⚠️/❌/ℹ️)
     - `flow_trace` visibility for one-click setup flow
     - `qc_12_item` visibility for audit output
   - Includes uninstall integrity cases:
     - brain-backup detection in `check`
     - brain-backup restore evidence in `uninstall`
     - non-governance file preservation under shared folders

12. `.tmp/` (ephemeral)
   - Temporary compile output for running `run_runtime_regression.mjs`.
   - Must not be treated as source artifact.
   - On some hosts, `.tmp/` files may be ACL-locked; if auto-clean fails, remove manually before release commit.

13. `SESSION_LOG.md`
   - Append-only session ledger.
   - Records date, OpenClaw runtime session id, completed work, and next-session priorities.

## Standard Execution Order

Run from `workspace/prompts/governance`:

1. `node dev/check_release_consistency.mjs`
2. `npx -y tsc index.ts --target ES2020 --module ES2020 --moduleResolution node --lib ES2020 --skipLibCheck --noEmitOnError false --outDir dev/.tmp`
3. `node dev/run_runtime_regression.mjs`
4. `npm pack --dry-run` (use writable cache if host cache is locked)
5. In real OpenClaw host, execute BOOT post-flow checks from `OPENCLAW_PUBLIC_FLOW_REGRESSION.md` Phase G and record in `BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md`.
6. Before any structural refactor, review and preserve `GOVERNANCE_BASELINE_INVENTORY.md`.
7. For publishing from this machine, follow `dev/LOCAL_PUBLISH_RUNBOOK_WINDOWS.md` directly.

## Release Blocking Standard (Mandatory)

A release is `BLOCKED` unless all items below pass:

1. `node dev/check_release_consistency.mjs` -> `ALL_CHECKS_PASS`
2. `node dev/run_runtime_regression.mjs` -> `SUMMARY 54/54 passed`
3. `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md` required phases pass:
   - A, B, B0, B2, B3, B4, C, D, F, G
   - plus B5 when release touches `gov_apply` command/runner/contract
4. BOOT evidence is recorded in:
   - `dev/BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md` (`G1=PASS`, `G2=PASS`)
5. Any failed item must be fixed, then full suite rerun (no partial-signoff release).
6. For refactor releases, include explicit preservation note against `GOVERNANCE_BASELINE_INVENTORY.md`.

## Change Control Rule

When adding or changing governance runtime/skill behavior:

1. Update `OPENCLAW_PUBLIC_FLOW_REGRESSION.md` if user workflow expectations change.
2. Add/adjust executable case(s) in `run_runtime_regression.mjs` for new critical logic.
3. Keep this file updated so new sessions can quickly recover validation context.
