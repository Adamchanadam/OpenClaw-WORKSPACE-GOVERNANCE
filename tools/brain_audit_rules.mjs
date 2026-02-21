#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };
const BRAIN_DOC_BASENAMES = [
  "USER.md",
  "IDENTITY.md",
  "TOOLS.md",
  "SOUL.md",
  "MEMORY.md",
  "HEARTBEAT.md",
];

function parseArgs(argv) {
  const opts = {
    workspace: process.cwd(),
    format: "md",
    failOnHigh: false,
    failOnAny: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--workspace" && argv[i + 1]) {
      opts.workspace = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--format" && argv[i + 1]) {
      const f = String(argv[i + 1]).toLowerCase();
      opts.format = f === "json" ? "json" : "md";
      i += 1;
      continue;
    }
    if (arg === "--fail-on-high") {
      opts.failOnHigh = true;
      continue;
    }
    if (arg === "--fail-on-any") {
      opts.failOnAny = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
  }
  return opts;
}

function printHelp() {
  const text = [
    "brain_audit_rules.mjs",
    "",
    "Usage:",
    "  node tools/brain_audit_rules.mjs [--workspace <path>] [--format md|json] [--fail-on-high] [--fail-on-any]",
    "",
    "Defaults:",
    "  --workspace <current working directory>",
    "  --format md",
  ].join("\n");
  process.stdout.write(text + "\n");
}

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/);
}

function safeRelative(root, fullPath) {
  return path.relative(root, fullPath).replace(/\\/g, "/");
}

