# WORKSPACE_GOVERNANCE Operations Handbook (EN)

> This is the operations playbook.
> For homepage overview: [`README.md`](./README.md)
> For positioning/factory-gap analysis: [`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)

---

## 1) Purpose

Use this handbook when you need exact, repeatable operating steps.

It covers:
1. Install and upgrade paths
2. Daily governance operations
3. Platform-safe config changes
4. BOOT controlled apply (Experimental)
5. UAT and troubleshooting

---

## 2) Before You Start

1. Plugin package:
   - `@adamchanadam/openclaw-workspace-governance`
2. Required skills:
   - GA: `gov_setup`, `gov_migrate`, `gov_audit`, `gov_openclaw_json`, `gov_brain_audit`, `gov_uninstall`
   - Experimental: `gov_apply`
3. Built-in command catalog:
   - `gov_help` (read-only command list + one-click entry suggestions)
4. If slash routing is unstable, use `/skill ...` fallback.

Host-side checks:

```text
openclaw plugins info openclaw-workspace-governance
npm view @adamchanadam/openclaw-workspace-governance version
openclaw skills list --eligible
```

---

## 3) Governance Execution Order

Any write/update/save task must run in this order:
1. `PLAN`
2. `READ`
3. `CHANGE`
4. `QC`
5. `PERSIST`

Fail-Closed:
1. Missing evidence/path ambiguity -> stop
2. Any QC fail -> do not claim completion

Operator UX output convention:
1. `STATUS`
2. `WHY`
3. `NEXT STEP (Operator)`
4. `COMMAND TO COPY`

---

## 4) Mode Map

1. Mode A: conversational only (no writes, no system-truth claims)
2. Mode B: evidence-based answer (no writes)
3. Mode C: any write/update/save (full 5-gate flow)
   - includes coding/development requests (build/fix/refactor/implement) whenever files will be changed

Special rules:
1. OpenClaw system claims: verify local skills + `https://docs.openclaw.ai`
2. Version-sensitive claims: also verify `https://github.com/openclaw/openclaw/releases`
3. Date/time claims: verify runtime current time first; answer with explicit dates
4. Brain Docs read-only asks: read exact target files first
5. Brain Docs writes: Mode C + run report fields `FILES_READ` + `TARGET_FILES_TO_CHANGE`

Tool exposure root-fix (security default):
1. Governance plugin tools require explicit `/gov_*` intent in the current turn (or `/skill gov_*` fallback) before tool execution.
2. This fail-closed behavior reduces untrusted-input trigger risk under permissive tool-policy contexts.
3. It does not replace normal OpenClaw usage; without explicit governance command intent, governance tools do not auto-run.

---

## 5) File-Scope Map (Important)

1. Workspace governance files:
   - `<workspace-root>/prompts/governance/`
   - managed by `gov_setup install|upgrade|check`
2. Platform control plane:
   - `~/.openclaw/openclaw.json`
   - `~/.openclaw/extensions/` (only when explicitly needed)
   - managed by `gov_openclaw_json`
3. Brain Docs:
   - `USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`
   - not handled by `gov_openclaw_json`
   - use `gov_brain_audit` (single entry; preview by default, approval-driven apply/rollback)

---

## 6) Standard Runbooks

### Command Value Map (Operator Decision Aid)

| Command | Use it when | Immediate value |
| --- | --- | --- |
| `gov_help` | Need full command list in-session | Gives zero-memory operator menu and one-click entrypoints |
| `gov_setup quick` | Daily default for install/upgrade alignment | One-click chain: check -> install/upgrade/skip -> migrate -> audit |
| `gov_setup check` | Before any install/upgrade decision | Exposes workspace status, trust-readiness, and explicit next action so you do not guess |
| `gov_setup install` | First governance deployment in this workspace | Creates baseline governance files in one controlled step |
| `gov_setup upgrade` | Governance files already exist but need latest version | Refreshes governance package files without skipping safety checks |
| `gov_migrate` | After install/upgrade when policy alignment is required | Brings active workspace behavior in line with current governance rules |
| `gov_audit` | After changes and before declaring completion | Verifies fixed checklist/evidence and catches drift early |
| `gov_openclaw_json` | Need control-plane edits (`openclaw.json`/extensions) | Applies minimal change with backup/validate/rollback path |
| `gov_apply <NN>` (Experimental) | BOOT emitted numbered proposal and human approved in controlled UAT | Preserves human-approved single-item apply path; do not treat as unattended GA automation |
| `gov_brain_audit` | Need Brain Docs risk review/hardening | Semantic-first preview, approval-based apply, and rollback support |
| `gov_uninstall quick` | Need workspace governance cleanup before package uninstall | One-click chain: check -> uninstall (with backup/restore evidence) |

### Shared Trust-Alignment Branch (Use when `gov_setup check` says allowlist/trust is not ready)

```text
/gov_openclaw_json
/gov_setup check
```

### A) Brand-new OpenClaw / brand-new workspace

1. Install plugin
2. `gov_setup quick` (default one-click path)
3. If check output says allowlist is not ready: run the shared trust-alignment branch above.
4. If operator requires strict step-by-step, use manual chain:
   - `gov_setup check` -> `gov_setup install` -> `gov_migrate` -> `gov_audit`

### B) Running workspace, first governance adoption

1. Install/enable plugin
2. `gov_setup quick` (default one-click path)
3. If check output says allowlist is not ready: run the shared trust-alignment branch above.
4. If operator requires strict step-by-step, use manual chain:
   - `gov_setup check` -> `gov_setup install` -> `gov_migrate` -> `gov_audit`

### C) Governance already installed (daily maintenance)

1. Host side:

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

2. In OpenClaw:

```text
/gov_setup quick
# if check output says allowlist is not ready (for example plugins.allow needs alignment):
/gov_openclaw_json
/gov_setup quick
/gov_setup upgrade
/gov_migrate
/gov_audit
```

Note (to avoid upgrade misclassification):
1. `READY` from `/gov_setup check` means "currently operable/aligned enough", not "skip an explicitly requested upgrade".
2. If operator explicitly runs `/gov_setup upgrade`, upgrade should execute (at most `PASS: already up-to-date`), never `SKIPPED (No-op upgrade)`.

### D) Brain Docs conservative hardening

Use this flow when you want to reduce "act-first" or unsupported-certainty wording without flattening persona.
`gov_brain_audit` is semantic-first (language-agnostic), with optional rules script (`tools/brain_audit_rules.mjs`) as a deterministic structural cross-check.

What it checks (semantic + deterministic evidence classes):
1. action-before-verification wording
2. unsupported certainty wording
3. completion/pass claims without required evidence fields
4. read-claim vs file-existence mismatch
5. speculative memory statements presented as facts
6. optional lexical-hint mode is advisory only and must be confirmed by semantic review

1. Start read-only preview:

```text
/gov_brain_audit
```

2. Approve only selected findings (or safe batch):
   - Finding IDs like `F001` are examples only; copy actual IDs from the latest preview findings list.

```text
/gov_brain_audit APPROVE: <PASTE_IDS_FROM_PREVIEW>
# or
/gov_brain_audit APPROVE: APPLY_ALL_SAFE
```

3. If result is not acceptable:

```text
/gov_brain_audit ROLLBACK
```

### E) Runtime automatic health-check trigger (`gov_brain_audit`)

Implemented behavior (read-only; never auto-apply):
1. Trigger window starts at session/gateway start
2. Trigger window refreshes after `gov_setup upgrade`
3. Trigger window refreshes after `gov_migrate`
4. Trigger window refreshes after `gov_audit`
5. Trigger window refreshes when repeated write blocks hit threshold
6. During active trigger window, write-capable actions can be blocked until `/gov_brain_audit` preview runs

---

## 7) Platform Config Change Runbook

Use this only for control-plane files.

1. Request via `gov_openclaw_json`
2. Create workspace-local backup under `archive/_platform_backup_<ts>/...`
3. Apply minimal config change
4. Validate
5. Roll back from backup if validation fails
6. Keep run-report evidence (before/after + backup path)

Fallback:

```text
/skill gov_openclaw_json
```

---

## 8) BOOT Controlled Apply Runbook (Experimental)

Maturity boundary:
1. Keep this runbook for controlled UAT and operator-reviewed adoption only.
2. `gov_apply` is covered by deterministic runtime regression baseline.
3. GA rollout should not depend on unattended `gov_apply` execution.

1. BOOT runs read-only checks and outputs numbered proposals
2. Human approves one proposal number
3. Run:

```text
/gov_apply <NN>
```

4. Then run:

```text
/gov_migrate
/gov_audit
```

5. Record before/after indicators
6. If no measurable improvement: mark as `PARTIAL`

---

## 9) UAT Checklist

1. `gov_setup check` returns status + next step
2. `gov_setup install|upgrade` deploys expected governance files
3. `gov_setup check` reports `allow_status=ALLOW_OK` before final install/upgrade completion
4. `gov_migrate` completes without blocked QC
5. `gov_audit` reports 12/12 PASS
6. Platform-change tasks route through `gov_openclaw_json`
7. Brain Docs writes require `FILES_READ` + `TARGET_FILES_TO_CHANGE`
8. Runtime hard gate hooks are active:
   - write-capable tool calls are blocked if PLAN/READ evidence is missing
   - read-only shell/testing commands should remain allowed
   - for blocked write tasks, include `WG_PLAN_GATE_OK` and `WG_READ_GATE_OK` before retry
9. Brain Docs auditor flow works end-to-end:
   - `gov_brain_audit` returns findings and approval checklist
   - `gov_brain_audit APPROVE: ...` creates backup and run report
   - `gov_brain_audit ROLLBACK` restores latest approved backup
10. Optional Experimental UAT only:
   - if BOOT emits approved menu item, verify `/gov_apply <NN>` then close with `/gov_migrate` + `/gov_audit`
11. Uninstall acceptance (mandatory):
   - run `/gov_uninstall quick`
   - optional strict verification: `/gov_uninstall check`
   - expected: `PASS`/`CLEAN`, then `CLEAN` on verification check
   - confirm `_runs/gov_uninstall_<ts>.md` and `archive/_gov_uninstall_backup_<ts>/...` exist

---

## 10) Troubleshooting

1. `plugin already exists` during install:
   - use `openclaw plugins update openclaw-workspace-governance`
2. Slash not responding:
   - use `/skill ...` fallback or natural-language request to invoke the skill
3. `gov_setup check` returns `NOT_INSTALLED`:
   - run `gov_setup quick` (or manual `gov_setup install`)
4. `gov_setup check` returns `PARTIAL`:
   - run `gov_setup quick` (or manual `gov_setup upgrade`)
5. `openclaw plugins list` warns `plugins.allow is empty`:
   - this is trust-allowlist warning, not governance crash
   - run `gov_setup check`, if `allow_status!=ALLOW_OK` run `/gov_openclaw_json`, then rerun `gov_setup check`
6. Official setup/config commands changed `openclaw.json` (for example `openclaw onboard`, `openclaw configure`):
   - expected behavior: governance may require trust realignment before install/upgrade
   - run `/gov_setup check` -> if trust is not ready run `/gov_openclaw_json` -> rerun `/gov_setup check`
7. Audit mismatch after update:
   - run `gov_migrate` then `gov_audit` again
8. Runtime gate block message appears:
   - this usually means governance guard worked (not a system crash)
   - official `openclaw ...` system commands are allow-by-default and should not be blocked by runtime gate
   - if task is write/update/save: output PLAN + READ evidence, include `WG_PLAN_GATE_OK` + `WG_READ_GATE_OK`, then retry CHANGE
   - if task is read-only diagnostics/testing: keep command read-only and rerun
9. `gov_setup upgrade` still stuck at governance gate:
   - update plugin to latest: `openclaw plugins update openclaw-workspace-governance`
   - restart gateway: `openclaw gateway restart`
   - rerun: `/gov_setup check` then `/gov_setup upgrade`
   - or ask in natural language: `Please run gov_setup in upgrade mode for this workspace.`
10. `gov_setup` / `gov_migrate` source looks mixed (shadow case):
   - check source first: `openclaw skills info gov_setup --json`, `openclaw skills info gov_migrate --json`
   - if `gov_migrate` source is `openclaw-workspace` and points to old `<workspace>/skills/gov_*` copies, run `/gov_setup upgrade` first
   - latest `gov_setup` auto-reconciles `<workspace>/skills/gov_*` legacy copies into `archive/_gov_setup_shadow_backup_<ts>/...` before normal upgrade flow
11. Auto-update expectation:
   - no background auto-update
   - use manual flow: `openclaw plugins update ...` -> `openclaw gateway restart` -> `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
12. `gov_brain_audit APPROVE: ...` reports blocked:
   - include explicit approval input (`APPROVE: <PASTE_IDS_FROM_PREVIEW>` or `APPROVE: APPLY_ALL_SAFE`)
   - `PASTE_IDS_FROM_PREVIEW` means finding IDs from your current preview output, not fixed IDs
   - rerun with `/gov_brain_audit APPROVE: ...`
13. `BOOT AUDIT REPORT` warns about an old blocked migration run:
   - if a newer PASS exists for the same flow family (`migrate_governance_*`), treat it as resolved history (informational), not an active blocker
   - if no newer PASS exists, run `/gov_migrate` then `/gov_audit`
14. You already ran `openclaw plugins uninstall` before workspace cleanup:
   - reinstall plugin first so `/gov_uninstall` is available
   - run `/gov_uninstall quick` (optional strict verify: `/gov_uninstall check`)
   - if Brain Docs autofix backups exist (`archive/_brain_docs_autofix_<ts>/...`), `/gov_uninstall` reports restore strategy and evidence fields

---

## 11) Related Docs

1. Homepage (EN): [`README.md`](./README.md)
2. Homepage (繁中): [`README.zh-HK.md`](./README.zh-HK.md)
3. Positioning (EN): [`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)
4. Positioning (繁中): [`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)

