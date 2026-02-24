# Session Handoff (Governance)

Use this file as the first read in every new session.

## 1) Current Baseline Snapshot

1. Version baseline in repo:
   - `package.json` and `openclaw.plugin.json` currently aligned at `0.1.48`.
2. Deterministic command set:
   - `gov_help`, `gov_setup`, `gov_migrate`, `gov_apply`, `gov_audit`, `gov_uninstall`, `gov_openclaw_json` (check mode), `gov_brain_audit` (preview mode), `gov_boot_audit` (scan mode)
   - one-click operator paths: `gov_setup quick`, `gov_uninstall quick`
3. UX transparency contract:
   - command output uses branded header (`🐾 OpenClaw Governance · v${VERSION}`) + emoji status prefix (✅/⚠️/❌/ℹ️)
   - `SIGNAL` text block replaced by emoji prefix on STATUS line; `WHY`/`NEXT STEP (Operator)`/`COMMAND TO COPY` labels removed
   - bullet style: `  •` (was `- `); next-step prefix: `👉`; section dividers: `─────`
   - `/gov_setup quick|auto` includes `flow_trace`
   - `gov_setup`/`gov_migrate` include `execution_items`
   - `gov_audit` includes `qc_12_item`
   - `gov_apply` includes `governance_maturity` delta
4. Experimental boundary:
   - `gov_apply <NN>` remains controlled-UAT scope (deterministic-covered, not unattended GA).
5. Runtime regression denominator baseline:
   - `SUMMARY 54/54 passed`
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

1. ~~**Phase 1 (P1)**~~: **DONE** — `gov_openclaw_json` deterministic CHECK runner. [GAP-002]
2. ~~**Phase 2 (P1)**~~: **DONE** — `gov_brain_audit` deterministic PREVIEW runner. [GAP-003]
3. ~~**Phase 3 (P2)**~~: **DONE** — BOOT audit deterministic runner. [GAP-007]
4. ~~**Phase 4 (P2)**~~: **DONE** — `gov_apply` maturity delta. [GAP-C09]
5. ~~**Phase 5 (P1)**~~: **DONE** — Mode B deterministic hard-enforcement. [GAP-001]
6. **Phase 6 (P1)**: Host-side B5 evidence accumulation for `gov_apply` promotion decision. [GAP-004] — **IN_PROGRESS** (protocol defined; evidence collection ongoing)
7. ~~**GAP-005 (P2)**~~: **DONE** — Cross-doc repetition normalization.
8. ~~**GAP-006 (P2)**~~: **DONE** — Regression denominator drift protocol.

## 5) Known Risks / Blockers

1. `gov_apply` 仍為 Experimental，未達 GA 門檻（缺 host-side B5 證據；promotion protocol 已定義）。

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
3. Added deterministic apply runner:
   - `tools/gov_apply_sync.mjs`
4. Expanded runtime regression to apply cases:
   - baseline now `34/34`
5. Added B5 apply deep-dive matrix in public-flow regression plan.
6. Added governance documentation stack:
   - master spec, traceability matrix, gap register, this handoff file
7. Added `gov_openclaw_json` hybrid command (GAP-002):
   - `tools/gov_openclaw_json_sync.mjs`: deterministic Platform Health Score (0-10) CHECK runner
   - `index.ts`: `makeGovOpenclawJsonCommandResponse` + command registration
   - regression baseline: 40/40 -> 44/44 (C41-C44)
8. Added `gov_brain_audit` hybrid command (GAP-003):
   - `tools/gov_brain_audit_sync.mjs`: deterministic Brain Docs Health Score (0-100) PREVIEW runner
   - `brain_audit_rules.mjs` refactored to export `runBrainAuditScan()` for reuse
   - `index.ts`: `makeGovBrainAuditCommandResponse` + command registration
   - regression baseline: 44/44 -> 49/49 (C45-C49)
9. Added `gov_boot_audit` deterministic command (GAP-007):
   - `tools/gov_boot_audit_sync.mjs`: recurrence scanner + upgrade menu generation
   - `index.ts`: `makeGovBootAuditCommandResponse` + command registration
   - regression baseline: 49/49 -> 52/52 (C50-C52)
10. Added `gov_apply` maturity delta (GAP-C09):
    - `governance_maturity: guards=N→N+1, lessons=N→N+1` in apply PASS output
    - Updated both runner (`gov_apply_sync.mjs`) and command response (`index.ts`)
11. Added Mode B deterministic enforcement (GAP-001):
    - `isModeBSystemSensitive()` detection for system/version/time-sensitive questions
    - `prependContext` verification directive injected in `before_prompt_build`
    - Mode B fires only for read-only intent (Mode C takes precedence)
    - regression baseline: 52/52 -> 54/54 (C53-C54)
12. Defined B5 Evidence Accumulation Protocol (GAP-004):
    - GA promotion threshold: 3+ host executions across 2+ releases
    - Evidence recording protocol in `GOVERNANCE_GAP_REGISTER.md`
13. Hardened `gov_uninstall` scope control
14. Root-fixed quick-flow audit mismatch loop (`v0.1.46`)
15. Added UX transparency output contract (`v0.1.47`)
16. Cross-doc normalization (GAP-005):
    - BASELINE_INVENTORY sections 3+4 replaced with cross-references to MASTER_SPEC/TRACEABILITY_MATRIX
    - Handbooks (zh/en) annotated with canonical source note pointing to MASTER_SPEC §3
17. Denominator drift protocol (GAP-006):
    - Fixed stale denominators: PUBLISHING.md `34/34` → `54/54`, dev/README.md `40` → `54`
    - Added automated `cases.push(` counter in `check_release_consistency.mjs`
    - Added denominator-update checklist rule to PUBLISHING.md §2.1
18. MASTER_SPEC expanded to Complete Plugin Reference (天書):
    - Renamed from "SSOT for Engineering" to "Complete Plugin Reference"
    - Added §11 Product Positioning, §12 UX Output Contract, §13 Skill Contract Summary, §14 Governance Execution Order & File Scope, §15 Operator Runbook Summary, §16 Troubleshooting Index, §17 Release & Distribution
    - Canonical source notes added to: VALUE_POSITIONING docs (§11), handbooks §3 (§14), PUBLISHING.md (§17)
    - No content removed from any file; no code changes; no regression impact

## 7) Runtime Validation Snapshot (2026-02-24)

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
2. Agent & Session ID: `Claude-Opus-4.6_20260224_phase_1_to_6`
3. Key completion:
   - Phase 1-6 implemented: all P1 gaps closed (GAP-001, GAP-002, GAP-003, GAP-007)
   - Phase 4: `gov_apply` maturity delta
   - Phase 5: Mode B hard enforcement
   - Phase 6: B5 evidence protocol defined
   - regression baseline: 40/40 -> 54/54
   - new tools: `gov_openclaw_json_sync.mjs`, `gov_brain_audit_sync.mjs`, `gov_boot_audit_sync.mjs`
   - new commands: `gov_openclaw_json`, `gov_brain_audit`, `gov_boot_audit`
4. Next session starting point:
   - collect B5 host evidence for `gov_apply` GA promotion [GAP-004]
   - P2 items: cross-doc normalization [GAP-005], denominator drift protocol [GAP-006]

## 9) Update Rule

At end of each substantial session:
1. Update section 1 snapshot if baseline changed.
2. Update section 4 priorities if gap status changed.
3. Update section 5 risks/blockers if status changed.
4. Append or revise section 6 with concise change bullets.
5. If publish flow behavior changed on this machine, update `dev/LOCAL_PUBLISH_RUNBOOK_WINDOWS.md` in the same session.
