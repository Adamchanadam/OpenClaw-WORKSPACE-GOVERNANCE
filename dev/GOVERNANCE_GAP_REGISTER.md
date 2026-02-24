# Governance Gap Register

Purpose:
1. Track real engineering gaps between current baseline and target-state.
2. Keep backlog executable (each item has acceptance and release impact).

Priority legend:
1. `P0`: release-blocking safety/consistency risk
2. `P1`: high-value hardening for deploy confidence
3. `P2`: quality/maintainability improvement

Status legend:
1. `OPEN`
2. `IN_PROGRESS`
3. `DONE`
4. `DEFERRED`

## Active Gaps

| Gap ID | Priority | Status | Gap Statement | Current Impact | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- |
| GAP-001 | P1 | OPEN | Mode B verification remains mostly contract-level, not hard deterministic runtime enforcement | Evidence-answer tasks can still rely on soft discipline | Add deterministic verification hook/policy for system/version/time-sensitive answer flows, with regression coverage |
| GAP-002 | P1 | OPEN | `gov_openclaw_json` is skill-driven, not deterministic command parity in `index.ts` | Operational behavior depends more on free-form skill routing | Phase 1: add `tools/gov_openclaw_json_sync.mjs` deterministic CHECK runner with Platform Health Score (0-10); `registerCommand` wiring + `formatCommandOutput`; hybrid: check=deterministic, apply/custom=SKILL; ~4 regression cases |
| GAP-003 | P1 | OPEN | `gov_brain_audit` is skill-driven, not deterministic command parity in `index.ts` | Critical safety path lacks same command-level determinism as core lifecycle commands | Phase 2: add `tools/gov_brain_audit_sync.mjs` deterministic PREVIEW runner with Brain Docs Health Score (0-100) via `brain_audit_rules.mjs`; hybrid: preview=deterministic, APPROVE/ROLLBACK=SKILL; ~5 regression cases |
| GAP-004 | P1 | OPEN | `gov_apply` is deterministic locally but still Experimental by policy | Cannot claim unattended GA apply automation | Complete repeated host UAT evidence (Phase B5) across releases; define GA promotion threshold and pass gate |
| GAP-005 | P2 | OPEN | Cross-doc repetition still exists between README and handbook sections | Higher maintenance cost, drift risk | Normalize repetitive sections into one canonical pattern and keep cross-links concise |
| GAP-006 | P2 | OPEN | Regression denominator may drift without explicit update protocol | False confidence or stale release criteria | Enforce denominator-change checklist in dev docs and release notes template |
| GAP-007 | P2 | OPEN | BOOT audit output is LLM-generated (prompt template only, not deterministic runner) | Cannot regression-test BOOT output format or recurrence detection logic | Phase 3: add `tools/gov_boot_audit_sync.mjs` deterministic scanner for `_runs/` + `_control/ACTIVE_GUARDS.md`; produce structured BOOT AUDIT REPORT + MENU through `formatCommandOutput`; ~3 regression cases |

## Completed / Recently Closed

| Gap ID | Priority | Status | Resolution |
| --- | --- | --- | --- |
| GAP-C01 | P0 | DONE | `gov_apply` deterministic runner added and wired to command (`tools/gov_apply_sync.mjs`, `index.ts`) |
| GAP-C02 | P0 | DONE | Runtime regression expanded to include apply + uninstall-integrity command-flow cases (`34/34`) |
| GAP-C03 | P0 | DONE | Consistency gate now validates apply runner registration and B5 matrix presence |
| GAP-C04 | P0 | DONE | Baseline/docs updated to mark `gov_apply` as Experimental but deterministic-covered |
| GAP-C05 | P0 | DONE | `gov_uninstall` root-fix: remove broad shared-folder delete behavior; enforce explicit target cleanup + brain backup restore evidence + non-governance file preservation regression |
| GAP-C06 | P0 | DONE | Quick-flow loop root-fix: `gov_migrate` now seeds missing `_control/PRESETS.md` and `_control/WORKSPACE_INDEX.md`, and repairs marker-count anomalies before audit |
| GAP-C07 | P1 | DONE | UX transparency contract delivered in deterministic outputs (`SIGNAL`, setup `flow_trace`, setup/migrate `execution_items`, audit `qc_12_item`) with regression assertions |
| GAP-C08 | P1 | DONE | UX branding refresh: `SIGNAL` text replaced by emoji prefix; `formatCommandOutput` uses branded header (`🐾`), `─────` dividers, `  •` bullets, `👉` next-step; regression `40/40` |

## Promotion Gate (for `gov_apply` EXP -> GA)

All conditions must pass:
1. Deterministic runtime regression remains green.
2. Public-flow B5 host evidence recorded for multiple releases/environments.
3. No unresolved P0/P1 apply-path incidents in recent release window.
4. README/handbook/publishing/baseline all switched in one atomic doc update.
