# OpenClaw WORKSPACE_GOVERNANCE

> A beginner-friendly governance kit for OpenClaw workspaces.  
> Goal: clear first-time setup, simple day-to-day operations, and traceable changes.

[中文版本](./README.md)

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-0ea5e9)](https://docs.openclaw.ai/) [![Mode](https://img.shields.io/badge/Workflow-Bootstrap%20%2F%20Migrate%20%2F%20Apply-22c55e)](#which-scenario-are-you-in) [![Audience](https://img.shields.io/badge/For-Beginners-f59e0b)](#60-second-quick-start)

---

## Remember Just 2 Things

1. First-time setup: run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` once.
2. After setup, daily maintenance should use 3 commands:
   - `/gov_migrate`
   - `/gov_audit`
   - `/gov_apply <NN>`

---

## 60-Second Quick Start

1. Put this folder at `<workspace-root>/prompts/governance/`
2. In OpenClaw chat, run: `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
3. After it finishes, run: `/gov_audit`

If slash command is unavailable, use: `/skill gov_audit`

---

## Which Scenario Are You In?

| Your situation | What to do | Entry point |
|---|---|---|
| A. Brand-new OpenClaw / brand-new workspace | Build governance foundation | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| B. Running OpenClaw, not yet using this kit | First-time adoption, keep existing work safe | `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` |
| C. Already using this kit | Ongoing upgrades and maintenance | `/gov_migrate` + `/gov_audit` |

---

## Command Cheatsheet

```text
/gov_migrate     # Upgrade governance baseline
/gov_audit       # Validate health and consistency
/gov_apply <NN>  # Apply BOOT recommendation item by number
```

Recommended: send slash commands as standalone messages (one line `/...`).

If slash commands fail or are name-collided:

```text
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
```

---

## What Is Inside This Folder?

```text
prompts/governance/
├─ OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md
├─ WORKSPACE_GOVERNANCE_MIGRATION.md
├─ APPLY_UPGRADE_FROM_BOOT.md
├─ README.md
├─ README.en.md
└─ manual_prompt/
   ├─ MIGRATION_prompt_for_RUNNING_OpenClaw.md
   └─ POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md
```

Usage:
- `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`: first installation / first adoption
- `WORKSPACE_GOVERNANCE_MIGRATION.md`: governance upgrades
- `APPLY_UPGRADE_FROM_BOOT.md`: controlled apply for BOOT numbered suggestions
- `manual_prompt/*`: fallback entry when slash commands are unavailable

---

## Scenario A: Brand-New OpenClaw / Brand-New Workspace

### Step 1
Place files at:
- `<workspace-root>/prompts/governance/`

### Step 2
In OpenClaw chat, run:
- `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`

### Step 3
After completion, confirm these exist:
- `_control/`
- `_runs/`
- `skills/gov_migrate/`
- `skills/gov_audit/`
- `skills/gov_apply/`
- `BOOT.md` (optional but recommended)

### Step 4
Run health check:
- `/gov_audit`

---

## Scenario B: Running OpenClaw, Not Yet Using This Kit

### Step 1
Place files at:
- `<workspace-root>/prompts/governance/`

### Step 2
Run:
- `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`

### Step 3
Then validate:
- `/gov_audit`

### Step 4 (if system says workspace is already initialized)
- Run `/gov_migrate`
- Then run `/gov_audit`

---

## Scenario C: Already Using WORKSPACE_GOVERNANCE (Daily Maintenance)

### Step 1
Upgrade baseline:
- `/gov_migrate`

### Step 2
Validate:
- `/gov_audit`

### Step 3 (when BOOT provides numbered recommendations)
Example: BOOT shows 01/02/03
- `/gov_apply 01`
- After apply, run `/gov_audit` again

---

## BOOT Learning Loop (Core Feature)

When `boot-md` is enabled, the typical flow is:
1. On startup, `BOOT.md` performs read-only checks
2. It outputs numbered recommendations (for example 01)
3. You approve one item
4. You apply it with `/gov_apply <NN>`
5. The workflow converges with migration/audit

Key points:
- Startup stage is read-only recommendation
- Real writes happen only after explicit approval

---

## If Slash Commands Do Not Work

Try:
- `/skill gov_migrate`
- `/skill gov_audit`
- `/skill gov_apply 01`

If still unavailable, use manual fallback prompts:
- `prompts/governance/manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md`
- `prompts/governance/manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md`

---

## FAQ

### Q1. If I only copy this folder, does everything auto-run?
No. You still need to execute the prompt or command in OpenClaw chat.

### Q2. Do I need to run full prompts every time?
No. Full bootstrap is mainly for first-time setup. After that, use skills commands for operations.

### Q3. Will this delete my existing project data?
This workflow is designed to be non-destructive, with backups and traceability.

### Q4. When should I use `/gov_apply <NN>`?
When BOOT provides a numbered recommendation and you want to approve and apply it.

---

## GitHub Packaging Recommendation

Minimum recommended publish set:
- Entire `prompts/governance/` folder
- This README (and Chinese README)

This allows new users to follow scenario-based onboarding directly.

---

## Official References

- Skills: https://docs.openclaw.ai/tools/skills
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Hooks: https://docs.openclaw.ai/automation/hooks
- Hooks CLI: https://docs.openclaw.ai/cli/hooks
- Config Reference: https://docs.openclaw.ai/gateway/configuration-reference
- Memory Concepts: https://docs.openclaw.ai/concepts/memory