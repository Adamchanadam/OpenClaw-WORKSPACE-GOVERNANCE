# Local Publish Runbook (Windows Host, Proven)

Purpose:
1. Record the exact publish path that has already succeeded on this machine.
2. Avoid repeated trial-and-error in future sessions.

Scope:
1. Plugin package publish: npm
2. Source release: GitHub tag + release notes
3. Installer publish: ClawHub

Working directory:
1. `workspace/prompts/governance`

## 1) Preflight (must pass first)

1. Run release gates:

```text
node dev/check_release_consistency.mjs
npx -y tsc index.ts --module NodeNext --target ES2022 --moduleResolution NodeNext --esModuleInterop --skipLibCheck --outDir dev/.tmp
node dev/run_runtime_regression.mjs
```

2. Expected:
   - `ALL_CHECKS_PASS`
   - runtime summary full pass (current baseline: `35/35`)

3. Version alignment before release:
   - `package.json` version == `openclaw.plugin.json` version

## 2) Git Release Steps (proven)

1. Stage release files (exclude `dev/.tmp/` and unrelated local artifacts):

```text
git -C workspace/prompts/governance add <release-files>
```

2. Commit:

```text
git -C workspace/prompts/governance commit -m "release: vX.Y.Z <summary>"
```

3. Tag + push:

```text
git -C workspace/prompts/governance tag -a vX.Y.Z -m "vX.Y.Z"
git -C workspace/prompts/governance push origin main
git -C workspace/prompts/governance push origin vX.Y.Z
```

## 3) npm Publish Steps (proven)

Known local pitfall:
1. Host may run npm in offline mode by environment (`NPM_CONFIG_OFFLINE=true`), causing `ENOTCACHED`.

Use this command form for network operations:

```text
$env:NPM_CONFIG_OFFLINE='false'; npm whoami
$env:NPM_CONFIG_OFFLINE='false'; npm view @adamchanadam/openclaw-workspace-governance version
$env:NPM_CONFIG_OFFLINE='false'; npm publish --access public
```

Post-check:

```text
$env:NPM_CONFIG_OFFLINE='false'; npm view @adamchanadam/openclaw-workspace-governance version
```

## 4) GitHub Release Steps (proven)

1. Prepare bilingual release notes file:
   - `.github_release_vX.Y.Z_notes.md`

2. Create release:

```text
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file .github_release_vX.Y.Z_notes.md
```

3. Verify:

```text
gh release view vX.Y.Z --json tagName,name,url,isDraft,isPrerelease
```

## 5) ClawHub Publish Steps (proven)

1. Publish installer only:

```text
npx clawhub publish ./clawhub/openclaw-workspace-governance-installer --version X.Y.Z --changelog "<short changelog>" --tags latest
```

2. Optional inspect:

```text
npx clawhub inspect openclaw-workspace-governance-installer --versions --json
```

Known note:
1. Inspect may temporarily fail with "Skill is hidden while security scan is pending". This is transient platform state, not publish failure.

## 6) Local Cleanup Rules

1. Do not commit:
   - `dev/.tmp/`
   - local reference screenshots unless intentionally part of release

2. If `dev/.tmp/` cannot be removed due ACL lock:
   - list files explicitly
   - ask operator to delete manually
   - do not use risky destructive shortcuts

## 7) Release Completion Checklist

1. Git:
   - commit exists on `main`
   - tag `vX.Y.Z` exists on remote
2. npm:
   - `npm view ... version` shows `X.Y.Z`
3. GitHub:
   - release page exists and is non-draft
4. ClawHub:
   - publish returns success id
5. Workspace:
   - only expected untracked files remain (or clean)
