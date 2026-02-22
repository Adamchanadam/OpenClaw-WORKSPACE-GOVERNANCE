#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const allowedModes = new Set(["check", "uninstall"]);

const promptTargets = [
  "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
  "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
  "prompts/governance/APPLY_UPGRADE_FROM_BOOT.md",
  "prompts/governance/WORKSPACE_GOVERNANCE_README.md",
  "prompts/governance/manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md",
  "prompts/governance/manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md",
];

const controlTargets = [
  "_control/GOVERNANCE_BOOTSTRAP.md",
  "_control/PRESETS.md",
  "_control/REGRESSION_CHECK.md",
  "_control/WORKSPACE_INDEX.md",
  "_control/DECISIONS.md",
  "_control/LESSONS.md",
  "_control/RULES.md",
  "_control/ACTIVE_GUARDS.md",
];

const governanceSkillDirs = [
  "skills/gov_setup",
  "skills/gov_migrate",
  "skills/gov_audit",
  "skills/gov_apply",
  "skills/gov_openclaw_json",
  "skills/gov_brain_audit",
  "skills/gov_uninstall",
];

const runFileRegex = [
  /^bootstrap_governance_/i,
  /^gov_setup_upgrade_/i,
  /^migrate_governance_/i,
  /^gov_audit_/i,
  /^boot_apply_/i,
  /^autogen_marker_fix_/i,
  /^migrate_drift_fix_/i,
  /^gov_uninstall_/i,
];

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    "_" +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes()) +
    p(d.getUTCSeconds())
  );
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function detectOpenclawJsonPath() {
  const candidates = [];
  if (process.env.OPENCLAW_CONFIG) candidates.push(process.env.OPENCLAW_CONFIG);
  const home = os.homedir();
  if (home) candidates.push(path.join(home, ".openclaw", "openclaw.json"));
  if (process.env.USERPROFILE) {
    candidates.push(path.join(process.env.USERPROFILE, ".openclaw", "openclaw.json"));
  }
  for (const candidate of candidates) {
    if (candidate && exists(candidate)) return path.resolve(candidate);
  }
  return "";
}

function detectWorkspaceRoot(openclawJsonPath) {
  const envCandidates = [
    process.env.OPENCLAW_WORKSPACE,
    process.env.OPENCLAW_WORKSPACE_ROOT,
  ].filter(Boolean);
  for (const candidate of envCandidates) {
    if (candidate && exists(candidate)) return path.resolve(candidate);
  }

  if (openclawJsonPath) {
    const cfg = readJsonSafe(openclawJsonPath);
    const configured = cfg?.agents?.defaults?.workspace;
    if (typeof configured === "string" && configured.trim()) {
      return path.resolve(configured.trim());
    }
  }

  const cwd = process.cwd();
  if (exists(path.join(cwd, "AGENTS.md")) || exists(path.join(cwd, "_control"))) {
    return path.resolve(cwd);
  }

  const home = os.homedir();
  if (home) return path.join(home, ".openclaw", "workspace");
  return path.resolve(".");
}

function normalizeRel(p) {
  return String(p).replace(/\\/g, "/");
}

function toAbs(root, rel) {
  return path.resolve(root, rel);
}

function safeRelative(root, target) {
  const rel = path.relative(root, target);
  if (!rel || rel === ".") return "";
  if (rel.startsWith("..")) {
    throw new Error(`path escapes workspace root: ${target}`);
  }
  return normalizeRel(rel);
}

function copyForBackup(sourcePath, backupRoot, workspaceRoot) {
  const rel = safeRelative(workspaceRoot, sourcePath);
  const backupPath = path.join(backupRoot, rel);
  ensureDir(path.dirname(backupPath));
  const stat = fs.statSync(sourcePath);
  if (stat.isDirectory()) {
    fs.cpSync(sourcePath, backupPath, { recursive: true, force: true });
  } else {
    fs.copyFileSync(sourcePath, backupPath);
  }
  return backupPath;
}

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function maybeRemoveEmptyDir(dirPath) {
  if (!exists(dirPath)) return false;
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) return false;
  const entries = fs.readdirSync(dirPath);
  if (entries.length > 0) return false;
  fs.rmdirSync(dirPath);
  return true;
}

