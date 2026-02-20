TASK: MIGRATION_WORKSPACE_GOVERNANCE (REENTRANT, PATCH-ONLY, FAIL-CLOSED, REV6)

GOAL
Apply the latest governance hardening to an ALREADY-RUNNING workspace without destructive overwrites:
- Patch core governance invariants via AUTOGEN blocks (deterministic, one-match).
- Preserve LOG documents and existing workspace-specific content.
- Ensure the learning loop is enforced via `_control/ACTIVE_GUARDS.md` + `_control/LESSONS.md`.
- Ensure `BOOT.md` exists for startup read-only audit (boot-md hook).
- Ensure `prompts/governance/APPLY_UPGRADE_FROM_BOOT.md` exists (guided runner for BOOT upgrade menu approvals).
- Ensure governance command entrypoints exist as user-invocable skills:
  - `gov_migrate` / `gov_audit` / `gov_apply <NN>` / `gov_openclaw_json` / `gov_brain_audit` (backed by `skills/gov_migrate/`, `skills/gov_audit/`, `skills/gov_apply/`, `skills/gov_openclaw_json/`, `skills/gov_brain_audit/`).
  - Slash commands should be invoked as standalone command messages.
  - If slash command is unavailable or name-collided, use `/skill <name> [input]` fallback.

