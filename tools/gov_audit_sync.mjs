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

const REQUIRED_FOLDER_RELS = ["_control", "_runs", "docs", "projects", "prompts", "archive"];
const REQUIRED_AUDIT_READ_RELS = [
  "_control/GOVERNANCE_BOOTSTRAP.md",
  "_control/PRESETS.md",
  "_control/WORKSPACE_INDEX.md",
  "_control/REGRESSION_CHECK.md",
];
const ROOT_GOV_SPRAWL_FORBIDDEN = new Set([
  "GOVERNANCE_BOOTSTRAP.md",
  "REGRESSION_CHECK.md",
  "WORKSPACE_INDEX.md",
  "PRESETS.md",
]);
const WRITE_RUN_REPORT_NAME_RE =
  /^(migrate_governance_rev6_|gov_uninstall_|\d{8}_\d{6}_apply_upgrade_from_boot_v1).*\.md$/i;

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

function normalizePathKey(input) {
  return String(input || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
}

function extractMarkdownSection(text, heading) {
  const re = new RegExp(
    `##\\s+${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=\\r?\\n##\\s+|$)`,
  );
  const m = String(text || "").match(re);
  return m ? m[1] : "";
}

function parseBulletList(sectionText) {
  return String(sectionText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, "").trim())
    .filter(Boolean);
}

