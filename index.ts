/// <reference path="./types/openclaw-plugin-sdk.d.ts" />
/// <reference path="./types/node-shim.d.ts" />
import type {
  OpenClawPluginApi,
  PluginCommandContext,
  PluginHookAgentContext,
  PluginHookAgentEndEvent,
  PluginHookBeforePromptBuildEvent,
  PluginHookBeforePromptBuildResult,
  PluginHookBeforeToolCallEvent,
  PluginHookBeforeToolCallResult,
  PluginHookToolContext,
} from "openclaw/plugin-sdk";

type GateState = {
  createdAt: number;
  planSeen: boolean;
  readSeen: boolean;
  uxLang: "en" | "zh";
  postUpdateReminderPending: boolean;
  postUpdateReminderAt: number;
  govEntrypointSeen: boolean;
  govBypassUntil: number;
  govBypassWritesLeft: number;
  brainAuditRequiredUntil: number;
  brainAuditRequiredReason?: string;
  brainAuditPreviewSeenAt: number;
  brainAuditNudgedAt: number;
  govCommandIntentUntil: number;
  toolExposureWarnedAt: number;
  writeSeen: boolean;
  blockedWrites: number;
  lastWriteTool?: string;
  updatedAt: number;
};

type RuntimeGatePolicyConfig = {
  allowShellPrefixes?: string[];
  allowShellRegex?: string[];
  denyShellPrefixes?: string[];
  denyShellRegex?: string[];
};

type RuntimeGatePolicyCompiled = {
  allowShellPrefixes: string[];
  allowShellRegex: RegExp[];
  denyShellPrefixes: string[];
  denyShellRegex: RegExp[];
};

type ToolExposureGuardMode = "enforce" | "advisory";

type ToolExposureGuardConfig = {
  enabled?: boolean;
  mode?: ToolExposureGuardMode;
  permissiveContexts?: string[];
  allowExplicitGovCommands?: boolean;
  requireExplicitGovCommandIntent?: boolean;
};

type ToolExposureGuardCompiled = {
  enabled: boolean;
  mode: ToolExposureGuardMode;
  permissiveContexts: string[];
  allowExplicitGovCommands: boolean;
  requireExplicitGovCommandIntent: boolean;
};

const states = new Map<string, GateState>();
const DEFAULT_SESSION = "__default__";
const STATE_TTL_MS = 45 * 60 * 1000;
const GOV_BYPASS_WINDOW_MS = 8 * 60 * 1000;
const GOV_BYPASS_MAX_WRITES = 64;
const GOV_SETUP_FLOW_WINDOW_MS = 12 * 60 * 1000;
const GOV_COMMAND_INTENT_WINDOW_MS = 15 * 60 * 1000;
const BRAIN_AUDIT_REQUIRE_WINDOW_MS = 30 * 60 * 1000;
const BRAIN_AUDIT_NUDGE_COOLDOWN_MS = 5 * 60 * 1000;
const BRAIN_AUDIT_BLOCK_THRESHOLD = 3;
const TOOL_EXPOSURE_ADVISORY_COOLDOWN_MS = 3 * 60 * 1000;
const POST_UPDATE_REMINDER_WINDOW_MS = 45 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 1000;
const DEFAULT_PERMISSIVE_TOOL_POLICY_CONTEXTS = ["default", "agents.list.main"];
let lastPruneAt = 0;
let globalGovBypassUntil = 0;
let globalGovBypassWritesLeft = 0;
let globalGovSetupFlowUntil = 0;

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
const PLATFORM_CHANGE_HINT =
  /openclaw\.json|platform\s+config|control[-\s]*plane|plugins\.entries|extensions\/|修改\s*openclaw\.json|平台設定|控制面/i;
const BRAIN_AUDIT_HINT =
  /(brain\s*docs?|user\.md|identity\.md|tools\.md|soul\.md|memory\.md|heartbeat\.md|memory\/\*\.md|brain\s*doc|人格|記憶|行為提示|思維|習慣)/i;
const BRAIN_FIX_ACTION_HINT =
  /(audit|harden|fix|repair|review|conservative|risk|修補|審核|檢查|修正|改善|保守)/i;
const GOV_SETUP_UPGRADE_INTENT_HINT =
  /(?:\b(?:upgrade|update|sync|refresh|redeploy|re-deploy)\b.*\b(?:gov_setup|prompts\/governance|governance\s+files?|governance\s+prompts?)\b)|(?:(?:升級|更新|同步|重新部署).*(?:治理文件|治理|prompts\/governance))/i;
const OPENCLAW_UPDATE_INTENT_HINT =
  /(?:^|[\s`])openclaw\s+(?:update|plugins\s+update|extensions\s+update)\b|(?:剛|已經|已)\s*(?:更新|升級).*(?:openclaw|plugin|外掛|插件|擴充)/i;
const NEGATED_UPDATE_INTENT_HINT =
  /(?:\b(?:don'?t|do\s+not|no\s+need|skip)\b.*\b(?:update|upgrade)\b)|(?:不要|唔好|無需|不用).*(?:更新|升級)/i;
const CRON_INTENT_HINT =
  /(?:^|[\s`])(?:openclaw\s+cron\b|\/cron\b|cron\s+(?:job|jobs|add|update|remove|run|runs|list|ls|pause|resume)\b)|(?:cron\s*job|排程|定時任務)/i;
const HOST_MAINTENANCE_INTENT_HINT =
  /(?:^|[\s`])openclaw\s+\S+|(?:\bopenclaw\b.*\b(?:plugins?|extensions?|skills?|hooks?|cron|gateway|onboard|configure|config|update|install|enable|disable|restart|run)\b)|(?:(?:openclaw).*(?:安裝|更新|升級|啟用|停用|設定|配置|重啟|執行|運行|管理))|(?:(?:安裝|更新|升級|啟用|停用|設定|配置|重啟|執行|運行|管理).*(?:openclaw))/i;

const OPENCLAW_FLAGS_WITH_VALUE = new Set([
  "--profile",
  "--cwd",
  "--config",
  "--model",
  "--session",
  "--channel",
  "--to",
  "--port",
  "-p",
]);

const GOV_COMMAND_TOKEN_RE =
  /\bgov_(setup|migrate|audit|apply|openclaw_json|brain_audit|uninstall)\b/i;

const GOV_COMMAND_PAYLOAD_RE =
  /(?:^|[\s`"'])\/?(?:skill\s+)?gov_(setup|migrate|audit|apply|openclaw_json|brain_audit|uninstall)\b/i;

function normalizeShellPrefixList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    const text = String(item ?? "").trim().toLowerCase();
    if (!text) continue;
    out.push(text);
  }
  return out;
}

function compileRegexList(input: unknown, logger: { warn: (msg: string) => void }, label: string): RegExp[] {
  if (!Array.isArray(input)) return [];
  const out: RegExp[] = [];
  for (const item of input) {
    const raw = String(item ?? "").trim();
    if (!raw) continue;
    try {
      out.push(new RegExp(raw, "i"));
    } catch {
      logger.warn(`[governance-gate] invalid runtimeGatePolicy ${label} regex ignored: ${raw}`);
    }
  }
  return out;
}

function buildRuntimeGatePolicy(
  raw: unknown,
  logger: { warn: (msg: string) => void },
): RuntimeGatePolicyCompiled {
  const cfg = (raw || {}) as RuntimeGatePolicyConfig;
  return {
    allowShellPrefixes: normalizeShellPrefixList(cfg.allowShellPrefixes),
    allowShellRegex: compileRegexList(cfg.allowShellRegex, logger, "allowShellRegex"),
    denyShellPrefixes: normalizeShellPrefixList(cfg.denyShellPrefixes),
    denyShellRegex: compileRegexList(cfg.denyShellRegex, logger, "denyShellRegex"),
  };
}

function buildToolExposureGuard(
  raw: unknown,
  logger: { warn: (msg: string) => void },
): ToolExposureGuardCompiled {
  const cfg = (raw || {}) as ToolExposureGuardConfig;
  const modeRaw = String(cfg.mode ?? "enforce").trim().toLowerCase();
  let mode: ToolExposureGuardMode = "enforce";
  if (modeRaw === "advisory") {
    mode = "advisory";
  } else if (modeRaw !== "enforce" && modeRaw) {
    logger.warn(
      `[governance-gate] invalid toolExposureGuard.mode ignored: ${String(cfg.mode)} (use enforce|advisory)`,
    );
  }

  const permissiveContexts = normalizeShellPrefixList(cfg.permissiveContexts);
  const normalizedContexts =
    permissiveContexts.length > 0 ? permissiveContexts : DEFAULT_PERMISSIVE_TOOL_POLICY_CONTEXTS;

  return {
    enabled: cfg.enabled !== false,
    mode,
    permissiveContexts: normalizedContexts,
    allowExplicitGovCommands: cfg.allowExplicitGovCommands !== false,
    requireExplicitGovCommandIntent: cfg.requireExplicitGovCommandIntent !== false,
  };
}

