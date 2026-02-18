# OpenClaw WORKSPACE_GOVERNANCE

> A workspace governance solution for OpenClaw (Plugin + ClawHub).  
> It standardizes governance operations to improve stability, reduce rework, and maintain traceable change records.

[中文版本](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#installation-options) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#first-deployment)

---

## What Is OpenClaw WORKSPACE_GOVERNANCE

OpenClaw WORKSPACE_GOVERNANCE is a governance framework for OpenClaw workspaces.  
It organizes operations into a fixed lifecycle:

1. Bootstrap: establish governance baseline for first-time setup.
2. Migration: apply governance upgrades to running workspaces.
3. Audit: validate consistency with a fixed checklist.
4. Apply: perform controlled BOOT proposal application after approval.

The project uses a dual distribution model:

1. Plugin as the primary runtime package with `gov_*` skills.
2. ClawHub Installer as the standard discovery and onboarding entry.

---

## Why Use This Solution

In long-running OpenClaw workspaces, common risks include:

1. Inconsistent modification flow causing governance drift.
2. Repeated governance gaps across new sessions.
3. Scattered evidence that increases review and rollback cost.

Core value delivered by this solution:

1. Standardized lifecycle: `Bootstrap -> Migrate -> Audit -> Apply`.
2. BOOT proposal + explicit approval + controlled apply to reduce write risk.
3. Stable entry points and traceable outputs for better team operations.

---

## Core Capabilities

1. First adoption: `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
2. Daily operations: `/gov_migrate`, `/gov_audit`
3. BOOT upgrades: `/gov_apply <NN>`
4. Asset deployment and updates: `/gov_setup install|upgrade|check`

---

## v1.1 Reliability Contract (Important)

To reduce risks like incorrect commands, date/time mistakes, and path drift, WG Core v1.1 adds these hard rules:

1. Three runtime modes:
   - Mode A: conversational only (no writes, no system-truth claims)
   - Mode B: evidence-based answers (no writes)
   - Mode C: any write/update/save action (must run the full governance lifecycle)
2. OpenClaw system topics (Mode B2):
   - Verify local skills and official docs (`https://docs.openclaw.ai`) before answering.
3. Date/time topics (Mode B3):
   - Verify runtime current time context first (session status), then answer with absolute dates.
4. Path compatibility:
   - Use runtime `<workspace-root>`; treat `~/.openclaw/workspace` as a common default, not a fixed assumption.
5. BOOT apply effectiveness:
   - After `/gov_apply <NN>`, record before/after indicators; if no measurable improvement is shown, mark outcome as `PARTIAL` and keep follow-up actions.

---

## Installation Options

### Option A (Recommended): Install Plugin Directly

1. Install:

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@0.1.1
```

2. Enable:

```text
openclaw plugins enable openclaw-workspace-governance
```

3. Verify:

```text
openclaw plugins list
openclaw skills list --eligible
```

### Option B: Install via ClawHub Installer

```text
clawhub inspect Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
clawhub install Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
```

After installer setup, follow its guidance to install and enable the plugin.

---

## First Deployment

After installation, run in OpenClaw chat:

```text
/gov_setup install
```

This command deploys governance prompt assets to: `<workspace-root>/prompts/governance/`.

If slash command is unavailable or name-collided, use:

```text
/skill gov_setup install
```

## `gov_setup` Modes (Important)

`gov_setup` is used for both first setup and later upgrades:

```text
/gov_setup install   # First-time deployment of prompts/governance assets
/gov_setup upgrade   # Upgrade existing assets (backup first, then update)
/gov_setup check     # Read-only check of source/target file status
```

If slash command is unavailable, use:

```text
/skill gov_setup install
/skill gov_setup upgrade
/skill gov_setup check
```

Recommended update flow (after plugin version upgrade):
1. `gov_setup upgrade`
2. `gov_migrate`
3. `gov_audit`

---

## Three Usage Scenarios

| Scenario | When to use | Recommended entry |
|---|---|---|
| A | Brand-new OpenClaw / brand-new workspace | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| B | Running OpenClaw, governance not yet adopted | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| C | Governance already installed, ongoing maintenance required | `/gov_migrate` + `/gov_audit` |

### Scenario A: Brand-New OpenClaw / Brand-New Workspace

1. Run `/gov_setup install`.
2. Run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`.
3. Run `/gov_audit` to validate baseline consistency.

### Scenario B: Running OpenClaw, First-Time Governance Adoption

1. Run `/gov_setup install`.
2. Run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`.
3. Run `/gov_audit`.
4. If the workspace is already initialized, run `/gov_migrate` first, then `/gov_audit`.

### Scenario C: Governance Already Installed (Daily Maintenance)

1. If plugin was just updated, run `/gov_setup upgrade` first.
2. Run `/gov_migrate`.
3. Run `/gov_audit`.
4. When BOOT provides numbered proposals, run `/gov_apply <NN>`, then run `/gov_audit` again.

---

## Command Reference

```text
/gov_setup install   # First-time deploy governance prompt assets
/gov_setup upgrade   # Upgrade governance prompt assets (backup first)
/gov_setup check     # Read-only check (no write)
/gov_migrate         # Apply governance upgrades
/gov_audit           # Run consistency checks
/gov_apply <NN>      # Apply BOOT numbered proposal
```

If slash command is unavailable or name-collided, use:

```text
/skill gov_setup install
/skill gov_setup upgrade
/skill gov_setup check
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
```

Naming note: this plugin keeps a single install/deploy entry: `gov_setup`.

---

## BOOT Upgrade Mechanism

When `boot-md` is enabled, the recommended flow is:

1. `BOOT.md` performs read-only checks at startup.
2. The system outputs numbered recommendations (for example `01`, `02`, `03`).
3. The user approves one item.
4. `/gov_apply <NN>` performs controlled application.
5. `/gov_migrate` and `/gov_audit` converge the workspace to a consistent state.
6. Compare pre/post indicators; if there is no measurable improvement, mark it `PARTIAL` and continue iteration.

---

## Repository Structure (GitHub Root)

```text
.
├─ openclaw.plugin.json
├─ package.json
├─ index.ts
├─ OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md
├─ WORKSPACE_GOVERNANCE_MIGRATION.md
├─ APPLY_UPGRADE_FROM_BOOT.md
├─ WORKSPACE_GOVERNANCE_README.md
├─ README.md
├─ README.en.md
├─ manual_prompt/
│  ├─ MIGRATION_prompt_for_RUNNING_OpenClaw.md
│  └─ POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md
├─ skills/
│  ├─ gov_setup/SKILL.md
│  ├─ gov_migrate/SKILL.md
│  ├─ gov_audit/SKILL.md
│  └─ gov_apply/SKILL.md
└─ clawhub/
   └─ openclaw-workspace-governance-installer/SKILL.md
```

---

## Deployment Mapping (OpenClaw Workspace)

`/gov_setup install` deploys:

1. Core prompt files -> `<workspace-root>/prompts/governance/`
2. `manual_prompt/` -> `<workspace-root>/prompts/governance/manual_prompt/`

---

## FAQ (Decision-Focused)

### Q1. Who should use this solution?
It is designed for individuals and teams operating OpenClaw workspaces long-term and requiring lower drift risk with higher operational consistency.

### Q2. Will adoption impact existing project content?
The design principle is non-destructive governance. The target is governance alignment, not overwriting existing `projects/` deliverables.

### Q3. How do I choose the correct startup scenario?
If governance has never been adopted in the workspace, use Scenario A or B. If governance is already installed, use Scenario C for daily operations.

### Q4. How can I reduce upgrade risk?
Run `/gov_audit` first for baseline visibility, then `/gov_migrate`, and run `/gov_audit` again to validate post-change consistency.

### Q5. What if `/gov_*` commands are unavailable?
Use `/skill gov_setup install`, `/skill gov_migrate`, `/skill gov_audit`, and `/skill gov_apply <NN>`.

### Q6. When should `/gov_apply <NN>` be used?
Only after BOOT has produced numbered proposals and the approval step is complete.

### Q7. How do I roll back to a previous stable version?
Reinstall a pinned plugin version, then run `/gov_setup install` and `/gov_audit` to restore and verify consistency.

### Q8. After upgrading plugin version, how do I apply changes to workspace?
Use this flow: `/gov_setup upgrade` -> `/gov_migrate` -> `/gov_audit`. The `upgrade` mode creates backup first, then updates governance prompts.

### Q9. Why must OpenClaw system questions be verified against official docs?
Because these are system-truth claims (commands, config, hooks, skills, plugins). v1.1 requires `docs.openclaw.ai` verification to prevent invalid instructions from entering runtime configuration.

### Q10. Why is `<workspace-root>` emphasized instead of a fixed path?
OpenClaw supports configurable workspaces. v1.1 uses runtime workspace semantics so both default and customized deployments remain compatible.

### Q11. Why can't I find `/gov_setup`?
Confirm you are sending a command-only message (first character must be `/`, no leading spaces, no `run` prefix). If slash routing still fails, continue with the manual prompt entrypoints under `manual_prompt/`.

---

## Official References

- Skills: https://docs.openclaw.ai/tools/skills
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Plugin: https://docs.openclaw.ai/plugins
- Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- CLI Plugins: https://docs.openclaw.ai/cli/plugins
- CLI Skills: https://docs.openclaw.ai/cli/skills
