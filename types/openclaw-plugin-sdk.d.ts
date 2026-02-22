declare module "openclaw/plugin-sdk" {
  export type PluginHookAgentContext = {
    sessionKey?: string;
  };

  export type PluginHookToolContext = {
    sessionKey?: string;
  };

  export type PluginHookAgentEndEvent = {
    messages?: unknown;
  };

  export type PluginHookBeforePromptBuildEvent = {
    messages?: unknown;
  };

  export type PluginHookBeforePromptBuildResult = {
    prependContext?: string;
  };

  export type PluginHookBeforeToolCallEvent = {
    toolName?: string;
    params?: Record<string, unknown>;
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
