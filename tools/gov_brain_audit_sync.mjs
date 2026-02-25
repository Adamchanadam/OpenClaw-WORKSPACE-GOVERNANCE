#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

// --- Duplicated utilities (same as gov_apply_sync.mjs pattern) ---

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

// --- Inlined brain audit scanning logic (from brain_audit_rules.mjs) ---

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const BRAIN_DOC_BASENAMES = [
  "USER.md",
  "IDENTITY.md",
  "TOOLS.md",
  "SOUL.md",
  "MEMORY.md",
  "HEARTBEAT.md",
];

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/);
}

function listRecentMemoryFiles(workspace, maxDays) {
  const dir = path.join(workspace, "memory");
  if (!exists(dir)) return [];
  const now = new Date();
  const files = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(ent.name)) continue;
    const day = new Date(ent.name.replace(".md", "") + "T00:00:00Z");
    if (Number.isNaN(day.getTime())) continue;
    const diffDays = Math.floor((now.getTime() - day.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays <= maxDays) {
      files.push(path.join(dir, ent.name));
    }
  }
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

function listLatestRunReports(workspace, limit) {
  const dir = path.join(workspace, "_runs");
  if (!exists(dir)) return [];
  const rows = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
    const fullPath = path.join(dir, ent.name);
    try {
      const st = fs.statSync(fullPath);
      rows.push({ fullPath, mtimeMs: st.mtimeMs });
    } catch {
      // ignore unreadable files
    }
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return rows.slice(0, limit).map((x) => x.fullPath);
}

function collectScopeFiles(workspace) {
  const staticFiles = [
    "AGENTS.md",
    "SOUL.md",
    "IDENTITY.md",
    "USER.md",
    "TOOLS.md",
    "MEMORY.md",
    "HEARTBEAT.md",
    "BOOT.md",
    "_control/GOVERNANCE_BOOTSTRAP.md",
    "_control/PRESETS.md",
    "_control/REGRESSION_CHECK.md",
    "_control/ACTIVE_GUARDS.md",
    "_control/LESSONS.md",
  ];
  const results = [];
  for (const rel of staticFiles) {
    const fullPath = path.join(workspace, rel);
    if (exists(fullPath)) results.push(fullPath);
  }
  results.push(...listRecentMemoryFiles(workspace, 7));
  results.push(...listLatestRunReports(workspace, 10));
  return results;
}

function makeFinding(seed) {
  return {
    id: "",
    severity: seed.severity,
    rule: seed.rule,
    file: seed.file,
    line: seed.line,
    riskyText: seed.riskyText,
    whyRisky: seed.whyRisky,
    proposedFix: seed.proposedFix,
  };
}

function isSectionBoundary(line) {
  // Tolerant: accepts bullet-prefixed labels (- FILES_READ:), bare labels, and markdown headers
  return /^\s*(?:[-*•]\s+)?[A-Z][A-Z0-9_\s-]{2,}\s*:/.test(line) || /^\s*#{1,6}\s+/.test(line);
}

function extractSectionEntries(lines, headerRe) {
  const start = lines.findIndex((line) => headerRe.test(line));
  if (start < 0) return { found: false, startLine: 0, entries: [] };
  const entries = [];
  const first = lines[start];
  const colonIdx = first.indexOf(":");
  if (colonIdx >= 0) {
    const tail = first.slice(colonIdx + 1).trim();
    if (tail) entries.push({ text: tail, line: start + 1 });
  }
  for (let i = start + 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) {
      if (entries.length > 0) break;
      continue;
    }
    if (isSectionBoundary(raw)) break;
    entries.push({ text: raw.trim(), line: i + 1 });
  }
  return { found: true, startLine: start + 1, entries };
}

