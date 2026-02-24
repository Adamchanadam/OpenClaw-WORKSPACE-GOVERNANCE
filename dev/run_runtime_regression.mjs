#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const compiledPath = path.resolve(__dirname, ".tmp/index.js");
const compiledRoot = path.dirname(compiledPath);
const compiledToolsDir = path.join(compiledRoot, "tools");

function ensureRunnerFixture() {
  fs.mkdirSync(compiledToolsDir, { recursive: true });
  const toolFiles = [
    "gov_setup_sync.mjs",
    "gov_migrate_sync.mjs",
    "gov_audit_sync.mjs",
    "gov_apply_sync.mjs",
    "gov_uninstall_sync.mjs",
  ];
  for (const name of toolFiles) {
    const src = path.join(projectRoot, "tools", name);
    const dest = path.join(compiledToolsDir, name);
    fs.copyFileSync(src, dest);
  }

  const pluginLocalFiles = [
    "OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
    "WORKSPACE_GOVERNANCE_MIGRATION.md",
    "APPLY_UPGRADE_FROM_BOOT.md",
    "WORKSPACE_GOVERNANCE_README.md",
    path.join("manual_prompt", "MIGRATION_prompt_for_RUNNING_OpenClaw.md"),
    path.join("manual_prompt", "POST_MIGRATION_AUDIT_prompt_for_RUNNING_OpenClaw.md"),
  ];
  for (const rel of pluginLocalFiles) {
    const src = path.join(projectRoot, rel);
    const dest = path.join(compiledRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function writeFile(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  return full;
}

function makeCanonicalSource() {
  const agentsPayload = [
    "# AGENTS canonical",
    "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
    "CANONICAL_AGENTS",
    "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
    "",
  ].join("\n");
  const govPayload = [
    "# GOV canonical",
    "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
    "CANONICAL_GOV",
    "<!-- AUTOGEN:END GOV_CORE_v1 -->",
    "",
  ].join("\n");
  const regressionPayload = [
    "# REGRESSION canonical",
    "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
    "CANONICAL_REGRESSION",
    "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
    "",
  ].join("\n");
  const workspaceIndexPayload = [
    "# WORKSPACE_INDEX canonical",
    "- _runs/",
    "",
  ].join("\n");
  const presetsPayload = [
    "# PRESETS canonical",
    "- VaultPolicy: SingleVault",
    "",
  ].join("\n");
  return [
    "<<BEGIN FILE: AGENTS.md>>",
    agentsPayload.trimEnd(),
    "<<END FILE>>",
    "",
    "<<BEGIN FILE: _control/GOVERNANCE_BOOTSTRAP.md>>",
    govPayload.trimEnd(),
    "<<END FILE>>",
    "",
    "<<BEGIN FILE: _control/REGRESSION_CHECK.md>>",
    regressionPayload.trimEnd(),
    "<<END FILE>>",
    "",
    "<<BEGIN FILE: _control/WORKSPACE_INDEX.md>>",
    workspaceIndexPayload.trimEnd(),
    "<<END FILE>>",
    "",
    "<<BEGIN FILE: _control/PRESETS.md>>",
    presetsPayload.trimEnd(),
    "<<END FILE>>",
    "",
  ].join("\n");
}

function makeMigrationPrompt() {
  return [
    "# migration contract",
    "Do NOT run canonical equality as a pre-change blocker",
    "CHANGE first, then canonical equality at QC",
    "",
  ].join("\n");
}

function withTempWorkspace(seedName, setupFn, options = {}) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `gov-reg-${seedName}-`));
  const configPath = path.join(tempRoot, "openclaw.test.json");
  const allow = Array.isArray(options.allowList)
    ? options.allowList
    : ["openclaw-workspace-governance"];
  writeFile(
    tempRoot,
    "openclaw.test.json",
    JSON.stringify(
      {
        plugins: { allow },
        agents: { defaults: { workspace: tempRoot } },
      },
      null,
      2,
    ) + "\n",
  );
  setupFn(tempRoot);

  const prevWorkspace = process.env.OPENCLAW_WORKSPACE;
  const prevWorkspaceRoot = process.env.OPENCLAW_WORKSPACE_ROOT;
  const prevConfig = process.env.OPENCLAW_CONFIG;
  process.env.OPENCLAW_WORKSPACE = tempRoot;
  process.env.OPENCLAW_WORKSPACE_ROOT = tempRoot;
  process.env.OPENCLAW_CONFIG = configPath;

  return {
    root: tempRoot,
    restore: () => {
      if (prevWorkspace === undefined) delete process.env.OPENCLAW_WORKSPACE;
      else process.env.OPENCLAW_WORKSPACE = prevWorkspace;
      if (prevWorkspaceRoot === undefined) delete process.env.OPENCLAW_WORKSPACE_ROOT;
      else process.env.OPENCLAW_WORKSPACE_ROOT = prevWorkspaceRoot;
      if (prevConfig === undefined) delete process.env.OPENCLAW_CONFIG;
      else process.env.OPENCLAW_CONFIG = prevConfig;
      fs.rmSync(tempRoot, { recursive: true, force: true });
    },
  };
}

