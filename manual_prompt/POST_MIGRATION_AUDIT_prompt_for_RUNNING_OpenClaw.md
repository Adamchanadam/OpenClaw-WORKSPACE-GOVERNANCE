TASK: POST_MIGRATION_AUDIT_READONLY_GENERIC (FAIL-CLOSED, READ-ONLY)

Objective
- Perform a read-only, deterministic post-migration audit to verify that migrated AUTOGEN blocks are:
  (1) byte-for-byte aligned with the canonical source, and
  (2) traceable to the migration workflow SSOT, without relying on memory or paraphrase.

Inputs (optional, if provided by user)
- RUN_REPORT_PATH: <path to a specific migration run report under _runs/>
- MIGRATION_SSOT_PATH: <path to migration workflow SSOT>
  Default (if not provided): prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md
- Path resolution (hard; portability):
  - If a path is relative, resolve it against the detected workspace root (the folder containing `AGENTS.md`).
  - If a path is absolute, use it as-is.

Hard Rules (Read-only)
- NO writes / edits / moves / copies / backups.
- If any required file, mapping, or normalization rule is missing or ambiguous: FAIL-CLOSED.

PLAN (must be included in the evidence output)
- <ts> (YYYYMMDD_HHMMSS)
- Target workspace root detection rule (the folder containing AGENTS.md)
- Which run report will be audited (explicit path)
- Files to read (exact paths)
- Audit method summary (mapping + normalization + hashing)
- Output rule (VERIFIED PASS or BLOCKED/Remediation only)

READ GATE (must show read evidence as exact path list)
1) MIGRATION_SSOT_PATH (must exist)
2) Canonical source file path (must be declared inside MIGRATION_SSOT_PATH under a clearly labeled section, e.g. "CANONICAL SOURCE (hard)")
3) AGENTS.md
4) _control/GOVERNANCE_BOOTSTRAP.md
5) _control/REGRESSION_CHECK.md
6) _control/WORKSPACE_INDEX.md
7) RUN_REPORT_PATH:
   - If RUN_REPORT_PATH is provided: read it.
   - Else: find and read the most recent migration run report under _runs/ using a deterministic heuristic:
     - Prefer filenames containing "migrate" OR "migration" OR "governance"
     - Choose the newest by timestamp in filename if present.
     - If no timestamp can be parsed from any candidate filename: choose the lexicographically greatest filename.
     - If there is still ambiguity (e.g., multiple exact ties): FAIL-CLOSED.
   - If no candidate run report exists: FAIL-CLOSED.

AUDIT TARGET DISCOVERY (deterministic; no guessing)
- From MIGRATION_SSOT_PATH, extract:
  A) Canonical source path (must be explicit).
  B) Canonical mapping rules:
     - Must specify:
       - which AUTOGEN block IDs are in scope, and
       - how to extract canonical content for each block from the canonical source,
       - and which target file each block belongs to.
  C) Normalization rules for equality checks (line endings, trailing whitespace, terminal newline, etc.).
- If any of A/B/C is missing or ambiguous: FAIL-CLOSED.

EXTRACTION (no write)
For each audit target defined by the migration SSOT mapping:
1) Extract the deployed AUTOGEN block content from its target file:
   - Locate exactly one:
     <!-- AUTOGEN:BEGIN <block_id> --> ... <!-- AUTOGEN:END <block_id> -->
   - If 0 or >1 matches: FAIL-CLOSED.
2) Extract the canonical content from the canonical source using the mapping rules:
   - If extraction boundaries are unclear: FAIL-CLOSED.
3) Normalize both deployed and canonical contents using the normalization rules from the migration SSOT.
4) Compute sha256 for both normalized contents.
   - Record short hash = first 12 hex chars.

EQUALITY DECISION (Fail-Closed)

INDEX TRACEABILITY CHECK (read-only; Fail-Closed)
- Confirm `_control/WORKSPACE_INDEX.md` contains a link/reference to the audited `RUN_REPORT_PATH`.
  - If missing => FAIL-CLOSED:
    - Output BLOCKED/Remediation with:
      - issue: "WORKSPACE_INDEX missing run report link"
      - required fix: "re-run the migration workflow so PERSIST updates WORKSPACE_INDEX.md to include the run report link"

INDEX REQUIRED LINKS CHECK (read-only; Fail-Closed)
- From `MIGRATION_SSOT_PATH`, deterministically extract the required link list for `_control/WORKSPACE_INDEX.md`:
  - Locate the bullet that starts with:
    - `_control/WORKSPACE_INDEX.md`: ensure it contains links to:
  - Extract the inline link list exactly as written in the workflow SSOT.
- Confirm each required link appears in `_control/WORKSPACE_INDEX.md`.
  - If any is missing => FAIL-CLOSED:
    - Output BLOCKED/Remediation with:
      - issue: "WORKSPACE_INDEX missing required governance links"
      - missing: <list of missing links>
      - required fix: "re-run the migration workflow so it patches WORKSPACE_INDEX.md to include the required links"

BLOCK EQUALITY CHECK (Fail-Closed)
- If ANY block hash mismatches:
  - Output BLOCKED/Remediation with:
    - which block_id failed,
    - which target file contains the drift,
    - deployed short hash vs canonical short hash,
    - a minimal remediation instruction: "replace that AUTOGEN block with canonical content per SSOT mapping".
- If ALL blocks match AND the INDEX TRACEABILITY CHECK passes:
  - Output VERIFIED PASS with:
    - audited RUN_REPORT_PATH,
    - list of audited block_ids and their short hashes (baseline),
    - confirmation that mapping + normalization were taken from MIGRATION_SSOT_PATH.

OUTPUT (strict)
- Output MUST start with exactly one status line:
  - VERIFIED PASS
  - BLOCKED/Remediation
- After the status line, include evidence summary only (no extra commentary), and it MUST include:
  - PLAN (ts, workspace root detection rule, audited RUN_REPORT_PATH, file read path list)
  - Audited block_ids + deployed vs canonical short hashes (first 12 hex chars)
  - Mapping + normalization source confirmation (taken from MIGRATION_SSOT_PATH)
  - If BLOCKED/Remediation: the minimal fix step(s) required
END TASK