function getEvidenceRegexes(tolerance) {
  if (tolerance === "strict") {
    return {
      filesReadRe: /^\s*files[_\s-]*read\s*:/i,
      targetRe: /^\s*target[_\s-]*files[_\s-]*to[_\s-]*change\s*:/i,
      completionRe: /^\s*(status|result|outcome)\s*:\s*(pass|passed|done|completed)\b/i,
    };
  }
  if (tolerance === "lenient") {
    return {
      filesReadRe: /files[_\s-]*read/i,
      targetRe: /target[_\s-]*files[_\s-]*to[_\s-]*change/i,
      completionRe: /(status|result|outcome)\s*[:=]\s*(pass|passed|done|completed)/i,
    };
  }
  // Default: tolerant (current v0.1.55 regexes)
  return {
    filesReadRe: /^\s*(?:[-*•]\s+)?(?:#{1,6}\s+)?files[_\s-]*read\b/i,
    targetRe: /^\s*(?:[-*•]\s+)?(?:#{1,6}\s+)?target[_\s-]*files[_\s-]*to[_\s-]*change\b/i,
    completionRe: /^\s*[-*•]?\s*(status|result|outcome)\s*:\s*(pass|passed|done|completed)\b/i,
  };
}

function scanFileForRules(workspace, fullPath, findings, tolerance) {
  const rel = toRel(workspace, fullPath);
  const lines = readLines(fullPath);
  const lowerRel = rel.toLowerCase();
  const isRunReport = lowerRel.startsWith("_runs/");

  if (isRunReport) {
    // Layer 2 — governance report whitelist: only apply evidence rules to governance-owned reports
    const GOVERNANCE_REPORT_RE = /^(gov_|migrate_governance_|.*_apply_upgrade_from_boot_)/i;
    const isGovernanceReport = GOVERNANCE_REPORT_RE.test(path.basename(fullPath));
    const readOnlyReportRe = /^(audit_|gov_audit_|gov_brain_audit_preview_|gov_boot_audit_|gov_openclaw_json_check_)/i;
    const isReadOnlyReport = readOnlyReportRe.test(path.basename(fullPath));
    // Non-governance reports are still listed in scanned files but exempt from evidence structure rules
    if (!isGovernanceReport && !isReadOnlyReport) return;

    const regexes = getEvidenceRegexes(tolerance);
    const allText = lines.join("\n");
    const completionClaimRe = regexes.completionRe;
    const scoreCompletionRe = /\b(12\/12|100%\s*(pass|complete)?)\b/i;
    const hasCompletionClaim =
      lines.some((line) => completionClaimRe.test(line)) || scoreCompletionRe.test(allText);
    const filesReadSection = extractSectionEntries(lines, regexes.filesReadRe);
    const targetSection = extractSectionEntries(lines, regexes.targetRe);
    const hasFilesRead = filesReadSection.found || (tolerance === "lenient" && regexes.filesReadRe.test(allText));
    const hasTargets = targetSection.found || (tolerance === "lenient" && regexes.targetRe.test(allText));
    if (hasCompletionClaim && !isReadOnlyReport && (!hasFilesRead || !hasTargets)) {
      const lineNo = Math.max(1, lines.findIndex((line) => completionClaimRe.test(line)) + 1);
      findings.push(
        makeFinding({
          severity: "high",
          rule: "COMPLETION_WITHOUT_EVIDENCE",
          file: rel,
          line: lineNo,
          riskyText: lines[lineNo - 1]?.trim().slice(0, 300) || "completion claim",
          whyRisky: "Completion/pass claim exists but required evidence fields are missing.",
          proposedFix: "Add FILES_READ and TARGET_FILES_TO_CHANGE sections before completion claim.",
        }),
      );
    }

    const filesReadText = filesReadSection.entries.map((entry) => entry.text).join("\n").toUpperCase();
    for (const base of BRAIN_DOC_BASENAMES) {
      if (!filesReadText.includes(base.toUpperCase())) continue;
      const target = path.join(workspace, base);
      if (!exists(target)) {
        const sourceLine =
          filesReadSection.entries.find((entry) =>
            entry.text.toUpperCase().includes(base.toUpperCase()),
          )?.line ?? filesReadSection.startLine;
        findings.push(
          makeFinding({
            severity: "high",
            rule: "READ_CLAIM_MISMATCH",
            file: rel,
            line: sourceLine,
            riskyText:
              lines[sourceLine - 1]?.trim().slice(0, 300) ||
              `FILES_READ claims ${base} is read`,
            whyRisky: `Run report claims read evidence for missing file: ${base}.`,
            proposedFix: `Do not claim ${base} as read unless file exists; otherwise report it as missing.`,
          }),
        );
      }
    }
  }
}

function stableSortFindings(findings) {
  findings.sort((a, b) => {
    const sa = SEVERITY_ORDER[a.severity] ?? 9;
    const sb = SEVERITY_ORDER[b.severity] ?? 9;
    if (sa !== sb) return sa - sb;
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    return a.rule.localeCompare(b.rule);
  });
  for (let i = 0; i < findings.length; i += 1) {
    findings[i].id = `F${String(i + 1).padStart(3, "0")}`;
  }
}

function summarizeFindings(findings) {
  const out = { high: 0, medium: 0, low: 0, total: findings.length };
  for (const f of findings) out[f.severity] += 1;
  return out;
}

function runBrainAuditScan(workspace, tolerance) {
  const files = collectScopeFiles(workspace);
  const noScope = files.length === 0;
  const findings = [];
  for (const fullPath of files) scanFileForRules(workspace, fullPath, findings, tolerance || "tolerant");
  stableSortFindings(findings);
  const summary = summarizeFindings(findings);
  return {
    noScope,
    summary,
    scannedFiles: files.map((f) => toRel(workspace, f)),
    findings,
  };
}

// --- Core: computeBrainDocsHealthScore ---

function computeBrainDocsHealthScore(scanResult) {
  const summary = scanResult.summary || { high: 0, medium: 0, low: 0, total: 0 };
  const scannedCount = Array.isArray(scanResult.scannedFiles) ? scanResult.scannedFiles.length : 0;

  if (scanResult.noScope || scannedCount === 0) {
    return { health_score: 0, scanned_count: 0, summary, reason: "NO_SCOPE" };
  }

  let score = 100;
  score -= (summary.high || 0) * 20;
  score -= (summary.medium || 0) * 10;
  score -= (summary.low || 0) * 5;
  if (score < 0) score = 0;

  return { health_score: score, scanned_count: scannedCount, summary };
}

// --- Main: executeGovBrainAuditSync ---

function executeGovBrainAuditSync(modeInput, toleranceInput) {
  const mode = String(modeInput || "").trim().toLowerCase();
  const tolerance = String(toleranceInput || "tolerant").trim().toLowerCase();
  const validModes = ["preview", ""];
  if (!validModes.includes(mode)) {
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
  const runRelPath = `_runs/gov_brain_audit_preview_${ts}.md`;
  const runReportPath = path.join(workspaceRoot, runRelPath);

  const scanResult = runBrainAuditScan(workspaceRoot, tolerance);
  const health = computeBrainDocsHealthScore(scanResult);
  const healthScore = health.health_score;

  let status;
  if (scanResult.noScope) status = "BLOCKED";
  else if (healthScore === 100) status = "PASS";
  else if (healthScore >= 60) status = "WARN";
  else status = "BLOCKED";

  const findings = scanResult.findings;

  // Write run report
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# gov_brain_audit_preview_${ts}`);
  lines.push("");
  lines.push(`- status: ${status}`);
  lines.push(`- mode: preview`);
  lines.push(`- timestamp_utc: ${ts}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push(`- health_score: ${healthScore}/100`);
  lines.push(`- files_scanned: ${health.scanned_count}`);
  lines.push(`- findings_total: ${health.summary.total}`);
  lines.push(`- findings_high: ${health.summary.high}`);
  lines.push(`- findings_medium: ${health.summary.medium}`);
  lines.push(`- findings_low: ${health.summary.low}`);
  lines.push("");
  if (findings.length > 0) {
    lines.push("## FINDINGS");
    for (const f of findings) {
      lines.push(`- ${f.id} | ${String(f.severity).toUpperCase()} | ${f.rule} | ${f.file}:${f.line}`);
    }
    lines.push("");
  }
  lines.push("## SCANNED_FILES");
  for (const f of scanResult.scannedFiles) {
    lines.push(`- ${f}`);
  }
  lines.push("");
  fs.writeFileSync(runReportPath, lines.join("\n") + "\n", "utf8");

  const workspaceIndexUpdated = updateWorkspaceIndex(indexPath, runRelPath);

  return {
    exitCode: status === "BLOCKED" ? 2 : 0,
    result: {
      status,
      mode: "preview",
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      health_score: healthScore,
      files_scanned: health.scanned_count,
      findings_summary: health.summary,
      findings,
      run_report: runRelPath,
      workspace_index_updated: workspaceIndexUpdated,
    },
  };
}

export function runGovBrainAuditSync(modeInput = "preview", toleranceInput = "tolerant") {
  return executeGovBrainAuditSync(modeInput, toleranceInput).result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovBrainAuditSync(process.argv[2] || "");
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
