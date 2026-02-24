# Governance Traceability Matrix

Purpose:
1. Map each capability to code, tests, docs, and known gaps.
2. Prevent "claimed but not implemented" drift.

Status legend:
1. `GA`: production baseline
2. `EXP`: experimental (controlled-UAT)
3. `PARTIAL`: implemented but missing hard enforcement or coverage

| ID | Capability | Status | Primary Code | Validation | Primary Docs | Gap / Notes |
| --- | --- | --- | --- | --- | --- | --- |
| CAP-001 | Deterministic `gov_setup` command | GA | `index.ts`, `tools/gov_setup_sync.mjs` | `dev/run_runtime_regression.mjs` (`setup-*` cases) | `skills/gov_setup/SKILL.md`, `README.md` | Stable baseline |
| CAP-001A | One-click `gov_setup quick|auto` orchestration | GA | `index.ts` (`makeGovSetupQuickCommandResponse`) + setup/migrate/audit runners | runtime `setup-install` quick-flow case | README + handbooks | One command runs full lifecycle chain with deterministic stage results |
| CAP-002 | Deterministic `gov_migrate` command | GA | `index.ts`, `tools/gov_migrate_sync.mjs` | runtime cases `migrate-*`; public flow B4 | `skills/gov_migrate/SKILL.md`, handbook docs | Stable baseline |
| CAP-003 | Deterministic `gov_audit` command | GA | `index.ts`, `tools/gov_audit_sync.mjs` | runtime + consistency checks | `skills/gov_audit/SKILL.md` | Stable baseline |
| CAP-004 | Deterministic `gov_uninstall` command | GA | `index.ts`, `tools/gov_uninstall_sync.mjs` | runtime cases `uninstall-*` + public flow B2 | `skills/gov_uninstall/SKILL.md` | Scope-limited cleanup, brain-backup evidence, non-governance file preservation covered |
| CAP-004A | One-click `gov_uninstall quick|auto` orchestration | GA | `index.ts` (`makeGovUninstallQuickCommandResponse`) + uninstall runner | runtime `uninstall-quick-*` cases + B2 | README + handbooks | One command performs safe check->uninstall chain with backup evidence |
| CAP-004B | Deterministic `gov_help` command catalog | GA | `index.ts` (`makeGovHelpCommandResponse`) | runtime command registration case | README + handbooks | Improves UX discoverability; lowers operator memory burden |
| CAP-005 | Deterministic `gov_apply` command | EXP | `index.ts`, `tools/gov_apply_sync.mjs` | runtime cases `apply-*`; public flow B5 plan | `skills/gov_apply/SKILL.md`, README/handbook | Controlled-UAT only; includes `governance_maturity` delta; not unattended GA |
| CAP-006 | Runtime Mode C write gate | GA | `index.ts` hook `before_tool_call` | runtime gate cases | handbook + baseline docs | Stable baseline |
| CAP-007 | Tool exposure guard (explicit `/gov_*` root-fix) | GA | `index.ts` `toolExposureGuard` flow | runtime cases `s12/s12b/s13/s14/s15` | README + handbook | Stable baseline |
| CAP-008 | OpenClaw system command compatibility | GA | `index.ts` shell policy logic | runtime mixed command cases + public flow A | public flow regression doc | Stable baseline |
| CAP-009 | `gov_openclaw_json` hybrid command | GA | `index.ts` (`makeGovOpenclawJsonCommandResponse`), `tools/gov_openclaw_json_sync.mjs` | runtime C41-C44 | `skills/gov_openclaw_json/SKILL.md`, README | check=deterministic Platform Health Score (0-10), apply/default=SKILL [GAP-002 DONE] |
| CAP-010 | `gov_brain_audit` hybrid command | GA | `index.ts` (`makeGovBrainAuditCommandResponse`), `tools/gov_brain_audit_sync.mjs` | runtime C45-C49 | `skills/gov_brain_audit/SKILL.md`, README | preview=deterministic Brain Docs Health Score (0-100), approve/rollback=SKILL [GAP-003 DONE] |
| CAP-011 | Mode B evidence-answer enforcement | GA | `index.ts` `isModeBSystemSensitive()` + `before_prompt_build` hook | runtime C53-C54 | README + handbooks + apply prompt | Hard deterministic gate for system/version/time-sensitive questions [GAP-001 DONE] |
| CAP-012 | Canonical embedded payload consistency gate | GA | `dev/check_release_consistency.mjs` | machine gate | dev docs + publishing guide | Stable baseline |
| CAP-013 | Release gate denominator baseline | GA | `dev/run_runtime_regression.mjs` | `SUMMARY 54/54 passed` | `dev/README.md`, `PUBLISHING.md` | Keep denominator updated when adding cases |
| CAP-014 | First-install bootstrap routing integrity | GA | `index.ts` + `gov_setup`/`gov_migrate` responses | public flow B3 + runtime setup/migrate cases | public flow doc + README | Stable baseline |
| CAP-015 | BOOT apply deep-dive matrix (A1-A5) | EXP | process/spec level (`dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md`) | host UAT B5 when apply changes | public flow doc + baseline inventory | Must be executed for apply-touching releases |
| CAP-016 | Command UX branded output contract (`🐾` header + emoji STATUS + `👉` next-step + `flow_trace` + `execution_items` + `qc_12_item`) | GA | `index.ts` `makeStatusSignal` + `formatCommandOutput` + `BRAND_DIVIDER` + setup/migrate/audit responders | runtime cases `setup-*`, `audit-*`, all `STATUS\s*\n` assertions | README + handbooks + baseline inventory | v0.1.49: replaced text SIGNAL with emoji prefix; branded header; `  •` bullets; `─────` dividers |
| CAP-017 | `gov_boot_audit` deterministic recurrence scanner | GA | `index.ts` (`makeGovBootAuditCommandResponse`), `tools/gov_boot_audit_sync.mjs` | runtime C50-C52 | README | Scans `_runs/` for recurrence patterns; generates BOOT UPGRADE MENU [GAP-007 DONE] |

## Update Rule

When changing any capability:
1. Update row status and notes.
2. Add/adjust test reference.
3. Update related docs in same PR.
