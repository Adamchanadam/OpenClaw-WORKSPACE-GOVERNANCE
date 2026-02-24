# Session Handoff (Governance)

Use this file as the first read in every new session.

## 1) Current Baseline Snapshot

1. Version baseline in repo:
   - `package.json` and `openclaw.plugin.json` currently aligned at `0.1.48`.
2. Deterministic command set:
   - `gov_help`, `gov_setup`, `gov_migrate`, `gov_apply`, `gov_audit`, `gov_uninstall`
   - one-click operator paths: `gov_setup quick`, `gov_uninstall quick`
3. UX transparency contract:
   - command output uses branded header (`🐾 OpenClaw Governance · v${VERSION}`) + emoji status prefix (✅/⚠️/❌/ℹ️)
   - `SIGNAL` text block replaced by emoji prefix on STATUS line; `WHY`/`NEXT STEP (Operator)`/`COMMAND TO COPY` labels removed
   - bullet style: `  •` (was `- `); next-step prefix: `👉`; section dividers: `─────`
   - `/gov_setup quick|auto` includes `flow_trace`
   - `gov_setup`/`gov_migrate` include `execution_items`
   - `gov_audit` includes `qc_12_item`
4. Experimental boundary:
   - `gov_apply <NN>` remains controlled-UAT scope (deterministic-covered, not unattended GA).
5. Runtime regression denominator baseline:
   - `SUMMARY 40/40 passed`
6. Latest public release channels:
   - npm: `@adamchanadam/openclaw-workspace-governance@0.1.48`
   - GitHub release: `v0.1.48`
   - ClawHub installer: `openclaw-workspace-governance-installer@0.1.48`

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

## 5) Known Risks / Blockers

1. `gov_apply` 仍為 Experimental，未達 GA 門檻（缺 host-side B5 證據）。
2. `gov_openclaw_json` 及 `gov_brain_audit` 尚無 deterministic runner，依賴 LLM 判斷路徑。
3. Mode B（需證據回答）尚無 hard-enforcement gate。

## 6) Last Major Changes (for continuity)

1. UX branding refresh (`v0.1.49`):
   - `makeStatusSignal()` returns emoji (✅/⚠️/❌/ℹ️) instead of text (SUCCESS/ATTENTION/ACTION_REQUIRED/INFO)
   - `formatCommandOutput()` uses branded header, `─────` dividers, `  •` bullets, `👉` next-step, removed redundant labels
   - regression baseline 35/35 -> 40/40 (no test assertions changed)
2. Fixed `findLatestWriteRunReport()` filter to whitelist-only (`WRITE_RUN_REPORT_NAME_RE`):
   - Non-deterministic LLM reports (`gov_brain_audit_*`, etc.) no longer picked up by audit
   - Prevents QC 8 / QC 3 false failures after `/gov_brain_audit APPROVE`
   - Regression test added: `audit-ignores-non-deterministic-run-reports` (baseline now `35/35`)
   - Phase B6 scenario added to `OPENCLAW_PUBLIC_FLOW_REGRESSION.md`
2. Added deterministic apply runner:
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
7. Root-fixed quick-flow audit mismatch loop (`v0.1.46`):
   - `gov_migrate` seeds missing `_control/PRESETS.md` and `_control/WORKSPACE_INDEX.md`
   - `gov_migrate` repairs marker-count anomalies (for example duplicate `AUTOGEN END`)
8. Added UX transparency output contract (`v0.1.47`):
   - `SIGNAL` header + quick `flow_trace` + setup/migrate `execution_items` + audit `qc_12_item`
   - runtime regression includes explicit visibility checks

## 7) Runtime Validation Snapshot (2026-02-23)

1. OpenClaw host verification result (user runtime evidence):
   - `/gov_setup quick` -> `PASS`
   - auto-chain executed: `check -> upgrade -> migrate -> audit`
   - `audit_qc_summary: PASS=10 FAIL=0 PASS_NA=2`
2. Follow-up verification:
   - `/gov_setup check` -> `READY`
   - `/gov_migrate` -> `PASS`
   - `/gov_audit` -> `PASS`

## 8) Last Session Record

1. Session date: `2026-02-24`
2. Agent & Session ID: `Claude-Opus-4.6_20260224_ux_branding`
3. Key completion:
   - UX branding refresh: `makeStatusSignal()` emoji prefixes + `formatCommandOutput()` branded layout
   - regression baseline: 40/40 (was 35/35; no test assertions changed)
   - updated docs: README.zh-HK.md, VALUE_POSITIONING_AND_FACTORY_GAP.md, WORKSPACE_GOVERNANCE_README.md, dev/README.md, dev/SESSION_HANDOFF.md, dev/SESSION_LOG.md
4. Next session starting point:
   - continue from `dev/GOVERNANCE_GAP_REGISTER.md` active `P1` items (`Mode B deterministic enforcement`, `gov_openclaw_json` parity, `gov_brain_audit` parity)

## 9) Update Rule

At end of each substantial session:
1. Update section 1 snapshot if baseline changed.
2. Update section 4 priorities if gap status changed.
3. Update section 5 risks/blockers if status changed.
4. Append or revise section 6 with concise change bullets.
5. If publish flow behavior changed on this machine, update `dev/LOCAL_PUBLISH_RUNBOOK_WINDOWS.md` in the same session.
