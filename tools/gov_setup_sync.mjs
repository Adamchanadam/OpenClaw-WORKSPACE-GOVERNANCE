#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginRoot = path.resolve(__dirname, "..");

const allowedModes = new Set(["check", "install", "upgrade"]);

const requiredFileMap = [
  {
    sourceRel: "OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
    targetRel: "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
  },
  {
    sourceRel: "WORKSPACE_GOVERNANCE_MIGRATION.md",
    targetRel: "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
  },
  {
    sourceRel: "APPLY_UPGRADE_FROM_BOOT.md",
    targetRel: "prompts/governance/APPLY_UPGRADE_FROM_BOOT.md",
  },
  {
    sourceRel: "WORKSPACE_GOVERNANCE_README.md",
    targetRel: "prompts/governance/WORKSPACE_GOVERNANCE_README.md",
  },
  {
    sourceRel: "manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md",
    targetRel: "prompts/governance/manual_prompt/MIGRATION_prompt_for_RUNNING_OpenClaw.md",
  },
  {
    sourceRel: "manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md",
    targetRel: "prompts/governance/manual_prompt/POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md",
  },
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

function normalizeText(input) {
  return String(input)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n?$/, "\n");
}

function readNormalized(filePath) {
  return normalizeText(fs.readFileSync(filePath, "utf8"));
}

function sha12(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
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
  if (home) {
    candidates.push(path.join(home, ".openclaw", "openclaw.json"));
  }
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
  if (exists(path.join(cwd, "prompts")) || exists(path.join(cwd, "_control"))) {
    return path.resolve(cwd);
  }

  const home = os.homedir();
  if (home) return path.join(home, ".openclaw", "workspace");
  return path.resolve(".");
}

function classifyAllowStatus(openclawJsonPath) {
  if (!openclawJsonPath || !exists(openclawJsonPath)) {
    return { allow_status: "ALLOW_NOT_SET", allowlist_alignment_required: true };
  }
  const cfg = readJsonSafe(openclawJsonPath);
  const allow = cfg?.plugins?.allow;
  if (!Array.isArray(allow)) {
    return { allow_status: "ALLOW_NOT_SET", allowlist_alignment_required: true };
  }
  if (allow.length === 0) {
    return { allow_status: "ALLOW_EMPTY", allowlist_alignment_required: true };
  }
  if (!allow.includes("openclaw-workspace-governance")) {
    return { allow_status: "ALLOW_MISSING_GOV", allowlist_alignment_required: true };
  }
  return { allow_status: "ALLOW_OK", allowlist_alignment_required: false };
}

/**
 * Ensure openclaw.json exists and plugins.allow contains "openclaw-workspace-governance".
 * Preserves all existing config and allowlist entries.
 * Returns { aligned, action, previous_allow }.
 */
function alignAllowlistEntry(openclawJsonPath) {
  const GOV_ID = "openclaw-workspace-governance";
  if (!openclawJsonPath) {
    return { aligned: false, action: "NO_CONFIG_PATH", previous_allow: null };
  }
  try {
    let cfg = {};
    if (exists(openclawJsonPath)) {
      cfg = readJsonSafe(openclawJsonPath) || {};
    } else {
      fs.mkdirSync(path.dirname(openclawJsonPath), { recursive: true });
    }
    if (!cfg.plugins || typeof cfg.plugins !== "object") cfg.plugins = {};
    const prev = Array.isArray(cfg.plugins.allow) ? [...cfg.plugins.allow] : null;
    if (!Array.isArray(cfg.plugins.allow)) {
      cfg.plugins.allow = [GOV_ID];
    } else if (!cfg.plugins.allow.includes(GOV_ID)) {
      cfg.plugins.allow.push(GOV_ID);
    } else {
      return { aligned: true, action: "ALREADY_OK", previous_allow: prev };
    }
    fs.writeFileSync(openclawJsonPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
    return { aligned: true, action: prev === null ? "CREATED" : "APPENDED", previous_allow: prev };
  } catch (err) {
    return { aligned: false, action: "WRITE_FAILED", previous_allow: null, error: String(err?.message || err) };
  }
}

function collectFileStates(workspaceRoot) {
  const states = [];
  const missingSources = [];
  for (const item of requiredFileMap) {
    const sourcePath = path.join(pluginRoot, item.sourceRel);
    const targetPath = path.join(workspaceRoot, item.targetRel);
    if (!exists(sourcePath)) {
      missingSources.push(sourcePath);
      states.push({ sourcePath, targetPath, state: "SOURCE_MISSING" });
      continue;
    }
    if (!exists(targetPath)) {
      states.push({ sourcePath, targetPath, state: "MISSING" });
      continue;
    }
    const sourceNorm = readNormalized(sourcePath);
    const targetNorm = readNormalized(targetPath);
    if (sourceNorm === targetNorm) {
      states.push({
        sourcePath,
        targetPath,
        state: "IN_SYNC",
        source_sha12: sha12(sourceNorm),
        target_sha12: sha12(targetNorm),
      });
    } else {
      states.push({
        sourcePath,
        targetPath,
        state: "OUT_OF_SYNC",
        source_sha12: sha12(sourceNorm),
        target_sha12: sha12(targetNorm),
      });
    }
  }
  return { states, missingSources };
}

function summarizeStates(states) {
  const summary = { MISSING: 0, OUT_OF_SYNC: 0, IN_SYNC: 0, SOURCE_MISSING: 0 };
  for (const row of states) {
    if (Object.prototype.hasOwnProperty.call(summary, row.state)) summary[row.state] += 1;
  }
  return summary;
}

function detectWorkspaceGovSkillDirs(workspaceRoot) {
  const skillsRoot = path.join(workspaceRoot, "skills");
  if (!exists(skillsRoot)) return [];
  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && /^gov_[a-z_]+$/i.test(e.name))
    .map((e) => path.join(skillsRoot, e.name));
}

