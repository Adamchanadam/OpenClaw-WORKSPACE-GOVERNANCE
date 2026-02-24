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

// --- BOOT audit scanning logic ---

function listRunReports(runsRoot, limit) {
  if (!exists(runsRoot)) return [];
  const rows = [];
  for (const ent of fs.readdirSync(runsRoot, { withFileTypes: true })) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith(".md")) continue;
    const fullPath = path.join(runsRoot, ent.name);
    try {
      const st = fs.statSync(fullPath);
      rows.push({ fullPath, name: ent.name, mtimeMs: st.mtimeMs });
    } catch {
      // skip unreadable
    }
  }
  rows.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return rows.slice(0, limit);
}

function parseRunReportStatus(text) {
  const statusRe = /^\s*-?\s*status\s*:\s*(\S+)/im;
  const m = text.match(statusRe);
  return m ? m[1].toUpperCase() : "UNKNOWN";
}

function extractQcFailedItems(text) {
  const items = [];
  // Pattern: qc_failed_items or QC#N FAIL
  const blockRe = /qc_failed_items\s*:/i;
  const lines = text.split(/\r?\n/);
  let inBlock = false;
  for (const line of lines) {
    if (blockRe.test(line)) { inBlock = true; continue; }
    if (inBlock) {
      if (!line.trim() || /^\s*[A-Z]/.test(line.replace(/^\s*-/, ""))) {
        // Check if this is a list item or a new section
        const itemMatch = line.match(/^\s*-\s*(.+)/);
        if (itemMatch) {
          const val = itemMatch[1].trim();
          if (val && val !== "none") items.push(val);
          continue;
        }
        break;
      }
    }
    // Also match inline QC failures: QC#N: FAIL
    const qcMatch = line.match(/QC#(\d+)\S*\s*:\s*FAIL/i);
    if (qcMatch) items.push(`QC#${qcMatch[1]}`);
  }
  return items;
}

function extractGuardReferences(text) {
  const refs = [];
  const re = /Guard\s*#(\d{1,3})/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    refs.push(`Guard#${m[1]}`);
  }
  return [...new Set(refs)];
}

