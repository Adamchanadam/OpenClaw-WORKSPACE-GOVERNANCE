#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

const CLAUSE_ANTI_PRECHECK = "Do NOT run canonical equality as a pre-change blocker";
const CLAUSE_CHANGE_THEN_QC = "CHANGE first, then canonical equality at QC";

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

const auxiliaryControlFileRels = [
  "_control/PRESETS.md",
  "_control/WORKSPACE_INDEX.md",
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

function replaceMarkerInner(text, marker, innerContent) {
  const normalizedInner = normalizeText(innerContent).replace(/\n$/, "");
  const re = new RegExp(
    `(<!-- AUTOGEN:BEGIN ${escapeRegExp(marker)} -->\\r?\\n)([\\s\\S]*?)(\\r?\\n<!-- AUTOGEN:END ${escapeRegExp(marker)} -->)`,
  );
  if (!re.test(text)) return null;
  return text.replace(re, `$1${normalizedInner}$3`);
}

function countAutogenMarkerPairs(text, marker) {
  const beginRe = new RegExp(`<!-- AUTOGEN:BEGIN ${escapeRegExp(marker)} -->`, "g");
  const endRe = new RegExp(`<!-- AUTOGEN:END ${escapeRegExp(marker)} -->`, "g");
  const begin = (String(text || "").match(beginRe) || []).length;
  const end = (String(text || "").match(endRe) || []).length;
  return { begin, end };
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
    backupRoot,
    filesRead,
    targets,
    seededFiles,
    repairedMarkerAnomalyFiles,
    equality,
    status,
    reason,
  } = params;
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# migrate_governance_rev6_${ts}`);
  lines.push("");
  lines.push(`- status: ${status}`);
  if (reason) lines.push(`- reason: ${reason}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push(`- backup_root: ${backupRoot || "none"}`);
  lines.push("");
  lines.push("## FILES_READ");
  for (const p of filesRead) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## TARGET_FILES_TO_CHANGE");
  for (const p of targets) lines.push(`- ${p}`);
  lines.push("");
  if (Array.isArray(seededFiles) && seededFiles.length > 0) {
    lines.push("## SEEDED_MISSING_FILES");
    for (const p of seededFiles) lines.push(`- ${p}`);
    lines.push("");
  }
  if (Array.isArray(repairedMarkerAnomalyFiles) && repairedMarkerAnomalyFiles.length > 0) {
    lines.push("## REPAIRED_MARKER_ANOMALY_FILES");
    for (const p of repairedMarkerAnomalyFiles) lines.push(`- ${p}`);
    lines.push("");
  }
  lines.push("## CANONICAL_EQUALITY");
  for (const row of equality) {
    lines.push(
      `- ${row.id}: ${row.status} (target=${row.target_sha12 || "n/a"} canonical=${row.canonical_sha12 || "n/a"})`,
    );
  }
  lines.push("");
  fs.writeFileSync(runReportPath, `${lines.join("\n")}\n`, "utf8");
}

function executeGovMigrateSync() {
  const ts = nowStamp();
  const openclawJsonPath = detectOpenclawJsonPath();
  const workspaceRoot = detectWorkspaceRoot(openclawJsonPath);
  const canonicalPath = path.join(workspaceRoot, "prompts", "governance", "OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md");
  const migrationPath = path.join(workspaceRoot, "prompts", "governance", "WORKSPACE_GOVERNANCE_MIGRATION.md");
  const indexPath = path.join(workspaceRoot, "_control", "WORKSPACE_INDEX.md");
  const runRelPath = path.join("_runs", `migrate_governance_rev6_${ts}.md`).replace(/\\/g, "/");
  const runReportPath = path.join(workspaceRoot, runRelPath);
  const backupRoot = path.join(workspaceRoot, "archive", `_migration_backup_${ts}`);

  const filesRead = [canonicalPath, migrationPath];
  const targetPaths = blockSpecs.map((b) => path.join(workspaceRoot, b.targetRel));
  const auxiliaryTargetPaths = auxiliaryControlFileRels.map((rel) => path.join(workspaceRoot, rel));
  filesRead.push(...auxiliaryTargetPaths);
  filesRead.push(...targetPaths);

  const blocked = (reasonCode, extra = {}) => {
    writeRunReport({
      runReportPath,
      ts,
      workspaceRoot,
      backupRoot: "",
      filesRead,
      targets: targetPaths,
      seededFiles: [],
      repairedMarkerAnomalyFiles: [],
      equality: [],
      status: "BLOCKED",
      reason: reasonCode,
    });
    updateWorkspaceIndex(indexPath, runRelPath);
    return {
      exitCode: 2,
      result: {
        status: "BLOCKED",
        reason: reasonCode,
        workspace_root: workspaceRoot,
        run_report: runRelPath,
        ...extra,
      },
    };
  };

  const missing = [];
  if (!exists(canonicalPath)) missing.push(canonicalPath);
  if (!exists(migrationPath)) missing.push(migrationPath);
  if (missing.length > 0) return blocked("MISSING_REQUIRED_FILES", { missing });

  const migrationText = fs.readFileSync(migrationPath, "utf8");
  const clauseMissing = [];
  if (!migrationText.includes(CLAUSE_ANTI_PRECHECK)) clauseMissing.push(CLAUSE_ANTI_PRECHECK);
  if (!migrationText.includes(CLAUSE_CHANGE_THEN_QC)) clauseMissing.push(CLAUSE_CHANGE_THEN_QC);
  if (clauseMissing.length > 0) return blocked("STALE_MIGRATION_PROMPT_CONTRACT", { missing_clauses: clauseMissing });

  const canonicalText = fs.readFileSync(canonicalPath, "utf8");
  const canonicalPayloadById = new Map();
  const canonicalInnerById = new Map();
  for (const spec of blockSpecs) {
    const canonicalPayload = extractCanonicalFilePayload(canonicalText, spec.canonicalBlockPath);
    if (!canonicalPayload) return blocked("CANONICAL_PAYLOAD_MISSING", { canonical_block_path: spec.canonicalBlockPath });
    const inner = extractMarkerInner(canonicalPayload, spec.marker);
    if (inner == null) return blocked("CANONICAL_MARKER_MISSING", { marker: spec.marker });
    canonicalPayloadById.set(spec.id, canonicalPayload);
    canonicalInnerById.set(spec.id, inner);
  }
  const auxiliaryPayloadByRel = new Map();
  for (const rel of auxiliaryControlFileRels) {
    const payload = extractCanonicalFilePayload(canonicalText, rel);
    if (!payload) return blocked("CANONICAL_PAYLOAD_MISSING", { canonical_block_path: rel });
    auxiliaryPayloadByRel.set(rel, payload);
  }

  const seededMissingFiles = [];
  for (const rel of auxiliaryControlFileRels) {
    const targetPath = path.join(workspaceRoot, rel);
    if (exists(targetPath)) continue;
    const payload = auxiliaryPayloadByRel.get(rel);
    if (!payload) return blocked("CANONICAL_PAYLOAD_MISSING", { canonical_block_path: rel });
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, normalizeText(payload), "utf8");
    seededMissingFiles.push(targetPath);
    if (!targetPaths.includes(targetPath)) targetPaths.push(targetPath);
  }

  const targetExistsBefore = new Map();
  for (const spec of blockSpecs) {
    const targetPath = path.join(workspaceRoot, spec.targetRel);
    const existed = exists(targetPath);
    targetExistsBefore.set(spec.id, existed);
    if (existed) continue;
    const canonicalPayload = canonicalPayloadById.get(spec.id);
    if (!canonicalPayload) {
      return blocked("CANONICAL_PAYLOAD_MISSING", { canonical_block_path: spec.canonicalBlockPath });
    }
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, normalizeText(canonicalPayload), "utf8");
    seededMissingFiles.push(targetPath);
  }

  const existingTargetSpecs = blockSpecs.filter((spec) => Boolean(targetExistsBefore.get(spec.id)));
  let backupRootUsed = "";
  if (existingTargetSpecs.length > 0) {
    ensureDir(backupRoot);
    backupRootUsed = backupRoot;
  }
  for (const spec of existingTargetSpecs) {
    const targetPath = path.join(workspaceRoot, spec.targetRel);
    const backupPath = path.join(backupRoot, spec.targetRel);
    ensureDir(path.dirname(backupPath));
    fs.copyFileSync(targetPath, backupPath);
  }

  const repairedMissingMarkerFiles = [];
  const repairedMarkerAnomalyFiles = [];
  for (const spec of blockSpecs) {
    const targetPath = path.join(workspaceRoot, spec.targetRel);
    const targetText = fs.readFileSync(targetPath, "utf8");
    const markerCounts = countAutogenMarkerPairs(targetText, spec.marker);
    if (markerCounts.begin !== 1 || markerCounts.end !== 1) {
      const canonicalPayload = canonicalPayloadById.get(spec.id);
      if (!canonicalPayload) {
        return blocked("CANONICAL_PAYLOAD_MISSING", { canonical_block_path: spec.canonicalBlockPath });
      }
      fs.writeFileSync(targetPath, normalizeText(canonicalPayload), "utf8");
      repairedMarkerAnomalyFiles.push(targetPath);
      continue;
    }
    if (extractMarkerInner(targetText, spec.marker) != null) continue;
    const canonicalPayload = canonicalPayloadById.get(spec.id);
    if (!canonicalPayload) {
      return blocked("CANONICAL_PAYLOAD_MISSING", { canonical_block_path: spec.canonicalBlockPath });
    }
    fs.writeFileSync(targetPath, normalizeText(canonicalPayload), "utf8");
    repairedMissingMarkerFiles.push(targetPath);
  }

  for (const spec of blockSpecs) {
    const targetPath = path.join(workspaceRoot, spec.targetRel);
    const targetText = fs.readFileSync(targetPath, "utf8");
    if (extractMarkerInner(targetText, spec.marker) == null) {
      return blocked("TARGET_MARKER_MISSING", { marker: spec.marker, target_path: targetPath });
    }
  }

  const applyPatchPass = () => {
    for (const spec of blockSpecs) {
      const targetPath = path.join(workspaceRoot, spec.targetRel);
      const current = fs.readFileSync(targetPath, "utf8");
      const replaced = replaceMarkerInner(current, spec.marker, canonicalInnerById.get(spec.id));
      if (replaced == null) continue;
      fs.writeFileSync(targetPath, normalizeText(replaced), "utf8");
    }
  };

  applyPatchPass();
  let equality = blockSpecs.map((spec) => {
    const targetPath = path.join(workspaceRoot, spec.targetRel);
    const targetText = fs.readFileSync(targetPath, "utf8");
    const canonicalInner = canonicalInnerById.get(spec.id);
    const result = computeEquality(targetText, canonicalInner, spec.marker);
    return { id: spec.id, ...result };
  });

  if (equality.some((x) => x.status !== "MATCH")) {
    applyPatchPass();
    equality = blockSpecs.map((spec) => {
      const targetPath = path.join(workspaceRoot, spec.targetRel);
      const targetText = fs.readFileSync(targetPath, "utf8");
      const canonicalInner = canonicalInnerById.get(spec.id);
      const result = computeEquality(targetText, canonicalInner, spec.marker);
      return { id: spec.id, ...result };
    });
  }

  const finalMismatch = equality.some((x) => x.status !== "MATCH");
  const status = finalMismatch ? "BLOCKED" : "PASS";
  const reason = finalMismatch ? "CANONICAL_EQUALITY_MISMATCH_AFTER_REPAIR" : "";
  writeRunReport({
    runReportPath,
    ts,
    workspaceRoot,
    backupRoot: backupRootUsed,
    filesRead,
    targets: targetPaths,
    seededFiles: seededMissingFiles,
    repairedMarkerAnomalyFiles,
    equality,
    status,
    reason,
  });
  const indexUpdated = updateWorkspaceIndex(indexPath, runRelPath);

  return {
    exitCode: status === "PASS" ? 0 : 2,
    result: {
      status,
      reason: reason || null,
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      platform_config_path: openclawJsonPath || null,
      backup_root: backupRootUsed || null,
      run_report: runRelPath,
      workspace_index_updated: indexUpdated,
      seeded_missing_files: seededMissingFiles.map((p) => p.replace(/\\/g, "/")),
      repaired_missing_marker_files: repairedMissingMarkerFiles.map((p) => p.replace(/\\/g, "/")),
      repaired_marker_anomaly_files: repairedMarkerAnomalyFiles.map((p) => p.replace(/\\/g, "/")),
      equality,
    },
  };
}

export function runGovMigrateSync() {
  return executeGovMigrateSync().result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovMigrateSync();
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
