#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const pkgPath = path.join(root, "package.json");
const pluginPath = path.join(root, "openclaw.plugin.json");
const canonicalPath = path.join(root, "OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md");
const indexPath = path.join(root, "index.ts");
const readmePath = path.join(root, "README.md");
const govSetupSkillPath = path.join(root, "skills", "gov_setup", "SKILL.md");
const govMigrateSkillPath = path.join(root, "skills", "gov_migrate", "SKILL.md");
const govAuditSkillPath = path.join(root, "skills", "gov_audit", "SKILL.md");
const govApplySkillPath = path.join(root, "skills", "gov_apply", "SKILL.md");
const govOpenclawJsonSkillPath = path.join(root, "skills", "gov_openclaw_json", "SKILL.md");
const govBrainAuditSkillPath = path.join(root, "skills", "gov_brain_audit", "SKILL.md");
const govUninstallSkillPath = path.join(root, "skills", "gov_uninstall", "SKILL.md");
const migrationPromptPath = path.join(root, "WORKSPACE_GOVERNANCE_MIGRATION.md");
const publicFlowRegressionPath = path.join(root, "dev", "OPENCLAW_PUBLIC_FLOW_REGRESSION.md");
const govSetupRunnerPath = path.join(root, "tools", "gov_setup_sync.mjs");
const govMigrateRunnerPath = path.join(root, "tools", "gov_migrate_sync.mjs");
const govAuditRunnerPath = path.join(root, "tools", "gov_audit_sync.mjs");
const govApplyRunnerPath = path.join(root, "tools", "gov_apply_sync.mjs");
const govUninstallRunnerPath = path.join(root, "tools", "gov_uninstall_sync.mjs");
const runtimeRegressionPath = path.join(root, "dev", "run_runtime_regression.mjs");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function normalizeLf(s) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n?$/, "\n");
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

const pkg = readJson(pkgPath);
const plugin = readJson(pluginPath);

if (pkg.version !== plugin.version) {
  fail(`version mismatch package.json=${pkg.version} openclaw.plugin.json=${plugin.version}`);
} else {
  console.log(`PASS: version aligned (${pkg.version})`);
}

const canonical = fs.readFileSync(canonicalPath, "utf8");
const blockRe = /<<BEGIN FILE: ([^>]+)>>\r?\n([\s\S]*?)\r?\n<<END FILE>>/g;
const mismatches = [];
const requiredEmbeddedBlocks = new Set([
  "README.md",
  "prompts/governance/APPLY_UPGRADE_FROM_BOOT.md",
  "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
  "skills/gov_migrate/SKILL.md",
  "skills/gov_audit/SKILL.md",
  "skills/gov_apply/SKILL.md",
  "skills/gov_openclaw_json/SKILL.md",
  "skills/gov_brain_audit/SKILL.md",
]);
const embeddedSeen = new Set();

