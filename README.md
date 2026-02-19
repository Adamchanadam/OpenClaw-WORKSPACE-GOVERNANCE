# OpenClaw WORKSPACE_GOVERNANCE

> Turn OpenClaw's persona-and-memory-first factory setup into a controllable, verifiable, and traceable workspace governance system.  
> Keep your flexibility, but put high-risk changes behind a fixed workflow to reduce repeated rework and manual cleanup.

[繁體中文版](./README.zh-HK.md)

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

For most users, the real problem is not missing features. The problem is losing control as complexity grows:

1. The agent starts editing too early before planning and evidence checks.
2. The same failure patterns reappear in new sessions.
3. Upgrade and fix traces are fragmented across files, making review and rollback difficult.

This solution does not try to add more commands. It turns risky operations into a manageable workflow:

1. Enforce `PLAN -> READ -> CHANGE -> QC -> PERSIST` so verification happens before edits.
2. Require fact checks for system/date claims (official docs, release/version context, runtime clock).
3. Keep every change traceable through run reports and index evidence.
4. Use `BOOT read-only proposals -> human approval -> controlled apply` to reduce startup write risk.

### Positioning Deep Dive (Recommended)

If you want to quickly understand why this is needed on top of OpenClaw factory defaults, read these first:

1. [VALUE_POSITIONING_AND_FACTORY_GAP.en.md](./VALUE_POSITIONING_AND_FACTORY_GAP.en.md): purpose, user value, and boundaries against official baseline behavior.
2. [WORKSPACE_GOVERNANCE_README.en.md](./WORKSPACE_GOVERNANCE_README.en.md): full governance playbook (3 scenarios, core workflow, risk controls).

## Visual Guide

Overview infographic:

![OpenClaw WORKSPACE_GOVERNANCE Infographic](./ref_doc/infograp_eng.png)

Setup/upgrade reference screen:

![gov_setup install screen](./ref_doc/screen_gov_setup_inst.png)

Step-by-step visual pages:

![Page 1](./ref_doc/page_1.jpg)
![Page 2](./ref_doc/page_2.jpg)
![Page 3](./ref_doc/page_3.jpg)
![Page 4](./ref_doc/page_4.jpg)
![Page 5](./ref_doc/page_5.jpg)
![Page 6](./ref_doc/page_6.jpg)

---

## Core Workflow (Most Important)

The core of OpenClaw WORKSPACE_GOVERNANCE is not just more commands. It is a fixed execution order.

Any task that writes, updates, or saves content must pass these 5 gates:

1. `PLAN`: define objective, risks, and exact files to read/change.
2. `READ`: read governance evidence and target files before editing.
3. `CHANGE`: apply minimal authorized changes only.
4. `QC`: run the fixed checklist item by item (12/12).
5. `PERSIST`: keep run report and index traceability evidence.

Fail-Closed principle:

1. If required files/evidence are missing or paths are ambiguous, stop and do not guess.
2. If any QC item fails, do not claim completion.

Mode routing (to avoid confusion):

1. Mode A: conversational only (no writes, no system-truth claims).
2. Mode B: evidence-based answers (verify first, no writes).
3. Mode C: any write/update/save action (must run full 5-gate lifecycle).

---

## Core Capabilities

1. First adoption: `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
2. Daily operations: `/gov_migrate`, `/gov_audit`
3. BOOT upgrades: `/gov_apply <NN>`
4. Asset deployment and updates: `/gov_setup install|upgrade|check`
5. Platform config safety gate: `/gov_platform_change`

---

## Reliability Contract (Important)

To reduce risks like incorrect commands, date/time mistakes, and path drift, this solution enforces these hard rules:

1. Three runtime modes:
   - Mode A: conversational only (no writes, no system-truth claims)
   - Mode B: evidence-based answers (no writes)
   - Mode C: any write/update/save action (must run the full governance lifecycle)
2. OpenClaw system topics (Mode B2):
   - Verify local skills and official docs (`https://docs.openclaw.ai`) before answering.
   - For latest/version-sensitive claims, also verify official releases (`https://github.com/openclaw/openclaw/releases`).
   - If verification cannot be completed, explicitly report uncertainty and the next check; do not infer.
3. Date/time topics (Mode B3):
   - Verify runtime current time context first (session status), then answer with absolute dates.
4. Path compatibility:
   - Use runtime `<workspace-root>`; treat `~/.openclaw/workspace` as a common default, not a fixed assumption.
5. Platform control-plane changes:
   - Any `~/.openclaw/openclaw.json` change is Mode C and must run full gates.
   - Use `gov_platform_change` as the execution entrypoint (with backup/validate/rollback evidence).
5. BOOT apply effectiveness:
   - After `/gov_apply <NN>`, record before/after indicators; if no measurable improvement is shown, mark outcome as `PARTIAL` and keep follow-up actions.

---

## Installation Options

### Option A (Recommended): Install Plugin Directly

1. Install:

