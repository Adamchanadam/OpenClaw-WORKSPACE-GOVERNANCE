import type {
  OpenClawPluginApi,
  PluginHookAgentContext,
  PluginHookAgentEndEvent,
  PluginHookBeforePromptBuildEvent,
  PluginHookBeforePromptBuildResult,
  PluginHookBeforeToolCallEvent,
  PluginHookBeforeToolCallResult,
  PluginHookToolContext,
} from "openclaw/plugin-sdk";

type GateState = {
  planSeen: boolean;
  readSeen: boolean;
  govEntrypointSeen: boolean;
  govBypassUntil: number;
  govBypassWritesLeft: number;
  writeSeen: boolean;
  blockedWrites: number;
  lastWriteTool?: string;
  updatedAt: number;
};

const states = new Map<string, GateState>();
const DEFAULT_SESSION = "__default__";
const STATE_TTL_MS = 45 * 60 * 1000;
const GOV_BYPASS_WINDOW_MS = 8 * 60 * 1000;
const GOV_BYPASS_MAX_WRITES = 64;
const PRUNE_INTERVAL_MS = 60 * 1000;
let lastPruneAt = 0;

const PLAN_EVIDENCE_PATTERNS = [
  /\bplan\s*gate\b/i,
  /\bplan[-_\s]*first\b/i,
  /\bwg[-_: ]*plan[-_: ]*gate[-_: ]*ok\b/i,
];

const READ_EVIDENCE_PATTERNS = [
  /\bread\s*gate\b/i,
  /\bfiles[-_\s]*read\b/i,
  /\btarget[-_\s]*files[-_\s]*to[-_\s]*change\b/i,
  /\bwg[-_: ]*read[-_: ]*gate[-_: ]*ok\b/i,
];

const HARD_WRITE_TOOL_NAMES = new Set([
  "apply_patch",
  "write_file",
  "edit_file",
  "delete_file",
  "move_file",
  "rename_file",
  "copy_file",
  "mkdir",
  "create_file",
  "save_file",
]);

const READ_TOOL_HINTS = [
  "read",
  "list",
  "find",
  "search",
  "grep",
  "cat",
  "ls",
  "stat",
];

const WRITE_NAME_HINTS = [
  "write",
  "edit",
  "patch",
  "append",
  "save",
  "create",
  "mkdir",
  "remove",
  "delete",
  "rename",
  "move",
  "copy",
];

const SHELL_LIKE_TOOL_HINTS = [
  "shell",
  "exec",
  "command",
  "bash",
  "powershell",
];

const WRITE_COMMAND_HINTS = [
  /(^|[\s;|&])(rm|mv|cp|mkdir|touch|truncate|install|ln|chmod|chown|dd|sed\s+-i|perl\s+-i|tee)([\s;|&]|$)/i,
  /(^|[\s;|&])(del|erase|copy|move|ren|md|rd|rmdir)([\s;|&]|$)/i,
  /(^|[\s;|&])(set-content|add-content|out-file|new-item|copy-item|move-item|remove-item|rename-item)([\s;|&]|$)/i,
  /(^|[\s;|&])git\s+(add|rm|mv|commit|tag|reset|checkout)([\s;|&]|$)/i,
  /(^|[\s;|&])(npm|pnpm|yarn)\s+(install|add)\b/i,
  /(^|[\s;|&])pip\s+install\b/i,
  /(^|[\s;|&])apply_patch([\s;|&]|$)/i,
  /(^|[^0-9A-Za-z])>>?(?!=)/,
];

const READONLY_COMMAND_HINTS = [
  /(^|[\s;|&])(ls|dir|pwd|cat|type|find|grep|rg|head|tail|wc|stat|tree)([\s;|&]|$)/i,
  /(^|[\s;|&])(git)\s+(status|log|show|diff|branch|rev-parse)([\s;|&]|$)/i,
  /(^|[\s;|&])(openclaw)\s+(skills|plugins|config|get|status|help)\b/i,
  /(^|[\s;|&])(curl|wget)\b/i,
  /(^|[\s;|&])(echo|printf)([\s;|&]|$)/i,
  /(^|[\s;|&])(python|python3|node)\s+(-c|--version)\b/i,
];