function classifyGovCommandRequest(
  command: string,
  modeArg: string,
): "none" | "read" | "write" {
  const cmd = command.toLowerCase();
  const mode = modeArg.toLowerCase();

  if (cmd === "gov_setup") {
    return mode === "check" ? "read" : "write";
  }
  if (cmd === "gov_uninstall") {
    return mode === "check" ? "read" : "write";
  }
  if (cmd === "gov_audit") {
    return "read";
  }
  if (cmd === "gov_migrate" || cmd === "gov_apply" || cmd === "gov_openclaw_json") {
    return "write";
  }
  if (cmd === "gov_brain_audit") {
    if (
      mode === "apply" ||
      mode === "rollback" ||
      mode.startsWith("approve:") ||
      mode === "approve" ||
      mode.startsWith("rollback:")
    ) {
      return "write";
    }
    return "read";
  }
  return "none";
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
  const now = Date.now();
  const created: GateState = {
    createdAt: now,
    planSeen: false,
    readSeen: false,
    uxLang: "en",
    postUpdateReminderPending: false,
    postUpdateReminderAt: 0,
    govEntrypointSeen: false,
    govBypassUntil: 0,
    govBypassWritesLeft: 0,
    brainAuditRequiredUntil: 0,
    brainAuditRequiredReason: undefined,
    brainAuditPreviewSeenAt: 0,
    brainAuditNudgedAt: 0,
    govCommandIntentUntil: 0,
    toolExposureWarnedAt: 0,
    writeSeen: false,
    blockedWrites: 0,
    updatedAt: now,
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

function detectUxLanguage(text: string): "en" | "zh" {
  if (/[\u3400-\u9fff]/.test(text)) return "zh";
  return "en";
}

function detectEnvLanguage(): "en" | "zh" {
  const envText = flattenText(
    (globalThis as unknown as { process?: { env?: Record<string, unknown> } })?.process?.env || {},
  );
  return detectUxLanguage(envText);
}

function i18n(lang: "en" | "zh", en: string, zh: string): string {
  return lang === "zh" ? zh : en;
}

function inferWriteIntent(prompt: string): boolean {
  return WRITE_INTENT_HINT.test(prompt) || detectGovRequestKind(prompt) === "write";
}

function isCronIntent(text: string): boolean {
  return CRON_INTENT_HINT.test(text);
}

function isHostMaintenanceIntent(text: string): boolean {
  return HOST_MAINTENANCE_INTENT_HINT.test(text);
}

function isPlatformChangeIntent(text: string): boolean {
  return PLATFORM_CHANGE_HINT.test(text);
}

function isBrainAuditIntent(text: string): boolean {
  return BRAIN_AUDIT_HINT.test(text) && BRAIN_FIX_ACTION_HINT.test(text);
}

function isGovSetupUpgradeIntent(text: string): boolean {
  return GOV_SETUP_UPGRADE_INTENT_HINT.test(text);
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

function latestUserTurnText(messages: unknown): string {
  if (!Array.isArray(messages)) return flattenText(messages);
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (!item || typeof item !== "object") continue;
    const msg = item as Record<string, unknown>;
    const role = String(msg.role ?? msg.sender ?? msg.author ?? "").toLowerCase();
    if (role !== "user") continue;
    return flattenText(msg.content ?? msg.text ?? msg.message ?? msg);
  }
  return "";
}

function detectGovRequestKind(text: string): "none" | "read" | "write" {
  if (!text.trim()) return "none";
  const re = /(^|\s)\/?(?:skill\s+)?(gov_[a-z_]+)\b(?:\s+([a-z0-9_:-]+))?/gi;
  let latest: "none" | "read" | "write" = "none";
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const cmd = String(m[2] || "");
    const mode = String(m[3] || "");
    const classified = classifyGovCommandRequest(cmd, mode);
    if (classified !== "none") latest = classified;
  }
  return latest;
}

function detectGovCommandKindByName(
  text: string,
  command: string,
): "none" | "read" | "write" {
  if (!text.trim()) return "none";
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(^|\\s)\\/?(?:skill\\s+)?(${escaped})\\b(?:\\s+([a-z0-9_:-]+))?`,
    "gi",
  );
  let latest: "none" | "read" | "write" = "none";
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const cmd = String(m[2] || command);
    const mode = String(m[3] || "");
    const classified = classifyGovCommandRequest(cmd, mode);
    if (classified !== "none") latest = classified;
  }
  return latest;
}

function detectGovCommandMode(text: string, command: string): string {
  if (!text.trim()) return "";
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `(^|\\s)\\/?(?:skill\\s+)?(${escaped})\\b(?:\\s+([a-z0-9_:-]+))?`,
    "gi",
  );
  let latest = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    latest = String(m[3] || "").toLowerCase();
  }
  return latest;
}

function extractContextFingerprint(ctx: unknown): string {
  if (!ctx || typeof ctx !== "object") return "";
  const c = ctx as Record<string, unknown>;
  const keyFields = [
    c.channel,
    c.profile,
    c.profileName,
    c.agent,
    c.agentName,
    c.agentId,
    c.context,
    c.contextName,
    c.route,
    c.path,
    c.namespace,
  ];
  return `${flattenText(keyFields)} ${flattenText(c)}`.toLowerCase();
}

function matchedPermissivePolicyContexts(
  ctx: unknown,
  textHint: string,
  guard: ToolExposureGuardCompiled,
): string[] {
  if (!guard.enabled || guard.permissiveContexts.length === 0) return [];
  const haystack = `${extractContextFingerprint(ctx)} ${textHint}`.toLowerCase();
  if (!haystack.trim()) return [];
  const matches = guard.permissiveContexts.filter((token) => haystack.includes(token));
  return Array.from(new Set(matches));
}

function hasExplicitGovCommandPayload(event: PluginHookBeforeToolCallEvent): boolean {
  const payload = flattenText(event.params || "");
  if (!payload.trim()) return false;
  return GOV_COMMAND_PAYLOAD_RE.test(payload);
}

function isGovernancePluginToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const tool = String(event.toolName || "").toLowerCase();
  const payload = flattenText(event.params || "").toLowerCase();
  if (!tool && !payload) return false;
  if (tool.includes("openclaw-workspace-governance")) return true;
  if (GOV_COMMAND_TOKEN_RE.test(tool)) return true;
  if (GOV_COMMAND_PAYLOAD_RE.test(payload)) return true;
  return false;
}

function toolExposureAdvisoryText(
  lang: "en" | "zh",
  contexts: string[],
  explicitGate: boolean,
): string {
  const hasContext = contexts.length > 0;
  const contextText = hasContext ? contexts.join(", ") : "unknown";
  if (lang === "zh") {
    const contextLine = hasContext
      ? `偵測到 permissive tool policy context: ${contextText}。`
      : "未收到可用的 policy context metadata，仍採 fail-closed。";
    return [
      "Governance 提示：已啟用安全入口閘。",
      contextLine,
      explicitGate
        ? "為降低 untrusted input 觸發 plugin 能力的風險，governance 只接受顯式 `/gov_*` 指令入口。"
        : "目前使用 permissive-context 策略，請在顯式 `/gov_*` 指令下執行 governance。",
      "一般對話 agent 建議使用 restrictive profile（minimal/coding）或工具 allowlist 排除 governance plugin。",
    ].join(" ");
  }
  const contextLine = hasContext
    ? `Detected permissive tool policy context: ${contextText}.`
    : "No policy-context metadata was provided; fail-closed is still active.";
  return [
    "Governance advisory: secure invocation gate is active.",
    contextLine,
    explicitGate
      ? "To reduce untrusted-input tool exposure, governance accepts explicit `/gov_*` command entry only."
      : "Permissive-context policy is active; run governance through explicit `/gov_*` commands.",
    "Use restrictive profiles (`minimal`/`coding`) or explicit tool allowlists excluding governance plugin tools for general chat agents.",
  ].join(" ");
}

function toolExposureBlockReason(
  lang: "en" | "zh",
  contexts: string[],
  explicitGate: boolean,
): string {
  const hasContext = contexts.length > 0;
  const contextText = hasContext ? contexts.join(", ") : "unknown";
  if (lang === "zh") {
    const causeLine = explicitGate
      ? "已拒絕隱式 governance plugin 工具呼叫；只接受顯式 `/gov_*` 指令入口。"
      : "已拒絕在 permissive context 下的隱式 governance plugin 工具呼叫。";
    return [
      "WORKSPACE_GOVERNANCE tool-exposure guard 已阻擋（這是治理策略閘，不是 OpenClaw 系統錯誤）。",
      hasContext
        ? `偵測到 permissive tool policy context: ${contextText}。`
        : "未收到可用的 policy context metadata，採用 fail-closed。",
      causeLine,
      "可直接貼上下一步：",
      "1) 由受信任操作者顯式輸入 `/gov_*` 指令（例如 `/gov_setup check`）。",
      "2) 將一般對話 agent 改為 restrictive profile（`minimal`/`coding`）或工具 allowlist 排除 governance plugin。",
      "3) 需要調整平台設定時，先用 `/gov_openclaw_json` 更新後重啟 gateway。",
    ].join(" ");
  }
  const causeLine = explicitGate
    ? "Implicit governance-plugin tool invocation is denied; only explicit `/gov_*` command entry is accepted."
    : "Implicit governance-plugin tool invocation is denied in permissive contexts.";
  return [
    "WORKSPACE_GOVERNANCE tool-exposure guard blocked this action (governance policy gate, not an OpenClaw system error).",
    hasContext
      ? `Detected permissive tool policy context: ${contextText}.`
      : "No policy-context metadata was provided; fail-closed policy is active.",
    causeLine,
    "Copy-paste next steps:",
    "1) Have a trusted operator issue an explicit `/gov_*` command (for example `/gov_setup check`).",
    "2) Move general chat agents to restrictive profiles (`minimal`/`coding`) or explicit tool allowlists excluding governance plugin tools.",
    "3) If platform config changes are needed, run `/gov_openclaw_json`, then restart gateway.",
  ].join(" ");
}

function isBrainAuditRequirementActive(state: GateState, now: number): boolean {
  return state.brainAuditRequiredUntil > now;
}

function markBrainAuditRequired(state: GateState, reason: string, now: number): void {
  const nextUntil = now + BRAIN_AUDIT_REQUIRE_WINDOW_MS;
  if (state.brainAuditRequiredUntil < nextUntil) {
    state.brainAuditRequiredUntil = nextUntil;
    state.brainAuditRequiredReason = reason;
  }
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

function hasShellControlOperators(command: string): boolean {
  return /(?:\|\||&&|[|;&<>])/.test(command);
}

function splitShellCommandSegments(command: string): string[] {
  const text = command.trim();
  if (!text) return [];
  const segments: string[] = [];
  let current = "";
  let quote: '"' | "'" | "`" | null = null;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : "";

    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      current += ch;
      continue;
    }

    const isDoubleOp = (ch === "&" && next === "&") || (ch === "|" && next === "|");
    const isSingleOp = ch === ";" || ch === "|" || (ch === "&" && next !== "&");
    if (isDoubleOp || isSingleOp) {
      const trimmed = current.trim();
      if (trimmed) segments.push(trimmed);
      current = "";
      if (isDoubleOp) i += 1;
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) segments.push(tail);
  return segments;
}

