# OpenClaw WORKSPACE_GOVERNANCE: Positioning, Intent, and Factory-Baseline Gap

> Language: English positioning doc. Traditional Chinese counterpart: [`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)

## 1) Executive Summary

WORKSPACE_GOVERNANCE does not replace OpenClaw.
It adds a governance control plane on top of official runtime capabilities.

Factory baseline emphasizes:
1. Fast startup
2. Assistant-like UX
3. Extensibility

WORKSPACE_GOVERNANCE emphasizes:
1. Controllability
2. Verifiability
3. Traceability
4. Continuous quality loop

## 2) What Factory Baseline Already Provides

OpenClaw baseline can inject core docs/context (when present), for example:
1. `AGENTS.md`
2. `SOUL.md`
3. `TOOLS.md`
4. `IDENTITY.md`
5. `USER.md`
6. `HEARTBEAT.md`
7. `BOOTSTRAP.md` (for new workspace)
8. optional `MEMORY.md` / `memory.md`

This is efficient, but context windows and selective reading can still cause execution drift.

## 3) Why "Immediate Action Without Verification" Happens

Common failure patterns (especially with lower-cost models):
1. Speed-first response before evidence checks.
2. Treating context injection as equivalent to fully reading files.
3. Skipping local skill/document lookup.
4. Missing runtime date/time verification.
5. Making system claims without checking official docs/releases.

These are governance-gate issues, not just model quality issues.

## 4) Core Intent of WORKSPACE_GOVERNANCE

The goal is not "more commands".
The goal is to enforce order for high-risk operations:
1. `PLAN`
2. `READ`
3. `CHANGE`
4. `QC`
5. `PERSIST`

Supporting rules:
1. Fail-Closed by default.
2. Runtime path compatibility (`<workspace-root>` semantics).
3. System/date verification requirements.
4. BOOT read-only proposals + numbered approval + controlled apply.

## 5) Practical User Value

For operators and teams, benefits are direct:
1. Fewer avoidable breakages and manual cleanup.
2. Lower recurrence of the same mistakes.
3. Better handover/review through run-report evidence.
4. Clearer onboarding path for new users.

## 6) Boundaries (No Over-Selling)

WORKSPACE_GOVERNANCE helps reduce risk, but it does not:
1. Make any model error-free.
2. Remove the need for human judgment.
3. Eliminate ongoing maintenance.

## 7) Language-Aware Navigation

1. English homepage: [`README.md`](./README.md)
2. Traditional Chinese homepage: [`README.zh-HK.md`](./README.zh-HK.md)
3. English handbook: [`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
4. Traditional Chinese handbook: [`WORKSPACE_GOVERNANCE_README.md`](./WORKSPACE_GOVERNANCE_README.md)

## 8) Official References

1. https://docs.openclaw.ai/concepts/context
2. https://docs.openclaw.ai/concepts/system-prompt
3. https://docs.openclaw.ai/reference/token-use
4. https://docs.openclaw.ai/concepts/agent
5. https://docs.openclaw.ai/start/bootstrapping
6. https://docs.openclaw.ai/gateway/configuration-reference
7. https://docs.openclaw.ai/automation/hooks
8. https://docs.openclaw.ai/AGENTS.default
