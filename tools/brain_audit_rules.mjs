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
    enableLexicalHints: false,
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
    if (arg === "--enable-lexical-hints") {
      opts.enableLexicalHints = true;
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
    "  node tools/brain_audit_rules.mjs [--workspace <path>] [--format md|json] [--fail-on-high] [--fail-on-any] [--enable-lexical-hints]",
    "",
    "Defaults:",
    "  --workspace <current working directory>",
    "  --format md",
    "  lexical checks disabled (structural evidence checks only)",
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

function isSectionBoundary(line) {
  return /^\s*[A-Z][A-Z0-9_\s-]{2,}\s*:/.test(line) || /^\s*#{1,6}\s+/.test(line);
}

function extractSectionEntries(lines, headerRe) {
  const start = lines.findIndex((line) => headerRe.test(line));
  if (start < 0) {
    return { found: false, startLine: 0, entries: [] };
  }
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

function scanFileForRules(workspace, fullPath, findings, opts) {
  const rel = safeRelative(workspace, fullPath);
  const lines = readLines(fullPath);
  const lowerRel = rel.toLowerCase();
  const isMemoryFile = lowerRel.startsWith("memory/");
  const isRunReport = lowerRel.startsWith("_runs/");

  if (opts.enableLexicalHints) {
    const impulseRe = /\b(immediately|do not wait|always act)\b|唔使等指令|不用等指令|即刻|立即/i;
    const confidenceRe = /\b(always answer|never uncertain|must complete|100%\s*sure)\b|一定正確|必定完成/i;
    const speculativeRe = /\b(likely|probably|maybe|estimate)\b|可能|估計|大概/i;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) continue;
      if (impulseRe.test(line)) {
        findings.push(
          makeFinding({
            severity: "low",
            rule: "LEXICAL_HINT_ACT_BEFORE_VERIFY",
            file: rel,
            line: i + 1,
            riskyText: line.trim().slice(0, 300),
            whyRisky: "Lexical hint suggests action-before-verification intent.",
            proposedFix: "Run semantic review and require verify-first wording if intent is risky.",
          }),
        );
      }
      if (confidenceRe.test(line)) {
        findings.push(
          makeFinding({
            severity: "low",
            rule: "LEXICAL_HINT_OVER_CONFIDENCE",
            file: rel,
            line: i + 1,
            riskyText: line.trim().slice(0, 300),
            whyRisky: "Lexical hint suggests unsupported certainty/completion intent.",
            proposedFix: "Run semantic review and add evidence-required wording if needed.",
          }),
        );
      }
      if (isMemoryFile && speculativeRe.test(line)) {
        findings.push(
          makeFinding({
            severity: "low",
            rule: "LEXICAL_HINT_SPECULATIVE_MEMORY",
            file: rel,
            line: i + 1,
            riskyText: line.trim().slice(0, 300),
            whyRisky: "Lexical hint suggests speculation may be treated as fact.",
            proposedFix: "Run semantic review and mark uncertainty with evidence/source path.",
          }),
        );
      }
    }
  }

  if (isRunReport) {
    const allText = lines.join("\n");
    const completionClaimRe = /^\s*(status|result|outcome)\s*:\s*(pass|passed|done|completed)\b/i;
    const scoreCompletionRe = /\b(12\/12|100%\s*(pass|complete)?)\b/i;
    const hasCompletionClaim =
      lines.some((line) => completionClaimRe.test(line)) || scoreCompletionRe.test(allText);
    const filesReadSection = extractSectionEntries(lines, /^\s*files[_\s-]*read\s*:/i);
    const targetSection = extractSectionEntries(
      lines,
      /^\s*target[_\s-]*files[_\s-]*to[_\s-]*change\s*:/i,
    );
    const hasFilesRead = filesReadSection.found;
    const hasTargets = targetSection.found;
    if (hasCompletionClaim && (!hasFilesRead || !hasTargets)) {
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
      if (!fileExists(target)) {
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

function summarize(findings) {
  const out = { high: 0, medium: 0, low: 0, total: findings.length };
  for (const f of findings) out[f.severity] += 1;
  return out;
}

function scannerMode(opts) {
  return opts.enableLexicalHints ? "structural_plus_lexical_hints" : "structural_only";
}

function toMarkdown(workspace, scanned, findings, summary, blocked, noScope, opts) {
  const lines = [];
  lines.push("BRAIN DOCS AUDIT REPORT");
  lines.push(`workspace: ${workspace.replace(/\\/g, "/")}`);
  lines.push(`scanner mode: ${scannerMode(opts)}`);
  lines.push(`status: ${blocked ? "BLOCKED" : findings.length > 0 ? "WARN" : "PASS"}`);
  lines.push(
    `summary: total=${summary.total}, high=${summary.high}, medium=${summary.medium}, low=${summary.low}`,
  );
  if (!opts.enableLexicalHints) {
    lines.push(
      "note: semantic risk detection is handled by /gov_brain_audit review; this script checks deterministic evidence structure.",
    );
  }
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
  for (const fullPath of files) scanFileForRules(workspace, fullPath, findings, opts);
  stableSortFindings(findings);
  const summary = summarize(findings);
  const blocked =
    noScope ||
    (opts.failOnAny && summary.total > 0) ||
    (opts.failOnHigh && summary.high > 0);

  if (opts.format === "json") {
    const payload = {
      workspace: workspace.replace(/\\/g, "/"),
      scannerMode: scannerMode(opts),
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
        opts,
      ) + "\n",
    );
  }

  process.exit(blocked ? 1 : 0);
}

main();
