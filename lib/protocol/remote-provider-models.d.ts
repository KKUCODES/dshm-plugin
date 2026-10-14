import { z } from 'zod';
export declare const providerModelRowSchema: z.ZodObject<{
    source: z.ZodOptional<z.ZodUUID>;
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    contextWindow: z.ZodOptional<z.ZodNumber>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    advanced: z.ZodOptional<z.ZodObject<{
        input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            text: "text";
            image: "image";
        }>>>;
        reasoningEfforts: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<false>, z.ZodRecord<z.ZodEnum<{
            off: "off";
            low: "low";
            high: "high";
            max: "max";
            minimal: "minimal";
            medium: "medium";
            xhigh: "xhigh";
        }> & z.core.$partial, z.ZodNullable<z.ZodString>>, z.ZodNull]>>;
    }, z.core.$strict>>;
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
}, z.core.$strict>;
export declare const providerModelsViewSchema: z.ZodObject<{
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    scope: z.ZodOptional<z.ZodLiteral<"overrides">>;
    blockedByModels: z.ZodOptional<z.ZodBoolean>;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
    overridden: z.ZodBoolean;
    advancedEditable: z.ZodOptional<z.ZodBoolean>;
    compatEditable: z.ZodOptional<z.ZodBoolean>;
    rows: z.ZodArray<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        contextWindow: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        source: z.ZodUUID;
        id: z.ZodString;
        advanced: z.ZodOptional<z.ZodObject<{
            input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                text: "text";
                image: "image";
            }>>>;
            reasoningEfforts: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<false>, z.ZodRecord<z.ZodEnum<{
                off: "off";
                low: "low";
                high: "high";
                max: "max";
                minimal: "minimal";
                medium: "medium";
                xhigh: "xhigh";
            }> & z.core.$partial, z.ZodNullable<z.ZodString>>, z.ZodNull]>>;
        }, z.core.$strict>>;
        compat: z.ZodOptional<z.ZodObject<{
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
        }, z.core.$strict>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const providerModelsWriteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.providerModelsWrite">;
    provider: z.ZodString;
    scope: z.ZodOptional<z.ZodLiteral<"overrides">>;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    change: z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        rows: z.ZodArray<z.ZodObject<{
            source: z.ZodOptional<z.ZodUUID>;
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            contextWindow: z.ZodOptional<z.ZodNumber>;
            maxTokens: z.ZodOptional<z.ZodNumber>;
            advanced: z.ZodOptional<z.ZodObject<{
                input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    text: "text";
                    image: "image";
                }>>>;
                reasoningEfforts: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<false>, z.ZodRecord<z.ZodEnum<{
                    off: "off";
                    low: "low";
                    high: "high";
                    max: "max";
                    minimal: "minimal";
                    medium: "medium";
                    xhigh: "xhigh";
                }> & z.core.$partial, z.ZodNullable<z.ZodString>>, z.ZodNull]>>;
            }, z.core.$strict>>;
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
        }, z.core.$strict>>;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
    }, z.core.$strict>], "op">;
}, z.core.$strict>;
export type ProviderModelsWrite = z.infer<typeof providerModelsWriteSchema>;
export declare const deepSeekModelsWriteSchema: z.ZodObject<{
    method: z.ZodLiteral<"remote.deepSeekModelsWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    change: z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"unset">;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"set">;
        rows: z.ZodArray<z.ZodObject<{
            maxTokens: z.ZodOptional<z.ZodNumber>;
            source: z.ZodOptional<z.ZodUUID>;
            contextWindow: z.ZodOptional<z.ZodNumber>;
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            advanced: z.ZodOptional<z.ZodObject<{
                input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                    text: "text";
                    image: "image";
                }>>>;
            }, z.core.$strict>>;
        }, z.core.$strict>>;
    }, z.core.$strict>], "op">;
}, z.core.$strict>;
