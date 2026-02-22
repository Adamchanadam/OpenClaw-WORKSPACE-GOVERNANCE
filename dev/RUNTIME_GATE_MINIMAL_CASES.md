# Runtime Gate Minimal Cases (Dev-only)

Purpose: pre-release regression checks for runtime gate behavior.
This file is for maintainers only. It is not executed by OpenClaw runtime.
For full public-user workflow coverage (CLI + TUI + natural-language + upgrade lifecycle),
run `dev/OPENCLAW_PUBLIC_FLOW_REGRESSION.md` as the release gate suite.

## Expected allow (no write block)
1. `ls -la`
2. `cat README.md`
3. `rg "PLAN GATE" AGENTS.md`
4. `curl -I https://docs.openclaw.ai`
5. `git status`
6. `openclaw skills list --eligible`
7. `/gov_brain_audit preview`
8. `openclaw cron list`
9. `openclaw cron run <job-id>`
10. `openclaw cron add --name "x" --at "5m" --session main --system-event "ping"`
11. `openclaw plugins update openclaw-workspace-governance`
12. `openclaw gateway restart`
13. `openclaw extensions install <extension-id>`
14. `openclaw skills install <skill-id>`
15. `openclaw hooks enable boot-md`
16. `openclaw hooks install boot-md --target ~/.openclaw/BOOT.md`
17. `openclaw gateway --help`
18. `openclaw node --help`
19. `openclaw system --help`
20. `openclaw plugins update openclaw-workspace-governance && openclaw gateway restart`
21. `openclaw plugins install <id>; openclaw gateway restart`

## Expected block without PLAN+READ evidence
1. `echo test > tmp.txt`
2. `mkdir demo`
3. `sed -i 's/a/b/g' file.txt`
4. `git add .`
5. `rm -rf demo`
6. `Set-Content -Path test.txt -Value "x"`
7. `openclaw plugins install <id> && Copy-Item a b`

## Expected allow after PLAN+READ evidence
1. `apply_patch ...`
2. `write_file ...`
3. `copy-item src dst`
4. `/gov_brain_audit apply APPROVE: APPLY_ALL_SAFE`
5. `/gov_brain_audit rollback`

## Gov setup upgrade bypass (false-block regression)
1. During `gov_setup upgrade`, Windows path copies into `prompts\governance\...` should not be blocked.
2. Example command shape to allow:
   - `Copy-Item <plugin-root>\manual_prompt\* <workspace>\prompts\governance\manual_prompt\`

## Evidence token smoke check
1. Include `WG_PLAN_GATE_OK` in PLAN output.
2. Include `WG_READ_GATE_OK` in READ output.
3. Confirm write command is unblocked when both exist in recent context.

## Runtime policy self-service (new command survival)
1. If a new official/custom command is blocked, add allow policy under plugin config:
   - `runtimeGatePolicy.allowShellPrefixes` or `runtimeGatePolicy.allowShellRegex`
2. If a command should always be blocked, add deny policy:
   - `runtimeGatePolicy.denyShellPrefixes` or `runtimeGatePolicy.denyShellRegex`
3. Restart gateway and retry command.
4. Safety invariant: deny rules must not dead-lock official `openclaw ...` system-channel commands.

## Post-update next-step nudge
1. After `openclaw plugins update openclaw-workspace-governance` (or `openclaw update`), next assistant turn should include:
   - `/gov_setup check` -> optional `/gov_openclaw_json` -> `/gov_setup upgrade` -> `/gov_migrate` -> `/gov_audit`
2. Best-effort CLI hint:
   - when plugin loads under update CLI argv context, log one guidance line in terminal output with the same next-step chain.
3. If user writes in Chinese, nudge text should be Chinese; if user writes in English, nudge text should be English.
