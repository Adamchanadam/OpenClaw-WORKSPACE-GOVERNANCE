# Publishing Guide (Plugin + ClawHub)

> Release gate canonical reference: `dev/GOVERNANCE_MASTER_SPEC.md` §17

This document is for maintainers of `OpenClaw-WORKSPACE-GOVERNANCE`.
Validation asset index: `dev/README.md`
Machine-proven Windows publish path: `dev/LOCAL_PUBLISH_RUNBOOK_WINDOWS.md`

## 1. Release Strategy

Use a dual-channel release model:

1. Publish plugin package to npm (authoritative runtime distribution).
2. Publish installer skill to ClawHub (discovery and guided onboarding).

## 2. Pre-Release Checklist

1. Update version in:
   - `package.json`
   - `openclaw.plugin.json`
   - `clawhub/openclaw-workspace-governance-installer/SKILL.md` (if needed)
2. Confirm README and README.en are updated.
3. Validate required files exist:
   - `openclaw.plugin.json`
   - `index.ts`
   - `skills/gov_setup/SKILL.md`
   - `skills/gov_migrate/SKILL.md`
   - `skills/gov_audit/SKILL.md`
   - `skills/gov_apply/SKILL.md`
   - `skills/gov_openclaw_json/SKILL.md`
   - `skills/gov_brain_audit/SKILL.md`
4. Run regression suites before release:
   - `dev/RUNTIME_GATE_MINIMAL_CASES.md` (quick gate)
   - `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md` (full public-user flow gate)
5. Run machine consistency check:
   - `node dev/check_release_consistency.mjs`
6. Run runtime-gate executable regression:
   - `npx -y tsc index.ts --target ES2020 --module ES2020 --moduleResolution node --lib ES2020 --skipLibCheck --noEmitOnError false --outDir dev/.tmp`
   - `node dev/run_runtime_regression.mjs`

## 2.1 Mandatory Release Gate (Hard)

Do not publish if any gate below fails:

1. `node dev/check_release_consistency.mjs` must return `ALL_CHECKS_PASS`.
2. `node dev/run_runtime_regression.mjs` must return full-pass summary (current baseline: `SUMMARY 104/104 passed`).
3. Public-flow regression required phases must pass (`A/B/B0/B2/B3/B4/C/D/F/G`) per:
   - `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md`
   - plus `B5` when release touches `gov_apply` command/runner/contract.
4. BOOT post-flow acceptance must be recorded and pass:
   - `dev/BOOT_POSTFLOW_ACCEPTANCE_TEMPLATE.md` with `G1=PASS` and `G2=PASS`.
5. If any gate fails, mark release as `BLOCKED`, fix issue, rerun full gate set; partial reruns are not valid signoff.
6. Denominator-update rule: when adding/removing regression cases in `run_runtime_regression.mjs`, update the baseline count in this section (item 2) and in `dev/README.md` (Release Blocking Standard). The machine gate in `check_release_consistency.mjs` validates this automatically.

## 2.2 Refactor Preservation Gate (Hard)

For any structural refactor (logic consolidation, contract centralization, skill rewrites):

1. Baseline must be reviewed:
   - `dev/GOVERNANCE_BASELINE_INVENTORY.md`
2. Release notes or PR notes must include explicit mapping of changed logic to preserved baseline items.
3. A refactor release is blocked if any baseline hard contract is removed without replacement.

## 3. Publish Plugin to npm

1. Login:

```text
npm login
```

2. Dry-run package inspection:

```text
npm pack --dry-run
```

3. Publish:

```text
npm publish --access public
```

4. Verify plugin install from OpenClaw CLI:

```text
# First-time install path
openclaw plugins install @adamchanadam/openclaw-workspace-governance@<version>

# Existing installation upgrade path
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart

openclaw plugins enable openclaw-workspace-governance
openclaw plugins list
openclaw skills list --eligible
```

## 4. Publish Installer Skill to ClawHub

From repository root, publish installer folder only (avoid broad sync that may publish unrelated local skills):

```text
npx clawhub publish ./clawhub/openclaw-workspace-governance-installer --version <x.y.z> --changelog "<what changed>" --tags latest
```

Recommended validation before/after publish:

```text
npx clawhub inspect openclaw-workspace-governance-installer --versions --json
```

## 5. Post-Release Validation

1. Fresh environment install via npm plugin command.
2. Fresh environment install via ClawHub installer path.
3. Run:
   - `/gov_help`
   - `/gov_setup quick`
   - `/gov_setup install` (first adoption) OR `/gov_setup upgrade` (existing workspace)
   - `openclaw plugins update openclaw-workspace-governance` + `openclaw gateway restart` for existing installed users
   - `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` (new workspace case)
   - `/gov_migrate` and `/gov_audit` (running workspace case)
   - `/gov_uninstall quick` (workspace cleanup acceptance)
4. Optional Experimental BOOT flow UAT:
   - `boot-md` enabled
   - `/gov_apply <NN>` verified only in controlled test workspace after BOOT menu approval
   - if this fails, keep `gov_apply` tagged Experimental and track issue; do not market it as GA
5. Confirm Brain Docs auditor flow:
   - `/gov_brain_audit`
   - `/gov_brain_audit APPROVE: APPLY_ALL_SAFE`
   - `/gov_brain_audit ROLLBACK` (only after an approved apply)

## 6. Rollback

If a bad release is detected:

1. Pin users to previous stable version:

```text
# If plugin already exists locally, uninstall first
openclaw plugins uninstall openclaw-workspace-governance
openclaw plugins install @adamchanadam/openclaw-workspace-governance@<previous_version>
```

2. Publish a patch release with corrected files and updated changelog.