ensureRunnerFixture();
const mod = await import(pathToFileURL(compiledPath).href);
const register = mod.default;

function createHarness(pluginConfig = {}) {
  const handlers = new Map();
  const commands = new Map();
  const logs = [];
  const api = {
    pluginConfig,
    logger: {
      info: (msg) => logs.push({ level: "info", msg: String(msg) }),
      warn: (msg) => logs.push({ level: "warn", msg: String(msg) }),
    },
    on: (name, fn) => {
      handlers.set(name, fn);
    },
    registerCommand: (def) => {
      commands.set(String(def?.name || ""), def);
    },
  };
  register(api);
  return { handlers, commands, logs };
}

async function runCase(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    return true;
  } catch (err) {
    console.error(`FAIL ${name}`);
    console.error(String(err?.stack || err));
    return false;
  }
}

function toolEvent(command) {
  return { toolName: "shell_command", params: { command } };
}

function governanceToolEvent(
  toolName = "openclaw-workspace-governance.gov_setup",
  params = { mode: "check" },
) {
  return { toolName, params };
}

function promptEvent(userText) {
  return {
    messages: [
      { role: "user", content: userText },
    ],
  };
}

const cases = [];

cases.push(() => {
  const { commands } = createHarness();
  assert.equal(commands.has("gov_help"), true);
  assert.equal(commands.has("gov_setup"), true);
  assert.equal(commands.has("gov_migrate"), true);
  assert.equal(commands.has("gov_apply"), true);
  assert.equal(commands.has("gov_uninstall"), true);
  assert.equal(commands.has("gov_audit"), true);
  const help = commands.get("gov_help");
  const setup = commands.get("gov_setup");
  assert.equal(typeof help?.handler, "function");
  assert.equal(typeof setup?.handler, "function");
});

cases.push(async () => {
  const { commands } = createHarness();
  const uninstall = commands.get("gov_uninstall");
  const out = await uninstall.handler({ args: "wrong" });
  const text = String(out?.text || "");
  assert.ok(text.includes("STATUS"));
  assert.ok(text.toLowerCase().includes("blocked"));
  assert.ok(text.toLowerCase().includes("invalid mode"));
});

