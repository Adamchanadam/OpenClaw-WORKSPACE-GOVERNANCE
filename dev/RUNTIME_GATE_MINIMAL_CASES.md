# Runtime Gate Minimal Cases (Dev-only)

Purpose: pre-release regression checks for runtime gate behavior.
This file is for maintainers only. It is not executed by OpenClaw runtime.

## Expected allow (no write block)
1. `ls -la`
2. `cat README.md`
3. `rg "PLAN GATE" AGENTS.md`
4. `curl -I https://docs.openclaw.ai`
5. `git status`
6. `openclaw skills list --eligible`

## Expected block without PLAN+READ evidence
1. `echo test > tmp.txt`
2. `mkdir demo`
3. `sed -i 's/a/b/g' file.txt`
4. `git add .`
5. `rm -rf demo`
6. `Set-Content -Path test.txt -Value "x"`

## Expected allow after PLAN+READ evidence
1. `apply_patch ...`
2. `write_file ...`
3. `copy-item src dst`

## Evidence token smoke check
1. Include `WG_PLAN_GATE_OK` in PLAN output.
2. Include `WG_READ_GATE_OK` in READ output.
3. Confirm write command is unblocked when both exist in recent context.
