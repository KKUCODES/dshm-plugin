import { z } from 'zod';
export declare const modelCompatBooleans: readonly ["supportsStore", "supportsDeveloperRole", "supportsReasoningEffort", "supportsUsageInStreaming", "supportsFinishReason", "requiresToolResultName", "requiresAssistantAfterToolResult", "requiresThinkingAsText", "requiresReasoningContentOnAssistantMessages", "supportsThinkingTokenBudget", "supportsMaxOutputTokens", "supportsStrictMode", "supportsLongCacheRetention", "supportsEagerToolInputStreaming", "supportsCacheControlOnTools", "supportsTemperature", "forceAdaptiveThinking", "allowEmptySignature", "supportsStrictTools"];
export declare const modelCompatEnums: {
    readonly maxTokensField: readonly ["max_completion_tokens", "max_tokens"];
    readonly thinkingFormat: readonly ["openai", "deepseek", "openrouter", "together", "baseten", "zai", "qwen", "chat-template", "qwen-chat-template", "string-thinking", "ant-ling"];
    readonly thinkingTokenBudgetField: readonly ["thinking_token_budget", "thinking_budget", "thinking_budget_tokens"];
    readonly cacheControlFormat: readonly ["anthropic"];
};
export declare const modelCompatTemplates: readonly ["chatTemplateKwargs", "chatTemplateArgs"];
export declare const modelCompatKeys: string[];
export declare const modelCompatSchema: z.ZodObject<{
    maxTokensField: z.ZodOptional<z.ZodEnum<{
        max_completion_tokens: "max_completion_tokens";
        max_tokens: "max_tokens";
    }>>;
    thinkingFormat: z.ZodOptional<z.ZodEnum<{
        openai: "openai";
        deepseek: "deepseek";
        openrouter: "openrouter";
        together: "together";
        baseten: "baseten";
        zai: "zai";
        qwen: "qwen";
        "chat-template": "chat-template";
        "qwen-chat-template": "qwen-chat-template";
        "string-thinking": "string-thinking";
        "ant-ling": "ant-ling";
    }>>;
    thinkingTokenBudgetField: z.ZodOptional<z.ZodEnum<{
        thinking_token_budget: "thinking_token_budget";
        thinking_budget: "thinking_budget";
        thinking_budget_tokens: "thinking_budget_tokens";
    }>>;
    cacheControlFormat: z.ZodOptional<z.ZodEnum<{
        anthropic: "anthropic";
    }>>;
    vllmPriority: z.ZodOptional<z.ZodNumber>;
    chatTemplateKwargs: z.ZodOptional<z.ZodPipe<z.ZodUnknown, z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        $var: z.ZodEnum<{
            "thinking.enabled": "thinking.enabled";
            "thinking.effort": "thinking.effort";
            "thinking.budget": "thinking.budget";
        }>;
        omitWhenOff: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>]>>>>;
    chatTemplateArgs: z.ZodOptional<z.ZodPipe<z.ZodUnknown, z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        $var: z.ZodEnum<{
            "thinking.enabled": "thinking.enabled";
            "thinking.effort": "thinking.effort";
            "thinking.budget": "thinking.budget";
        }>;
        omitWhenOff: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>]>>>>;
    supportsStore: z.ZodOptional<z.ZodBoolean>;
    supportsDeveloperRole: z.ZodOptional<z.ZodBoolean>;
    supportsReasoningEffort: z.ZodOptional<z.ZodBoolean>;
    supportsUsageInStreaming: z.ZodOptional<z.ZodBoolean>;
    supportsFinishReason: z.ZodOptional<z.ZodBoolean>;
    requiresToolResultName: z.ZodOptional<z.ZodBoolean>;
    requiresAssistantAfterToolResult: z.ZodOptional<z.ZodBoolean>;
    requiresThinkingAsText: z.ZodOptional<z.ZodBoolean>;
    requiresReasoningContentOnAssistantMessages: z.ZodOptional<z.ZodBoolean>;
    supportsThinkingTokenBudget: z.ZodOptional<z.ZodBoolean>;
    supportsMaxOutputTokens: z.ZodOptional<z.ZodBoolean>;
    supportsStrictMode: z.ZodOptional<z.ZodBoolean>;
    supportsLongCacheRetention: z.ZodOptional<z.ZodBoolean>;
    supportsEagerToolInputStreaming: z.ZodOptional<z.ZodBoolean>;
    supportsCacheControlOnTools: z.ZodOptional<z.ZodBoolean>;
    supportsTemperature: z.ZodOptional<z.ZodBoolean>;
    forceAdaptiveThinking: z.ZodOptional<z.ZodBoolean>;
    allowEmptySignature: z.ZodOptional<z.ZodBoolean>;
    supportsStrictTools: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export declare const modelCompatViewSchema: z.ZodObject<{
    [x: string]: z.ZodNullable<z.ZodOptional<z.ZodBoolean>> | z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        max_completion_tokens: "max_completion_tokens";
        max_tokens: "max_tokens";
    }>>> | z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        openai: "openai";
        deepseek: "deepseek";
        openrouter: "openrouter";
        together: "together";
        baseten: "baseten";
        zai: "zai";
        qwen: "qwen";
        "chat-template": "chat-template";
        "qwen-chat-template": "qwen-chat-template";
        "string-thinking": "string-thinking";
        "ant-ling": "ant-ling";
    }>>> | z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        thinking_token_budget: "thinking_token_budget";
        thinking_budget: "thinking_budget";
        thinking_budget_tokens: "thinking_budget_tokens";
    }>>> | z.ZodNullable<z.ZodOptional<z.ZodEnum<{
        anthropic: "anthropic";
    }>>> | z.ZodNullable<z.ZodOptional<z.ZodNumber>> | z.ZodNullable<z.ZodOptional<z.ZodPipe<z.ZodUnknown, z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        $var: z.ZodEnum<{
            "thinking.enabled": "thinking.enabled";
            "thinking.effort": "thinking.effort";
            "thinking.budget": "thinking.budget";
        }>;
        omitWhenOff: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>]>>>>>;
}, z.core.$strict>;