cases.push(async () => {
  const fixture = withTempWorkspace("uninstall-check-brain-backup", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "USER.md", "CURRENT_USER_DOC\n");
    writeFile(
      root,
      "archive/_brain_docs_autofix_20260223_010000/USER.md",
      "ORIGINAL_USER_DOC\n",
    );
  });
  try {
    const { commands } = createHarness();
    const uninstall = commands.get("gov_uninstall");
    const out = await uninstall.handler({ args: "check" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nRESIDUAL/i);
    assert.ok(text.includes("brain_docs_backup_roots_found"));
    assert.ok(text.includes("brain_docs_restore_candidate_count"));
    assert.ok(text.includes("/gov_uninstall uninstall"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("uninstall-quick-restore-brain-backup", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "USER.md", "CURRENT_USER_DOC\n");
    writeFile(
      root,
      "archive/_brain_docs_autofix_20260223_010000/USER.md",
      "ORIGINAL_USER_DOC\n",
    );
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_README.md",
      "# gov prompt residual\n",
    );
  });
  try {
    const { commands } = createHarness();
    const uninstall = commands.get("gov_uninstall");
    const out = await uninstall.handler({ args: "quick" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.ok(text.includes("auto_chain: check -> uninstall"));
    assert.ok(text.includes("brain_backup_used"));
    assert.ok(text.includes("openclaw plugins disable openclaw-workspace-governance"));
    const userDoc = fs.readFileSync(path.join(fixture.root, "USER.md"), "utf8");
    assert.equal(userDoc, "ORIGINAL_USER_DOC\n");
    assert.equal(fs.existsSync(path.join(fixture.root, "prompts", "governance")), false);
    const runEntries = fs.readdirSync(path.join(fixture.root, "_runs"), { withFileTypes: true });
    const hasRunReport = runEntries.some(
      (entry) => entry.isFile() && /^gov_uninstall_\d{8}_\d{6}\.md$/i.test(entry.name),
    );
    assert.equal(hasRunReport, true);
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("uninstall-preserve-non-governance-files", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "USER.md", "CURRENT_USER_DOC\n");
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_README.md",
      "# gov prompt residual\n",
    );
    writeFile(root, "prompts/governance/CUSTOM_USER_NOTE.md", "KEEP_ME\n");
    writeFile(root, "_runs/custom_user_report.md", "KEEP_CUSTOM_RUN\n");
  });
  try {
    const { commands } = createHarness();
    const uninstall = commands.get("gov_uninstall");
    const out = await uninstall.handler({ args: "uninstall" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.equal(
      fs.readFileSync(path.join(fixture.root, "prompts/governance/CUSTOM_USER_NOTE.md"), "utf8"),
      "KEEP_ME\n",
    );
    assert.equal(
      fs.readFileSync(path.join(fixture.root, "_runs/custom_user_report.md"), "utf8"),
      "KEEP_CUSTOM_RUN\n",
    );
    assert.equal(
      fs.existsSync(path.join(fixture.root, "prompts/governance/WORKSPACE_GOVERNANCE_README.md")),
      false,
    );
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const { commands } = createHarness();
  const setup = commands.get("gov_setup");
  const out = await setup.handler({ args: "invalid-mode" });
  const text = String(out?.text || "");
  assert.ok(text.includes("STATUS"));
  assert.ok(text.toLowerCase().includes("blocked"));
  assert.ok(text.toLowerCase().includes("invalid mode"));
});

cases.push(async () => {
  const fixture = withTempWorkspace("apply-invalid-item", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
  });
  try {
    const { commands } = createHarness();
    const apply = commands.get("gov_apply");
    const out = await apply.handler({ args: "abc" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nBLOCKED/i);
    assert.ok(text.toLowerCase().includes("invalid item"));
    assert.ok(text.includes("/gov_apply 01"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("apply-missing-menu", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "prompts/governance/APPLY_UPGRADE_FROM_BOOT.md", "# apply prompt\n");
    writeFile(root, "_control/ACTIVE_GUARDS.md", "# guards\n");
    writeFile(root, "_control/LESSONS.md", "# lessons\n");
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    writeFile(root, "_control/REGRESSION_CHECK.md", "# regression\n");
    writeFile(root, "_runs/no_menu.md", "# no menu\n");
  });
  try {
    const { commands } = createHarness();
    const apply = commands.get("gov_apply");
    const out = await apply.handler({ args: "01" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nBLOCKED/i);
    assert.ok(text.includes("BOOT_MENU_MISSING"));
    assert.ok(text.includes("OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("apply-pass-qc", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "prompts/governance/APPLY_UPGRADE_FROM_BOOT.md", "# apply prompt\n");
    writeFile(
      root,
      "_control/ACTIVE_GUARDS.md",
      [
        "# ACTIVE_GUARDS",
        "### Guard #001: baseline",
        "- note: baseline guard",
        "",
      ].join("\n"),
    );
    writeFile(root, "_control/LESSONS.md", "# LESSONS\n");
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# WORKSPACE_INDEX\n");
    writeFile(root, "_control/REGRESSION_CHECK.md", "# REGRESSION\n");
    writeFile(
      root,
      "_runs/boot_menu_latest.md",
      [
        "BOOT UPGRADE MENU (BOOT+APPLY v1)",
        "01) Elevate QC#3 (INDEX UPDATED)",
        "02) Elevate Guard#007 (Rule Clarity)",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const apply = commands.get("gov_apply");
    const out = await apply.handler({ args: "01" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.ok(text.includes("/gov_migrate"));
    assert.ok(text.includes("/gov_audit"));
    const guards = fs.readFileSync(path.join(fixture.root, "_control/ACTIVE_GUARDS.md"), "utf8");
    const lessons = fs.readFileSync(path.join(fixture.root, "_control/LESSONS.md"), "utf8");
    const index = fs.readFileSync(path.join(fixture.root, "_control/WORKSPACE_INDEX.md"), "utf8");
    assert.ok(guards.includes("QC#3 Recurrence Elevation"));
    assert.ok(lessons.includes("QC#3 recurrence"));
    assert.ok(index.includes("apply_upgrade_from_boot_v1.md"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("apply-pass-guard", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "prompts/governance/APPLY_UPGRADE_FROM_BOOT.md", "# apply prompt\n");
    writeFile(
      root,
      "_control/ACTIVE_GUARDS.md",
      [
        "# ACTIVE_GUARDS",
        "### Guard #007: Rule Clarity",
        "- required: provide explicit evidence",
        "",
      ].join("\n"),
    );
    writeFile(root, "_control/LESSONS.md", "# LESSONS\n");
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# WORKSPACE_INDEX\n");
    writeFile(root, "_control/REGRESSION_CHECK.md", "# REGRESSION\n");
    writeFile(
      root,
      "_runs/boot_menu_latest.md",
      [
        "BOOT UPGRADE MENU (BOOT+APPLY v1)",
        "01) Elevate Guard#007 (Rule Clarity)",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const apply = commands.get("gov_apply");
    const out = await apply.handler({ args: "01" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    const lessons = fs.readFileSync(path.join(fixture.root, "_control/LESSONS.md"), "utf8");
    assert.ok(lessons.includes("Guard#007 escalation"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace(
    "setup-check-allow-missing",
    (root) => {
      writeFile(root, "AGENTS.md", "# workspace agents\n");
    },
    { allowList: [] },
  );
  try {
    const { commands } = createHarness();
    const setup = commands.get("gov_setup");
    const out = await setup.handler({ args: "check" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nREADY_WITH_WARNING/i);
    assert.ok(text.includes("ALLOW_EMPTY") || text.includes("ALLOW_NOT_SET"));
    assert.ok(text.includes("/gov_openclaw_json"));
    assert.ok(text.includes("/gov_setup check"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("setup-install", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(root, "_control/PRESETS.md", "# PRESETS\n");
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "projects"), { recursive: true });
    fs.mkdirSync(path.join(root, "archive"), { recursive: true });
  });
  try {
    const { commands } = createHarness();
    const setup = commands.get("gov_setup");
    const out = await setup.handler({ args: "quick" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\n(PASS|FAIL)/i);
    assert.ok(text.includes("auto_chain: check -> (install|upgrade|skip) -> migrate -> audit"));
    assert.ok(
      text.includes("One-click governance flow completed") ||
        text.includes("一鍵治理流程完成") ||
        text.includes("One-click flow reached audit failure") ||
        text.includes("一鍵流程已跑到 audit 失敗"),
    );
    assert.ok(text.includes("flow_trace"));
    assert.ok(text.includes("/gov_setup quick"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("setup-quick-heals-audit-prereq-and-marker-anomaly", (root) => {
    writeFile(
      root,
      "AGENTS.md",
      [
        "# AGENTS target",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "OLD_AGENTS",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "OLD_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "OLD_REG",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "projects"), { recursive: true });
    fs.mkdirSync(path.join(root, "archive"), { recursive: true });
  });
  try {
    const { commands } = createHarness();
    const setup = commands.get("gov_setup");
    const out = await setup.handler({ args: "quick" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\n(PASS|FAIL)/i);
    assert.ok(text.includes("auto_chain: check -> (install|upgrade|skip) -> migrate -> audit"));
    assert.ok(text.includes("flow_trace"));
    assert.equal(
      fs.existsSync(path.join(fixture.root, "_control", "PRESETS.md")),
      true,
    );
    assert.equal(
      fs.existsSync(path.join(fixture.root, "_control", "WORKSPACE_INDEX.md")),
      true,
    );
    const agents = fs.readFileSync(path.join(fixture.root, "AGENTS.md"), "utf8");
    const endCount = (agents.match(/<!-- AUTOGEN:END AGENTS_CORE_v1 -->/g) || []).length;
    assert.equal(endCount, 1);
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("migrate-missing-control", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
      makeMigrationPrompt(),
    );
  });
  try {
    const { commands } = createHarness();
    const migrate = commands.get("gov_migrate");
    const out = await migrate.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.ok(text.includes("seeded_missing_files"));
    const gov = fs.readFileSync(path.join(fixture.root, "_control/GOVERNANCE_BOOTSTRAP.md"), "utf8");
    const reg = fs.readFileSync(path.join(fixture.root, "_control/REGRESSION_CHECK.md"), "utf8");
    assert.ok(gov.includes("AUTOGEN:BEGIN GOV_CORE_v1"));
    assert.ok(reg.includes("AUTOGEN:BEGIN REGRESSION_12_v1"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("migrate-missing-prompts", (root) => {
    writeFile(
      root,
      "AGENTS.md",
      [
        "# AGENTS target",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "OLD",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "OLD",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "OLD",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const migrate = commands.get("gov_migrate");
    const out = await migrate.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nBLOCKED/i);
    assert.ok(text.includes("MISSING_REQUIRED_FILES"));
    assert.ok(text.includes("Governance prompts are missing.") || text.includes("缺少 governance prompts"));
    assert.ok(text.includes("/gov_setup upgrade"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("migrate-pass", (root) => {
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
      makeMigrationPrompt(),
    );
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    writeFile(
      root,
      "AGENTS.md",
      [
        "# AGENTS target",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "OLD_AGENTS",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "OLD_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "OLD_REG",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const migrate = commands.get("gov_migrate");
    const out = await migrate.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.ok(text.includes("deterministic migration completed"));
    assert.ok(text.includes("/gov_audit"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("migrate-preserves-user-content-no-markers", (root) => {
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
      makeMigrationPrompt(),
    );
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    // AGENTS.md with rich user content but NO AUTOGEN markers
    writeFile(
      root,
      "AGENTS.md",
      [
        "# OpenClaw AGENTS",
        "",
        "## Memory",
        "- Remember user preferences across sessions",
        "",
        "## Safety",
        "- Never delete user files without confirmation",
        "",
        "## Heartbeats",
        "- Check in every 30 minutes",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "OLD_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "OLD_REG",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const migrate = commands.get("gov_migrate");
    const out = await migrate.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    const agents = fs.readFileSync(path.join(fixture.root, "AGENTS.md"), "utf8");
    // All user sections must be preserved
    assert.ok(agents.includes("## Memory"), "Memory section must be preserved");
    assert.ok(agents.includes("## Safety"), "Safety section must be preserved");
    assert.ok(agents.includes("## Heartbeats"), "Heartbeats section must be preserved");
    // AUTOGEN block must be injected
    assert.ok(agents.includes("AUTOGEN:BEGIN AGENTS_CORE_v1"), "AUTOGEN block must be injected");
    assert.ok(agents.includes("CANONICAL_AGENTS"), "Canonical inner must be present");
    // Exactly 1 BEGIN + 1 END
    const beginCount = (agents.match(/<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->/g) || []).length;
    const endCount = (agents.match(/<!-- AUTOGEN:END AGENTS_CORE_v1 -->/g) || []).length;
    assert.equal(beginCount, 1, "must have exactly 1 BEGIN marker");
    assert.equal(endCount, 1, "must have exactly 1 END marker");
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("migrate-preserves-user-content-marker-anomaly", (root) => {
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md",
      makeMigrationPrompt(),
    );
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    // AGENTS.md with user content + 2 duplicate AUTOGEN blocks (begin=2, end=2)
    writeFile(
      root,
      "AGENTS.md",
      [
        "# OpenClaw AGENTS",
        "",
        "## Memory",
        "- Remember user preferences across sessions",
        "",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "OLD_AGENTS_BLOCK_1",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
        "## Safety",
        "- Never delete user files without confirmation",
        "",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "OLD_AGENTS_BLOCK_2",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
        "## Heartbeats",
        "- Check in every 30 minutes",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "OLD_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "OLD_REG",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const migrate = commands.get("gov_migrate");
    const out = await migrate.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    const agents = fs.readFileSync(path.join(fixture.root, "AGENTS.md"), "utf8");
    // User sections must be preserved
    assert.ok(agents.includes("## Memory"), "Memory section must be preserved");
    assert.ok(agents.includes("## Safety"), "Safety section must be preserved");
    assert.ok(agents.includes("## Heartbeats"), "Heartbeats section must be preserved");
    // Old duplicate blocks must be removed
    assert.ok(!agents.includes("OLD_AGENTS_BLOCK_1"), "old block 1 must be removed");
    assert.ok(!agents.includes("OLD_AGENTS_BLOCK_2"), "old block 2 must be removed");
    // Single clean AUTOGEN block with canonical content
    assert.ok(agents.includes("CANONICAL_AGENTS"), "Canonical inner must be present");
    const beginCount = (agents.match(/<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->/g) || []).length;
    const endCount = (agents.match(/<!-- AUTOGEN:END AGENTS_CORE_v1 -->/g) || []).length;
    assert.equal(beginCount, 1, "must have exactly 1 BEGIN marker");
    assert.equal(endCount, 1, "must have exactly 1 END marker");
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("audit-fail-missing-presets", (root) => {
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    writeFile(
      root,
      "AGENTS.md",
      [
        "# AGENTS target",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "CANONICAL_AGENTS",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "CANONICAL_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "CANONICAL_REGRESSION",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(root, "_runs"), { recursive: true });
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "projects"), { recursive: true });
    fs.mkdirSync(path.join(root, "archive"), { recursive: true });
  });
  try {
    const { commands } = createHarness();
    const audit = commands.get("gov_audit");
    const out = await audit.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nFAIL/i);
    assert.ok(text.includes("qc_failed_items"));
    assert.ok(text.includes("qc_12_item"));
    assert.ok(text.toLowerCase().includes("read evidence"));
    assert.ok(text.includes("/gov_migrate"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("audit-pass-12-items", (root) => {
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(root, "_control/PRESETS.md", "# PRESETS\n");
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    writeFile(
      root,
      "AGENTS.md",
      [
        "# AGENTS target",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "CANONICAL_AGENTS",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "CANONICAL_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "CANONICAL_REGRESSION",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(root, "_runs"), { recursive: true });
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "projects"), { recursive: true });
    fs.mkdirSync(path.join(root, "archive"), { recursive: true });
  });
  try {
    const { commands } = createHarness();
    const audit = commands.get("gov_audit");
    const out = await audit.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.ok(text.includes("qc_summary"));
    assert.ok(text.includes("qc_12_item"));
    assert.ok(text.includes("FAIL=0"));
  } finally {
    fixture.restore();
  }
});

cases.push(async () => {
  const fixture = withTempWorkspace("audit-ignores-non-deterministic-run-reports", (root) => {
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      makeCanonicalSource(),
    );
    writeFile(root, "_control/PRESETS.md", "# PRESETS\n");
    writeFile(root, "_control/WORKSPACE_INDEX.md", "# index\n");
    writeFile(
      root,
      "AGENTS.md",
      [
        "# AGENTS target",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "CANONICAL_AGENTS",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      [
        "# GOV target",
        "<!-- AUTOGEN:BEGIN GOV_CORE_v1 -->",
        "CANONICAL_GOV",
        "<!-- AUTOGEN:END GOV_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      [
        "# REG target",
        "<!-- AUTOGEN:BEGIN REGRESSION_12_v1 -->",
        "CANONICAL_REGRESSION",
        "<!-- AUTOGEN:END REGRESSION_12_v1 -->",
        "",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(root, "_runs"), { recursive: true });
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "projects"), { recursive: true });
    fs.mkdirSync(path.join(root, "archive"), { recursive: true });
    // Place a fake brain audit run report with non-standard format
    writeFile(
      root,
      "_runs/gov_brain_audit_apply_F001_F002_20260224_093000.md",
      [
        "# gov_brain_audit apply F001,F002",
        "",
        "- status: PASS",
        "- applied: F001, F002",
        "",
        "## CHANGES",
        "- Updated HEARTBEAT.md",
        "- Updated IDENTITY.md",
        "",
      ].join("\n"),
    );
  });
  try {
    const { commands } = createHarness();
    const audit = commands.get("gov_audit");
    const out = await audit.handler({});
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    assert.ok(text.includes("FAIL=0"));
  } finally {
    fixture.restore();
  }
});

cases.push(() => {
  const { handlers, logs } = createHarness({
    runtimeGatePolicy: { denyShellPrefixes: ["openclaw"] },
  });
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(toolEvent("openclaw plugins install foo"), { sessionKey: "s1" });
  assert.equal(out, undefined);
  assert.ok(
    logs.some((x) => x.level === "warn" && x.msg.includes("deny matched but ignored")),
    "expected ignore-deny warning log for openclaw system channel",
  );
});

cases.push(() => {
  const { handlers } = createHarness({
    runtimeGatePolicy: { denyShellPrefixes: ["copy-item"] },
  });
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(toolEvent("Copy-Item a b"), { sessionKey: "s2" });
  assert.equal(Boolean(out?.block), true);
  assert.ok(String(out?.blockReason || "").toLowerCase().includes("runtime policy"));
});

cases.push(() => {
  const { handlers } = createHarness({
    runtimeGatePolicy: { denyShellPrefixes: ["openclaw"] },
  });
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    toolEvent("openclaw plugins install foo && openclaw gateway restart"),
    { sessionKey: "s3" },
  );
  assert.equal(out, undefined);
});

cases.push(() => {
  const { handlers } = createHarness({
    runtimeGatePolicy: { denyShellPrefixes: ["openclaw"] },
  });
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    toolEvent("openclaw plugins install foo & openclaw gateway restart"),
    { sessionKey: "s4" },
  );
  assert.equal(out, undefined);
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    toolEvent("openclaw plugins install foo && Copy-Item a b"),
    { sessionKey: "s5" },
  );
  assert.equal(Boolean(out?.block), true);
  const reason = String(out?.blockReason || "");
  assert.ok(
    reason.includes("guard activated") || reason.includes("已啟動保護"),
    "expected governance guard block reason",
  );
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const out = beforePrompt(
    promptEvent("Please run openclaw plugins update openclaw-workspace-governance and restart gateway."),
    { sessionKey: "s6" },
  );
  const text = String(out?.prependContext || "");
  assert.ok(
    text.includes("Update detected") || text.includes("已偵測到 update"),
    "expected update guidance",
  );
  assert.ok(!text.includes("Runtime governance guard preflight"));
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const out = beforePrompt(
    promptEvent("Please create and save a new file test.txt with hello."),
    { sessionKey: "s7" },
  );
  const text = String(out?.prependContext || "");
  assert.ok(
    text.includes("Runtime governance guard preflight") ||
      text.includes("Runtime governance 預檢") ||
      text.includes("Governance health-check suggestion") ||
      text.includes("Governance 健康檢查建議"),
    "expected write-intent guidance (preflight or health-check suggestion)",
  );
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const beforeTool = handlers.get("before_tool_call");
  beforePrompt(promptEvent("/gov_setup upgrade"), { sessionKey: "s8" });
  const out = beforeTool(
    toolEvent("Copy-Item C:\\src\\manual_prompt\\* C:\\ws\\prompts\\governance\\manual_prompt\\"),
    { sessionKey: "s8" },
  );
  assert.equal(out, undefined);
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const beforeTool = handlers.get("before_tool_call");
  // Simulate an active brain-audit requirement window without gov write entrypoint context.
  beforePrompt(promptEvent("/gov_audit"), { sessionKey: "s9" });
  const out = beforeTool(
    toolEvent("Copy-Item C:\\src\\OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md C:\\ws\\prompts\\governance\\"),
    { sessionKey: "s9" },
  );
  assert.equal(out, undefined);
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const beforeTool = handlers.get("before_tool_call");
  // Keep health-check gate effective for non-governance generic writes.
  beforePrompt(promptEvent("/gov_audit"), { sessionKey: "s10" });
  let blocked = false;
  let reason = "";
  for (let i = 0; i < 80; i += 1) {
    const out = beforeTool(
      toolEvent(`Copy-Item C:\\tmp\\a_${i}.txt C:\\tmp\\b_${i}.txt`),
      { sessionKey: "s10" },
    );
    if (Boolean(out?.block)) {
      blocked = true;
      reason = String(out?.blockReason || "");
      break;
    }
  }
  assert.equal(blocked, true);
  assert.ok(reason.toLowerCase().includes("health-check"));
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const out = beforePrompt(
    promptEvent("/gov_setup upgrade"),
    { sessionKey: "s11" },
  );
  const text = String(out?.prependContext || "");
  assert.ok(text.toLowerCase().includes("must execute upgrade workflow"));
  assert.ok(text.toLowerCase().includes("do not output skipped"));
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    governanceToolEvent(),
    { sessionKey: "s12", channel: "default" },
  );
  assert.equal(Boolean(out?.block), true);
  const reason = String(out?.blockReason || "");
  assert.ok(
    reason.toLowerCase().includes("tool-exposure guard") ||
      reason.toLowerCase().includes("permissive tool policy"),
    "expected permissive-context governance tool-exposure block",
  );
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    governanceToolEvent(),
    { sessionKey: "s12b" },
  );
  assert.equal(Boolean(out?.block), true);
  const reason = String(out?.blockReason || "");
  assert.ok(
    reason.toLowerCase().includes("explicit") ||
      reason.toLowerCase().includes("fail-closed"),
    "expected explicit-intent root-fix block even without context metadata",
  );
});

cases.push(() => {
  const { handlers } = createHarness();
  const beforePrompt = handlers.get("before_prompt_build");
  const beforeTool = handlers.get("before_tool_call");
  beforePrompt(promptEvent("/gov_setup check"), { sessionKey: "s13", channel: "default" });
  const out = beforeTool(
    governanceToolEvent(),
    { sessionKey: "s13", channel: "default" },
  );
  assert.equal(out, undefined);
});

cases.push(() => {
  const { handlers, logs } = createHarness({
    toolExposureGuard: { mode: "advisory" },
  });
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    governanceToolEvent(),
    { sessionKey: "s14", channel: "default" },
  );
  assert.equal(out, undefined);
  assert.ok(
    logs.some((x) => x.level === "warn" && x.msg.includes("tool-exposure advisory only")),
    "expected advisory log when mode=advisory",
  );
});

cases.push(() => {
  const { handlers } = createHarness({
    toolExposureGuard: {
      requireExplicitGovCommandIntent: false,
      permissiveContexts: ["default"],
    },
  });
  const beforeTool = handlers.get("before_tool_call");
  const out = beforeTool(
    governanceToolEvent(),
    { sessionKey: "s15", channel: "restricted.chat" },
  );
  assert.equal(out, undefined);
});

// C38: uninstall-strips-agents-autogen-preserves-content
cases.push(async () => {
  const fixture = withTempWorkspace("uninstall-strips-agents-autogen-preserves-content", (root) => {
    writeFile(
      root,
      "AGENTS.md",
      [
        "# OpenClaw AGENTS",
        "",
        "## Memory",
        "- Remember user preferences across sessions",
        "",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "Workspace Agent Loader ->Governance Router",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
        "## Safety",
        "- Never delete user files without confirmation",
        "",
        "## Heartbeats",
        "- Check in every 30 minutes",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_README.md",
      "# gov prompt residual\n",
    );
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      "# bootstrap prompt\n",
    );
  });
  try {
    const { commands } = createHarness();
    const uninstall = commands.get("gov_uninstall");
    const out = await uninstall.handler({ args: "uninstall" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    // AGENTS.md must still exist
    assert.equal(fs.existsSync(path.join(fixture.root, "AGENTS.md")), true, "AGENTS.md must survive uninstall");
    const agents = fs.readFileSync(path.join(fixture.root, "AGENTS.md"), "utf8");
    // User sections preserved
    assert.ok(agents.includes("## Memory"), "Memory section must be preserved");
    assert.ok(agents.includes("## Safety"), "Safety section must be preserved");
    assert.ok(agents.includes("## Heartbeats"), "Heartbeats section must be preserved");
    // No AUTOGEN markers remain
    assert.ok(!agents.includes("AUTOGEN:BEGIN AGENTS_CORE_v1"), "AUTOGEN:BEGIN marker must be removed");
    assert.ok(!agents.includes("AUTOGEN:END AGENTS_CORE_v1"), "AUTOGEN:END marker must be removed");
    assert.ok(!agents.includes("Governance Router"), "Governance Router content must be removed");
    // Governance prompts removed
    assert.equal(
      fs.existsSync(path.join(fixture.root, "prompts/governance/WORKSPACE_GOVERNANCE_README.md")),
      false,
      "Governance prompt must be removed",
    );
    assert.equal(
      fs.existsSync(path.join(fixture.root, "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md")),
      false,
      "Bootstrap prompt must be removed",
    );
  } finally {
    fixture.restore();
  }
});

// C39: uninstall-preserves-runs-governance-logs
cases.push(async () => {
  const fixture = withTempWorkspace("uninstall-preserves-runs-governance-logs", (root) => {
    writeFile(root, "AGENTS.md", "# workspace agents\n");
    writeFile(
      root,
      "prompts/governance/WORKSPACE_GOVERNANCE_README.md",
      "# gov prompt residual\n",
    );
    writeFile(
      root,
      "_runs/migrate_governance_rev6_20260224_120000.md",
      "# governance migration log\n",
    );
    writeFile(
      root,
      "_runs/custom_user_report.md",
      "KEEP_CUSTOM_RUN\n",
    );
  });
  try {
    const { commands } = createHarness();
    const uninstall = commands.get("gov_uninstall");
    const out = await uninstall.handler({ args: "uninstall" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    // Both governance logs and user logs must be preserved
    assert.equal(
      fs.existsSync(path.join(fixture.root, "_runs/migrate_governance_rev6_20260224_120000.md")),
      true,
      "Governance run log must be preserved",
    );
    assert.equal(
      fs.readFileSync(path.join(fixture.root, "_runs/migrate_governance_rev6_20260224_120000.md"), "utf8"),
      "# governance migration log\n",
      "Governance run log content must be intact",
    );
    assert.equal(
      fs.existsSync(path.join(fixture.root, "_runs/custom_user_report.md")),
      true,
      "User run report must be preserved",
    );
    assert.equal(
      fs.readFileSync(path.join(fixture.root, "_runs/custom_user_report.md"), "utf8"),
      "KEEP_CUSTOM_RUN\n",
      "User run report content must be intact",
    );
  } finally {
    fixture.restore();
  }
});

// C40: uninstall-post-qc-passes
cases.push(async () => {
  const fixture = withTempWorkspace("uninstall-post-qc-passes", (root) => {
    writeFile(
      root,
      "AGENTS.md",
      [
        "# OpenClaw AGENTS",
        "",
        "<!-- AUTOGEN:BEGIN AGENTS_CORE_v1 -->",
        "Workspace Agent Loader ->Governance Router",
        "<!-- AUTOGEN:END AGENTS_CORE_v1 -->",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      "_control/GOVERNANCE_BOOTSTRAP.md",
      "# gov bootstrap\n",
    );
    writeFile(
      root,
      "_control/REGRESSION_CHECK.md",
      "# regression check\n",
    );
    writeFile(
      root,
      "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
      "# bootstrap prompt\n",
    );
  });
  try {
    const { commands } = createHarness();
    const uninstall = commands.get("gov_uninstall");
    const out = await uninstall.handler({ args: "uninstall" });
    const text = String(out?.text || "");
    assert.match(text, /STATUS\s*\nPASS/i);
    // Post-uninstall QC fields must be present
    assert.ok(text.includes("post_uninstall_qc"), "post_uninstall_qc must be in output");
    // AGENTS.md must exist with no AUTOGEN markers
    assert.equal(fs.existsSync(path.join(fixture.root, "AGENTS.md")), true, "AGENTS.md must exist");
    const agents = fs.readFileSync(path.join(fixture.root, "AGENTS.md"), "utf8");
    assert.ok(!agents.includes("AUTOGEN:BEGIN AGENTS_CORE_v1"), "No AUTOGEN markers must remain");
    // Governance control files must be cleaned
    assert.equal(
      fs.existsSync(path.join(fixture.root, "_control/GOVERNANCE_BOOTSTRAP.md")),
      false,
      "GOVERNANCE_BOOTSTRAP.md must be removed",
    );
    assert.equal(
      fs.existsSync(path.join(fixture.root, "_control/REGRESSION_CHECK.md")),
      false,
      "REGRESSION_CHECK.md must be removed",
    );
  } finally {
    fixture.restore();
  }
});

let pass = 0;
for (let i = 0; i < cases.length; i += 1) {
  const ok = await runCase(`C${String(i + 1).padStart(2, "0")}`, cases[i]);
  if (ok) pass += 1;
}

console.log(`SUMMARY ${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