RUNTIME MODES (Hard)
- Mode A (Conversation): casual or stylistic chat; no persistence, no system claims.
- Mode B (Verified Answer): no writes, but factual answer required.
  - Mode B1 (General facts): verify evidence before answering.
  - Mode B2 (OpenClaw system topics): MUST read relevant local skills/docs AND verify using official docs at `https://docs.openclaw.ai` before answering.
    - If the claim is latest/version-sensitive, MUST also verify official releases at `https://github.com/openclaw/openclaw/releases`.
  - Mode B3 (Date/time topics): MUST verify current time context first (use runtime session status), then answer with explicit absolute date when relevant.
  - Brain Docs read-only checks: when answering about `USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, or `memory/*.md`, MUST read the exact target files first and cite them in run-report evidence.
- Mode C (Governance change): any write/update/save/persist operation; MUST run PLAN → READ → CHANGE → QC → PERSIST.
  - Any coding/development task that creates or modifies workspace files is Mode C, even when requested in natural language without `/gov_*` commands.
  - Any create/update to Brain Docs (`USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/*.md`) is Mode C and must include explicit read evidence before write.
  - Platform control-plane changes (for example `~/.openclaw/openclaw.json`) MUST be routed through `gov_openclaw_json` (or `/skill gov_openclaw_json`) as the execution entrypoint.
  - If it is unclear whether writes will occur, classify as Mode C (Fail-Closed).

PATH COMPATIBILITY CONTRACT (Hard)
- Treat workspace root as runtime-resolved `<workspace-root>`.
- Do NOT hardcode home-based paths such as `~/.openclaw/workspace/...` in logic or evidence claims.
- Official defaults are allowed in documentation examples only, with explicit note that deployments may override them.

NON-GOALS (hard)
- Do NOT re-run the one-shot bootstrap procedure.
- Do NOT overwrite `README.md` if it exists.
- Do NOT overwrite user-owned content under `projects/`, `skills/`, or existing SSOT docs under `docs/` other than explicitly listed targets.

CANONICAL SOURCE (hard)
- Canonical source file (must exist):
  - `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`
- Canonical mapping (deterministic extraction; no paraphrase):
  - `AGENTS_CORE_v1` canonical content:
    - From canonical source payload `<<BEGIN FILE: AGENTS.md>> ... <<END FILE>>`
    - Extract starting at heading `## Non-negotiable rules` through end of that file payload.
  - `GOV_CORE_v1` canonical content:
    - From canonical source payload `<<BEGIN FILE: _control/GOVERNANCE_BOOTSTRAP.md>> ... <<END FILE>>`
    - Extract starting at heading `## 0) Prime Directive (Fail-Closed)` through end of that file payload.
  - `REGRESSION_12_v1` canonical content:
    - From canonical source payload `<<BEGIN FILE: _control/REGRESSION_CHECK.md>> ... <<END FILE>>`
    - Extract starting at line `# Regression Checklist` through end of that file payload.
  - Canonical payload (for any patch target that says "use canonical payload"):
    - From canonical source file `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`,
      locate the exact file payload block `<<BEGIN FILE: <path>>> ... <<END FILE>>` that matches the target path.
    - Extract the full content between `<<BEGIN FILE: ...>>` and `<<END FILE>>` without paraphrase.
- Normalization for equality checks (hard):
  - Treat line endings as LF.
  - Trim trailing whitespace.
  - Ensure exactly one terminal newline.

AUTHORIZED ACTIONS (explicit permission granted)
A) Workspace-local backups (Fail-Closed):
   - Create `archive/_migration_backup_<ts>/...` and store exact before-copies of every file you will modify.

B) Patch targets (ONLY these paths are allowed to be modified by this migration):
   - `AGENTS.md` (replace AUTOGEN block `AGENTS_CORE_v1` only; if missing, insert once)
   - `_control/GOVERNANCE_BOOTSTRAP.md` (replace AUTOGEN block `GOV_CORE_v1` only; if missing, insert once)
   - `_control/REGRESSION_CHECK.md` (replace AUTOGEN block `REGRESSION_12_v1` only; if missing, insert once)
   - `_control/WORKSPACE_INDEX.md` (append-only minimal links; do NOT delete existing links)
   - `_control/PRESETS.md` (overwrite with canonical payload only if it matches an older known payload; otherwise PATCH-only)
   - `_control/RULES.md` (overwrite pointer-only payload)
   - `_control/ACTIVE_GUARDS.md` (create if missing; if exists, ensure header/preamble exists while preserving existing log content)
   - `BOOT.md` (create if missing; overwrite only if it is clearly not the startup audit file)
   - `prompts/governance/APPLY_UPGRADE_FROM_BOOT.md` (create if missing; overwrite only if it matches an older known payload; otherwise STOP)
   - `skills/gov_migrate/SKILL.md` (create if missing; if exists and differs from canonical, STOP and report conflict)
   - `skills/gov_audit/SKILL.md` (create if missing; if exists and differs from canonical, STOP and report conflict)
   - `skills/gov_apply/SKILL.md` (create if missing; if exists and differs from canonical, STOP and report conflict)
   - `skills/gov_openclaw_json/SKILL.md` (create if missing; if exists and differs from canonical, STOP and report conflict)
   - `skills/gov_brain_audit/SKILL.md` (create if missing; if exists and differs from canonical, STOP and report conflict)

C) Any other file/folder:
   - DO NOT overwrite/move/delete. Non-destructive.

HARD ORDER (NO SKIP)
1) PLAN GATE
   - Declare `<ts>` in sortable format: YYYYMMDD_HHMMSS.
   - List every read/write/edit/backup action with exact paths.

2) PROBE GATE (read-only)
   - Verify this is an active workspace: `_control/` exists and `_control/GOVERNANCE_BOOTSTRAP.md` exists.
     If not, STOP and output Blocked Report: "Workspace not initialized; run Bootstrap task instead."
   - Verify canonical source exists: `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md`.
     If not, STOP and output Blocked Report: "Canonical source missing; cannot perform deterministic patch."
   - Detect required capabilities (read/write/edit/move/copy/exec).
   - If any required capability is missing, STOP and output Blocked Report with exact missing capability and which step cannot proceed.

3) READ GATE (mandatory)
   - Read (and later list as evidence):
     - `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` (canonical source)
     - `AGENTS.md`
     - `_control/GOVERNANCE_BOOTSTRAP.md`
     - `_control/PRESETS.md`
     - `_control/WORKSPACE_INDEX.md`
     - `_control/REGRESSION_CHECK.md`
     - `_control/ACTIVE_GUARDS.md` (if present)
     - `_control/LESSONS.md` (if present)
     - `prompts/governance/APPLY_UPGRADE_FROM_BOOT.md` (if present)
     - `skills/gov_migrate/SKILL.md` (if present)
     - `skills/gov_audit/SKILL.md` (if present)
     - `skills/gov_apply/SKILL.md` (if present)
     - `skills/gov_openclaw_json/SKILL.md` (if present)
     - `skills/gov_brain_audit/SKILL.md` (if present)
    - Relevant Brain Docs when the task implies persistence/user-profile/timezone or directly targets Brain Docs: `USER.md`, `IDENTITY.md`, `TOOLS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `memory/YYYY-MM-DD.md` (if present)
      - If target files include any Brain Docs path, read those exact files before change and record exact paths under `FILES_READ`.
   - If task content includes OpenClaw system topics (commands/config/plugins/skills/hooks/path defaults):
     - Read relevant local skill docs first (`skills/*/SKILL.md` that map to the operation).
     - Verify claims against official docs at `https://docs.openclaw.ai` and record source URLs in the run report.
     - For latest/version-sensitive claims, also verify official releases at `https://github.com/openclaw/openclaw/releases` and record source URLs in the run report.
   - If task content includes date/time statements (e.g., today/current year/current month):
     - Verify runtime current time context first (session status).
     - Record the observed absolute date/time in the run report before making conclusions.

