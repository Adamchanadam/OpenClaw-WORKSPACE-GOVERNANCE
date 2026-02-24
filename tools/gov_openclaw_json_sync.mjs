#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

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

function normalizeText(input) {
  return String(input)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n?$/, "\n");
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

function toRel(workspaceRoot, fullPath) {
  return path.relative(workspaceRoot, fullPath).replace(/\\/g, "/");
}

function updateWorkspaceIndex(indexPath, runRelPath) {
  if (!exists(indexPath)) return false;
  const current = fs.readFileSync(indexPath, "utf8");
  if (current.includes(runRelPath)) return false;
  let next = normalizeText(current).replace(/\n$/, "");
  if (!/##\s+Recent Runs \(manual\)/i.test(next)) {
    next += "\n\n## Recent Runs (manual)";
  }
  next += `\n- ${runRelPath}\n`;
  fs.writeFileSync(indexPath, next, "utf8");
  return true;
}

function computePlatformHealthScore(openclawJsonPath) {
  const dimensions = [];
  let totalScore = 0;

  // --- Dimension 1: Config File (max 3) ---
  let dimConfigScore = 0;
  const fileExists = Boolean(openclawJsonPath) && exists(openclawJsonPath);
  if (fileExists) dimConfigScore += 1;

  let configObj = null;
  let jsonValid = false;
  let rootIsObject = false;
  if (fileExists) {
    configObj = readJsonSafe(openclawJsonPath);
    if (configObj !== null) {
      jsonValid = true;
      dimConfigScore += 1;
    }
    if (configObj && typeof configObj === "object" && !Array.isArray(configObj)) {
      rootIsObject = true;
      dimConfigScore += 1;
    }
  }
  dimensions.push({ name: "Config File", score: dimConfigScore, max: 3 });
  totalScore += dimConfigScore;

  // --- Dimension 2: Plugin Allowlist (max 3) ---
  let dimAllowScore = 0;
  const plugins = configObj?.plugins;
  const allowArray = plugins?.allow;
  const pluginsAllowIsArray = Array.isArray(allowArray);
  if (pluginsAllowIsArray) dimAllowScore += 1;
  const allowNonEmpty = pluginsAllowIsArray && allowArray.length > 0;
  if (allowNonEmpty) dimAllowScore += 1;
  const allowIncludesGovernance = allowNonEmpty && allowArray.some(
    (item) => typeof item === "string" && item.includes("openclaw-workspace-governance"),
  );
  if (allowIncludesGovernance) dimAllowScore += 1;
  dimensions.push({ name: "Plugin Allowlist", score: dimAllowScore, max: 3 });
  totalScore += dimAllowScore;

  // --- Find governance entry in plugins.entries[] ---
  const entries = Array.isArray(plugins?.entries) ? plugins.entries : [];
  const govEntry = entries.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const id = String(entry.id || "").toLowerCase();
    const name = String(entry.name || "").toLowerCase();
    return id.includes("openclaw-workspace-governance") || name.includes("openclaw-workspace-governance");
  });
  const govConfig = govEntry?.config;

  // --- Dimension 3: Runtime Gate (max 2) ---
  let dimGateScore = 0;
  const runtimeGatePolicyExists = govConfig && typeof govConfig === "object" && "runtimeGatePolicy" in govConfig;
  if (runtimeGatePolicyExists) dimGateScore += 1;
  const runtimeGatePolicy = runtimeGatePolicyExists ? govConfig.runtimeGatePolicy : null;
  const hasRules = runtimeGatePolicy && typeof runtimeGatePolicy === "object" && Object.keys(runtimeGatePolicy).length > 0;
  if (hasRules) dimGateScore += 1;
  dimensions.push({ name: "Runtime Gate", score: dimGateScore, max: 2 });
  totalScore += dimGateScore;

  // --- Dimension 4: Gate Enablement (max 2) ---
  let dimEnablementScore = 0;
  const configStructureAllowsGovConfig = Boolean(govEntry && govConfig && typeof govConfig === "object");
  if (configStructureAllowsGovConfig) dimEnablementScore += 1;
  const gateNotExplicitlyDisabled = configStructureAllowsGovConfig && govConfig.runtimeGateEnabled !== false;
  if (gateNotExplicitlyDisabled) dimEnablementScore += 1;
  dimensions.push({ name: "Gate Enablement", score: dimEnablementScore, max: 2 });
  totalScore += dimEnablementScore;

  return {
    health_score: totalScore,
    dimensions,
    platform_config_path: openclawJsonPath || null,
    config_parsed: Boolean(configObj),
  };
}

function executeGovOpenclawJsonSync(modeInput) {
  const mode = String(modeInput || "").trim().toLowerCase();
  if (mode !== "check") {
    return {
      exitCode: 2,
      result: {
        status: "BLOCKED",
        reason: "INVALID_MODE",
        mode: mode || null,
      },
    };
  }

  const ts = nowStamp();
  const openclawJsonPath = detectOpenclawJsonPath();
  const workspaceRoot = detectWorkspaceRoot(openclawJsonPath);
  const indexPath = path.join(workspaceRoot, "_control", "WORKSPACE_INDEX.md");
  const runsRoot = path.join(workspaceRoot, "_runs");
  const runRelPath = `_runs/gov_openclaw_json_check_${ts}.md`;
  const runReportPath = path.join(workspaceRoot, runRelPath);

  const healthResult = computePlatformHealthScore(openclawJsonPath);
  const healthScore = healthResult.health_score;

  let status;
  if (healthScore === 10) status = "PASS";
  else if (healthScore >= 3) status = "READY_WITH_WARNING";
  else status = "BLOCKED";

  // Write run report
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# gov_openclaw_json_check_${ts}`);
  lines.push("");
  lines.push(`- status: ${status}`);
  lines.push(`- mode: check`);
  lines.push(`- timestamp_utc: ${ts}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push(`- platform_config_path: ${healthResult.platform_config_path || "none"}`);
  lines.push(`- health_score: ${healthScore}/10`);
  lines.push("");
  lines.push("## DIMENSIONS");
  for (const dim of healthResult.dimensions) {
    lines.push(`- ${dim.name}: ${dim.score}/${dim.max}`);
  }
  lines.push("");
  fs.writeFileSync(runReportPath, `${lines.join("\n")}\n`, "utf8");

  // Update workspace index
  const workspaceIndexUpdated = updateWorkspaceIndex(indexPath, runRelPath);

  return {
    exitCode: status === "BLOCKED" ? 2 : 0,
    result: {
      status,
      mode: "check",
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      platform_config_path: healthResult.platform_config_path,
      health_score: healthScore,
      dimensions: healthResult.dimensions,
      run_report: runRelPath,
      workspace_index_updated: workspaceIndexUpdated,
    },
  };
}

export function runGovOpenclawJsonSync(modeInput = "check") {
  return executeGovOpenclawJsonSync(modeInput).result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovOpenclawJsonSync(process.argv[2] || "");
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