function movePath(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  try {
    fs.renameSync(sourcePath, targetPath);
    return;
  } catch (err) {
    const code = String(err?.code || "");
    if (code !== "EXDEV") throw err;
  }
  fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
  fs.rmSync(sourcePath, { recursive: true, force: true });
}

function executeGovSetupSync(modeInput) {
  const mode = String(modeInput || "install").toLowerCase();
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
  const allow = classifyAllowStatus(openclawJsonPath);
  const { states, missingSources } = collectFileStates(workspaceRoot);
  const summary = summarizeStates(states);
  const promptsRoot = path.join(workspaceRoot, "prompts", "governance");
  const shadowSkillDirsDetected = detectWorkspaceGovSkillDirs(workspaceRoot);

  if (missingSources.length > 0) {
    return {
      exitCode: 2,
      result: {
        status: "BLOCKED",
        reason: "SOURCE_MISSING",
        mode,
        timestamp_utc: ts,
        plugin_root: pluginRoot,
        workspace_root: workspaceRoot,
        missing_sources: missingSources,
      },
    };
  }

  if (mode === "check") {
    const hasAnyTarget = states.some((x) => x.state !== "SOURCE_MISSING");
    const targetExists = exists(promptsRoot);
    let status = "READY";
    if (!targetExists || (summary.MISSING > 0 && !hasAnyTarget)) status = "NOT_INSTALLED";
    if (summary.MISSING > 0 || summary.OUT_OF_SYNC > 0) status = targetExists ? "PARTIAL" : "NOT_INSTALLED";
    if (status === "READY" && shadowSkillDirsDetected.length > 0) status = "PARTIAL";
    const nextAction =
      allow.allow_status !== "ALLOW_OK"
        ? "ALIGN_ALLOWLIST"
        : shadowSkillDirsDetected.length > 0
          ? "UPGRADE_RECONCILE_SHADOW_SKILLS"
          : status === "NOT_INSTALLED"
            ? "INSTALL"
            : status === "PARTIAL"
              ? "UPGRADE"
              : "MIGRATE_AUDIT";
    return {
      exitCode: 0,
      result: {
        status,
        mode,
        timestamp_utc: ts,
        plugin_root: pluginRoot,
        workspace_root: workspaceRoot,
        platform_config_path: openclawJsonPath || null,
        ...allow,
        file_sync_summary: summary,
        file_states: states,
        shadow_reconcile_required: shadowSkillDirsDetected.length > 0,
        next_action: nextAction,
        workspace_gov_skill_dirs_detected: shadowSkillDirsDetected,
      },
    };
  }

  ensureDir(path.join(workspaceRoot, "prompts", "governance", "manual_prompt"));
  const backupRoot = mode === "upgrade" ? path.join(workspaceRoot, "archive", `_gov_setup_backup_${ts}`) : "";
  if (backupRoot) ensureDir(backupRoot);

  const copied = [];
  for (const item of requiredFileMap) {
    const sourcePath = path.join(pluginRoot, item.sourceRel);
    const targetPath = path.join(workspaceRoot, item.targetRel);
    const beforeExists = exists(targetPath);
    const beforeNorm = beforeExists ? readNormalized(targetPath) : "";
    const sourceNorm = readNormalized(sourcePath);

    if (mode === "upgrade" && beforeExists) {
      const backupPath = path.join(backupRoot, item.targetRel);
      ensureDir(path.dirname(backupPath));
      fs.copyFileSync(targetPath, backupPath);
    }

    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
    const changed = !beforeExists || beforeNorm !== sourceNorm;
    copied.push({
      source_path: sourcePath,
      target_path: targetPath,
      changed,
      source_sha12: sha12(sourceNorm),
      target_sha12: sha12(readNormalized(targetPath)),
    });
  }

  const shadowSkillDirs = detectWorkspaceGovSkillDirs(workspaceRoot);
  const shadowMoves = [];
  if (shadowSkillDirs.length > 0) {
    const shadowBackupRoot = path.join(workspaceRoot, "archive", `_gov_setup_shadow_backup_${ts}`, "skills");
    ensureDir(shadowBackupRoot);
    for (const oldDir of shadowSkillDirs) {
      const dest = path.join(shadowBackupRoot, path.basename(oldDir));
      movePath(oldDir, dest);
      shadowMoves.push({ from: oldDir, to: dest });
    }
  }

  const changedCount = copied.filter((x) => x.changed).length;
  const postStates = collectFileStates(workspaceRoot);
  const postSummary = summarizeStates(postStates.states);
  const passDetail = changedCount === 0 ? "already up-to-date (upgrade executed with verification)" : "updated";
  const nextAction =
    allow.allow_status !== "ALLOW_OK"
      ? "ALIGN_ALLOWLIST_THEN_CHECK"
      : "MIGRATE_AUDIT";

  return {
    exitCode: 0,
    result: {
      status: "PASS",
      mode,
      timestamp_utc: ts,
      plugin_root: pluginRoot,
      workspace_root: workspaceRoot,
      platform_config_path: openclawJsonPath || null,
      ...allow,
      pass_detail: passDetail,
      backup_root: backupRoot || null,
      copied_files: copied,
      file_sync_summary_after: postSummary,
      workspace_gov_skill_dirs_reconciled: shadowMoves,
      next_action: nextAction,
    },
  };
}

export function runGovSetupSync(modeInput = "install") {
  return executeGovSetupSync(modeInput).result;
}

export { alignAllowlistEntry };

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovSetupSync(process.argv[2] || "install");
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
