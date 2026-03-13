declare module "openclaw/plugin-sdk" {
  export type PluginHookAgentContext = {
    sessionKey?: string;
    /** Ephemeral session UUID — regenerated on /new and /reset. */
    sessionId?: string;
    /** What initiated this agent run: "user", "heartbeat", "cron", or "memory". */
    trigger?: string;
    /** Channel identifier (e.g. "telegram", "discord", "whatsapp"). */
    channelId?: string;
  };

  export type PluginHookToolContext = {
    sessionKey?: string;
    /** Ephemeral session UUID — regenerated on /new and /reset. */
    sessionId?: string;
    /** Stable run identifier for this agent invocation. */
    runId?: string;
    /** Provider-specific tool call ID when available. */
    toolCallId?: string;
  };

  export type PluginHookAgentEndEvent = {
    messages?: unknown;
  };

  export type PluginHookBeforePromptBuildEvent = {
    messages?: unknown;
  };

  export type PluginHookBeforePromptBuildResult = {
    prependContext?: string;
    /**
     * Prepended to the agent system prompt (provider-cacheable).
     * Use for static plugin guidance — lower per-turn token cost than prependContext.
     */
    prependSystemContext?: string;
    /**
     * Appended to the agent system prompt (provider-cacheable).
     */
    appendSystemContext?: string;
  };

  export type PluginHookBeforeToolCallEvent = {
    toolName?: string;
    params?: Record<string, unknown>;
    /** Stable run identifier for this agent invocation. */
    runId?: string;
    /** Provider-specific tool call ID when available. */
    toolCallId?: string;
  };

  export type PluginHookBeforeToolCallResult = {
    block?: boolean;
    blockReason?: string;
  };

  export type PluginCommandContext = {
    senderId?: string;
    channel?: string;
    isAuthorizedSender?: boolean;
    args?: string;
    commandBody?: string;
    config?: unknown;
  };

  export type PluginCommandResult = {
    text: string;
  };

  export type PluginCommandDefinition = {
    name: string;
    description?: string;
    acceptsArgs?: boolean;
    requireAuth?: boolean;
    handler: (ctx: PluginCommandContext) => PluginCommandResult | Promise<PluginCommandResult>;
  };

  export type OpenClawPluginApi = {
    pluginConfig?: unknown;
    logger: {
      info: (msg: string) => void;
      warn: (msg: string) => void;
    };
    on: (
      hookName: string,
      handler: (...args: any[]) => any,
      options?: { priority?: number },
    ) => void;
    registerCommand?: (def: PluginCommandDefinition) => void;
  };
}