function parseRunReportMeta(text) {
  const meta = {};
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("## ")) break;
    const m = line.match(/^-\s+([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    meta[String(m[1]).toLowerCase()] = String(m[2] || "").trim();
  }
  return meta;
}

function findLatestWriteRunReport(workspaceRoot, currentRunRelPath) {
  const runsRoot = path.join(workspaceRoot, "_runs");
  if (!exists(runsRoot)) return null;
  const currentName = path.basename(currentRunRelPath || "");
  const entries = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((e) => e.isFile() && WRITE_RUN_REPORT_NAME_RE.test(e.name) && e.name !== currentName)
    .map((e) => {
      const absPath = path.join(runsRoot, e.name);
      const stat = fs.statSync(absPath);
      return {
        name: e.name,
        absPath,
        relPath: path.join("_runs", e.name).replace(/\\/g, "/"),
        mtimeMs: stat.mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (entries.length === 0) return null;
  const chosen = entries[0];
  return {
    ...chosen,
    text: fs.readFileSync(chosen.absPath, "utf8"),
  };
}

function countAutogenMarkerPairs(text, marker) {
  const beginRe = new RegExp(`<!-- AUTOGEN:BEGIN ${escapeRegExp(marker)} -->`, "g");
  const endRe = new RegExp(`<!-- AUTOGEN:END ${escapeRegExp(marker)} -->`, "g");
  const begin = (String(text || "").match(beginRe) || []).length;
  const end = (String(text || "").match(endRe) || []).length;
  return { begin, end };
}

function makeQcItem(id, title, status, detail) {
  return {
    id: String(id).padStart(2, "0"),
    title: String(title || ""),
    status: String(status || "FAIL"),
    detail: String(detail || ""),
  };
}

function summarizeQcItems(items) {
  const out = { total: items.length, pass: 0, fail: 0, pass_na: 0 };
  for (const row of items) {
    if (row.status === "FAIL") out.fail += 1;
    else if (row.status === "PASS (N/A)") out.pass_na += 1;
    else out.pass += 1;
  }
  return out;
}

function writeRunReport(params) {
  const {
    runReportPath,
    ts,
    workspaceRoot,
    filesRead,
    folderChecks,
    equality,
    latestWriteRunReport,
    qcSummary,
    qcItems,
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
  lines.push("## LATEST_WRITE_RUN_REPORT");
  lines.push(`- ${latestWriteRunReport ? latestWriteRunReport : "none"}`);
  lines.push("");
  lines.push("## QC");
  lines.push("- fixed_denominator: 12/12");
  lines.push(`- pass: ${String(qcSummary.pass)}`);
  lines.push(`- fail: ${String(qcSummary.fail)}`);
  lines.push(`- pass_na: ${String(qcSummary.pass_na)}`);
  lines.push(`- result: ${status === "PASS" ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push("## QC_ITEMS");
  for (const row of qcItems) {
    lines.push(`- ${row.id}) ${row.title}: ${row.status} :: ${row.detail || "n/a"}`);
  }
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

  const requiredAuditReadPaths = REQUIRED_AUDIT_READ_RELS.map((rel) => path.join(workspaceRoot, rel));
  const requiredFolders = REQUIRED_FOLDER_RELS.map((rel) => path.join(workspaceRoot, rel));
  const folderChecks = requiredFolders.map((fullPath) => ({
    path: fullPath,
    status: exists(fullPath) ? "OK" : "MISSING",
  }));

  const filesRead = [canonicalPath, ...requiredAuditReadPaths];
  const targetPaths = blockSpecs.map((b) => path.join(workspaceRoot, b.targetRel));
  filesRead.push(...targetPaths);
  const filesReadUnique = Array.from(new Set(filesRead.map((p) => path.resolve(p))));

  const missingFiles = [];
  for (const p of filesReadUnique) if (!exists(p)) missingFiles.push(p);

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

  const latestWrite = findLatestWriteRunReport(workspaceRoot, runRelPath);
  const latestWriteText = latestWrite?.text || "";
  const latestWriteMeta = parseRunReportMeta(latestWriteText);
  const latestWriteStatus = String(latestWriteMeta.status || "").toUpperCase();
  const latestWriteTargets = parseBulletList(
    extractMarkdownSection(latestWriteText, "TARGET_FILES_TO_CHANGE"),
  ).filter((x) => x.toLowerCase() !== "none");
  const latestWriteSeeded = new Set(
    parseBulletList(extractMarkdownSection(latestWriteText, "SEEDED_MISSING_FILES")).map(
      normalizePathKey,
    ),
  );
  const latestWriteBackupRoot = String(latestWriteMeta.backup_root || "").trim();
  const indexUpdated = updateWorkspaceIndex(indexPath, runRelPath);

  const qcItems = [];
  {
    const requiredReadMissing = requiredAuditReadPaths
      .filter((p) => !exists(p))
      .map((p) => p.replace(/\\/g, "/"));
    const listedReadMissing = requiredAuditReadPaths
      .filter((p) => !filesReadUnique.includes(path.resolve(p)))
      .map((p) => p.replace(/\\/g, "/"));
    if (requiredReadMissing.length > 0 || listedReadMissing.length > 0) {
      const detailParts = [];
      if (requiredReadMissing.length > 0) {
        detailParts.push(`missing_required_reads=${requiredReadMissing.join(", ")}`);
      }
      if (listedReadMissing.length > 0) {
        detailParts.push(`unlisted_reads=${listedReadMissing.join(", ")}`);
      }
      qcItems.push(makeQcItem(1, "READ EVIDENCE", "FAIL", detailParts.join(" | ")));
    } else {
      qcItems.push(
        makeQcItem(
          1,
          "READ EVIDENCE",
          "PASS",
          "core governance reads listed (GOVERNANCE_BOOTSTRAP/PRESETS/WORKSPACE_INDEX/REGRESSION_CHECK)",
        ),
      );
    }
  }
  {
    const rootEntries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
    const rootSprawl = rootEntries
      .filter(
        (e) =>
          e.isFile() &&
          (ROOT_GOV_SPRAWL_FORBIDDEN.has(e.name) ||
            /^gov_(setup|migrate|audit|apply|uninstall)_.*\.md$/i.test(e.name) ||
            /^migrate_governance_.*\.md$/i.test(e.name) ||
            /^bootstrap_governance_.*\.md$/i.test(e.name)),
      )
      .map((e) => path.join(workspaceRoot, e.name).replace(/\\/g, "/"));
    const tmpLeak = /(?:^|[^\w])\/tmp\/|\\temp\\|\\tmp\\/i.test(latestWriteText);
    if (rootSprawl.length > 0 || tmpLeak) {
      qcItems.push(
        makeQcItem(
          2,
          "ROOT SPRAWL",
          "FAIL",
          `${rootSprawl.length > 0 ? `forbidden_root_artifacts=${rootSprawl.join(", ")}` : "forbidden_root_artifacts=none"}${
            tmpLeak ? " | tmp_path_detected_in_latest_run_report=true" : ""
          }`,
        ),
      );
    } else {
      qcItems.push(makeQcItem(2, "ROOT SPRAWL", "PASS", "no governance spillover artifacts detected in root"));
    }
  }
  {
    const indexExists = exists(indexPath);
    const indexText = indexExists ? fs.readFileSync(indexPath, "utf8") : "";
    const hasCurrentRun = indexExists && indexText.includes(runRelPath);
    const hasLatestWrite = !latestWrite?.relPath || indexText.includes(latestWrite.relPath);
    if (indexExists && hasCurrentRun && hasLatestWrite) {
      qcItems.push(makeQcItem(3, "INDEX UPDATED", "PASS", `workspace_index_updated=${String(indexUpdated || hasCurrentRun)}`));
    } else {
      qcItems.push(
        makeQcItem(
          3,
          "INDEX UPDATED",
          "FAIL",
          `index_exists=${String(indexExists)} current_run_indexed=${String(hasCurrentRun)} latest_write_indexed=${String(hasLatestWrite)}`,
        ),
      );
    }
  }
  {
    if (!latestWrite) {
      qcItems.push(makeQcItem(4, "UPDATE TYPE", "PASS (N/A)", "no prior write run report detected"));
    } else if (latestWriteTargets.length === 0) {
      qcItems.push(makeQcItem(4, "UPDATE TYPE", "PASS (N/A)", "latest write run has no target files to classify"));
    } else {
      const kinds = new Set();
      for (const raw of latestWriteTargets) {
        const candidate = String(raw || "").trim();
        if (!candidate) continue;
        const resolved = path.isAbsolute(candidate) ? path.normalize(candidate) : path.join(workspaceRoot, candidate);
        const rel = path.relative(workspaceRoot, resolved);
        if (!rel.startsWith("..")) {
          const relNorm = normalizePathKey(rel);
          if (relNorm.startsWith("_runs/") || relNorm.startsWith("memory/")) kinds.add("LOG update");
          else kinds.add("SSOT update");
        } else {
          kinds.add("PLATFORM update");
        }
      }
      qcItems.push(makeQcItem(4, "UPDATE TYPE", "PASS", `classified=${Array.from(kinds).join(", ")}`));
    }
  }
  {
    const hasMismatch = equality.some((x) => x.status !== "MATCH");
    const hasMissingFolder = folderChecks.some((x) => x.status !== "OK");
    const hasMissingFile = missingFiles.length > 0;
    if (!hasMismatch && !hasMissingFolder && !hasMissingFile) {
      qcItems.push(makeQcItem(5, "SSOT NO APPEND", "PASS", "core AUTOGEN canonical equality matched"));
    } else {
      qcItems.push(
        makeQcItem(
          5,
          "SSOT NO APPEND",
          "FAIL",
          `missing_folders=${String(folderChecks.filter((x) => x.status !== "OK").length)} missing_files=${String(missingFiles.length)} canonical_mismatch=${String(equality.filter((x) => x.status !== "MATCH").length)}`,
        ),
      );
    }
  }
  {
    const badMarkers = [];
    for (const spec of blockSpecs) {
      const targetPath = path.join(workspaceRoot, spec.targetRel);
      if (!exists(targetPath)) {
        badMarkers.push(`${targetPath.replace(/\\/g, "/")}::MISSING_FILE`);
        continue;
      }
      const text = fs.readFileSync(targetPath, "utf8");
      const counts = countAutogenMarkerPairs(text, spec.marker);
      if (counts.begin !== 1 || counts.end !== 1) {
        badMarkers.push(`${targetPath.replace(/\\/g, "/")}::BEGIN=${counts.begin} END=${counts.end}`);
      }
    }
    if (badMarkers.length === 0) {
      qcItems.push(makeQcItem(6, "ANCHOR UNIQUENESS", "PASS", "all required AUTOGEN markers exist exactly once"));
    } else {
      qcItems.push(makeQcItem(6, "ANCHOR UNIQUENESS", "FAIL", badMarkers.join(" | ")));
    }
  }
  {
    if (!latestWrite || latestWriteTargets.length === 0) {
      qcItems.push(makeQcItem(7, "MINIMAL TOUCH", "PASS (N/A)", "no latest write target set"));
    } else if (latestWriteTargets.length <= 12) {
      qcItems.push(makeQcItem(7, "MINIMAL TOUCH", "PASS", `target_file_count=${String(latestWriteTargets.length)}`));
    } else {
      qcItems.push(makeQcItem(7, "MINIMAL TOUCH", "FAIL", `target_file_count=${String(latestWriteTargets.length)} exceeds threshold=12`));
    }
  }
  {
    if (!latestWrite || latestWriteTargets.length === 0) {
      qcItems.push(makeQcItem(8, "BEFORE/AFTER PROOF", "PASS (N/A)", "no latest write target set"));
    } else {
      const proofFailures = [];
      const proofSummaries = [];
      for (const raw of latestWriteTargets) {
        const targetRaw = String(raw || "").trim();
        const targetKey = normalizePathKey(targetRaw);
        if (latestWriteSeeded.has(targetKey)) {
          proofSummaries.push(`${targetRaw}:seeded_new_file`);
          continue;
        }
        if (!latestWriteBackupRoot) {
          proofFailures.push(`${targetRaw}:missing_backup_root`);
          continue;
        }
        const targetAbs = path.isAbsolute(targetRaw) ? path.normalize(targetRaw) : path.join(workspaceRoot, targetRaw);
        const rel = path.relative(workspaceRoot, targetAbs);
        if (rel.startsWith("..")) {
          proofFailures.push(`${targetRaw}:outside_workspace`);
          continue;
        }
        const backupPath = path.join(latestWriteBackupRoot, rel);
        if (!exists(backupPath) || !exists(targetAbs)) {
          proofFailures.push(`${targetRaw}:backup_or_target_missing`);
          continue;
        }
        const beforeSha = sha12(fs.readFileSync(backupPath, "utf8"));
        const afterSha = sha12(fs.readFileSync(targetAbs, "utf8"));
        proofSummaries.push(`${targetRaw}:before=${beforeSha} after=${afterSha}`);
      }
      if (proofFailures.length > 0) {
        qcItems.push(makeQcItem(8, "BEFORE/AFTER PROOF", "FAIL", proofFailures.join(" | ")));
      } else {
        qcItems.push(makeQcItem(8, "BEFORE/AFTER PROOF", "PASS", proofSummaries.join(" | ")));
      }
    }
  }
  {
    const rootDuplicates = fs
      .readdirSync(workspaceRoot, { withFileTypes: true })
      .filter((e) => e.isFile() && ROOT_GOV_SPRAWL_FORBIDDEN.has(e.name))
      .map((e) => path.join(workspaceRoot, e.name).replace(/\\/g, "/"));
    if (rootDuplicates.length === 0) {
      qcItems.push(makeQcItem(9, "NO DUP TOPIC SSOT", "PASS", "no duplicate governance SSOT control files at root"));
    } else {
      qcItems.push(makeQcItem(9, "NO DUP TOPIC SSOT", "FAIL", `duplicate_root_ssot_files=${rootDuplicates.join(", ")}`));
    }
  }
  {
    const lessonsPath = path.join(workspaceRoot, "_control", "LESSONS.md");
    if (!latestWrite || !["FAIL", "BLOCKED"].includes(latestWriteStatus)) {
      qcItems.push(makeQcItem(10, "LESSONS LOOP", "PASS (N/A)", "no failed/blocking latest write run"));
    } else if (!exists(lessonsPath)) {
      qcItems.push(makeQcItem(10, "LESSONS LOOP", "FAIL", "latest write run failed/blocked but _control/LESSONS.md is missing"));
    } else {
      const lessons = fs.readFileSync(lessonsPath, "utf8");
      const hasCause = /root\s*cause/i.test(lessons);
      const hasPrevention = /prevention|recurrence|regression/i.test(lessons);
      if (hasCause && hasPrevention) {
        qcItems.push(makeQcItem(10, "LESSONS LOOP", "PASS", "LESSONS.md includes root cause and prevention/recurrence cues"));
      } else {
        qcItems.push(
          makeQcItem(
            10,
            "LESSONS LOOP",
            "FAIL",
            `root_cause_present=${String(hasCause)} prevention_or_recurrence_present=${String(hasPrevention)}`,
          ),
        );
      }
    }
  }
  {
    const rulesPath = path.join(workspaceRoot, "_control", "RULES.md");
    if (!exists(rulesPath)) {
      qcItems.push(makeQcItem(11, "CONSOLIDATION", "PASS (N/A)", "_control/RULES.md not present"));
    } else {
      const rules = fs.readFileSync(rulesPath, "utf8");
      const pointsToBootstrap = /GOVERNANCE_BOOTSTRAP\.md/i.test(rules);
      if (pointsToBootstrap) {
        qcItems.push(makeQcItem(11, "CONSOLIDATION", "PASS", "_control/RULES.md points to governance SSOT"));
      } else {
        qcItems.push(makeQcItem(11, "CONSOLIDATION", "FAIL", "_control/RULES.md missing governance SSOT pointer"));
      }
    }
  }

  const provisionalFailCount = qcItems.filter((x) => x.status === "FAIL").length;
  qcItems.push(
    makeQcItem(
      12,
      "COMPLETION LANGUAGE",
      "PASS",
      provisionalFailCount > 0
        ? "audit returns FAIL when any checklist item fails (no completion claim)"
        : "all checklist items passed",
    ),
  );

  const qcSummary = summarizeQcItems(qcItems);
  const status = qcSummary.fail === 0 ? "PASS" : "FAIL";

  writeRunReport({
    runReportPath,
    ts,
    workspaceRoot,
    filesRead: filesReadUnique.map((p) => p.replace(/\\/g, "/")),
    folderChecks,
    equality,
    latestWriteRunReport: latestWrite?.relPath || null,
    qcSummary,
    qcItems,
    status,
  });

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
      latest_write_run_report: latestWrite?.relPath || null,
      qc_summary: qcSummary,
      qc_items: qcItems,
      qc_failed_items: qcItems
        .filter((x) => x.status === "FAIL")
        .map((x) => `${x.id}) ${x.title}`),
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