const WRITE_INTENT_HINT = /\b(create|write|edit|update|modify|fix|refactor|implement|build|add|remove|delete|rename|move|patch|save|generate|scaffold)\b|寫|修改|更新|修正|新增|刪除|重構|建立|生成/i;

const GOV_SETUP_HINT = /(^|\s)\/?(skill\s+)?gov_setup\b/i;
const GOV_READ_COMMAND_HINT = /(^|\s)\/?(skill\s+)?gov_audit\b/i;
const GOV_WRITE_COMMAND_HINT = /(^|\s)\/?(skill\s+)?gov_(migrate|apply|platform_change)\b/i;

function lastMatchIndex(text: string, pattern: RegExp): number {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let idx = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    idx = m.index;
  }
  return idx;
}

function detectGovSetupRequestKind(text: string): "none" | "read" | "write" {
  const re = /(^|\s)\/?(skill\s+)?gov_setup\b(?:\s+(check|install|upgrade))?/gi;
  let found = false;
  let lastMode = "install";
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    found = true;
    lastMode = String(m[3] || "install").toLowerCase();
  }
  if (!found) return "none";
  return lastMode === "check" ? "read" : "write";
}

function toSessionKey(ctx: Partial<PluginHookAgentContext> | Partial<PluginHookToolContext>): string {
  return ctx.sessionKey || DEFAULT_SESSION;
}

function ensureState(sessionKey: string): GateState {
  const existing = states.get(sessionKey);
  if (existing) {
    if (Date.now() - existing.updatedAt <= STATE_TTL_MS) return existing;
    states.delete(sessionKey);
  }
  const created: GateState = {
    planSeen: false,
    readSeen: false,
    govEntrypointSeen: false,
    govBypassUntil: 0,
    govBypassWritesLeft: 0,
    writeSeen: false,
    blockedWrites: 0,
    updatedAt: Date.now(),
  };
  states.set(sessionKey, created);
  return created;
}

function flattenText(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  if (Array.isArray(input)) return input.map((v) => flattenText(v)).join(" ");
  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    return Object.values(obj).map((v) => flattenText(v)).join(" ");
  }
  return "";
}

function hasAnyPattern(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(haystack));
}

function inferWriteIntent(prompt: string): boolean {
  return WRITE_INTENT_HINT.test(prompt) || detectGovRequestKind(prompt) === "write";
}

function hasPlanEvidence(text: string): boolean {
  return hasAnyPattern(text, PLAN_EVIDENCE_PATTERNS);
}

function hasReadEvidence(text: string): boolean {
  return hasAnyPattern(text, READ_EVIDENCE_PATTERNS);
}

function latestUserText(messages: unknown): string {
  if (!Array.isArray(messages)) return flattenText(messages);
  const userChunks: string[] = [];
  for (const item of messages.slice(-12)) {
    if (!item || typeof item !== "object") continue;
    const msg = item as Record<string, unknown>;
    const role = String(msg.role ?? msg.sender ?? msg.author ?? "").toLowerCase();
    if (role !== "user") continue;
    userChunks.push(flattenText(msg.content ?? msg.text ?? msg.message ?? msg));
  }
  if (userChunks.length > 0) return userChunks.join(" ");
  return flattenText(messages[messages.length - 1] ?? "");
}

function detectGovRequestKind(text: string): "none" | "read" | "write" {
  if (!text.trim()) return "none";

  const setupIdx = lastMatchIndex(text, GOV_SETUP_HINT);
  const readIdx = lastMatchIndex(text, GOV_READ_COMMAND_HINT);
  const writeIdx = lastMatchIndex(text, GOV_WRITE_COMMAND_HINT);
  const latestIdx = Math.max(setupIdx, readIdx, writeIdx);

  if (latestIdx < 0) return "none";
  if (latestIdx === setupIdx) return detectGovSetupRequestKind(text);
  if (latestIdx === writeIdx) return "write";
  return "read";
}

function isReadToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const n = (event.toolName || "").toLowerCase();
  if (isShellLikeTool(n)) {
    const command = flattenText((event.params as Record<string, unknown>)?.command || "");
    return isReadonlyShellCommand(command);
  }
  return READ_TOOL_HINTS.some((hint) => n.includes(hint));
}

function isShellLikeTool(name: string): boolean {
  return SHELL_LIKE_TOOL_HINTS.some((hint) => name.includes(hint));
}

function isWriteShellCommand(command: string): boolean {
  const text = command.trim();
  if (!text) return false;
  return WRITE_COMMAND_HINTS.some((re) => re.test(text));
}

function isReadonlyShellCommand(command: string): boolean {
  const text = command.trim();
  if (!text) return false;
  if (WRITE_COMMAND_HINTS.some((re) => re.test(text))) return false;
  return READONLY_COMMAND_HINTS.some((re) => re.test(text));
}

function isWriteToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const name = (event.toolName || "").toLowerCase();
  if (HARD_WRITE_TOOL_NAMES.has(name)) return true;
  if (isShellLikeTool(name)) {
    const command = flattenText((event.params as Record<string, unknown>)?.command || "");
    return isWriteShellCommand(command);
  }
  if (WRITE_NAME_HINTS.some((hint) => name.includes(hint))) return true;
  return false;
}

function governanceBlockReason(state: GateState): string {
  const missing: string[] = [];
  if (!state.planSeen) missing.push("PLAN GATE evidence");
  if (!state.readSeen) missing.push("READ GATE evidence");
  const missingText = missing.join(" + ");
  return [
    "WORKSPACE_GOVERNANCE guard activated (this is a safety block, not a system error).",
    `Missing evidence: ${missingText}.`,
    "If your task is read-only diagnostics/testing, rerun with read-only commands only.",
    "If your task writes/updates files, complete PLAN -> READ first, include WG_PLAN_GATE_OK + WG_READ_GATE_OK, then retry CHANGE.",
    "If this is a platform control-plane change, use gov_platform_change.",
  ].join(" ");
}

function maybePruneExpiredStates(): void {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, state] of states.entries()) {
    if (now - state.updatedAt > STATE_TTL_MS) states.delete(key);
  }
}

