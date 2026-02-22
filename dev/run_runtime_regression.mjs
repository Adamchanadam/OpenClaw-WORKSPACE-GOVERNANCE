#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compiledPath = path.resolve(__dirname, ".tmp/index.js");
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
  assert.equal(commands.has("gov_setup"), true);
  assert.equal(commands.has("gov_migrate"), true);
  assert.equal(commands.has("gov_uninstall"), true);
  assert.equal(commands.has("gov_audit"), true);
  const setup = commands.get("gov_setup");
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
  const { commands } = createHarness();
  const setup = commands.get("gov_setup");
  const out = await setup.handler({ args: "invalid-mode" });
  const text = String(out?.text || "");
  assert.ok(text.includes("STATUS"));
  assert.ok(text.toLowerCase().includes("blocked"));
  assert.ok(text.toLowerCase().includes("invalid mode"));
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

let pass = 0;
for (let i = 0; i < cases.length; i += 1) {
  const ok = await runCase(`C${String(i + 1).padStart(2, "0")}`, cases[i]);
  if (ok) pass += 1;
}

console.log(`SUMMARY ${pass}/${cases.length} passed`);
if (pass !== cases.length) process.exit(1);