4) CHANGE GATE (patch-only)
   4.1 Create backup tree:
       `archive/_migration_backup_<ts>/` (and subfolders mirroring targets)
   4.2 For each patch target you will modify, copy exact BEFORE into backup tree.
   4.3 Apply deterministic patches:
       - `AGENTS.md`: ensure AUTOGEN block `AGENTS_CORE_v1` exists exactly once; replace its content with canonical content extracted per "CANONICAL SOURCE (hard)" mapping rules.
       - `_control/GOVERNANCE_BOOTSTRAP.md`: ensure AUTOGEN block `GOV_CORE_v1` exists exactly once; replace its content with canonical content extracted per "CANONICAL SOURCE (hard)" mapping rules.
       - `_control/REGRESSION_CHECK.md`: ensure AUTOGEN block `REGRESSION_12_v1` exists exactly once; replace its content with canonical content extracted per "CANONICAL SOURCE (hard)" mapping rules.
       - `_control/WORKSPACE_INDEX.md`: ensure it contains links to:
         `./ACTIVE_GUARDS.md`, `./LESSONS.md`, `../BOOT.md`, `../prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md`, `../prompts/governance/APPLY_UPGRADE_FROM_BOOT.md`,
         `../skills/gov_migrate/`, `../skills/gov_audit/`, `../skills/gov_apply/`, `../skills/gov_openclaw_json/`, `../skills/gov_brain_audit/`
         Add missing links only; do not remove existing content.
       - `_control/PRESETS.md`:
         - If it matches an older known payload: backup and overwrite with canonical payload.
         - Otherwise: PATCH-only (leave unchanged; do not overwrite).
       - `_control/RULES.md`: set pointer-only content (no duplicated rules).
       - `_control/ACTIVE_GUARDS.md`:
         - If missing: create it using canonical payload.
         - If present: ensure the canonical header/preamble exists at top; preserve the existing log entries below.
       - `prompts/governance/APPLY_UPGRADE_FROM_BOOT.md`:
         - If missing: create it using canonical payload.
         - If present: overwrite only if it matches an older known payload; otherwise STOP and output a conflict report (do not overwrite).
      - `skills/gov_migrate/SKILL.md`, `skills/gov_audit/SKILL.md`, `skills/gov_apply/SKILL.md`, `skills/gov_openclaw_json/SKILL.md`, `skills/gov_brain_audit/SKILL.md`:
         - If missing: create each using canonical payload (create directories as needed).
         - If present: compare against canonical payload; if any differs, STOP and output a conflict report (do not overwrite).
       - `BOOT.md`:
         - If missing: create it using canonical payload.
         - If present but clearly unrelated: backup and overwrite with canonical payload.
   4.4 Update `_control/WORKSPACE_INDEX.md` to include the migration run report link (after the run report is written).

