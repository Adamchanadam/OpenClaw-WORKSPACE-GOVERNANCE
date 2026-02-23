# Session Handoff (Governance)

Use this file as the first read in every new session.

## 1) Current Baseline Snapshot

1. Version baseline in repo:
   - `package.json` and `openclaw.plugin.json` currently aligned.
2. Deterministic command set:
   - `gov_help`, `gov_setup`, `gov_migrate`, `gov_apply`, `gov_audit`, `gov_uninstall`
   - one-click operator paths: `gov_setup quick`, `gov_uninstall quick`
3. Experimental boundary:
   - `gov_apply <NN>` remains controlled-UAT scope (deterministic-covered, not unattended GA).
4. Runtime regression denominator baseline:
   - `SUMMARY 34/34 passed`

## 2) Session Start Checklist (Mandatory)

1. Read:
   - `dev/GOVERNANCE_MASTER_SPEC.md`
   - `dev/GOVERNANCE_TRACEABILITY_MATRIX.md`
   - `dev/GOVERNANCE_GAP_REGISTER.md`
   - `dev/GOVERNANCE_BASELINE_INVENTORY.md`
   - `dev/LOCAL_PUBLISH_RUNBOOK_WINDOWS.md` (when session includes release/publish work)
2. Confirm no stale drift:
   - `node dev/check_release_consistency.mjs`
3. Run executable regression:
   - compile `index.ts` to `dev/.tmp`
   - `node dev/run_runtime_regression.mjs`

## 3) Release-Gate Quick Commands

Run from `workspace/prompts/governance`:

```text
node dev/check_release_consistency.mjs
npx -y tsc index.ts --target ES2020 --module ES2020 --moduleResolution node --lib ES2020 --skipLibCheck --noEmitOnError false --outDir dev/.tmp
node dev/run_runtime_regression.mjs
npm pack --dry-run
```

## 4) Open Priorities

1. Mode B deterministic hard-enforcement design and regression.
2. Deterministic command parity evaluation for:
   - `gov_openclaw_json`
   - `gov_brain_audit`
3. Host-side B5 evidence accumulation for `gov_apply` promotion decision.

## 5) Last Major Changes (for continuity)

1. Added deterministic apply runner:
   - `tools/gov_apply_sync.mjs`
2. Added deterministic `/gov_apply` command wiring:
   - `index.ts`
3. Expanded runtime regression to apply cases:
   - baseline now `34/34`
4. Added B5 apply deep-dive matrix in public-flow regression plan.
5. Added governance documentation stack:
   - master spec
   - traceability matrix
   - gap register
   - this handoff file
6. Hardened `gov_uninstall` scope control:
   - no broad delete of whole `prompts/governance/`
   - cleanup is explicit-target only
   - Brain Docs autofix backup detection/restore evidence is included
   - regression includes non-governance file preservation case

## 6) Update Rule

At end of each substantial session:
1. Update section 1 snapshot if baseline changed.
2. Update section 4 priorities if gap status changed.
3. Append or revise section 5 with concise change bullets.
4. If publish flow behavior changed on this machine, update `dev/LOCAL_PUBLISH_RUNBOOK_WINDOWS.md` in the same session.
