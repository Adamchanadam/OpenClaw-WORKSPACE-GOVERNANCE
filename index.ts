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
  createdAt: number;
  planSeen: boolean;
  readSeen: boolean;
  govEntrypointSeen: boolean;
  govBypassUntil: number;
  govBypassWritesLeft: number;
  brainAuditRequiredUntil: number;
  brainAuditRequiredReason?: string;
  brainAuditPreviewSeenAt: number;
  brainAuditNudgedAt: number;
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
const GOV_SETUP_FLOW_WINDOW_MS = 12 * 60 * 1000;
const BRAIN_AUDIT_STARTUP_WINDOW_MS = 20 * 60 * 1000;
const BRAIN_AUDIT_REQUIRE_WINDOW_MS = 30 * 60 * 1000;
const BRAIN_AUDIT_NUDGE_COOLDOWN_MS = 5 * 60 * 1000;
const BRAIN_AUDIT_BLOCK_THRESHOLD = 3;
const PRUNE_INTERVAL_MS = 60 * 1000;
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
  /(?:\b(?:upgrade|update|sync|refresh|redeploy|re-deploy)\b.*\b(?:governance|gov_setup|prompts\/governance|governance\s+files?|governance\s+prompts?)\b)|(?:(?:升級|更新|同步|重新部署).*(?:治理文件|治理|governance|prompts\/governance))/i;

