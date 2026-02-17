TASK: APPLY_UPGRADE_FROM_BOOT_MENU (BOOT+APPLY v1, GUIDED, FAIL-CLOSED)

GOAL
Turn a BOOT-generated upgrade suggestion into a verified governance improvement:
- Operator approves an upgrade by replying with its item number (e.g., `01`)
- The agent applies the upgrade via governance gates (PLAN -> READ -> CHANGE -> QC -> PERSIST)
- The agent then runs the Migration kit to keep the workspace baseline aligned
- The agent records measurable before/after evidence so upgrade effectiveness can be validated

RUNTIME MODES (Hard)
- Mode A (Conversation): casual chat only; no persistence and no system claims.
- Mode B (Verified Answer): no writes, but factual answer required.
  - Mode B2 (OpenClaw system topics): MUST verify against local skill docs and `https://docs.openclaw.ai` before answering.
  - Mode B3 (Date/time topics): MUST verify runtime current time context first (session status), then answer using absolute dates when relevant.
- Mode C (Governance change): any write/update/save/persist operation; MUST run PLAN → READ → CHANGE → QC → PERSIST.

PATH COMPATIBILITY CONTRACT (Hard)
- Resolve and use runtime `<workspace-root>`.
- Do NOT assume `~/.openclaw/workspace` as a fixed path.

INPUT CONTRACT (Hard)
- Expected operator message: a two-digit upgrade item number: `01` / `02` / `03`
- The current chat history MUST contain the latest `BOOT UPGRADE MENU (BOOT+APPLY v1)` output.
  - If the menu is missing or ambiguous: STOP and request the operator to paste the latest BOOT menu.

SCOPE (Hard)
- This is a GOVERNANCE TASK (persistence implied). Follow `_control/GOVERNANCE_BOOTSTRAP.md`.
- Do NOT make Platform changes.
- Do NOT modify any file outside the workspace root.

- Allowed writes for this task (APPLY phase only):
  - `_control/ACTIVE_GUARDS.md` (only append a log entry; do not rewrite existing entries)
  - `_control/LESSONS.md` (only append if explicitly required by the selected upgrade type; do not rewrite existing entries)
  - `_control/WORKSPACE_INDEX.md` (append one short run-report link only)
  - `_runs/` (new apply run report)
  - `archive/_apply_backup_<ts>/...` (backups, if used)

- Baseline alignment (Migration kit):
  - This task MUST invoke `prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md` as a sub-workflow after APPLY.
  - When invoked, allowed writes are EXACTLY those authorized by that workflow SSOT (Ref). Do not widen scope here.
  - If there is any scope conflict/ambiguity, FAIL-CLOSED and request operator confirmation.

DETERMINISTIC UPGRADE TYPES (Supported)
A) QC recurrence elevation
- Menu item title pattern: `Elevate QC#<n> (...)`
- Implementation: append a Guard + Lesson that hardens behavior around the recurring QC failure.

B) Guard recurrence escalation
- Menu item title pattern: `Elevate Guard#<id> (...)`
- Implementation: append a Lesson that records the recurrence and requires a governance-level review (no auto-SSOT rewrite).

If the menu item does not match A or B: STOP (fail-closed).

---

PLAN GATE (Output first)
1) Confirm selected item number and parse:
   - upgrade_type: QC#<n> OR Guard#<id>
   - trigger counts/window from the menu
2) List files to read (exact paths) and files to write (exact paths).
3) Risk note: append-only LOG updates + keeping WORKSPACE_INDEX short.
4) QC plan: run `_control/REGRESSION_CHECK.md` 12/12 and report PASS/FAIL.

---

READ GATE (Required reads)
- `_control/GOVERNANCE_BOOTSTRAP.md`
- `_control/PRESETS.md`
- `_control/WORKSPACE_INDEX.md`
- `_control/REGRESSION_CHECK.md`
- `_control/ACTIVE_GUARDS.md` (must exist; if missing, STOP and request running Bootstrap/Migration)
- `_control/LESSONS.md` (must exist; if missing, STOP and request running Bootstrap/Migration)
- Latest 5 run reports under `_runs/` (filenames from BOOT report; read only the specific reports referenced by the menu trigger)
- If the selected BOOT item touches OpenClaw system behavior:
  - Read relevant local skill docs (`skills/*/SKILL.md`) first.
  - Verify commands/config claims against `https://docs.openclaw.ai` and list source URLs in the run report.