```text
openclaw plugins install @adamchanadam/openclaw-workspace-governance@latest
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

Note: `plugins install` only installs the plugin under extensions. Governance prompt assets are deployed to `<workspace-root>/prompts/governance/` only after `gov_setup install`.

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

## Beginner UAT: 5-Minute Verification (No Slash)

If your TUI slash routing is unstable, use this no-slash validation flow.

### Step 1: Confirm plugin and skills are loaded (host shell)

```text
openclaw plugins info openclaw-workspace-governance
openclaw skills list --eligible
openclaw skills info gov_setup
openclaw skills info gov_migrate
openclaw skills info gov_audit
openclaw skills info gov_apply
openclaw skills info gov_platform_change
```

### Step 2: Send a natural-language request in OpenClaw TUI (not slash)

```text
Please use the gov_setup skill in check mode (read-only; do not modify any files).
Please return:
1) detected workspace root
2) whether governance prompts are fully installed
3) whether upgrade is needed (if yes, explain why)
```

### Step 3: Pass criteria

`gov_setup check` can return 3 states:

1. `NOT_INSTALLED`: common on a fresh machine before `gov_setup install`.
2. `PARTIAL`: target path exists but files are missing or out of sync.
3. `READY`: all required files are installed.

Recommended next action:

1. If `NOT_INSTALLED`: run `gov_setup install`.
2. If `PARTIAL`: run `gov_setup upgrade`.
3. If `READY`: continue with `gov_migrate` + `gov_audit`.

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
5. If the task changes `~/.openclaw/openclaw.json`, run `/gov_platform_change` (or `/skill gov_platform_change`) instead of direct config patching.

---

## Command Reference

```text
/gov_setup install   # First-time deploy governance prompt assets
/gov_setup upgrade   # Upgrade governance prompt assets (backup first)
/gov_setup check     # Read-only check (no write)
/gov_migrate         # Apply governance upgrades
/gov_audit           # Run consistency checks
/gov_apply <NN>      # Apply BOOT numbered proposal
/gov_platform_change # Controlled platform config change (backup/validate/rollback)
```

If slash command is unavailable or name-collided, use:

```text
/skill gov_setup install
/skill gov_setup upgrade
/skill gov_setup check
/skill gov_migrate
/skill gov_audit
/skill gov_apply 01
/skill gov_platform_change
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
├─ VALUE_POSITIONING_AND_FACTORY_GAP.md
├─ WORKSPACE_GOVERNANCE_README.en.md
├─ VALUE_POSITIONING_AND_FACTORY_GAP.en.md
├─ README.md
├─ README.zh-HK.md
├─ README.en.md
├─ ref_doc/
│  ├─ infograp_eng.png
│  ├─ screen_gov_setup_inst.png
│  └─ page_1.jpg ... page_6.jpg
├─ manual_prompt/
│  ├─ MIGRATION_prompt_for_RUNNING_OpenClaw.md
│  └─ POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md
├─ skills/
│  ├─ gov_setup/SKILL.md
│  ├─ gov_migrate/SKILL.md
│  ├─ gov_audit/SKILL.md
│  ├─ gov_apply/SKILL.md
│  └─ gov_platform_change/SKILL.md
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
Because these are system-truth claims (commands, config, hooks, skills, plugins). Verify against `docs.openclaw.ai` first; for latest/version-sensitive claims, also verify official releases, to prevent outdated or invalid instructions from entering runtime configuration.

### Q10. Why is `<workspace-root>` emphasized instead of a fixed path?
OpenClaw supports configurable workspaces. The governance flow uses runtime workspace semantics so both default and customized deployments remain compatible.

### Q11. Why can't I find `/gov_setup`?
Confirm you are sending a command-only message (first character must be `/`, no leading spaces, no `run` prefix). If slash routing still fails, continue with the manual prompt entrypoints under `manual_prompt/`.

### Q12. Why is there no automatic next-step prompt right after `openclaw plugins install ...`?
OpenClaw plugin install downloads and extracts the package into extensions, then waits for gateway reload. It does not auto-run `/gov_setup install` for your workspace.  
Fastest path after install:
1. `/gov_setup check` (detect current status)
2. If status is `NOT_INSTALLED`: `/gov_setup install`
3. Then: `/gov_migrate` -> `/gov_audit`

### Q13. I need to edit `~/.openclaw/openclaw.json`. Should I use direct patch tools?
No. Treat it as a platform Mode C governance change.  
Use `/gov_platform_change` (or `/skill gov_platform_change`) so backup, validation, and rollback evidence are recorded.

---

## Official References

- Skills: https://docs.openclaw.ai/tools/skills
- ClawHub: https://docs.openclaw.ai/tools/clawhub
- Slash Commands: https://docs.openclaw.ai/tools/slash-commands
- Plugin: https://docs.openclaw.ai/plugins
- Plugin Manifest: https://docs.openclaw.ai/plugins/manifest
- CLI Plugins: https://docs.openclaw.ai/cli/plugins
- CLI Skills: https://docs.openclaw.ai/cli/skills
- OpenClaw Releases: https://github.com/openclaw/openclaw/releases
