# Dev Validation Index

This folder stores governance regression and release-gate validation assets.

## Files and Purpose

1. `RUNTIME_GATE_MINIMAL_CASES.md`
   - Quick regression checklist for runtime gate behavior.
   - Used as fast smoke gate before deeper validation.

2. `OPENCLAW_PUBLIC_FLOW_REGRESSION.md`
   - Full public-user workflow regression plan.
   - Covers CLI/TUI/natural-language/lifecycle/UX + BOOT post-flow integrity scenarios as release criteria.

3. `BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md`
   - Fixed acceptance template for Phase G (BOOT post-flow integrity).
   - Used to record `G1` (resolved history) and `G2` (active unresolved blocker) each release.

4. `GOVERNANCE_BASELINE_INVENTORY.md`
   - Pre-refactor must-preserve baseline for positioning, functional goals, Mode A/B/C, and each `gov_*` command value.
   - Any refactor must map behavior changes against this baseline before merge.

5. `check_release_consistency.mjs`
   - Machine check for release consistency.
   - Verifies:
     - `package.json` version == `openclaw.plugin.json` version
     - plugin-local embedded canonical payload blocks are aligned.

6. `run_runtime_regression.mjs`
   - Executable runtime regression runner.
   - Current baseline: 11 core anti-self-lock/runtime cases.

7. `.tmp/` (ephemeral)
   - Temporary compile output for running `run_runtime_regression.mjs`.
   - Must not be treated as source artifact.

## Standard Execution Order

Run from `workspace/prompts/governance`:

1. `node dev/check_release_consistency.mjs`
2. `npx -y tsc index.ts --target ES2020 --module ES2020 --moduleResolution node --lib ES2020 --skipLibCheck --noEmitOnError false --outDir dev/.tmp`
3. `node dev/run_runtime_regression.mjs`
4. `npm pack --dry-run` (use writable cache if host cache is locked)
5. In real OpenClaw host, execute BOOT post-flow checks from `OPENCLAW_PUBLIC_FLOW_REGRESSION.md` Phase G and record in `BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md`.
6. Before any structural refactor, review and preserve `GOVERNANCE_BASELINE_INVENTORY.md`.

## Release Blocking Standard (Mandatory)

A release is `BLOCKED` unless all items below pass:

1. `node dev/check_release_consistency.mjs` -> `ALL_CHECKS_PASS`
2. `node dev/run_runtime_regression.mjs` -> `SUMMARY 11/11 passed`
3. `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md` required phases pass:
   - A, B, C, D, F, G
4. BOOT evidence is recorded in:
   - `dev/BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md` (`G1=PASS`, `G2=PASS`)
5. Any failed item must be fixed, then full suite rerun (no partial-signoff release).
6. For refactor releases, include explicit preservation note against `GOVERNANCE_BASELINE_INVENTORY.md`.

## Change Control Rule

When adding or changing governance runtime/skill behavior:

1. Update `OPENCLAW_PUBLIC_FLOW_REGRESSION.md` if user workflow expectations change.
2. Add/adjust executable case(s) in `run_runtime_regression.mjs` for new critical logic.
3. Keep this file updated so new sessions can quickly recover validation context.
