# OpenClaw WORKSPACE_GOVERNANCE: Value Positioning and Factory-Baseline Gap

> This document explains why this project exists.
> It does not repeat installation or runbook steps.

Related docs:
1. Homepage: [`README.md`](./README.md)
2. Operations handbook: [`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
3. Traditional Chinese version: [`VALUE_POSITIONING_AND_FACTORY_GAP.md`](./VALUE_POSITIONING_AND_FACTORY_GAP.md)

---

## 1) One-Sentence Positioning

OpenClaw WORKSPACE_GOVERNANCE adds a governance control plane on top of OpenClaw's runtime, so long-running workspaces remain controllable, verifiable, and traceable.

---

## 2) Factory Baseline vs Governance Layer

Factory baseline is optimized for:
1. Fast startup
2. Assistant-style interaction
3. Extensibility

Governance layer is optimized for:
1. Ordered execution on risky tasks
2. Evidence-first decisions
3. Consistent audit and rollback readiness

This is not replacement. It is operational hardening.

---

## 3) Why Drift Happens in Practice

Common drift patterns in real usage:
1. Edit-first behavior before evidence checks
2. Treating context injection as full file reading
3. Weak verification on system/date/version claims
4. Repeated mistakes across sessions

These are workflow-gate problems, not only model-quality problems.

---

## 4) What Governance Adds

1. Fixed execution order: `PLAN -> READ -> CHANGE -> QC -> PERSIST`
2. Fail-Closed default when evidence is missing
3. Mode routing for conversation vs verified-answer vs write tasks
4. BOOT read-only proposals with human-approved controlled apply
5. Run-report traceability for review and recurrence reduction

---

## 5) User Value (Non-Technical)

1. Fewer avoidable breakages
2. Less manual cleanup after wrong edits
3. Better visibility of what changed and why
4. Easier team handover and accountability

---

## 6) Boundaries (No Over-Selling)

This project helps reduce risk, but it does not:
1. Make any model error-free
2. Remove need for human decisions
3. Eliminate ongoing maintenance work

Expected outcome:
- lower operational risk
- lower repeat-error rate
- better evidence quality

---

## 7) Where to Go Next

1. If you are new: start at [`README.md`](./README.md)
2. If you need exact steps: use [`WORKSPACE_GOVERNANCE_README.en.md`](./WORKSPACE_GOVERNANCE_README.en.md)
3. If you need Chinese docs: [`README.zh-HK.md`](./README.zh-HK.md)

---

## 8) Official References

1. https://docs.openclaw.ai/concepts/context
2. https://docs.openclaw.ai/concepts/system-prompt
3. https://docs.openclaw.ai/reference/token-use
4. https://docs.openclaw.ai/concepts/agent
5. https://docs.openclaw.ai/start/bootstrapping
6. https://docs.openclaw.ai/gateway/configuration-reference
7. https://docs.openclaw.ai/automation/hooks
8. https://github.com/openclaw/openclaw/releases
