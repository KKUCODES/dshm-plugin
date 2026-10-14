import { z } from 'zod';
export declare const computerSettingValues: {
    readonly thinking: z.ZodEnum<{
        enabled: "enabled";
        disabled: "disabled";
    }>;
    readonly reasoningEffort: z.ZodEnum<{
        off: "off";
        low: "low";
        high: "high";
        max: "max";
    }>;
    readonly maxTokens: z.ZodNumber;
    readonly defaultContextWindow: z.ZodNumber;
    readonly streamIdleTimeoutMs: z.ZodNumber;
};
export declare const pluginSettingValues: {
    readonly shell: {
        readonly timeoutMs: z.ZodNumber;
        readonly maxOutputBytes: z.ZodNumber;
    };
    readonly 'agent-loop': {
        readonly maxParallelToolCalls: z.ZodNumber;
    };
    readonly subagent: {
        readonly maxDepth: z.ZodNumber;
        readonly maxActiveSubagents: z.ZodNumber;
    };
    readonly 'subagent-model-selection': {
        readonly enabled: z.ZodBoolean;
        readonly allowedModels: z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, z.core.$strict>>;
    };
    readonly 'web-search-deepseek': {
        readonly maxUses: z.ZodNumber;
    };
    readonly 'agent-preset-registry': {
        readonly selectedDefault: z.ZodString;
    };
    readonly 'ui-settings': {
        readonly enabled: z.ZodBoolean;
    };
};
export declare const pluginSettingsNamespaceSchema: z.ZodEnum<{
    shell: "shell";
    "agent-loop": "agent-loop";
    subagent: "subagent";
    "subagent-model-selection": "subagent-model-selection";
    "web-search-deepseek": "web-search-deepseek";
    "agent-preset-registry": "agent-preset-registry";
    "ui-settings": "ui-settings";
}>;
export declare const computerSettingKeySchema: z.ZodEnum<{
    thinking: "thinking";
    reasoningEffort: "reasoningEffort";
    maxTokens: "maxTokens";
    defaultContextWindow: "defaultContextWindow";
    streamIdleTimeoutMs: "streamIdleTimeoutMs";
}>;
export declare const computerSettingEditSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strict>], "op">;
export declare const computerSettingsWriteSchema: z.ZodObject<{
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
}, z.core.$strict>;
export type ComputerSettingsWrite = z.infer<typeof computerSettingsWriteSchema>;
export declare const computerSettingsViewSchema: z.ZodObject<{
    snapshot: z.ZodUUID;
    namespace: z.ZodLiteral<"llm-deepseek">;
    documentId: z.ZodOptional<z.ZodString>;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
    fields: z.ZodArray<z.ZodObject<{
        key: z.ZodEnum<{
            thinking: "thinking";
            reasoningEffort: "reasoningEffort";
            maxTokens: "maxTokens";
            defaultContextWindow: "defaultContextWindow";
            streamIdleTimeoutMs: "streamIdleTimeoutMs";
        }>;
        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>;
        overridden: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const pluginSettingsViewSchema: z.ZodObject<{
    snapshot: z.ZodUUID;
    namespace: z.ZodEnum<{
        shell: "shell";
        "agent-loop": "agent-loop";
        subagent: "subagent";
        "subagent-model-selection": "subagent-model-selection";
        "web-search-deepseek": "web-search-deepseek";
        "agent-preset-registry": "agent-preset-registry";
        "ui-settings": "ui-settings";
    }>;
    documentId: z.ZodOptional<z.ZodString>;
    revision: z.ZodNumber;
    writable: z.ZodBoolean;
    applies: z.ZodEnum<{
        live: "live";
        restart: "restart";
    }>;
    fields: z.ZodArray<z.ZodObject<{
        key: z.ZodEnum<{
            enabled: "enabled";
            timeoutMs: "timeoutMs";
            maxOutputBytes: "maxOutputBytes";
            maxParallelToolCalls: "maxParallelToolCalls";
            maxDepth: "maxDepth";
            maxActiveSubagents: "maxActiveSubagents";
            allowedModels: "allowedModels";
            maxUses: "maxUses";
            selectedDefault: "selectedDefault";
        }>;
        value: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, z.core.$strict>>, z.ZodString]>>;
        base: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, z.core.$strict>>, z.ZodString]>>;
        user: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodObject<{
            provider: z.ZodString;
            model: z.ZodString;
        }, z.core.$strict>>, z.ZodString]>>;
        overridden: z.ZodBoolean;
    }, z.core.$strict>>;
}, z.core.$strict>;
