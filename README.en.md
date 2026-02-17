# OpenClaw WORKSPACE_GOVERNANCE

> A workspace governance solution for OpenClaw users.  
> Purpose: manage Bootstrap, Migration, Audit, and BOOT apply with a repeatable, verifiable, and traceable workflow.

[中文版本](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Distribution](https://img.shields.io/badge/Distribution-Plugin%20%2B%20ClawHub-22c55e)](#installation-options) [![Audience](https://img.shields.io/badge/Audience-Beginners-f59e0b)](#first-deployment)

---

## Project Positioning

This project provides a complete governance workflow for OpenClaw workspaces:

1. Bootstrap for first-time governance baseline.
2. Migration for running workspaces.
3. Audit for fixed-checklist consistency validation.
4. Controlled BOOT item apply after explicit approval.

The distribution model is now `Plugin + ClawHub Installer`:

1. Plugin: authoritative runtime package with `gov_*` skills.
2. ClawHub Installer: discovery and guided installation entry.

---

## Installation Options

### Option A (Recommended): Install Plugin Directly

1. Install plugin:

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@0.1.0
```

2. Enable plugin:

```text
openclaw plugins enable openclaw-workspace-governance
```

3. Verify load status:

```text
openclaw plugins list
openclaw skills list --eligible
```

### Option B: Install via ClawHub Installer

If you install from GitHub path, run:

```text
clawhub inspect Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
clawhub install Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/clawhub/openclaw-workspace-governance-installer
```

After installer setup, follow its instructions to install and enable the plugin.

---

## First Deployment

After plugin/installer setup, run in OpenClaw chat:

```text
/gov_setup install
```

`/gov_setup` deploys governance prompt assets into the current workspace at `prompts/governance/`.

If slash command is unavailable or name-collided, use:

```text
/skill gov_setup install
```

---

## Three Usage Scenarios

| Scenario | When to use | Recommended entry |
|---|---|---|
| A | Brand-new OpenClaw / brand-new workspace | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| B | Running OpenClaw, governance not yet installed | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| C | Governance already installed, ongoing maintenance required | `/gov_migrate` + `/gov_audit` |

### Scenario A: Brand-New OpenClaw / Brand-New Workspace

1. Complete installation and deployment (`/gov_setup install`).
2. Run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`.
3. Run `/gov_audit` to confirm baseline integrity.

### Scenario B: Running OpenClaw, First-Time Governance Adoption

1. Complete installation and deployment (`/gov_setup install`).
2. Run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`.
3. Run `/gov_audit`.
4. If workspace is already initialized, run `/gov_migrate` first, then `/gov_audit`.

### Scenario C: Governance Already Installed (Daily Maintenance)

1. Run `/gov_migrate`.
2. Run `/gov_audit`.
3. When BOOT provides numbered proposals, run `/gov_apply <NN>`, then run `/gov_audit` again.

---

## Command Reference

```text
/gov_setup install   # Deploy or upgrade governance prompt assets
/gov_migrate         # Apply governance upgrades
/gov_audit           # Run consistency checks
/gov_apply <NN>      # Apply BOOT numbered proposal
```

If slash command is unavailable or name-collided, use:

```text
/skill gov_setup install
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
```

---

## BOOT Upgrade Mechanism

When `boot-md` is enabled, the recommended flow is:

1. `BOOT.md` performs read-only checks at startup.
2. It outputs numbered recommendations (for example `01`, `02`, `03`).
3. The user approves one specific item.
4. `/gov_apply <NN>` performs controlled application.
5. `/gov_migrate` and `/gov_audit` converge the workspace to a consistent state.

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

1. Core governance prompt files -> `<workspace-root>/prompts/governance/`
2. `manual_prompt/` files -> `<workspace-root>/prompts/governance/manual_prompt/`

---

## FAQ

### Q1. Can users still install by manual copy?
Yes. Manual copy remains supported, but Plugin + `/gov_setup` is recommended to reduce deployment drift.

### Q2. Is Bootstrap required every time?
No. Bootstrap is for first-time adoption. Daily operations should use `gov_*` commands.

### Q3. When should `/gov_apply <NN>` be used?
When BOOT provides numbered proposals and approval is completed.

### Q4. What if command names collide?
Use direct `/skill <name>` invocation.

---

## Official References

- Skills: https://docs.openclaw.ai/tools/skills
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Plugin: https://docs.openclaw.ai/plugins
- Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- CLI Plugins: https://docs.openclaw.ai/cli/plugins
- CLI Skills: https://docs.openclaw.ai/cli/skills