export default function registerWorkspaceGovernancePlugin(api: OpenClawPluginApi): void {
  const cfg = (api.pluginConfig || {}) as { runtimeGateEnabled?: boolean };
  const runtimeGateEnabled = cfg.runtimeGateEnabled !== false;
  if (!runtimeGateEnabled) {
    api.logger.warn("[governance-gate] runtime hard gate is disabled by plugin config.");
    return;
  }

  api.logger.info("[governance-gate] registering hooks: before_prompt_build, before_tool_call, agent_end");

  api.on(
    "before_prompt_build",
    (
      event: PluginHookBeforePromptBuildEvent,
      ctx: PluginHookAgentContext,
    ): PluginHookBeforePromptBuildResult | void => {
      maybePruneExpiredStates();
      const sessionKey = toSessionKey(ctx);
      const state = ensureState(sessionKey);
      const tailMessages = Array.isArray(event.messages) ? event.messages.slice(-10) : [];
      const tailText = flattenText(tailMessages).toLowerCase();
      const userText = latestUserText(event.messages);
      const govRequestKindUser = detectGovRequestKind(userText);
      const govRequestKindTail = detectGovRequestKind(tailText);
      const govRequestKind = govRequestKindUser !== "none" ? govRequestKindUser : govRequestKindTail;

      const modeCRequired = inferWriteIntent(userText) || govRequestKindTail === "write";
      const explicitGovEntrypoint = govRequestKind === "write" || govRequestKindTail === "write";

      state.planSeen = state.planSeen || hasPlanEvidence(tailText);
      state.readSeen = state.readSeen || hasReadEvidence(tailText);
      if (explicitGovEntrypoint) {
        // gov_* entrypoints are dedicated governance workflows; allow them to execute
        // their own PLAN/READ/CHANGE/QC/PERSIST steps without deadlocking at tool gate.
        state.govEntrypointSeen = true;
        state.govBypassUntil = Date.now() + GOV_BYPASS_WINDOW_MS;
        state.govBypassWritesLeft = GOV_BYPASS_MAX_WRITES;
      }
      state.updatedAt = Date.now();

      states.set(sessionKey, state);

      if (modeCRequired && !explicitGovEntrypoint && (!state.planSeen || !state.readSeen)) {
        return {
          prependContext:
            "Runtime governance guard preflight: write intent detected. This is a safety check, not a system failure. " +
            "Before any write-capable tool call, complete PLAN GATE and READ GATE evidence first. " +
            "Include WG_PLAN_GATE_OK and WG_READ_GATE_OK in your governance response. " +
            "If this task is read-only diagnostics/testing, keep it read-only and rerun. " +
            "If write intent is uncertain, treat as Mode C (fail-closed).",
        };
      }
      return;
    },
    { priority: 200 },
  );

  api.on(
    "before_tool_call",
    (
      event: PluginHookBeforeToolCallEvent,
      ctx: PluginHookToolContext,
    ): PluginHookBeforeToolCallResult | void => {
      maybePruneExpiredStates();
      const sessionKey = toSessionKey(ctx);
      const state = ensureState(sessionKey);

      if (isReadToolCall(event)) {
        state.readSeen = true;
        state.updatedAt = Date.now();
        states.set(sessionKey, state);
      }

      if (!isWriteToolCall(event)) return;

      const compliant = state.planSeen && state.readSeen;
      if (!compliant) {
        const canBypassGovEntrypoint =
          state.govEntrypointSeen &&
          Date.now() <= state.govBypassUntil &&
          state.govBypassWritesLeft > 0;
        if (canBypassGovEntrypoint) {
          state.govBypassWritesLeft -= 1;
          state.writeSeen = true;
          state.lastWriteTool = event.toolName;
          state.updatedAt = Date.now();
          states.set(sessionKey, state);
          return;
        }

        state.blockedWrites += 1;
        state.lastWriteTool = event.toolName;
        state.updatedAt = Date.now();
        states.set(sessionKey, state);
        return {
          block: true,
          blockReason: governanceBlockReason(state),
        };
      }

      state.writeSeen = true;
      state.lastWriteTool = event.toolName;
      state.updatedAt = Date.now();
      states.set(sessionKey, state);
      return;
    },
    { priority: 250 },
  );

  api.on(
    "agent_end",
    (event: PluginHookAgentEndEvent, ctx: PluginHookAgentContext): void => {
      maybePruneExpiredStates();
      const sessionKey = toSessionKey(ctx);
      const state = ensureState(sessionKey);
      const messageText = flattenText(event.messages).toLowerCase();
      const hasFilesRead = messageText.includes("files_read") || messageText.includes("files read");
      const hasTargets =
        messageText.includes("target_files_to_change") ||
        messageText.includes("target files to change");
      const hasRunReport = messageText.includes("_runs/");

      if (state.writeSeen && (!hasFilesRead || !hasTargets || !hasRunReport)) {
        api.logger.warn(
          `[governance-gate] session=${sessionKey} write completed with incomplete evidence (FILES_READ/TARGET_FILES_TO_CHANGE/_runs).`,
        );
      }

      if (state.blockedWrites > 0) {
        api.logger.info(
          `[governance-gate] session=${sessionKey} blocked_writes=${state.blockedWrites} last_write_tool=${state.lastWriteTool || "unknown"}`,
        );
      }

      // Task-level carryover: keep PLAN/READ evidence for short follow-up turns.
      // Reset after an explicit completion-like summary appears.
      if (
        messageText.includes("_runs/") &&
        (messageText.includes("12/12") || messageText.includes("qc"))
      ) {
        state.planSeen = false;
        state.readSeen = false;
        state.writeSeen = false;
        state.blockedWrites = 0;
      }
      // gov_* bypass is single-turn scoped.
      state.govEntrypointSeen = false;
      state.govBypassUntil = 0;
      state.govBypassWritesLeft = 0;
      state.updatedAt = Date.now();
      states.set(sessionKey, state);
    },
    { priority: 50 },
  );
}
