# WORKSPACE_GOVERNANCE Handbook (Bootstrap + Migration + Audit + Skills + BOOT Apply)

> Language: English handbook. Traditional Chinese counterpart: [`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)

## 1) What This Is

WORKSPACE_GOVERNANCE is a repeatable workspace governance method for OpenClaw.
It ensures that any write/update/save task follows a fixed sequence and leaves verifiable evidence.

This document is operations-focused.
For value positioning and factory baseline differences, read:
1. [`README.md`](./README.md)
2. [`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)

## 2) Why It Exists

Long-running workspaces commonly degrade due to:
1. Edit-first behavior before evidence checks.
2. Repeated mistakes across sessions.
3. Missing traceability for upgrade and rollback.

WORKSPACE_GOVERNANCE addresses this with explicit gates and auditable outputs.

## 3) Core Execution Order

All persistence tasks run:
1. `PLAN`
2. `READ`
3. `CHANGE`
4. `QC`
5. `PERSIST`

Fail-Closed rules:
1. Missing evidence/path ambiguity -> stop.
2. Any QC fail -> do not claim completion.

## 4) Runtime Modes

1. Mode A: conversational only (no write, no system-truth claims).
2. Mode B: evidence-based answers (no write).
3. Mode C: write/update/save (must run full governance lifecycle).

Extra controls:
1. System claims: verify local skills + `https://docs.openclaw.ai`.
2. Latest/version-sensitive claims: also verify `https://github.com/openclaw/openclaw/releases`.
3. Date/time claims: verify runtime current time context first.

## 5) Packaging and Entry Points

Primary plugin skills:
1. `gov_setup` (`install | upgrade | check`)
2. `gov_migrate`
3. `gov_audit`
4. `gov_apply <NN>`

Key behavior:
1. `openclaw plugins install ...` installs plugin under extensions.
2. Governance prompt assets are deployed into workspace only after `gov_setup install`.
3. `gov_setup check` returns `NOT_INSTALLED` / `PARTIAL` / `READY` with next action.

## 6) Three Usage Scenarios

1. New OpenClaw / new workspace:
   - `gov_setup install` -> Bootstrap -> `gov_audit`
2. Running workspace, first-time governance adoption:
   - `gov_setup install` -> Bootstrap/Migration path -> `gov_audit`
3. Running workspace, governance already installed:
   - `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
   - when BOOT provides numbered proposals: `gov_apply <NN>`

## 7) BOOT Controlled Apply

Recommended BOOT behavior:
1. Startup read-only checks and numbered proposals.
2. Human approval by number.
3. Controlled apply via `gov_apply <NN>`.
4. Post-apply migration/audit and measurable before/after indicators.

## 8) Repo Structure (Language-Aware)

```text
.
├─ README.md                              # English homepage
├─ README.zh-HK.md                        # Traditional Chinese mirror
├─ README.en.md                           # Backward-compat pointer to README.md
├─ WORKSPACE_GOVERNANCE_README.en.md      # English handbook (this file)
├─ WORKSPACE_GOVERNANCE_README.md         # Traditional Chinese handbook
├─ VALUE_POSITIONING_AND_FACTORY_GAP.en.md
├─ VALUE_POSITIONING_AND_FACTORY_GAP.md
├─ ref_doc/
└─ ... (skills, prompts, plugin files)
```

## 9) Glossary

1. Workspace: OpenClaw runtime working directory.
2. Bootstrap: first governance baseline setup.
3. Migration: governance upgrade for running workspace.
4. Audit: read-only consistency verification.
5. Run report: per-run evidence and change record.
6. Fail-Closed: stop when evidence is insufficient.

## 10) Official References

1. https://docs.openclaw.ai/tools/skills
2. https://docs.openclaw.ai/tools/slash-commands
3. https://docs.openclaw.ai/plugins
4. https://docs.openclaw.ai/cli/plugins
5. https://docs.openclaw.ai/cli/skills
6. https://docs.openclaw.ai/tools/clawhub
7. https://github.com/openclaw/openclaw/releases