function listRecentMemoryFiles(workspace, maxDays) {
  const dir = path.join(workspace, "memory");
  if (!fileExists(dir)) return [];
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
  if (!fileExists(dir)) return [];
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
    if (fileExists(fullPath)) results.push(fullPath);
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

function scanFileForRules(workspace, fullPath, findings) {
  const rel = safeRelative(workspace, fullPath);
  const lines = readLines(fullPath);
  const lowerRel = rel.toLowerCase();
  const isMemoryFile = lowerRel.startsWith("memory/");
  const isRunReport = lowerRel.startsWith("_runs/");

  const impulseRe = /\b(immediately|do not wait|always act)\b|唔使等指令|即刻|立即/i;
  const confidenceRe = /\b(always answer|never uncertain|must complete|100%\s*sure)\b|一定正確|必定完成/i;
  const completionClaimRe = /\b(completed|done|pass(?:ed)?|12\/12)\b|完成|通過|已完成/i;
  const readWordRe = /\b(read|reading|files?\s+read)\b|已讀|讀取/i;
  const speculativeRe = /\b(likely|probably|maybe|estimate)\b|可能|估計|大概/i;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (impulseRe.test(line)) {
      findings.push(
        makeFinding({
          severity: "high",
          rule: "ACT_BEFORE_VERIFY",
          file: rel,
          line: i + 1,
          riskyText: line.trim().slice(0, 300),
          whyRisky: "Encourages execution before verification/evidence checks.",
          proposedFix: "Require verify-first wording before any action.",
        }),
      );
    }
    if (confidenceRe.test(line)) {
      findings.push(
        makeFinding({
          severity: "high",
          rule: "OVER_CONFIDENCE",
          file: rel,
          line: i + 1,
          riskyText: line.trim().slice(0, 300),
          whyRisky: "Claims certainty/completion without requiring verifiable evidence.",
          proposedFix: "Replace absolute certainty with evidence-required wording.",
        }),
      );
    }
    if (isMemoryFile && speculativeRe.test(line)) {
      findings.push(
        makeFinding({
          severity: "medium",
          rule: "SPECULATIVE_MEMORY",
          file: rel,
          line: i + 1,
          riskyText: line.trim().slice(0, 300),
          whyRisky: "Speculative statement may be stored as factual memory.",
          proposedFix: "Mark uncertainty explicitly and attach source/evidence path.",
        }),
      );
    }
  }

  if (isRunReport) {
    const allText = lines.join("\n");
    const hasCompletionClaim = completionClaimRe.test(allText);
    const hasFilesRead = /files[_\s-]*read/i.test(allText);
    const hasTargets = /target[_\s-]*files[_\s-]*to[_\s-]*change/i.test(allText);
    if (hasCompletionClaim && (!hasFilesRead || !hasTargets)) {
      const lineNo = Math.max(
        1,
        lines.findIndex((l) => completionClaimRe.test(l)) + 1,
      );
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

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!readWordRe.test(line)) continue;
      for (const base of BRAIN_DOC_BASENAMES) {
        if (!line.includes(base)) continue;
        const target = path.join(workspace, base);
        if (!fileExists(target)) {
          findings.push(
            makeFinding({
              severity: "high",
              rule: "READ_CLAIM_MISMATCH",
              file: rel,
              line: i + 1,
              riskyText: line.trim().slice(0, 300),
              whyRisky: `Run report claims read evidence for missing file: ${base}.`,
              proposedFix: `Do not claim ${base} as read unless file exists; otherwise report it as missing.`,
            }),
          );
        }
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

function summarize(findings) {
  const out = { high: 0, medium: 0, low: 0, total: findings.length };
  for (const f of findings) out[f.severity] += 1;
  return out;
}

function toMarkdown(workspace, scanned, findings, summary, blocked, noScope) {
  const lines = [];
  lines.push("BRAIN DOCS AUDIT REPORT");
  lines.push(`workspace: ${workspace.replace(/\\/g, "/")}`);
  lines.push(`status: ${blocked ? "BLOCKED" : findings.length > 0 ? "WARN" : "PASS"}`);
  lines.push(
    `summary: total=${summary.total}, high=${summary.high}, medium=${summary.medium}, low=${summary.low}`,
  );
  lines.push("");
  lines.push("scanned files:");
  for (const f of scanned) lines.push(`- ${f}`);
  lines.push("");
  if (noScope) {
    lines.push("blocked reason: no in-scope files were found under this workspace path.");
    lines.push("hint: run with --workspace <workspace-root that contains AGENTS.md/Brain Docs/_runs>.");
    return lines.join("\n");
  }
  if (findings.length === 0) {
    lines.push("findings: none");
    return lines.join("\n");
  }
  lines.push("findings:");
  for (const f of findings) {
    lines.push(
      `- ${f.id} | ${f.severity.toUpperCase()} | ${f.rule} | ${f.file}:${f.line}`,
    );
    lines.push(`  - risky text: ${f.riskyText}`);
    lines.push(`  - why risky: ${f.whyRisky}`);
    lines.push(`  - proposed fix: ${f.proposedFix}`);
  }
  return lines.join("\n");
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const workspace = opts.workspace;
  if (!fileExists(workspace)) {
    process.stderr.write(`workspace not found: ${workspace}\n`);
    process.exit(2);
  }

  const files = collectScopeFiles(workspace);
  const noScope = files.length === 0;
  const findings = [];
  for (const fullPath of files) scanFileForRules(workspace, fullPath, findings);
  stableSortFindings(findings);
  const summary = summarize(findings);
  const blocked =
    noScope ||
    (opts.failOnAny && summary.total > 0) ||
    (opts.failOnHigh && summary.high > 0);

  if (opts.format === "json") {
    const payload = {
      workspace: workspace.replace(/\\/g, "/"),
      status: blocked ? "BLOCKED" : summary.total > 0 ? "WARN" : "PASS",
      noScope,
      summary,
      scannedFiles: files.map((f) => safeRelative(workspace, f)),
      findings,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  } else {
    process.stdout.write(
      toMarkdown(
        workspace,
        files.map((f) => safeRelative(workspace, f)),
        findings,
        summary,
        blocked,
        noScope,
      ) + "\n",
    );
  }

  process.exit(blocked ? 1 : 0);
}

main();
