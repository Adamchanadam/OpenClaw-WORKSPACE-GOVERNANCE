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
| GAP-004 | P1 | IN_PROGRESS | `gov_apply` is deterministic locally but still Experimental by policy | Cannot claim unattended GA apply automation | Complete repeated host UAT evidence (Phase B5) across releases; define GA promotion threshold and pass gate |

## Completed / Recently Closed

| Gap ID | Priority | Status | Resolution |
| --- | --- | --- | --- |
| GAP-001 | P1 | DONE | Mode B deterministic enforcement: `isModeBSystemSensitive()` detection + `prependContext` directive for system/version/time-sensitive queries; regression C53-C54 |
| GAP-002 | P1 | DONE | `gov_openclaw_json` hybrid command: `tools/gov_openclaw_json_sync.mjs` Platform Health Score (0-10) CHECK runner + command wiring; regression C41-C44 |
| GAP-003 | P1 | DONE | `gov_brain_audit` hybrid command: `tools/gov_brain_audit_sync.mjs` Brain Docs Health Score (0-100) PREVIEW runner + command wiring; regression C45-C49 |
| GAP-007 | P2 | DONE | BOOT audit deterministic runner: `tools/gov_boot_audit_sync.mjs` recurrence scanner + upgrade menu + command wiring; regression C50-C52 |
| GAP-C01 | P0 | DONE | `gov_apply` deterministic runner added and wired to command (`tools/gov_apply_sync.mjs`, `index.ts`) |
| GAP-C02 | P0 | DONE | Runtime regression expanded to include apply + uninstall-integrity command-flow cases (`34/34`) |
| GAP-C03 | P0 | DONE | Consistency gate now validates apply runner registration and B5 matrix presence |
| GAP-C04 | P0 | DONE | Baseline/docs updated to mark `gov_apply` as Experimental but deterministic-covered |
| GAP-C05 | P0 | DONE | `gov_uninstall` root-fix: remove broad shared-folder delete behavior; enforce explicit target cleanup + brain backup restore evidence + non-governance file preservation regression |
| GAP-C06 | P0 | DONE | Quick-flow loop root-fix: `gov_migrate` now seeds missing `_control/PRESETS.md` and `_control/WORKSPACE_INDEX.md`, and repairs marker-count anomalies before audit |
| GAP-C07 | P1 | DONE | UX transparency contract delivered in deterministic outputs (`SIGNAL`, setup `flow_trace`, setup/migrate `execution_items`, audit `qc_12_item`) with regression assertions |
| GAP-C08 | P1 | DONE | UX branding refresh: `SIGNAL` text replaced by emoji prefix; `formatCommandOutput` uses branded header (`🐾`), `─────` dividers, `  •` bullets, `👉` next-step; regression `40/40` |
| GAP-C09 | P2 | DONE | `gov_apply` maturity delta: `governance_maturity: guards=N→N+1, lessons=N→N+1` in apply PASS output |
| GAP-005 | P2 | DONE | Cross-doc normalization: BASELINE_INVENTORY sections 3+4 replaced with cross-references to MASTER_SPEC/TRACEABILITY_MATRIX; handbooks annotated with canonical source notes |
| GAP-006 | P2 | DONE | Denominator drift protocol: hardcoded counts fixed to 54/54; automated `cases.push(` counter added to `check_release_consistency.mjs`; update checklist added to PUBLISHING.md |

## Promotion Gate (for `gov_apply` EXP -> GA)

All conditions must pass:
1. Deterministic runtime regression remains green.
2. Public-flow B5 host evidence recorded for multiple releases/environments.
3. No unresolved P0/P1 apply-path incidents in recent release window.
4. README/handbook/publishing/baseline all switched in one atomic doc update.

## B5 Evidence Accumulation Protocol

Purpose: Track host-side UAT evidence for `gov_apply` GA promotion decision.

### Evidence requirements
1. At least 3 successful `gov_apply` host executions across different releases.
2. Each execution must produce a PASS run report with:
   - `governance_maturity` delta (guards_before/after, lessons_before/after)
   - Backup evidence (`backup_root`)
   - Follow-up chain evidence (`/gov_migrate` + `/gov_audit` both PASS after apply)
3. No regressions introduced by any apply execution.

### Evidence recording
- Each host execution should be documented in `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md` under the B5 section.
- Include: date, release version, item applied, maturity delta, follow-up chain result.

### GA threshold
- Minimum 3 successful host executions across 2+ different release versions.
- Zero P0/P1 incidents in the apply path during the evidence window.
- All deterministic regression tests green at promotion time.