function detectRecurrencePatterns(runsRoot) {
  const reports = listRunReports(runsRoot, 20);
  const qcFailCounts = new Map();
  const guardRefCounts = new Map();
  const failedReports = [];

  for (const report of reports) {
    try {
      const text = fs.readFileSync(report.fullPath, "utf8");
      const status = parseRunReportStatus(text);

      if (status === "FAIL" || status === "BLOCKED") {
        failedReports.push(report.name);

        const qcFails = extractQcFailedItems(text);
        for (const item of qcFails) {
          qcFailCounts.set(item, (qcFailCounts.get(item) || 0) + 1);
        }

        const guardRefs = extractGuardReferences(text);
        for (const ref of guardRefs) {
          guardRefCounts.set(ref, (guardRefCounts.get(ref) || 0) + 1);
        }
      }
    } catch {
      // skip unreadable
    }
  }

  return {
    reports_scanned: reports.length,
    failed_reports: failedReports,
    qc_recurrences: [...qcFailCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count),
    guard_recurrences: [...guardRefCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([item, count]) => ({ item, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function parseActiveGuards(guardsPath) {
  if (!exists(guardsPath)) return { exists: false, count: 0, ids: [] };
  const text = fs.readFileSync(guardsPath, "utf8");
  const re = /^###\s*Guard\s*#(\d{1,3})\s*:/gim;
  const ids = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    ids.push(Number(m[1]));
  }
  return { exists: true, count: ids.length, ids };
}

function buildUpgradeMenu(recurrences) {
  const items = [];
  let seq = 1;
  for (const qc of recurrences.qc_recurrences) {
    const num = qc.item.replace(/^QC#/i, "");
    items.push({
      id: String(seq).padStart(2, "0"),
      title: `Elevate ${qc.item} (${qc.count} recurrences in recent runs)`,
      type: "QC_RECURRENCE_ELEVATION",
      source: qc.item,
    });
    seq += 1;
  }
  for (const guard of recurrences.guard_recurrences) {
    const id = guard.item.replace(/^Guard#/i, "");
    items.push({
      id: String(seq).padStart(2, "0"),
      title: `Elevate ${guard.item} (${guard.count} recurrences in recent runs)`,
      type: "GUARD_RECURRENCE_ESCALATION",
      source: guard.item,
    });
    seq += 1;
  }
  return items;
}

// --- Main ---

function executeGovBootAuditSync(modeInput) {
  const mode = String(modeInput || "").trim().toLowerCase();
  if (mode !== "scan" && mode !== "") {
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
  const runsRoot = path.join(workspaceRoot, "_runs");
  const guardsPath = path.join(workspaceRoot, "_control", "ACTIVE_GUARDS.md");
  const indexPath = path.join(workspaceRoot, "_control", "WORKSPACE_INDEX.md");
  const runRelPath = `_runs/gov_boot_audit_scan_${ts}.md`;
  const runReportPath = path.join(workspaceRoot, runRelPath);

  if (!exists(runsRoot)) {
    ensureDir(path.dirname(runReportPath));
    const lines = [
      `# gov_boot_audit_scan_${ts}`,
      "",
      "- status: PASS",
      "- reason: NO_RUNS_DIR",
      `- workspace_root: ${workspaceRoot}`,
      "- recurrences_detected: 0",
      "- menu_items: 0",
      "",
    ];
    fs.writeFileSync(runReportPath, lines.join("\n") + "\n", "utf8");
    updateWorkspaceIndex(indexPath, runRelPath);
    return {
      exitCode: 0,
      result: {
        status: "PASS",
        mode: "scan",
        timestamp_utc: ts,
        workspace_root: workspaceRoot,
        reports_scanned: 0,
        failed_reports: [],
        qc_recurrences: [],
        guard_recurrences: [],
        active_guards: { exists: false, count: 0 },
        menu_items: [],
        run_report: runRelPath,
        workspace_index_updated: updateWorkspaceIndex(indexPath, runRelPath),
      },
    };
  }

  const recurrences = detectRecurrencePatterns(runsRoot);
  const guards = parseActiveGuards(guardsPath);
  const menuItems = buildUpgradeMenu(recurrences);
  const totalRecurrences = recurrences.qc_recurrences.length + recurrences.guard_recurrences.length;

  let status;
  if (totalRecurrences === 0) status = "PASS";
  else status = "RECURRENCE_DETECTED";

  // Write run report
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# gov_boot_audit_scan_${ts}`);
  lines.push("");
  lines.push(`- status: ${status}`);
  lines.push(`- mode: scan`);
  lines.push(`- timestamp_utc: ${ts}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push(`- reports_scanned: ${recurrences.reports_scanned}`);
  lines.push(`- failed_reports_count: ${recurrences.failed_reports.length}`);
  lines.push(`- qc_recurrences: ${recurrences.qc_recurrences.length}`);
  lines.push(`- guard_recurrences: ${recurrences.guard_recurrences.length}`);
  lines.push(`- active_guards: ${guards.count}`);
  lines.push("");
  if (menuItems.length > 0) {
    lines.push("BOOT UPGRADE MENU (BOOT+APPLY v1)");
    for (const item of menuItems) {
      lines.push(`${item.id}) ${item.title}`);
    }
    lines.push("");
  }
  fs.writeFileSync(runReportPath, lines.join("\n") + "\n", "utf8");

  const workspaceIndexUpdated = updateWorkspaceIndex(indexPath, runRelPath);

  return {
    exitCode: 0,
    result: {
      status,
      mode: "scan",
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      reports_scanned: recurrences.reports_scanned,
      failed_reports: recurrences.failed_reports,
      qc_recurrences: recurrences.qc_recurrences,
      guard_recurrences: recurrences.guard_recurrences,
      active_guards: { exists: guards.exists, count: guards.count },
      menu_items: menuItems,
      run_report: runRelPath,
      workspace_index_updated: workspaceIndexUpdated,
    },
  };
}

export function runGovBootAuditSync(modeInput = "scan") {
  return executeGovBootAuditSync(modeInput).result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovBootAuditSync(process.argv[2] || "");
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
