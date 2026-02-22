# BOOT Post-Flow Acceptance Template

Purpose: make Phase G (`BOOT` post-flow integrity) reproducible and reviewable for every release.

Use this template in real OpenClaw host validation (for example Ubuntu VPS).

## 0) Test Meta

Fill once per release:

| Field | Value |
|---|---|
| Release version | |
| Date/time (UTC) | |
| Host | |
| Workspace path | |
| Operator | |

## 1) Trigger Method (Fixed)

Use this trigger pattern for both G1 and G2:
1. Restart gateway.
2. Open a fresh TUI session.
3. Run one governance entry command to force BOOT report (recommended: `/gov_setup check`).
4. Capture the BOOT output snippet.

## 2) G1 Record - Resolved History Must Not Stay Active

Precondition:
1. `_runs/` contains an older `migrate_governance_*` report with `BLOCKED` canonical mismatch.
2. `_runs/` also contains a newer `migrate_governance_*` report with `PASS`.

Record:

| Field | Value |
|---|---|
| Case ID | G1 |
| Trigger command | `/gov_setup check` |
| Expected status | `OK` (unless another active blocker exists) |
| Expected drift text | old blocked migrate shown as resolved history (info), not active blocker |
| Expected recommendation | continue normal flow, no stale canonical-fix instruction |
| Actual status | |
| Actual drift text summary | |
| Actual recommendation summary | |
| Evidence snippet path | |
| Verdict (`PASS`/`FAIL`) | |

Pass checks:
1. BOOT output does not treat the old blocked migrate run as active blocker.
2. Recommendation does not ask user to re-fix already resolved canonical mismatch.

## 3) G2 Record - Active Unresolved Blocker Must Warn

Precondition:
1. Latest relevant `migrate_governance_*` run is `BLOCKED`.
2. No newer `migrate_governance_*` `PASS` exists.

Record:

| Field | Value |
|---|---|
| Case ID | G2 |
| Trigger command | `/gov_setup check` |
| Expected status | `WARN` |
| Expected recommendation | concrete unblock chain (`/gov_migrate` then `/gov_audit`) |
| Expected wording | governance policy context, not system crash wording |
| Actual status | |
| Actual recommendation summary | |
| Actual wording summary | |
| Evidence snippet path | |
| Verdict (`PASS`/`FAIL`) | |

Pass checks:
1. BOOT output marks unresolved blocker as active.
2. Recommendation is actionable and copy-paste ready.

## 4) Release Gate Rule

1. `G1=PASS` and `G2=PASS` are both required.
2. Any fail blocks release.
3. Evidence snippets must be stored with release validation artifacts.
