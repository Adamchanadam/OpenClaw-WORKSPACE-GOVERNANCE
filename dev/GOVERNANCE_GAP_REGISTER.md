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
| GAP-002 | P1 | OPEN | `gov_openclaw_json` is skill-driven, not deterministic command parity in `index.ts` | Operational behavior depends more on free-form skill routing | Add deterministic command + runner contract (or explicit rationale why skill-only remains), with runtime regression cases |
| GAP-003 | P1 | OPEN | `gov_brain_audit` is skill-driven, not deterministic command parity in `index.ts` | Critical safety path lacks same command-level determinism as core lifecycle commands | Add deterministic command handler path and regression coverage for preview/approve/rollback routing |
| GAP-004 | P1 | OPEN | `gov_apply` is deterministic locally but still Experimental by policy | Cannot claim unattended GA apply automation | Complete repeated host UAT evidence (Phase B5) across releases; define GA promotion threshold and pass gate |
| GAP-005 | P2 | OPEN | Cross-doc repetition still exists between README and handbook sections | Higher maintenance cost, drift risk | Normalize repetitive sections into one canonical pattern and keep cross-links concise |
| GAP-006 | P2 | OPEN | Regression denominator may drift without explicit update protocol | False confidence or stale release criteria | Enforce denominator-change checklist in dev docs and release notes template |

## Completed / Recently Closed

| Gap ID | Priority | Status | Resolution |
| --- | --- | --- | --- |
| GAP-C01 | P0 | DONE | `gov_apply` deterministic runner added and wired to command (`tools/gov_apply_sync.mjs`, `index.ts`) |
| GAP-C02 | P0 | DONE | Runtime regression expanded to include apply command-flow cases (`28/28`) |
| GAP-C03 | P0 | DONE | Consistency gate now validates apply runner registration and B5 matrix presence |
| GAP-C04 | P0 | DONE | Baseline/docs updated to mark `gov_apply` as Experimental but deterministic-covered |

## Promotion Gate (for `gov_apply` EXP -> GA)

All conditions must pass:
1. Deterministic runtime regression remains green.
2. Public-flow B5 host evidence recorded for multiple releases/environments.
3. No unresolved P0/P1 apply-path incidents in recent release window.
4. README/handbook/publishing/baseline all switched in one atomic doc update.
