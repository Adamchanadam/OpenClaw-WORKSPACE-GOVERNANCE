---
name: gov_brain_audit
description: Conservative Brain Docs auditor with preview-first findings, approval-based apply, and rollback for persona-safe hardening.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧠"}}
---
# /gov_brain_audit [preview|apply|rollback]

## Purpose
Audit Brain Docs conservatively to reduce two recurring risks:
1. Action-before-verification behavior
2. Unsupported certainty/completion claims without evidence

Default mode is `preview` (read-only).

## In scope
Brain Docs and governance docs that shape agent behavior:
1. `AGENTS.md`
2. `SOUL.md`
3. `IDENTITY.md`
4. `USER.md`
5. `TOOLS.md`
6. `MEMORY.md`
7. `HEARTBEAT.md`
8. `BOOT.md`
9. `_control/GOVERNANCE_BOOTSTRAP.md`
10. `_control/PRESETS.md`
11. `_control/REGRESSION_CHECK.md`
12. `_control/ACTIVE_GUARDS.md` (if present)
13. `_control/LESSONS.md` (if present)
14. Recent `memory/*.md` (last 7 days; if present)
15. Recent `_runs/*.md` (sample latest 10; read-only)

## Hard principles
1. Preserve persona intent; do not flatten voice.
2. Use minimal-diff edits only.
3. Preview first; never apply before operator approval.
4. Do not delete user content without explicit approval.
5. If evidence is missing, mark uncertainty instead of guessing.

## Mode contract
1. `preview` (default):
   - Read-only.
   - Output findings + patch preview.
   - No file writes.
2. `apply`:
   - Requires operator approval list.
   - Create backup first under `archive/_brain_docs_autofix_<ts>/...`.
   - Apply only approved items.
   - Write run report under `_runs/`.
3. `rollback`:
   - Restore latest `archive/_brain_docs_autofix_<ts>/...` backup.
   - Write rollback report under `_runs/`.

## Input contract
1. If mode is omitted, use `preview`.
2. `apply` must include one of:
   - `APPROVE: F001,F003`
   - `APPROVE: APPLY_ALL_SAFE` (High + Medium only)
   - `APPROVE: APPLY_ALL`
3. If approval is missing in `apply`, stop with `BLOCKED`.
4. `rollback` can optionally include a backup path; otherwise use latest backup.

## Required workflow
1. Classify mode:
   - `preview` -> read-only
   - `apply`/`rollback` -> Mode C (`PLAN -> READ -> CHANGE -> QC -> PERSIST`)
2. For `preview`, return:
   - Executive Summary (risk level + top root causes)
   - Findings sorted by severity (ID, file:line, risky text, why risky, keep intent, proposed fix)
   - Patch Preview (BEFORE/AFTER snippets only; no write)
   - Approval Checklist
   - Apply command hint
3. For `apply`:
   - Backup all target files before change.
   - Apply only approved findings.
   - Validate:
     - persona preserved
     - high-risk triggers reduced or guarded
     - no new rule conflicts introduced
   - Persist run report + update index if required.
4. For `rollback`:
   - Restore backed up files.
   - Persist rollback report.

## Risk detection hints
1. Impulse trigger wording:
   - "immediately", "do not wait", "always act", "唔使等指令", "即刻"
2. Over-confidence wording:
   - "always answer", "never uncertain", "must complete"
3. Completion-claim leakage:
   - declares done/pass without evidence fields
4. Evidence mismatch:
   - claims file read but file missing
5. Memory pollution:
   - speculative words ("likely", "可能", "估計") written as facts

## Output requirements (UX)
Use this order:
1. `STATUS`
2. `WHY`
3. `NEXT STEP (Operator)`
4. `COMMAND TO COPY`

Always provide one primary next command and one `/skill ...` fallback.

## Fallback
If slash routing is unstable:
1. `/skill gov_brain_audit preview`
2. `/skill gov_brain_audit apply APPROVE: APPLY_ALL_SAFE`
3. `/skill gov_brain_audit rollback`
