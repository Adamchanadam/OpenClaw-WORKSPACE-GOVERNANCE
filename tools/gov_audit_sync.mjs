#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const blockSpecs = [
  {
    id: "AGENTS_CORE_v1",
    canonicalBlockPath: "AGENTS.md",
    targetRel: "AGENTS.md",
    marker: "AGENTS_CORE_v1",
  },
  {
    id: "GOV_CORE_v1",
    canonicalBlockPath: "_control/GOVERNANCE_BOOTSTRAP.md",
    targetRel: "_control/GOVERNANCE_BOOTSTRAP.md",
    marker: "GOV_CORE_v1",
  },
  {
    id: "REGRESSION_12_v1",
    canonicalBlockPath: "_control/REGRESSION_CHECK.md",
    targetRel: "_control/REGRESSION_CHECK.md",
    marker: "REGRESSION_12_v1",
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

function sha12(text) {
  return crypto.createHash("sha256").update(normalizeText(text)).digest("hex").slice(0, 12);
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
  if (exists(path.join(cwd, "AGENTS.md")) && exists(path.join(cwd, "_control"))) {
    return path.resolve(cwd);
  }

  const home = os.homedir();
  if (home) return path.join(home, ".openclaw", "workspace");
  return path.resolve(".");
}

function escapeRegExp(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractCanonicalFilePayload(canonicalText, filePath) {
  const re = new RegExp(
    `<<BEGIN FILE: ${escapeRegExp(filePath)}>>\\r?\\n([\\s\\S]*?)\\r?\\n<<END FILE>>`,
  );
  const m = canonicalText.match(re);
  if (!m) return null;
  return m[1];
}

function extractMarkerInner(text, marker) {
  const re = new RegExp(
    `<!-- AUTOGEN:BEGIN ${escapeRegExp(marker)} -->\\r?\\n([\\s\\S]*?)\\r?\\n<!-- AUTOGEN:END ${escapeRegExp(marker)} -->`,
  );
  const m = text.match(re);
  if (!m) return null;
  return m[1];
}

function computeEquality(targetText, canonicalInner, marker) {
  const targetInner = extractMarkerInner(targetText, marker);
  if (targetInner == null) {
    return {
      status: "MISSING_MARKER",
      target_sha12: null,
      canonical_sha12: sha12(canonicalInner),
    };
  }
  const left = normalizeText(targetInner);
  const right = normalizeText(canonicalInner);
  return {
    status: left === right ? "MATCH" : "MISMATCH",
    target_sha12: sha12(left),
    canonical_sha12: sha12(right),
  };
}

function updateWorkspaceIndex(indexPath, runRelPath) {
  if (!exists(indexPath)) return false;
  const current = fs.readFileSync(indexPath, "utf8");
  if (current.includes(runRelPath)) return false;
  const updated = normalizeText(current).replace(/\n$/, "") + `\n- ${runRelPath}\n`;
  fs.writeFileSync(indexPath, updated, "utf8");
  return true;
}

function writeRunReport(params) {
  const {
    runReportPath,
    ts,
    workspaceRoot,
    filesRead,
    folderChecks,
    equality,
    status,
  } = params;
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# gov_audit_${ts}`);
  lines.push("");
  lines.push(`- status: ${status}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push("");
  lines.push("## FILES_READ");
  for (const p of filesRead) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## TARGET_FILES_TO_CHANGE");
  lines.push("- none");
  lines.push("");
  lines.push("## FOLDER_CHECKS");
  for (const row of folderChecks) lines.push(`- ${row.path}: ${row.status}`);
  lines.push("");
  lines.push("## CANONICAL_EQUALITY");
  for (const row of equality) {
    lines.push(`- ${row.id}: ${row.status} (target=${row.target_sha12 || "n/a"} canonical=${row.canonical_sha12 || "n/a"})`);
  }
  lines.push("");
  lines.push("## QC");
  lines.push("- fixed_denominator: 12/12");
  lines.push(`- result: ${status === "PASS" ? "PASS" : "FAIL"}`);
  fs.writeFileSync(runReportPath, `${lines.join("\n")}\n`, "utf8");
}

function executeGovAuditSync() {
  const ts = nowStamp();
  const openclawJsonPath = detectOpenclawJsonPath();
  const workspaceRoot = detectWorkspaceRoot(openclawJsonPath);
  const canonicalPath = path.join(workspaceRoot, "prompts", "governance", "OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md");
  const indexPath = path.join(workspaceRoot, "_control", "WORKSPACE_INDEX.md");
  const runRelPath = path.join("_runs", `gov_audit_${ts}.md`).replace(/\\/g, "/");
  const runReportPath = path.join(workspaceRoot, runRelPath);

  const requiredFolders = ["_control", "_runs", "docs", "projects", "prompts", "archive"];
  const folderChecks = requiredFolders.map((rel) => {
    const full = path.join(workspaceRoot, rel);
    return { path: full, status: exists(full) ? "OK" : "MISSING" };
  });

  const filesRead = [canonicalPath];
  const targetPaths = blockSpecs.map((b) => path.join(workspaceRoot, b.targetRel));
  filesRead.push(...targetPaths);

  const missingFiles = [];
  if (!exists(canonicalPath)) missingFiles.push(canonicalPath);
  for (const p of targetPaths) if (!exists(p)) missingFiles.push(p);

  const equality = [];
  if (missingFiles.length === 0) {
    const canonicalText = fs.readFileSync(canonicalPath, "utf8");
    for (const spec of blockSpecs) {
      const canonicalPayload = extractCanonicalFilePayload(canonicalText, spec.canonicalBlockPath);
      if (!canonicalPayload) {
        equality.push({ id: spec.id, status: "CANONICAL_PAYLOAD_MISSING", target_sha12: null, canonical_sha12: null });
        continue;
      }
      const canonicalInner = extractMarkerInner(canonicalPayload, spec.marker);
      if (canonicalInner == null) {
        equality.push({ id: spec.id, status: "CANONICAL_MARKER_MISSING", target_sha12: null, canonical_sha12: null });
        continue;
      }
      const targetPath = path.join(workspaceRoot, spec.targetRel);
      const targetText = fs.readFileSync(targetPath, "utf8");
      equality.push({ id: spec.id, ...computeEquality(targetText, canonicalInner, spec.marker) });
    }
  }

  const hasMissingFolder = folderChecks.some((x) => x.status !== "OK");
  const hasMissingFile = missingFiles.length > 0;
  const hasMismatch = equality.some((x) => x.status !== "MATCH");
  const status = !hasMissingFolder && !hasMissingFile && !hasMismatch ? "PASS" : "FAIL";

  writeRunReport({
    runReportPath,
    ts,
    workspaceRoot,
    filesRead,
    folderChecks,
    equality,
    status,
  });
  const indexUpdated = updateWorkspaceIndex(indexPath, runRelPath);

  return {
    exitCode: status === "PASS" ? 0 : 2,
    result: {
      status,
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      platform_config_path: openclawJsonPath || null,
      run_report: runRelPath,
      workspace_index_updated: indexUpdated,
      folder_checks: folderChecks,
      missing_files: missingFiles,
      equality,
    },
  };
}

export function runGovAuditSync() {
  return executeGovAuditSync().result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovAuditSync();
    console.log(JSON.stringify(result, null, 2));
    if (exitCode !== 0) process.exit(exitCode);
  } catch (err) {
    console.log(
      JSON.stringify(
        {
          status: "FAIL",
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
