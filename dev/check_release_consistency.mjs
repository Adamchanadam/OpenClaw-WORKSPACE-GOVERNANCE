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
const govSetupSkillPath = path.join(root, "skills", "gov_setup", "SKILL.md");
const govMigrateSkillPath = path.join(root, "skills", "gov_migrate", "SKILL.md");
const govUninstallSkillPath = path.join(root, "skills", "gov_uninstall", "SKILL.md");
const migrationPromptPath = path.join(root, "WORKSPACE_GOVERNANCE_MIGRATION.md");
const govSetupRunnerPath = path.join(root, "tools", "gov_setup_sync.mjs");
const govMigrateRunnerPath = path.join(root, "tools", "gov_migrate_sync.mjs");
const govAuditRunnerPath = path.join(root, "tools", "gov_audit_sync.mjs");
const govUninstallRunnerPath = path.join(root, "tools", "gov_uninstall_sync.mjs");

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
  const govUninstallSkill = fs.readFileSync(govUninstallSkillPath, "utf8");
  const migrationPrompt = fs.readFileSync(migrationPromptPath, "utf8");
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
      ok: /Do not run old pre-change canonical precheck flow/i.test(govMigrateSkill),
      msg: "gov_migrate skill missing stale precheck flow rejection rule",
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
        /name:\s*"gov_uninstall"/i.test(indexTs) &&
        /name:\s*"gov_audit"/i.test(indexTs),
      msg: "index.ts missing deterministic gov command registration (setup/migrate/uninstall/audit)",
    },
    {
      ok:
        /gov_setup_sync\.mjs/i.test(indexTs) &&
        /gov_migrate_sync\.mjs/i.test(indexTs) &&
        /gov_uninstall_sync\.mjs/i.test(indexTs) &&
        /gov_audit_sync\.mjs/i.test(indexTs),
      msg: "index.ts missing deterministic runner wiring for gov_setup/gov_migrate/gov_uninstall/gov_audit",
    },
    {
      ok:
        /name:\s*gov_uninstall/i.test(govUninstallSkill) &&
        /tools\/gov_uninstall_sync\.mjs/i.test(govUninstallSkill),
      msg: "gov_uninstall skill missing deterministic runner contract",
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
