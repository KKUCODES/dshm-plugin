import { z } from 'zod';
export declare const providerRouteSchema: z.ZodString;
export declare const providerSettingValues: {
    readonly displayName: z.ZodString;
    readonly defaultContextWindow: z.ZodNumber;
    readonly defaultMaxTokens: z.ZodNumber;
    readonly streamIdleTimeoutMs: z.ZodNumber;
    readonly timeoutMs: z.ZodNumber;
    readonly cacheRetention: z.ZodEnum<{
        none: "none";
        short: "short";
        long: "long";
    }>;
    readonly transport: z.ZodEnum<{
        sse: "sse";
        websocket: "websocket";
        "websocket-cached": "websocket-cached";
        auto: "auto";
    }>;
};
export declare const providerSettingKeySchema: z.ZodEnum<{
    defaultContextWindow: "defaultContextWindow";
    streamIdleTimeoutMs: "streamIdleTimeoutMs";
    timeoutMs: "timeoutMs";
    displayName: "displayName";
    defaultMaxTokens: "defaultMaxTokens";
    cacheRetention: "cacheRetention";
    transport: "transport";
}>;
export declare const providerDirectorySchema: z.ZodObject<{
    providers: z.ZodArray<z.ZodObject<{
        provider: z.ZodString;
        name: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const providerSettingsWriteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.providerSettingsWrite">;
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    edits: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        key: z.ZodEnum<{
            defaultContextWindow: "defaultContextWindow";
            streamIdleTimeoutMs: "streamIdleTimeoutMs";
            timeoutMs: "timeoutMs";
            displayName: "displayName";
            defaultMaxTokens: "defaultMaxTokens";
            cacheRetention: "cacheRetention";
            transport: "transport";
        }>;
        value: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
        key: z.ZodEnum<{
            defaultContextWindow: "defaultContextWindow";
            streamIdleTimeoutMs: "streamIdleTimeoutMs";
            timeoutMs: "timeoutMs";
            displayName: "displayName";
            defaultMaxTokens: "defaultMaxTokens";
            cacheRetention: "cacheRetention";
            transport: "transport";
        }>;
    }, z.core.$strict>], "op">>;
    compat: z.ZodOptional<z.ZodObject<{
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
    }, z.core.$strict>>;
    protocolChange: z.ZodOptional<z.ZodObject<{
        value: z.ZodString;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type ProviderSettingsWrite = z.infer<typeof providerSettingsWriteSchema>;
export declare const providerKeySetupSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.providerKeySetup">;
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>;
export type ProviderKeySetup = z.infer<typeof providerKeySetupSchema>;
export declare const providerSettingsViewSchema: z.ZodObject<{
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
    keySetupAvailable: z.ZodOptional<z.ZodBoolean>;
    protocol: z.ZodOptional<z.ZodObject<{
        value: z.ZodOptional<z.ZodString>;
        choices: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
    compat: z.ZodOptional<z.ZodObject<{
        effective: z.ZodObject<{
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
        overrides: z.ZodObject<{
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
    }, z.core.$strict>>;
    fields: z.ZodArray<z.ZodObject<{
        key: z.ZodEnum<{
            defaultContextWindow: "defaultContextWindow";
            streamIdleTimeoutMs: "streamIdleTimeoutMs";
            timeoutMs: "timeoutMs";
            displayName: "displayName";
            defaultMaxTokens: "defaultMaxTokens";
            cacheRetention: "cacheRetention";
            transport: "transport";
        }>;
        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        overridden: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>;
