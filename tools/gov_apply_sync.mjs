#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const MENU_TITLE = "BOOT UPGRADE MENU (BOOT+APPLY v1)";

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

function parseBootMenuItems(text) {
  const normalized = String(text).replace(/\r\n/g, "\n");
  const re = /^\s*(\d{2})\)\s*(.+)$/gm;
  const out = [];
  let m;
  while ((m = re.exec(normalized)) !== null) {
    out.push({ id: String(m[1]), title: String(m[2]).trim() });
  }
  return out;
}

function findLatestBootMenu(runsRoot) {
  if (!exists(runsRoot)) return null;
  const files = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.md$/i.test(e.name))
    .map((e) => {
      const full = path.join(runsRoot, e.name);
      const stat = fs.statSync(full);
      return { full, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const row of files) {
    const text = fs.readFileSync(row.full, "utf8");
    if (!text.includes(MENU_TITLE)) continue;
    const items = parseBootMenuItems(text);
    if (items.length === 0) continue;
    return { sourcePath: row.full, items };
  }
  return null;
}

function classifyUpgradeType(itemTitle) {
  const qc = itemTitle.match(/\bElevate\s+QC#(\d+)\b/i);
  if (qc) {
    return {
      kind: "QC_RECURRENCE_ELEVATION",
      qc_id: String(qc[1]),
      guard_id: null,
    };
  }
  const guard = itemTitle.match(/\bElevate\s+Guard#([A-Za-z0-9_-]+)\b/i);
  if (guard) {
    return {
      kind: "GUARD_RECURRENCE_ESCALATION",
      qc_id: null,
      guard_id: String(guard[1]),
    };
  }
  return {
    kind: "UNSUPPORTED",
    qc_id: null,
    guard_id: null,
  };
}

function collectGuardIds(activeText) {
  const out = [];
  const re = /^###\s*Guard\s*#(\d{1,3})\s*:/gim;
  let m;
  while ((m = re.exec(activeText)) !== null) {
    out.push(Number(m[1]));
  }
  return out;
}

function nextGuardId(activeText) {
  const ids = collectGuardIds(activeText);
  const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
  return String(next).padStart(3, "0");
}

function findGuardBlock(activeText, guardId) {
  const normalized = String(activeText).replace(/\r\n/g, "\n");
  const headingRe = /^###\s*Guard\s*#(\d{1,3})\s*:.*$/gim;
  const targetNum = Number(String(guardId).replace(/^0+/, "") || "0");
  const headings = [];
  let m;
  while ((m = headingRe.exec(normalized)) !== null) {
    headings.push({
      num: Number(m[1]),
      start: m.index,
    });
  }
  for (let i = 0; i < headings.length; i += 1) {
    if (headings[i].num !== targetNum) continue;
    const start = headings[i].start;
    const end = i + 1 < headings.length ? headings[i + 1].start : normalized.length;
    return normalized.slice(start, end).trim();
  }
  return "";
}

function appendBlock(filePath, blockText) {
  const current = fs.readFileSync(filePath, "utf8");
  const updated =
    normalizeText(current).replace(/\n$/, "") +
    "\n\n" +
    String(blockText).trimEnd() +
    "\n";
  fs.writeFileSync(filePath, updated, "utf8");
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

function backupFile(workspaceRoot, backupRoot, targetPath) {
  const rel = path.relative(workspaceRoot, targetPath);
  const backupPath = path.join(backupRoot, rel);
  ensureDir(path.dirname(backupPath));
  fs.copyFileSync(targetPath, backupPath);
  return backupPath;
}

function writeRunReport(params) {
  const {
    runReportPath,
    ts,
    workspaceRoot,
    status,
    reason,
    itemId,
    itemTitle,
    applyType,
    backupRoot,
    filesRead,
    targets,
    changes,
    menuSource,
    followups,
  } = params;
  ensureDir(path.dirname(runReportPath));
  const lines = [];
  lines.push(`# ${ts}_apply_upgrade_from_boot_v1`);
  lines.push("");
  lines.push(`- status: ${status}`);
  if (reason) lines.push(`- reason: ${reason}`);
  lines.push(`- workspace_root: ${workspaceRoot}`);
  lines.push(`- selected_item: ${itemId || "none"}`);
  lines.push(`- item_title: ${itemTitle || "none"}`);
  lines.push(`- apply_type: ${applyType || "none"}`);
  lines.push(`- menu_source: ${menuSource || "none"}`);
  lines.push(`- backup_root: ${backupRoot || "none"}`);
  lines.push("");
  lines.push("## FILES_READ");
  for (const p of filesRead) lines.push(`- ${p}`);
  lines.push("");
  lines.push("## TARGET_FILES_TO_CHANGE");
  if (targets.length === 0) {
    lines.push("- none");
  } else {
    for (const p of targets) lines.push(`- ${p}`);
  }
  lines.push("");
  lines.push("## CHANGES");
  if (changes.length === 0) {
    lines.push("- none");
  } else {
    for (const c of changes) lines.push(`- ${c}`);
  }
  lines.push("");
  lines.push("## FOLLOW_UP");
  for (const f of followups) lines.push(`- ${f}`);
  lines.push("");
  fs.writeFileSync(runReportPath, `${lines.join("\n")}\n`, "utf8");
}

function executeGovApplySync(itemInput) {
  const itemId = String(itemInput || "").trim();
  if (!/^\d{2}$/.test(itemId)) {
    return {
      exitCode: 2,
      result: {
        status: "BLOCKED",
        reason: "INVALID_ITEM_ID",
        item_id: itemId || null,
      },
    };
  }

  const ts = nowStamp();
  const openclawJsonPath = detectOpenclawJsonPath();
  const workspaceRoot = detectWorkspaceRoot(openclawJsonPath);
  const applyPromptPath = path.join(workspaceRoot, "prompts", "governance", "APPLY_UPGRADE_FROM_BOOT.md");
  const activeGuardsPath = path.join(workspaceRoot, "_control", "ACTIVE_GUARDS.md");
  const lessonsPath = path.join(workspaceRoot, "_control", "LESSONS.md");
  const indexPath = path.join(workspaceRoot, "_control", "WORKSPACE_INDEX.md");
  const regressionPath = path.join(workspaceRoot, "_control", "REGRESSION_CHECK.md");
  const runsRoot = path.join(workspaceRoot, "_runs");
  const runRelPath = path.join("_runs", `${ts}_apply_upgrade_from_boot_v1.md`).replace(/\\/g, "/");
  const runReportPath = path.join(workspaceRoot, runRelPath);

  const filesRead = [applyPromptPath, activeGuardsPath, lessonsPath, indexPath, regressionPath, runsRoot];
  const targets = [activeGuardsPath, lessonsPath, indexPath, runReportPath];
  const followups = ["/gov_migrate", "/gov_audit", "fallback: /skill gov_migrate", "fallback: /skill gov_audit"];

  const blocked = (reason, extra = {}, menuSource = "", itemTitle = "", applyType = "") => {
    writeRunReport({
      runReportPath,
      ts,
      workspaceRoot,
      status: "BLOCKED",
      reason,
      itemId,
      itemTitle,
      applyType,
      backupRoot: "",
      filesRead,
      targets,
      changes: [],
      menuSource,
      followups,
    });
    updateWorkspaceIndex(indexPath, runRelPath);
    return {
      exitCode: 2,
      result: {
        status: "BLOCKED",
        reason,
        timestamp_utc: ts,
        workspace_root: workspaceRoot,
        platform_config_path: openclawJsonPath || null,
        run_report: runRelPath,
        item_id: itemId,
        ...extra,
      },
    };
  };

  const missingRequired = filesRead.filter((p) => !exists(p));
  if (missingRequired.length > 0) {
    return blocked("MISSING_REQUIRED_FILES", { missing_files: missingRequired.map((p) => toRel(workspaceRoot, p)) });
  }

  const latestMenu = findLatestBootMenu(runsRoot);
  if (!latestMenu) {
    return blocked("BOOT_MENU_MISSING");
  }

  const selected = latestMenu.items.find((x) => x.id === itemId);
  if (!selected) {
    return blocked(
      "MENU_ITEM_NOT_FOUND",
      { available_items: latestMenu.items.map((x) => x.id) },
      toRel(workspaceRoot, latestMenu.sourcePath),
    );
  }

  const applyClass = classifyUpgradeType(selected.title);
  if (applyClass.kind === "UNSUPPORTED") {
    return blocked(
      "UNSUPPORTED_MENU_ITEM_TYPE",
      { item_title: selected.title },
      toRel(workspaceRoot, latestMenu.sourcePath),
      selected.title,
      applyClass.kind,
    );
  }

  const activeText = fs.readFileSync(activeGuardsPath, "utf8");
  fs.readFileSync(lessonsPath, "utf8");
  fs.readFileSync(indexPath, "utf8");
  const changes = [];

  const backupRoot = path.join(workspaceRoot, "archive", `_apply_backup_${ts}`);
  ensureDir(backupRoot);
  const backupItems = [activeGuardsPath, lessonsPath, indexPath];
  const backedUp = [];
  for (const filePath of backupItems) {
    backedUp.push(toRel(workspaceRoot, backupFile(workspaceRoot, backupRoot, filePath)));
  }

  if (applyClass.kind === "QC_RECURRENCE_ELEVATION") {
    const nextId = nextGuardId(activeText);
    const qcId = String(applyClass.qc_id);
    const guardBlock = [
      `### Guard #${nextId}: QC#${qcId} Recurrence Elevation`,
      `- source_menu_item: ${itemId}`,
      `- trigger_title: ${selected.title}`,
      "- required:",
      `  - Re-check QC item #${qcId} before completion claim and include evidence in run report.`,
      `  - If QC item #${qcId} is FAIL at QC gate, STOP and report BLOCKED.`,
      `- applied_at_utc: ${new Date().toISOString()}`,
    ].join("\n");
    appendBlock(activeGuardsPath, guardBlock);
    changes.push(`${toRel(workspaceRoot, activeGuardsPath)}: append Guard #${nextId}`);

    const lessonBlock = [
      `## Lesson ${ts} - QC#${qcId} recurrence`,
      `- date_utc: ${new Date().toISOString()}`,
      `- source_menu_item: ${itemId}`,
      `- symptom: QC#${qcId} recurring FAIL`,
      `- root_cause: repeated omission of QC item #${qcId} in gate execution`,
      `- fix_applied: Guard #${nextId} added; apply protocol enforced`,
      `- recurrence_test: run governance change with explicit QC#${qcId} PASS evidence`,
      "- prevention: follow _control/GOVERNANCE_BOOTSTRAP.md",
    ].join("\n");
    appendBlock(lessonsPath, lessonBlock);
    changes.push(`${toRel(workspaceRoot, lessonsPath)}: append Lesson for QC#${qcId}`);
  } else {
    const guardId = String(applyClass.guard_id);
    const guardBlock = findGuardBlock(activeText, guardId);
    if (!guardBlock) {
      return blocked(
        "GUARD_ID_NOT_FOUND",
        { guard_id: guardId, item_title: selected.title },
        toRel(workspaceRoot, latestMenu.sourcePath),
        selected.title,
        applyClass.kind,
      );
    }
    const headLine = guardBlock.split("\n")[0] || `Guard#${guardId}`;
    const lessonBlock = [
      `## Lesson ${ts} - Guard#${guardId} escalation`,
      `- date_utc: ${new Date().toISOString()}`,
      `- source_menu_item: ${itemId}`,
      `- symptom: Guard#${guardId} repeated across recent runs`,
      "- root_cause: existing guard wording is not consistently executed",
      "- fix_applied: escalation recorded and follow-up governance review required",
      `- guard_reference: ${headLine}`,
      "- recurrence_test: fresh-session restatement + example decision must match guard intent",
      "- prevention: schedule follow-up governance upgrade review",
    ].join("\n");
    appendBlock(lessonsPath, lessonBlock);
    changes.push(`${toRel(workspaceRoot, lessonsPath)}: append Lesson for Guard#${guardId}`);
  }

  const indexUpdated = updateWorkspaceIndex(indexPath, runRelPath);
  changes.push(
    `${toRel(workspaceRoot, indexPath)}: ${indexUpdated ? "append run link" : "run link already present"}`,
  );

  writeRunReport({
    runReportPath,
    ts,
    workspaceRoot,
    status: "PASS",
    reason: "",
    itemId,
    itemTitle: selected.title,
    applyType: applyClass.kind,
    backupRoot,
    filesRead,
    targets,
    changes: [
      ...changes,
      `backup_created: ${toRel(workspaceRoot, backupRoot)}`,
      `backup_files: ${backedUp.join(", ")}`,
    ],
    menuSource: toRel(workspaceRoot, latestMenu.sourcePath),
    followups,
  });

  return {
    exitCode: 0,
    result: {
      status: "PASS",
      timestamp_utc: ts,
      workspace_root: workspaceRoot,
      platform_config_path: openclawJsonPath || null,
      run_report: runRelPath,
      item_id: itemId,
      item_title: selected.title,
      apply_type: applyClass.kind,
      menu_source: toRel(workspaceRoot, latestMenu.sourcePath),
      backup_root: toRel(workspaceRoot, backupRoot),
      workspace_index_updated: indexUpdated,
      followup: ["/gov_migrate", "/gov_audit"],
    },
  };
}

export function runGovApplySync(itemInput = "") {
  return executeGovApplySync(itemInput).result;
}

function isDirectRun() {
  const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
  return argv1 === __filename;
}

if (isDirectRun()) {
  try {
    const { exitCode, result } = executeGovApplySync(process.argv[2] || "");
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
