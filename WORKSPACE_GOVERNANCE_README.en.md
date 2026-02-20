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
4. BOOT controlled apply
5. UAT and troubleshooting

---

## 2) Before You Start

1. Plugin package:
   - `@adamchanadam/openclaw-workspace-governance`
2. Required skills:
   - `gov_setup`, `gov_migrate`, `gov_audit`, `gov_apply`, `gov_openclaw_json`, `gov_brain_audit`
3. If slash routing is unstable, use `/skill ...` fallback.

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

### A) Brand-new OpenClaw / brand-new workspace

1. Install plugin
2. `gov_setup install`
3. Run bootstrap prompt (`OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`)
4. `gov_audit`

### B) Running workspace, first governance adoption

1. Install/enable plugin
2. `gov_setup install`
3. Run bootstrap prompt
4. If workspace is already active: `gov_migrate`
5. `gov_audit`

### C) Governance already installed (daily maintenance)

1. Host side:

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

2. In OpenClaw:

```text
/gov_setup upgrade
/gov_migrate
/gov_audit
```

### D) Brain Docs conservative hardening

Use this flow when you want to reduce "act-first" or unsupported-certainty wording without flattening persona.

1. Start read-only preview:

```text
/gov_brain_audit
```

2. Approve only selected findings (or safe batch):

```text
/gov_brain_audit APPROVE: F001,F003
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

## 8) BOOT Controlled Apply Runbook

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
3. `gov_migrate` completes without blocked QC
4. `gov_audit` reports 12/12 PASS
5. Platform-change tasks route through `gov_openclaw_json`
6. Brain Docs writes require `FILES_READ` + `TARGET_FILES_TO_CHANGE`
7. Runtime hard gate hooks are active:
   - write-capable tool calls are blocked if PLAN/READ evidence is missing
   - read-only shell/testing commands should remain allowed
   - for blocked write tasks, include `WG_PLAN_GATE_OK` and `WG_READ_GATE_OK` before retry
8. Brain Docs auditor flow works end-to-end:
   - `gov_brain_audit` returns findings and approval checklist
   - `gov_brain_audit APPROVE: ...` creates backup and run report
   - `gov_brain_audit ROLLBACK` restores latest approved backup

---

## 10) Troubleshooting

1. `plugin already exists` during install:
   - use `openclaw plugins update openclaw-workspace-governance`
2. Slash not responding:
   - use `/skill ...` fallback or natural-language request to invoke the skill
3. `gov_setup check` returns `NOT_INSTALLED`:
   - run `gov_setup install`
4. `gov_setup check` returns `PARTIAL`:
   - run `gov_setup upgrade`
5. Audit mismatch after update:
   - run `gov_migrate` then `gov_audit` again
6. Runtime gate block message appears:
   - this usually means governance guard worked (not a system crash)
   - if task is write/update/save: output PLAN + READ evidence, include `WG_PLAN_GATE_OK` + `WG_READ_GATE_OK`, then retry CHANGE
   - if task is read-only diagnostics/testing: keep command read-only and rerun
7. `gov_setup upgrade` still stuck at governance gate:
   - update plugin to latest: `openclaw plugins update openclaw-workspace-governance`
   - restart gateway: `openclaw gateway restart`
   - rerun: `/gov_setup check` then `/gov_setup upgrade`
   - or ask in natural language: `Please run gov_setup in upgrade mode for this workspace.`
8. Auto-update expectation:
   - no background auto-update
   - use manual flow: `openclaw plugins update ...` -> `openclaw gateway restart` -> `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
9. `gov_brain_audit APPROVE: ...` reports blocked:
   - include explicit approval input (`APPROVE: F001,F003` or `APPROVE: APPLY_ALL_SAFE`)
   - rerun with `/gov_brain_audit APPROVE: ...`

---

## 11) Related Docs

1. Homepage (EN): [`README.md`](./README.md)
2. Homepage (繁中): [`README.zh-HK.md`](./README.zh-HK.md)
3. Positioning (EN): [`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)
4. Positioning (繁中): [`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)