let m;
while ((m = blockRe.exec(canonical)) !== null) {
  const blockPath = m[1].trim();
  if (!requiredEmbeddedBlocks.has(blockPath)) continue;
  embeddedSeen.add(blockPath);
  const embedded = normalizeLf(m[2]);
  const actualRel = blockPath.startsWith("prompts/governance/")
    ? blockPath.replace(/^prompts\/governance\//, "")
    : blockPath;
  const actualPath = path.join(root, actualRel);
  if (!fs.existsSync(actualPath)) {
    mismatches.push(`${blockPath} -> missing actual file`);
    continue;
  }
  const actual = normalizeLf(fs.readFileSync(actualPath, "utf8"));
  if (embedded !== actual) {
    mismatches.push(`${blockPath} -> embedded payload differs`);
  }
}

for (const required of requiredEmbeddedBlocks) {
  if (!embeddedSeen.has(required)) {
    mismatches.push(`${required} -> missing embedded payload block in canonical source`);
  }
}

if (mismatches.length > 0) {
  for (const item of mismatches) fail(item);
} else {
  console.log("PASS: embedded canonical payloads aligned (plugin-local blocks)");
}

if (!process.exitCode) {
  const govSetupSkill = fs.readFileSync(govSetupSkillPath, "utf8");
  const govMigrateSkill = fs.readFileSync(govMigrateSkillPath, "utf8");
  const govAuditSkill = fs.readFileSync(govAuditSkillPath, "utf8");
  const govApplySkill = fs.readFileSync(govApplySkillPath, "utf8");
  const govOpenclawJsonSkill = fs.readFileSync(govOpenclawJsonSkillPath, "utf8");
  const govBrainAuditSkill = fs.readFileSync(govBrainAuditSkillPath, "utf8");
  const govUninstallSkill = fs.readFileSync(govUninstallSkillPath, "utf8");
  const readme = fs.readFileSync(readmePath, "utf8");
  const migrationPrompt = fs.readFileSync(migrationPromptPath, "utf8");
  const publicFlowRegression = fs.readFileSync(publicFlowRegressionPath, "utf8");
  const govSetupRunner = fs.readFileSync(govSetupRunnerPath, "utf8");
  const runtimeRegression = fs.readFileSync(runtimeRegressionPath, "utf8");
  const indexTs = fs.readFileSync(indexPath, "utf8");

  const requiredPolicyChecks = [
    {
      ok: /Never return `SKIPPED \(No-op upgrade\)`/i.test(govSetupSkill),
      msg: "gov_setup skill missing explicit no-no-op-upgrade rule",
    },
    {
      ok:
        /file_sync_summary/i.test(govSetupSkill) &&
        /NOT_INSTALLED\s*`?\s*\/\s*`?PARTIAL\s*`?\s*\/\s*`?READY/i.test(govSetupSkill),
      msg: "gov_setup check mode missing deterministic sync status contract",
    },
    {
      ok: /tools\/gov_setup_sync\.mjs/i.test(govSetupSkill),
      msg: "gov_setup skill missing deterministic runner contract",
    },
    {
      ok:
        /First adoption:\s*run `OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE\.md`/i.test(govSetupSkill) &&
        /Existing workspace:\s*run `\/gov_migrate`, then `\/gov_audit`/i.test(govSetupSkill),
      msg: "gov_setup skill missing bootstrap-first/then-migrate-audit split contract",
    },
    {
      ok: /Do not run old pre-change canonical precheck flow/i.test(govMigrateSkill),
      msg: "gov_migrate skill missing stale precheck flow rejection rule",
    },
    {
      ok: /If `_control\/GOVERNANCE_BOOTSTRAP\.md` is missing, stop and instruct the operator to run bootstrap first\./i.test(govMigrateSkill),
      msg: "gov_migrate skill missing missing-bootstrap fail-closed contract",
    },
    {
      ok:
        /fixed denominator 12\/12/i.test(govAuditSkill) &&
        /Official-flow compatibility SOP check/i.test(govAuditSkill),
      msg: "gov_audit skill missing fixed-denominator and official-flow compatibility contract",
    },
    {
      ok:
        /APPLY_UPGRADE_FROM_BOOT\.md/i.test(govApplySkill) &&
        /After apply, run migration\/audit flow/i.test(govApplySkill) &&
        /tools\/gov_apply_sync\.mjs/i.test(govApplySkill),
      msg: "gov_apply skill missing guided apply + deterministic runner + post-apply migrate/audit contract",
    },
    {
      ok:
        /~\/\.openclaw\/openclaw\.json/i.test(govOpenclawJsonSkill) &&
        /Not in scope \(hard\)/i.test(govOpenclawJsonSkill) &&
        /Brain Docs/i.test(govOpenclawJsonSkill),
      msg: "gov_openclaw_json skill missing scope boundary contract",
    },
    {
      ok:
        /read-only preview \(default\)/i.test(govBrainAuditSkill) &&
        /APPROVE:/i.test(govBrainAuditSkill) &&
        /ROLLBACK/i.test(govBrainAuditSkill),
      msg: "gov_brain_audit skill missing preview/approve/rollback contract",
    },
    {
      ok: /Do NOT run canonical equality as a pre-change blocker/i.test(migrationPrompt),
      msg: "migration prompt missing anti-prechange canonical equality rule",
    },
    {
      ok:
        /registerDeterministicGovCommands/i.test(indexTs) &&
        /name:\s*"gov_setup"/i.test(indexTs) &&
        /name:\s*"gov_migrate"/i.test(indexTs) &&
        /name:\s*"gov_apply"/i.test(indexTs) &&
        /name:\s*"gov_uninstall"/i.test(indexTs) &&
        /name:\s*"gov_audit"/i.test(indexTs),
      msg: "index.ts missing deterministic gov command registration (setup/migrate/apply/uninstall/audit)",
    },
    {
      ok:
        /gov_setup_sync\.mjs/i.test(indexTs) &&
        /gov_migrate_sync\.mjs/i.test(indexTs) &&
        /gov_apply_sync\.mjs/i.test(indexTs) &&
        /gov_uninstall_sync\.mjs/i.test(indexTs) &&
        /gov_audit_sync\.mjs/i.test(indexTs),
      msg: "index.ts missing deterministic runner wiring for gov_setup/gov_migrate/gov_apply/gov_uninstall/gov_audit",
    },
    {
      ok:
        /name:\s*gov_uninstall/i.test(govUninstallSkill) &&
        /tools\/gov_uninstall_sync\.mjs/i.test(govUninstallSkill),
      msg: "gov_uninstall skill missing deterministic runner contract",
    },
    {
      ok:
        /BOOTSTRAP_THEN_MIGRATE_AUDIT/i.test(govSetupRunner) &&
        /mode === "install"/i.test(govSetupRunner),
      msg: "gov_setup runner missing install->bootstrap-first next_action contract",
    },
    {
      ok:
        /BOOTSTRAP_THEN_MIGRATE_AUDIT/i.test(indexTs) &&
        /Run bootstrap first\./i.test(indexTs) &&
        /prompts\/governance\/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE\.md/i.test(indexTs),
      msg: "index.ts missing install success bootstrap-first guidance contract",
    },
    {
      ok:
        /missing_required:/i.test(indexTs) &&
        /Bootstrap files are missing\./i.test(indexTs) &&
        /MISSING_REQUIRED_FILES/i.test(indexTs) &&
        /prompts\/governance\/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE\.md/i.test(indexTs),
      msg: "index.ts missing migrate missing-required bootstrap remediation contract",
    },
    {
      ok:
        /Phase B3: First-Install Bootstrap Routing Integrity/i.test(publicFlowRegression) &&
        /MISSING_REQUIRED_FILES/i.test(publicFlowRegression) &&
        /OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE\.md/i.test(publicFlowRegression),
      msg: "public-flow regression plan missing first-install bootstrap routing guard case",
    },
    {
      ok:
        /Phase B0: First-Install \+ Control-Plane Alignment/i.test(publicFlowRegression) &&
        /\/gov_openclaw_json/i.test(publicFlowRegression) &&
        /\/gov_setup install/i.test(publicFlowRegression),
      msg: "public-flow regression plan missing mandatory install/openclaw_json acceptance branch",
    },
    {
      ok:
        /Phase B4: Migrate Deep-Dive/i.test(publicFlowRegression) &&
        /Case M1/i.test(publicFlowRegression) &&
        /Case M2/i.test(publicFlowRegression) &&
        /Case M3/i.test(publicFlowRegression) &&
        /Case M4/i.test(publicFlowRegression) &&
        /Case M5/i.test(publicFlowRegression) &&
        /Case M6/i.test(publicFlowRegression),
      msg: "public-flow regression plan missing grounded migrate deep-dive matrix",
    },
    {
      ok:
        /Phase B5: BOOT Apply Deep-Dive/i.test(publicFlowRegression) &&
        /Case A1/i.test(publicFlowRegression) &&
        /Case A2/i.test(publicFlowRegression) &&
        /Case A3/i.test(publicFlowRegression) &&
        /Case A4/i.test(publicFlowRegression) &&
        /Case A5/i.test(publicFlowRegression),
      msg: "public-flow regression plan missing apply deep-dive matrix",
    },
    {
      ok:
        /Permissive-context governance tool exposure guard/i.test(publicFlowRegression) &&
        /default/i.test(publicFlowRegression) &&
        /agents\.list\.main/i.test(publicFlowRegression) &&
        /explicit `\/gov_setup check`/i.test(publicFlowRegression),
      msg: "public-flow regression plan missing permissive-context governance tool-exposure guard acceptance case",
    },
    {
      ok:
        /setup-check-allow-missing/i.test(runtimeRegression) &&
        /setup-install/i.test(runtimeRegression) &&
        /migrate-missing-control/i.test(runtimeRegression) &&
        /migrate-missing-prompts/i.test(runtimeRegression) &&
        /migrate-pass/i.test(runtimeRegression) &&
        /apply-invalid-item/i.test(runtimeRegression) &&
        /apply-missing-menu/i.test(runtimeRegression) &&
        /apply-pass-qc/i.test(runtimeRegression) &&
        /apply-pass-guard/i.test(runtimeRegression),
      msg: "runtime regression runner missing grounded setup/migrate/apply command-flow cases",
    },
    {
      ok:
        /openclaw-workspace-governance\.gov_setup/i.test(runtimeRegression) &&
        /toolExposureGuard:\s*\{\s*mode:\s*"advisory"/i.test(runtimeRegression) &&
        /sessionKey:\s*"s12",\s*channel:\s*"default"/i.test(runtimeRegression) &&
        /sessionKey:\s*"s12b"/i.test(runtimeRegression) &&
        /sessionKey:\s*"s13",\s*channel:\s*"default"/i.test(runtimeRegression) &&
        /requireExplicitGovCommandIntent:\s*false/i.test(runtimeRegression),
      msg: "runtime regression runner missing permissive-context governance tool-exposure enforce/advisory cases",
    },
    {
      ok:
        /Shared Allowlist Quick Fix/i.test(readme) &&
        /prompts\/governance\/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE\.md/i.test(readme) &&
        /\/gov_setup install/i.test(readme) &&
        /\/gov_audit/i.test(readme),
      msg: "README missing shared allowlist section or install->bootstrap->audit guidance",
    },
  ];

  for (const check of requiredPolicyChecks) {
    if (!check.ok) fail(check.msg);
  }
  if (!fs.existsSync(govSetupRunnerPath)) {
    fail("missing deterministic gov_setup runner: tools/gov_setup_sync.mjs");
  }
  if (!fs.existsSync(govMigrateRunnerPath)) {
    fail("missing deterministic gov_migrate runner: tools/gov_migrate_sync.mjs");
  }
  if (!fs.existsSync(govAuditRunnerPath)) {
    fail("missing deterministic gov_audit runner: tools/gov_audit_sync.mjs");
  }
  if (!fs.existsSync(govApplyRunnerPath)) {
    fail("missing deterministic gov_apply runner: tools/gov_apply_sync.mjs");
  }
  if (!fs.existsSync(govUninstallRunnerPath)) {
    fail("missing deterministic gov_uninstall runner: tools/gov_uninstall_sync.mjs");
  }

  if (!process.exitCode) {
    console.log("PASS: governance anti-self-lock policy checks");
  }
}

if (!process.exitCode) {
  console.log("ALL_CHECKS_PASS");
}
