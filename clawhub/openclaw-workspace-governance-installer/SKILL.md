---
name: openclaw-workspace-governance-installer
description: Install OpenClaw WORKSPACE_GOVERNANCE in minutes. Get guided setup, upgrade checks, migration, and audit for long-running workspaces.
author: Adam Chan
user-invocable: true
metadata: {"openclaw":{"emoji":"🚀","homepage":"https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE","requires":{"bins":["openclaw"]}}}
---
# OpenClaw Workspace Governance Installer

Ship safer OpenClaw operations from day one.
This installer gives you a repeatable governance path instead of ad-hoc prompt edits.

## Why this is popular
1. Prevents "edit first, verify later" mistakes.
2. Gives one predictable setup/upgrade/audit flow.
3. Makes changes traceable for review and handover.
4. Works for both beginners and production workspaces.

## 60-second quick start
First-time install:
```bash
# 1) Install plugin
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
openclaw gateway restart
```

In OpenClaw chat:
```text
/gov_setup quick
```
If `/gov_setup quick` says allowlist is not ready:
```text
/gov_openclaw_json
/gov_setup quick
```

Already installed (upgrade path):
```bash
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart
```

Then in OpenClaw chat:
```text
/gov_setup quick
```
If allowlist is not ready:
```text
/gov_openclaw_json
/gov_setup quick
```

## What you get
1. `gov_setup quick|check|install|upgrade` — deploy, upgrade, or verify governance in one step.
2. `gov_migrate` — align workspace behavior to the latest governance rules after install or upgrade.
3. `gov_audit` — verify 12 integrity checks and catch drift before declaring completion.
4. `gov_uninstall quick|check|uninstall` — clean removal with backup and restore evidence.
5. `gov_openclaw_json` — safely edit platform config (`openclaw.json`) with backup, validation, and rollback.
6. `gov_brain_audit` — review and harden Brain Docs quality with preview-first approval and rollback.
7. `gov_boot_audit` — scan for recurring issues and generate upgrade proposals (read-only diagnostic).
8. `gov_apply <NN>` — apply a single BOOT upgrade proposal with explicit human approval (**Experimental**, controlled UAT only).
9. `gov_help` — see all commands and recommended entry points at a glance.

## Feature maturity (important)
1. GA flow for production rollout: `gov_setup -> gov_migrate -> gov_audit`, plus `gov_uninstall`, `gov_openclaw_json`, `gov_brain_audit`, `gov_boot_audit`.
2. Experimental flow: `gov_apply <NN>` remains controlled-UAT scope.
3. All `/gov_*` command outputs use branded format: `🐾` header, emoji status indicators (✅/⚠️/❌), structured bullets, and `👉` next-step guidance.

## When to use which command
1. Daily default: `gov_setup quick` (one-click chain)
2. After install or upgrade: `gov_migrate` then `gov_audit`
3. Edit platform config safely: `gov_openclaw_json`
4. Review Brain Docs: `gov_brain_audit`
5. Recurring issue scan: `gov_boot_audit`
6. Clean removal: `gov_uninstall quick`

## Who this is for
1. New OpenClaw users who want a guided install path.
2. Teams operating long-running workspaces.
3. Users who need auditable, low-drift maintenance.

## Learn more (GitHub docs)
1. Main docs: https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE
2. English README: https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/blob/main/README.md
3. 繁體中文版: https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/blob/main/README.zh-HK.md
4. Governance handbook (EN): https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/blob/main/WORKSPACE_GOVERNANCE_README.en.md
5. Governance handbook (繁中): https://github.com/Adamchanadam/OpenClaw-WORKSPACE-GOVERNANCE/blob/main/WORKSPACE_GOVERNANCE_README.md
