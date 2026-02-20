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
  modeCIntentSeen: boolean;
  writeSeen: boolean;
  blockedWrites: number;
  lastWriteTool?: string;
  updatedAt: number;
};

const states = new Map<string, GateState>();
const DEFAULT_SESSION = "__default__";
const STATE_TTL_MS = 45 * 60 * 1000;

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

const GOV_COMMAND_HINT = /(^|\s)\/?(skill\s+)?gov_(setup|migrate|audit|apply|platform_change)\b/i;

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
    modeCIntentSeen: false,
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
  return WRITE_INTENT_HINT.test(prompt) || GOV_COMMAND_HINT.test(prompt);
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
    `Blocked by WORKSPACE_GOVERNANCE runtime gate: missing ${missingText}.`,
    "For any file write/change task, complete PLAN -> READ first, then retry CHANGE.",
    "Use structured evidence tokens in your plan: WG_PLAN_GATE_OK and WG_READ_GATE_OK.",
    "If this is a platform control-plane change, route through gov_platform_change.",
  ].join(" ");
}

function pruneExpiredStates(): void {
  const now = Date.now();
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
      pruneExpiredStates();
      const sessionKey = toSessionKey(ctx);
      const state = ensureState(sessionKey);
      const tailMessages = Array.isArray(event.messages) ? event.messages.slice(-10) : [];
      const tailText = flattenText(tailMessages).toLowerCase();
      const recentMessages = Array.isArray(event.messages) ? event.messages.slice(-4) : [];
      const recentText = flattenText(recentMessages).toLowerCase();
      const userText = latestUserText(event.messages);

      const modeCRequired = inferWriteIntent(userText);
      const recentPlanSeen = hasPlanEvidence(recentText);
      const recentReadSeen = hasReadEvidence(recentText);

      // Start of a new write-intent turn without fresh evidence: clear stale state.
      if (modeCRequired && !recentPlanSeen && !recentReadSeen) {
        state.planSeen = false;
        state.readSeen = false;
      }

      state.modeCIntentSeen = state.modeCIntentSeen || modeCRequired;
      state.planSeen = state.planSeen || hasPlanEvidence(tailText);
      state.readSeen = state.readSeen || hasReadEvidence(tailText);
      state.updatedAt = Date.now();

      states.set(sessionKey, state);

      if (modeCRequired && (!state.planSeen || !state.readSeen)) {
        return {
          prependContext:
            "Runtime governance gate active: This request appears to involve file changes. " +
            "Before any write-capable tool call, complete PLAN GATE and READ GATE evidence first. " +
            "Include WG_PLAN_GATE_OK and WG_READ_GATE_OK in your governance response. " +
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
      pruneExpiredStates();
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
      pruneExpiredStates();
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
        state.modeCIntentSeen = false;
        state.writeSeen = false;
        state.blockedWrites = 0;
      }
      state.updatedAt = Date.now();
      states.set(sessionKey, state);
    },
    { priority: 50 },
  );
}
