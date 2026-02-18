---
name: gov_apply
description: Apply an approved BOOT upgrade item by number using the guided apply runner.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧩"}}
---
# /gov_apply <NN>

## Input
- `<NN>` must be a two-digit item number, for example `01`.

## Purpose
Execute:
- `prompts/governance/APPLY_UPGRADE_FROM_BOOT.md`

## Hard contract
1. If `<NN>` is missing or invalid, stop and request a two-digit number.
2. If BOOT menu context is missing, stop and request the latest BOOT menu section.
3. Apply only the approved item.
4. After apply, run migration/audit flow as required by the apply runner.
5. For OpenClaw system claims during apply, verify against local skill docs and `https://docs.openclaw.ai`.
   - For latest/version-sensitive claims, also verify official releases `https://github.com/openclaw/openclaw/releases`.
   - If verification cannot be completed, report uncertainty and required next check; do not infer.
6. For date/time-sensitive claims during apply, verify runtime current time context first (session status).
7. Use runtime `<workspace-root>` semantics; do not assume fixed home paths.

## Fallback
- If slash command is unavailable or name-collided, use:
  - `/skill gov_apply <NN>`
