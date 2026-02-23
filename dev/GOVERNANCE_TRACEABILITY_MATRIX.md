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
| CAP-005 | Deterministic `gov_apply` command | EXP | `index.ts`, `tools/gov_apply_sync.mjs` | runtime cases `apply-*`; public flow B5 plan | `skills/gov_apply/SKILL.md`, README/handbook | Controlled-UAT only; not unattended GA |
| CAP-006 | Runtime Mode C write gate | GA | `index.ts` hook `before_tool_call` | runtime gate cases | handbook + baseline docs | Stable baseline |
| CAP-007 | Tool exposure guard (explicit `/gov_*` root-fix) | GA | `index.ts` `toolExposureGuard` flow | runtime cases `s12/s12b/s13/s14/s15` | README + handbook | Stable baseline |
| CAP-008 | OpenClaw system command compatibility | GA | `index.ts` shell policy logic | runtime mixed command cases + public flow A | public flow regression doc | Stable baseline |
| CAP-009 | `gov_openclaw_json` safe platform change path | GA | skill contract (`skills/gov_openclaw_json/SKILL.md`) | public flow B0/C | README + handbook | Deterministic command parity not yet implemented |
| CAP-010 | `gov_brain_audit` preview/approve/rollback path | GA | skill contract + `tools/brain_audit_rules.mjs` | public flow C/D | README + handbook | Deterministic command parity not yet implemented |
| CAP-011 | Mode B evidence-answer enforcement | PARTIAL | prompt/skill contract level | manual/host validation only | README + handbooks + apply prompt | Not fully hard-gated in runtime |
| CAP-012 | Canonical embedded payload consistency gate | GA | `dev/check_release_consistency.mjs` | machine gate | dev docs + publishing guide | Stable baseline |
| CAP-013 | Release gate denominator baseline | GA | `dev/run_runtime_regression.mjs` | `SUMMARY 34/34 passed` | `dev/README.md`, `PUBLISHING.md` | Keep denominator updated when adding cases |
| CAP-014 | First-install bootstrap routing integrity | GA | `index.ts` + `gov_setup`/`gov_migrate` responses | public flow B3 + runtime setup/migrate cases | public flow doc + README | Stable baseline |
| CAP-015 | BOOT apply deep-dive matrix (A1-A5) | EXP | process/spec level (`dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md`) | host UAT B5 when apply changes | public flow doc + baseline inventory | Must be executed for apply-touching releases |

## Update Rule

When changing any capability:
1. Update row status and notes.
2. Add/adjust test reference.
3. Update related docs in same PR.
