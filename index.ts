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
  writeSeen: boolean;
  blockedWrites: number;
  lastWriteTool?: string;
  updatedAt: number;
};

const states = new Map<string, GateState>();
const DEFAULT_SESSION = "__default__";

const PLAN_MARKERS = [
  "plan gate",
  "plan-first",
];

const READ_MARKERS = [
  "read gate",
  "files_read",
  "files read",
  "target_files_to_change",
  "target files to change",
];

const WRITE_TOOL_NAMES = new Set([
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
  "shell_command",
  "exec",
  "bash",
  "powershell",
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

const WRITE_COMMAND_HINT = /(^|\s)(rm|mv|cp|mkdir|touch|del|rename|move|copy|echo\s+.+>|tee|sed\s+-i|perl\s+-i|git\s+add|git\s+rm|apply_patch)(\s|$)|>>|>/i;

const WRITE_INTENT_HINT = /\b(create|write|edit|update|modify|fix|refactor|implement|build|add|remove|delete|rename|move|patch|save|generate|scaffold)\b|寫|修改|更新|修正|新增|刪除|重構|建立|生成/i;

const GOV_COMMAND_HINT = /(^|\s)\/?(skill\s+)?gov_(setup|migrate|audit|apply|platform_change)\b/i;

function toSessionKey(ctx: Partial<PluginHookAgentContext> | Partial<PluginHookToolContext>): string {
  return ctx.sessionKey || DEFAULT_SESSION;
}

function ensureState(sessionKey: string): GateState {
  const existing = states.get(sessionKey);
  if (existing) return existing;
  const created: GateState = {
    planSeen: false,
    readSeen: false,
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

function hasAnyMarker(haystack: string, markers: string[]): boolean {
  const normalized = haystack.toLowerCase();
  return markers.some((m) => normalized.includes(m));
}

function inferWriteIntent(prompt: string): boolean {
  return WRITE_INTENT_HINT.test(prompt) || GOV_COMMAND_HINT.test(prompt);
}

function isReadToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const n = (event.toolName || "").toLowerCase();
  return READ_TOOL_HINTS.some((hint) => n.includes(hint));
}

function isWriteToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const name = (event.toolName || "").toLowerCase();
  if (WRITE_TOOL_NAMES.has(name)) return true;
  if (WRITE_NAME_HINTS.some((hint) => name.includes(hint))) return true;
  if (name.includes("shell") || name.includes("exec") || name.includes("command")) {
    const command = flattenText((event.params as Record<string, unknown>)?.command || "");
    if (WRITE_COMMAND_HINT.test(command)) return true;
  }
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
    "If this is a platform control-plane change, route through gov_platform_change.",
  ].join(" ");
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
      const sessionKey = toSessionKey(ctx);
      const state = ensureState(sessionKey);
      const tailMessages = Array.isArray(event.messages) ? event.messages.slice(-10) : [];
      const tailText = flattenText(tailMessages).toLowerCase();
      const promptText = String(event.prompt || "");

      const modeCRequired = inferWriteIntent(promptText);
      const planSeen = hasAnyMarker(tailText, PLAN_MARKERS);
      const readSeen = hasAnyMarker(tailText, READ_MARKERS);

      state.planSeen = planSeen;
      state.readSeen = readSeen;
      state.writeSeen = false;
      state.blockedWrites = 0;
      state.updatedAt = Date.now();

      states.set(sessionKey, state);

      if (modeCRequired && (!planSeen || !readSeen)) {
        return {
          prependContext:
            "Runtime governance gate active: This request appears to involve file changes. " +
            "Before any write-capable tool call, complete PLAN GATE and READ GATE evidence first. " +
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

      // Clear short-lived state at run end to avoid stale carryover.
      states.delete(sessionKey);
    },
    { priority: 50 },
  );
}