- If reasoning involves date/time:
  - Verify runtime current time context first (session status).
  - Record absolute date/time in the run report.

Also read (from chat history):
- The full `BOOT UPGRADE MENU (BOOT+APPLY v1)` block to extract the selected item text.

---

CHANGE GATE (Apply upgrade)
1) Allocate next Guard ID
- Parse existing `### Guard #NNN:` entries in `_control/ACTIVE_GUARDS.md`
- Next Guard ID = max(NNN) + 1
- Use zero-padded 3 digits: `#003`, `#014`, etc.

2) Apply by upgrade type

A) QC recurrence elevation (QC#<n>)
- Append to `_control/ACTIVE_GUARDS.md`:
  - `### Guard #<next>: QC#<n> Recurrence Elevation`
  - Trigger reason: cite the menu trigger counts/window
  - Guard content (Hard):
    - Before any completion claim: explicitly re-check QC item #<n> and show evidence in the run report.
    - If QC item #<n> is FAIL at QC GATE: STOP and output Blocked/Remediation (no completion claim).
  - Verification: state what evidence must appear in the run report for QC#<n>.

- Append to `_control/LESSONS.md`:
  - Date: (today; timezone per USER.md if present)
  - Symptom: QC#<n> recurring FAIL
  - Root cause: repeated omission of QC item #<n> in gate execution
  - Fix applied: Guard #<next> added + apply protocol enforced
  - Guard ID: Guard #<next>
  - Recurrence Test (stateless):
    - Prompt: "Apply a governance change that creates a new file under `_runs/`. Show the updated `_control/WORKSPACE_INDEX.md` link and show QC 12/12 with item #<n> PASS."
    - PASS: evidence includes the specific QC item #<n> PASS and the required artifact/link; otherwise FAIL.
  - Prevention: reference `_control/GOVERNANCE_BOOTSTRAP.md` (no duplicate rule text)

B) Guard recurrence escalation (Guard#<id>)
- Read the existing Guard entry block for Guard#<id> from `_control/ACTIVE_GUARDS.md` (read-only).
- Append to `_control/LESSONS.md`:
  - Date: (today; timezone per USER.md if present)
  - Symptom: Guard#<id> repeated >= 3 times
  - Root cause: underlying rule not yet promoted/clarified enough for consistent execution
  - Fix applied: escalation recorded; migration alignment executed
  - Guard ID: Guard#<id>
  - Recurrence Test (stateless):
    - Prompt: "In a fresh session, restate Guard#<id> in one line, then apply it to a small example decision; show PASS/FAIL criteria."
    - PASS: restatement matches the guard text intent and the example obeys it; otherwise FAIL.
  - Prevention: schedule a follow-up governance upgrade (do not auto-edit SSOT here)

3) Update `_control/WORKSPACE_INDEX.md` (keep short)
- Append exactly one bullet link under an appropriate short section (or create `## Recent Runs (manual)` at end if missing):
  - Link to this run report file name.

4) Run Migration kit (baseline alignment)
- Execute: `prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md`
- If Migration produces any FAIL in QC 12/12: STOP and report Blocked/Remediation (do not claim completion).

5) Effectiveness validation (required)
- Before completion claim, compare pre/post indicators for the selected upgrade item:
  - recurrence count window from BOOT trigger
  - related QC item status (if QC-type upgrade)
  - related Guard/Lesson recurrence marker (if Guard-type upgrade)
- If no measurable improvement signal can be shown, mark outcome as `PARTIAL` and keep follow-up actions mandatory.

---

QC GATE (Must be 12/12)
- Execute `_control/REGRESSION_CHECK.md` and report all 12 items.
- Special focus:
  - Item #3 INDEX UPDATED must PASS (this run report is linked)
  - Item #10 LESSONS LOOP must PASS (Lesson added; Guard added when applicable)
  - Item #12 completion language must be respected

---

PERSIST GATE
- Write one run report under `_runs/`:
  - Filename: `<timestamp>_apply_upgrade_from_boot_v1.md`
  - Include: plan, reads, changes (before/after excerpts), QC 12/12, effectiveness validation, and follow-ups
  - Follow-ups MUST include `operator next action`:
    - Send slash command as a standalone message: `/gov_audit`
    - Fallback if slash command is unavailable or name-collided: `/skill gov_audit`
- Ensure `_control/WORKSPACE_INDEX.md` includes the link to the run report.