5) QC GATE (fixed denominator)
   - Execute `_control/REGRESSION_CHECK.md` EXACTLY 12 items in order.
   - ALWAYS report as 12/12. Do NOT reduce denominator even if an item is not applicable.
   - If an item is not applicable, mark it "PASS (N/A)" but keep it within 12/12.
   - Payload integrity self-check (Fail-Closed):
     - Confirm `AGENTS.md` contains the PLAN-first rule, PERSISTENCE trigger, and No-Write guardrail.
     - Confirm `_control/GOVERNANCE_BOOTSTRAP.md` contains the learning loop rule (Guards + Lessons) and the 5-gate lifecycle.
     - Confirm `_control/REGRESSION_CHECK.md` still has 12 items + fixed denominator rule.
    - Confirm `_control/WORKSPACE_INDEX.md` includes Active Guards + Lessons + Boot audit + Migration kit + Boot+Apply runner + governance command shortcuts (`/gov_migrate`, `/gov_audit`, `/gov_apply <NN>`, `/gov_openclaw_json`, `/gov_brain_audit`).
   - System-truth self-check (Fail-Closed):
     - If this run makes OpenClaw system claims, run report must include source URLs from `https://docs.openclaw.ai`.
     - If this run makes latest/version-sensitive OpenClaw claims, run report must include source URLs from `https://github.com/openclaw/openclaw/releases`.
     - If this run makes date/time claims, run report must include runtime-verified absolute date/time evidence (from session status).
   - Brain Docs evidence self-check (Fail-Closed):
     - If this run touches Brain Docs, run report must include:
       - `FILES_READ` with exact Brain Docs paths
       - `TARGET_FILES_TO_CHANGE` with exact paths (or `none` for read-only runs)
     - Missing either field => STOP and output Blocked/Remediation.
   - Path-compatibility self-check (Fail-Closed):
     - No hardcoded `~/.openclaw/workspace/...` path assumptions in changed content.
   - Canonical equality check (Fail-Closed):
     - Extract the three deployed AUTOGEN blocks: `AGENTS_CORE_v1`, `GOV_CORE_v1`, `REGRESSION_12_v1`.
     - Extract the three canonical contents from `prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` using the mapping rules above.
     - Normalize both sides using the normalization rules above.
     - Compute sha256 for each (record first 12 chars).
     - Any mismatch => STOP and output Blocked/Remediation (do NOT claim completion).

6) PERSIST GATE
   - Write run report under `_runs/` named:
     `migrate_governance_rev6_<ts>.md`
   - Run report must include:
     - summary + `<ts>`
     - backup paths created
     - `FILES_READ` (exact paths)
     - `TARGET_FILES_TO_CHANGE` (exact paths; use `none` for read-only)
     - files patched (paths) + before/after excerpts (AUTOGEN blocks)
     - QC results 12/12 with evidence
     - final tree view (only top-level + `_control/` + `prompts/governance/`)
     - operator next action:
       - Send slash command as a standalone message: `/gov_audit`
       - Fallback if slash command is unavailable or name-collided: `/skill gov_audit`
   - Update `_control/WORKSPACE_INDEX.md` to link this run report.
   - Post-update self-check (Fail-Closed):
     - Re-read `_control/WORKSPACE_INDEX.md` and confirm it contains a link/reference to the new run report path.
     - If missing => STOP and output Blocked/Remediation (do NOT claim completion).

END TASK