function isGovernanceBootDoc(filePath) {
  if (!exists(filePath)) return false;
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return (
      text.includes("BOOT.md — Startup Audit") ||
      text.includes("BOOT UPGRADE MENU (BOOT+APPLY v1)")
    );
  } catch {
    return false;
  }
}

function isGovernanceAgentsDoc(filePath) {
  if (!exists(filePath)) return false;
  try {
    const text = fs.readFileSync(filePath, "utf8");
    return (
      text.includes("Workspace Agent Loader ->Governance Router") ||
      text.includes("AUTOGEN:BEGIN AGENTS_CORE_v1")
    );
  } catch {
    return false;
  }
}

function findLatestBootstrapBackup(workspaceRoot) {
  const archiveRoot = path.join(workspaceRoot, "archive");
  if (!exists(archiveRoot)) return "";
  const dirs = fs
    .readdirSync(archiveRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^_bootstrap_backup_\d{8}_\d{6}$/i.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  if (dirs.length === 0) return "";
  return path.join(archiveRoot, dirs[0]);
}

function collectRestorePlan(workspaceRoot, latestBootstrapBackup) {
  if (!latestBootstrapBackup || !exists(latestBootstrapBackup)) return [];
  const restore = [];

  const agentsLegacy = path.join(latestBootstrapBackup, "AGENTS_legacy.md");
  const agentsBackup = path.join(latestBootstrapBackup, "AGENTS.md");
  if (exists(agentsLegacy)) {
    restore.push({ from: agentsLegacy, to: toAbs(workspaceRoot, "AGENTS.md") });
  } else if (exists(agentsBackup)) {
    restore.push({ from: agentsBackup, to: toAbs(workspaceRoot, "AGENTS.md") });
  }

  for (const rel of controlTargets) {
    const src = path.join(latestBootstrapBackup, rel);
    if (exists(src)) restore.push({ from: src, to: toAbs(workspaceRoot, rel) });
  }

  const bootBackup = path.join(latestBootstrapBackup, "BOOT.md");
  if (exists(bootBackup)) restore.push({ from: bootBackup, to: toAbs(workspaceRoot, "BOOT.md") });

  const playbookBackup = path.join(latestBootstrapBackup, "docs", "AGENT_PLAYBOOK.md");
  if (exists(playbookBackup)) {
    restore.push({
      from: playbookBackup,
      to: toAbs(workspaceRoot, path.join("docs", "AGENT_PLAYBOOK.md")),
    });
  }

  return restore;
}

function listGovernanceRunFiles(workspaceRoot) {
  const runsRoot = path.join(workspaceRoot, "_runs");
  if (!exists(runsRoot)) return [];
  const entries = fs.readdirSync(runsRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && runFileRegex.some((re) => re.test(e.name)))
    .map((e) => path.join(runsRoot, e.name));
}

function collectFootprint(workspaceRoot) {
  const items = [];

  const promptsGovernanceDir = path.join(workspaceRoot, "prompts", "governance");
  if (exists(promptsGovernanceDir)) items.push(promptsGovernanceDir);

  for (const rel of promptTargets) {
    const p = toAbs(workspaceRoot, rel);
    if (exists(p)) items.push(p);
  }
  for (const rel of governanceSkillDirs) {
    const p = toAbs(workspaceRoot, rel);
    if (exists(p)) items.push(p);
  }
  for (const rel of controlTargets) {
    const p = toAbs(workspaceRoot, rel);
    if (exists(p)) items.push(p);
  }

  const bootPath = toAbs(workspaceRoot, "BOOT.md");
  if (isGovernanceBootDoc(bootPath)) items.push(bootPath);

  const playbookPath = toAbs(workspaceRoot, path.join("docs", "AGENT_PLAYBOOK.md"));
  if (exists(playbookPath)) {
    try {
      const text = fs.readFileSync(playbookPath, "utf8");
      if (text.includes("Governance SSOT")) items.push(playbookPath);
    } catch {
      // ignore unreadable playbook
    }
  }

  const governanceRuns = listGovernanceRunFiles(workspaceRoot);
  items.push(...governanceRuns);

  return Array.from(new Set(items.map((p) => path.resolve(p))));
}

function writeRunReport(params) {
  const {
    runReportPath,
    ts,
    workspaceRoot,
    backupRoot,
    latestBootstrapBackup,
    mode,
    filesRead,
    targetsToChange,
    removed,
    restored,
    warnings,
    status,
    reason,
  } = params;
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# gov_uninstall_${ts}`);
  lines.push("");
  lines.push(`- mode: ${mode}`);
  lines.push(`- status: ${status}`);
  if (reason) lines.push(`- reason: ${reason}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push(`- backup_root: ${backupRoot || "none"}`);
  lines.push(`- bootstrap_backup_used: ${latestBootstrapBackup || "none"}`);
  lines.push("");
  lines.push("## FILES_READ");
  for (const p of filesRead) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## TARGET_FILES_TO_CHANGE");
  if (targetsToChange.length === 0) {
    lines.push("- none");
  } else {
    for (const p of targetsToChange) lines.push(`- ${p}`);
  }
  lines.push("");
  lines.push("## REMOVED_PATHS");
  if (removed.length === 0) {
    lines.push("- none");
  } else {
    for (const p of removed) lines.push(`- ${p}`);
  }
  lines.push("");
  lines.push("## RESTORED_PATHS");
  if (restored.length === 0) {
    lines.push("- none");
  } else {
    for (const row of restored) lines.push(`- ${row.to} <= ${row.from}`);
  }
  lines.push("");
  if (warnings.length > 0) {
    lines.push("## WARNINGS");
    for (const w of warnings) lines.push(`- ${w}`);
    lines.push("");
  }
  fs.writeFileSync(runReportPath, `${lines.join("\n")}\n`, "utf8");
}

function executeGovUninstallSync(modeInput) {
  const mode = String(modeInput || "check").toLowerCase();
  if (!allowedModes.has(mode)) {
    return {
      exitCode: 2,
      result: {
        status: "BLOCKED",
        reason: "INVALID_MODE",
        mode,
        allowed_modes: Array.from(allowedModes),
      },
    };
  }

  const ts = nowStamp();
  const openclawJsonPath = detectOpenclawJsonPath();
  const workspaceRoot = detectWorkspaceRoot(openclawJsonPath);
  const latestBootstrapBackup = findLatestBootstrapBackup(workspaceRoot);
  const restorePlan = collectRestorePlan(workspaceRoot, latestBootstrapBackup);

  const agentsPath = toAbs(workspaceRoot, "AGENTS.md");
  const governanceAgents = isGovernanceAgentsDoc(agentsPath);
  const footprint = collectFootprint(workspaceRoot);
  const filesRead = [
    workspaceRoot,
    openclawJsonPath || "openclaw.json:not_found",
    latestBootstrapBackup || "archive/_bootstrap_backup_*:not_found",
  ];
  const footprintRel = footprint.map((p) => normalizeRel(path.relative(workspaceRoot, p)));

  if (mode === "check") {
    const status = footprint.length === 0 ? "CLEAN" : "RESIDUAL";
    const warnings = [];
    if (governanceAgents && restorePlan.every((x) => normalizeRel(path.relative(workspaceRoot, x.to)) !== "AGENTS.md")) {
      warnings.push("AGENTS.md appears governance-managed but no legacy AGENTS backup found.");
    }
    return {
      exitCode: 0,
      result: {
        status,
        mode,
        timestamp_utc: ts,
        workspace_root: workspaceRoot,
        platform_config_path: openclawJsonPath || null,
        latest_bootstrap_backup: latestBootstrapBackup || null,
        governance_agents_detected: governanceAgents,
        governance_residual_paths: footprintRel,
        restore_candidates: restorePlan.map((x) => ({
          from: normalizeRel(path.relative(workspaceRoot, x.from)),
          to: normalizeRel(path.relative(workspaceRoot, x.to)),
        })),
        warnings,
        next_action: status === "CLEAN" ? "NONE" : "UNINSTALL",
      },
    };
  }

  const backupRoot = path.join(workspaceRoot, "archive", `_gov_uninstall_backup_${ts}`);
  ensureDir(backupRoot);

  const removed = [];
  const restored = [];
  const warnings = [];
  const targetsToChange = [];

  for (const p of footprint) {
    if (!exists(p)) continue;
    targetsToChange.push(normalizeRel(path.relative(workspaceRoot, p)));
    copyForBackup(p, backupRoot, workspaceRoot);
    removePath(p);
    removed.push(normalizeRel(path.relative(workspaceRoot, p)));
  }

  // Restore legacy assets if bootstrap backups are available.
  for (const row of restorePlan) {
    if (!exists(row.from)) continue;
    ensureDir(path.dirname(row.to));
    fs.copyFileSync(row.from, row.to);
    restored.push({
      from: normalizeRel(path.relative(workspaceRoot, row.from)),
      to: normalizeRel(path.relative(workspaceRoot, row.to)),
    });
  }

  if (governanceAgents && restored.every((x) => x.to !== "AGENTS.md")) {
    warnings.push(
      "AGENTS.md looked governance-managed but no legacy AGENTS backup was restored. Previous file is archived under _gov_uninstall_backup.",
    );
  }

  // Remove empty directories left by cleanup.
  maybeRemoveEmptyDir(path.join(workspaceRoot, "prompts", "governance", "manual_prompt"));
  maybeRemoveEmptyDir(path.join(workspaceRoot, "prompts", "governance"));
  maybeRemoveEmptyDir(path.join(workspaceRoot, "prompts"));
  maybeRemoveEmptyDir(path.join(workspaceRoot, "skills"));
  maybeRemoveEmptyDir(path.join(workspaceRoot, "_control"));

  const runsRoot = path.join(workspaceRoot, "_runs");
  ensureDir(runsRoot);
  const runRelPath = normalizeRel(path.join("_runs", `gov_uninstall_${ts}.md`));
  const runReportPath = path.join(workspaceRoot, runRelPath);
  writeRunReport({
    runReportPath,
    ts,
    workspaceRoot,
    backupRoot: normalizeRel(path.relative(workspaceRoot, backupRoot)),
    latestBootstrapBackup: latestBootstrapBackup
      ? normalizeRel(path.relative(workspaceRoot, latestBootstrapBackup))
      : "",
    mode,
    filesRead,
    targetsToChange,
    removed,
    restored,
    warnings,
    status: "PASS",
    reason: "",
  });

  return {
    exitCode: 0,
    result: {
      status: "PASS",
      mode,
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      platform_config_path: openclawJsonPath || null,
      backup_root: normalizeRel(path.relative(workspaceRoot, backupRoot)),
      latest_bootstrap_backup: latestBootstrapBackup
        ? normalizeRel(path.relative(workspaceRoot, latestBootstrapBackup))
        : null,
      removed_paths: removed,
      restored_paths: restored,
      warnings,
      run_report: runRelPath,
      next_action: "DISABLE_OR_UNINSTALL_PLUGIN",
    },
  };
}

export function runGovUninstallSync(mode = "check") {
  return executeGovUninstallSync(mode).result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const mode = process.argv[2] || "check";
    const { exitCode, result } = executeGovUninstallSync(mode);
    console.log(JSON.stringify(result, null, 2));
    if (exitCode !== 0) process.exit(exitCode);
  } catch (err) {
    console.log(
      JSON.stringify(
        {
          status: "BLOCKED",
          reason: "RUNNER_EXCEPTION",
          error: String(err?.message || err),
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }
}
