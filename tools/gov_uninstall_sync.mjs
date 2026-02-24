#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const AGENTS_AUTOGEN_MARKER = "AGENTS_CORE_v1";

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
  /^gov_brain_audit_/i,
  /^boot_apply_/i,
  /^autogen_marker_fix_/i,
  /^migrate_drift_fix_/i,
  /^gov_uninstall_/i,
];

const brainDocTopLevelTargets = [
  "AGENTS.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "MEMORY.md",
  "HEARTBEAT.md",
  "BOOT.md",
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

function normalizeText(input) {
  return String(input).replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").replace(/\n?$/, "\n");
}

function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripAutogenBlock(text, marker) {
  const escaped = escapeRegExp(marker);
  const pairedRe = new RegExp(
    `[ \\t]*<!-- AUTOGEN:BEGIN ${escaped} -->\\r?\\n[\\s\\S]*?\\r?\\n[ \\t]*<!-- AUTOGEN:END ${escaped} -->[ \\t]*\\r?\\n?`, "g");
  let result = text.replace(pairedRe, "");
  const orphanBeginRe = new RegExp(`[ \\t]*<!-- AUTOGEN:BEGIN ${escaped} -->[ \\t]*\\r?\\n?`, "g");
  const orphanEndRe = new RegExp(`[ \\t]*<!-- AUTOGEN:END ${escaped} -->[ \\t]*\\r?\\n?`, "g");
  result = result.replace(orphanBeginRe, "").replace(orphanEndRe, "");
  return result;
}

function hasGovernanceEnforcementContent(text) {
  // General detection: any reference to _control/ governance infrastructure
  // files creates a runtime dependency. When those files are removed by
  // uninstall, the references cause deadlock (rules demand reading deleted
  // files). This is the ROOT detection — not hardcoded to any specific
  // brain doc or section header.
  const govInfraRefs = [
    "_control/GOVERNANCE_BOOTSTRAP.md",
    "_control/PRESETS.md",
    "_control/REGRESSION_CHECK.md",
  ];
  return govInfraRefs.some((ref) => text.includes(ref));
}

function stripGovernanceContentFromBrainDoc(text) {
  // General governance content stripping for ANY brain doc.
  // ROOT FIX strategy — not anchored to specific section names:
  //   1. Split into heading-delimited sections (## and below).
  //   2. Strip entire sections that contain governance infrastructure refs.
  //   3. For top-level / preamble content (# heading or before any heading),
  //      do line-level stripping of governance reference lines.
  //   4. Clean up excessive blank lines.

  const lines = text.split(/\r?\n/);
  const sections = [];
  let current = { lines: [], hasGovRef: false, level: 0 };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s/);
    if (headingMatch && current.lines.length > 0) {
      sections.push(current);
      current = { lines: [line], hasGovRef: false, level: headingMatch[1].length };
    } else {
      current.lines.push(line);
    }
    if (hasGovernanceEnforcementContent(line)) {
      current.hasGovRef = true;
    }
  }
  sections.push(current);

  const kept = [];
  for (const section of sections) {
    if (section.hasGovRef && section.level >= 2) {
      // Strip ## and below sections that reference governance infrastructure
      continue;
    }
    if (section.hasGovRef && section.level < 2) {
      // For top-level / preamble / # heading: line-level stripping
      const cleanLines = section.lines.filter((line) => {
        if (hasGovernanceEnforcementContent(line)) return false;
        const t = line.trim();
        // Strip governance-specific header/reference lines
        if (/^#\s+Workspace Agent Loader/i.test(t)) return false;
        if (/^>\s*This file is intentionally short/i.test(t)) return false;
        if (/^>\s*(Governance|Presets|QC)\s+SSOT:\s*`_control\//i.test(t)) return false;
        if (/^>\s*Operational playbook\s*\(non-SSOT\)/i.test(t)) return false;
        return true;
      });
      kept.push({ ...section, lines: cleanLines });
    } else {
      kept.push(section);
    }
  }

  let result = kept.map((s) => s.lines.join("\n")).join("\n");
  result = result.replace(/\n{3,}/g, "\n\n").trim();
  return result ? result + "\n" : "\n";
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

function findBrainDocsAutofixBackups(workspaceRoot) {
  const archiveRoot = path.join(workspaceRoot, "archive");
  if (!exists(archiveRoot)) return [];
  return fs
    .readdirSync(archiveRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^_brain_docs_autofix_\d{8}_\d{6}$/i.test(e.name))
    .map((e) => path.join(archiveRoot, e.name))
    .sort();
}

function listFilesRecursive(rootDir) {
  if (!exists(rootDir)) return [];
  const out = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  };
  walk(rootDir);
  return out;
}

function shouldRestoreBrainBackupRel(relPath) {
  const rel = normalizeRel(relPath);
  if (!rel || rel.startsWith("..")) return false;
  if (brainDocTopLevelTargets.includes(rel)) return true;
  if (rel.startsWith("_control/")) return true;
  if (rel.startsWith("memory/")) return true;
  return false;
}

function collectBrainRestorePlan(workspaceRoot, backupRoot) {
  if (!backupRoot || !exists(backupRoot)) return [];
  const files = listFilesRecursive(backupRoot);
  const out = [];
  for (const fromPath of files) {
    const rel = normalizeRel(path.relative(backupRoot, fromPath));
    if (!shouldRestoreBrainBackupRel(rel)) continue;
    out.push({
      from: fromPath,
      to: toAbs(workspaceRoot, rel),
    });
  }
  return out;
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

  // Note: governance run files are intentionally NOT included in footprint.
  // They are preserved as historical records during uninstall.

  return Array.from(new Set(items.map((p) => path.resolve(p))));
}

function runPostUninstallQC(workspaceRoot) {
  const checks = [];
  const warnings = [];

  // 1. AGENTS.md must still exist
  const agentsPath = toAbs(workspaceRoot, "AGENTS.md");
  const agentsExists = exists(agentsPath);
  checks.push({ name: "agents_md_exists", pass: agentsExists });
  if (!agentsExists) {
    warnings.push("POST_QC_FAIL: AGENTS.md does not exist after uninstall — brain doc core was lost.");
  }

  // 2. No AUTOGEN markers remain in AGENTS.md
  let noAutogenMarkers = true;
  if (agentsExists) {
    try {
      const text = fs.readFileSync(agentsPath, "utf8");
      if (text.includes("AUTOGEN:BEGIN AGENTS_CORE_v1")) {
        noAutogenMarkers = false;
        warnings.push("POST_QC_FAIL: AGENTS.md still contains AUTOGEN:BEGIN AGENTS_CORE_v1 marker after uninstall.");
      }
    } catch {
      // unreadable — treat as warning
      warnings.push("POST_QC_WARN: AGENTS.md exists but could not be read for marker scan.");
    }
  }
  checks.push({ name: "agents_md_no_autogen_markers", pass: noAutogenMarkers });

  // 3. Governance control files cleaned
  const govBootstrapPath = toAbs(workspaceRoot, "_control/GOVERNANCE_BOOTSTRAP.md");
  const regressionCheckPath = toAbs(workspaceRoot, "_control/REGRESSION_CHECK.md");
  const controlsCleaned = !exists(govBootstrapPath) && !exists(regressionCheckPath);
  checks.push({ name: "governance_control_files_cleaned", pass: controlsCleaned });
  if (!controlsCleaned) {
    warnings.push("POST_QC_FAIL: governance control files (GOVERNANCE_BOOTSTRAP.md or REGRESSION_CHECK.md) still exist.");
  }

  // 4. Governance prompts cleaned
  const govPromptPath = toAbs(workspaceRoot, "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md");
  const migPromptPath = toAbs(workspaceRoot, "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md");
  const promptsCleaned = !exists(govPromptPath) && !exists(migPromptPath);
  checks.push({ name: "governance_prompts_cleaned", pass: promptsCleaned });
  if (!promptsCleaned) {
    warnings.push("POST_QC_FAIL: governance prompt files still exist after uninstall.");
  }

  // 5. _runs/ logs intact
  const runsDir = path.join(workspaceRoot, "_runs");
  const runsIntact = exists(runsDir);
  checks.push({ name: "runs_logs_intact", pass: runsIntact });
  if (!runsIntact) {
    warnings.push("POST_QC_WARN: _runs/ directory does not exist (no historical logs).");
  }

  // 6. No governance enforcement residue in ANY brain doc
  // ROOT CHECK: scans all brain docs for _control/ infrastructure references
  let brainDocsClean = true;
  const brainDocsWithResidue = [];
  for (const brainRel of brainDocTopLevelTargets) {
    if (brainRel === "BOOT.md") continue;
    const brainPath = toAbs(workspaceRoot, brainRel);
    if (!exists(brainPath)) continue;
    try {
      const text = fs.readFileSync(brainPath, "utf8");
      if (hasGovernanceEnforcementContent(text)) {
        brainDocsClean = false;
        brainDocsWithResidue.push(brainRel);
      }
    } catch {
      // unreadable, skip
    }
  }
  checks.push({ name: "brain_docs_no_governance_residue", pass: brainDocsClean });
  if (!brainDocsClean) {
    warnings.push(
      `POST_QC_FAIL: governance enforcement residue in brain docs: ${brainDocsWithResidue.join(", ")}. These files still reference deleted _control/ infrastructure.`,
    );
  }

  const allPass = checks.every((c) => c.pass);
  return { pass: allPass, checks, warnings };
}

function writeRunReport(params) {
  const {
    runReportPath,
    ts,
    workspaceRoot,
    backupRoot,
    latestBootstrapBackup,
    brainBackupUsed,
    brainBackupStrategy,
    mode,
    filesRead,
    targetsToChange,
    removed,
    restored,
    strippedBrainDocs,
    postUninstallQC,
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
  lines.push(`- brain_backup_used: ${brainBackupUsed || "none"}`);
  lines.push(`- brain_backup_strategy: ${brainBackupStrategy || "none"}`);
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
  if (strippedBrainDocs && strippedBrainDocs.length > 0) {
    lines.push("## STRIPPED_BRAIN_DOCS");
    for (const doc of strippedBrainDocs) lines.push(`- ${doc}`);
    lines.push("");
  }
  if (postUninstallQC) {
    lines.push("## POST_UNINSTALL_QC");
    lines.push(`- overall: ${postUninstallQC.pass ? "PASS" : "FAIL"}`);
    for (const c of postUninstallQC.checks) {
      lines.push(`- ${c.name}: ${c.pass ? "PASS" : "FAIL"}`);
    }
    lines.push("");
  }
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
  const brainBackupDirs = findBrainDocsAutofixBackups(workspaceRoot);
  const oldestBrainBackup = brainBackupDirs.length > 0 ? brainBackupDirs[0] : "";
  const latestBrainBackup = brainBackupDirs.length > 0 ? brainBackupDirs[brainBackupDirs.length - 1] : "";
  const brainBackupStrategy = oldestBrainBackup ? "restore_oldest_brain_backup" : "none";
  const brainRestorePlan = collectBrainRestorePlan(workspaceRoot, oldestBrainBackup);

  const agentsPath = toAbs(workspaceRoot, "AGENTS.md");
  const governanceAgents = isGovernanceAgentsDoc(agentsPath);
  const footprint = collectFootprint(workspaceRoot);
  const filesRead = [
    workspaceRoot,
    openclawJsonPath || "openclaw.json:not_found",
    latestBootstrapBackup || "archive/_bootstrap_backup_*:not_found",
    oldestBrainBackup || "archive/_brain_docs_autofix_*:not_found",
  ];
  const footprintRel = footprint.map((p) => normalizeRel(path.relative(workspaceRoot, p)));

  if (mode === "check") {
    const warnings = [];
    // Detect governance enforcement residue in brain docs
    const brainDocResidueList = [];
    for (const brainRel of brainDocTopLevelTargets) {
      if (brainRel === "BOOT.md") continue;
      const brainCheckPath = toAbs(workspaceRoot, brainRel);
      if (!exists(brainCheckPath)) continue;
      try {
        const brainCheckText = fs.readFileSync(brainCheckPath, "utf8");
        if (hasGovernanceEnforcementContent(brainCheckText)) {
          brainDocResidueList.push(brainRel);
          warnings.push(
            `${brainRel} contains governance enforcement rules referencing _control/ infrastructure. Use /gov_uninstall uninstall to strip them.`,
          );
        }
      } catch { /* skip unreadable */ }
    }
    const status = footprint.length === 0 && brainRestorePlan.length === 0 && brainDocResidueList.length === 0 ? "CLEAN" : "RESIDUAL";
    if (governanceAgents && restorePlan.every((x) => normalizeRel(path.relative(workspaceRoot, x.to)) !== "AGENTS.md")) {
      warnings.push("AGENTS.md appears governance-managed but no legacy AGENTS backup found.");
    }
    if (brainBackupDirs.length > 0) {
      warnings.push(
        "Brain-docs autofix backups detected. Use /gov_uninstall uninstall to restore pre-apply Brain Docs state before removing plugin package.",
      );
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
        brain_docs_backup_roots_found: brainBackupDirs.map((p) =>
          normalizeRel(path.relative(workspaceRoot, p)),
        ),
        brain_docs_restore_strategy: brainBackupStrategy,
        brain_docs_restore_candidates: brainRestorePlan.map((x) => ({
          from: normalizeRel(path.relative(workspaceRoot, x.from)),
          to: normalizeRel(path.relative(workspaceRoot, x.to)),
        })),
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
  const backedUp = new Set();

  for (const p of footprint) {
    if (!exists(p)) continue;
    const rel = normalizeRel(path.relative(workspaceRoot, p));
    targetsToChange.push(rel);
    copyForBackup(p, backupRoot, workspaceRoot);
    backedUp.add(rel);
    removePath(p);
    removed.push(rel);
  }

  // Strip AUTOGEN block AND all governance enforcement content from AGENTS.md.
  // ROOT FIX: after AUTOGEN removal, also strip governance header/references
  // that exist outside the AUTOGEN block (e.g., SSOT pointers to _control/).
  const strippedBrainDocs = [];
  if (governanceAgents && exists(agentsPath)) {
    const agentsText = fs.readFileSync(agentsPath, "utf8");
    const afterAutogen = stripAutogenBlock(agentsText, AGENTS_AUTOGEN_MARKER);
    const afterGovStrip = stripGovernanceContentFromBrainDoc(afterAutogen);
    const fullyStripped = normalizeText(afterGovStrip);
    if (fullyStripped !== normalizeText(agentsText)) {
      if (!backedUp.has("AGENTS.md")) {
        copyForBackup(agentsPath, backupRoot, workspaceRoot);
        backedUp.add("AGENTS.md");
      }
      if (!targetsToChange.includes("AGENTS.md")) targetsToChange.push("AGENTS.md");
      // If stripped result is empty/minimal, try backup restore
      if (fullyStripped.trim().length === 0 || fullyStripped.trim() === "#") {
        const agentsRestoreRow =
          restorePlan.find((x) => normalizeRel(path.relative(workspaceRoot, x.to)) === "AGENTS.md") ||
          brainRestorePlan.find((x) => normalizeRel(path.relative(workspaceRoot, x.to)) === "AGENTS.md");
        if (agentsRestoreRow && exists(agentsRestoreRow.from)) {
          const backupText = fs.readFileSync(agentsRestoreRow.from, "utf8");
          if (!hasGovernanceEnforcementContent(backupText)) {
            fs.copyFileSync(agentsRestoreRow.from, agentsPath);
            restored.push({
              from: normalizeRel(path.relative(workspaceRoot, agentsRestoreRow.from)),
              to: "AGENTS.md",
            });
          } else {
            fs.writeFileSync(agentsPath, "# AGENTS.md\n", "utf8");
          }
        } else {
          fs.writeFileSync(agentsPath, "# AGENTS.md\n", "utf8");
        }
      } else {
        fs.writeFileSync(agentsPath, fullyStripped, "utf8");
      }
      strippedBrainDocs.push("AGENTS.md");
    }
  }

  // ROOT FIX: General brain-doc governance residue cleanup.
  // Scan ALL brain docs (except AGENTS.md already handled above and BOOT.md
  // handled by footprint) for governance enforcement content that references
  // _control/ infrastructure. When found, strip it to prevent deadlock where
  // uninstalled governance rules reference deleted _control/* files.
  for (const brainRel of brainDocTopLevelTargets) {
    if (brainRel === "BOOT.md") continue;
    if (strippedBrainDocs.includes(brainRel)) continue;
    const brainPath = toAbs(workspaceRoot, brainRel);
    if (!exists(brainPath)) continue;
    let brainText;
    try {
      brainText = fs.readFileSync(brainPath, "utf8");
    } catch {
      continue;
    }
    if (!hasGovernanceEnforcementContent(brainText)) continue;

    // Governance enforcement content detected — clean it
    if (!backedUp.has(brainRel)) {
      copyForBackup(brainPath, backupRoot, workspaceRoot);
      backedUp.add(brainRel);
    }
    if (!targetsToChange.includes(brainRel)) targetsToChange.push(brainRel);

    // Try brain-doc backup restore if available and governance-free
    const backupRow = brainRestorePlan.find(
      (x) => normalizeRel(path.relative(workspaceRoot, x.to)) === brainRel,
    );
    let brainRestored = false;
    if (backupRow && exists(backupRow.from)) {
      try {
        const backupText = fs.readFileSync(backupRow.from, "utf8");
        if (!hasGovernanceEnforcementContent(backupText)) {
          fs.copyFileSync(backupRow.from, brainPath);
          restored.push({
            from: normalizeRel(path.relative(workspaceRoot, backupRow.from)),
            to: brainRel,
          });
          brainRestored = true;
        }
      } catch {
        // Backup unreadable, fall through to stripping
      }
    }
    if (!brainRestored) {
      const stripped = normalizeText(stripGovernanceContentFromBrainDoc(brainText));
      fs.writeFileSync(brainPath, stripped, "utf8");
    }
    strippedBrainDocs.push(brainRel);
  }

  const restoreByTo = new Map();
  for (const row of brainRestorePlan) {
    const toRel = normalizeRel(path.relative(workspaceRoot, row.to));
    restoreByTo.set(toRel, row);
  }
  // Bootstrap backup has precedence for overlapping files (e.g., AGENTS/_control).
  for (const row of restorePlan) {
    const toRel = normalizeRel(path.relative(workspaceRoot, row.to));
    restoreByTo.set(toRel, row);
  }

  // Restore legacy assets and optional brain-doc backups if available.
  for (const [toRel, row] of restoreByTo.entries()) {
    if (strippedBrainDocs.includes(toRel)) continue;
    if (!exists(row.from)) continue;
    ensureDir(path.dirname(row.to));
    if (exists(row.to) && !backedUp.has(toRel)) {
      copyForBackup(row.to, backupRoot, workspaceRoot);
      backedUp.add(toRel);
    }
    if (!targetsToChange.includes(toRel)) targetsToChange.push(toRel);
    fs.copyFileSync(row.from, row.to);
    restored.push({
      from: normalizeRel(path.relative(workspaceRoot, row.from)),
      to: toRel,
    });
  }

  if (governanceAgents && !strippedBrainDocs.includes("AGENTS.md") && restored.every((x) => x.to !== "AGENTS.md")) {
    warnings.push(
      "AGENTS.md looked governance-managed but no AUTOGEN block was stripped and no legacy AGENTS backup was restored. Previous file is archived under _gov_uninstall_backup.",
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

  // Post-uninstall QC verification (after ensureDir so _runs/ check is accurate)
  const postUninstallQC = runPostUninstallQC(workspaceRoot);
  if (postUninstallQC.warnings.length > 0) {
    warnings.push(...postUninstallQC.warnings);
  }
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
    brainBackupUsed: oldestBrainBackup
      ? normalizeRel(path.relative(workspaceRoot, oldestBrainBackup))
      : "",
    brainBackupStrategy,
    mode,
    filesRead,
    targetsToChange,
    removed,
    restored,
    strippedBrainDocs,
    postUninstallQC,
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
      brain_backup_used: oldestBrainBackup
        ? normalizeRel(path.relative(workspaceRoot, oldestBrainBackup))
        : null,
      latest_brain_backup_detected: latestBrainBackup
        ? normalizeRel(path.relative(workspaceRoot, latestBrainBackup))
        : null,
      brain_backup_strategy: brainBackupStrategy,
      removed_paths: removed,
      restored_paths: restored,
      stripped_brain_docs: strippedBrainDocs,
      post_uninstall_qc: postUninstallQC,
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
