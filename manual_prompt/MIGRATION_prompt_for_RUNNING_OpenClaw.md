[GOVERNANCE | MIGRATION+AUDIT | SSOT]
Execute using prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md as the ONLY "workflow SSOT".

(Note: The canonical content source is NOT the workflow SSOT; see Canonical Source below.)

You MUST output and follow, in order: PLAN → READ → CHANGE → QC → PERSIST.

READ (must read and list read evidence in the run report):
- AGENTS.md
- _control/GOVERNANCE_BOOTSTRAP.md
- _control/PRESETS.md
- _control/WORKSPACE_INDEX.md
- _control/REGRESSION_CHECK.md
- _control/LESSONS.md (if present)
- _control/ACTIVE_GUARDS.md (if present)
- BOOT.md (if present)
- prompts/governance/APPLY_UPGRADE_FROM_BOOT.md (if present)
- skills/gov_migrate/SKILL.md (if present)
- skills/gov_audit/SKILL.md (if present)
- skills/gov_apply/SKILL.md (if present)
- skills/gov_openclaw_json/SKILL.md (if present)
- skills/gov_brain_audit/SKILL.md (if present)
- prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md
- prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md (Canonical Source; if missing => FAIL-CLOSED)
- Any other files required by the workflow SSOT

CHANGE:
- Only apply the minimal changes explicitly specified by the workflow SSOT.
- Backup all affected files to archive/_migration_backup_<ts>/... (if required by the SSOT).
(Hard) Any AUTOGEN block additions/updates MUST be copied from the Canonical Source verbatim (byte-for-byte). Do NOT author substitute content.

QC:
- Fixed denominator 12/12. If ANY FAIL occurs, output Blocked/Remediation and do NOT claim completion.
(Hard) QC MUST include a "content equality verification":
- Extract the actual contents of AUTOGEN blocks: AGENTS_CORE_v1 / GOV_CORE_v1 / REGRESSION_12_v1
- Compare them byte-for-byte against the corresponding canonical blocks in the Canonical Source
- Any mismatch => FAIL (output Blocked/Remediation, name the drifting block, and provide the minimal fix step: replace with canonical content)

PERSIST:
- Write the run report to _runs/
- Update _control/WORKSPACE_INDEX.md with the run report link
- The run report MUST include: change list, backup paths, QC 12/12 evidence, and short hashes (e.g., sha256 first 12 hex chars) for the three core blocks as the audit baseline
- If skills were created/updated, instruct the operator to use `/gov_audit` (or `/skill gov_audit`) immediately after completion.
