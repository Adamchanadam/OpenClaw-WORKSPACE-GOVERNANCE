---
name: gov_brain_audit
description: Conservative Brain Docs auditor (single entry): preview by default, approval-based apply, rollback on demand.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧠"}}
---
# /gov_brain_audit

## Purpose
Audit Brain Docs conservatively to reduce two recurring risks:
1. Action-before-verification behavior
2. Unsupported certainty/completion claims without evidence
3. Evidence/report mismatches that can hide governance drift

Runtime integration:
1. Governance runtime may suggest this preview before write-capable actions.
2. Post-command windows (after `gov_setup upgrade`, `gov_migrate`, `gov_audit`) trigger advisory nudge only (not hard block).
3. Hard blocks only apply to high-risk writes (Brain Docs, `openclaw.json`) on the 3rd+ attempt without evidence.
4. Session/gateway start should default to nudge-only (not hard block) to avoid daily-flow self-lock.

Single-entry UX:
1. Run `/gov_brain_audit` -> read-only preview (default)
2. Approve selected items with `/gov_brain_audit APPROVE: ...`
3. Roll back approved changes with `/gov_brain_audit ROLLBACK` (only after apply)

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
6. Semantic-first, language-agnostic review is mandatory (global users; not keyword-limited).
7. Keyword examples are only hints; absence of a listed keyword is not evidence of safety.

## Trigger contract
1. Preview mode (default):
   - Triggered by `/gov_brain_audit` (or `/skill gov_brain_audit`) without approval/rollback token.
   - Read-only: no file writes.
2. Apply mode:
   - Triggered when operator message includes `/gov_brain_audit APPROVE: ...`.
   - Approval formats:
     - `APPROVE: <PASTE_IDS_FROM_PREVIEW>`
     - `APPROVE: APPLY_ALL_SAFE` (High + Medium)
     - `APPROVE: APPLY_ALL`
   - `PASTE_IDS_FROM_PREVIEW` means finding IDs from the current preview output; IDs like `F001` are examples only.
3. Rollback mode:
   - Triggered when operator message is `/gov_brain_audit ROLLBACK`.
   - Optional explicit path form: `/gov_brain_audit ROLLBACK: <backup-path>`.
   - Valid only if a prior apply backup exists.

## Input contract
1. Do not require users to memorize subcommands.
2. If approval token is missing, stay in preview mode.
3. If `APPROVE:` is malformed or references unknown finding IDs, stop with `BLOCKED`.
4. If `ROLLBACK` is requested but no backup exists, stop with `BLOCKED`.

## Required workflow
1. Classify mode:
   - Preview -> read-only
   - Apply/Rollback -> Mode C (`PLAN -> READ -> CHANGE -> QC -> PERSIST`)
2. For preview, return:
   - Semantic Review (required): evaluate intent/meaning across all languages in-scope, not only token matches
   - If available, run `tools/brain_audit_rules.mjs` as deterministic cross-check (supplement only; not final authority)
     - Default script mode should stay structural-only (evidence format/integrity checks).
     - If `--enable-lexical-hints` is used, treat `LEXICAL_HINT_*` findings as advisory only; semantic review must confirm before escalation/blocking.
   - Executive Summary (risk level + top root causes)
   - Findings sorted by severity (ID, file:line, risky text, why risky, keep intent, proposed fix)
   - Patch Preview (BEFORE/AFTER snippets only; no write)
   - Approval Checklist
   - Next-step hint with `APPROVE:` template
3. For apply:
   - Backup all target files before change.
   - Apply only approved findings.
   - Validate:
     - persona preserved
     - high-risk triggers reduced or guarded
     - no new rule conflicts introduced
   - Persist run report + update index if required.
4. For rollback:
   - Restore backed up files.
   - Persist rollback report.

## Risk classes (semantic-first; examples only)
1. Action-before-verification intent:
   - "immediately", "do not wait", "always act", "唔使等指令", "即刻"
2. Unsupported certainty/completion intent:
   - "always answer", "never uncertain", "must complete"
3. Completion-claim leakage:
   - declares done/pass without evidence fields
4. Evidence mismatch:
   - claims file read but file missing
5. Memory pollution:
   - speculative words ("likely", "可能", "估計") written as facts

### Deterministic script classes (supplement only)
1. `COMPLETION_WITHOUT_EVIDENCE`
2. `READ_CLAIM_MISMATCH`
3. `LEXICAL_HINT_*` (optional mode only) is low-signal advisory and never a sole block reason.

Important:
1. Treat examples above as non-exhaustive.
2. Include semantically equivalent phrasing in any language/script.
3. Never use keyword-only pass/fail as the final decision for high-risk classes.

## Output requirements (UX)
Use branded output format (match `formatCommandOutput` style):
1. First line: `🐾 OpenClaw Governance · /gov_brain_audit`
2. `─────────────────────────────────` dividers between sections
3. Status line: emoji prefix + `  STATUS` on first line, status value on next line
   - ✅ PASS/READY, ⚠️ WARN/PARTIAL, ❌ BLOCKED/FAIL, ℹ️ INFO
4. Bullet items: `  •` prefix (not `- `)
5. Next step: `👉` prefix on action text
6. Commands: indented with 2 spaces (no `COMMAND TO COPY` label)

Example (preview mode):
```
🐾 OpenClaw Governance · /gov_brain_audit
─────────────────────────────────

⚠️  STATUS
FINDINGS_DETECTED

  • files_scanned: 14
  • findings: 2 HIGH, 1 MEDIUM, 0 LOW
  • top_risk: action-before-verification in HEARTBEAT.md:12

─────────────────────────────────
[Findings table + Patch Preview here]

─────────────────────────────────
👉 Review findings above, then approve selected items.

  /gov_brain_audit APPROVE: F001,F002
  fallback: /skill gov_brain_audit APPROVE: F001,F002
```

Always provide one primary next command and one `/skill ...` fallback.
If a backup does not exist yet, do not suggest rollback in next-step options.

## Fallback
If slash routing is unstable:
1. `/skill gov_brain_audit`
2. `/skill gov_brain_audit APPROVE: ...` or `/skill gov_brain_audit ROLLBACK` as needed