function classifyGovCommandRequest(
  command: string,
  modeArg: string,
): "none" | "read" | "write" {
  const cmd = command.toLowerCase();
  const mode = modeArg.toLowerCase();

  if (cmd === "gov_setup") {
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
    govEntrypointSeen: false,
    govBypassUntil: 0,
    govBypassWritesLeft: 0,
    brainAuditRequiredUntil: now + BRAIN_AUDIT_STARTUP_WINDOW_MS,
    brainAuditRequiredReason: "session start",
    brainAuditPreviewSeenAt: 0,
    brainAuditNudgedAt: 0,
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

function inferWriteIntent(prompt: string): boolean {
  return WRITE_INTENT_HINT.test(prompt) || detectGovRequestKind(prompt) === "write";
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

function isGovSetupAssetDeployCommand(command: string): boolean {
  const text = command.trim().toLowerCase();
  if (!text) return false;

  const hasGovPromptsTarget = text.includes("prompts/governance");
  if (!hasGovPromptsTarget) return false;

  const hasPluginSource = text.includes("openclaw-workspace-governance");
  const hasBackupPath = text.includes("_gov_setup_backup_");
  const hasCopyAction =
    /(^|[\s;|&])(cp|copy|xcopy|robocopy|rsync|copy-item|install)\b/i.test(text) ||
    text.includes("manual_prompt");
  const hasMkdirAction = /(^|[\s;|&])(mkdir|md|new-item)\b/i.test(text);

  if (hasBackupPath && (hasCopyAction || hasMkdirAction)) return true;
  if (hasPluginSource && (hasCopyAction || hasMkdirAction)) return true;
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
    "If this is a platform control-plane change, use gov_openclaw_json.",
    "If this is Brain Docs hardening, start with /gov_brain_audit and continue with /gov_brain_audit APPROVE: ... only after preview.",
  ].join(" ");
}

function brainAuditBlockReason(state: GateState): string {
  const reason = state.brainAuditRequiredReason
    ? ` Trigger: ${state.brainAuditRequiredReason}.`
    : "";
  return [
    "WORKSPACE_GOVERNANCE health-check gate activated (this is a safety block, not a system error).",
    "Before write-capable actions, run /gov_brain_audit (read-only preview) first.",
    "Then continue with your write task (or /gov_brain_audit APPROVE: ... if you approve fixes).",
    "Fallback: /skill gov_brain_audit.",
  ].join(" ") + reason;
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
      const latestUserTurn = latestUserTurnText(event.messages);
      const govRequestKindUser = detectGovRequestKind(userText);
      const govRequestKindTail = detectGovRequestKind(tailText);
      const govRequestKind = govRequestKindUser !== "none" ? govRequestKindUser : govRequestKindTail;
      const setupRequestKindUser = detectGovCommandKindByName(latestUserTurn, "gov_setup");
      const setupRequestKindTail = detectGovCommandKindByName(tailText, "gov_setup");
      const setupModeUser = detectGovCommandMode(latestUserTurn, "gov_setup");
      const setupUpgradeIntentUser = isGovSetupUpgradeIntent(latestUserTurn);
      const migrateKindUser = detectGovCommandKindByName(latestUserTurn, "gov_migrate");
      const auditKindUser = detectGovCommandKindByName(latestUserTurn, "gov_audit");
      const brainAuditKindUser = detectGovCommandKindByName(latestUserTurn, "gov_brain_audit");

      const modeCRequired = inferWriteIntent(userText) || govRequestKindTail === "write";
      const explicitGovEntrypoint = govRequestKind === "write" || govRequestKindTail === "write";
      const now = Date.now();

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
      state.updatedAt = now;

      states.set(sessionKey, state);

      const brainAuditRequired = isBrainAuditRequirementActive(state, now);
      if (brainAuditRequired && modeCRequired && !explicitGovEntrypoint && !setupUpgradeIntentUser) {
        return {
          prependContext:
            "Automatic governance health-check is active for this session. " +
            "First action in this turn MUST be /gov_brain_audit (read-only preview). Do not run any write-capable step before it. " +
            "After preview, continue your requested task (or use /gov_brain_audit APPROVE: ... if you approve fixes). " +
            (state.brainAuditRequiredReason
              ? `Trigger: ${state.brainAuditRequiredReason}. `
              : "") +
            "Fallback: /skill gov_brain_audit.",
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
            "Governance health-check suggestion: run /gov_brain_audit first (read-only preview) before high-risk write tasks. " +
            "Then proceed with PLAN/READ/CHANGE/QC/PERSIST.",
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
            "Route platform control-plane changes via /gov_openclaw_json (fallback: /skill gov_openclaw_json).",
          );
        }
        if (isBrainAuditIntent(userText)) {
          routeHints.push(
            "Route Brain Docs risk reviews via /gov_brain_audit (then /gov_brain_audit APPROVE: ... only when approved).",
          );
        }
        const routeHintText = routeHints.length > 0 ? ` ${routeHints.join(" ")}` : "";
        return {
          prependContext:
            "Runtime governance guard preflight: write intent detected. This is a safety check, not a system failure. " +
            "Before any write-capable tool call, complete PLAN GATE and READ GATE evidence first. " +
            "Include WG_PLAN_GATE_OK and WG_READ_GATE_OK in your governance response. " +
            "If this task is read-only diagnostics/testing, keep it read-only and rerun. " +
            "If write intent is uncertain, treat as Mode C (fail-closed)." +
            routeHintText,
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

      const now = Date.now();
      const shellCommand = isShellLikeTool((event.toolName || "").toLowerCase())
        ? flattenText((event.params as Record<string, unknown>)?.command || "")
        : "";
      const canBypassGovEntrypoint =
        state.govEntrypointSeen &&
        now <= state.govBypassUntil &&
        state.govBypassWritesLeft > 0;
      const canBypassGlobalGovEntrypoint =
        now <= globalGovBypassUntil && globalGovBypassWritesLeft > 0;
      const canBypassGovSetupDeploy =
        now <= globalGovSetupFlowUntil &&
        isGovSetupAssetDeployCommand(shellCommand);
      const canBypassAny =
        canBypassGovEntrypoint || canBypassGlobalGovEntrypoint || canBypassGovSetupDeploy;

      if (isBrainAuditRequirementActive(state, now) && !canBypassAny) {
        state.blockedWrites += 1;
        state.lastWriteTool = event.toolName;
        state.updatedAt = now;
        states.set(sessionKey, state);
        return {
          block: true,
          blockReason: brainAuditBlockReason(state),
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
        if (canBypassGlobalGovEntrypoint || canBypassGovSetupDeploy) {
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
          blockReason: governanceBlockReason(state),
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
