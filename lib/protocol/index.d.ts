import { z } from 'zod';
export { remotePresetIdSchema, presetManagementReadSchema, presetCopySchema, presetDeleteSchema, presetManagementViewSchema } from './remote-presets.js';
export type { PresetCopy, PresetDelete } from './remote-presets.js';
export { providerCreationWriteSchema, providerCreationViewSchema } from './remote-provider-creation.js';
export type { ProviderCreationWrite } from './remote-provider-creation.js';
export { providerRemovalReadSchema, providerRemovalWriteSchema, providerRemovalViewSchema } from './remote-provider-removal.js';
export type { ProviderRemovalWrite } from './remote-provider-removal.js';
export { providerModelsDiscoverSchema, providerModelsDiscoveryViewSchema } from './remote-model-discovery.js';
export { modelProbePrepareSchema, modelProbeExecuteSchema, modelProbePreparedSchema, modelProbeResultSchema } from './remote-model-probe.js';
export type { ModelProbePrepare, ModelProbeExecute, ModelProbePrepared } from './remote-model-probe.js';
export { providerModelRowSchema, providerModelsViewSchema, providerModelsWriteSchema, deepSeekModelsWriteSchema } from './remote-provider-models.js';
export type { ProviderModelsWrite } from './remote-provider-models.js';
export { modelCompatBooleans, modelCompatEnums, modelCompatTemplates, modelCompatKeys, modelCompatSchema } from './remote-model-compat.js';
export { providerRouteSchema, providerSettingValues, providerSettingsWriteSchema, providerSettingsViewSchema, providerDirectorySchema, providerKeySetupSchema } from './remote-provider-settings.js';
export { providerCardViewSchema } from './remote-provider-card.js';
export { modelReadinessSchema } from './remote-model-readiness.js';
export type { ProviderKeySetup } from './remote-provider-settings.js';
export type { ProviderSettingsWrite } from './remote-provider-settings.js';
export { computerEndpointUrlSchema, computerEndpointReadSchema, computerEndpointWriteSchema, computerEndpointViewSchema, computerEndpointTargetSchema } from './remote-endpoint.js';
export type { ComputerEndpointWrite } from './remote-endpoint.js';
export { computerKeyWriteSchema, computerKeyViewSchema, computerKeyTargetSchema } from './remote-key.js';
export type { ComputerKeyWrite } from './remote-key.js';
export { computerSettingValues, computerSettingsWriteSchema, computerSettingsViewSchema } from './remote-settings.js';
export { pluginSettingValues, pluginSettingsViewSchema, pluginSettingsNamespaceSchema } from './remote-settings.js';
export type { ComputerSettingsWrite } from './remote-settings.js';
export { remotePermission, remoteEndpoints, remoteRequestAllowed } from './remote-policy.js';
export declare const PROTOCOL_VERSION = 1;
export declare const REMOTE_TRANSPORT_VERSION = 2;
export declare const RESOURCE_CHUNK_BYTES: number;
export declare const RESOURCE_WINDOW = 4;
export declare const MAX_UPLOAD_BYTES: number;
export declare const MAX_FRAME_BYTES: number;
export declare const MAX_OFFICE_PDF_BYTES: number;
export declare const MAX_CHANGES_BYTES: number;
export declare const MAX_SESSION_EXPORT_BYTES: number;
export declare const attachmentRefSchema: z.ZodObject<{
    attachmentId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    bytes: z.ZodNumber;
    mediaType: z.ZodOptional<z.ZodEnum<{
        "image/png": "image/png";
        "image/jpeg": "image/jpeg";
        "image/webp": "image/webp";
        "image/gif": "image/gif";
    }>>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    originalDimensions: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const officeMetadataSchema: z.ZodObject<{
    absolutePath: z.ZodString;
    version: z.ZodString;
    bytes: z.ZodNumber;
    generation: z.ZodString;
    missingFonts: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const attachmentOfficeMetadataSchema: z.ZodObject<{
    bytes: z.ZodNumber;
    generation: z.ZodString;
    missingFonts: z.ZodArray<z.ZodString>;
    attachmentId: z.ZodString;
    name: z.ZodString;
}, z.core.$strict>;
export declare const operationSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    method: z.ZodLiteral<"remote.pluginOperationStart">;
    generation: z.ZodUUID;
    operationId: z.ZodUUID;
    endpoint: z.ZodEnum<{
        "pluginManager/setPluginEnabled": "pluginManager/setPluginEnabled";
        "pluginManager/setBundleEnabled": "pluginManager/setBundleEnabled";
        "pluginManager/installBundle": "pluginManager/installBundle";
        "pluginManager/removeBundle": "pluginManager/removeBundle";
    }>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.pluginOperationRead">;
    generation: z.ZodUUID;
    operationId: z.ZodUUID;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.pluginOperations">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.negotiate">;
    version: z.ZodLiteral<2>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.graph">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.graphFollow">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.subagentStateFollow">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.taskFollow">;
    previewVersion: z.ZodOptional<z.ZodLiteral<1>>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.feedbackFollow">;
    sessionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.desktop">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.desktopApps">;
    sessionId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.desktopAppIcon">;
    sessionId: z.ZodString;
    appId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.prepareDesktopApp">;
    sessionId: z.ZodString;
    appId: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.openDesktopApp">;
    sessionId: z.ZodString;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.openFile">;
    source: z.ZodEnum<{
        presented: "presented";
        changes: "changes";
    }>;
    sessionId: z.ZodString;
    seq: z.ZodNumber;
    index: z.ZodNumber;
    confirmed: z.ZodLiteral<true>;
    action: z.ZodOptional<z.ZodEnum<{
        open: "open";
        reveal: "reveal";
    }>>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.prepareDesktopFile">;
    sessionId: z.ZodString;
    path: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.openDesktopFile">;
    sessionId: z.ZodString;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.prepareDesktopAttachment">;
    sessionId: z.ZodString;
    kind: z.ZodEnum<{
        file: "file";
        image: "image";
    }>;
    attachmentId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.openDesktopAttachment">;
    sessionId: z.ZodString;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.settingsRead">;
    namespace: z.ZodOptional<z.ZodEnum<{
        shell: "shell";
        "agent-loop": "agent-loop";
        subagent: "subagent";
        "subagent-model-selection": "subagent-model-selection";
        "web-search-deepseek": "web-search-deepseek";
        "agent-preset-registry": "agent-preset-registry";
        "ui-settings": "ui-settings";
    }>>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.codingToolsRead">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.presetManagementRead">;
    preset: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.presetCopy">;
    snapshot: z.ZodUUID;
    id: z.ZodString;
    name: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.presetDelete">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.settingsWrite">;
    snapshot: z.ZodUUID;
    namespace: z.ZodOptional<z.ZodEnum<{
        shell: "shell";
        "agent-loop": "agent-loop";
        subagent: "subagent";
        "subagent-model-selection": "subagent-model-selection";
        "web-search-deepseek": "web-search-deepseek";
        "agent-preset-registry": "agent-preset-registry";
        "ui-settings": "ui-settings";
    }>>;
    expectedRevision: z.ZodNumber;
    edits: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        key: z.ZodEnum<{
            enabled: "enabled";
            thinking: "thinking";
            reasoningEffort: "reasoningEffort";
            maxTokens: "maxTokens";
            defaultContextWindow: "defaultContextWindow";
            streamIdleTimeoutMs: "streamIdleTimeoutMs";
            timeoutMs: "timeoutMs";
            maxOutputBytes: "maxOutputBytes";
            maxParallelToolCalls: "maxParallelToolCalls";
            maxDepth: "maxDepth";
            maxActiveSubagents: "maxActiveSubagents";
            allowedModels: "allowedModels";
            maxUses: "maxUses";
            selectedDefault: "selectedDefault";
        }>;
        value: z.ZodUnion<readonly [z.ZodString, z.ZodUnion<readonly [z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, z.core.$strict>>, z.ZodString]>]>;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
        key: z.ZodEnum<{
            enabled: "enabled";
            thinking: "thinking";
            reasoningEffort: "reasoningEffort";
            maxTokens: "maxTokens";
            defaultContextWindow: "defaultContextWindow";
            streamIdleTimeoutMs: "streamIdleTimeoutMs";
            timeoutMs: "timeoutMs";
            maxOutputBytes: "maxOutputBytes";
            maxParallelToolCalls: "maxParallelToolCalls";
            maxDepth: "maxDepth";
            maxActiveSubagents: "maxActiveSubagents";
            allowedModels: "allowedModels";
            maxUses: "maxUses";
            selectedDefault: "selectedDefault";
        }>;
    }, z.core.$strict>], "op">>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerSettingsList">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerCardRead">;
    provider: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.modelReadiness">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerSettingsRead">;
    provider: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerKeySetup">;
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerRemovalRead">;
    provider: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerRemovalWrite">;
    provider: z.ZodString;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerCreationRead">;
}, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
    kind: z.ZodLiteral<"catalog">;
    provider: z.ZodString;
    method: z.ZodLiteral<"remote.providerCreationWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    useKey: z.ZodBoolean;
    name: z.ZodString;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    kind: z.ZodLiteral<"custom">;
    provider: z.ZodString;
    api: z.ZodString;
    baseURL: z.ZodString;
    models: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        maxTokens: z.ZodOptional<z.ZodNumber>;
        contextWindow: z.ZodOptional<z.ZodNumber>;
        input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
            text: "text";
            image: "image";
        }>>>;
    }, z.core.$strict>>]>;
    method: z.ZodLiteral<"remote.providerCreationWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    useKey: z.ZodBoolean;
    name: z.ZodString;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>], "kind">, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerModelsRead">;
    provider: z.ZodString;
    scope: z.ZodOptional<z.ZodLiteral<"overrides">>;
}, z.core.$strict>, z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.deepSeekModelsRead">;
}, z.core.$strict>, z.ZodObject<{
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
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.providerModelsDiscover">;
    provider: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    authentication: z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"none">;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"temporary">;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"stored">;
        provider: z.ZodString;
    }, z.core.$strict>], "mode">;
    baseURL: z.ZodString;
    api: z.ZodEnum<{
        "openai-completions": "openai-completions";
        "openai-responses": "openai-responses";
        "anthropic-messages": "anthropic-messages";
    }>;
    method: z.ZodLiteral<"remote.modelProbePrepare">;
}, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
    mode: z.ZodLiteral<"none">;
    method: z.ZodLiteral<"remote.modelProbeExecute">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    mode: z.ZodLiteral<"stored">;
    method: z.ZodLiteral<"remote.modelProbeExecute">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>, z.ZodObject<{
    mode: z.ZodLiteral<"temporary">;
    apiKey: z.ZodString;
    method: z.ZodLiteral<"remote.modelProbeExecute">;
    snapshot: z.ZodUUID;
    confirmed: z.ZodLiteral<true>;
}, z.core.$strict>], "mode">, z.ZodObject<{
    method: z.ZodLiteral<"remote.keyRead">;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.endpointRead">;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.endpointWrite">;
    snapshot: z.ZodUUID;
    expectedRevision: z.ZodNumber;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
    confirmed: z.ZodLiteral<true>;
    change: z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        value: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
    }, z.core.$strict>], "op">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.keyWrite">;
    snapshot: z.ZodUUID;
    target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
        provider: z.ZodString;
    }, z.core.$strict>]>>;
    change: z.ZodDiscriminatedUnion<[z.ZodObject<{
        op: z.ZodLiteral<"set">;
        value: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        op: z.ZodLiteral<"unset">;
    }, z.core.$strict>], "op">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.sessionExport">;
    sessionId: z.ZodString;
    includeDescendants: z.ZodBoolean;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.jobStop">;
    sessionId: z.ZodString;
    jobId: z.ZodString;
    startedAt: z.ZodNumber;
    generation: z.ZodUUID;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.jobOutput">;
    sessionId: z.ZodString;
    jobId: z.ZodString;
    startedAt: z.ZodNumber;
    generation: z.ZodUUID;
    stream: z.ZodEnum<{
        stdout: "stdout";
        stderr: "stderr";
    }>;
    fromByte: z.ZodNumber;
    maxBytes: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.commandOutput">;
    sessionId: z.ZodString;
    rootCallId: z.ZodString;
    callId: z.ZodString;
    rootCallTime: z.ZodNumber;
    generation: z.ZodUUID;
    outputId: z.ZodOptional<z.ZodUUID>;
    stream: z.ZodEnum<{
        stdout: "stdout";
        stderr: "stderr";
    }>;
    fromByte: z.ZodNumber;
    maxBytes: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.changes">;
    sessionId: z.ZodString;
    seq: z.ZodNumber;
    index: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.resource">;
    path: z.ZodString;
    verb: z.ZodEnum<{
        GET: "GET";
        HEAD: "HEAD";
    }>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.upload">;
    sessionId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.prompt">;
    rpcId: z.ZodUUID;
    endpoint: z.ZodOptional<z.ZodEnum<{
        "session/prompt": "session/prompt";
        "subagents/prompt": "subagents/prompt";
    }>>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.attachment">;
    sessionId: z.ZodString;
    kind: z.ZodEnum<{
        file: "file";
        image: "image";
    }>;
    attachmentId: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.office">;
    sessionId: z.ZodString;
    priority: z.ZodOptional<z.ZodEnum<{
        foreground: "foreground";
        background: "background";
    }>>;
    path: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"remote.attachmentOffice">;
    sessionId: z.ZodString;
    attachmentId: z.ZodString;
    priority: z.ZodOptional<z.ZodEnum<{
        foreground: "foreground";
        background: "background";
    }>>;
    name: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodEnum<{
        "remote.rpc": "remote.rpc";
        "remote.stream": "remote.stream";
    }>;
    endpoint: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"session.list">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"session.page">;
    address: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"session">;
        sessionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"subagent">;
        parentSessionId: z.ZodString;
        childSessionId: z.ZodString;
        mode: z.ZodEnum<{
            "one-shot": "one-shot";
            continuable: "continuable";
        }>;
    }, z.core.$strict>], "kind">;
    throughSeq: z.ZodNumber;
    beforeSeq: z.ZodOptional<z.ZodNumber>;
    maxMessages: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"session.follow">;
    address: z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"session">;
        sessionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"subagent">;
        parentSessionId: z.ZodString;
        childSessionId: z.ZodString;
        mode: z.ZodEnum<{
            "one-shot": "one-shot";
            continuable: "continuable";
        }>;
    }, z.core.$strict>], "kind">;
    maxMessages: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"session.control">;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"session.prompt">;
    sessionId: z.ZodString;
    requestId: z.ZodUUID;
    mode: z.ZodEnum<{
        queue: "queue";
        steer: "steer";
    }>;
    text: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    method: z.ZodLiteral<"session.cancel">;
    sessionId: z.ZodString;
}, z.core.$strict>], "method">;
export type Operation = z.infer<typeof operationSchema>;
export declare const clientFrameSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"request">;
    id: z.ZodUUID;
    operation: z.ZodDiscriminatedUnion<[z.ZodObject<{
        method: z.ZodLiteral<"remote.pluginOperationStart">;
        generation: z.ZodUUID;
        operationId: z.ZodUUID;
        endpoint: z.ZodEnum<{
            "pluginManager/setPluginEnabled": "pluginManager/setPluginEnabled";
            "pluginManager/setBundleEnabled": "pluginManager/setBundleEnabled";
            "pluginManager/installBundle": "pluginManager/installBundle";
            "pluginManager/removeBundle": "pluginManager/removeBundle";
        }>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.pluginOperationRead">;
        generation: z.ZodUUID;
        operationId: z.ZodUUID;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.pluginOperations">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.negotiate">;
        version: z.ZodLiteral<2>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.graph">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.graphFollow">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.subagentStateFollow">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.taskFollow">;
        previewVersion: z.ZodOptional<z.ZodLiteral<1>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.feedbackFollow">;
        sessionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.desktop">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.desktopApps">;
        sessionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.desktopAppIcon">;
        sessionId: z.ZodString;
        appId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prepareDesktopApp">;
        sessionId: z.ZodString;
        appId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openDesktopApp">;
        sessionId: z.ZodString;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openFile">;
        source: z.ZodEnum<{
            presented: "presented";
            changes: "changes";
        }>;
        sessionId: z.ZodString;
        seq: z.ZodNumber;
        index: z.ZodNumber;
        confirmed: z.ZodLiteral<true>;
        action: z.ZodOptional<z.ZodEnum<{
            open: "open";
            reveal: "reveal";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prepareDesktopFile">;
        sessionId: z.ZodString;
        path: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openDesktopFile">;
        sessionId: z.ZodString;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prepareDesktopAttachment">;
        sessionId: z.ZodString;
        kind: z.ZodEnum<{
            file: "file";
            image: "image";
        }>;
        attachmentId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openDesktopAttachment">;
        sessionId: z.ZodString;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.settingsRead">;
        namespace: z.ZodOptional<z.ZodEnum<{
            shell: "shell";
            "agent-loop": "agent-loop";
            subagent: "subagent";
            "subagent-model-selection": "subagent-model-selection";
            "web-search-deepseek": "web-search-deepseek";
            "agent-preset-registry": "agent-preset-registry";
            "ui-settings": "ui-settings";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.codingToolsRead">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.presetManagementRead">;
        preset: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.presetCopy">;
        snapshot: z.ZodUUID;
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.presetDelete">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.settingsWrite">;
        snapshot: z.ZodUUID;
        namespace: z.ZodOptional<z.ZodEnum<{
            shell: "shell";
            "agent-loop": "agent-loop";
            subagent: "subagent";
            "subagent-model-selection": "subagent-model-selection";
            "web-search-deepseek": "web-search-deepseek";
            "agent-preset-registry": "agent-preset-registry";
            "ui-settings": "ui-settings";
        }>>;
        expectedRevision: z.ZodNumber;
        edits: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            op: z.ZodLiteral<"set">;
            key: z.ZodEnum<{
                enabled: "enabled";
                thinking: "thinking";
                reasoningEffort: "reasoningEffort";
                maxTokens: "maxTokens";
                defaultContextWindow: "defaultContextWindow";
                streamIdleTimeoutMs: "streamIdleTimeoutMs";
                timeoutMs: "timeoutMs";
                maxOutputBytes: "maxOutputBytes";
                maxParallelToolCalls: "maxParallelToolCalls";
                maxDepth: "maxDepth";
                maxActiveSubagents: "maxActiveSubagents";
                allowedModels: "allowedModels";
                maxUses: "maxUses";
                selectedDefault: "selectedDefault";
            }>;
            value: z.ZodUnion<readonly [z.ZodString, z.ZodUnion<readonly [z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
                provider: z.ZodString;
                model: z.ZodString;
            }, z.core.$strict>>, z.ZodString]>]>;
        }, z.core.$strict>, z.ZodObject<{
            op: z.ZodLiteral<"unset">;
            key: z.ZodEnum<{
                enabled: "enabled";
                thinking: "thinking";
                reasoningEffort: "reasoningEffort";
                maxTokens: "maxTokens";
                defaultContextWindow: "defaultContextWindow";
                streamIdleTimeoutMs: "streamIdleTimeoutMs";
                timeoutMs: "timeoutMs";
                maxOutputBytes: "maxOutputBytes";
                maxParallelToolCalls: "maxParallelToolCalls";
                maxDepth: "maxDepth";
                maxActiveSubagents: "maxActiveSubagents";
                allowedModels: "allowedModels";
                maxUses: "maxUses";
                selectedDefault: "selectedDefault";
            }>;
        }, z.core.$strict>], "op">>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerSettingsList">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerCardRead">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.modelReadiness">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerSettingsRead">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerKeySetup">;
        provider: z.ZodString;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerRemovalRead">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerRemovalWrite">;
        provider: z.ZodString;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerCreationRead">;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"catalog">;
        provider: z.ZodString;
        method: z.ZodLiteral<"remote.providerCreationWrite">;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        useKey: z.ZodBoolean;
        name: z.ZodString;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"custom">;
        provider: z.ZodString;
        api: z.ZodString;
        baseURL: z.ZodString;
        models: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            maxTokens: z.ZodOptional<z.ZodNumber>;
            contextWindow: z.ZodOptional<z.ZodNumber>;
            input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                text: "text";
                image: "image";
            }>>>;
        }, z.core.$strict>>]>;
        method: z.ZodLiteral<"remote.providerCreationWrite">;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        useKey: z.ZodBoolean;
        name: z.ZodString;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>], "kind">, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerModelsRead">;
        provider: z.ZodString;
        scope: z.ZodOptional<z.ZodLiteral<"overrides">>;
    }, z.core.$strict>, z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.deepSeekModelsRead">;
    }, z.core.$strict>, z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerModelsDiscover">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        authentication: z.ZodDiscriminatedUnion<[z.ZodObject<{
            mode: z.ZodLiteral<"none">;
        }, z.core.$strict>, z.ZodObject<{
            mode: z.ZodLiteral<"temporary">;
        }, z.core.$strict>, z.ZodObject<{
            mode: z.ZodLiteral<"stored">;
            provider: z.ZodString;
        }, z.core.$strict>], "mode">;
        baseURL: z.ZodString;
        api: z.ZodEnum<{
            "openai-completions": "openai-completions";
            "openai-responses": "openai-responses";
            "anthropic-messages": "anthropic-messages";
        }>;
        method: z.ZodLiteral<"remote.modelProbePrepare">;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"none">;
        method: z.ZodLiteral<"remote.modelProbeExecute">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"stored">;
        method: z.ZodLiteral<"remote.modelProbeExecute">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"temporary">;
        apiKey: z.ZodString;
        method: z.ZodLiteral<"remote.modelProbeExecute">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>], "mode">, z.ZodObject<{
        method: z.ZodLiteral<"remote.keyRead">;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.endpointRead">;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
        resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.endpointWrite">;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
        resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
        confirmed: z.ZodLiteral<true>;
        change: z.ZodDiscriminatedUnion<[z.ZodObject<{
            op: z.ZodLiteral<"set">;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            op: z.ZodLiteral<"unset">;
        }, z.core.$strict>], "op">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.keyWrite">;
        snapshot: z.ZodUUID;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
        change: z.ZodDiscriminatedUnion<[z.ZodObject<{
            op: z.ZodLiteral<"set">;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            op: z.ZodLiteral<"unset">;
        }, z.core.$strict>], "op">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.sessionExport">;
        sessionId: z.ZodString;
        includeDescendants: z.ZodBoolean;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.jobStop">;
        sessionId: z.ZodString;
        jobId: z.ZodString;
        startedAt: z.ZodNumber;
        generation: z.ZodUUID;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.jobOutput">;
        sessionId: z.ZodString;
        jobId: z.ZodString;
        startedAt: z.ZodNumber;
        generation: z.ZodUUID;
        stream: z.ZodEnum<{
            stdout: "stdout";
            stderr: "stderr";
        }>;
        fromByte: z.ZodNumber;
        maxBytes: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.commandOutput">;
        sessionId: z.ZodString;
        rootCallId: z.ZodString;
        callId: z.ZodString;
        rootCallTime: z.ZodNumber;
        generation: z.ZodUUID;
        outputId: z.ZodOptional<z.ZodUUID>;
        stream: z.ZodEnum<{
            stdout: "stdout";
            stderr: "stderr";
        }>;
        fromByte: z.ZodNumber;
        maxBytes: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.changes">;
        sessionId: z.ZodString;
        seq: z.ZodNumber;
        index: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.resource">;
        path: z.ZodString;
        verb: z.ZodEnum<{
            GET: "GET";
            HEAD: "HEAD";
        }>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.upload">;
        sessionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prompt">;
        rpcId: z.ZodUUID;
        endpoint: z.ZodOptional<z.ZodEnum<{
            "session/prompt": "session/prompt";
            "subagents/prompt": "subagents/prompt";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.attachment">;
        sessionId: z.ZodString;
        kind: z.ZodEnum<{
            file: "file";
            image: "image";
        }>;
        attachmentId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.office">;
        sessionId: z.ZodString;
        priority: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            background: "background";
        }>>;
        path: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.attachmentOffice">;
        sessionId: z.ZodString;
        attachmentId: z.ZodString;
        priority: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            background: "background";
        }>>;
        name: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodEnum<{
            "remote.rpc": "remote.rpc";
            "remote.stream": "remote.stream";
        }>;
        endpoint: z.ZodString;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.list">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.page">;
        address: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"session">;
            sessionId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"subagent">;
            parentSessionId: z.ZodString;
            childSessionId: z.ZodString;
            mode: z.ZodEnum<{
                "one-shot": "one-shot";
                continuable: "continuable";
            }>;
        }, z.core.$strict>], "kind">;
        throughSeq: z.ZodNumber;
        beforeSeq: z.ZodOptional<z.ZodNumber>;
        maxMessages: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.follow">;
        address: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"session">;
            sessionId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"subagent">;
            parentSessionId: z.ZodString;
            childSessionId: z.ZodString;
            mode: z.ZodEnum<{
                "one-shot": "one-shot";
                continuable: "continuable";
            }>;
        }, z.core.$strict>], "kind">;
        maxMessages: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.control">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.prompt">;
        sessionId: z.ZodString;
        requestId: z.ZodUUID;
        mode: z.ZodEnum<{
            queue: "queue";
            steer: "steer";
        }>;
        text: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.cancel">;
        sessionId: z.ZodString;
    }, z.core.$strict>], "method">;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"cancel">;
    id: z.ZodUUID;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ack">;
    id: z.ZodUUID;
    count: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"uploadChunk">;
    id: z.ZodUUID;
    data: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"uploadEnd">;
    id: z.ZodUUID;
}, z.core.$strict>], "type">;
export type ClientFrame = z.infer<typeof clientFrameSchema>;
export declare const remoteContextSchema: z.ZodObject<{
    deviceId: z.ZodUUID;
    hostId: z.ZodUUID;
    connectionId: z.ZodUUID;
    management: z.ZodBoolean;
}, z.core.$strict>;
export type RemoteContext = z.infer<typeof remoteContextSchema>;
export declare const routedFrameSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"request">;
    id: z.ZodUUID;
    operation: z.ZodDiscriminatedUnion<[z.ZodObject<{
        method: z.ZodLiteral<"remote.pluginOperationStart">;
        generation: z.ZodUUID;
        operationId: z.ZodUUID;
        endpoint: z.ZodEnum<{
            "pluginManager/setPluginEnabled": "pluginManager/setPluginEnabled";
            "pluginManager/setBundleEnabled": "pluginManager/setBundleEnabled";
            "pluginManager/installBundle": "pluginManager/installBundle";
            "pluginManager/removeBundle": "pluginManager/removeBundle";
        }>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.pluginOperationRead">;
        generation: z.ZodUUID;
        operationId: z.ZodUUID;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.pluginOperations">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.negotiate">;
        version: z.ZodLiteral<2>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.graph">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.graphFollow">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.subagentStateFollow">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.taskFollow">;
        previewVersion: z.ZodOptional<z.ZodLiteral<1>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.feedbackFollow">;
        sessionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.desktop">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.desktopApps">;
        sessionId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.desktopAppIcon">;
        sessionId: z.ZodString;
        appId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prepareDesktopApp">;
        sessionId: z.ZodString;
        appId: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openDesktopApp">;
        sessionId: z.ZodString;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openFile">;
        source: z.ZodEnum<{
            presented: "presented";
            changes: "changes";
        }>;
        sessionId: z.ZodString;
        seq: z.ZodNumber;
        index: z.ZodNumber;
        confirmed: z.ZodLiteral<true>;
        action: z.ZodOptional<z.ZodEnum<{
            open: "open";
            reveal: "reveal";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prepareDesktopFile">;
        sessionId: z.ZodString;
        path: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openDesktopFile">;
        sessionId: z.ZodString;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prepareDesktopAttachment">;
        sessionId: z.ZodString;
        kind: z.ZodEnum<{
            file: "file";
            image: "image";
        }>;
        attachmentId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.openDesktopAttachment">;
        sessionId: z.ZodString;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.settingsRead">;
        namespace: z.ZodOptional<z.ZodEnum<{
            shell: "shell";
            "agent-loop": "agent-loop";
            subagent: "subagent";
            "subagent-model-selection": "subagent-model-selection";
            "web-search-deepseek": "web-search-deepseek";
            "agent-preset-registry": "agent-preset-registry";
            "ui-settings": "ui-settings";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.codingToolsRead">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.presetManagementRead">;
        preset: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.presetCopy">;
        snapshot: z.ZodUUID;
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.presetDelete">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.settingsWrite">;
        snapshot: z.ZodUUID;
        namespace: z.ZodOptional<z.ZodEnum<{
            shell: "shell";
            "agent-loop": "agent-loop";
            subagent: "subagent";
            "subagent-model-selection": "subagent-model-selection";
            "web-search-deepseek": "web-search-deepseek";
            "agent-preset-registry": "agent-preset-registry";
            "ui-settings": "ui-settings";
        }>>;
        expectedRevision: z.ZodNumber;
        edits: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            op: z.ZodLiteral<"set">;
            key: z.ZodEnum<{
                enabled: "enabled";
                thinking: "thinking";
                reasoningEffort: "reasoningEffort";
                maxTokens: "maxTokens";
                defaultContextWindow: "defaultContextWindow";
                streamIdleTimeoutMs: "streamIdleTimeoutMs";
                timeoutMs: "timeoutMs";
                maxOutputBytes: "maxOutputBytes";
                maxParallelToolCalls: "maxParallelToolCalls";
                maxDepth: "maxDepth";
                maxActiveSubagents: "maxActiveSubagents";
                allowedModels: "allowedModels";
                maxUses: "maxUses";
                selectedDefault: "selectedDefault";
            }>;
            value: z.ZodUnion<readonly [z.ZodString, z.ZodUnion<readonly [z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
                provider: z.ZodString;
                model: z.ZodString;
            }, z.core.$strict>>, z.ZodString]>]>;
        }, z.core.$strict>, z.ZodObject<{
            op: z.ZodLiteral<"unset">;
            key: z.ZodEnum<{
                enabled: "enabled";
                thinking: "thinking";
                reasoningEffort: "reasoningEffort";
                maxTokens: "maxTokens";
                defaultContextWindow: "defaultContextWindow";
                streamIdleTimeoutMs: "streamIdleTimeoutMs";
                timeoutMs: "timeoutMs";
                maxOutputBytes: "maxOutputBytes";
                maxParallelToolCalls: "maxParallelToolCalls";
                maxDepth: "maxDepth";
                maxActiveSubagents: "maxActiveSubagents";
                allowedModels: "allowedModels";
                maxUses: "maxUses";
                selectedDefault: "selectedDefault";
            }>;
        }, z.core.$strict>], "op">>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerSettingsList">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerCardRead">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.modelReadiness">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerSettingsRead">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerKeySetup">;
        provider: z.ZodString;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerRemovalRead">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerRemovalWrite">;
        provider: z.ZodString;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerCreationRead">;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        kind: z.ZodLiteral<"catalog">;
        provider: z.ZodString;
        method: z.ZodLiteral<"remote.providerCreationWrite">;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        useKey: z.ZodBoolean;
        name: z.ZodString;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        kind: z.ZodLiteral<"custom">;
        provider: z.ZodString;
        api: z.ZodString;
        baseURL: z.ZodString;
        models: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodOptional<z.ZodString>;
            maxTokens: z.ZodOptional<z.ZodNumber>;
            contextWindow: z.ZodOptional<z.ZodNumber>;
            input: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                text: "text";
                image: "image";
            }>>>;
        }, z.core.$strict>>]>;
        method: z.ZodLiteral<"remote.providerCreationWrite">;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        useKey: z.ZodBoolean;
        name: z.ZodString;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>], "kind">, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerModelsRead">;
        provider: z.ZodString;
        scope: z.ZodOptional<z.ZodLiteral<"overrides">>;
    }, z.core.$strict>, z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.deepSeekModelsRead">;
    }, z.core.$strict>, z.ZodObject<{
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
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.providerModelsDiscover">;
        provider: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        authentication: z.ZodDiscriminatedUnion<[z.ZodObject<{
            mode: z.ZodLiteral<"none">;
        }, z.core.$strict>, z.ZodObject<{
            mode: z.ZodLiteral<"temporary">;
        }, z.core.$strict>, z.ZodObject<{
            mode: z.ZodLiteral<"stored">;
            provider: z.ZodString;
        }, z.core.$strict>], "mode">;
        baseURL: z.ZodString;
        api: z.ZodEnum<{
            "openai-completions": "openai-completions";
            "openai-responses": "openai-responses";
            "anthropic-messages": "anthropic-messages";
        }>;
        method: z.ZodLiteral<"remote.modelProbePrepare">;
    }, z.core.$strict>, z.ZodDiscriminatedUnion<[z.ZodObject<{
        mode: z.ZodLiteral<"none">;
        method: z.ZodLiteral<"remote.modelProbeExecute">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"stored">;
        method: z.ZodLiteral<"remote.modelProbeExecute">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>, z.ZodObject<{
        mode: z.ZodLiteral<"temporary">;
        apiKey: z.ZodString;
        method: z.ZodLiteral<"remote.modelProbeExecute">;
        snapshot: z.ZodUUID;
        confirmed: z.ZodLiteral<true>;
    }, z.core.$strict>], "mode">, z.ZodObject<{
        method: z.ZodLiteral<"remote.keyRead">;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.endpointRead">;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
        resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.endpointWrite">;
        snapshot: z.ZodUUID;
        expectedRevision: z.ZodNumber;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
        resetPolicy: z.ZodOptional<z.ZodLiteral<true>>;
        confirmed: z.ZodLiteral<true>;
        change: z.ZodDiscriminatedUnion<[z.ZodObject<{
            op: z.ZodLiteral<"set">;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            op: z.ZodLiteral<"unset">;
        }, z.core.$strict>], "op">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.keyWrite">;
        snapshot: z.ZodUUID;
        target: z.ZodOptional<z.ZodUnion<readonly [z.ZodLiteral<"web-search-deepseek">, z.ZodObject<{
            provider: z.ZodString;
        }, z.core.$strict>]>>;
        change: z.ZodDiscriminatedUnion<[z.ZodObject<{
            op: z.ZodLiteral<"set">;
            value: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            op: z.ZodLiteral<"unset">;
        }, z.core.$strict>], "op">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.sessionExport">;
        sessionId: z.ZodString;
        includeDescendants: z.ZodBoolean;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.jobStop">;
        sessionId: z.ZodString;
        jobId: z.ZodString;
        startedAt: z.ZodNumber;
        generation: z.ZodUUID;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.jobOutput">;
        sessionId: z.ZodString;
        jobId: z.ZodString;
        startedAt: z.ZodNumber;
        generation: z.ZodUUID;
        stream: z.ZodEnum<{
            stdout: "stdout";
            stderr: "stderr";
        }>;
        fromByte: z.ZodNumber;
        maxBytes: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.commandOutput">;
        sessionId: z.ZodString;
        rootCallId: z.ZodString;
        callId: z.ZodString;
        rootCallTime: z.ZodNumber;
        generation: z.ZodUUID;
        outputId: z.ZodOptional<z.ZodUUID>;
        stream: z.ZodEnum<{
            stdout: "stdout";
            stderr: "stderr";
        }>;
        fromByte: z.ZodNumber;
        maxBytes: z.ZodNumber;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.changes">;
        sessionId: z.ZodString;
        seq: z.ZodNumber;
        index: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.resource">;
        path: z.ZodString;
        verb: z.ZodEnum<{
            GET: "GET";
            HEAD: "HEAD";
        }>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.upload">;
        sessionId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.prompt">;
        rpcId: z.ZodUUID;
        endpoint: z.ZodOptional<z.ZodEnum<{
            "session/prompt": "session/prompt";
            "subagents/prompt": "subagents/prompt";
        }>>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.attachment">;
        sessionId: z.ZodString;
        kind: z.ZodEnum<{
            file: "file";
            image: "image";
        }>;
        attachmentId: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.office">;
        sessionId: z.ZodString;
        priority: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            background: "background";
        }>>;
        path: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"remote.attachmentOffice">;
        sessionId: z.ZodString;
        attachmentId: z.ZodString;
        priority: z.ZodOptional<z.ZodEnum<{
            foreground: "foreground";
            background: "background";
        }>>;
        name: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodEnum<{
            "remote.rpc": "remote.rpc";
            "remote.stream": "remote.stream";
        }>;
        endpoint: z.ZodString;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.list">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.page">;
        address: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"session">;
            sessionId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"subagent">;
            parentSessionId: z.ZodString;
            childSessionId: z.ZodString;
            mode: z.ZodEnum<{
                "one-shot": "one-shot";
                continuable: "continuable";
            }>;
        }, z.core.$strict>], "kind">;
        throughSeq: z.ZodNumber;
        beforeSeq: z.ZodOptional<z.ZodNumber>;
        maxMessages: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.follow">;
        address: z.ZodDiscriminatedUnion<[z.ZodObject<{
            kind: z.ZodLiteral<"session">;
            sessionId: z.ZodString;
        }, z.core.$strict>, z.ZodObject<{
            kind: z.ZodLiteral<"subagent">;
            parentSessionId: z.ZodString;
            childSessionId: z.ZodString;
            mode: z.ZodEnum<{
                "one-shot": "one-shot";
                continuable: "continuable";
            }>;
        }, z.core.$strict>], "kind">;
        maxMessages: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.control">;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.prompt">;
        sessionId: z.ZodString;
        requestId: z.ZodUUID;
        mode: z.ZodEnum<{
            queue: "queue";
            steer: "steer";
        }>;
        text: z.ZodString;
    }, z.core.$strict>, z.ZodObject<{
        method: z.ZodLiteral<"session.cancel">;
        sessionId: z.ZodString;
    }, z.core.$strict>], "method">;
    context: z.ZodOptional<z.ZodObject<{
        deviceId: z.ZodUUID;
        hostId: z.ZodUUID;
        connectionId: z.ZodUUID;
        management: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"cancel">;
    id: z.ZodUUID;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"ack">;
    id: z.ZodUUID;
    count: z.ZodNumber;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"uploadChunk">;
    id: z.ZodUUID;
    data: z.ZodString;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"uploadEnd">;
    id: z.ZodUUID;
}, z.core.$strict>], "type">;
export declare const hostFrameSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"result">;
    id: z.ZodUUID;
    value: z.ZodUnknown;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"event">;
    id: z.ZodUUID;
    value: z.ZodUnknown;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"end">;
    id: z.ZodUUID;
}, z.core.$strict>, z.ZodObject<{
    type: z.ZodLiteral<"error">;
    id: z.ZodUUID;
    code: z.ZodString;
}, z.core.$strict>], "type">;
export type HostFrame = z.infer<typeof hostFrameSchema>;
export declare const isStream: (operation: Operation) => boolean;
export declare const tokenSchema: z.ZodString;
export declare const labelSchema: z.ZodString;
