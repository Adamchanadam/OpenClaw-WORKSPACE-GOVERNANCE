---
name: openclaw-workspace-governance-installer
description: Install OpenClaw Workspace Governance plugin and run first-time setup checks.
author: Adam Chan
user-invocable: true
metadata: {"openclaw":{"emoji":"🚀","homepage":"https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE","requires":{"bins":["openclaw"]}}}
---
# OpenClaw Workspace Governance Installer

## Purpose
Guide the operator through plugin installation, enablement, and first setup validation.

## Installation path
1. Install plugin package:
   - `openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest`
2. Enable plugin:
   - `openclaw plugins enable openclaw-workspace-governance`
3. Verify:
   - `openclaw plugins list`
   - `openclaw skills list --eligible`

## First-run setup
1. In OpenClaw chat, run:
   - `/gov_setup install`
   - Optional maintenance modes:
     - `/gov_setup upgrade` (upgrade existing prompts with backup)
     - `/gov_setup check` (read-only check)
2. Then select scenario:
   - New workspace: run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
   - Existing workspace: run `/gov_migrate` then `/gov_audit`

## Safety checks
- If command names are suffixed due collision, use:
  - `/skill gov_setup install`
  - `/skill gov_setup upgrade`
  - `/skill gov_setup check`
  - `/skill gov_migrate`
  - `/skill gov_audit`
