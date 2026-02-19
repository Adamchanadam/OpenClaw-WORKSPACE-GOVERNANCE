# OpenClaw WORKSPACE_GOVERNANCE

> Turn OpenClaw from "easy to start" into "safe to run long-term" with a simple governance flow: plan first, verify first, then change.

[繁體中文版](./README.zh-HK.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#install) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#quick-start)

ClawHub installer:
- https://clawhub.ai/Adamchanadam/openclaw-workspace-governance-installer

---

## What It Is

OpenClaw WORKSPACE_GOVERNANCE is a plugin + skill set for OpenClaw workspaces.

It gives you one stable way to run high-risk tasks:
1. `PLAN`
2. `READ`
3. `CHANGE`
4. `QC`
5. `PERSIST`

Why this matters:
1. Fewer "edit first, check later" accidents.
2. Fewer repeated mistakes across sessions.
3. Clear run evidence for review, handover, and rollback.

---

## Quick Start

### Install

First-time install:

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
openclaw plugins enable openclaw-workspace-governance
openclaw skills list --eligible
```

If already installed (upgrade path):

```text
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

### Initialize or Upgrade Governance Assets

```text
/gov_setup check
/gov_setup install      # first deployment
/gov_setup upgrade      # existing workspace upgrade
```

Slash fallback:

```text
/skill gov_setup check
/skill gov_setup install
/skill gov_setup upgrade
```

---

## Command Chooser

| If you want to... | Use | Scope |
|---|---|---|
| Deploy governance files for the first time | `/gov_setup install` | `<workspace-root>/prompts/governance/` |
| Upgrade governance files already deployed | `/gov_setup upgrade` | `<workspace-root>/prompts/governance/` |
| Apply governance alignment updates | `/gov_migrate` | workspace governance files |
| Verify consistency (read-only) | `/gov_audit` | workspace governance evidence |
| Apply an approved BOOT item | `/gov_apply <NN>` | approved BOOT menu item only |
| Safely change OpenClaw platform config | `/gov_platform_change` | `~/.openclaw/openclaw.json`, `~/.openclaw/extensions/` |

`gov_platform_change` is not for Brain Docs (`USER.md`, `SOUL.md`, `memory/*.md`) or normal workspace content.

---

## Three Scenarios

1. Brand-new OpenClaw or brand-new workspace:
   - `gov_setup install` -> run bootstrap prompt -> `gov_audit`
2. Running workspace, first governance adoption:
   - `gov_setup install` -> bootstrap/migration path -> `gov_audit`
3. Governance already installed (daily maintenance):
   - `gov_setup upgrade` -> `gov_migrate` -> `gov_audit`
   - if BOOT has numbered proposals: `gov_apply <NN>` then `gov_audit`

For full step-by-step operations: [`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)

---

## Reliability Rules (Simple)

1. Any write/update/save task is Mode C and must run full 5 gates.
2. OpenClaw system claims must verify official docs first: `https://docs.openclaw.ai`.
3. Version-sensitive claims must also verify releases: `https://github.com/openclaw/openclaw/releases`.
4. Date/time claims must verify current runtime time first and answer with explicit dates.
5. Brain Docs read-only questions must read exact target files first.
6. Brain Docs write/update must include run-report evidence: `FILES_READ` + `TARGET_FILES_TO_CHANGE`.
7. Platform config changes must use `gov_platform_change` (backup/validate/rollback required).

---

## 5-Minute UAT (No Slash)

If slash routing is unstable, ask in natural language:

```text
Please use gov_setup in check mode (read-only) and return:
1) workspace root
2) install status (NOT_INSTALLED / PARTIAL / READY)
3) next step
```

Pass criteria:
1. `NOT_INSTALLED` -> run `gov_setup install`
2. `PARTIAL` -> run `gov_setup upgrade`
3. `READY` -> run `gov_migrate` then `gov_audit`

---

## FAQ

### Q1. Is this replacing OpenClaw?
No. It adds governance controls on top of OpenClaw runtime.

### Q2. Can I use it without technical background?
Yes. Start with `gov_setup check`, follow next-step output, then run migrate/audit.

### Q3. Why not edit config directly?
Direct edits are risky for long-running systems. Governance flow keeps backup, validation, and rollback evidence.

### Q4. When should I use `gov_apply <NN>`?
Only after BOOT gives numbered proposals and you approve one item.

### Q5. Can `gov_platform_change` edit Brain Docs?
No. Brain Docs are not platform control-plane files.

### Q6. Plugin installed, but governance files not in workspace?
Run `gov_setup install` (or `gov_setup upgrade` for existing installs).

### Q7. Which command should I run after plugin update?
`gov_setup upgrade` -> `gov_migrate` -> `gov_audit`.

### Q8. Can I keep using `/skill ...` if slash is unstable?
Yes. `/skill gov_setup ...`, `/skill gov_migrate`, `/skill gov_audit`, `/skill gov_apply <NN>`, `/skill gov_platform_change`.

### Q9. What happens after AI mistakes?
The flow records errors in run reports, supports recurrence detection, and uses BOOT numbered proposals for controlled improvement.

### Q10. Where can I read deeper docs?
Use the links below.

---

## Deep Docs

1. Operations handbook (EN): [`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
2. Operations handbook (繁中): [`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)
3. Positioning and factory-gap (EN): [`VALUE_POSITIONING_AND_FACTORY_GAP.en.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md)
4. Positioning and factory-gap (繁中): [`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)

---

## Official References

- https://docs.openclaw.ai/tools/skills
- https://docs.openclaw.ai/tools/clawhub
- https://docs.openclaw.ai/plugins
- https://docs.openclaw.ai/cli/plugins
- https://docs.openclaw.ai/cli/skills
- https://github.com/openclaw/openclaw/releases