function splitShellWords(command: string): string[] {
  const matches = command.match(/"[^"]*"|'[^']*'|`[^`]*`|[^\s]+/g) || [];
  return matches.map((w) => w.replace(/^["'`]|["'`]$/g, ""));
}

function isSingleOpenClawCommand(command: string): boolean {
  const text = command.trim();
  if (!text || hasShellControlOperators(text)) return false;
  const words = splitShellWords(text);
  if (words.length === 0) return false;
  return words[0].toLowerCase() === "openclaw";
}

function extractOpenClawRootCommand(command: string): string {
  const text = command.trim();
  if (!isSingleOpenClawCommand(text)) return "";

  const words = splitShellWords(text);
  if (words.length === 0) return "";

  for (let i = 1; i < words.length; i += 1) {
    const token = words[i];
    if (!token) continue;
    const normalized = token.toLowerCase();
    if (normalized.startsWith("--") && normalized.includes("=")) continue;
    if (OPENCLAW_FLAGS_WITH_VALUE.has(normalized)) {
      i += 1;
      continue;
    }
    if (normalized.startsWith("-")) continue;
    return normalized;
  }
  return "";
}

function isOpenClawCronCommand(command: string): boolean {
  return extractOpenClawRootCommand(command) === "cron";
}

function isOpenClawHostMaintenanceCommand(command: string): boolean {
  const segments = splitShellCommandSegments(command);
  if (segments.length === 0) return false;
  return segments.every((seg) => isSingleOpenClawCommand(seg));
}

function matchesPolicyPrefixes(command: string, prefixes: string[]): boolean {
  if (prefixes.length === 0) return false;
  const normalized = command.trim().toLowerCase();
  if (!normalized) return false;
  return prefixes.some((p) => normalized.startsWith(p));
}

function matchesPolicyRegex(command: string, patterns: RegExp[]): boolean {
  if (patterns.length === 0) return false;
  return patterns.some((re) => re.test(command));
}

function isRuntimePolicyAllowedCommand(command: string, policy: RuntimeGatePolicyCompiled): boolean {
  const text = command.trim();
  if (!text || hasShellControlOperators(text)) return false;
  return (
    matchesPolicyPrefixes(text, policy.allowShellPrefixes) ||
    matchesPolicyRegex(text, policy.allowShellRegex)
  );
}

function isRuntimePolicyDeniedCommand(command: string, policy: RuntimeGatePolicyCompiled): boolean {
  const text = command.trim();
  if (!text) return false;
  return (
    matchesPolicyPrefixes(text, policy.denyShellPrefixes) ||
    matchesPolicyRegex(text, policy.denyShellRegex)
  );
}

function hasRuntimePolicyAllowIntent(text: string, policy: RuntimeGatePolicyCompiled): boolean {
  if (!text.trim()) return false;
  const normalized = text.toLowerCase();
  if (policy.allowShellPrefixes.some((p) => normalized.includes(p))) return true;
  return policy.allowShellRegex.some((re) => re.test(text));
}

function isUpdateCommandNeedingGovReminder(command: string): boolean {
  const segments = splitShellCommandSegments(command);
  if (segments.length === 0) return false;
  if (!segments.every((seg) => isSingleOpenClawCommand(seg))) return false;
  for (const seg of segments) {
    const text = seg.trim().toLowerCase();
    if (/^openclaw\s+update\b/.test(text)) return true;
    if (/^openclaw\s+(plugins|extensions)\s+update\b/.test(text)) {
      if (text.includes("openclaw-workspace-governance")) return true;
      if (/^openclaw\s+(plugins|extensions)\s+update\s*$/.test(text)) return true;
    }
  }
  return false;
}

function isUpdateIntentText(text: string): boolean {
  if (NEGATED_UPDATE_INTENT_HINT.test(text)) return false;
  return OPENCLAW_UPDATE_INTENT_HINT.test(text);
}

function hasCliUpdateArgvIntent(): boolean {
  const argv = flattenText(
    (globalThis as unknown as { process?: { argv?: unknown[] } })?.process?.argv || [],
  ).toLowerCase();
  if (!argv) return false;
  if (argv.includes("openclaw plugins update")) return true;
  if (argv.includes("openclaw extensions update")) return true;
  if (argv.includes("openclaw update")) return true;
  return false;
}

function postUpdateReminderText(lang: "en" | "zh"): string {
  return i18n(
    lang,
    "Update detected. To avoid governance drift, run this now: /gov_setup check -> if allowlist not ready then /gov_openclaw_json -> /gov_setup check -> /gov_setup upgrade -> /gov_migrate -> /gov_audit. Fallback: /skill gov_setup check, /skill gov_openclaw_json, /skill gov_setup upgrade, /skill gov_migrate, /skill gov_audit.",
    "已偵測到 update。為避免 governance 漂移，請立即執行：/gov_setup check -> 若 allowlist 未就緒先 /gov_openclaw_json -> /gov_setup check -> /gov_setup upgrade -> /gov_migrate -> /gov_audit。備援：/skill gov_setup check、/skill gov_openclaw_json、/skill gov_setup upgrade、/skill gov_migrate、/skill gov_audit。",
  );
}

function govSetupUpgradeHardRuleText(lang: "en" | "zh"): string {
  return i18n(
    lang,
    "Governance hard rule for this turn: explicit /gov_setup upgrade MUST execute upgrade workflow with deterministic runner (node {plugin_root}/tools/gov_setup_sync.mjs upgrade). Do not downgrade to check-mode and do not output SKIPPED/No-op. READY from check is not a reason to skip explicit upgrade. If files are already in sync, return PASS (already up-to-date) after runner verification and shadow-skill reconciliation, then continue /gov_migrate -> /gov_audit.",
    "本輪 governance 硬規則：當用戶明確輸入 /gov_setup upgrade，必須用 deterministic runner 執行 upgrade（node {plugin_root}/tools/gov_setup_sync.mjs upgrade）。不可降級成 check，也不可輸出 SKIPPED/No-op。check 的 READY 不是跳過 explicit upgrade 的理由。若檔案已同步，完成 runner 驗證與 shadow-skill 對齊後，仍需回覆 PASS（already up-to-date），再繼續 /gov_migrate -> /gov_audit。",
  );
}

function isGovSetupAssetDeployCommand(command: string): boolean {
  const raw = command.trim().toLowerCase();
  if (!raw) return false;
  const text = raw.replace(/\\/g, "/");

  const hasGovPromptsTarget = text.includes("prompts/governance");
  if (!hasGovPromptsTarget) return false;

  const hasCopyAction =
    /(^|[\s;|&])(cp|copy|xcopy|robocopy|rsync|copy-item|install)\b/i.test(raw) ||
    text.includes("manual_prompt");
  const hasMkdirAction = /(^|[\s;|&])(mkdir|md|new-item)\b/i.test(raw);

  // During the explicit gov_setup upgrade/install window, any copy/mkdir into
  // prompts/governance is considered authorized deployment work.
  return hasCopyAction || hasMkdirAction;
}

function isGovernanceLifecycleWriteToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const toolName = (event.toolName || "").toLowerCase();
  const payload = flattenText(event.params || "").toLowerCase().replace(/\\/g, "/");

  if (isShellLikeTool(toolName)) {
    const command = flattenText((event.params as Record<string, unknown>)?.command || "");
    if (isGovSetupAssetDeployCommand(command)) return true;
    const normalized = command.toLowerCase().replace(/\\/g, "/");
    if (normalized.includes("prompts/governance/")) return true;
    if (normalized.includes("_control/")) return true;
    if (normalized.includes("_runs/")) return true;
    return false;
  }

  if (!payload) return false;
  if (payload.includes("prompts/governance/")) return true;
  if (payload.includes("_control/")) return true;
  if (payload.includes("_runs/")) return true;
  return false;
}

function isCronToolCall(event: PluginHookBeforeToolCallEvent): boolean {
  const name = (event.toolName || "").toLowerCase();
  if (name === "cron" || name.startsWith("cron.") || name.startsWith("cron_")) {
    return true;
  }
  if (isShellLikeTool(name)) {
    const command = flattenText((event.params as Record<string, unknown>)?.command || "");
    return isOpenClawCronCommand(command);
  }
  return false;
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

function runtimePolicyBlockReason(lang: "en" | "zh"): string {
  if (lang === "zh") {
    return [
      "WORKSPACE_GOVERNANCE runtime policy 已阻擋（這是治理策略閘，不是 OpenClaw 系統錯誤）。",
      "此命令命中 runtimeGatePolicy deny 規則。",
      "官方 `openclaw ...` 系統指令預設不在 deny 封鎖範圍；此封鎖通常針對非系統自訂 shell 命令。",
      "自助修復（可直接貼上）：",
      "1) /gov_openclaw_json",
      "2) 請求修改 openclaw.json 內 openclaw-workspace-governance 的 runtimeGatePolicy",
      "3) 移除/收窄對應 deny 規則，或新增更精準 allow 規則",
      "4) openclaw gateway restart",
      "5) 重試原命令。",
    ].join(" ");
  }
  return [
    "WORKSPACE_GOVERNANCE runtime policy block (this is a governance policy gate, not an OpenClaw system error).",
    "This command matched runtimeGatePolicy deny rules.",
    "Official `openclaw ...` system commands are excluded from deny by default; this usually targets non-system custom shell commands.",
    "Self-serve fix (copy-paste):",
    "1) /gov_openclaw_json",
    "2) Ask to edit openclaw.json plugin config for openclaw-workspace-governance.runtimeGatePolicy",
    "3) Remove/adjust the matching deny rule or add a narrower allow rule",
    "4) openclaw gateway restart",
    "5) Retry original command.",
  ].join(" ");
}

function governanceBlockReason(state: GateState, lang: "en" | "zh"): string {
  if (lang === "zh") {
    const missingZh: string[] = [];
    if (!state.planSeen) missingZh.push("PLAN GATE 證據");
    if (!state.readSeen) missingZh.push("READ GATE 證據");
    const missingTextZh = missingZh.join(" + ");
    return [
      "WORKSPACE_GOVERNANCE 已啟動保護（這是安全阻擋，不是系統錯誤）。",
      `缺少證據：${missingTextZh}。`,
      "若你是只讀診斷/測試，請只用只讀命令重跑。",
      "若你要寫入/更新檔案，先完成 PLAN -> READ，並提供 WG_PLAN_GATE_OK + WG_READ_GATE_OK，再重試 CHANGE。",
      "若屬平台控制面修改，請用 gov_openclaw_json。",
      "若屬 Brain Docs 強化，先 /gov_brain_audit，確認後才 /gov_brain_audit APPROVE: ...",
      "可直接貼上下一步：",
      "1) /gov_brain_audit",
      "2) /skill gov_brain_audit",
      "3) /gov_setup check",
      "4) /skill gov_setup check",
      "5) 完成 PLAN/READ 並帶 WG_PLAN_GATE_OK + WG_READ_GATE_OK 後重試原任務。",
      "6) 官方 `openclaw ...` 系統指令預設允許；如需放行非系統自訂 shell 命令，再於 openclaw.json 調整 runtimeGatePolicy（allow/deny）後重啟 gateway。",
    ].join(" ");
  }
  const missing: string[] = [];
  if (!state.planSeen) missing.push("PLAN GATE evidence");
  if (!state.readSeen) missing.push("READ GATE evidence");
  const missingText = missing.join(" + ");
  return [
    "WORKSPACE_GOVERNANCE guard activated (this is a safety block, not a system error).",
    `Missing evidence: ${missingText}.`,
    "If your task is read-only diagnostics/testing, rerun with read-only commands only.",
    "If your task writes/updates files, complete PLAN -> READ first, include WG_PLAN_GATE_OK + WG_READ_GATE_OK, then retry CHANGE.",
    "If this is a platform control-plane change, use gov_openclaw_json.",
    "If this is Brain Docs hardening, start with /gov_brain_audit and continue with /gov_brain_audit APPROVE: ... only after preview.",
    "Copy-paste next steps:",
    "1) /gov_brain_audit",
    "2) /skill gov_brain_audit",
    "3) /gov_setup check",
    "4) /skill gov_setup check",
    "5) Retry original write task after PLAN/READ with WG_PLAN_GATE_OK + WG_READ_GATE_OK.",
    "6) Official `openclaw ...` system commands are allowed by default. For non-system custom shell commands, manage runtimeGatePolicy in openclaw.json:",
    "   allow: allowShellPrefixes/allowShellRegex, deny: denyShellPrefixes/denyShellRegex, then restart gateway.",
  ].join(" ");
}

function brainAuditBlockReason(state: GateState, lang: "en" | "zh"): string {
  if (lang === "zh") {
    const reason = state.brainAuditRequiredReason
      ? ` 觸發原因：${state.brainAuditRequiredReason}。`
      : "";
    return [
      "WORKSPACE_GOVERNANCE 健康檢查閘已啟動（這是安全阻擋，不是系統錯誤）。",
      "在可寫操作前，請先執行 /gov_brain_audit（只讀預覽）。",
      "之後再繼續原任務（或在你同意後使用 /gov_brain_audit APPROVE: ...）。",
      "備援：/skill gov_brain_audit。",
      "可直接貼上下一步：",
      "1) /gov_brain_audit",
      "2) /skill gov_brain_audit",
      "3) 預覽完成後重試原命令。",
    ].join(" ") + reason;
  }
  const reason = state.brainAuditRequiredReason
    ? ` Trigger: ${state.brainAuditRequiredReason}.`
    : "";
  return [
    "WORKSPACE_GOVERNANCE health-check gate activated (this is a safety block, not a system error).",
    "Before write-capable actions, run /gov_brain_audit (read-only preview) first.",
    "Then continue with your write task (or /gov_brain_audit APPROVE: ... if you approve fixes).",
    "Fallback: /skill gov_brain_audit.",
    "Copy-paste next steps:",
    "1) /gov_brain_audit",
    "2) /skill gov_brain_audit",
    "3) After preview, retry your original command.",
  ].join(" ") + reason;
}

type RunnerResult = {
  status?: string;
  reason?: string | null;
  pass_detail?: string;
  allow_status?: string;
  allowlist_alignment_required?: boolean;
  next_action?: string;
  file_sync_summary?: Record<string, number>;
  shadow_reconcile_required?: boolean;
  workspace_gov_skill_dirs_detected?: string[];
  workspace_gov_skill_dirs_reconciled?: Array<{ from: string; to: string }>;
  governance_residual_paths?: string[];
  removed_paths?: string[];
  restored_paths?: Array<{ from?: string; to?: string }>;
  latest_bootstrap_backup?: string | null;
  warnings?: string[];
  backup_root?: string | null;
  run_report?: string;
  missing_files?: string[];
  missing_sources?: string[];
  equality?: Array<{ id?: string; status?: string }>;
  item_id?: string;
  item_title?: string;
  apply_type?: string;
  menu_source?: string;
  followup?: string[];
  [key: string]: unknown;
};

function pickCommandLanguage(ctx: PluginCommandContext): "en" | "zh" {
  const sample = flattenText([ctx.commandBody, ctx.args, ctx.channel, ctx.config]);
  return detectUxLanguage(sample);
}

function toTextList(items: string[]): string {
  if (items.length === 0) return "- none";
  return items.map((x) => `- ${x}`).join("\n");
}

function parseModeArg(ctx: PluginCommandContext): string {
  const raw = String(ctx.args || "").trim();
  if (!raw) return "";
  const tokens = raw.split(/\s+/).filter(Boolean);
  return String(tokens[0] || "").toLowerCase();
}

async function runInProcessRunner(
  moduleRelPath: string,
  exportName: string,
  args: unknown[] = [],
): Promise<{ ok: boolean; data?: RunnerResult; err?: string }> {
  try {
    const specifier = `./${moduleRelPath.replace(/\\\\/g, "/")}`;
    const mod = await import(specifier);
    const fn = (mod as Record<string, unknown>)[exportName];
    if (typeof fn !== "function") {
      return { ok: false, err: `runner export not found: ${exportName} in ${moduleRelPath}` };
    }
    const data = (fn as (...input: unknown[]) => unknown)(...args) as RunnerResult;
    if (!data || typeof data !== "object") {
      return { ok: false, err: `runner returned invalid payload: ${moduleRelPath}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, err: `runner exception: ${String((err as Error)?.message || err)}` };
  }
}

function formatCommandOutput(
  status: string,
  whyLines: string[],
  nextStep: string,
  commandLines: string[],
): string {
  return [
    "STATUS",
    status,
    "",
    "WHY",
    ...whyLines.map((line) => (line.startsWith("- ") ? line : `- ${line}`)),
    "",
    "NEXT STEP (Operator)",
    nextStep,
    "",
    "COMMAND TO COPY",
    ...commandLines.map((line) => (line.startsWith("- ") ? line : `- ${line}`)),
  ].join("\n");
}

async function makeGovSetupCommandResponse(ctx: PluginCommandContext): Promise<string> {
  const lang = pickCommandLanguage(ctx);
  const modeArg = parseModeArg(ctx);
  const mode = modeArg || "install";
  const validModes = new Set(["check", "install", "upgrade"]);
  if (!validModes.has(mode)) {
    return formatCommandOutput(
      "BLOCKED",
      [
        i18n(lang, `Invalid mode: ${mode}. Allowed: check/install/upgrade.`, `mode 無效：${mode}。只接受 check/install/upgrade。`),
      ],
      i18n(lang, "Retry with a valid mode.", "請用有效 mode 重試。"),
      ["/gov_setup check", "/gov_setup install", "/gov_setup upgrade"],
    );
  }

  const runner = await runInProcessRunner("tools/gov_setup_sync.mjs", "runGovSetupSync", [mode]);
  if (!runner.ok || !runner.data) {
    return formatCommandOutput(
      "BLOCKED",
      [i18n(lang, `deterministic runner failed: ${runner.err || "unknown error"}`, `deterministic runner 失敗：${runner.err || "未知錯誤"}`)],
      i18n(lang, "Check plugin install path and rerun command.", "請檢查 plugin 安裝路徑後重試。"),
      ["/gov_setup check", "/skill gov_setup check"],
    );
  }

  const data = runner.data;
  if (mode === "check") {
    const status = String(data.status || "PARTIAL").toUpperCase();
    const allowStatus = String(data.allow_status || "ALLOW_NOT_SET");
    const shadowRequired = Boolean(data.shadow_reconcile_required);
    const shadowDetected = Array.isArray(data.workspace_gov_skill_dirs_detected)
      ? data.workspace_gov_skill_dirs_detected
      : [];
    const summary = data.file_sync_summary || {};
    const why = [
      `status: ${status}`,
      `allow_status: ${allowStatus}`,
      `allowlist_alignment_required: ${String(Boolean(data.allowlist_alignment_required))}`,
      `shadow_reconcile_required: ${String(shadowRequired)}`,
      `file_sync_summary: MISSING=${String(summary.MISSING ?? 0)} OUT_OF_SYNC=${String(summary.OUT_OF_SYNC ?? 0)} IN_SYNC=${String(summary.IN_SYNC ?? 0)}`,
    ];
    if (shadowDetected.length > 0) {
      why.push(`workspace_gov_skill_dirs_detected:\n${toTextList(shadowDetected)}`);
    }

    if (allowStatus !== "ALLOW_OK") {
      return formatCommandOutput(
        "READY_WITH_WARNING",
        why,
        i18n(lang, "Align allowlist first, then rerun check.", "先對齊 allowlist，再重跑 check。"),
        ["/gov_openclaw_json", "/gov_setup check"],
      );
    }
    if (shadowRequired || status === "PARTIAL") {
      return formatCommandOutput(
        "PARTIAL",
        why,
        i18n(lang, "Run upgrade to reconcile and sync governance files.", "請先跑 upgrade 做對齊與同步。"),
        ["/gov_setup upgrade"],
      );
    }
    if (status === "NOT_INSTALLED") {
      return formatCommandOutput(
        "NOT_INSTALLED",
        why,
        i18n(lang, "Install governance files first.", "請先安裝 governance 檔案。"),
        ["/gov_setup install"],
      );
    }
    return formatCommandOutput(
      "READY",
      why,
      i18n(lang, "Proceed with migration then audit.", "可以直接進 migration + audit。"),
      ["/gov_migrate", "/gov_audit"],
    );
  }

  const runStatus = String(data.status || "BLOCKED").toUpperCase();
  if (runStatus !== "PASS") {
    return formatCommandOutput(
      "BLOCKED",
      [
        i18n(lang, `runner status: ${runStatus}`, `runner 狀態：${runStatus}`),
        `reason: ${String(data.reason || "unknown")}`,
      ],
      i18n(lang, "Fix blocker and retry setup command.", "先修復阻擋再重試 setup。"),
      ["/gov_setup check", "fallback: /skill gov_setup check"],
    );
  }

  const why = [
    `mode: ${mode}`,
    `pass_detail: ${String(data.pass_detail || "updated")}`,
    `allow_status: ${String(data.allow_status || "ALLOW_NOT_SET")}`,
  ];
  if (Array.isArray(data.workspace_gov_skill_dirs_reconciled) && data.workspace_gov_skill_dirs_reconciled.length > 0) {
    why.push(`workspace_gov_skill_dirs_reconciled=${String(data.workspace_gov_skill_dirs_reconciled.length)}`);
  }
  if (data.backup_root) why.push(`backup_root: ${String(data.backup_root)}`);
  const allowStatus = String(data.allow_status || "ALLOW_NOT_SET");
  const nextAction = String(data.next_action || "");
  if (allowStatus !== "ALLOW_OK" || nextAction === "ALIGN_ALLOWLIST_THEN_CHECK") {
    return formatCommandOutput(
      "PASS_WITH_WARNING",
      why,
      i18n(lang, "Align allowlist first, then rerun check.", "先對齊 allowlist，再重跑 check。"),
      ["/gov_openclaw_json", "/gov_setup check"],
    );
  }
  if (mode === "install") {
    return formatCommandOutput(
      "PASS",
      why,
      i18n(
        lang,
        "Run migration, then audit. Missing governance control files will be reconciled during migration.",
        "先跑 migration，再跑 audit。若缺少 governance 控制檔，migration 會自動補齊。",
      ),
      ["/gov_migrate", "/gov_audit"],
    );
  }
  return formatCommandOutput(
    "PASS",
    why,
    i18n(lang, "Run migration, then audit.", "先跑 migration，再跑 audit。"),
    ["/gov_migrate", "/gov_audit"],
  );
}

async function makeGovMigrateCommandResponse(ctx: PluginCommandContext): Promise<string> {
  const lang = pickCommandLanguage(ctx);
  const runner = await runInProcessRunner("tools/gov_migrate_sync.mjs", "runGovMigrateSync", []);
  if (!runner.ok || !runner.data) {
    return formatCommandOutput(
      "BLOCKED",
      [i18n(lang, `deterministic runner failed: ${runner.err || "unknown error"}`, `deterministic runner 失敗：${runner.err || "未知錯誤"}`)],
      i18n(lang, "Retry after gov_setup upgrade.", "請先執行 gov_setup upgrade 後重試。"),
      ["/gov_setup upgrade", "/gov_migrate"],
    );
  }
  const data = runner.data;
  const status = String(data.status || "BLOCKED").toUpperCase();
  const equality = Array.isArray(data.equality) ? data.equality : [];
  const mismatch = equality.filter((x) => String(x.status || "") !== "MATCH");
  if (status !== "PASS") {
    const reason = String(data.reason || "MIGRATION_BLOCKED");
    const missing = Array.isArray((data as { missing?: unknown[] }).missing)
      ? ((data as { missing?: unknown[] }).missing as unknown[])
          .map((x) => String(x || ""))
          .filter((x) => x.trim().length > 0)
      : [];
    const missingText = missing.map((p) => p.replace(/\\/g, "/"));
    const hasMissingPrompts =
      missingText.some((p) => p.endsWith("/prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md")) ||
      missingText.some((p) => p.endsWith("/prompts/governance/WORKSPACE_GOVERNANCE_MIGRATION.md"));
    const hasMissingControl =
      missingText.some((p) => p.endsWith("/_control/GOVERNANCE_BOOTSTRAP.md")) ||
      missingText.some((p) => p.endsWith("/_control/REGRESSION_CHECK.md")) ||
      missingText.some((p) => p.endsWith("/_control/WORKSPACE_INDEX.md"));
    const why = [
      `status: ${status}`,
      `reason: ${reason}`,
      mismatch.length > 0
        ? `canonical_mismatch: ${mismatch.map((x) => String(x.id || "unknown")).join(", ")}`
        : "canonical_mismatch: none",
      missingText.length > 0 ? `missing_required:\n${toTextList(missingText)}` : "",
      data.run_report ? `run_report: ${String(data.run_report)}` : "",
    ].filter(Boolean);
    if (reason === "MISSING_REQUIRED_FILES" && hasMissingPrompts) {
      return formatCommandOutput(
        "BLOCKED",
        why,
        i18n(
          lang,
          "Governance prompts are missing. Run setup upgrade first, then retry migration.",
          "缺少 governance prompts。先跑 setup upgrade，再重試 migration。",
        ),
        ["/gov_setup upgrade", "/gov_migrate"],
      );
    }
    if (reason === "MISSING_REQUIRED_FILES" && hasMissingControl) {
      return formatCommandOutput(
        "BLOCKED",
        why,
        i18n(
          lang,
          "Governance control files are missing. Run setup upgrade, then retry migration.",
          "缺少 governance _control 檔。先跑 setup upgrade，再重試 migration。",
        ),
        ["/gov_setup upgrade", "/gov_migrate"],
      );
    }
    return formatCommandOutput(
      "BLOCKED",
      why,
      i18n(lang, "Run gov_setup upgrade, then retry migration.", "先跑 gov_setup upgrade，再重試 migration。"),
      ["/gov_setup upgrade", "/gov_migrate"],
    );
  }
  return formatCommandOutput(
    "PASS",
    [
      "deterministic migration completed",
      Array.isArray((data as { seeded_missing_files?: unknown[] }).seeded_missing_files) &&
      (data as { seeded_missing_files?: unknown[] }).seeded_missing_files!.length > 0
        ? `seeded_missing_files:\n${toTextList(
            ((data as { seeded_missing_files?: unknown[] }).seeded_missing_files || [])
              .map((x) => String(x))
              .filter((x) => x.trim().length > 0),
          )}`
        : "",
      Array.isArray((data as { repaired_missing_marker_files?: unknown[] }).repaired_missing_marker_files) &&
      (data as { repaired_missing_marker_files?: unknown[] }).repaired_missing_marker_files!.length > 0
        ? `repaired_missing_marker_files:\n${toTextList(
            ((data as { repaired_missing_marker_files?: unknown[] }).repaired_missing_marker_files || [])
              .map((x) => String(x))
              .filter((x) => x.trim().length > 0),
          )}`
        : "",
      data.run_report ? `run_report: ${String(data.run_report)}` : "",
    ].filter(Boolean),
    i18n(lang, "Run audit now.", "請立即執行 audit。"),
    ["/gov_audit"],
  );
}

async function makeGovApplyCommandResponse(ctx: PluginCommandContext): Promise<string> {
  const lang = pickCommandLanguage(ctx);
  const itemId = parseModeArg(ctx);
  if (!/^\d{2}$/.test(itemId)) {
    return formatCommandOutput(
      "BLOCKED",
      [
        i18n(
          lang,
          `Invalid item id: ${itemId || "(empty)"}. Use two digits like 01.`,
          `item id 無效：${itemId || "（空白）"}。請使用兩位數，例如 01。`,
        ),
      ],
      i18n(lang, "Retry with one approved BOOT item number.", "請用已批准的 BOOT 兩位數編號重試。"),
      ["/gov_apply 01", "fallback: /skill gov_apply 01"],
    );
  }

  const runner = await runInProcessRunner("tools/gov_apply_sync.mjs", "runGovApplySync", [itemId]);
  if (!runner.ok || !runner.data) {
    return formatCommandOutput(
      "BLOCKED",
      [i18n(lang, `deterministic runner failed: ${runner.err || "unknown error"}`, `deterministic runner 失敗：${runner.err || "未知錯誤"}`)],
      i18n(lang, "Check plugin install path and retry apply.", "請檢查 plugin 安裝路徑後重試 apply。"),
      ["/gov_setup check", "/gov_apply 01"],
    );
  }

  const data = runner.data;
  const status = String(data.status || "BLOCKED").toUpperCase();
  if (status !== "PASS") {
    const reason = String(data.reason || "APPLY_BLOCKED");
    const missing = Array.isArray(data.missing_files)
      ? data.missing_files.map((x) => String(x)).filter((x) => x.trim().length > 0)
      : [];
    const availableItems = Array.isArray(data.available_items)
      ? data.available_items.map((x) => String(x)).filter((x) => x.trim().length > 0)
      : [];
    const why = [
      `status: ${status}`,
      `reason: ${reason}`,
      `item_id: ${itemId}`,
      missing.length > 0 ? `missing_files:\n${toTextList(missing)}` : "",
      availableItems.length > 0 ? `available_items: ${availableItems.join(", ")}` : "",
      data.run_report ? `run_report: ${String(data.run_report)}` : "",
    ].filter(Boolean);

    if (reason === "BOOT_MENU_MISSING" || reason === "MENU_ITEM_NOT_FOUND") {
      return formatCommandOutput(
        "BLOCKED",
        why,
        i18n(
          lang,
          "Refresh BOOT menu context first, then retry one approved item.",
          "先刷新 BOOT menu 上下文，再重試已批准項目。",
        ),
        [
          "prompts/governance/OpenClaw_INIT_BOOTSTRAP_WORKSPACE_GOVERNANCE.md",
          `/gov_apply ${itemId}`,
        ],
      );
    }
    if (reason === "MISSING_REQUIRED_FILES") {
      return formatCommandOutput(
        "BLOCKED",
        why,
        i18n(
          lang,
          "Required governance files are missing. Run setup upgrade, then rerun apply.",
          "缺少必要 governance 檔案。先跑 setup upgrade，再重試 apply。",
        ),
        ["/gov_setup upgrade", `/gov_apply ${itemId}`],
      );
    }
    return formatCommandOutput(
      "BLOCKED",
      why,
      i18n(
        lang,
        "Fix blocker, then rerun one approved BOOT item.",
        "先修復阻擋，再重試已批准 BOOT 項目。",
      ),
      [`/gov_apply ${itemId}`, "/gov_migrate", "/gov_audit"],
    );
  }

  return formatCommandOutput(
    "PASS",
    [
      `item_id: ${String(data.item_id || itemId)}`,
      `item_title: ${String(data.item_title || "n/a")}`,
      `apply_type: ${String(data.apply_type || "n/a")}`,
      `menu_source: ${String(data.menu_source || "n/a")}`,
      `backup_root: ${String(data.backup_root || "n/a")}`,
      data.run_report ? `run_report: ${String(data.run_report)}` : "",
    ].filter(Boolean),
    i18n(lang, "Run migration, then audit.", "先跑 migration，再跑 audit。"),
    ["/gov_migrate", "/gov_audit"],
  );
}

async function makeGovUninstallCommandResponse(ctx: PluginCommandContext): Promise<string> {
  const lang = pickCommandLanguage(ctx);
  const modeArg = parseModeArg(ctx);
  const mode = modeArg || "check";
  const validModes = new Set(["check", "uninstall"]);
  if (!validModes.has(mode)) {
    return formatCommandOutput(
      "BLOCKED",
      [
        i18n(
          lang,
          `Invalid mode: ${mode}. Allowed: check/uninstall.`,
          `mode 無效：${mode}。只接受 check/uninstall。`,
        ),
      ],
      i18n(lang, "Retry with a valid mode.", "請用有效 mode 重試。"),
      ["/gov_uninstall check", "/gov_uninstall uninstall"],
    );
  }

  const runner = await runInProcessRunner("tools/gov_uninstall_sync.mjs", "runGovUninstallSync", [mode]);
  if (!runner.ok || !runner.data) {
    return formatCommandOutput(
      "BLOCKED",
      [
        i18n(
          lang,
          `deterministic runner failed: ${runner.err || "unknown error"}`,
          `deterministic runner 失敗：${runner.err || "未知錯誤"}`,
        ),
      ],
      i18n(lang, "Check plugin install path and rerun command.", "請檢查 plugin 安裝路徑後重試。"),
      ["/gov_uninstall check", "/skill gov_uninstall check"],
    );
  }

  const data = runner.data;
  if (mode === "check") {
    const status = String(data.status || "RESIDUAL").toUpperCase();
    const residual = Array.isArray(data.governance_residual_paths)
      ? data.governance_residual_paths
      : [];
    const restore = Array.isArray(data.restore_candidates)
      ? data.restore_candidates
      : [];
    const why = [
      `status: ${status}`,
      `residual_count: ${String(residual.length)}`,
      `restore_candidate_count: ${String(restore.length)}`,
      `latest_bootstrap_backup: ${String(data.latest_bootstrap_backup || "none")}`,
      `governance_agents_detected: ${String(Boolean(data.governance_agents_detected))}`,
    ];
    if (residual.length > 0) {
      why.push(`governance_residual_paths:\n${toTextList(residual.map((x) => String(x)))}`);
    }
    if (Array.isArray(data.warnings) && data.warnings.length > 0) {
      why.push(`warnings:\n${toTextList(data.warnings.map((x) => String(x)))}`);
    }
    if (status === "CLEAN") {
      return formatCommandOutput(
        "CLEAN",
        why,
        i18n(lang, "Workspace has no governance residuals to uninstall.", "workspace 內沒有 governance 殘留要卸載。"),
        ["/gov_setup check"],
      );
    }
    return formatCommandOutput(
      "RESIDUAL",
      why,
      i18n(lang, "Run uninstall to clear residual governance artifacts with backup.", "請執行 uninstall（含備份）清理 governance 殘留。"),
      ["/gov_uninstall uninstall", "fallback: /skill gov_uninstall uninstall"],
    );
  }

  const runStatus = String(data.status || "BLOCKED").toUpperCase();
  if (runStatus !== "PASS") {
    return formatCommandOutput(
      "BLOCKED",
      [
        i18n(lang, `runner status: ${runStatus}`, `runner 狀態：${runStatus}`),
        `reason: ${String(data.reason || "unknown")}`,
      ],
      i18n(lang, "Fix blocker and retry uninstall.", "先修復阻擋再重試 uninstall。"),
      ["/gov_uninstall check", "/gov_uninstall uninstall"],
    );
  }

  const removed = Array.isArray(data.removed_paths) ? data.removed_paths : [];
  const restored = Array.isArray(data.restored_paths) ? data.restored_paths : [];
  const why = [
    `mode: ${mode}`,
    `removed_paths: ${String(removed.length)}`,
    `restored_paths: ${String(restored.length)}`,
    `backup_root: ${String(data.backup_root || "none")}`,
    `run_report: ${String(data.run_report || "none")}`,
  ];
  if (Array.isArray(data.warnings) && data.warnings.length > 0) {
    why.push(`warnings:\n${toTextList(data.warnings.map((x) => String(x)))}`);
  }
  return formatCommandOutput(
    "PASS",
    why,
    i18n(
      lang,
      "Workspace governance uninstall is complete. Then disable/uninstall plugin package if needed.",
      "workspace governance 卸載完成。若需要，下一步可停用/卸載 plugin 套件。",
    ),
    [
      "openclaw plugins disable openclaw-workspace-governance",
      "optional: openclaw plugins uninstall openclaw-workspace-governance",
    ],
  );
}

async function makeGovAuditCommandResponse(ctx: PluginCommandContext): Promise<string> {
  const lang = pickCommandLanguage(ctx);
  const runner = await runInProcessRunner("tools/gov_audit_sync.mjs", "runGovAuditSync", []);
  if (!runner.ok || !runner.data) {
    return formatCommandOutput(
      "FAIL",
      [i18n(lang, `deterministic runner failed: ${runner.err || "unknown error"}`, `deterministic runner 失敗：${runner.err || "未知錯誤"}`)],
      i18n(lang, "Rerun migration and then audit.", "請先重跑 migration，再跑 audit。"),
      ["/gov_migrate", "/gov_audit"],
    );
  }
  const data = runner.data;
  const status = String(data.status || "FAIL").toUpperCase();
  const equality = Array.isArray(data.equality) ? data.equality : [];
  const mismatch = equality.filter((x) => String(x.status || "") !== "MATCH");
  if (status !== "PASS") {
    return formatCommandOutput(
      "FAIL",
      [
        `status: ${status}`,
        mismatch.length > 0
          ? `canonical_mismatch: ${mismatch.map((x) => String(x.id || "unknown")).join(", ")}`
          : "canonical_mismatch: none",
        data.run_report ? `run_report: ${String(data.run_report)}` : "",
      ].filter(Boolean),
      i18n(lang, "Fix migration state, then rerun audit.", "先修復 migration 狀態，再重跑 audit。"),
      ["/gov_migrate", "/gov_audit"],
    );
  }
  return formatCommandOutput(
    "PASS",
    [
      "audit passed with deterministic checks",
      data.run_report ? `run_report: ${String(data.run_report)}` : "",
    ].filter(Boolean),
    i18n(lang, "Governance lifecycle is aligned.", "governance 流程已對齊。"),
    ["/gov_setup check"],
  );
}

function registerDeterministicGovCommands(api: OpenClawPluginApi): void {
  if (typeof api.registerCommand !== "function") {
    api.logger.warn("[governance-command] registerCommand API unavailable; falling back to skill-only mode.");
    return;
  }
  api.registerCommand({
    name: "gov_setup",
    description: "Deterministic governance setup/check/upgrade runner.",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: PluginCommandContext) => ({ text: await makeGovSetupCommandResponse(ctx) }),
  });
  api.registerCommand({
    name: "gov_migrate",
    description: "Deterministic governance migration runner.",
    acceptsArgs: false,
    requireAuth: true,
    handler: async (ctx: PluginCommandContext) => ({ text: await makeGovMigrateCommandResponse(ctx) }),
  });
  api.registerCommand({
    name: "gov_apply",
    description: "Deterministic BOOT-approved governance apply runner.",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: PluginCommandContext) => ({ text: await makeGovApplyCommandResponse(ctx) }),
  });
  api.registerCommand({
    name: "gov_uninstall",
    description: "Deterministic governance uninstall/check runner.",
    acceptsArgs: true,
    requireAuth: true,
    handler: async (ctx: PluginCommandContext) => ({ text: await makeGovUninstallCommandResponse(ctx) }),
  });
  api.registerCommand({
    name: "gov_audit",
    description: "Deterministic governance audit runner.",
    acceptsArgs: false,
    requireAuth: true,
    handler: async (ctx: PluginCommandContext) => ({ text: await makeGovAuditCommandResponse(ctx) }),
  });
  api.logger.info("[governance-command] registered deterministic commands: gov_setup, gov_migrate, gov_apply, gov_uninstall, gov_audit");
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
  const cfg = (api.pluginConfig || {}) as {
    runtimeGateEnabled?: boolean;
    runtimeGatePolicy?: RuntimeGatePolicyConfig;
    toolExposureGuard?: ToolExposureGuardConfig;
  };
  registerDeterministicGovCommands(api);
  const runtimeGateEnabled = cfg.runtimeGateEnabled !== false;
  const runtimeGatePolicy = buildRuntimeGatePolicy(cfg.runtimeGatePolicy, api.logger);
  const toolExposureGuard = buildToolExposureGuard(cfg.toolExposureGuard, api.logger);
  if (!runtimeGateEnabled) {
    api.logger.warn("[governance-gate] runtime hard gate is disabled by plugin config.");
    return;
  }

  api.logger.info("[governance-gate] registering hooks: before_prompt_build, before_tool_call, agent_end");
  if (hasCliUpdateArgvIntent()) {
    const lang = detectEnvLanguage();
    api.logger.warn(
      i18n(
        lang,
        "[governance-gate] Update detected. Next step: /gov_setup check -> (if allowlist not ready) /gov_openclaw_json -> /gov_setup check -> /gov_setup upgrade -> /gov_migrate -> /gov_audit",
        "[governance-gate] 偵測到 update。下一步：/gov_setup check ->（若 allowlist 未就緒）/gov_openclaw_json -> /gov_setup check -> /gov_setup upgrade -> /gov_migrate -> /gov_audit",
      ),
    );
  }

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
      const latestUserTurn = latestUserTurnText(event.messages);
      state.uxLang = detectUxLanguage(`${latestUserTurn}\n${userText}`);
      const govRequestKindUser = detectGovRequestKind(userText);
      const govRequestKindTail = detectGovRequestKind(tailText);
      const govRequestKind = govRequestKindUser !== "none" ? govRequestKindUser : govRequestKindTail;
      const setupRequestKindUser = detectGovCommandKindByName(latestUserTurn, "gov_setup");
      const setupRequestKindTail = detectGovCommandKindByName(tailText, "gov_setup");
      const setupModeUser = detectGovCommandMode(latestUserTurn, "gov_setup");
      const setupUpgradeIntentUser = isGovSetupUpgradeIntent(latestUserTurn);
      const updateIntentUser = isUpdateIntentText(latestUserTurn) || isUpdateIntentText(userText);
      const migrateKindUser = detectGovCommandKindByName(latestUserTurn, "gov_migrate");
      const auditKindUser = detectGovCommandKindByName(latestUserTurn, "gov_audit");
      const brainAuditKindUser = detectGovCommandKindByName(latestUserTurn, "gov_brain_audit");
      const cronIntentUser = isCronIntent(latestUserTurn) || isCronIntent(userText);
      const hostMaintenanceIntentUser =
        isHostMaintenanceIntent(latestUserTurn) || isHostMaintenanceIntent(userText);
      const runtimePolicyAllowIntentUser =
        hasRuntimePolicyAllowIntent(latestUserTurn, runtimeGatePolicy) ||
        hasRuntimePolicyAllowIntent(userText, runtimeGatePolicy);

      const modeCRequired =
        !cronIntentUser &&
        !hostMaintenanceIntentUser &&
        !runtimePolicyAllowIntentUser &&
        (inferWriteIntent(userText) || govRequestKindTail === "write");
      const explicitGovCommandRequested =
        govRequestKindUser !== "none" || govRequestKindTail !== "none";
      const explicitGovEntrypoint = govRequestKind === "write" || govRequestKindTail === "write";
      const now = Date.now();
      const permissiveContextMatches = matchedPermissivePolicyContexts(
        ctx,
        `${latestUserTurn}\n${tailText}`,
        toolExposureGuard,
      );

      state.planSeen = state.planSeen || hasPlanEvidence(tailText);
      state.readSeen = state.readSeen || hasReadEvidence(tailText);
      if (brainAuditKindUser === "none") {
        const setupUpgradeRequested = setupModeUser === "upgrade";
        const migrateRequested = migrateKindUser === "write";
        const auditRequested = auditKindUser === "read";
        if (setupUpgradeRequested) {
          markBrainAuditRequired(state, "post gov_setup upgrade", now);
        }
        if (migrateRequested) {
          markBrainAuditRequired(state, "post gov_migrate", now);
        }
        if (auditRequested) {
          markBrainAuditRequired(state, "post gov_audit", now);
        }
        if (state.blockedWrites >= BRAIN_AUDIT_BLOCK_THRESHOLD) {
          markBrainAuditRequired(state, "repeated blocked writes", now);
        }
      } else {
        state.brainAuditNudgedAt = now;
        if (brainAuditKindUser === "read") {
          state.brainAuditPreviewSeenAt = now;
          state.brainAuditRequiredUntil = 0;
          state.brainAuditRequiredReason = undefined;
          state.blockedWrites = 0;
        }
      }
      if (explicitGovCommandRequested) {
        state.govCommandIntentUntil = now + GOV_COMMAND_INTENT_WINDOW_MS;
      }
      if (explicitGovEntrypoint) {
        // gov_* entrypoints are dedicated governance workflows; allow them to execute
        // their own PLAN/READ/CHANGE/QC/PERSIST steps without deadlocking at tool gate.
        state.govEntrypointSeen = true;
        state.govBypassUntil = now + GOV_BYPASS_WINDOW_MS;
        state.govBypassWritesLeft = GOV_BYPASS_MAX_WRITES;
        globalGovBypassUntil = now + GOV_BYPASS_WINDOW_MS;
        globalGovBypassWritesLeft = GOV_BYPASS_MAX_WRITES;
      }
      if (
        setupRequestKindUser === "write" ||
        setupRequestKindTail === "write" ||
        setupUpgradeIntentUser
      ) {
        globalGovSetupFlowUntil = now + GOV_SETUP_FLOW_WINDOW_MS;
      }
      if (updateIntentUser) {
        state.postUpdateReminderPending = true;
        state.postUpdateReminderAt = now;
      }
      state.updatedAt = now;

      states.set(sessionKey, state);

      const enforceUpgradeRule =
        setupModeUser === "upgrade" || setupUpgradeIntentUser;
      const upgradeDirectiveText = enforceUpgradeRule
        ? govSetupUpgradeHardRuleText(state.uxLang)
        : "";

      if (state.postUpdateReminderPending) {
        if (now - state.postUpdateReminderAt <= POST_UPDATE_REMINDER_WINDOW_MS) {
          state.postUpdateReminderPending = false;
          state.updatedAt = now;
          states.set(sessionKey, state);
          return {
            prependContext:
              postUpdateReminderText(state.uxLang) +
              (upgradeDirectiveText ? ` ${upgradeDirectiveText}` : ""),
          };
        }
        state.postUpdateReminderPending = false;
        state.postUpdateReminderAt = 0;
      }

      if (upgradeDirectiveText) {
        return {
          prependContext: upgradeDirectiveText,
        };
      }

      const brainAuditRequired = isBrainAuditRequirementActive(state, now);
      if (brainAuditRequired && modeCRequired && !explicitGovEntrypoint && !setupUpgradeIntentUser) {
        const ctx = i18n(
          state.uxLang,
          "Automatic governance health-check is active for this session. First action in this turn MUST be /gov_brain_audit (read-only preview). Do not run any write-capable step before it. After preview, continue your requested task (or use /gov_brain_audit APPROVE: ... if you approve fixes). ",
          "此 session 已啟用自動 governance 健康檢查。本輪第一步必須先 /gov_brain_audit（只讀預覽）。在此之前不要執行任何可寫步驟。預覽後再繼續你的任務（或在你同意後使用 /gov_brain_audit APPROVE: ...）。",
        );
        return {
          prependContext:
            ctx +
            (state.brainAuditRequiredReason
              ? i18n(
                  state.uxLang,
                  `Trigger: ${state.brainAuditRequiredReason}. `,
                  `觸發原因：${state.brainAuditRequiredReason}。`,
                )
              : "") +
            i18n(state.uxLang, "Fallback: /skill gov_brain_audit.", "備援：/skill gov_brain_audit。"),
        };
      }
      if (
        !brainAuditRequired &&
        state.brainAuditPreviewSeenAt === 0 &&
        modeCRequired &&
        now - state.brainAuditNudgedAt > BRAIN_AUDIT_NUDGE_COOLDOWN_MS
      ) {
        state.brainAuditNudgedAt = now;
        state.updatedAt = now;
        states.set(sessionKey, state);
        return {
          prependContext:
            i18n(
              state.uxLang,
              "Governance health-check suggestion: run /gov_brain_audit first (read-only preview) before high-risk write tasks. Then proceed with PLAN/READ/CHANGE/QC/PERSIST.",
              "Governance 健康檢查建議：高風險寫入前先執行 /gov_brain_audit（只讀預覽），再執行 PLAN/READ/CHANGE/QC/PERSIST。",
            ),
        };
      }

      if (
        modeCRequired &&
        !explicitGovEntrypoint &&
        !setupUpgradeIntentUser &&
        (!state.planSeen || !state.readSeen)
      ) {
        const routeHints: string[] = [];
        if (isPlatformChangeIntent(userText)) {
          routeHints.push(
            i18n(
              state.uxLang,
              "Route platform control-plane changes via /gov_openclaw_json (fallback: /skill gov_openclaw_json).",
              "平台控制面變更請走 /gov_openclaw_json（備援：/skill gov_openclaw_json）。",
            ),
          );
        }
        if (isBrainAuditIntent(userText)) {
          routeHints.push(
            i18n(
              state.uxLang,
              "Route Brain Docs risk reviews via /gov_brain_audit (then /gov_brain_audit APPROVE: ... only when approved).",
              "Brain Docs 風險檢查請走 /gov_brain_audit（確認後才 /gov_brain_audit APPROVE: ...）。",
            ),
          );
        }
        const routeHintText = routeHints.length > 0 ? ` ${routeHints.join(" ")}` : "";
        return {
          prependContext:
            i18n(
              state.uxLang,
              "Runtime governance guard preflight: write intent detected. This is a safety check, not a system failure. Before any write-capable tool call, complete PLAN GATE and READ GATE evidence first. Include WG_PLAN_GATE_OK and WG_READ_GATE_OK in your governance response. If this task is read-only diagnostics/testing, keep it read-only and rerun. If write intent is uncertain, treat as Mode C (fail-closed).",
              "Runtime governance 預檢：已偵測寫入意圖。這是安全檢查，不是系統故障。任何可寫工具呼叫前，先完成 PLAN GATE 與 READ GATE 證據，並在回覆內包含 WG_PLAN_GATE_OK 及 WG_READ_GATE_OK。若本任務為只讀診斷/測試，請以只讀方式重跑。若寫入意圖不確定，請按 Mode C（fail-closed）處理。",
            ) +
            routeHintText,
        };
      }
      if (
        toolExposureGuard.enabled &&
        permissiveContextMatches.length > 0 &&
        !explicitGovCommandRequested &&
        now - state.toolExposureWarnedAt > TOOL_EXPOSURE_ADVISORY_COOLDOWN_MS
      ) {
        state.toolExposureWarnedAt = now;
        state.updatedAt = now;
        states.set(sessionKey, state);
        return {
          prependContext: toolExposureAdvisoryText(
            state.uxLang,
            permissiveContextMatches,
            toolExposureGuard.requireExplicitGovCommandIntent,
          ),
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
      const now = Date.now();
      const toolName = (event.toolName || "").toLowerCase();
      const shellLike = isShellLikeTool(toolName);
      const shellCommand = shellLike
        ? flattenText((event.params as Record<string, unknown>)?.command || "")
        : "";

      if (shellLike && isUpdateCommandNeedingGovReminder(shellCommand)) {
        state.postUpdateReminderPending = true;
        state.postUpdateReminderAt = now;
        state.updatedAt = now;
        states.set(sessionKey, state);
      }

      if (isReadToolCall(event)) {
        state.readSeen = true;
        state.updatedAt = now;
        states.set(sessionKey, state);
      }

      const permissiveContextMatches = matchedPermissivePolicyContexts(
        ctx,
        "",
        toolExposureGuard,
      );
      const isImplicitGovernanceToolCall =
        isGovernancePluginToolCall(event) &&
        !(
          toolExposureGuard.allowExplicitGovCommands &&
          (now <= state.govCommandIntentUntil || hasExplicitGovCommandPayload(event))
        );
      const shouldBlockImplicitGovernanceToolCall =
        isImplicitGovernanceToolCall &&
        (
          toolExposureGuard.requireExplicitGovCommandIntent ||
          permissiveContextMatches.length > 0
        );
      if (
        toolExposureGuard.enabled &&
        shouldBlockImplicitGovernanceToolCall
      ) {
        if (toolExposureGuard.mode === "advisory") {
          api.logger.warn(
            `[governance-gate] tool-exposure advisory only: ${toolExposureAdvisoryText(
              state.uxLang,
              permissiveContextMatches,
              toolExposureGuard.requireExplicitGovCommandIntent,
            )}`,
          );
        } else {
          state.blockedWrites += 1;
          state.lastWriteTool = event.toolName;
          state.updatedAt = now;
          states.set(sessionKey, state);
          return {
            block: true,
            blockReason: toolExposureBlockReason(
              state.uxLang,
              permissiveContextMatches,
              toolExposureGuard.requireExplicitGovCommandIntent,
            ),
          };
        }
      }

      if (!isWriteToolCall(event)) return;

      const isOpenClawSystemChannel =
        shellLike && isOpenClawHostMaintenanceCommand(shellCommand);
      const runtimePolicyDenied =
        shellLike && isRuntimePolicyDeniedCommand(shellCommand, runtimeGatePolicy);
      if (runtimePolicyDenied && isOpenClawSystemChannel) {
        api.logger.warn(
          `[governance-gate] runtimeGatePolicy deny matched but ignored for openclaw system channel command: ${shellCommand}`,
        );
      }
      if (runtimePolicyDenied && !isOpenClawSystemChannel) {
        state.blockedWrites += 1;
        state.lastWriteTool = event.toolName;
        state.updatedAt = now;
        states.set(sessionKey, state);
        return {
          block: true,
          blockReason: runtimePolicyBlockReason(state.uxLang),
        };
      }
      const canBypassGovEntrypoint =
        state.govEntrypointSeen &&
        now <= state.govBypassUntil &&
        state.govBypassWritesLeft > 0;
      const canBypassGlobalGovEntrypoint =
        now <= globalGovBypassUntil && globalGovBypassWritesLeft > 0;
      const canBypassGovSetupDeploy =
        now <= globalGovSetupFlowUntil &&
        isGovSetupAssetDeployCommand(shellCommand);
      const canBypassGovernanceLifecycleWrite =
        isGovernanceLifecycleWriteToolCall(event);
      const canBypassCron = isCronToolCall(event);
      const canBypassHostMaintenance =
        shellLike &&
        isOpenClawSystemChannel;
      const canBypassRuntimePolicyAllow =
        shellLike &&
        isRuntimePolicyAllowedCommand(shellCommand, runtimeGatePolicy);
      const canBypassAny =
        canBypassGovEntrypoint ||
        canBypassGlobalGovEntrypoint ||
        canBypassGovSetupDeploy ||
        canBypassGovernanceLifecycleWrite ||
        canBypassCron ||
        canBypassHostMaintenance ||
        canBypassRuntimePolicyAllow;

      if (isBrainAuditRequirementActive(state, now) && !canBypassAny) {
        state.blockedWrites += 1;
        state.lastWriteTool = event.toolName;
        state.updatedAt = now;
        states.set(sessionKey, state);
        return {
          block: true,
          blockReason: brainAuditBlockReason(state, state.uxLang),
        };
      }

      const compliant = state.planSeen && state.readSeen;
      if (!compliant) {
        if (canBypassGovEntrypoint) {
          state.govBypassWritesLeft -= 1;
          state.writeSeen = true;
          state.lastWriteTool = event.toolName;
          state.updatedAt = now;
          states.set(sessionKey, state);
          return;
        }
        if (
          canBypassGlobalGovEntrypoint ||
          canBypassGovSetupDeploy ||
          canBypassGovernanceLifecycleWrite ||
          canBypassCron ||
          canBypassHostMaintenance ||
          canBypassRuntimePolicyAllow
        ) {
          if (canBypassGlobalGovEntrypoint && globalGovBypassWritesLeft > 0) {
            globalGovBypassWritesLeft -= 1;
          }
          state.writeSeen = true;
          state.lastWriteTool = event.toolName;
          state.updatedAt = now;
          states.set(sessionKey, state);
          return;
        }

        state.blockedWrites += 1;
        state.lastWriteTool = event.toolName;
        state.updatedAt = now;
        states.set(sessionKey, state);
        return {
          block: true,
          blockReason: governanceBlockReason(state, state.uxLang),
        };
      }

      state.writeSeen = true;
      state.lastWriteTool = event.toolName;
      state.updatedAt = now;
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
      state.govCommandIntentUntil = 0;
      if (Date.now() > globalGovBypassUntil) {
        globalGovBypassWritesLeft = 0;
      }
      if (Date.now() > globalGovSetupFlowUntil) {
        globalGovSetupFlowUntil = 0;
      }
      state.updatedAt = Date.now();
      states.set(sessionKey, state);
    },
    { priority: 50 },
  );
}
