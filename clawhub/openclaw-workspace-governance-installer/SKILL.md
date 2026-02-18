---
name: openclaw-workspace-governance-installer
description: Turn OpenClaw into a safer, predictable workspace system with guided setup, upgrade, and audit.
author: Adam Chan
user-invocable: true
metadata: {"openclaw":{"emoji":"🚀","homepage":"https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE","requires":{"bins":["openclaw"]}}}
---
# OpenClaw Workspace Governance Installer

Make OpenClaw reliable from day one.
This installer gives new users a clear path to install governance, validate setup, and start using a repeatable workflow instead of ad-hoc edits.

## Why install this
1. Stop costly mistakes from skipped steps and guess-based changes.
2. Use one consistent flow for setup, upgrade, migration, and audit.
3. Keep workspace changes traceable and easier to review.
4. Get beginner-friendly commands without learning complex internals first.

## What you get
1. Single setup entrypoint: `gov_setup` with `install | upgrade | check`.
2. Daily maintenance commands: `gov_migrate` and `gov_audit`.
3. Controlled BOOT apply path: `gov_apply <NN>`.
4. Governance prompt assets deployed into your workspace.

## Quick start (about 3 minutes)
1. Install plugin package:
   - `openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest`
2. Enable plugin:
   - `openclaw plugins enable openclaw-workspace-governance`
3. Verify:
   - `openclaw plugins list`
   - `openclaw skills list --eligible`
4. In OpenClaw chat:
   - `/gov_setup install`
   - `/gov_audit`

## Recommended usage path
1. New workspace:
   - `/gov_setup install`
   - Run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
   - `/gov_audit`
2. Running workspace:
   - `/gov_setup upgrade` (or `/gov_setup check`)
   - `/gov_migrate`
   - `/gov_audit`

## Good fit for
1. OpenClaw users who want fewer regressions and clearer operations.
2. Teams that need repeatable governance and easy handover.
3. Users moving from manual prompt-only flow to skill-driven maintenance.

## Safety checks
- If command names are suffixed due collision, use:
  - `/skill gov_setup install`
  - `/skill gov_setup upgrade`
  - `/skill gov_setup check`
  - `/skill gov_migrate`
  - `/skill gov_audit`
