# Publishing Guide (Plugin + ClawHub)

This document is for maintainers of `OpenClaw-WORKSPACE-GOVERNANCE`.

## 1. Release Strategy

Use a dual-channel release model:

1. Publish plugin package to npm (authoritative runtime distribution).
2. Publish installer skill to ClawHub (discovery and guided onboarding).

## 2. Pre-Release Checklist

1. Update version in:
   - `package.json`
   - `openclaw.plugin.json`
   - `clawhub/openclaw-workspace-governance-installer/SKILL.md` (if needed)
2. Confirm README and README.en are updated.
3. Validate required files exist:
   - `openclaw.plugin.json`
   - `index.ts`
   - `skills/gov_setup/SKILL.md`
   - `skills/gov_migrate/SKILL.md`
   - `skills/gov_audit/SKILL.md`
   - `skills/gov_apply/SKILL.md`

## 3. Publish Plugin to npm

1. Login:

```text
npm login
```

2. Dry-run package inspection:

```text
npm pack --dry-run
```

3. Publish:

```text
npm publish --access public
```

4. Verify plugin install from OpenClaw CLI:

```text
# First-time install path
openclaw plugins install @adamchanadam/openclaw-workspace-governance@<version>

# Existing installation upgrade path
openclaw plugins update openclaw-workspace-governance
openclaw gateway restart

openclaw plugins enable openclaw-workspace-governance
openclaw plugins list
openclaw skills list --eligible
```

## 4. Publish Installer Skill to ClawHub

From repository root, publish installer folder only (avoid broad sync that may publish unrelated local skills):

```text
npx clawhub publish ./clawhub/openclaw-workspace-governance-installer --version <x.y.z> --changelog "<what changed>" --tags latest
```

Recommended validation before/after publish:

```text
npx clawhub inspect openclaw-workspace-governance-installer --versions --json
```

## 5. Post-Release Validation

1. Fresh environment install via npm plugin command.
2. Fresh environment install via ClawHub installer path.
3. Run:
   - `/gov_setup check`
   - `/gov_setup install` (first adoption) OR `/gov_setup upgrade` (existing workspace)
   - `openclaw plugins update openclaw-workspace-governance` + `openclaw gateway restart` for existing installed users
   - `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md` (new workspace case)
   - `/gov_migrate` and `/gov_audit` (running workspace case)
4. Confirm BOOT flow:
   - `boot-md` enabled
   - `/gov_apply <NN>` works after BOOT menu approval.

## 6. Rollback

If a bad release is detected:

1. Pin users to previous stable version:

```text
# If plugin already exists locally, uninstall first
openclaw plugins uninstall openclaw-workspace-governance
openclaw plugins install @adamchanadam/openclaw-workspace-governance@<previous_version>
```

2. Publish a patch release with corrected files and updated changelog.
