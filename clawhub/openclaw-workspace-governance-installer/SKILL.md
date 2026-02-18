---
name: openclaw-workspace-governance-installer
description: Turn OpenClaw into a safer, predictable workspace system with guided setup, upgrade, and audit.
author: Adam Chan
user-invocable: true
metadata: {"openclaw":{"emoji":"🚀","homepage":"https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE","requires":{"bins":["openclaw"]}}}
---
# OpenClaw Workspace Governance Installer

This installer is for users who want OpenClaw to stay reliable after day one, not only at first setup.

## Why users install this
Many users face the same pattern:
1. The agent starts changing files too quickly.
2. The same mistakes return in new sessions.
3. Upgrades are hard to verify and hard to explain to teammates.

This installer helps you move to a safer, repeatable workflow.

## What value you get
1. A fixed governance lifecycle: `PLAN -> READ -> CHANGE -> QC -> PERSIST`.
2. One setup entrypoint: `gov_setup` (`install | upgrade | check`).
3. Ongoing maintenance commands: `gov_migrate`, `gov_audit`, `gov_apply <NN>`.
4. Traceable evidence via run reports and index updates.

## 3-minute start
1. Install:
   - `openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest`
2. Enable:
   - `openclaw plugins enable openclaw-workspace-governance`
3. Verify:
   - `openclaw plugins list`
   - `openclaw skills list --eligible`
4. In OpenClaw chat:
   - `/gov_setup install`
   - `/gov_audit`

## If slash commands are unstable
Use skill fallback:
1. `/skill gov_setup install`
2. `/skill gov_setup check`
3. `/skill gov_migrate`
4. `/skill gov_audit`

You can also ask in natural language:  
`Please use gov_setup in check mode (read-only) and return workspace root + install status + upgrade decision.`

## Learn the full story
For user value, official baseline differences, and scenario guidance:
1. `README.md`
2. `README.en.md`
3. `WORKSPACE_GOVERNANCE_README.md`
4. `VALUE_POSITIONING_AND_FACTORY_GAP.md`
