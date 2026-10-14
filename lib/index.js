// src/profile-dsh-version.ts
function isProfileDshVersion(version) {
  return version === "0.2.1-alpha.1" || version === "0.2.1-alpha.2";
}

// src/index.ts
import { symbols as symbols16 } from "@deepseek-ai/cordis";
import Schema2 from "@deepseek-ai/schemastery";
import { createRequire } from "node:module";

// src/management.ts
import { randomBytes, randomUUID as randomUUID14 } from "node:crypto";
import { z as z15 } from "zod";
import { credentialKey, credentialRef as credentialRef4 } from "@deepseek-ai/dsh-credentials";

// ../../../../../../backend/packages/protocol/dist/index.js
import { z as z14 } from "zod";

// ../../../../../../backend/packages/protocol/dist/remote-presets.js
import { z } from "zod";
var remotePresetIdSchema = z.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9-]*$/);
var presetManagementReadSchema = z.object({ method: z.literal("remote.presetManagementRead"), preset: remotePresetIdSchema }).strict();
var presetCopySchema = z.object({
  method: z.literal("remote.presetCopy"),
  snapshot: z.uuid(),
  id: remotePresetIdSchema,
  name: z.string().trim().min(1).max(256).regex(/^[^\x00-\x1f\x7f]+$/u)
}).strict();
var presetDeleteSchema = z.object({ method: z.literal("remote.presetDelete"), snapshot: z.uuid(), confirmed: z.literal(true) }).strict();
var presetManagementViewSchema = z.object({
  snapshot: z.uuid(),
  preset: remotePresetIdSchema,
  canCopy: z.boolean(),
  canDelete: z.boolean(),
  defaultAfterDelete: z.string().optional()
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-settings.js
import { z as z2 } from "zod";
var computerSettingValues = {
  thinking: z2.enum(["enabled", "disabled"]),
  reasoningEffort: z2.enum(["off", "low", "high", "max"]),
  maxTokens: z2.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  defaultContextWindow: z2.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  streamIdleTimeoutMs: z2.number().positive().max(2147483647)
};
var modelRoutes = z2.array(z2.object({ provider: z2.string().min(1), model: z2.string().min(1) }).strict()).refine((routes) => new Set(routes.map((route) => `${route.provider}\0${route.model}`)).size === routes.length);
var presetId = z2.string().min(1).max(128).regex(/^[a-z0-9][a-z0-9-]*$/);
var pluginValue = z2.union([z2.number(), z2.boolean(), modelRoutes, presetId]);
var pluginSettingValues = {
  shell: { timeoutMs: z2.number().positive().max(Number.MAX_SAFE_INTEGER), maxOutputBytes: z2.number().positive().max(Number.MAX_SAFE_INTEGER) },
  "agent-loop": { maxParallelToolCalls: z2.number().int().positive().max(Number.MAX_SAFE_INTEGER) },
  subagent: {
    maxDepth: z2.number().int().min(0).max(Number.MAX_SAFE_INTEGER).refine((value) => !Object.is(value, -0)),
    maxActiveSubagents: z2.number().int().positive().max(Number.MAX_SAFE_INTEGER)
  },
  "subagent-model-selection": { enabled: z2.boolean(), allowedModels: modelRoutes },
  "web-search-deepseek": { maxUses: z2.number().int().positive().max(Number.MAX_SAFE_INTEGER) },
  "agent-preset-registry": { selectedDefault: presetId },
  "ui-settings": { enabled: z2.boolean() }
};
var pluginSettingsNamespaceSchema = z2.enum(["shell", "agent-loop", "subagent", "subagent-model-selection", "web-search-deepseek", "agent-preset-registry", "ui-settings"]);
var computerSettingKeySchema = z2.enum(["thinking", "reasoningEffort", "maxTokens", "defaultContextWindow", "streamIdleTimeoutMs"]);
var pluginKey = z2.enum(["timeoutMs", "maxOutputBytes", "maxParallelToolCalls", "maxDepth", "maxActiveSubagents", "enabled", "allowedModels", "maxUses", "selectedDefault"]);
var editableKey = z2.enum([...computerSettingKeySchema.options, ...pluginKey.options]);
var computerSettingEditSchema = z2.discriminatedUnion("op", [
  z2.object({ op: z2.literal("set"), key: editableKey, value: z2.union([z2.string().max(16), pluginValue]) }).strict(),
  z2.object({ op: z2.literal("unset"), key: editableKey }).strict()
]);
var computerSettingsWriteSchema = z2.object({
  method: z2.literal("remote.settingsWrite"),
  snapshot: z2.uuid(),
  namespace: pluginSettingsNamespaceSchema.optional(),
  expectedRevision: z2.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  edits: z2.array(computerSettingEditSchema).min(1).max(5).refine((edits) => new Set(edits.map((edit) => edit.key)).size === edits.length)
}).strict().refine((operation) => {
  const values = operation.namespace ? pluginSettingValues[operation.namespace] : computerSettingValues;
  return operation.edits.every((edit) => Object.hasOwn(values, edit.key) && (edit.op === "unset" || values[edit.key].safeParse(edit.value).success));
});
var computerSettingsViewSchema = z2.object({
  snapshot: z2.uuid(),
  namespace: z2.literal("llm-deepseek"),
  documentId: z2.string().min(1).max(1024).optional(),
  revision: z2.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  writable: z2.boolean(),
  applies: z2.enum(["live", "restart"]),
  fields: z2.array(z2.object({ key: computerSettingKeySchema, value: z2.union([z2.string().max(16), z2.number()]).optional(), overridden: z2.boolean() }).strict().refine((field) => field.value === void 0 || computerSettingValues[field.key].safeParse(field.value).success)).length(5).refine((fields4) => new Set(fields4.map((field) => field.key)).size === 5)
}).strict();
var pluginSettingsViewSchema = z2.object({
  snapshot: z2.uuid(),
  namespace: pluginSettingsNamespaceSchema,
  documentId: z2.string().min(1).max(1024).optional(),
  revision: z2.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  writable: z2.boolean(),
  applies: z2.enum(["live", "restart"]),
  fields: z2.array(z2.object({
    key: pluginKey,
    value: pluginValue.optional(),
    base: pluginValue.optional(),
    user: pluginValue.optional(),
    overridden: z2.boolean()
  }).strict()).min(1).max(2)
}).strict().refine((view) => {
  const values = pluginSettingValues[view.namespace];
  return view.fields.length === Object.keys(values).length && new Set(view.fields.map((field) => field.key)).size === view.fields.length && view.fields.every((field) => Object.hasOwn(values, field.key) && [field.value, field.base, field.user].every((value) => value === void 0 || values[field.key].safeParse(value).success) && field.overridden === (field.user !== void 0));
});

// ../../../../../../backend/packages/protocol/dist/remote-key.js
import { z as z5 } from "zod";

// ../../../../../../backend/packages/protocol/dist/remote-provider-settings.js
import { z as z4 } from "zod";

// ../../../../../../backend/packages/protocol/dist/remote-model-compat.js
import { z as z3 } from "zod";
var modelCompatBooleans = [
  "supportsStore",
  "supportsDeveloperRole",
  "supportsReasoningEffort",
  "supportsUsageInStreaming",
  "supportsFinishReason",
  "requiresToolResultName",
  "requiresAssistantAfterToolResult",
  "requiresThinkingAsText",
  "requiresReasoningContentOnAssistantMessages",
  "supportsThinkingTokenBudget",
  "supportsMaxOutputTokens",
  "supportsStrictMode",
  "supportsLongCacheRetention",
  "supportsEagerToolInputStreaming",
  "supportsCacheControlOnTools",
  "supportsTemperature",
  "forceAdaptiveThinking",
  "allowEmptySignature",
  "supportsStrictTools"
];
var modelCompatEnums = {
  maxTokensField: ["max_completion_tokens", "max_tokens"],
  thinkingFormat: ["openai", "deepseek", "openrouter", "together", "baseten", "zai", "qwen", "chat-template", "qwen-chat-template", "string-thinking", "ant-ling"],
  thinkingTokenBudgetField: ["thinking_token_budget", "thinking_budget", "thinking_budget_tokens"],
  cacheControlFormat: ["anthropic"]
};
var modelCompatTemplates = ["chatTemplateKwargs", "chatTemplateArgs"];
var modelCompatKeys = [...modelCompatBooleans, ...Object.keys(modelCompatEnums), "vllmPriority", ...modelCompatTemplates];
var templateValue = z3.union([
  z3.string().max(4096),
  z3.number().finite(),
  z3.boolean(),
  z3.null(),
  z3.object({ $var: z3.enum(["thinking.enabled", "thinking.effort", "thinking.budget"]), omitWhenOff: z3.boolean().optional() }).strict()
]);
var template = z3.unknown().refine((value) => !value || typeof value !== "object" || !Object.keys(value).some((key) => ["__proto__", "prototype", "constructor"].includes(key))).pipe(z3.record(z3.string().min(1).max(256), templateValue).refine((value) => Object.keys(value).length <= 100));
var booleans = Object.fromEntries(modelCompatBooleans.map((key) => [key, z3.boolean().optional()]));
var fields = {
  ...booleans,
  maxTokensField: z3.enum(modelCompatEnums.maxTokensField).optional(),
  thinkingFormat: z3.enum(modelCompatEnums.thinkingFormat).optional(),
  thinkingTokenBudgetField: z3.enum(modelCompatEnums.thinkingTokenBudgetField).optional(),
  cacheControlFormat: z3.enum(modelCompatEnums.cacheControlFormat).optional(),
  vllmPriority: z3.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER).optional(),
  chatTemplateKwargs: template.optional(),
  chatTemplateArgs: template.optional()
};
var modelCompatSchema = z3.object(fields).strict();
var modelCompatViewSchema = z3.object(Object.fromEntries(Object.entries(fields).map(([key, schema]) => [key, schema.nullable()]))).strict();

// ../../../../../../backend/packages/protocol/dist/remote-provider-settings.js
var providerRouteSchema = z4.string().min(1).max(256).refine((value) => !["__proto__", "prototype", "constructor"].includes(value) && !/[\x00-\x1f\x7f]/.test(value));
var integer = z4.number().int().positive().max(Number.MAX_SAFE_INTEGER);
var providerSettingValues = {
  displayName: z4.string().min(1).max(256),
  defaultContextWindow: integer,
  defaultMaxTokens: integer,
  streamIdleTimeoutMs: z4.number().positive().max(2147483647),
  timeoutMs: z4.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  cacheRetention: z4.enum(["none", "short", "long"]),
  transport: z4.enum(["sse", "websocket", "websocket-cached", "auto"])
};
var providerSettingKeySchema = z4.enum(["displayName", "defaultContextWindow", "defaultMaxTokens", "streamIdleTimeoutMs", "timeoutMs", "cacheRetention", "transport"]);
var providerDirectorySchema = z4.object({ providers: z4.array(z4.object({
  provider: providerRouteSchema,
  name: z4.string().min(1).max(256)
}).strict()).max(256).refine((rows2) => new Set(rows2.map((row) => row.provider)).size === rows2.length) }).strict();
var providerSettingsWriteSchema = z4.object({
  method: z4.literal("remote.providerSettingsWrite"),
  provider: providerRouteSchema,
  snapshot: z4.uuid(),
  expectedRevision: z4.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  edits: z4.array(z4.discriminatedUnion("op", [
    z4.object({ op: z4.literal("set"), key: providerSettingKeySchema, value: z4.union([z4.string(), z4.number()]) }).strict(),
    z4.object({ op: z4.literal("unset"), key: providerSettingKeySchema }).strict()
  ])).max(7).refine((edits) => new Set(edits.map((edit) => edit.key)).size === edits.length).refine((edits) => edits.every((edit) => edit.op === "unset" || providerSettingValues[edit.key].safeParse(edit.value).success)),
  compat: modelCompatSchema.optional(),
  protocolChange: z4.object({ value: z4.string().min(1).max(128), confirmed: z4.literal(true) }).strict().optional()
}).strict().refine((value) => value.edits.length > 0 || value.compat !== void 0 || value.protocolChange !== void 0);
var providerKeySetupSchema = z4.object({
  method: z4.literal("remote.providerKeySetup"),
  provider: providerRouteSchema,
  snapshot: z4.uuid(),
  expectedRevision: z4.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  confirmed: z4.literal(true)
}).strict();
var providerSettingsViewSchema = z4.object({
  provider: providerRouteSchema,
  snapshot: z4.uuid(),
  revision: z4.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  writable: z4.boolean(),
  applies: z4.enum(["live", "restart"]),
  keySetupAvailable: z4.boolean().optional(),
  protocol: z4.object({
    value: z4.string().min(1).max(128).optional(),
    choices: z4.array(z4.string().min(1).max(128)).min(1).max(64)
  }).strict().optional(),
  compat: z4.object({ effective: modelCompatViewSchema, overrides: modelCompatViewSchema }).strict().optional(),
  fields: z4.array(z4.object({
    key: providerSettingKeySchema,
    value: z4.union([z4.string(), z4.number()]).optional(),
    overridden: z4.boolean()
  }).strict().refine((field) => field.value === void 0 || providerSettingValues[field.key].safeParse(field.value).success)).length(7).refine((fields4) => new Set(fields4.map((field) => field.key)).size === 7)
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-key.js
var computerKeyTargetSchema = z5.union([z5.literal("web-search-deepseek"), z5.object({ provider: providerRouteSchema }).strict()]);
var computerKeyWriteSchema = z5.object({
  method: z5.literal("remote.keyWrite"),
  snapshot: z5.uuid(),
  target: computerKeyTargetSchema.optional(),
  change: z5.discriminatedUnion("op", [
    z5.object({ op: z5.literal("set"), value: z5.string().min(1).max(8192).regex(/^[\x21-\x7e]+$/) }).strict(),
    z5.object({ op: z5.literal("unset") }).strict()
  ])
}).strict();
var computerKeyViewSchema = z5.object({
  snapshot: z5.uuid(),
  provider: providerRouteSchema,
  configured: z5.boolean(),
  writable: z5.boolean(),
  target: z5.object({ provider: providerRouteSchema }).strict().optional()
}).strict().refine((view) => view.target ? view.target.provider === view.provider : ["deepseek-official", "deepseek-search"].includes(view.provider));

// ../../../../../../backend/packages/protocol/dist/remote-provider-removal.js
import { z as z6 } from "zod";
var providerRemovalReadSchema = z6.object({
  method: z6.literal("remote.providerRemovalRead"),
  provider: providerRouteSchema
}).strict();
var providerRemovalWriteSchema = z6.object({
  method: z6.literal("remote.providerRemovalWrite"),
  provider: providerRouteSchema,
  snapshot: z6.uuid(),
  expectedRevision: z6.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
}).strict();
var providerRemovalViewSchema = z6.object({
  provider: providerRouteSchema,
  name: z6.string().min(1).max(256),
  snapshot: z6.uuid(),
  revision: z6.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  writable: z6.boolean(),
  removable: z6.boolean(),
  removed: z6.boolean(),
  keepsCredential: z6.boolean(),
  applies: z6.enum(["live", "restart"])
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-provider-creation.js
import { z as z9 } from "zod";

// ../../../../../../backend/packages/protocol/dist/remote-endpoint.js
import { z as z7 } from "zod";
var computerEndpointTargetSchema = z7.union([
  z7.literal("web-search-deepseek"),
  z7.object({ provider: providerRouteSchema }).strict()
]);
var computerEndpointUrlSchema = z7.string().min(1).max(2048).refine((value) => {
  if (/\s|[\\\u0000-\u001f\u007f]/.test(value))
    return false;
  try {
    const url = new URL(value);
    return /^https?:\/\//.test(value) && ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
});
var computerEndpointReadSchema = z7.object({
  method: z7.literal("remote.endpointRead"),
  target: computerEndpointTargetSchema.optional(),
  resetPolicy: z7.literal(true).optional()
}).strict().refine((value) => value.resetPolicy === void 0 || typeof value.target === "object");
var computerEndpointWriteSchema = z7.object({
  method: z7.literal("remote.endpointWrite"),
  snapshot: z7.uuid(),
  expectedRevision: z7.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  target: computerEndpointTargetSchema.optional(),
  resetPolicy: z7.literal(true).optional(),
  confirmed: z7.literal(true),
  change: z7.discriminatedUnion("op", [
    z7.object({ op: z7.literal("set"), value: computerEndpointUrlSchema }).strict(),
    z7.object({ op: z7.literal("unset") }).strict()
  ])
}).strict().refine((value) => value.resetPolicy === void 0 || typeof value.target === "object");
var origin = computerEndpointUrlSchema.refine((value) => {
  try {
    return new URL(value).origin === value;
  } catch {
    return false;
  }
});
var computerEndpointViewSchema = z7.object({
  snapshot: z7.uuid(),
  revision: z7.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  writable: z7.boolean(),
  target: computerEndpointTargetSchema.optional(),
  applies: z7.enum(["live", "restart"]),
  protocol: z7.enum(["messages", "chat-completions", "provider"]),
  origin: origin.nullable(),
  inheritedOrigin: origin.nullable(),
  customPath: z7.boolean(),
  overridden: z7.boolean(),
  resettable: z7.boolean().optional()
}).strict().refine((view) => typeof view.target === "object" ? view.protocol === "provider" : view.protocol !== "provider" && view.origin !== null && view.inheritedOrigin !== null && view.resettable === void 0);

// ../../../../../../backend/packages/protocol/dist/remote-provider-models.js
import { z as z8 } from "zod";
var capacity = z8.number().int().positive().max(Number.MAX_SAFE_INTEGER);
var levels = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];
var efforts = z8.partialRecord(z8.enum(levels), z8.string().max(1024).nullable());
var advancedView = z8.object({
  input: z8.array(z8.enum(["text", "image"])).max(2).optional(),
  reasoningEfforts: z8.union([z8.literal(false), efforts, z8.null()]).optional()
}).strict();
var advancedWrite = advancedView.refine((value) => {
  if (value.input && new Set(value.input).size !== value.input.length)
    return false;
  const entries = value.reasoningEfforts;
  if (entries === void 0 || entries === false)
    return true;
  return entries !== null && Object.keys(entries).some((key) => key !== "off") && Object.entries(entries).every(([key, value2]) => key === "off" && value2 === null || typeof value2 === "string" && value2.length > 0);
});
var providerModelRowSchema = z8.object({
  source: z8.uuid().optional(),
  id: z8.string().min(1).max(1024),
  name: z8.string().max(1024).optional(),
  contextWindow: capacity.optional(),
  maxTokens: capacity.optional(),
  // 缺省保留旧客户端未编辑的字段；显式对象只替换这组已开放字段，{} 表示继承。
  advanced: advancedWrite.optional(),
  // 缺省保留未编辑的兼容配置；显式对象替换已公开字段，{} 恢复它们的继承。
  compat: modelCompatSchema.optional()
}).strict();
var rows = z8.array(providerModelRowSchema).max(1e3).refine((rows2) => new Set(rows2.map((row) => row.id)).size === rows2.length).refine((rows2) => {
  const ids = rows2.flatMap((row) => row.source ? [row.source] : []);
  return new Set(ids).size === ids.length;
});
var providerModelsViewSchema = z8.object({
  provider: providerRouteSchema,
  snapshot: z8.uuid(),
  scope: z8.literal("overrides").optional(),
  blockedByModels: z8.boolean().optional(),
  revision: z8.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  writable: z8.boolean(),
  applies: z8.enum(["live", "restart"]),
  overridden: z8.boolean(),
  advancedEditable: z8.boolean().optional(),
  compatEditable: z8.boolean().optional(),
  // 原配置可能已有重复/空ID诊断，读取时仍允许修复；提交时才要求唯一且非空。
  rows: z8.array(providerModelRowSchema.extend({ source: z8.uuid(), id: z8.string().max(1024), advanced: advancedView.optional(), compat: modelCompatViewSchema.optional() })).max(1e3)
}).strict();
var providerModelsWriteSchema = z8.object({
  method: z8.literal("remote.providerModelsWrite"),
  provider: providerRouteSchema,
  scope: z8.literal("overrides").optional(),
  snapshot: z8.uuid(),
  expectedRevision: z8.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  change: z8.discriminatedUnion("op", [z8.object({ op: z8.literal("set"), rows }).strict(), z8.object({ op: z8.literal("unset") }).strict()])
}).strict().refine((value) => value.scope !== "overrides" || value.change.op === "unset" || value.change.rows.every((row) => !["__proto__", "constructor", "prototype"].includes(row.id) && !/[\x00-\x1f\x7f]/.test(row.id)));
var deepSeekRow = providerModelRowSchema.omit({ compat: true, advanced: true }).extend({
  id: z8.string().trim().min(1).max(1024),
  name: z8.string().min(1).max(1024).optional(),
  advanced: z8.object({ input: z8.array(z8.enum(["text", "image"])).min(1).max(2).refine((value) => new Set(value).size === value.length).optional() }).strict().optional()
});
var deepSeekModelsWriteSchema = z8.object({
  method: z8.literal("remote.deepSeekModelsWrite"),
  snapshot: z8.uuid(),
  expectedRevision: z8.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  change: z8.discriminatedUnion("op", [z8.object({ op: z8.literal("unset") }).strict(), z8.object({
    op: z8.literal("set"),
    rows: z8.array(deepSeekRow).max(1e3).refine((rows2) => new Set(rows2.map((row) => row.id)).size === rows2.length).refine((rows2) => {
      const sources = rows2.flatMap((row) => row.source ? [row.source] : []);
      return new Set(sources).size === sources.length;
    })
  }).strict()])
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-provider-creation.js
var creationRow = providerModelRowSchema.pick({ id: true, name: true, contextWindow: true, maxTokens: true }).extend({
  input: z9.array(z9.enum(["text", "image"])).min(1).max(2).refine((values) => new Set(values).size === values.length).optional()
}).strict();
var creationModels = z9.union([
  z9.array(z9.string().min(1).max(1024)).min(1).max(1e3),
  z9.array(creationRow).min(1).max(1e3)
]).refine((rows2) => new Set(rows2.map((row) => typeof row === "string" ? row : row.id)).size === rows2.length);
var common = {
  method: z9.literal("remote.providerCreationWrite"),
  snapshot: z9.uuid(),
  expectedRevision: z9.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  useKey: z9.boolean(),
  name: z9.string().max(256),
  confirmed: z9.literal(true)
};
var providerCreationWriteSchema = z9.discriminatedUnion("kind", [
  z9.object({ ...common, kind: z9.literal("catalog"), provider: providerRouteSchema }).strict(),
  z9.object({
    ...common,
    kind: z9.literal("custom"),
    provider: providerRouteSchema.refine((value) => /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value)),
    api: z9.string().min(1).max(128),
    baseURL: computerEndpointUrlSchema,
    models: creationModels
  }).strict()
]);
var providerCreationViewSchema = z9.object({
  snapshot: z9.uuid(),
  revision: z9.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  writable: z9.boolean(),
  applies: z9.enum(["live", "restart"]),
  keyAvailable: z9.boolean(),
  protocols: z9.array(z9.string().min(1).max(128)).min(1).max(64),
  taken: z9.array(providerRouteSchema).max(2048),
  available: z9.array(z9.object({ provider: providerRouteSchema, name: z9.string().min(1).max(256) }).strict()).max(1024),
  created: z9.object({ provider: providerRouteSchema, useKey: z9.boolean() }).strict().optional()
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-model-discovery.js
import { z as z10 } from "zod";
var providerModelsDiscoverSchema = z10.object({ method: z10.literal("remote.providerModelsDiscover"), provider: providerRouteSchema }).strict();
var providerModelsDiscoveryViewSchema = z10.object({
  provider: providerRouteSchema,
  rows: z10.array(z10.object({
    id: z10.string().min(1).max(1024),
    name: z10.string().max(1024).optional(),
    contextWindow: z10.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    maxTokens: z10.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    inputModalities: z10.array(z10.enum(["text", "image"])).max(2).optional()
  }).strict()).max(1e3).refine((rows2) => new Set(rows2.map((row) => row.id)).size === rows2.length)
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-model-probe.js
import { z as z11 } from "zod";
var target = {
  baseURL: computerEndpointUrlSchema,
  api: z11.enum(["openai-completions", "openai-responses", "anthropic-messages"])
};
var authentication = z11.discriminatedUnion("mode", [
  z11.object({ mode: z11.literal("none") }).strict(),
  z11.object({ mode: z11.literal("temporary") }).strict(),
  z11.object({ mode: z11.literal("stored"), provider: providerRouteSchema }).strict()
]);
var modelProbePrepareSchema = z11.object({
  method: z11.literal("remote.modelProbePrepare"),
  ...target,
  authentication
}).strict();
var modelProbePreparedSchema = z11.object({
  snapshot: z11.uuid(),
  expiresAt: z11.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  ...target,
  authentication
}).strict();
var execution = { method: z11.literal("remote.modelProbeExecute"), snapshot: z11.uuid(), confirmed: z11.literal(true) };
var modelProbeExecuteSchema = z11.discriminatedUnion("mode", [
  z11.object({ ...execution, mode: z11.literal("none") }).strict(),
  z11.object({ ...execution, mode: z11.literal("stored") }).strict(),
  // 只允许原生通道组装此分支；服务端不得记录请求正文或持久化该值。
  z11.object({ ...execution, mode: z11.literal("temporary"), apiKey: z11.string().min(1).max(8192).refine((value) => value.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(value)) }).strict()
]);
var modelProbeResultSchema = providerModelsDiscoveryViewSchema.pick({ rows: true });

// ../../../../../../backend/packages/protocol/dist/remote-provider-card.js
import { z as z12 } from "zod";
var providerCardViewSchema = z12.object({
  provider: z12.object({
    provider: providerRouteSchema,
    displayName: z12.string().min(1).max(256),
    settingsNs: z12.string().min(1).max(256),
    settingsPath: z12.array(z12.string().min(1).max(256).refine((value) => !["__proto__", "constructor", "prototype"].includes(value))).max(16),
    active: z12.boolean(),
    declared: z12.boolean().optional(),
    error: z12.literal("\u63D0\u4F9B\u65B9\u6682\u4E0D\u53EF\u7528").optional()
  }).strict(),
  configured: z12.boolean(),
  keyConfigured: z12.boolean()
}).strict();

// ../../../../../../backend/packages/protocol/dist/remote-model-readiness.js
import { z as z13 } from "zod";
var modelReadinessSchema = z13.object({ kind: z13.enum([
  "provider-ready",
  "adapter-absent",
  "credential-missing",
  "unavailable"
]) }).strict();

// ../../../../../../backend/packages/protocol/dist/remote-cordis.js
var fields2 = {
  getClientCode: ["agentId", "pluginId", "pluginRunId"],
  inventory: [],
  invoke: ["pluginId", "pluginRunId", "method", "args"],
  reportClientGuardFailure: ["agentId", "pluginId", "pluginRunId", "failure"],
  reportRenderFailure: ["agentId", "pluginId", "pluginRunId", "failure"],
  resolveInspectQuery: ["agentId", "requestId", "resolution"],
  resolveRequestRun: ["requestId", "resolution"],
  runHostHalf: ["agentId", "pluginId", "packageId", "mode", "requestId", "approveFutureVersions"],
  settleUserRun: ["agentId", "pluginId", "resolution"],
  stopFromPanel: ["agentId", "pluginId"],
  syncInspectManifest: ["providers"],
  undefineFromPanel: ["agentId", "pluginId"]
};
var dynamicCordisCalls = Object.keys(fields2).map((method) => `dynamicCordisRunner/${method}`);
function cordisRequestAllowed(endpoint2, payload) {
  const method = endpoint2.slice("dynamicCordisRunner/".length);
  if (!Object.hasOwn(fields2, method) || Object.keys(payload).some((key) => key !== "args"))
    return false;
  const args = payload.args;
  if (!args || typeof args !== "object" || Array.isArray(args))
    return false;
  const names = fields2[method];
  const record8 = args;
  if (Object.keys(record8).some((key) => !names.includes(key)) || names.some((key) => !Object.hasOwn(record8, key)))
    return false;
  for (const key of ["agentId", "pluginId", "pluginRunId", "packageId", "requestId"]) {
    if (!Object.hasOwn(record8, key))
      continue;
    const value = record8[key];
    if (method === "runHostHalf" && key === "requestId" && value === null)
      continue;
    if (typeof value !== "string" || value.length === 0 || value.length > 200 || /[\x00-\x1f\x7f]/u.test(value))
      return false;
  }
  return true;
}

// ../../../../../../backend/packages/protocol/dist/remote-policy.js
var basicCalls = /* @__PURE__ */ new Set([
  "session/list",
  "session/search",
  "session/create",
  "session/selectModel",
  "session/modelCatalog",
  "session/rename",
  "session/fork",
  "session/prompt",
  "session/attachment",
  "session/updateQueue",
  "session/cancel",
  "session/page",
  // 原 Host 校验持久父子地址、可继续类型和当前执行归属。
  "subagents/list",
  "subagents/prompt",
  "subagents/interruptByParent",
  "workspace/archiveSession",
  "workspace/unarchiveSession",
  "skills/list",
  "fileReferences/list",
  "sessionReferenceResolver/candidates",
  // 只读候选目录也供原输入框的附件菜单使用，不授予执行指令的权限。
  "commands/list",
  "permissionPresets/catalog",
  "terminal/list",
  "$events/result",
  // 仅接受下方校验的权限选择与计划模式开关，不是通用命令执行入口。
  "commands/execute",
  // 仅目录和空白会话选择，不开放预设文件、默认配置或增删预设。
  "agentPresets/list",
  "agentPresets/select",
  // 原会话目标操作保留 Host 的版本校验，不接受任意工具或调度配置。
  "goals/get",
  "goals/create",
  "goals/edit",
  "goals/pause",
  "goals/resume",
  "goals/complete",
  "goals/clear",
  // 新版只读当前会话提醒；不开放Host总目录、创建、删除或修改。
  "schedule/list",
  // 反馈留在原会话日志，由 Host 校验消息身份、版本及配置的内容上限。
  "messageFeedback/list",
  "messageFeedback/put",
  "messageFeedback/delete",
  "sessionFeedback/record",
  // 沿用 Host 会话解析和文件读取权限；只允许分页/有界字节窗，不开放整文件大 JSON。
  "workspaceFiles/stat",
  "workspaceFiles/readBytes",
  "workspaceFiles/read",
  // 只列出会话工作区内一个目录的直接子项；根目录与边界由原 Host 核验。
  "workspaceFiles/list",
  // 仅返回转换器代次，供缓存失效检查；不开放整份 PDF 的 render RPC。
  "officeToPdf/generation"
]);
var managementCalls = /* @__PURE__ */ new Set([
  // 旧版预设由原Host按已登记ID读取/复制/删除；不接受路径或组装源码。
  "agentPresets/read",
  "agentPresets/copy",
  "agentPresets/deletePreset",
  "settings/openAgentPresetDirectory",
  // 只允许下方固定agent-presets两字段补丁，不是通用设置写入。
  "settings/update",
  "workspace/rename",
  "workspace/delete",
  "workspace/insertBefore",
  "workspace/insertSessionBefore",
  // 原插件页用此只读清单确认 profile 管理能力；不返回插件配置或凭据。
  "pluginInventory/list",
  "pluginManager/listPlugins",
  "pluginManager/listBundles",
  "pluginManager/inspect",
  "pluginManager/setPluginEnabled",
  "pluginManager/setBundleEnabled",
  "pluginManager/installBundle",
  "pluginManager/cancelInstall",
  "pluginManager/removeBundle",
  // 新版原管理器核对丢失回执；null 只代表没有在途记录，不能推断成功或取消。
  "pluginManager/waitForInstall"
]);
var legacyPresetCalls = /* @__PURE__ */ new Set(["agentPresets/copy", "agentPresets/deletePreset"]);
var basicStreams = /* @__PURE__ */ new Set(["session/follow", "session/control", "workspace/follow", "$events", "workspaceFiles/changes"]);
var targetCalls = /* @__PURE__ */ new Set(["userQuestions/answer"]);
var targetStreams = /* @__PURE__ */ new Set(["job/list", "userQuestions/attachWait"]);
var projectionCall = "session/projections";
function remotePermission(endpoint2, stream) {
  if (stream)
    return basicStreams.has(endpoint2) || targetStreams.has(endpoint2) ? "basic" : void 0;
  if (endpoint2 === projectionCall)
    return "basic";
  if (targetCalls.has(endpoint2))
    return "basic";
  if (basicCalls.has(endpoint2))
    return "basic";
  if (dynamicCordisCalls.includes(endpoint2))
    return "basic";
  if (managementCalls.has(endpoint2))
    return "management";
  return void 0;
}
function remoteEndpoints(management, dynamicCordis = false, sessionContract = "legacy", scheduleCatalog = false) {
  const calls = [...basicCalls].filter((endpoint2) => (sessionContract !== "target" || endpoint2 !== "subagents/list") && (endpoint2 !== "schedule/list" || sessionContract === "target" && scheduleCatalog));
  return {
    calls: [
      ...calls,
      ...sessionContract === "target" ? [projectionCall, ...targetCalls] : [],
      ...dynamicCordis ? dynamicCordisCalls : [],
      ...management ? [...managementCalls].filter((endpoint2) => sessionContract === "target" ? !legacyPresetCalls.has(endpoint2) : endpoint2 !== "pluginManager/waitForInstall") : []
    ],
    streams: [...basicStreams, ...sessionContract === "target" ? targetStreams : []]
  };
}
function remoteRequestAllowed(endpoint2, payload, fileContract = "legacy") {
  if (fileContract === "target" && legacyPresetCalls.has(endpoint2))
    return false;
  if (endpoint2 === "schedule/list") {
    const args2 = payload.args;
    const request2 = args2?.request;
    return fileContract !== "legacy" && Object.keys(payload).every((key) => key === "args") && !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => key === "request") && !!request2 && typeof request2 === "object" && !Array.isArray(request2) && Object.keys(request2).every((key) => key === "sessionId") && typeof request2.sessionId === "string" && request2.sessionId.length > 0 && request2.sessionId.length <= 128 && !/[\x00-\x1f\x7f]/u.test(request2.sessionId);
  }
  if (endpoint2 === "userQuestions/attachWait" || endpoint2 === "userQuestions/answer") {
    const args2 = payload.args;
    const answering = endpoint2 === "userQuestions/answer";
    const id = (value2) => typeof value2 === "string" && value2.length > 0 && value2.length <= 200 && !/[\x00-\x1f\x7f]/u.test(value2);
    if (fileContract === "legacy" || Object.keys(payload).some((key) => key !== "args") || !args2 || typeof args2 !== "object" || Array.isArray(args2) || Object.keys(args2).some((key) => !["agentId", "callId", ...answering ? ["answer"] : []].includes(key)) || !id(args2.agentId) || !id(args2.callId))
      return false;
    if (!answering)
      return true;
    const answer = args2.answer;
    if (!answer || typeof answer !== "object" || Array.isArray(answer) || Object.keys(answer).some((key) => key !== "answers") || !Array.isArray(answer.answers) || !answer.answers.length)
      return false;
    const ids = /* @__PURE__ */ new Set();
    return answer.answers.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        return false;
      const value2 = item;
      if (Object.keys(value2).some((key) => !["id", "selected", "custom"].includes(key)) || !id(value2.id) || ids.has(value2.id) || !Array.isArray(value2.selected) || !value2.selected.every((label) => typeof label === "string") || value2.custom !== void 0 && typeof value2.custom !== "string")
        return false;
      ids.add(value2.id);
      return true;
    });
  }
  if (endpoint2 === "pluginManager/waitForInstall") {
    const args2 = payload.args;
    return fileContract !== "legacy" && Object.keys(payload).every((key) => key === "args") && !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => key === "requestId") && typeof args2.requestId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args2.requestId);
  }
  if (endpoint2 === "job/list") {
    const args2 = payload.args;
    const request2 = args2?.request;
    return fileContract !== "legacy" && Object.keys(payload).every((key) => key === "args") && !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => key === "request") && !!request2 && typeof request2 === "object" && !Array.isArray(request2) && Object.keys(request2).every((key) => key === "sessionId") && typeof request2.sessionId === "string" && request2.sessionId.length > 0 && request2.sessionId.length <= 128 && !/[\x00-\x1f\x7f]/u.test(request2.sessionId);
  }
  if (endpoint2 === "subagents/list" && fileContract === "target")
    return false;
  if (endpoint2 === projectionCall) {
    const args2 = payload.args;
    const request2 = args2?.request;
    return fileContract !== "legacy" && Object.keys(payload).every((key) => key === "args") && !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => key === "request") && !!request2 && typeof request2 === "object" && !Array.isArray(request2) && Object.keys(request2).every((key) => key === "sessionId") && typeof request2.sessionId === "string" && request2.sessionId.length > 0 && request2.sessionId.length <= 128 && !request2.sessionId.includes("\0");
  }
  if (endpoint2 === "settings/update") {
    const args2 = payload.args;
    if (Object.keys(payload).some((key) => key !== "args") || !args2 || typeof args2 !== "object" || Array.isArray(args2) || Object.keys(args2).some((key) => !["ns", "patch", "expectedRevision"].includes(key)) || args2.ns !== "agent-presets")
      return false;
    const patch = args2.patch;
    if (!patch || typeof patch !== "object" || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).some((key) => !["default", "modeSelectionEnabled"].includes(key)))
      return false;
    if (Object.hasOwn(patch, "default") && (typeof patch.default !== "string" || patch.default.length > 128 || !/^[a-z0-9][a-z0-9-]*$/.test(patch.default)))
      return false;
    if (Object.hasOwn(patch, "modeSelectionEnabled") && typeof patch.modeSelectionEnabled !== "boolean")
      return false;
    return args2.expectedRevision === void 0 || Number.isSafeInteger(args2.expectedRevision) && args2.expectedRevision >= 0;
  }
  if (endpoint2 === "settings/openAgentPresetDirectory") {
    const args2 = payload.args;
    return Object.keys(payload).every((key) => key === "args") && !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => key === "agentPreset") && typeof args2.agentPreset === "string" && args2.agentPreset.length <= 128 && /^[a-z0-9][a-z0-9-]*$/.test(args2.agentPreset);
  }
  if (["agentPresets/read", "agentPresets/copy", "agentPresets/deletePreset"].includes(endpoint2)) {
    const args2 = payload.args;
    if (Object.keys(payload).some((key) => key !== "args") || !args2 || typeof args2 !== "object" || Array.isArray(args2))
      return false;
    const id = (value2) => typeof value2 === "string" && value2.length <= 128 && /^[a-z0-9][a-z0-9-]*$/.test(value2);
    if (endpoint2 === "agentPresets/read")
      return Object.keys(args2).every((key) => key === "agentPreset") && id(args2.agentPreset);
    if (endpoint2 === "agentPresets/deletePreset")
      return Object.keys(args2).every((key) => key === "id") && id(args2.id);
    return Object.keys(args2).every((key) => ["from", "id", "name"].includes(key)) && id(args2.from) && id(args2.id) && (args2.name === void 0 || typeof args2.name === "string" && args2.name.length <= 256 && !/[\x00-\x1f\x7f]/.test(args2.name));
  }
  if (endpoint2.startsWith("dynamicCordisRunner/"))
    return cordisRequestAllowed(endpoint2, payload);
  if (endpoint2 === "officeToPdf/generation") {
    const args2 = payload.args;
    return Object.keys(payload).every((key) => key === "args") && !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).length === 0;
  }
  if (endpoint2 === "workspaceFiles/read") {
    const args2 = payload.args;
    if (Object.keys(payload).some((key) => key !== "args") || !args2 || typeof args2 !== "object" || Array.isArray(args2) || Object.keys(args2).some((key) => !["workspaceFileScopeId", "path", "range"].includes(key)) || typeof args2.workspaceFileScopeId !== "string" || !args2.workspaceFileScopeId.length || args2.workspaceFileScopeId.length > 200 || /[\x00-\x1f\x7f]/u.test(args2.workspaceFileScopeId) || typeof args2.path !== "string" || !args2.path.length || args2.path.length > 4096 || args2.path.includes("\0"))
      return false;
    const range = args2.range;
    if (!range || typeof range !== "object" || Array.isArray(range) || Object.keys(range).some((key) => !["offset", "limit"].includes(key)))
      return false;
    const limit = range.limit === void 0 ? 5e3 : range.limit;
    return Number.isSafeInteger(range.offset) && range.offset >= 1 && Number.isSafeInteger(limit) && limit >= 1 && limit <= 5e3 && Number.isSafeInteger(range.offset + limit);
  }
  if (endpoint2 === "fileReferences/list" || endpoint2 === "sessionReferenceResolver/candidates") {
    const args2 = payload.args;
    return !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => ["agentId", "query"].includes(key)) && typeof args2.agentId === "string" && args2.agentId.length > 0 && args2.agentId.length <= 200 && !/[\x00-\x1f\x7f]/u.test(args2.agentId) && typeof args2.query === "string" && args2.query.length <= 4096 && !args2.query.includes("\0");
  }
  if (endpoint2 === "workspaceFiles/list") {
    const args2 = payload.args;
    return !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).every((key) => ["workspaceFileScopeId", "path"].includes(key)) && typeof args2.workspaceFileScopeId === "string" && args2.workspaceFileScopeId.length > 0 && args2.workspaceFileScopeId.length <= 200 && !/[\x00-\x1f\x7f]/u.test(args2.workspaceFileScopeId) && typeof args2.path === "string" && args2.path.length > 0 && args2.path.length <= 4096 && !args2.path.includes("\0");
  }
  if (endpoint2 === "workspaceFiles/changes") {
    const args2 = payload.args;
    if (Object.keys(payload).some((key) => key !== "args") || !args2 || typeof args2 !== "object" || Array.isArray(args2) || typeof args2.workspaceFileScopeId !== "string" || !args2.workspaceFileScopeId.length || args2.workspaceFileScopeId.length > 200 || /[\x00-\x1f\x7f]/u.test(args2.workspaceFileScopeId))
      return false;
    if (!Object.hasOwn(args2, "path"))
      return fileContract !== "target" && Object.keys(args2).every((key) => key === "workspaceFileScopeId");
    return fileContract !== "legacy" && Object.keys(args2).every((key) => ["workspaceFileScopeId", "path"].includes(key)) && typeof args2.path === "string" && args2.path.length > 0 && args2.path.length <= 4096 && !args2.path.includes("\0");
  }
  if (endpoint2 === "pluginInventory/list") {
    const args2 = payload.args;
    return !!args2 && typeof args2 === "object" && !Array.isArray(args2) && Object.keys(args2).length === 0;
  }
  if (endpoint2.startsWith("messageFeedback/") || endpoint2.startsWith("sessionFeedback/")) {
    const fields4 = {
      "messageFeedback/list": ["sessionId"],
      "messageFeedback/put": ["sessionId", "messageId", "rating", "note", "category", "ifVersion"],
      "messageFeedback/delete": ["sessionId", "messageId", "ifVersion"],
      "sessionFeedback/record": ["sessionId", "text", "category"]
    };
    const allowed = fields4[endpoint2];
    const args2 = payload.args;
    const request2 = args2?.request;
    if (!allowed || !args2 || typeof args2 !== "object" || Array.isArray(args2) || Object.keys(args2).some((key) => key !== "request") || !request2 || typeof request2 !== "object" || Array.isArray(request2) || Object.keys(request2).some((key) => !allowed.includes(key)))
      return false;
    const id = (value2) => typeof value2 === "string" && value2.length > 0 && value2.length <= 200 && !/[\x00-\x1f\x7f]/u.test(value2);
    if (!id(request2.sessionId))
      return false;
    if (endpoint2 === "messageFeedback/list")
      return true;
    const sessionFeedback = endpoint2 === "sessionFeedback/record";
    if (!sessionFeedback) {
      if (!id(request2.messageId))
        return false;
      const version = request2.ifVersion;
      if (!(endpoint2 === "messageFeedback/put" && version === null) && !(typeof version === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(version)))
        return false;
      if (endpoint2 === "messageFeedback/put" && !["positive", "negative"].includes(request2.rating))
        return false;
    }
    if (request2.category !== void 0 && ![
      "task-result",
      "instruction-following",
      "product-interaction",
      "service-stability",
      "resource-cost",
      "security-privacy-permission",
      "other"
    ].includes(request2.category))
      return false;
    const text = sessionFeedback ? request2.text : request2.note;
    return text === void 0 || typeof text === "string" && (sessionFeedback || text.trim().length > 0) && new TextEncoder().encode(text).byteLength <= 64 * 1024;
  }
  if (["workspace/rename", "workspace/delete", "workspace/insertBefore", "workspace/insertSessionBefore"].includes(endpoint2)) {
    const args2 = payload.args;
    const request2 = args2?.request;
    if (!args2 || Array.isArray(args2) || Object.keys(args2).some((key) => key !== "request") || !request2 || typeof request2 !== "object" || Array.isArray(request2))
      return false;
    const id = (value2) => typeof value2 === "string" && value2.length > 0 && value2.length <= 200 && !/[\x00-\x1f\x7f]/u.test(value2);
    if (!id(request2.workspaceId))
      return false;
    const allowed = endpoint2 === "workspace/rename" ? ["workspaceId", "title"] : endpoint2 === "workspace/insertBefore" ? ["workspaceId", "beforeWorkspaceId"] : endpoint2 === "workspace/insertSessionBefore" ? ["workspaceId", "sessionId", "beforeSessionId"] : ["workspaceId"];
    if (Object.keys(request2).some((key) => !allowed.includes(key)))
      return false;
    if (endpoint2 === "workspace/rename")
      return typeof request2.title === "string" && request2.title.trim().length > 0 && request2.title.length <= 200 && !/[\x00-\x1f\x7f]/u.test(request2.title);
    if (endpoint2 === "workspace/insertBefore")
      return request2.beforeWorkspaceId === void 0 || id(request2.beforeWorkspaceId) && request2.beforeWorkspaceId !== request2.workspaceId;
    if (endpoint2 === "workspace/insertSessionBefore")
      return id(request2.sessionId) && (request2.beforeSessionId === void 0 || id(request2.beforeSessionId) && request2.beforeSessionId !== request2.sessionId);
    return true;
  }
  if (endpoint2.startsWith("goals/")) {
    const method = endpoint2.slice("goals/".length);
    if (!["get", "create", "edit", "pause", "resume", "complete", "clear"].includes(method))
      return false;
    const args2 = payload.args;
    if (!args2 || typeof args2 !== "object" || Array.isArray(args2) || typeof args2.agentId !== "string" || !args2.agentId.length || args2.agentId.length > 200)
      return false;
    const keys = ["agentId", ...["create", "edit"].includes(method) ? ["request"] : [], ...!["get", "create"].includes(method) ? ["ref"] : []];
    if (Object.keys(args2).some((key) => !keys.includes(key)))
      return false;
    if (!["get", "create"].includes(method)) {
      const ref = args2.ref;
      if (!ref || typeof ref !== "object" || Array.isArray(ref) || Object.keys(ref).some((key) => !["id", "revision"].includes(key)) || typeof ref.id !== "string" || !ref.id.length || ref.id.length > 200 || !Number.isSafeInteger(ref.revision) || ref.revision < 1)
        return false;
    }
    if (["create", "edit"].includes(method)) {
      const request2 = args2.request;
      if (!request2 || typeof request2 !== "object" || Array.isArray(request2) || !Object.keys(request2).length || Object.keys(request2).some((key) => !["objective", "maxGoalRounds"].includes(key)) || method === "create" && request2.objective === void 0)
        return false;
      if (request2.objective !== void 0 && (typeof request2.objective !== "string" || !request2.objective.trim() || request2.objective.length > 32e3))
        return false;
      if (request2.maxGoalRounds !== void 0 && (!Number.isSafeInteger(request2.maxGoalRounds) || request2.maxGoalRounds < 1))
        return false;
    }
    return true;
  }
  if (endpoint2 === "agentPresets/list" || endpoint2 === "agentPresets/select") {
    const args2 = payload.args;
    if (!args2 || typeof args2 !== "object" || Array.isArray(args2))
      return false;
    if (endpoint2 === "agentPresets/list")
      return Object.keys(args2).length === 0;
    return Object.keys(args2).every((key) => ["agentId", "agentPreset"].includes(key)) && typeof args2.agentId === "string" && args2.agentId.length > 0 && args2.agentId.length <= 200 && typeof args2.agentPreset === "string" && args2.agentPreset.length > 0 && args2.agentPreset.length <= 128 && !/[\x00-\x1f\x7f]/u.test(args2.agentPreset);
  }
  if (endpoint2 === "commands/execute") {
    const args2 = payload.args;
    if (!args2 || typeof args2 !== "object" || Array.isArray(args2) || Object.keys(args2).some((key) => !["agentId", "line", "submittedAttachments"].includes(key)) || typeof args2.agentId !== "string" || !args2.agentId.length || args2.agentId.length > 200 || typeof args2.line !== "string" || !Array.isArray(args2.submittedAttachments) || args2.submittedAttachments.length)
      return false;
    if (args2.line === "/plan" || args2.line === "/plan off")
      return true;
    if (!args2.line.startsWith("/permission "))
      return false;
    const preset = args2.line.slice("/permission ".length);
    return preset.length > 0 && preset.length <= 128 && preset.trim() === preset && !/[\x00-\x1f\x7f]/u.test(preset);
  }
  if (endpoint2 === "workspaceFiles/stat" || endpoint2 === "workspaceFiles/readBytes") {
    const args2 = payload.args;
    if (!args2 || typeof args2 !== "object" || Array.isArray(args2) || typeof args2.workspaceFileScopeId !== "string" || !args2.workspaceFileScopeId.length || args2.workspaceFileScopeId.length > 200 || typeof args2.path !== "string" || !args2.path.length || args2.path.length > 4096 || args2.path.includes("\0"))
      return false;
    if (endpoint2 === "workspaceFiles/stat")
      return true;
    const nativeOptions = Object.hasOwn(args2, "options");
    const options = args2.options;
    if (nativeOptions && (fileContract === "legacy" || Object.hasOwn(args2, "range") || !options || typeof options !== "object" || Array.isArray(options) || Object.keys(options).some((key) => !["range", "baseFile"].includes(key)) || options.baseFile !== void 0 && (typeof options.baseFile !== "string" || !options.baseFile.length || options.baseFile.length > 4096 || options.baseFile.includes("\0"))))
      return false;
    if (fileContract !== "legacy" && (Object.keys(payload).some((key) => key !== "args") || Object.keys(args2).some((key) => !["workspaceFileScopeId", "path", nativeOptions ? "options" : "range"].includes(key))))
      return false;
    const range = nativeOptions ? options?.range : args2.range;
    return !!range && typeof range === "object" && !Array.isArray(range) && (fileContract === "legacy" || Object.keys(range).every((key) => ["offset", "length"].includes(key))) && Number.isSafeInteger(range.offset) && range.offset >= 0 && Number.isSafeInteger(range.length) && range.length >= 1 && range.length <= 64 * 1024 && Number.isSafeInteger(range.offset + range.length);
  }
  if (endpoint2 !== "session/create")
    return true;
  const args = payload.args;
  if (!args || typeof args !== "object" || Array.isArray(args))
    return false;
  const request = args.request;
  if (!request || typeof request !== "object" || Array.isArray(request))
    return false;
  const value = request;
  return typeof value.workspaceId === "string" && value.workspaceId.length > 0 && !Object.hasOwn(value, "cwd");
}

// ../../../../../../backend/packages/protocol/dist/index.js
var REMOTE_TRANSPORT_VERSION = 2;
var RESOURCE_CHUNK_BYTES = 64 * 1024;
var RESOURCE_WINDOW = 4;
var MAX_UPLOAD_BYTES = 256 * 1024 * 1024;
var MAX_FRAME_BYTES = 2 * 1024 * 1024;
var MAX_OFFICE_PDF_BYTES = 32 * 1024 * 1024;
var MAX_CHANGES_BYTES = 32 * 1024 * 1024;
var MAX_SESSION_EXPORT_BYTES = 256 * 1024 * 1024;
var attachmentRefSchema = z14.object({
  attachmentId: z14.string().min(1).max(512),
  name: z14.string().min(1).max(255).optional(),
  bytes: z14.number().int().min(0).max(MAX_UPLOAD_BYTES),
  mediaType: z14.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]).optional(),
  width: z14.number().int().positive().optional(),
  height: z14.number().int().positive().optional(),
  originalDimensions: z14.object({ width: z14.number().int().positive(), height: z14.number().int().positive() }).strict().optional()
}).strict();
var officeMetadataSchema = z14.object({
  absolutePath: z14.string().min(1).max(4096),
  version: z14.string().min(1).max(4096),
  bytes: z14.number().int().min(1).max(MAX_OFFICE_PDF_BYTES),
  generation: z14.string().min(1).max(200),
  missingFonts: z14.array(z14.string().max(255)).max(256)
}).strict();
var attachmentOfficeMetadataSchema = officeMetadataSchema.omit({ absolutePath: true, version: true }).extend({
  attachmentId: z14.string().min(1).max(512),
  name: z14.string().min(1).max(255)
}).strict();
var sessionId = z14.string().min(1).max(200);
var pageSize = z14.number().int().min(1).max(100).optional();
var address = z14.discriminatedUnion("kind", [
  z14.object({ kind: z14.literal("session"), sessionId }).strict(),
  z14.object({
    kind: z14.literal("subagent"),
    parentSessionId: sessionId,
    childSessionId: sessionId,
    mode: z14.enum(["one-shot", "continuable"])
  }).strict()
]);
var operationSchema = z14.discriminatedUnion("method", [
  z14.object({
    method: z14.literal("remote.pluginOperationStart"),
    generation: z14.uuid(),
    operationId: z14.uuid(),
    endpoint: z14.enum(["pluginManager/installBundle", "pluginManager/removeBundle", "pluginManager/setBundleEnabled", "pluginManager/setPluginEnabled"]),
    payload: z14.record(z14.string(), z14.unknown())
  }).strict(),
  z14.object({ method: z14.literal("remote.pluginOperationRead"), generation: z14.uuid(), operationId: z14.uuid() }).strict(),
  z14.object({ method: z14.literal("remote.pluginOperations") }).strict(),
  z14.object({ method: z14.literal("remote.negotiate"), version: z14.literal(REMOTE_TRANSPORT_VERSION) }).strict(),
  z14.object({ method: z14.literal("remote.graph") }).strict(),
  z14.object({ method: z14.literal("remote.graphFollow") }).strict(),
  z14.object({ method: z14.literal("remote.subagentStateFollow") }).strict(),
  z14.object({ method: z14.literal("remote.taskFollow"), previewVersion: z14.literal(1).optional() }).strict(),
  z14.object({ method: z14.literal("remote.feedbackFollow"), sessionId: sessionId.regex(/^[^\x00-\x1f\x7f]+$/u) }).strict(),
  z14.object({ method: z14.literal("remote.desktop") }).strict(),
  z14.object({ method: z14.literal("remote.desktopApps"), sessionId }).strict(),
  z14.object({
    method: z14.literal("remote.desktopAppIcon"),
    sessionId,
    appId: z14.string().min(1).max(80).regex(/^[a-z][a-z0-9-]*$/)
  }).strict(),
  z14.object({
    method: z14.literal("remote.prepareDesktopApp"),
    sessionId,
    appId: z14.string().min(1).max(80).regex(/^[a-z][a-z0-9-]*$/)
  }).strict(),
  z14.object({ method: z14.literal("remote.openDesktopApp"), sessionId, snapshot: z14.uuid(), confirmed: z14.literal(true) }).strict(),
  z14.object({
    method: z14.literal("remote.openFile"),
    source: z14.enum(["presented", "changes"]),
    sessionId,
    seq: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    index: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    confirmed: z14.literal(true),
    action: z14.enum(["open", "reveal"]).optional()
  }).strict().refine((value) => value.action !== "reveal" || value.source === "presented"),
  z14.object({
    method: z14.literal("remote.prepareDesktopFile"),
    sessionId,
    path: z14.string().min(1).max(4096).refine((value) => !/[\x00-\x1f\x7f]/.test(value) && !/^[\\/]{2}/.test(value) && (!/^[a-z][a-z\d+.-]*:/i.test(value) || /^[a-z]:[\\/]/i.test(value)))
  }).strict(),
  z14.object({ method: z14.literal("remote.openDesktopFile"), sessionId, snapshot: z14.uuid(), confirmed: z14.literal(true) }).strict(),
  z14.object({
    method: z14.literal("remote.prepareDesktopAttachment"),
    sessionId,
    kind: z14.enum(["file", "image"]),
    attachmentId: z14.string().min(1).max(512),
    name: z14.string().min(1).max(255).optional()
  }).strict(),
  z14.object({ method: z14.literal("remote.openDesktopAttachment"), sessionId, snapshot: z14.uuid(), confirmed: z14.literal(true) }).strict(),
  z14.object({ method: z14.literal("remote.settingsRead"), namespace: pluginSettingsNamespaceSchema.optional() }).strict(),
  z14.object({ method: z14.literal("remote.codingToolsRead") }).strict(),
  presetManagementReadSchema,
  presetCopySchema,
  presetDeleteSchema,
  computerSettingsWriteSchema,
  z14.object({ method: z14.literal("remote.providerSettingsList") }).strict(),
  z14.object({ method: z14.literal("remote.providerCardRead"), provider: providerRouteSchema }).strict(),
  z14.object({ method: z14.literal("remote.modelReadiness") }).strict(),
  z14.object({ method: z14.literal("remote.providerSettingsRead"), provider: providerRouteSchema }).strict(),
  providerSettingsWriteSchema,
  providerKeySetupSchema,
  providerRemovalReadSchema,
  providerRemovalWriteSchema,
  z14.object({ method: z14.literal("remote.providerCreationRead") }).strict(),
  providerCreationWriteSchema,
  z14.object({ method: z14.literal("remote.providerModelsRead"), provider: providerRouteSchema, scope: z14.literal("overrides").optional() }).strict(),
  providerModelsWriteSchema,
  z14.object({ method: z14.literal("remote.deepSeekModelsRead") }).strict(),
  deepSeekModelsWriteSchema,
  providerModelsDiscoverSchema,
  modelProbePrepareSchema,
  modelProbeExecuteSchema,
  z14.object({ method: z14.literal("remote.keyRead"), target: computerKeyTargetSchema.optional() }).strict(),
  computerEndpointReadSchema,
  computerEndpointWriteSchema,
  computerKeyWriteSchema,
  z14.object({ method: z14.literal("remote.sessionExport"), sessionId, includeDescendants: z14.boolean() }).strict(),
  z14.object({
    method: z14.literal("remote.jobStop"),
    sessionId,
    jobId: z14.string().min(1).max(200),
    startedAt: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    generation: z14.uuid()
  }).strict(),
  z14.object({
    method: z14.literal("remote.jobOutput"),
    sessionId,
    jobId: z14.string().min(1).max(200),
    startedAt: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    generation: z14.uuid(),
    stream: z14.enum(["stdout", "stderr"]),
    fromByte: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    maxBytes: z14.number().int().min(1).max(RESOURCE_CHUNK_BYTES)
  }).strict(),
  z14.object({
    method: z14.literal("remote.commandOutput"),
    sessionId,
    rootCallId: z14.string().min(1).max(200),
    callId: z14.string().min(1).max(200),
    rootCallTime: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    generation: z14.uuid(),
    outputId: z14.uuid().optional(),
    stream: z14.enum(["stdout", "stderr"]),
    fromByte: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    maxBytes: z14.number().int().min(1).max(RESOURCE_CHUNK_BYTES)
  }).strict(),
  z14.object({
    method: z14.literal("remote.changes"),
    sessionId,
    seq: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    index: z14.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional()
  }).strict(),
  z14.object({ method: z14.literal("remote.resource"), path: z14.string().min(1).max(4096), verb: z14.enum(["GET", "HEAD"]) }).strict(),
  z14.object({ method: z14.literal("remote.upload"), sessionId, name: z14.string().max(255).optional() }).strict(),
  // 仅原普通/子会话 prompt；字节通过已有 uploadChunk 窗口发送。
  z14.object({ method: z14.literal("remote.prompt"), rpcId: z14.uuid(), endpoint: z14.enum(["session/prompt", "subagents/prompt"]).optional() }).strict(),
  z14.object({
    method: z14.literal("remote.attachment"),
    sessionId,
    kind: z14.enum(["file", "image"]),
    attachmentId: z14.string().min(1).max(512),
    name: z14.string().min(1).max(255).optional()
  }).strict(),
  z14.object({
    method: z14.literal("remote.office"),
    sessionId,
    priority: z14.enum(["foreground", "background"]).optional(),
    path: z14.string().min(1).max(4096).regex(/\.(docx?|xlsx?|pptx?)$/i).refine((value) => !value.includes("\0"))
  }).strict(),
  z14.object({
    method: z14.literal("remote.attachmentOffice"),
    sessionId,
    attachmentId: z14.string().min(1).max(512),
    priority: z14.enum(["foreground", "background"]).optional(),
    name: z14.string().min(1).max(255).regex(/\.(docx?|xlsx?|pptx?)$/i).refine((value) => !/[\\/\0]/.test(value))
  }).strict(),
  z14.object({
    method: z14.enum(["remote.rpc", "remote.stream"]),
    endpoint: z14.string().min(1).max(200),
    payload: z14.record(z14.string(), z14.unknown())
  }).strict(),
  z14.object({ method: z14.literal("session.list") }).strict(),
  z14.object({
    method: z14.literal("session.page"),
    address,
    throughSeq: z14.number().int().min(-1),
    beforeSeq: z14.number().int().min(0).optional(),
    maxMessages: pageSize
  }).strict(),
  z14.object({ method: z14.literal("session.follow"), address, maxMessages: pageSize }).strict(),
  z14.object({ method: z14.literal("session.control") }).strict(),
  z14.object({
    method: z14.literal("session.prompt"),
    sessionId,
    requestId: z14.uuid(),
    mode: z14.enum(["queue", "steer"]),
    text: z14.string().min(1).max(64e3).refine((value) => value.trim().length > 0)
  }).strict(),
  z14.object({ method: z14.literal("session.cancel"), sessionId }).strict()
]);
var uploadChunk = z14.object({
  type: z14.literal("uploadChunk"),
  id: z14.uuid(),
  data: z14.string().min(4).max(87384).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/)
}).strict();
var uploadEnd = z14.object({ type: z14.literal("uploadEnd"), id: z14.uuid() }).strict();
var clientFrameSchema = z14.discriminatedUnion("type", [
  z14.object({ type: z14.literal("request"), id: z14.uuid(), operation: operationSchema }).strict(),
  z14.object({ type: z14.literal("cancel"), id: z14.uuid() }).strict(),
  z14.object({ type: z14.literal("ack"), id: z14.uuid(), count: z14.number().int().min(1).max(RESOURCE_WINDOW) }).strict(),
  uploadChunk,
  uploadEnd
]);
var remoteContextSchema = z14.object({ deviceId: z14.uuid(), hostId: z14.uuid(), connectionId: z14.uuid(), management: z14.boolean() }).strict();
var routedFrameSchema = z14.discriminatedUnion("type", [
  z14.object({ type: z14.literal("request"), id: z14.uuid(), operation: operationSchema, context: remoteContextSchema.optional() }).strict(),
  z14.object({ type: z14.literal("cancel"), id: z14.uuid() }).strict(),
  z14.object({ type: z14.literal("ack"), id: z14.uuid(), count: z14.number().int().min(1).max(RESOURCE_WINDOW) }).strict(),
  uploadChunk,
  uploadEnd
]);
var hostFrameSchema = z14.discriminatedUnion("type", [
  z14.object({ type: z14.literal("result"), id: z14.uuid(), value: z14.unknown() }).strict(),
  z14.object({ type: z14.literal("event"), id: z14.uuid(), value: z14.unknown() }).strict(),
  z14.object({ type: z14.literal("end"), id: z14.uuid() }).strict(),
  z14.object({ type: z14.literal("error"), id: z14.uuid(), code: z14.string().min(1).max(100) }).strict()
]);
var tokenSchema = z14.string().regex(/^[A-Za-z0-9_-]{43}$/);
var labelSchema = z14.string().trim().min(1).max(80);

// src/relay.ts
import WebSocket from "ws";

// src/session-adapter.ts
import { brandString } from "@deepseek-ai/dsh-brand";
var address2 = (value) => value.kind === "session" ? { kind: "session", sessionId: brandString(value.sessionId) } : { ...value, parentSessionId: brandString(value.parentSessionId), childSessionId: brandString(value.childSessionId) };
var SessionAdapter = class {
  constructor(service) {
    this.service = service;
  }
  requests = /* @__PURE__ */ new Map();
  async receive(raw, send) {
    const frame = clientFrameSchema.parse(raw);
    if (frame.type === "cancel") {
      this.requests.get(frame.id)?.abort();
      return;
    }
    if (frame.type === "ack" || frame.type === "uploadChunk" || frame.type === "uploadEnd") return;
    if (this.requests.has(frame.id)) throw new Error("duplicate_request_id");
    if (this.requests.size >= 256) {
      send({ type: "error", id: frame.id, code: "host_capacity" });
      return;
    }
    const controller = new AbortController(), signal = controller.signal;
    this.requests.set(frame.id, controller);
    const emit = (value) => {
      if (!signal.aborted) send(value);
    };
    try {
      const operation = frame.operation;
      if (operation.method.startsWith("remote.")) throw new Error("remote_transport_unavailable");
      if (operation.method === "session.follow" || operation.method === "session.control") {
        const stream = operation.method === "session.control" ? this.service.control(signal) : this.service.follow({ address: address2(operation.address), maxMessages: operation.maxMessages ?? 30, assistantStream: true }, signal);
        for await (const value of stream) {
          if (signal.aborted) break;
          emit({ type: "event", id: frame.id, value });
        }
        emit({ type: "end", id: frame.id });
      } else {
        let value;
        switch (operation.method) {
          case "session.list":
            value = await this.service.list({}, signal);
            break;
          case "session.page":
            value = await this.service.page({
              address: address2(operation.address),
              throughSeq: operation.throughSeq,
              beforeSeq: operation.beforeSeq,
              maxMessages: operation.maxMessages ?? 30
            }, signal);
            break;
          case "session.prompt":
            value = await this.service.prompt({
              sessionId: brandString(operation.sessionId),
              requestId: brandString(operation.requestId),
              mode: operation.mode,
              content: [{ type: "text", text: operation.text }]
            }, signal);
            break;
          case "session.cancel":
            value = this.service.cancel({ sessionId: brandString(operation.sessionId) });
            break;
        }
        emit({ type: "result", id: frame.id, value });
      }
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^[a-z][a-z0-9_/-]{0,99}$/.test(error.code) ? error.code : "session_operation_failed";
      emit({ type: "error", id: frame.id, code });
    } finally {
      this.requests.delete(frame.id);
    }
  }
  dispose() {
    for (const controller of this.requests.values()) controller.abort();
    this.requests.clear();
  }
};

// src/resource-window.ts
var ResourceWindow = class {
  credits = RESOURCE_WINDOW;
  wake;
  acknowledge(count) {
    if (this.credits + count > RESOURCE_WINDOW) throw new Error("invalid_resource_ack");
    this.credits += count;
    this.wake?.();
  }
  async take(signal) {
    signal.throwIfAborted();
    if (!this.credits) {
      await new Promise((resolve2, reject) => {
        const timer = setTimeout(() => {
          release();
          reject(new Error("resource_consumer_timeout"));
        }, 3e4);
        const aborted = () => {
          release();
          reject(signal.reason);
        };
        const release = () => {
          clearTimeout(timer);
          this.wake = void 0;
          signal.removeEventListener("abort", aborted);
        };
        this.wake = () => {
          release();
          resolve2();
        };
        signal.addEventListener("abort", aborted, { once: true });
      });
    }
    signal.throwIfAborted();
    this.credits--;
  }
};

// src/upload-body.ts
var UploadBody = class {
  constructor(signal, credit) {
    this.credit = credit;
    const abort = () => this.fail(new Error("remote_upload_cancelled"));
    signal.addEventListener("abort", abort, { once: true });
    this.detach = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) abort();
    this.body = new ReadableStream({
      pull: async (controller) => {
        while (!this.queue.length && !this.ended && !this.failure) {
          await new Promise((resolve2) => {
            const timer = setTimeout(() => this.fail(new Error("remote_upload_timeout")), 3e4);
            this.wake = () => {
              clearTimeout(timer);
              this.wake = void 0;
              resolve2();
            };
          });
        }
        if (this.failure) throw this.failure;
        const chunk = this.queue.shift();
        if (!chunk) {
          controller.close();
          this.detach();
          return;
        }
        controller.enqueue(chunk);
        if (!this.ended) {
          this.credits++;
          this.credit(1);
        }
      },
      cancel: () => this.fail(new Error("remote_upload_cancelled"))
    }, { highWaterMark: 0 });
  }
  body;
  queue = [];
  credits = RESOURCE_WINDOW;
  bytes = 0;
  ended = false;
  failure;
  wake;
  detach;
  push(data) {
    const bytes = Buffer.from(data, "base64");
    if (this.failure || this.ended || this.credits === 0 || !bytes.length || bytes.length > RESOURCE_CHUNK_BYTES || bytes.toString("base64") !== data || this.bytes + bytes.length > MAX_UPLOAD_BYTES) throw new Error("invalid_upload_chunk");
    this.credits--;
    this.bytes += bytes.length;
    this.queue.push(bytes);
    this.wake?.();
  }
  end() {
    if (this.failure || this.ended) throw new Error("invalid_upload_end");
    this.ended = true;
    this.wake?.();
  }
  fail(error = new Error("remote_upload_closed")) {
    this.failure = error;
    this.queue = [];
    this.detach();
    this.wake?.();
  }
};

// src/workspace-file-contract.ts
function workspaceFilePayload(version, endpoint2, payload) {
  if (!isProfileDshVersion(version) || endpoint2 !== "workspaceFiles/readBytes") return payload;
  const args = payload.args;
  if (!args || !Object.hasOwn(args, "range") || Object.hasOwn(args, "options")) return payload;
  const { range, ...rest } = args;
  return { ...payload, args: { ...rest, options: { range } } };
}
function workspaceFileResponse(response, rpcId, signal) {
  return fileBytesResponse(response, rpcId, signal, 65536);
}
function officeFileResponse(response, rpcId, signal) {
  return fileBytesResponse(response, rpcId, signal, MAX_OFFICE_PDF_BYTES);
}
async function fileBytesResponse(response, rpcId, signal, maxBytes) {
  if (!response.headers.get("content-type")?.startsWith("multipart/form-data")) return response.json();
  const body = await response.formData();
  signal.throwIfAborted();
  const fields4 = /* @__PURE__ */ new Map();
  for (const [name2, value] of body) {
    if (fields4.has(name2)) throw new Error("invalid_remote_response");
    fields4.set(name2, value);
  }
  const metadata = fields4.get("metadata");
  if (typeof metadata !== "string" || fields4.size !== 2) throw new Error("invalid_remote_response");
  const envelope = JSON.parse(metadata);
  const attachment = envelope?.attachments?.[0];
  if (envelope?.type !== "server-response" || envelope.rpcId !== rpcId || envelope.result?.ok !== true || envelope.result.value?.data !== null || !Array.isArray(envelope.attachments) || envelope.attachments.length !== 1 || attachment?.codec !== "bytes" || attachment.part !== "bytes-0" || JSON.stringify(attachment.path) !== '["data"]') throw new Error("invalid_remote_response");
  const bytes = fields4.get("bytes-0");
  if (!(bytes instanceof Blob) || bytes.size > maxBytes) throw new Error("invalid_remote_response");
  const data = Buffer.from(await bytes.arrayBuffer()).toString("base64");
  signal.throwIfAborted();
  return { type: envelope.type, rpcId, result: { ok: true, value: { ...envelope.result.value, data } } };
}

// src/office-preview.ts
async function streamOffice(connection, id, sessionId2, path, signal, window, emit, priority = "foreground", version = "0.1.6-alpha.2") {
  const fetch2 = connection.createSharedFetchHandler("/api").fetch;
  const rpc = async (endpoint2, args) => {
    const response = await fetch2(new Request(`http://dsh.internal/api/${endpoint2}`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "client-request",
        rpcId: id,
        method: endpoint2,
        payload: workspaceFilePayload(version, endpoint2, { args })
      })
    }));
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`remote_http_${response.status}`);
    }
    const envelope = await (!isProfileDshVersion(version) ? response.json() : endpoint2 === "officeToPdf/render" ? officeFileResponse(response, id, signal) : endpoint2 === "workspaceFiles/readBytes" ? workspaceFileResponse(response, id, signal) : response.json());
    signal.throwIfAborted();
    if (envelope?.type !== "server-response" || envelope.rpcId !== id || typeof envelope.result?.ok !== "boolean") throw new Error("invalid_remote_response");
    return envelope.result;
  };
  const result = await rpc("officeToPdf/render", { workspaceFileScopeId: sessionId2, path, priority });
  if (!result.ok) {
    emit({ type: "result", id, value: result });
    return;
  }
  const value = result.value;
  if (typeof value?.data !== "string" || value.data.length > Math.ceil(MAX_OFFICE_PDF_BYTES / 3) * 4) throw new Error("remote_office_too_large");
  const metadata = officeMetadataSchema.parse({
    absolutePath: value.absolutePath,
    version: value.version,
    bytes: value.bytes,
    generation: value.generation,
    missingFonts: value.missingFonts
  });
  if (value.offset !== 0 || value.eof !== true) throw new Error("invalid_remote_response");
  const pdf = Buffer.from(value.data, "base64");
  if (pdf.length !== metadata.bytes || pdf.toString("base64") !== value.data || !pdf.subarray(0, 8).toString("ascii").match(/^%PDF-\d\.\d/u)) throw new Error("invalid_remote_response");
  emit({ type: "event", id, value: { type: "metadata", ...metadata } });
  for (let offset = 0; offset < pdf.length; offset += RESOURCE_CHUNK_BYTES) {
    await window.take(signal);
    emit({ type: "event", id, value: { type: "chunk", offset, data: pdf.subarray(offset, offset + RESOURCE_CHUNK_BYTES).toString("base64") } });
  }
  const latest = await rpc("workspaceFiles/readBytes", { workspaceFileScopeId: sessionId2, path, range: { offset: 0, length: 1 } });
  if (!latest.ok) {
    emit({ type: "result", id, value: latest });
    return;
  }
  if (latest.value.absolutePath !== metadata.absolutePath || latest.value.version !== metadata.version) throw new Error("remote_file_changed");
  const generation = await rpc("officeToPdf/generation", {});
  if (!generation.ok) {
    emit({ type: "result", id, value: generation });
    return;
  }
  if (generation.value !== metadata.generation) throw new Error("remote_file_changed");
  emit({ type: "end", id });
}

// src/attachment-preview.ts
import { brandString as brandString2 } from "@deepseek-ai/dsh-brand";
var object = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
function findFile(events, request) {
  const content = (value) => {
    if (!Array.isArray(value)) return;
    for (const part of value) {
      const block = object(part), ref = object(block?.attachment);
      if (block?.type === "file" && ref?.attachmentId === request.attachmentId && ref.name === request.name) {
        const parsed = attachmentRefSchema.parse(ref);
        if (typeof parsed.name !== "string" || parsed.mediaType !== void 0) throw new Error("remote_attachment_invalid");
        return { attachmentId: brandString2(parsed.attachmentId), name: parsed.name, bytes: parsed.bytes };
      }
      if (block?.type === "tool-result") {
        const nested = content(block.content);
        if (nested) return nested;
      }
    }
  };
  for (const event of events) {
    const data = object(object(event)?.data);
    const ref = content(data?.content) ?? content(object(data?.message)?.content);
    if (ref) return ref;
    if (Array.isArray(data?.inserted)) for (const item of data.inserted) {
      const inserted = content(object(item)?.content);
      if (inserted) return inserted;
    }
  }
  throw new Error("remote_attachment_not_referenced");
}
async function attachmentSource(services, request, signal) {
  const sessionId2 = brandString2(request.sessionId);
  let ref, chunks, check;
  signal.throwIfAborted();
  if (request.kind === "image") {
    const result = await services.sessions.attachment({ sessionId: sessionId2, attachmentId: brandString2(request.attachmentId) });
    signal.throwIfAborted();
    ref = attachmentRefSchema.parse(result.attachment);
    if (ref.attachmentId !== request.attachmentId || !ref.mediaType || ref.bytes > 16 * 1024 * 1024 || result.data.length > Math.ceil(ref.bytes / 3) * 4) throw new Error("remote_attachment_invalid");
    const bytes = Buffer.from(result.data, "base64");
    if (bytes.length !== ref.bytes || bytes.toString("base64") !== result.data) throw new Error("remote_attachment_invalid");
    chunks = (async function* () {
      yield bytes;
    })();
    check = async () => {
      const latest = await services.sessions.attachment({ sessionId: sessionId2, attachmentId: brandString2(request.attachmentId) });
      if (latest.attachment.attachmentId !== ref.attachmentId || latest.attachment.bytes !== ref.bytes || latest.attachment.mediaType !== ref.mediaType) throw new Error("remote_attachment_invalid");
      signal.throwIfAborted();
    };
  } else {
    const found = findFile((await services.sessions.inspect(sessionId2, signal)).events, request);
    ref = attachmentRefSchema.parse(found);
    chunks = services.store.readFileStream(found, signal);
    check = async () => {
      const latest = findFile((await services.sessions.inspect(sessionId2, signal)).events, request);
      if (latest.bytes !== found.bytes) throw new Error("remote_attachment_invalid");
    };
  }
  return { ref, chunks, check };
}
async function streamAttachment(services, id, request, signal, window, emit) {
  const { ref, chunks, check } = await attachmentSource(services, request, signal);
  emit({ type: "event", id, value: { type: "metadata", attachment: ref } });
  let offset = 0;
  for await (const part of chunks) {
    signal.throwIfAborted();
    if (offset + part.byteLength > ref.bytes) throw new Error("remote_attachment_invalid");
    for (let start = 0; start < part.byteLength; start += RESOURCE_CHUNK_BYTES) {
      await window.take(signal);
      const bytes = part.subarray(start, start + RESOURCE_CHUNK_BYTES);
      emit({ type: "event", id, value: { type: "chunk", offset, data: Buffer.from(bytes).toString("base64") } });
      offset += bytes.byteLength;
    }
  }
  if (offset !== ref.bytes) throw new Error("remote_attachment_invalid");
  await check();
  signal.throwIfAborted();
  emit({ type: "end", id });
}

// src/attachment-office.ts
import { brandString as brandString3 } from "@deepseek-ai/dsh-brand";
async function streamAttachmentOffice(services, getProvider, id, request, signal, window, emit) {
  signal.throwIfAborted();
  const provider = getProvider();
  if (!provider) throw new Error("remote_office_unavailable");
  const generation = provider.generation;
  const sessionId2 = brandString3(request.sessionId);
  const ref = findFile((await services.sessions.inspect(sessionId2, signal)).events, request);
  const extension = request.name.split(".").at(-1)?.toLowerCase();
  if (!["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension ?? "")) throw new Error("remote_operation_denied");
  const version = JSON.stringify([ref.attachmentId, ref.name, ref.bytes]);
  const check = async (upstream) => {
    const current = findFile((await services.sessions.inspect(sessionId2, upstream)).events, request);
    if (current.bytes !== ref.bytes || getProvider()?.generation !== generation) throw new Error("remote_file_changed");
    upstream.throwIfAborted();
  };
  const result = await provider.convert({ extension, priority: request.priority ?? "foreground", source: {
    key: brandString3(JSON.stringify(["dsh-mobile:attachment", request.sessionId, ref.attachmentId, ref.name])),
    version,
    bytes: ref.bytes,
    // 原队列先预留容量再读源，不能在排队前缓存完整附件。
    read: async (upstream, maxBytes) => {
      await check(upstream);
      if (ref.bytes > maxBytes) throw new Error("remote_office_too_large");
      const chunks = [];
      let length = 0;
      for await (const chunk of services.store.readFileStream(ref, upstream)) {
        upstream.throwIfAborted();
        length += chunk.byteLength;
        if (length > maxBytes || length > ref.bytes) throw new Error("remote_office_too_large");
        chunks.push(chunk);
      }
      if (length !== ref.bytes) throw new Error("remote_attachment_invalid");
      await check(upstream);
      return { bytes: Buffer.concat(chunks, length), version };
    }
  } }, signal).catch((error) => {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : void 0;
    if (typeof code === "string" && ["input-too-large", "output-too-large", "invalid-document", "unsupported-format", "invalid-output", "timeout", "unavailable", "failed", "busy", "source-changed"].includes(code)) {
      emit({ type: "result", id, value: { ok: false, error: { code: "document-render/failed", message: "Office conversion failed.", details: { reason: code } } } });
      return void 0;
    }
    throw error;
  });
  if (!result) return;
  signal.throwIfAborted();
  if (result.pdf.byteLength > MAX_OFFICE_PDF_BYTES) throw new Error("remote_office_too_large");
  if (!Buffer.from(result.pdf.subarray(0, 8)).toString("ascii").match(/^%PDF-\d\.\d/u)) throw new Error("invalid_remote_response");
  const metadata = attachmentOfficeMetadataSchema.parse({
    attachmentId: ref.attachmentId,
    name: ref.name,
    bytes: result.pdf.byteLength,
    generation: result.generation,
    missingFonts: result.missingFonts
  });
  await check(signal);
  if (result.generation !== generation) throw new Error("remote_file_changed");
  emit({ type: "event", id, value: { type: "metadata", ...metadata } });
  for (let offset = 0; offset < result.pdf.byteLength; offset += RESOURCE_CHUNK_BYTES) {
    await window.take(signal);
    emit({ type: "event", id, value: { type: "chunk", offset, data: Buffer.from(result.pdf.subarray(offset, offset + RESOURCE_CHUNK_BYTES)).toString("base64") } });
  }
  await check(signal);
  if (result.generation !== generation) throw new Error("remote_file_changed");
  emit({ type: "end", id });
}

// src/changes-preview.ts
async function streamChanges(connection, id, operation, signal, window, emit) {
  const url = new URL(operation.index === void 0 ? "/api/changes.summary" : "/api/changes.diff", "http://dsh.internal");
  url.searchParams.set("sessionId", operation.sessionId);
  url.searchParams.set("seq", String(operation.seq));
  if (operation.index !== void 0) url.searchParams.set("index", String(operation.index));
  const response = await connection.createSharedFetchHandler("/api").fetch(new Request(url, { signal }));
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(response.status === 404 ? "remote_changes_missing" : "remote_changes_failed");
  }
  if (!response.headers.get("content-type")?.startsWith("application/json") || !response.body) {
    await response.body?.cancel();
    throw new Error("remote_changes_invalid");
  }
  emit({ type: "event", id, value: { type: "metadata", sessionId: operation.sessionId, seq: operation.seq, ...operation.index === void 0 ? {} : { index: operation.index } } });
  const reader = response.body.getReader();
  const abort = () => {
    void reader.cancel(signal.reason).catch(() => {
    });
  };
  signal.addEventListener("abort", abort, { once: true });
  let offset = 0;
  try {
    for (; ; ) {
      signal.throwIfAborted();
      const next = await reader.read();
      if (next.done) break;
      if (offset + next.value.byteLength > MAX_CHANGES_BYTES) throw new Error("remote_changes_too_large");
      for (let at = 0; at < next.value.byteLength; at += RESOURCE_CHUNK_BYTES) {
        await window.take(signal);
        const bytes = next.value.subarray(at, at + RESOURCE_CHUNK_BYTES);
        emit({ type: "event", id, value: { type: "chunk", offset, data: Buffer.from(bytes).toString("base64") } });
        offset += bytes.length;
      }
    }
    signal.throwIfAborted();
    emit({ type: "end", id });
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}

// src/session-export.ts
async function streamSessionExport(connection, id, operation, signal, window, emit) {
  const url = new URL("/api/session.export", "http://dsh.internal");
  url.searchParams.set("sessionId", operation.sessionId);
  url.searchParams.set("includeDescendants", String(operation.includeDescendants));
  const response = await connection.createSharedFetchHandler("/api").fetch(new Request(url, { signal }));
  if (!response.ok || !response.body || response.headers.get("content-type")?.split(";")[0] !== "application/zip") {
    await response.body?.cancel();
    throw new Error(response.status === 404 ? "remote_export_missing" : "remote_export_failed");
  }
  emit({ type: "event", id, value: { type: "metadata", sessionId: operation.sessionId, includeDescendants: operation.includeDescendants } });
  const reader = response.body.getReader();
  const abort = () => {
    void reader.cancel(signal.reason).catch(() => {
    });
  };
  signal.addEventListener("abort", abort, { once: true });
  let offset = 0;
  try {
    for (; ; ) {
      signal.throwIfAborted();
      const next = await reader.read();
      if (next.done) break;
      if (offset + next.value.byteLength > MAX_SESSION_EXPORT_BYTES) throw new Error("remote_export_too_large");
      for (let at = 0; at < next.value.byteLength; at += RESOURCE_CHUNK_BYTES) {
        await window.take(signal);
        const bytes = next.value.subarray(at, at + RESOURCE_CHUNK_BYTES);
        emit({ type: "event", id, value: { type: "chunk", offset, data: Buffer.from(bytes).toString("base64") } });
        offset += bytes.length;
      }
    }
    signal.throwIfAborted();
    emit({ type: "end", id });
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {
    });
    reader.releaseLock();
  }
}

// src/computer-settings.ts
import { randomUUID } from "node:crypto";
import { symbols } from "@deepseek-ai/cordis";
var providerIdentity = (provider) => provider && (Reflect.get(provider, symbols.original) ?? provider);
var object2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
var ComputerSettings = class {
  constructor(provider) {
    this.provider = provider;
  }
  snapshots = /* @__PURE__ */ new Map();
  read(owner2, namespace5 = "llm-deepseek") {
    try {
      const provider = this.provider();
      if (!provider) throw new Error("remote_settings_unavailable");
      const view = provider.describe({ redactSecrets: true }).find((view2) => view2.ns === namespace5);
      if (!view) throw new Error("remote_settings_unavailable");
      if (!Number.isSafeInteger(view.revision) || view.revision < 0) throw new Error("remote_settings_invalid");
      const values = object2(view.value), user = object2(view.user), base = object2(view.base);
      const projection = namespace5 === "llm-deepseek" ? computerSettingValues : pluginSettingValues[namespace5];
      if (!projection) throw new Error("remote_settings_invalid");
      const fields4 = Object.entries(projection).map(([key, schema]) => {
        const parsed = schema.safeParse(values[key]);
        if (values[key] !== void 0 && !parsed.success) throw new Error("remote_settings_invalid");
        const layers = {};
        if (namespace5 !== "llm-deepseek") {
          for (const [name2, layer] of [["base", base], ["user", user]]) {
            if (Object.hasOwn(layer, key)) {
              const result = schema.safeParse(layer[key]);
              if (!result.success) throw new Error("remote_settings_invalid");
              layers[name2] = result.data;
            }
          }
        }
        return { key, ...parsed.success ? { value: parsed.data } : {}, ...layers, overridden: Object.hasOwn(user, key) };
      });
      for (const [id, item] of this.snapshots) {
        if (item.owner === owner2 && item.namespace === namespace5 || item.expires <= Date.now()) this.snapshots.delete(id);
      }
      if (this.snapshots.size >= 128) throw new Error("remote_settings_busy");
      const snapshot = randomUUID();
      this.snapshots.set(snapshot, { owner: owner2, namespace: namespace5, providerIdentity: providerIdentity(provider), value: provider.get(namespace5), revision: view.revision, expires: Date.now() + 3e5 });
      return {
        snapshot,
        namespace: namespace5,
        revision: view.revision,
        writable: provider.writable === true,
        ...view.documentId === void 0 ? {} : { documentId: view.documentId },
        applies: view.applies === "restart" ? "restart" : "live",
        fields: fields4
      };
    } catch (error) {
      throw this.safeReadError(error);
    }
  }
  async write(owner2, raw, signal) {
    const parsed = computerSettingsWriteSchema.safeParse(raw);
    if (!parsed.success) throw new Error("remote_settings_invalid");
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot);
    const namespace5 = operation.namespace ?? "llm-deepseek";
    if (!snapshot || snapshot.owner !== owner2 || snapshot.namespace !== namespace5) throw new Error("remote_settings_stale");
    this.snapshots.delete(operation.snapshot);
    let provider;
    try {
      provider = this.provider();
    } catch {
      throw new Error("remote_settings_unavailable");
    }
    if (!provider || snapshot.expires <= Date.now() || providerIdentity(provider) !== snapshot.providerIdentity || operation.expectedRevision !== snapshot.revision)
      throw new Error("remote_settings_stale");
    try {
      signal.throwIfAborted();
      if (provider.get(namespace5) !== snapshot.value) throw new Error("remote_settings_stale");
      if (!provider.writable) throw new Error("remote_settings_read_only");
      await provider.mutate(namespace5, operation.edits.map((edit) => edit.op === "set" ? { op: "set", path: [edit.key], value: edit.value } : { op: "unset", path: [edit.key] }), operation.expectedRevision);
    } catch (error) {
      if (error instanceof Error && ["remote_settings_stale", "remote_settings_read_only"].includes(error.message)) throw new Error(error.message);
      if (object2(error).code === "SETTINGS_CONFLICT") throw new Error("remote_settings_stale");
      throw new Error("remote_settings_write_unconfirmed");
    }
    signal.throwIfAborted();
    try {
      if (providerIdentity(this.provider()) !== snapshot.providerIdentity) throw new Error("remote_settings_write_unconfirmed");
      return this.read(owner2, namespace5);
    } catch {
      throw new Error("remote_settings_write_unconfirmed");
    }
  }
  safeReadError(error) {
    const code = error instanceof Error ? error.message : "";
    return new Error(["remote_settings_unavailable", "remote_settings_invalid", "remote_settings_busy"].includes(code) ? code : "remote_settings_unavailable");
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/model-readiness.ts
import { symbols as symbols2 } from "@deepseek-ai/cordis";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
var identity = (value) => Reflect.get(value, symbols2.original) ?? value;
var child = (value, key) => value !== null && typeof value === "object" && Object.hasOwn(value, key) ? Reflect.get(value, key) : void 0;
async function readModelReadiness(services, signal) {
  const capture = () => {
    const settings = services.settings(), directory = services.directory(), credentials = services.key?.credentials();
    if (!settings || !directory || !credentials) throw Error("unavailable");
    const active = directory.listProviders(), declared = directory.listConfigurableProviders();
    const served = new Set(settings.describe({ redactSecrets: true }).map((view) => view.ns));
    const configs = new Map(declared.map((row) => [row.settingsNs, served.has(row.settingsNs) ? settings.get(row.settingsNs) : void 0]));
    const rows2 = declared.map((row) => {
      const profile = row.settingsPath.reduce(child, configs.get(row.settingsNs));
      const named = child(profile, "apiKeyEnv");
      return {
        ...row,
        active: active.some((route) => route.id === row.provider),
        ref: typeof named === "string" && named.length > 0 ? named : void 0
      };
    });
    const unmanaged = active.some((route) => !declared.some((row) => row.provider === route.id));
    return {
      settings: identity(settings),
      directory: identity(directory),
      credentials,
      configs,
      rows: rows2,
      unmanaged,
      writable: settings.writable === true,
      revision: services.key?.revision(),
      directoryState: JSON.stringify([active, declared])
    };
  };
  try {
    signal.throwIfAborted();
    const before = capture();
    let accountReady = false;
    if (before.rows.some((row) => row.active && row.provider === "deepseek-account")) {
      try {
        accountReady = await services.accountAvailable?.(signal) === true;
      } catch {
        signal.throwIfAborted();
      }
    }
    const refs = [...new Set(before.rows.filter((row) => row.provider !== "deepseek-account").map((row) => row.ref ?? `${row.provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`))];
    let statuses = /* @__PURE__ */ new Map(), failed = false;
    try {
      const values = await Promise.all(refs.map(async (name2) => {
        if (name2.toUpperCase().startsWith("DSH_MOBILE_") || name2.toUpperCase() === services.key?.enrollmentRef.toUpperCase()) throw Error("reserved");
        return [name2, await before.credentials.describe(credentialRef(name2))];
      }));
      statuses = new Map(values);
    } catch {
      failed = true;
    }
    signal.throwIfAborted();
    const after = capture();
    if (before.settings !== after.settings || before.directory !== after.directory || identity(before.credentials) !== identity(after.credentials) || before.revision !== after.revision || before.writable !== after.writable || before.directoryState !== after.directoryState || before.configs.size !== after.configs.size || [...before.configs].some(([ns2, config]) => after.configs.get(ns2) !== config))
      throw Error("remote_settings_stale");
    if (before.unmanaged || before.rows.some((row) => row.active && (row.provider === "deepseek-account" ? accountReady : row.ref === void 0 || statuses.get(row.ref)?.configured === true)))
      return { kind: "provider-ready" };
    const official = before.rows.find((row) => row.provider === "deepseek-official" && row.settingsNs === "llm-deepseek" && row.settingsPath.length === 0);
    if (!official) return { kind: "adapter-absent" };
    if (!official.active || failed || !official.ref || !before.writable || statuses.get(official.ref)?.writable !== true)
      return { kind: "unavailable" };
    return { kind: "credential-missing" };
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof Error && error.message === "remote_settings_stale") throw error;
    return { kind: "unavailable" };
  }
}

// src/preset-directory.ts
import { dirname, isAbsolute } from "node:path";
import { symbols as symbols3 } from "@deepseek-ai/cordis";
var identity2 = (value) => Reflect.get(value, symbols3.original) ?? value;
async function presetDirectory(service, id, signal) {
  signal.throwIfAborted();
  const before = service();
  if (!before) throw Error("remote_presets_unavailable");
  const preset = await before.resolve(id);
  signal.throwIfAborted();
  const after = service();
  if (!after || identity2(before) !== identity2(after)) throw Error("remote_settings_stale");
  if (preset.id !== id || preset.trust !== "user" || typeof preset.path !== "string" || !isAbsolute(preset.path)) throw Error("remote_operation_denied");
  return { opened: false, path: dirname(preset.path) };
}

// src/profile-preset-directory.ts
import { dirname as dirname2, isAbsolute as isAbsolute2 } from "node:path";
import { symbols as symbols4 } from "@deepseek-ai/cordis";
var identity3 = (value) => Reflect.get(value, symbols4.original) ?? value;
var declaredId = (entry) => {
  if (entry.options.name !== "@deepseek-ai/dsh-agent-preset" || entry.fiber?.state !== 2) return void 0;
  const config = entry.options.config;
  return config !== null && typeof config === "object" && !Array.isArray(config) ? Reflect.get(config, "id") : void 0;
};
async function profilePresetDirectory(services, id, signal) {
  signal.throwIfAborted();
  const before = services();
  if (!before) throw Error("remote_presets_unavailable");
  const entries = before.editor.entries().filter((entry2) => declaredId(entry2) === id);
  const entry = entries.length === 1 ? entries[0] : void 0;
  const documentPath = before.editor.documentPath;
  if (!entry || !isAbsolute2(documentPath)) throw Error("remote_operation_denied");
  const config = entry.options.config, fiber = entry.fiber;
  const preset = await before.presets.resolve(id);
  signal.throwIfAborted();
  const after = services();
  const current = after?.editor.entries().filter((row) => declaredId(row) === id);
  if (!after || identity3(before.presets) !== identity3(after.presets) || identity3(before.editor) !== identity3(after.editor) || after.editor.documentPath !== documentPath || entry.options.config !== config || entry.fiber !== fiber || fiber?.state !== 2 || current?.length !== 1 || current[0] !== entry) throw Error("remote_settings_stale");
  if (preset.id !== id) throw Error("remote_operation_denied");
  return { opened: false, path: dirname2(documentPath), documentPath };
}

// src/provider-settings.ts
import { randomUUID as randomUUID2 } from "node:crypto";
import { symbols as symbols5 } from "@deepseek-ai/cordis";

// src/provider-protocol.ts
import Schema from "@deepseek-ai/schemastery";
function providerProtocolChoices(schema) {
  const root = new Schema(schema);
  const node = root.dict?.providers?.inner?.dict?.api;
  return node?.type === "union" ? node.list?.flatMap((item) => typeof item.value === "string" ? [item.value] : []) ?? [] : [];
}

// src/provider-settings.ts
var namespace = "llm-pi-ai";
var object3 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
var identity4 = (provider) => Reflect.get(provider, symbols5.original) ?? provider;
var declaredRoute = (runtime, route) => runtime.listConfigurableProviders().some((row) => row.provider === route && row.settingsNs === namespace && row.settingsPath.length === 2 && row.settingsPath[0] === "providers" && row.settingsPath[1] === route && row.declared === true);
var ProviderSettings = class {
  constructor(settings, keyAvailable = () => false, directory = () => void 0) {
    this.settings = settings;
    this.keyAvailable = keyAvailable;
    this.directory = directory;
  }
  snapshots = /* @__PURE__ */ new Map();
  list() {
    try {
      const provider = this.settings();
      if (!provider) throw Error("remote_settings_unavailable");
      const profiles = object3(object3(provider.get(namespace)).providers);
      return providerDirectorySchema.parse({ providers: Object.entries(profiles).map(([route, profile]) => ({
        provider: route,
        name: typeof object3(profile).displayName === "string" ? object3(profile).displayName : route
      })) });
    } catch {
      throw Error("remote_settings_unavailable");
    }
  }
  read(owner2, rawRoute) {
    try {
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings();
      if (!provider) throw Error("remote_settings_unavailable");
      const view = provider.describe({ redactSecrets: true }).find((view2) => view2.ns === namespace);
      const profiles = object3(object3(view?.value).providers);
      if (!view || !Object.hasOwn(profiles, route)) throw Error("remote_settings_unavailable");
      const profile = object3(profiles[route]), user = object3(object3(object3(view.user).providers)[route]);
      const snapshot = randomUUID2();
      const runtime = this.directory();
      const choices = runtime && declaredRoute(runtime, route) ? providerProtocolChoices(view.schema) : [];
      const compat = (value) => Object.fromEntries(Object.entries(object3(value)).filter(([key]) => modelCompatKeys.includes(key)));
      const result = providerSettingsViewSchema.parse({
        provider: route,
        snapshot,
        revision: view.revision,
        writable: provider.writable === true,
        applies: view.applies === "restart" ? "restart" : "live",
        keySetupAvailable: this.keyAvailable() && object3(object3(object3(provider.get(namespace)).providers)[route]).apiKeyEnv === void 0,
        ...choices.length ? { protocol: { choices, ...typeof profile.api === "string" ? { value: profile.api } : {} } } : {},
        compat: { effective: compat(profile.compat), overrides: compat(user.compat) },
        fields: Object.entries(providerSettingValues).map(([key, schema]) => ({
          key,
          ...profile[key] === void 0 ? {} : { value: schema.parse(profile[key]) },
          overridden: Object.hasOwn(user, key)
        }))
      });
      for (const [id, value] of this.snapshots) if (value.owner === owner2 && value.route === route || value.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw Error("remote_settings_busy");
      this.snapshots.set(snapshot, {
        owner: owner2,
        route,
        provider: identity4(provider),
        config: provider.get(namespace),
        revision: view.revision,
        expires: Date.now() + 3e5,
        ...runtime && choices.length ? { protocol: { runtime: identity4(runtime), choices } } : {}
      });
      return result;
    } catch (error) {
      throw Error(error instanceof Error && error.message === "remote_settings_busy" ? error.message : "remote_settings_unavailable");
    }
  }
  async write(owner2, raw, signal) {
    const parsed = raw.method === "remote.providerKeySetup" ? providerKeySetupSchema.safeParse(raw) : providerSettingsWriteSchema.safeParse(raw);
    if (!parsed.success) throw Error("remote_settings_invalid");
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2 || snapshot.route !== operation.provider) throw Error("remote_settings_stale");
    this.snapshots.delete(operation.snapshot);
    let provider;
    let config;
    try {
      provider = this.settings();
      config = provider?.get(namespace);
    } catch {
      throw Error("remote_settings_unavailable");
    }
    if (!provider || identity4(provider) !== snapshot.provider || snapshot.expires <= Date.now() || snapshot.revision !== operation.expectedRevision || config !== snapshot.config) throw Error("remote_settings_stale");
    if (!provider.writable) throw Error("remote_settings_read_only");
    if (operation.method === "remote.providerSettingsWrite" && operation.protocolChange) {
      const runtime = this.directory();
      if (!snapshot.protocol || !runtime || identity4(runtime) !== snapshot.protocol.runtime || !declaredRoute(runtime, snapshot.route))
        throw Error("remote_settings_stale");
      const descriptor = provider.describe({ redactSecrets: true }).find((view) => view.ns === namespace);
      if (!descriptor || JSON.stringify(providerProtocolChoices(descriptor.schema)) !== JSON.stringify(snapshot.protocol.choices))
        throw Error("remote_settings_stale");
      if (!snapshot.protocol.choices.includes(operation.protocolChange.value)) throw Error("remote_settings_invalid");
    }
    const setup = operation.method === "remote.providerKeySetup";
    if (setup && (!this.keyAvailable() || object3(object3(object3(config).providers)[snapshot.route]).apiKeyEnv !== void 0))
      throw Error("remote_settings_stale");
    signal.throwIfAborted();
    try {
      const edits = operation.method === "remote.providerKeySetup" ? [{ op: "set", path: ["providers", snapshot.route, "apiKeyEnv"], value: `DSHM_PROVIDER_${randomUUID2().replaceAll("-", "").toUpperCase()}_API_KEY` }] : operation.edits.map((edit) => edit.op === "set" ? { op: "set", path: ["providers", snapshot.route, edit.key], value: edit.value } : { op: "unset", path: ["providers", snapshot.route, edit.key] });
      if (operation.method === "remote.providerSettingsWrite" && operation.compat !== void 0) {
        const values = object3(operation.compat);
        for (const key of modelCompatKeys) edits.push(values[key] === void 0 ? { op: "unset", path: ["providers", snapshot.route, "compat", key] } : { op: "set", path: ["providers", snapshot.route, "compat", key], value: values[key] });
      }
      if (operation.method === "remote.providerSettingsWrite" && operation.protocolChange)
        edits.push({ op: "set", path: ["providers", snapshot.route, "api"], value: operation.protocolChange.value });
      await provider.mutate(namespace, edits, snapshot.revision);
    } catch (error) {
      if (object3(error).code === "SETTINGS_CONFLICT") throw Error("remote_settings_stale");
      throw Error("remote_settings_write_unconfirmed");
    }
    signal.throwIfAborted();
    try {
      const current = this.settings();
      if (!current || identity4(current) !== snapshot.provider) throw Error("changed");
      return this.read(owner2, snapshot.route);
    } catch {
      throw Error("remote_settings_write_unconfirmed");
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/provider-card.ts
import { symbols as symbols6 } from "@deepseek-ai/cordis";
import { credentialRef as credentialRef2 } from "@deepseek-ai/dsh-credentials";
var identity5 = (value) => Reflect.get(value, symbols6.original) ?? value;
var child2 = (value, key) => value !== null && typeof value === "object" && Object.hasOwn(value, key) ? Reflect.get(value, key) : void 0;
async function readProviderCard(services, route, signal) {
  const capture = () => {
    const settings = services.settings(), directory = services.directory(), credentials = services.key?.credentials();
    if (!settings || !directory || !credentials) throw Error("remote_settings_unavailable");
    const entries = directory.listConfigurableProviders().filter((row2) => row2.provider === route);
    if (entries.length !== 1) throw Error("remote_settings_unavailable");
    const row = entries[0];
    const provider = providerCardViewSchema.shape.provider.parse({
      provider: row.provider,
      displayName: row.displayName,
      settingsNs: row.settingsNs,
      settingsPath: [...row.settingsPath],
      active: directory.listProviders().some((value) => value.id === route),
      ...row.declared === void 0 ? {} : { declared: row.declared },
      ...row.error === void 0 ? {} : { error: "\u63D0\u4F9B\u65B9\u6682\u4E0D\u53EF\u7528" }
    });
    const served = settings.describe({ redactSecrets: true }).some((view) => view.ns === provider.settingsNs);
    const config = served ? settings.get(provider.settingsNs) : void 0;
    const profile = provider.settingsPath.reduce(child2, config);
    const configured = served && (provider.settingsPath.length === 0 || profile !== void 0);
    const named = child2(profile, "apiKeyEnv");
    const refName = typeof named === "string" && named.length > 0 ? named : `${route.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
    if (refName.toUpperCase().startsWith("DSH_MOBILE_") || refName.toUpperCase() === services.key?.enrollmentRef.toUpperCase())
      throw Error("remote_settings_unavailable");
    return {
      settings: identity5(settings),
      directory: identity5(directory),
      credentials,
      config,
      provider,
      configured,
      ref: credentialRef2(refName),
      revision: services.key?.revision()
    };
  };
  try {
    signal.throwIfAborted();
    const before = capture(), info = await before.credentials.describe(before.ref);
    signal.throwIfAborted();
    const after = capture();
    if (before.settings !== after.settings || before.directory !== after.directory || identity5(before.credentials) !== identity5(after.credentials) || before.config !== after.config || before.ref !== after.ref || before.revision !== after.revision || JSON.stringify(before.provider) !== JSON.stringify(after.provider))
      throw Error("remote_settings_stale");
    return providerCardViewSchema.parse({ provider: before.provider, configured: before.configured, keyConfigured: info.configured });
  } catch (error) {
    signal.throwIfAborted();
    throw Error(error instanceof Error && error.message === "remote_settings_stale" ? error.message : "remote_settings_unavailable");
  }
}

// src/provider-removal.ts
import { randomUUID as randomUUID3 } from "node:crypto";
import { symbols as symbols7 } from "@deepseek-ai/cordis";
var namespace2 = "llm-pi-ai";
var record = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
var identity6 = (provider) => Reflect.get(provider, symbols7.original) ?? provider;
var ProviderRemoval = class {
  constructor(settings) {
    this.settings = settings;
  }
  snapshots = /* @__PURE__ */ new Map();
  read(owner2, rawRoute) {
    try {
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings();
      if (!provider) throw Error("unavailable");
      const view = provider.describe({ redactSecrets: true }).find((item) => item.ns === namespace2);
      const config = provider.get(namespace2), profiles = record(record(config).providers);
      if (!view || !Object.hasOwn(profiles, route)) throw Error("unavailable");
      const profile = record(profiles[route]), snapshot = randomUUID3();
      const result = providerRemovalViewSchema.parse({
        provider: route,
        name: typeof profile.displayName === "string" ? profile.displayName : route,
        snapshot,
        revision: view.revision,
        writable: provider.writable === true,
        removable: Object.hasOwn(record(record(view.user).providers), route) && !Object.hasOwn(record(record(view.base).providers), route),
        removed: false,
        keepsCredential: typeof profile.apiKeyEnv === "string",
        applies: view.applies === "restart" ? "restart" : "live"
      });
      for (const [id, entry] of this.snapshots) if (entry.owner === owner2 && entry.view.provider === route || entry.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw Error("remote_settings_busy");
      this.snapshots.set(snapshot, { owner: owner2, provider: identity6(provider), config, view: result, expires: Date.now() + 3e5 });
      return result;
    } catch (error) {
      throw Error(error instanceof Error && error.message === "remote_settings_busy" ? error.message : "remote_settings_unavailable");
    }
  }
  async remove(owner2, raw, signal) {
    const parsed = providerRemovalWriteSchema.safeParse(raw);
    if (!parsed.success) throw Error("remote_settings_invalid");
    const operation = parsed.data, entry = this.snapshots.get(operation.snapshot);
    if (!entry || entry.owner !== owner2 || entry.view.provider !== operation.provider) throw Error("remote_settings_stale");
    this.snapshots.delete(operation.snapshot);
    let provider;
    try {
      provider = this.settings();
    } catch {
      throw Error("remote_settings_unavailable");
    }
    if (!provider || identity6(provider) !== entry.provider || entry.expires <= Date.now() || entry.view.revision !== operation.expectedRevision) throw Error("remote_settings_stale");
    try {
      if (provider.get(namespace2) !== entry.config) throw Error("changed");
    } catch {
      throw Error("remote_settings_stale");
    }
    if (!provider.writable) throw Error("remote_settings_read_only");
    if (!entry.view.removable) throw Error("remote_provider_inherited");
    signal.throwIfAborted();
    try {
      await provider.mutate(namespace2, [{ op: "unset", path: ["providers", operation.provider] }], operation.expectedRevision);
      signal.throwIfAborted();
      const current = this.settings();
      if (!current || identity6(current) !== entry.provider || Object.hasOwn(record(record(current.get(namespace2)).providers), operation.provider)) throw Error("changed");
      return { ...entry.view, removed: true, removable: false, writable: false };
    } catch (error) {
      if (record(error).code === "SETTINGS_CONFLICT") throw Error("remote_settings_stale");
      throw Error("remote_settings_write_unconfirmed");
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/provider-creation.ts
import { randomUUID as randomUUID4 } from "node:crypto";
import { symbols as symbols8 } from "@deepseek-ai/cordis";
var ns = "llm-pi-ai";
var record2 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
var identity7 = (value) => Reflect.get(value, symbols8.original) ?? value;
var ProviderCreation = class {
  constructor(settings, runtime, keyAvailable) {
    this.settings = settings;
    this.runtime = runtime;
    this.keyAvailable = keyAvailable;
  }
  snapshots = /* @__PURE__ */ new Map();
  current() {
    const settings = this.settings(), runtime = this.runtime();
    if (!settings || !runtime) throw Error("remote_settings_unavailable");
    const descriptor = settings.describe({ redactSecrets: true }).find((item) => item.ns === ns);
    if (!descriptor) throw Error("remote_settings_unavailable");
    const config = settings.get(ns), profiles = record2(record2(config).providers);
    const directory = runtime.listConfigurableProviders(), registered = runtime.listProviders();
    const protocols = providerProtocolChoices(descriptor.schema);
    const available = directory.filter((item) => item.settingsNs === ns && item.settingsPath.length === 2 && item.settingsPath[0] === "providers" && item.settingsPath[1] === item.provider && !Object.hasOwn(profiles, item.provider)).map((item) => ({ provider: item.provider, name: item.displayName }));
    const taken = [.../* @__PURE__ */ new Set([...Object.keys(profiles), ...directory.map((item) => item.provider), ...registered.map((item) => item.id)])].sort();
    return { settings, runtime, descriptor, config, protocols, available, taken, directory: JSON.stringify({ available, taken }) };
  }
  read(owner2) {
    try {
      const current = this.current(), snapshot = randomUUID4();
      const result = providerCreationViewSchema.parse({
        snapshot,
        revision: current.descriptor.revision,
        writable: current.settings.writable === true,
        applies: current.descriptor.applies === "restart" ? "restart" : "live",
        keyAvailable: this.keyAvailable(),
        protocols: current.protocols,
        available: current.available,
        taken: current.taken
      });
      for (const [id, value] of this.snapshots) if (value.owner === owner2 || value.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw Error("remote_settings_busy");
      this.snapshots.set(snapshot, {
        owner: owner2,
        settings: identity7(current.settings),
        runtime: identity7(current.runtime),
        config: current.config,
        directory: current.directory,
        view: result,
        expires: Date.now() + 3e5
      });
      return result;
    } catch (error) {
      throw Error(error instanceof Error && error.message === "remote_settings_busy" ? error.message : "remote_settings_unavailable");
    }
  }
  async create(owner2, raw, signal) {
    const parsed = providerCreationWriteSchema.safeParse(raw);
    if (!parsed.success) throw Error("remote_settings_invalid");
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2) throw Error("remote_settings_stale");
    this.snapshots.delete(operation.snapshot);
    let current;
    try {
      current = this.current();
    } catch {
      throw Error("remote_settings_stale");
    }
    if (snapshot.expires <= Date.now() || snapshot.view.revision !== operation.expectedRevision || snapshot.config !== current.config || snapshot.settings !== identity7(current.settings) || snapshot.runtime !== identity7(current.runtime) || snapshot.directory !== current.directory) throw Error("remote_settings_stale");
    if (!current.settings.writable) throw Error("remote_settings_read_only");
    if (operation.kind === "catalog" ? !current.available.some((row) => row.provider === operation.provider) : current.taken.includes(operation.provider) || !current.protocols.includes(operation.api)) throw Error("remote_settings_invalid");
    if (operation.useKey && !this.keyAvailable()) throw Error("remote_settings_unavailable");
    signal.throwIfAborted();
    const profile = {
      ...operation.name ? { displayName: operation.name } : {},
      // 独立随机引用避免新建路由误用电脑中同名环境凭据；Key内容仅走既有原生窗口。
      ...operation.useKey ? { apiKeyEnv: `DSHM_PROVIDER_${randomUUID4().replaceAll("-", "").toUpperCase()}_API_KEY` } : {},
      ...operation.kind === "custom" ? {
        api: operation.api,
        baseURL: operation.baseURL,
        models: operation.models.map((row) => typeof row === "string" ? { id: row } : { ...row })
      } : {}
    };
    try {
      await current.settings.mutate(ns, [{ op: "set", path: ["providers", operation.provider], value: profile }], operation.expectedRevision);
      signal.throwIfAborted();
      const after = this.settings();
      if (!after || identity7(after) !== snapshot.settings || !Object.hasOwn(record2(record2(after.get(ns)).providers), operation.provider)) throw Error("changed");
      return { ...snapshot.view, writable: false, created: { provider: operation.provider, useKey: operation.useKey } };
    } catch (error) {
      if (record2(error).code === "SETTINGS_CONFLICT") throw Error("remote_settings_stale");
      throw Error("remote_settings_write_unconfirmed");
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/provider-models.ts
import { randomUUID as randomUUID5 } from "node:crypto";
import { symbols as symbols9 } from "@deepseek-ai/cordis";
var object4 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
var identity8 = (value) => Reflect.get(value, symbols9.original) ?? value;
var fields3 = ["id", "name", "contextWindow", "maxTokens"];
var advancedFields = ["input", "reasoningEfforts"];
var ProviderModels = class {
  constructor(settings, namespace5 = "llm-pi-ai") {
    this.settings = settings;
    this.namespace = namespace5;
  }
  snapshots = /* @__PURE__ */ new Map();
  read(owner2, rawRoute, scope) {
    try {
      const namespace5 = this.namespace, official = namespace5 === "llm-deepseek";
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings();
      if (official && (route !== "deepseek" || scope !== void 0)) throw Error("remote_settings_unavailable");
      if (!provider) throw Error("remote_settings_unavailable");
      const config = provider.get(namespace5), profiles = official ? { deepseek: config } : object4(object4(config).providers);
      const view = provider.describe({ redactSecrets: true }).find((view2) => view2.ns === namespace5);
      if (!view || !Object.hasOwn(profiles, route)) throw Error("remote_settings_unavailable");
      const profile = object4(profiles[route]), user = official ? object4(view.user) : object4(object4(object4(view.user).providers)[route]);
      const models = scope === "overrides" ? Object.entries(object4(user.modelOverrides)).map(([id, value]) => ({ ...object4(value), id })) : profile.models ?? [];
      if (!Array.isArray(models)) throw Error("remote_settings_unavailable");
      const originals = /* @__PURE__ */ new Map();
      const rows2 = models.map((value) => {
        const source = randomUUID5(), row = object4(value);
        originals.set(source, structuredClone(row));
        return {
          source,
          ...Object.fromEntries(fields3.flatMap((key) => row[key] === void 0 ? [] : [[key, row[key]]])),
          advanced: official ? row.inputModalities === void 0 ? {} : { input: row.inputModalities } : Object.fromEntries(advancedFields.flatMap((key) => row[key] === void 0 ? [] : [[key, row[key]]])),
          ...official ? {} : { compat: Object.fromEntries(modelCompatKeys.flatMap((key) => object4(row.compat)[key] === void 0 ? [] : [[key, object4(row.compat)[key]]])) }
        };
      });
      const snapshot = randomUUID5();
      const result = providerModelsViewSchema.parse({
        provider: route,
        snapshot,
        revision: view.revision,
        ...scope ? { scope, blockedByModels: Array.isArray(profile.models) && profile.models.length > 0 } : {},
        writable: provider.writable,
        applies: view.applies === "restart" ? "restart" : "live",
        overridden: Object.hasOwn(user, scope ? "modelOverrides" : "models"),
        advancedEditable: true,
        compatEditable: !official,
        rows: rows2
      });
      for (const [id, item] of this.snapshots) if (item.owner === owner2 && item.route === route && item.scope === scope || item.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw Error("remote_settings_busy");
      this.snapshots.set(snapshot, { owner: owner2, route, scope, provider: identity8(provider), config, revision: view.revision, expires: Date.now() + 3e5, rows: originals });
      return result;
    } catch (error) {
      throw Error(error instanceof Error && error.message === "remote_settings_busy" ? error.message : "remote_settings_unavailable");
    }
  }
  async write(owner2, raw, signal) {
    const namespace5 = this.namespace, official = namespace5 === "llm-deepseek";
    if (official && (raw.provider !== "deepseek" || raw.scope !== void 0 || !deepSeekModelsWriteSchema.safeParse({
      method: "remote.deepSeekModelsWrite",
      snapshot: raw.snapshot,
      expectedRevision: raw.expectedRevision,
      change: raw.change
    }).success)) throw Error("remote_settings_invalid");
    const parsed = providerModelsWriteSchema.safeParse(raw);
    if (!parsed.success) throw Error("remote_settings_invalid");
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2 || snapshot.route !== operation.provider || snapshot.scope !== operation.scope) throw Error("remote_settings_stale");
    const rows2 = operation.change.op === "set" ? operation.change.rows.map((row) => {
      if (row.source && !snapshot.rows.has(row.source)) throw Error("remote_settings_stale");
      const value = { ...row.source ? snapshot.rows.get(row.source) : {} };
      for (const field of fields3) {
        delete value[field];
        if (row[field] !== void 0) value[field] = row[field];
      }
      if (official && row.advanced !== void 0) {
        delete value.inputModalities;
        if (row.advanced.input !== void 0) value.inputModalities = row.advanced.input;
      } else if (row.advanced !== void 0) for (const field of advancedFields) {
        delete value[field];
        if (row.advanced[field] !== void 0) value[field] = row.advanced[field];
      }
      if (row.compat !== void 0) {
        const compat = { ...object4(value.compat) }, updates = object4(row.compat);
        for (const field of modelCompatKeys) {
          delete compat[field];
          if (updates[field] !== void 0) compat[field] = updates[field];
        }
        if (Object.keys(compat).length) value.compat = compat;
        else delete value.compat;
      }
      return value;
    }) : void 0;
    this.snapshots.delete(operation.snapshot);
    let provider, config;
    try {
      provider = this.settings();
      config = provider?.get(namespace5);
    } catch {
      throw Error("remote_settings_unavailable");
    }
    if (!provider || identity8(provider) !== snapshot.provider || config !== snapshot.config || operation.expectedRevision !== snapshot.revision || snapshot.expires <= Date.now()) throw Error("remote_settings_stale");
    if (!provider.writable) throw Error("remote_settings_read_only");
    signal.throwIfAborted();
    try {
      const path = official ? ["models"] : ["providers", snapshot.route, snapshot.scope ? "modelOverrides" : "models"];
      if (snapshot.scope) {
        const changes = [{ op: "unset", path }];
        if (rows2?.length) changes.push({ op: "set", path, value: Object.fromEntries(rows2.map(({ id, ...value }) => [String(id), value])) });
        await provider.mutate(namespace5, changes, snapshot.revision);
      } else await provider.mutate(namespace5, rows2 === void 0 ? [{ op: "unset", path }] : [{ op: "set", path, value: rows2 }], snapshot.revision);
    } catch (error) {
      if (object4(error).code === "SETTINGS_CONFLICT") throw Error("remote_settings_stale");
      throw Error("remote_settings_write_unconfirmed");
    }
    signal.throwIfAborted();
    try {
      const next = this.settings();
      if (!next || identity8(next) !== snapshot.provider) throw Error("changed");
      return this.read(owner2, snapshot.route, snapshot.scope);
    } catch {
      throw Error("remote_settings_write_unconfirmed");
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/provider-model-discovery.ts
import { symbols as symbols10 } from "@deepseek-ai/cordis";
var namespace3 = "llm-pi-ai";
var object5 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
var identity9 = (service) => Reflect.get(service, symbols10.original) ?? service;
async function discoverProviderModels(rawRoute, settings, runtime, signal) {
  try {
    const route = providerRouteSchema.parse(rawRoute), provider = settings(), llm = runtime();
    if (!provider || !llm) throw Error("remote_settings_unavailable");
    const config = provider.get(namespace3), profiles = object5(object5(config).providers);
    if (!Object.hasOwn(profiles, route)) throw Error("remote_settings_unavailable");
    const profile = object5(profiles[route]);
    const request = { provider: route };
    if (typeof profile.baseURL === "string") request.baseURL = profile.baseURL;
    if (typeof profile.api === "string") request.api = profile.api;
    signal.throwIfAborted();
    const rows2 = await llm.discoverModels(namespace3, request, AbortSignal.any([signal, AbortSignal.timeout(2e4)]));
    signal.throwIfAborted();
    const latest = settings(), currentRuntime = runtime();
    if (!latest || !currentRuntime || identity9(latest) !== identity9(provider) || latest.get(namespace3) !== config || identity9(currentRuntime) !== identity9(llm)) throw Error("remote_settings_stale");
    return providerModelsDiscoveryViewSchema.parse({ provider: route, rows: rows2.map((row) => ({
      id: row.id,
      ...row.name === void 0 ? {} : { name: row.name },
      ...row.contextWindow === void 0 ? {} : { contextWindow: row.contextWindow },
      ...row.maxTokens === void 0 ? {} : { maxTokens: row.maxTokens },
      ...row.inputModalities === void 0 ? {} : { inputModalities: row.inputModalities }
    })) });
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof Error && ["remote_settings_unavailable", "remote_settings_stale"].includes(error.message)) throw error;
    throw Error("remote_model_discovery_failed");
  }
}

// src/model-probe.ts
import { randomUUID as randomUUID6 } from "node:crypto";
import { symbols as symbols11 } from "@deepseek-ai/cordis";
var identity10 = (value) => Reflect.get(value, symbols11.original) ?? value;
var record3 = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var ModelProbe = class {
  constructor(services, now = Date.now) {
    this.services = services;
    this.now = now;
  }
  snapshots = /* @__PURE__ */ new Map();
  active = /* @__PURE__ */ new Map();
  disposed = false;
  async available() {
    const runtime = this.services.runtime(), settings = this.services.settings();
    const revision = this.services.credentialRevision();
    if (this.disposed || !runtime || !settings || !Number.isSafeInteger(revision) || revision < 0) return false;
    try {
      await runtime.discoverModels("dshm.pi-ai-endpoint-v2", {});
      return false;
    } catch (error) {
      return !this.disposed && identity10(runtime) === identity10(this.services.runtime() ?? {}) && identity10(settings) === identity10(this.services.settings() ?? {}) && record3(error).code === "INVALID_DISCOVERY";
    }
  }
  current(owner2) {
    if (this.disposed || !this.services.permitted(owner2)) throw Error("remote_management_required");
    const settings = this.services.settings(), runtime = this.services.runtime();
    if (!settings || !runtime) throw Error("remote_settings_unavailable");
    const descriptor = settings.describe({ redactSecrets: true }).find((item) => item.ns === "llm-pi-ai");
    const credentials = this.services.credentialRevision();
    if (!descriptor || !Number.isSafeInteger(descriptor.revision) || descriptor.revision < 0 || !Number.isSafeInteger(credentials) || credentials < 0) throw Error("remote_settings_unavailable");
    return { settings: identity10(settings), runtime: identity10(runtime), config: settings.get("llm-pi-ai"), revision: descriptor.revision, credentials };
  }
  prepare(owner2, raw) {
    const request = modelProbePrepareSchema.safeParse(raw);
    if (!request.success) throw Error("remote_model_probe_invalid");
    const state = this.current(owner2), { baseURL, api, authentication: authentication2 } = request.data;
    if (authentication2.mode === "stored" && !Object.hasOwn(record3(record3(state.config).providers), authentication2.provider)) throw Error("remote_settings_unavailable");
    if (this.active.has(owner2)) throw Error("remote_settings_busy");
    for (const [id, entry] of this.snapshots) if (entry.owner === owner2 || entry.view.expiresAt <= this.now()) this.snapshots.delete(id);
    if (this.snapshots.size >= 128) throw Error("remote_settings_busy");
    const view = modelProbePreparedSchema.parse({ snapshot: randomUUID6(), expiresAt: this.now() + 3e5, baseURL, api, authentication: authentication2 });
    this.snapshots.set(view.snapshot, { owner: owner2, state, view });
    return modelProbePreparedSchema.parse(view);
  }
  validate(owner2, prepared) {
    const current = this.current(owner2);
    if (prepared.view.expiresAt <= this.now() || Object.keys(current).some((key) => current[key] !== prepared.state[key])) throw Error("remote_settings_stale");
  }
  async execute(owner2, raw, signal) {
    const parsed = modelProbeExecuteSchema.safeParse(raw);
    if (!parsed.success) throw Error("remote_model_probe_invalid");
    const operation = parsed.data, prepared = this.snapshots.get(operation.snapshot);
    if (!prepared || prepared.owner !== owner2) throw Error("remote_settings_stale");
    this.snapshots.delete(operation.snapshot);
    if (operation.mode !== prepared.view.authentication.mode) throw Error("remote_model_probe_invalid");
    this.validate(owner2, prepared);
    signal.throwIfAborted();
    if (this.active.has(owner2)) throw Error("remote_settings_busy");
    const controller = new AbortController(), fused = AbortSignal.any([signal, controller.signal, AbortSignal.timeout(2e4)]);
    this.active.set(owner2, controller);
    try {
      const { baseURL, api, authentication: authentication2 } = prepared.view;
      const rows2 = await this.services.runtime().discoverModels("dshm.pi-ai-endpoint-v2", {
        baseURL,
        api,
        ...authentication2.mode === "stored" ? { provider: authentication2.provider } : {},
        ...operation.mode === "temporary" ? { apiKey: operation.apiKey } : {}
      }, fused);
      fused.throwIfAborted();
      this.validate(owner2, prepared);
      return modelProbeResultSchema.parse({ rows: rows2.map((row) => ({
        id: row.id,
        ...row.name === void 0 ? {} : { name: row.name },
        ...row.contextWindow === void 0 ? {} : { contextWindow: row.contextWindow },
        ...row.maxTokens === void 0 ? {} : { maxTokens: row.maxTokens },
        ...row.inputModalities === void 0 ? {} : { inputModalities: row.inputModalities }
      })) });
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof Error && ["remote_settings_stale", "remote_management_required"].includes(error.message)) throw error;
      throw Error("remote_model_discovery_failed");
    } finally {
      this.active.delete(owner2);
    }
  }
  invalidate(owner2) {
    for (const [id, entry] of this.snapshots) if (entry.owner === owner2) this.snapshots.delete(id);
    this.active.get(owner2)?.abort();
  }
  dispose() {
    this.disposed = true;
    this.snapshots.clear();
    for (const controller of this.active.values()) controller.abort();
  }
};

// src/computer-key.ts
import { randomUUID as randomUUID7 } from "node:crypto";
import { symbols as symbols12 } from "@deepseek-ai/cordis";
import { credentialRef as credentialRef3 } from "@deepseek-ai/dsh-credentials";
var defaultRef = "DEEPSEEK_API_KEY";
var identity11 = (provider) => Reflect.get(provider, symbols12.original) ?? provider;
var sameTarget = (left, right) => typeof left === "object" && typeof right === "object" ? left.provider === right.provider : left === right;
var ComputerKey = class {
  constructor(services, target2) {
    this.services = services;
    this.target = target2;
  }
  snapshots = /* @__PURE__ */ new Map();
  busy = false;
  current(target2 = this.target) {
    const provider = this.services.credentials();
    const root = this.services.settings()?.get(typeof target2 === "object" ? "llm-pi-ai" : target2 ?? "llm-deepseek");
    let config = root;
    if (typeof target2 === "object") {
      const profiles = root && typeof root === "object" ? Reflect.get(root, "providers") : void 0;
      config = profiles && typeof profiles === "object" && !Array.isArray(profiles) && Object.hasOwn(profiles, target2.provider) ? Reflect.get(profiles, target2.provider) : void 0;
    }
    if (!provider || !config || typeof config !== "object" || Array.isArray(config)) throw new Error("remote_key_unavailable");
    const configuredRef = Reflect.get(config, "apiKeyEnv") ?? (typeof target2 === "object" ? void 0 : defaultRef);
    if (typeof configuredRef !== "string" || configuredRef.toUpperCase() === this.services.enrollmentRef.toUpperCase() || configuredRef.toUpperCase().startsWith("DSH_MOBILE_")) throw new Error("remote_key_reference_unsupported");
    let ref;
    try {
      ref = credentialRef3(configuredRef);
    } catch {
      throw new Error("remote_key_reference_unsupported");
    }
    const literal = target2 === "web-search-deepseek" && typeof Reflect.get(config, "apiKey") === "string" && Reflect.get(config, "apiKey").length > 0;
    return { provider, config, ref, literal, revision: this.services.revision() };
  }
  async read(owner2, rawTarget = this.target) {
    try {
      const target2 = rawTarget === void 0 ? void 0 : computerKeyTargetSchema.parse(rawTarget);
      const current = this.current(target2), info = current.literal ? { configured: true, writable: false } : await current.provider.describe(current.ref), after = this.current(target2);
      if (identity11(current.provider) !== identity11(after.provider) || current.config !== after.config || current.ref !== after.ref || current.revision !== after.revision)
        throw new Error("remote_key_stale");
      if (typeof info.configured !== "boolean" || typeof info.writable !== "boolean") throw new Error("remote_key_unavailable");
      for (const [id, item] of this.snapshots) if (item.owner === owner2 || item.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw new Error("remote_key_busy");
      const snapshot = randomUUID7();
      this.snapshots.set(snapshot, {
        owner: owner2,
        target: target2,
        provider: identity11(current.provider),
        config: current.config,
        ref: current.ref,
        revision: current.revision,
        expires: Date.now() + 3e5,
        writable: info.writable
      });
      return {
        snapshot,
        provider: typeof target2 === "object" ? target2.provider : target2 ? "deepseek-search" : "deepseek-official",
        ...typeof target2 === "object" ? { target: target2 } : {},
        configured: info.configured,
        writable: info.writable
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      throw new Error(["remote_key_stale", "remote_key_busy", "remote_key_reference_unsupported"].includes(code) ? code : "remote_key_unavailable");
    }
  }
  async write(owner2, raw, signal) {
    const parsed = computerKeyWriteSchema.safeParse(raw);
    if (!parsed.success || typeof parsed.data.target !== "object" && parsed.data.target !== this.target) throw new Error("remote_key_invalid");
    if (this.busy) throw new Error("remote_key_busy");
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2) throw new Error("remote_key_stale");
    if (!sameTarget(operation.target, snapshot.target)) throw new Error("remote_key_invalid");
    this.snapshots.delete(operation.snapshot);
    let current;
    try {
      current = this.current(operation.target);
    } catch {
      throw new Error("remote_key_stale");
    }
    if (snapshot.expires <= Date.now() || snapshot.config !== current.config || snapshot.provider !== identity11(current.provider) || snapshot.ref !== current.ref || snapshot.revision !== current.revision) throw new Error("remote_key_stale");
    if (!snapshot.writable) throw new Error("remote_key_read_only");
    signal.throwIfAborted();
    this.busy = true;
    try {
      if (operation.change.op === "set") await current.provider.set(current.ref, operation.change.value);
      else await current.provider.unset(current.ref);
      signal.throwIfAborted();
      const after = this.current(operation.target);
      if (snapshot.config !== after.config || snapshot.ref !== after.ref || snapshot.provider !== identity11(after.provider)) throw new Error("changed");
      this.snapshots.clear();
      return await this.read(owner2, operation.target);
    } catch {
      throw new Error("remote_key_write_unconfirmed");
    } finally {
      this.busy = false;
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/computer-endpoint.ts
import { randomUUID as randomUUID8 } from "node:crypto";
import { symbols as symbols13 } from "@deepseek-ai/cordis";
import { resolveAdapterOptions } from "@deepseek-ai/dsh-llm-deepseek";
import { DEEPSEEK_DEFAULT_BASE_URL } from "@deepseek-ai/dsh-web-search-deepseek";
var identity12 = (value) => Reflect.get(value, symbols13.original) ?? value;
var record4 = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var ComputerEndpoint = class {
  constructor(provider, environment, target2) {
    this.provider = provider;
    this.environment = environment;
    this.target = target2;
  }
  snapshots = /* @__PURE__ */ new Map();
  get namespace() {
    return this.target ?? "llm-deepseek";
  }
  options(raw, environment) {
    if (this.target) return {
      protocol: "messages",
      baseURL: raw.baseURL ?? environment.get("DEEPSEEK_SEARCH_BASE_URL")?.value ?? DEEPSEEK_DEFAULT_BASE_URL
    };
    const options = resolveAdapterOptions(raw, environment);
    return { ...options, protocol: "protocol" in options ? options.protocol : "messages" };
  }
  read(owner2) {
    try {
      const provider = this.provider();
      if (!provider) throw new Error("unavailable");
      const view = provider.describe({ redactSecrets: true }).find((item) => item.ns === this.namespace);
      if (!view || !Number.isSafeInteger(view.revision) || view.revision < 0) throw new Error("invalid");
      const config = provider.get(this.namespace), raw = record4(config), environment = this.environment();
      const options = this.options(raw, environment);
      const inherited = this.options({ ...raw, baseURL: record4(view.base).baseURL }, environment);
      const url = new URL(options.baseURL), fallback = new URL(inherited.baseURL);
      if (![url, fallback].every((item) => ["https:", "http:"].includes(item.protocol))) throw new Error("invalid");
      for (const [id, item] of this.snapshots) if (item.owner === owner2 || item.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw new Error("capacity");
      const snapshot = randomUUID8();
      this.snapshots.set(snapshot, { owner: owner2, provider: identity12(provider), config, revision: view.revision, expires: Date.now() + 3e5 });
      return {
        snapshot,
        ...this.target ? { target: this.target } : {},
        revision: view.revision,
        writable: provider.writable === true,
        applies: view.applies === "restart" ? "restart" : "live",
        protocol: options.protocol,
        origin: url.origin,
        inheritedOrigin: fallback.origin,
        customPath: url.pathname !== "/",
        overridden: Object.hasOwn(record4(view.user), "baseURL")
      };
    } catch {
      throw new Error("remote_endpoint_unavailable");
    }
  }
  async write(owner2, raw, signal) {
    const parsed = computerEndpointWriteSchema.safeParse(raw);
    if (!parsed.success || parsed.data.target !== this.target) throw new Error("remote_endpoint_invalid");
    const operation = parsed.data, snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2) throw new Error("remote_endpoint_stale");
    this.snapshots.delete(operation.snapshot);
    let provider;
    try {
      provider = this.provider();
    } catch {
      throw new Error("remote_endpoint_stale");
    }
    if (!provider || snapshot.expires <= Date.now() || snapshot.provider !== identity12(provider) || snapshot.config !== provider.get(this.namespace) || snapshot.revision !== operation.expectedRevision) throw new Error("remote_endpoint_stale");
    if (!provider.writable) throw new Error("remote_endpoint_read_only");
    signal.throwIfAborted();
    try {
      await provider.mutate(this.namespace, [operation.change.op === "set" ? { op: "set", path: ["baseURL"], value: operation.change.value } : { op: "unset", path: ["baseURL"] }], operation.expectedRevision);
      signal.throwIfAborted();
      if (identity12(this.provider()) !== snapshot.provider) throw new Error("changed");
      return this.read(owner2);
    } catch (error) {
      if (record4(error).code === "SETTINGS_CONFLICT") throw new Error("remote_endpoint_stale");
      throw new Error("remote_endpoint_write_unconfirmed");
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/provider-endpoint.ts
import { randomUUID as randomUUID9 } from "node:crypto";
import { symbols as symbols14 } from "@deepseek-ai/cordis";
var namespace4 = "llm-pi-ai";
var record5 = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
var identity13 = (provider) => Reflect.get(provider, symbols14.original) ?? provider;
var endpoint = (value) => {
  if (value === void 0) return null;
  if (typeof value !== "string") throw Error("invalid");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw Error("invalid");
  return url;
};
var ProviderEndpoint = class {
  constructor(settings, directory) {
    this.settings = settings;
    this.directory = directory;
  }
  snapshots = /* @__PURE__ */ new Map();
  resettable(provider, route) {
    const view = provider.describe({ redactSecrets: true }).find((item) => item.ns === namespace4);
    if (endpoint(record5(record5(record5(view?.base).providers)[route]).baseURL)) return true;
    try {
      const matches = this.directory?.()?.listConfigurableProviders().filter((entry) => entry.provider === route && entry.settingsNs === namespace4 && entry.settingsPath.length === 2 && entry.settingsPath[0] === "providers" && entry.settingsPath[1] === route);
      return matches?.length === 1 && matches[0].declared === false;
    } catch {
      return false;
    }
  }
  read(owner2, rawRoute, resetPolicy = false) {
    try {
      const route = providerRouteSchema.parse(rawRoute), provider = this.settings();
      if (!provider) throw Error("unavailable");
      const view = provider.describe({ redactSecrets: true }).find((item) => item.ns === namespace4);
      const config = provider.get(namespace4), profiles = record5(record5(config).providers);
      if (!view || !Object.hasOwn(profiles, route)) throw Error("unavailable");
      const current = endpoint(record5(profiles[route]).baseURL);
      const inherited = endpoint(record5(record5(record5(view.base).providers)[route]).baseURL);
      const user = record5(record5(record5(view.user).providers)[route]);
      const resettable = this.resettable(provider, route);
      const snapshot = randomUUID9();
      const result = computerEndpointViewSchema.parse({
        snapshot,
        target: { provider: route },
        revision: view.revision,
        writable: provider.writable === true,
        applies: view.applies === "restart" ? "restart" : "live",
        protocol: "provider",
        origin: current?.origin ?? null,
        inheritedOrigin: inherited?.origin ?? null,
        customPath: !!current && current.pathname !== "/",
        overridden: Object.hasOwn(user, "baseURL"),
        ...resetPolicy ? { resettable } : {}
      });
      for (const [id, entry] of this.snapshots) if (entry.owner === owner2 && entry.route === route || entry.expires <= Date.now()) this.snapshots.delete(id);
      if (this.snapshots.size >= 128) throw Error("capacity");
      this.snapshots.set(snapshot, { owner: owner2, route, provider: identity13(provider), config, revision: view.revision, resettable, expires: Date.now() + 3e5 });
      return result;
    } catch {
      throw Error("remote_endpoint_unavailable");
    }
  }
  async write(owner2, raw, signal) {
    const parsed = computerEndpointWriteSchema.safeParse(raw);
    if (!parsed.success || typeof parsed.data.target !== "object") throw Error("remote_endpoint_invalid");
    const operation = parsed.data, route = parsed.data.target.provider, snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2 || snapshot.route !== route) throw Error("remote_endpoint_stale");
    this.snapshots.delete(operation.snapshot);
    let provider, config;
    try {
      provider = this.settings();
      config = provider?.get(namespace4);
    } catch {
      throw Error("remote_endpoint_stale");
    }
    if (!provider || snapshot.provider !== identity13(provider) || config !== snapshot.config || snapshot.expires <= Date.now() || snapshot.revision !== operation.expectedRevision) throw Error("remote_endpoint_stale");
    if (!provider.writable) throw Error("remote_endpoint_read_only");
    signal.throwIfAborted();
    if (operation.change.op === "unset" && (!snapshot.resettable || !this.resettable(provider, route)))
      throw Error("remote_endpoint_reset_unavailable");
    try {
      await provider.mutate(namespace4, [operation.change.op === "set" ? { op: "set", path: ["providers", route, "baseURL"], value: operation.change.value } : { op: "unset", path: ["providers", route, "baseURL"] }], operation.expectedRevision);
      signal.throwIfAborted();
      const current = this.settings();
      if (!current || identity13(current) !== snapshot.provider) throw Error("changed");
      return this.read(owner2, route, operation.resetPolicy === true);
    } catch (error) {
      if (record5(error).code === "SETTINGS_CONFLICT") throw Error("remote_endpoint_stale");
      throw Error("remote_endpoint_write_unconfirmed");
    }
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/desktop-open.ts
async function desktopOpen(connection, operation, signal) {
  signal.throwIfAborted();
  const metadata = operation.method === "remote.desktop";
  const path = metadata ? "/api/present.host" : `${operation.source === "presented" ? "/api/present.open" : "/api/changes.open"}?${new URLSearchParams({
    sessionId: operation.sessionId,
    seq: String(operation.seq),
    index: String(operation.index),
    ...operation.action === "reveal" ? { action: "reveal" } : {}
  })}`;
  const response = await connection.createSharedFetchHandler("/api").fetch(new Request(`http://dsh.internal${path}`, {
    method: metadata ? "GET" : "POST",
    signal
  }));
  signal.throwIfAborted();
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(response.status === 404 ? "remote_desktop_file_missing" : response.status === 409 ? "remote_desktop_unavailable" : "remote_desktop_open_failed");
  }
  if (!metadata) {
    await response.body?.cancel();
    if (response.status !== 204) throw new Error("remote_desktop_invalid");
    return { opened: true };
  }
  const value = await response.json();
  signal.throwIfAborted();
  if (typeof value?.name !== "string" || value.name.length > 255 || typeof value.available !== "boolean" || ![null, "finder", "explorer", "directory"].includes(value.fileManager)) throw new Error("remote_desktop_invalid");
  return { name: value.name, available: value.available, fileManager: value.fileManager };
}

// src/workspace-desktop.ts
import { randomUUID as randomUUID10 } from "node:crypto";
var WorkspaceDesktop = class {
  constructor(connection, provider) {
    this.connection = connection;
    this.provider = provider;
  }
  snapshots = /* @__PURE__ */ new Map();
  async stat(sessionId2, path, signal) {
    signal.throwIfAborted();
    const rpcId = randomUUID10(), endpoint2 = "workspaceFiles/stat";
    const response = await this.connection.createSharedFetchHandler("/api").fetch(new Request(`http://dsh.internal/api/${endpoint2}`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "client-request", rpcId, method: endpoint2, payload: { args: { workspaceFileScopeId: sessionId2, path } } })
    }));
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("remote_desktop_file_missing");
    }
    const envelope = await response.json();
    signal.throwIfAborted();
    if (envelope?.type !== "server-response" || envelope.rpcId !== rpcId || envelope.result?.ok !== true) throw new Error("remote_desktop_file_missing");
    const file = envelope.result.value;
    if (typeof file?.absolutePath !== "string" || !file.absolutePath || file.absolutePath.length > 4096 || typeof file.version !== "string" || !file.version || file.version.length > 4096) throw new Error("remote_desktop_invalid");
    return { absolutePath: file.absolutePath, version: file.version };
  }
  async verify(services, file, signal) {
    if (this.provider() !== services || !services.sessions.workspaceDesktop().available) throw new Error("remote_desktop_unavailable");
    const mapped = services.fs.processPathFromHostPath(file.absolutePath);
    if (mapped === void 0 || services.fs.processPath(await services.fs.resolve(mapped, { signal })) !== file.absolutePath) throw new Error("remote_desktop_file_missing");
    signal.throwIfAborted();
    if (this.provider() !== services) throw new Error("remote_desktop_stale");
  }
  async prepare(owner2, operation, signal) {
    signal.throwIfAborted();
    for (const [id, item] of this.snapshots) if (item.owner === owner2 || item.expires <= Date.now()) this.snapshots.delete(id);
    const services = this.provider();
    if (!services) throw new Error("remote_desktop_unavailable");
    const file = await this.stat(operation.sessionId, operation.path, signal);
    await this.verify(services, file, signal);
    if (this.snapshots.size >= 128) throw new Error("remote_desktop_busy");
    const snapshot = randomUUID10();
    this.snapshots.set(snapshot, { ...file, owner: owner2, sessionId: operation.sessionId, path: operation.path, services, expires: Date.now() + 3e5 });
    return { ...services.sessions.workspaceDesktop(), snapshot, fileName: file.absolutePath.split(/[\\/]/).at(-1) };
  }
  async open(owner2, operation, signal) {
    signal.throwIfAborted();
    const snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2 || snapshot.sessionId !== operation.sessionId) throw new Error("remote_desktop_stale");
    this.snapshots.delete(operation.snapshot);
    if (snapshot.expires <= Date.now() || this.provider() !== snapshot.services) throw new Error("remote_desktop_stale");
    const file = await this.stat(snapshot.sessionId, snapshot.path, signal);
    if (file.absolutePath !== snapshot.absolutePath || file.version !== snapshot.version) throw new Error("remote_desktop_file_changed");
    await this.verify(snapshot.services, file, signal);
    await snapshot.services.sessions.openWorkspacePath({ path: file.absolutePath }, signal);
    signal.throwIfAborted();
    return { opened: true };
  }
  dispose() {
    this.snapshots.clear();
  }
};

// src/attachment-desktop.ts
import { randomUUID as randomUUID11 } from "node:crypto";
import { mkdir, lstat, realpath, rm, open, utimes, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname as dirname3 } from "node:path";
var COPY_TTL = 36e5;
var cacheWork = Promise.resolve();
var serialize = (work) => {
  const result = cacheWork.then(work);
  cacheWork = result.catch(() => {
  });
  return result;
};
var AttachmentCopies = class {
  constructor(root = join(tmpdir(), "dshm-attachment-copies-v1", String(process.pid))) {
    this.root = root;
  }
  async directory() {
    await mkdir(this.root, { recursive: true, mode: 448 });
    if ((await lstat(this.root)).isSymbolicLink()) throw new Error("remote_desktop_unavailable");
    return realpath(this.root);
  }
  async removeSlot(directory) {
    const root = await this.directory();
    if (dirname3(resolve(directory)) !== root || !/^copy-[0-7]$/.test(directory.slice(root.length + 1))) throw new Error("remote_desktop_invalid");
    try {
      if ((await lstat(directory)).isSymbolicLink() || await realpath(directory) !== directory) throw new Error("remote_desktop_invalid");
      await rm(directory, { recursive: true });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  remove(directory) {
    return serialize(() => this.removeSlot(directory));
  }
  async staleProcesses() {
    if (this.root !== join(tmpdir(), "dshm-attachment-copies-v1", String(process.pid))) return;
    const parent = await realpath(dirname3(this.root));
    for (const entry of await readdir(parent, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[1-9][0-9]{0,9}$/.test(entry.name) || Number(entry.name) === process.pid) continue;
      try {
        process.kill(Number(entry.name), 0);
        continue;
      } catch (error) {
        if (error.code !== "ESRCH") continue;
      }
      const path = join(parent, entry.name);
      try {
        if (Date.now() - (await lstat(path)).mtimeMs > COPY_TTL && await realpath(path) === path)
          await rm(path, { recursive: true });
      } catch {
      }
    }
  }
  reserve() {
    return serialize(async () => {
      const root = await this.directory();
      await this.staleProcesses();
      for (let index = 0; index < 8; index++) {
        const directory = join(root, `copy-${index}`);
        try {
          const stat = await lstat(directory);
          if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
          if (Date.now() - stat.mtimeMs <= COPY_TTL) continue;
          await this.removeSlot(directory);
        } catch (error) {
          if (error.code !== "ENOENT") continue;
        }
        try {
          await mkdir(directory, { mode: 448 });
          return directory;
        } catch (error) {
          if (error.code !== "EEXIST") throw error;
        }
      }
      throw new Error("remote_desktop_copy_capacity");
    });
  }
};
function fileName(ref) {
  if (ref.mediaType) return `image.${ref.mediaType.split("/")[1]}`;
  const name2 = ref.name;
  if (!name2 || /[\\/<>:"|?*\x00-\x1f\x7f]/.test(name2) || /[. ]$/.test(name2) || /^(con|prn|aux|nul|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])([. ]|$)/i.test(name2) || Buffer.byteLength(name2) > 255) throw new Error("remote_attachment_invalid");
  return name2;
}
var AttachmentDesktop = class {
  constructor(attachments, provider, copies = new AttachmentCopies()) {
    this.attachments = attachments;
    this.provider = provider;
    this.copies = copies;
  }
  snapshots = /* @__PURE__ */ new Map();
  lifetime = new AbortController();
  readers = 0;
  current(services, signal) {
    signal.throwIfAborted();
    if (this.provider() !== services || !services.sessions.workspaceDesktop().available) throw new Error("remote_desktop_unavailable");
  }
  async prepare(owner2, operation, signal) {
    signal = AbortSignal.any([signal, this.lifetime.signal]);
    signal.throwIfAborted();
    for (const [id, item] of this.snapshots) if (item.owner === owner2 || item.expires <= Date.now()) this.snapshots.delete(id);
    const services = this.provider();
    if (!services) throw new Error("remote_desktop_unavailable");
    this.current(services, signal);
    if (this.readers >= 2) throw new Error("remote_desktop_busy");
    this.readers++;
    try {
      const { method: _, ...request } = operation;
      const { ref } = await attachmentSource(this.attachments, request, signal);
      this.current(services, signal);
      if (this.snapshots.size >= 128) throw new Error("remote_desktop_busy");
      const snapshot = randomUUID11(), name2 = fileName(ref);
      this.snapshots.set(snapshot, { owner: owner2, request, ref: JSON.stringify(ref), fileName: name2, services, expires: Date.now() + 3e5 });
      return { ...services.sessions.workspaceDesktop(), snapshot, fileName: name2, attachmentCopy: true };
    } finally {
      this.readers--;
    }
  }
  async open(owner2, operation, signal) {
    signal = AbortSignal.any([signal, this.lifetime.signal, AbortSignal.timeout(25e3)]);
    signal.throwIfAborted();
    const snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2 || snapshot.request.sessionId !== operation.sessionId) throw new Error("remote_desktop_stale");
    this.snapshots.delete(operation.snapshot);
    if (snapshot.expires <= Date.now()) throw new Error("remote_desktop_stale");
    this.current(snapshot.services, signal);
    if (this.readers >= 2) throw new Error("remote_desktop_busy");
    this.readers++;
    let directory, opening = false;
    try {
      const source = await attachmentSource(this.attachments, snapshot.request, signal);
      if (JSON.stringify(source.ref) !== snapshot.ref) throw new Error("remote_desktop_file_changed");
      this.current(snapshot.services, signal);
      directory = await this.copies.reserve();
      const path = join(directory, snapshot.fileName), file = await open(path, "wx", 384);
      let offset = 0;
      try {
        for await (const bytes of source.chunks) {
          signal.throwIfAborted();
          if (offset + bytes.byteLength > source.ref.bytes) throw new Error("remote_attachment_invalid");
          let written = 0;
          while (written < bytes.byteLength) {
            signal.throwIfAborted();
            const result = await file.write(bytes, written, bytes.byteLength - written);
            if (!result.bytesWritten) throw new Error("remote_attachment_invalid");
            written += result.bytesWritten;
          }
          offset += bytes.byteLength;
        }
        if (offset !== source.ref.bytes) throw new Error("remote_attachment_invalid");
      } finally {
        await file.close();
      }
      await source.check();
      this.current(snapshot.services, signal);
      const now = /* @__PURE__ */ new Date();
      await utimes(directory, now, now);
      signal.throwIfAborted();
      opening = true;
      await snapshot.services.sessions.openWorkspacePath({ path }, signal);
      signal.throwIfAborted();
      return { opened: true };
    } finally {
      this.readers--;
      if (directory && !opening) await this.copies.remove(directory);
    }
  }
  dispose() {
    this.lifetime.abort();
    this.snapshots.clear();
  }
};

// src/desktop-apps.ts
import { randomUUID as randomUUID12 } from "node:crypto";
import { isAbsolute as isAbsolute3 } from "node:path";
var DesktopApps = class {
  constructor(provider) {
    this.provider = provider;
  }
  snapshots = /* @__PURE__ */ new Map();
  preparing = /* @__PURE__ */ new Map();
  lifetime = new AbortController();
  check(services, signal) {
    signal.throwIfAborted();
    if (this.provider() !== services) throw new Error("remote_desktop_stale");
    if (!services.sessions.workspaceDesktop().available) throw new Error("remote_desktop_unavailable");
  }
  services(signal) {
    signal.throwIfAborted();
    const services = this.provider();
    if (!services) throw new Error("remote_desktop_unavailable");
    this.check(services, signal);
    return services;
  }
  async workspace(services, sessionId2, signal) {
    const rows2 = await services.sessions.list({}, signal);
    this.check(services, signal);
    const cwd = rows2.items.find((item) => item.sessionId === sessionId2)?.cwd;
    if (!cwd || cwd.length > 4096 || /[\x00-\x1f\x7f]/.test(cwd)) throw new Error("remote_desktop_workspace_missing");
    const target2 = await services.fs.resolve(cwd, { signal });
    const path = services.fs.processPath(target2);
    const mapped = services.fs.processPathFromHostPath(path);
    if (!isAbsolute3(path) || mapped === void 0 || services.fs.processPath(await services.fs.resolve(mapped, { signal })) !== path || (await services.fs.stat(target2, signal))?.type !== "directory") throw new Error("remote_desktop_workspace_missing");
    this.check(services, signal);
    return { cwd, path };
  }
  async list(sessionId2, caller) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]), services = this.services(signal);
    const apps = await services.apps.list(signal);
    const workspace = await this.workspace(services, sessionId2, signal);
    return { ...services.sessions.workspaceDesktop(), apps, workspacePath: workspace.path };
  }
  async prepare(owner2, operation, caller) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]), services = this.services(signal);
    for (const [id, item] of this.snapshots) if (item.owner === owner2 || item.expires <= Date.now()) this.snapshots.delete(id);
    if (this.snapshots.size + this.preparing.size >= 128) throw new Error("remote_desktop_busy");
    const token = Symbol();
    this.preparing.set(owner2, token);
    try {
      if (!(await services.apps.list(signal)).includes(operation.appId)) throw new Error("remote_desktop_app_missing");
      const workspace = await this.workspace(services, operation.sessionId, signal);
      if (this.preparing.get(owner2) !== token) throw new Error("remote_desktop_stale");
      const snapshot = randomUUID12();
      this.snapshots.set(snapshot, {
        ...workspace,
        owner: owner2,
        sessionId: operation.sessionId,
        appId: operation.appId,
        services,
        expires: Date.now() + 3e5
      });
      return { ...services.sessions.workspaceDesktop(), snapshot, appId: operation.appId, workspacePath: workspace.path };
    } finally {
      if (this.preparing.get(owner2) === token) this.preparing.delete(owner2);
    }
  }
  async icon(sessionId2, appId, caller) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]), services = this.services(signal);
    if (!services.apps.icon) throw new Error("remote_desktop_unavailable");
    await this.workspace(services, sessionId2, signal);
    if (!(await services.apps.list(signal)).includes(appId)) throw new Error("remote_desktop_app_missing");
    this.check(services, signal);
    const icon = await services.apps.icon(appId, signal);
    this.check(services, signal);
    if (icon === null) return { appId, contentType: null, data: null };
    if (!["image/png", "image/svg+xml"].includes(icon.contentType) || !Buffer.isBuffer(icon.bytes) || icon.bytes.length === 0 || icon.bytes.length > 256 * 1024) throw new Error("remote_desktop_icon_invalid");
    return { appId, contentType: icon.contentType, data: icon.bytes.toString("base64") };
  }
  async open(owner2, operation, caller) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    signal.throwIfAborted();
    const snapshot = this.snapshots.get(operation.snapshot);
    if (!snapshot || snapshot.owner !== owner2 || snapshot.sessionId !== operation.sessionId) throw new Error("remote_desktop_stale");
    this.snapshots.delete(operation.snapshot);
    if (snapshot.expires <= Date.now()) throw new Error("remote_desktop_stale");
    const services = snapshot.services;
    this.check(services, signal);
    if (!(await services.apps.list(signal)).includes(snapshot.appId)) throw new Error("remote_desktop_app_missing");
    const workspace = await this.workspace(services, operation.sessionId, signal);
    if (workspace.cwd !== snapshot.cwd || workspace.path !== snapshot.path) throw new Error("remote_desktop_workspace_changed");
    const result = await services.apps.open(snapshot.appId, workspace.path, signal);
    signal.throwIfAborted();
    if (result.status !== 200 || !("ok" in result.payload) || result.payload.ok !== true) throw new Error("remote_desktop_launch_failed");
    return { opened: true };
  }
  dispose() {
    this.lifetime.abort();
    this.snapshots.clear();
    this.preparing.clear();
  }
};

// src/plugin-operations.ts
import { randomUUID as randomUUID13 } from "node:crypto";
var endpoints = /* @__PURE__ */ new Set(["pluginManager/installBundle", "pluginManager/removeBundle", "pluginManager/setBundleEnabled", "pluginManager/setPluginEnabled"]);
var RETAIN_MS = 60 * 60 * 1e3;
var record6 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
var PluginOperations = class {
  constructor(connection, now = Date.now) {
    this.connection = connection;
    this.now = now;
  }
  generation = randomUUID13();
  entries = /* @__PURE__ */ new Map();
  prune() {
    for (const [id, entry] of this.entries) if (entry.finishedAt !== void 0 && this.now() - entry.finishedAt >= RETAIN_MS) this.entries.delete(id);
  }
  checkGeneration(generation) {
    if (generation !== this.generation) throw new Error("plugin_operation_generation_changed");
  }
  summary(entry) {
    return {
      id: entry.id,
      endpoint: entry.endpoint,
      target: entry.target,
      requestId: entry.requestId,
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt,
      state: entry.finishedAt === void 0 ? "pending" : entry.error ? "unknown" : "complete",
      ok: entry.result?.ok,
      application: record6(entry.result?.value)?.application
    };
  }
  list(owner2) {
    this.prune();
    return { generation: this.generation, items: [...this.entries.values()].filter((entry) => entry.owner === owner2).map((entry) => this.summary(entry)) };
  }
  read(owner2, generation, id) {
    this.checkGeneration(generation);
    this.prune();
    const entry = this.entries.get(id);
    if (!entry || entry.owner !== owner2) throw new Error("plugin_operation_missing");
    return { ...this.summary(entry), result: entry.result, error: entry.error };
  }
  start(owner2, generation, id, endpoint2, payload) {
    this.checkGeneration(generation);
    this.prune();
    if (!endpoints.has(endpoint2) || remotePermission(endpoint2, false) !== "management" || !remoteRequestAllowed(endpoint2, payload)) throw new Error("remote_operation_denied");
    const encoded = JSON.stringify(payload);
    if (Buffer.byteLength(encoded) > 16 * 1024) throw new Error("plugin_operation_payload_too_large");
    const existing = this.entries.get(id);
    if (existing) {
      if (existing.owner !== owner2 || existing.endpoint !== endpoint2 || existing.payload !== encoded) throw new Error("plugin_operation_conflict");
      return this.summary(existing);
    }
    if ([...this.entries.values()].some((entry2) => entry2.owner === owner2 && entry2.finishedAt === void 0)) throw new Error("plugin_operation_busy");
    if (this.entries.size >= 64) throw new Error("plugin_operation_capacity");
    const args = record6(payload.args), options = record6(args?.options);
    const target2 = args?.spec ?? args?.name ?? args?.id;
    const entry = {
      id,
      owner: owner2,
      endpoint: endpoint2,
      payload: encoded,
      target: typeof target2 === "string" ? target2.slice(0, 4096) : endpoint2,
      startedAt: this.now(),
      ...typeof options?.requestId === "string" ? { requestId: options.requestId } : {}
    };
    this.entries.set(id, entry);
    void this.execute(entry, payload);
    return this.summary(entry);
  }
  async execute(entry, payload) {
    try {
      const response = await this.connection.createSharedFetchHandler("/api").fetch(new Request(`http://dsh.internal/api/${entry.endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "client-request", rpcId: entry.id, method: entry.endpoint, payload })
      }));
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("plugin_operation_outcome_unknown");
      }
      const envelope = record6(await response.json()), result = record6(envelope?.result);
      if (envelope?.type !== "server-response" || envelope.rpcId !== entry.id || typeof result?.ok !== "boolean") throw new Error("plugin_operation_outcome_unknown");
      if (Buffer.byteLength(JSON.stringify(result)) > MAX_FRAME_BYTES / 2) throw new Error("plugin_operation_result_too_large");
      entry.result = result;
    } catch (error) {
      entry.error = error instanceof Error && error.message === "plugin_operation_result_too_large" ? error.message : "plugin_operation_outcome_unknown";
    } finally {
      entry.finishedAt = this.now();
    }
  }
};

// src/cordis-connections.ts
import { symbols as symbols15 } from "@deepseek-ai/cordis";
function sameService(left, right) {
  const identity14 = (value) => value ? value[symbols15.original] ?? value : void 0;
  return identity14(left) === identity14(right);
}
var CordisConnections = class {
  constructor(current) {
    this.current = current;
  }
  bindings = /* @__PURE__ */ new Map();
  get available() {
    return this.current() !== void 0;
  }
  attach(owner2) {
    const previous = this.bindings.get(owner2);
    if (previous) this.close(previous);
    const binding = { closed: false };
    this.bindings.set(owner2, binding);
    return () => {
      this.close(binding);
      if (this.bindings.get(owner2) === binding) this.bindings.delete(owner2);
    };
  }
  async run(owner2, signal, callback) {
    signal.throwIfAborted();
    const binding = this.bindings.get(owner2);
    if (!binding || binding.closed) throw new Error("remote_cordis_connection_required");
    const service = this.current();
    if (!service) throw new Error("remote_cordis_unavailable");
    if (!sameService(binding.service, service)) {
      binding.scope?.dispose();
      binding.scope = service.createClientManifestScope();
      binding.service = service;
    }
    const scope = binding.scope;
    const result = await scope.run(callback);
    signal.throwIfAborted();
    if (binding.closed || this.bindings.get(owner2) !== binding || binding.scope !== scope || !sameService(this.current(), service))
      throw new Error("remote_cordis_connection_expired");
    return result;
  }
  close(binding) {
    if (binding.closed) return;
    binding.closed = true;
    binding.scope?.dispose();
  }
  dispose() {
    for (const binding of this.bindings.values()) this.close(binding);
    this.bindings.clear();
  }
};

// src/gateway-stream.ts
function openGatewayStream(gateway, version, endpoint2, payload, signal) {
  signal.throwIfAborted();
  if (isProfileDshVersion(version)) {
    const uplink = (async function* () {
    })();
    return gateway.wireStream.open(endpoint2, payload, uplink, void 0, signal);
  }
  if (version === "0.1.6-alpha.2") return gateway.wireStream.open(endpoint2, payload, signal);
  throw new Error("unsupported_dsh_version");
}

// src/remote-adapter.ts
var record7 = (value) => value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
var owner = (context) => `${context.deviceId}:${context.connectionId}`;
var latestCandidate = true;
var RemoteAdapter = class {
  constructor(services, hostId, pluginOperations = new PluginOperations(services.connection)) {
    this.services = services;
    this.hostId = hostId;
    this.pluginOperations = pluginOperations;
    this.modelProbe = new ModelProbe({
      settings: () => services.settings?.(),
      runtime: () => services.modelDiscovery?.(),
      credentialRevision: () => services.computerKey?.revision() ?? -1,
      // 仅已通过当前请求context管理检查、且尚未取消的调用可使用快照。
      permitted: (key) => [...this.probeOwners].some(([id, current]) => current === key && this.requests.has(id) && !this.requests.get(id).signal.aborted)
    });
    this.cordis = new CordisConnections(() => services.cordisInspect?.());
    this.desktopApps = new DesktopApps(() => services.desktopApps?.());
    this.settings = new ComputerSettings(() => services.settings?.());
    this.providerSettings = new ProviderSettings(() => services.settings?.(), () => !!services.computerKey?.credentials(), () => services.providerDirectory?.());
    this.providerRemoval = new ProviderRemoval(() => services.settings?.());
    this.providerCreation = new ProviderCreation(() => services.settings?.(), () => services.providerDirectory?.(), () => !!services.computerKey?.credentials());
    this.providerModels = new ProviderModels(() => services.settings?.());
    this.deepSeekModels = new ProviderModels(() => services.settings?.(), "llm-deepseek");
    this.providerEndpoint = new ProviderEndpoint(() => services.settings?.(), () => services.providerDirectory?.());
    if (services.computerKey) this.key = new ComputerKey(services.computerKey);
    if (services.environment) this.endpoint = new ComputerEndpoint(() => services.settings?.(), services.environment);
    if (services.computerKey) this.searchKey = new ComputerKey(services.computerKey, "web-search-deepseek");
    if (services.computerKey) this.providerKey = new ComputerKey(services.computerKey);
    if (services.environment) this.searchEndpoint = new ComputerEndpoint(() => services.settings?.(), services.environment, "web-search-deepseek");
    if (services.workspaceDesktop) this.workspaceDesktop = new WorkspaceDesktop(services.connection, services.workspaceDesktop);
    if (services.workspaceDesktop && services.attachments) this.attachmentDesktop = new AttachmentDesktop(services.attachments, services.workspaceDesktop);
  }
  requests = /* @__PURE__ */ new Map();
  probeOwners = /* @__PURE__ */ new Map();
  modelProbe;
  eventOwners = /* @__PURE__ */ new Map();
  resources = /* @__PURE__ */ new Map();
  uploads = /* @__PURE__ */ new Map();
  officeReaders = 0;
  attachmentReaders = 0;
  promptUploads = 0;
  changesReaders = 0;
  exportReaders = 0;
  outputReaders = 0;
  settings;
  providerSettings;
  providerRemoval;
  providerCreation;
  providerModels;
  deepSeekModels;
  providerEndpoint;
  key;
  endpoint;
  searchKey;
  providerKey;
  searchEndpoint;
  workspaceDesktop;
  attachmentDesktop;
  desktopApps;
  cordis;
  async receive(raw, send) {
    const frame = routedFrameSchema.parse(raw);
    if (frame.type === "cancel") {
      this.requests.get(frame.id)?.abort();
      return;
    }
    if (frame.type === "ack") {
      try {
        this.resources.get(frame.id)?.acknowledge(frame.count);
      } catch {
        this.requests.get(frame.id)?.abort();
        send({ type: "error", id: frame.id, code: "invalid_resource_ack" });
      }
      return;
    }
    if (frame.type === "uploadChunk" || frame.type === "uploadEnd") {
      const upload = this.uploads.get(frame.id);
      if (!upload) return;
      try {
        frame.type === "uploadChunk" ? upload.push(frame.data) : upload.end();
      } catch {
        upload.fail(new Error("invalid_upload_frame"));
        send({ type: "error", id: frame.id, code: "invalid_upload_frame" });
        this.requests.get(frame.id)?.abort();
      }
      return;
    }
    if (this.requests.has(frame.id)) throw new Error("duplicate_request_id");
    if (this.requests.size >= 256) {
      send({ type: "error", id: frame.id, code: "host_capacity" });
      return;
    }
    const controller = new AbortController(), signal = controller.signal;
    this.requests.set(frame.id, controller);
    const emit = (value) => {
      if (!signal.aborted) send(value);
    };
    let eventClient;
    let releaseCordis;
    try {
      const { operation, context } = frame;
      if (!context || context.hostId !== this.hostId) throw new Error("remote_identity_denied");
      if (this.services.version !== "0.1.6-alpha.2" && !(latestCandidate && isProfileDshVersion(this.services.version))) throw new Error("unsupported_dsh_version");
      if (operation.method === "remote.negotiate") {
        emit({ type: "result", id: frame.id, value: {
          transport: REMOTE_TRANSPORT_VERSION,
          dshVersion: this.services.version,
          management: context.management,
          channels: ["rpc", "stream", "graph", "bundle", "upload", "prompt", "office", "changes", ...this.services.attachments ? ["attachment"] : [], ...this.services.attachments && this.services.attachmentOffice?.() ? ["attachmentOffice"] : []],
          limits: { uploadBytes: MAX_UPLOAD_BYTES, chunkBytes: RESOURCE_CHUNK_BYTES, window: RESOURCE_WINDOW },
          jobControlGeneration: this.services.jobControl?.()?.generation,
          jobOutput: this.services.jobControl?.()?.outputAvailable === true,
          jobOutputCoordinates: this.services.jobControl?.()?.outputCoordinates,
          commandOutputGeneration: this.services.commandOutput?.()?.available ? this.services.commandOutput()?.generation : void 0,
          planModeControl: true,
          officePriority: true,
          subagentPromptUpload: true,
          subagentState: !!this.services.subagentState,
          workspaceManagement: true,
          sessionExport: true,
          desktopOpen: true,
          desktopReveal: true,
          desktopApps: !!this.services.desktopApps?.(),
          desktopAppIcons: typeof this.services.desktopApps?.()?.apps.icon === "function",
          desktopOpenWorkspace: !!this.services.workspaceDesktop?.(),
          desktopOpenAttachment: !!this.attachmentDesktop && !!this.services.workspaceDesktop?.(),
          computerSettings: !!this.services.settings?.(),
          providerSettings: !!this.services.settings?.(),
          providerKeySetup: !!this.services.settings?.() && !!this.services.computerKey?.credentials(),
          providerCards: !!this.services.settings?.() && !!this.services.providerDirectory?.() && !!this.services.computerKey?.credentials(),
          modelReadiness: !!this.services.settings?.() && !!this.services.providerDirectory?.() && !!this.services.computerKey?.credentials(),
          providerRemoval: !!this.services.settings?.(),
          providerCreation: !!this.services.settings?.() && !!this.services.providerDirectory?.(),
          providerCreationModelRows: !!this.services.settings?.() && !!this.services.providerDirectory?.(),
          providerEndpoint: !!this.services.settings?.(),
          providerEndpointResetPolicy: !!this.services.settings?.() && !!this.services.providerDirectory?.(),
          providerModels: !!this.services.settings?.(),
          deepSeekModels: !!this.services.settings?.(),
          providerModelDiscovery: !!this.services.settings?.() && !!this.services.modelDiscovery?.(),
          providerModelProbe: await this.modelProbe.available(),
          providerModelOverrides: !!this.services.settings?.(),
          providerKey: !!this.providerKey,
          pluginSettings: !!this.services.settings?.(),
          presetDefaultSettings: latestCandidate && isProfileDshVersion(this.services.version) && !!this.services.settings?.()?.describe({ redactSecrets: true }).some((view) => view.ns === "agent-preset-registry"),
          presetProfileDirectory: latestCandidate && isProfileDshVersion(this.services.version) && !!this.services.profilePresets?.(),
          presetProfileManagement: latestCandidate && isProfileDshVersion(this.services.version) && !!this.services.presetManagement,
          codingToolsSettings: latestCandidate && isProfileDshVersion(this.services.version) && !!this.services.settings?.()?.describe({ redactSecrets: true }).some((view) => view.ns === "ui-settings"),
          pluginOperationGeneration: this.pluginOperations.generation,
          subagentSettings: !!this.services.settings?.(),
          webSearchSettings: !!this.services.settings?.() && !!this.searchKey && !!this.searchEndpoint,
          computerKey: !!this.key,
          computerEndpoint: !!this.endpoint,
          feedbackNotifications: !!this.services.feedbackNotifications,
          taskNotifications: !!this.services.taskNotifications,
          taskNotificationPreview: this.services.taskNotifications ? 1 : void 0,
          taskPendingNotifications: this.services.taskNotifications?.pendingAvailable === true,
          endpoints: remoteEndpoints(
            context.management,
            this.cordis.available,
            latestCandidate && isProfileDshVersion(this.services.version) ? "target" : "legacy",
            this.services.version === "0.2.1-alpha.2"
          ),
          graphRevision: this.services.modules.graph().rev
        } });
      } else if (operation.method === "remote.presetManagementRead" || operation.method === "remote.presetCopy" || operation.method === "remote.presetDelete") {
        if (!context.management) throw Error("management_required");
        if (!latestCandidate || !isProfileDshVersion(this.services.version) || !this.services.presetManagement) throw Error("remote_operation_denied");
        const value = operation.method === "remote.presetManagementRead" ? await this.services.presetManagement.read(owner(context), operation.preset, signal) : await this.services.presetManagement.write(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.pluginOperationStart" || operation.method === "remote.pluginOperationRead" || operation.method === "remote.pluginOperations") {
        if (!context.management) throw new Error("management_required");
        const operationOwner = `${context.hostId}:${context.deviceId}`;
        const value = operation.method === "remote.pluginOperations" ? this.pluginOperations.list(operationOwner) : operation.method === "remote.pluginOperationRead" ? this.pluginOperations.read(operationOwner, operation.generation, operation.operationId) : this.pluginOperations.start(operationOwner, operation.generation, operation.operationId, operation.endpoint, operation.payload);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.endpointRead" || operation.method === "remote.endpointWrite") {
        if (!context.management) throw new Error("management_required");
        if (typeof operation.target === "object") {
          const value2 = operation.method === "remote.endpointRead" ? this.providerEndpoint.read(owner(context), operation.target.provider, operation.resetPolicy === true) : await this.providerEndpoint.write(owner(context), operation, signal);
          emit({ type: "result", id: frame.id, value: value2 });
          return;
        }
        const endpoint2 = operation.target ? this.searchEndpoint : this.endpoint;
        if (!endpoint2) throw new Error("remote_endpoint_unavailable");
        const value = operation.method === "remote.endpointRead" ? endpoint2.read(owner(context)) : await endpoint2.write(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.keyRead" || operation.method === "remote.keyWrite") {
        if (!context.management) throw new Error("management_required");
        const key = typeof operation.target === "object" ? this.providerKey : operation.target ? this.searchKey : this.key;
        if (!key) throw new Error("remote_key_unavailable");
        const value = operation.method === "remote.keyRead" ? await key.read(owner(context), operation.target) : await key.write(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.providerCreationRead" || operation.method === "remote.providerCreationWrite") {
        if (!context.management) throw new Error("management_required");
        const value = operation.method === "remote.providerCreationRead" ? this.providerCreation.read(owner(context)) : await this.providerCreation.create(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.providerRemovalRead" || operation.method === "remote.providerRemovalWrite") {
        if (!context.management) throw new Error("management_required");
        const value = operation.method === "remote.providerRemovalRead" ? this.providerRemoval.read(owner(context), operation.provider) : await this.providerRemoval.remove(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.deepSeekModelsRead" || operation.method === "remote.deepSeekModelsWrite") {
        if (!context.management) throw new Error("management_required");
        const value = operation.method === "remote.deepSeekModelsRead" ? this.deepSeekModels.read(owner(context), "deepseek") : await this.deepSeekModels.write(owner(context), { ...operation, method: "remote.providerModelsWrite", provider: "deepseek" }, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.modelProbePrepare" || operation.method === "remote.modelProbeExecute") {
        if (!context.management) throw new Error("management_required");
        this.probeOwners.set(frame.id, owner(context));
        const value = operation.method === "remote.modelProbePrepare" ? this.modelProbe.prepare(owner(context), operation) : await this.modelProbe.execute(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.providerModelsDiscover") {
        if (!context.management) throw new Error("management_required");
        const value = await discoverProviderModels(operation.provider, () => this.services.settings?.(), () => this.services.modelDiscovery?.(), signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.providerModelsRead" || operation.method === "remote.providerModelsWrite") {
        if (!context.management) throw new Error("management_required");
        const value = operation.method === "remote.providerModelsRead" ? this.providerModels.read(owner(context), operation.provider, operation.scope) : await this.providerModels.write(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.modelReadiness") {
        if (!context.management) throw new Error("management_required");
        const value = await readModelReadiness({
          settings: () => this.services.settings?.(),
          directory: () => this.services.providerDirectory?.(),
          key: this.services.computerKey,
          accountAvailable: this.services.accountModelAvailable
        }, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.providerCardRead") {
        if (!context.management) throw new Error("management_required");
        const value = await readProviderCard({
          settings: () => this.services.settings?.(),
          directory: () => this.services.providerDirectory?.(),
          key: this.services.computerKey
        }, operation.provider, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.providerSettingsList" || operation.method === "remote.providerSettingsRead" || operation.method === "remote.providerSettingsWrite" || operation.method === "remote.providerKeySetup") {
        if (!context.management) throw new Error("management_required");
        const value = operation.method === "remote.providerSettingsList" ? this.providerSettings.list() : operation.method === "remote.providerSettingsRead" ? this.providerSettings.read(owner(context), operation.provider) : await this.providerSettings.write(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.codingToolsRead") {
        if (!latestCandidate || !isProfileDshVersion(this.services.version)) throw new Error("remote_settings_unavailable");
        const view = this.services.settings?.()?.describe({ redactSecrets: true }).find((view2) => view2.ns === "ui-settings");
        const enabled = view?.value && typeof view.value === "object" ? Reflect.get(view.value, "enabled") : void 0;
        if (typeof enabled !== "boolean") throw new Error("remote_settings_unavailable");
        emit({ type: "result", id: frame.id, value: { enabled, ...view?.documentId ? { documentId: view.documentId } : {} } });
      } else if (operation.method === "remote.settingsRead" || operation.method === "remote.settingsWrite") {
        if (!context.management) throw new Error("management_required");
        if (["agent-preset-registry", "ui-settings"].includes(operation.namespace ?? "") && (!latestCandidate || !isProfileDshVersion(this.services.version)))
          throw new Error("remote_settings_unavailable");
        const value = operation.method === "remote.settingsRead" ? this.settings.read(owner(context), operation.namespace) : await this.settings.write(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.sessionExport") {
        if (this.exportReaders >= 2) throw new Error("remote_export_busy");
        this.exportReaders++;
        const window = new ResourceWindow();
        this.resources.set(frame.id, window);
        try {
          await streamSessionExport(this.services.connection, frame.id, operation, signal, window, emit);
        } finally {
          this.exportReaders--;
        }
      } else if (operation.method === "remote.desktopAppIcon") {
        emit({ type: "result", id: frame.id, value: await this.desktopApps.icon(operation.sessionId, operation.appId, signal) });
      } else if (operation.method === "remote.desktopApps" || operation.method === "remote.prepareDesktopApp" || operation.method === "remote.openDesktopApp") {
        const value = operation.method === "remote.desktopApps" ? await this.desktopApps.list(operation.sessionId, signal) : operation.method === "remote.prepareDesktopApp" ? await this.desktopApps.prepare(owner(context), operation, signal) : await this.desktopApps.open(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.desktop" || operation.method === "remote.openFile") {
        emit({ type: "result", id: frame.id, value: await desktopOpen(this.services.connection, operation, signal) });
      } else if (operation.method === "remote.prepareDesktopFile" || operation.method === "remote.openDesktopFile") {
        if (!this.workspaceDesktop) throw new Error("remote_desktop_unavailable");
        const value = operation.method === "remote.prepareDesktopFile" ? await this.workspaceDesktop.prepare(owner(context), operation, signal) : await this.workspaceDesktop.open(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.prepareDesktopAttachment" || operation.method === "remote.openDesktopAttachment") {
        if (!this.attachmentDesktop) throw new Error("remote_desktop_unavailable");
        const value = operation.method === "remote.prepareDesktopAttachment" ? await this.attachmentDesktop.prepare(owner(context), operation, signal) : await this.attachmentDesktop.open(owner(context), operation, signal);
        emit({ type: "result", id: frame.id, value });
      } else if (operation.method === "remote.commandOutput") {
        const output = this.services.commandOutput?.();
        if (!output?.available) throw new Error("remote_command_unavailable");
        if (this.outputReaders >= 4) throw new Error("remote_command_busy");
        this.outputReaders++;
        try {
          emit({ type: "result", id: frame.id, value: await output.read(operation, signal) });
        } finally {
          this.outputReaders--;
        }
      } else if (operation.method === "remote.jobOutput") {
        const control = this.services.jobControl?.();
        if (!control?.outputAvailable || !control.output) throw new Error("remote_job_output_unavailable");
        if (this.outputReaders >= 4) throw new Error("remote_job_output_busy");
        this.outputReaders++;
        try {
          emit({ type: "result", id: frame.id, value: await control.output(operation, signal) });
        } finally {
          this.outputReaders--;
        }
      } else if (operation.method === "remote.jobStop") {
        const control = this.services.jobControl?.();
        if (!control) throw new Error("remote_job_control_unavailable");
        emit({ type: "result", id: frame.id, value: control.stop(operation) });
      } else if (operation.method === "remote.changes") {
        if (this.changesReaders >= 2) throw new Error("remote_changes_busy");
        this.changesReaders++;
        const window = new ResourceWindow();
        this.resources.set(frame.id, window);
        try {
          await streamChanges(this.services.connection, frame.id, operation, signal, window, emit);
        } finally {
          this.changesReaders--;
        }
      } else if (operation.method === "remote.attachment") {
        if (!this.services.attachments) throw new Error("remote_attachment_unavailable");
        if (this.attachmentReaders >= 4) throw new Error("remote_attachment_busy");
        this.attachmentReaders++;
        const window = new ResourceWindow();
        this.resources.set(frame.id, window);
        try {
          await streamAttachment(this.services.attachments, frame.id, operation, signal, window, emit);
        } finally {
          this.attachmentReaders--;
        }
      } else if (operation.method === "remote.attachmentOffice") {
        if (!this.services.attachments || !this.services.attachmentOffice) throw new Error("remote_office_unavailable");
        if (this.officeReaders >= (operation.priority === "background" ? 1 : 2)) throw new Error("remote_office_busy");
        this.officeReaders++;
        const window = new ResourceWindow();
        this.resources.set(frame.id, window);
        emit({ type: "event", id: frame.id, value: { type: "converting" } });
        try {
          await streamAttachmentOffice(this.services.attachments, this.services.attachmentOffice, frame.id, operation, signal, window, emit);
        } finally {
          this.officeReaders--;
        }
      } else if (operation.method === "remote.office") {
        if (this.officeReaders >= (operation.priority === "background" ? 1 : 2)) throw new Error("remote_office_busy");
        this.officeReaders++;
        const window = new ResourceWindow();
        this.resources.set(frame.id, window);
        emit({ type: "event", id: frame.id, value: { type: "converting" } });
        try {
          await streamOffice(this.services.connection, frame.id, operation.sessionId, operation.path, signal, window, emit, operation.priority, this.services.version);
        } finally {
          this.officeReaders--;
        }
      } else if (operation.method === "remote.prompt") {
        if (this.promptUploads >= 2) throw new Error("remote_prompt_busy");
        this.promptUploads++;
        const upload = new UploadBody(signal, (count) => emit({ type: "event", id: frame.id, value: { type: "credit", count } }));
        this.uploads.set(frame.id, upload);
        emit({ type: "event", id: frame.id, value: { type: "credit", count: RESOURCE_WINDOW } });
        try {
          const init = {
            method: "POST",
            signal,
            body: upload.body,
            headers: { "content-type": "application/json" },
            duplex: "half"
          };
          const endpoint2 = operation.endpoint ?? "session/prompt";
          const response = await this.services.connection.createSharedFetchHandler("/api").fetch(new Request(`http://dsh.internal/api/${endpoint2}`, init));
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`remote_http_${response.status}`);
          }
          const envelope = record7(await response.json());
          if (envelope?.type !== "server-response" || envelope.rpcId !== operation.rpcId || !record7(envelope.result)) throw new Error("invalid_remote_response");
          emit({ type: "result", id: frame.id, value: envelope.result });
        } finally {
          this.promptUploads--;
        }
      } else if (operation.method === "remote.upload") {
        const upload = new UploadBody(signal, (count) => emit({ type: "event", id: frame.id, value: { type: "credit", count } }));
        this.uploads.set(frame.id, upload);
        emit({ type: "event", id: frame.id, value: { type: "credit", count: RESOURCE_WINDOW } });
        const url = new URL("/api/session/uploadFileBinary", "http://dsh.internal");
        url.searchParams.set("sessionId", operation.sessionId);
        if (operation.name !== void 0) url.searchParams.set("name", operation.name);
        const init = {
          method: "POST",
          signal,
          body: upload.body,
          headers: { "content-type": "application/octet-stream" },
          duplex: "half"
        };
        const response = await this.services.connection.createSharedFetchHandler("/api").fetch(new Request(url, init));
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error(`remote_http_${response.status}`);
        }
        const result = record7(await response.json());
        if (typeof result?.ok !== "boolean") throw new Error("invalid_remote_response");
        emit({ type: "result", id: frame.id, value: result });
      } else if (operation.method === "remote.resource") {
        const url = new URL(operation.path, "http://dsh.internal");
        if (!operation.path.startsWith("/plugins/") || url.origin !== "http://dsh.internal" || url.hash || `${url.pathname}${url.search}` !== operation.path || operation.path.includes("\\")) throw new Error("remote_resource_denied");
        const response = await this.services.modules.fetchBundle(new Request(url, { method: operation.verb, signal }));
        const headers = {};
        for (const name2 of ["content-type", "content-length", "content-range", "etag", "accept-ranges"]) {
          const value = response.headers.get(name2);
          if (value !== null) headers[name2] = value;
        }
        emit({ type: "event", id: frame.id, value: { type: "headers", status: response.status, headers } });
        const window = new ResourceWindow();
        this.resources.set(frame.id, window);
        const reader = response.body?.getReader();
        try {
          let length = 0;
          while (reader) {
            signal.throwIfAborted();
            const item = await reader.read();
            if (item.done) break;
            length += item.value.byteLength;
            if (length > 64 * 1024 * 1024) throw new Error("remote_resource_too_large");
            for (let offset = 0; offset < item.value.byteLength; offset += RESOURCE_CHUNK_BYTES) {
              await window.take(signal);
              emit({ type: "event", id: frame.id, value: { type: "chunk", data: Buffer.from(item.value.subarray(offset, offset + RESOURCE_CHUNK_BYTES)).toString("base64") } });
            }
          }
        } finally {
          await reader?.cancel();
          reader?.releaseLock();
        }
        emit({ type: "end", id: frame.id });
      } else if (operation.method === "remote.subagentStateFollow") {
        if (!this.services.subagentState) throw new Error("remote_subagent_state_unavailable");
        for await (const value of this.services.subagentState.follow(signal)) emit({ type: "event", id: frame.id, value });
        emit({ type: "end", id: frame.id });
      } else if (operation.method === "remote.taskFollow") {
        if (!this.services.taskNotifications) throw new Error("remote_task_notifications_unavailable");
        for await (const value of this.services.taskNotifications.follow(signal, operation.previewVersion)) {
          emit({ type: "event", id: frame.id, value });
        }
        emit({ type: "end", id: frame.id });
      } else if (operation.method === "remote.feedbackFollow") {
        if (!this.services.feedbackNotifications) throw new Error("remote_feedback_notifications_unavailable");
        for await (const value of this.services.feedbackNotifications.follow(operation.sessionId, signal)) {
          emit({ type: "event", id: frame.id, value });
        }
        emit({ type: "end", id: frame.id });
      } else if (operation.method === "remote.graph") {
        emit({ type: "result", id: frame.id, value: this.services.modules.graph() });
      } else if (operation.method === "remote.graphFollow") {
        for await (const value of this.graphs(signal)) emit({ type: "event", id: frame.id, value });
        emit({ type: "end", id: frame.id });
      } else if (operation.method === "remote.rpc" || operation.method === "remote.stream") {
        const stream = operation.method === "remote.stream";
        const permission = remotePermission(operation.endpoint, stream);
        const fileContract = latestCandidate && isProfileDshVersion(this.services.version) ? "target" : "legacy";
        if (!permission || !remoteRequestAllowed(operation.endpoint, operation.payload, fileContract)) throw new Error("remote_operation_denied");
        if (operation.endpoint === "schedule/list" && this.services.version !== "0.2.1-alpha.2") throw new Error("remote_operation_denied");
        if (permission === "management" && !context.management) throw new Error("management_required");
        if (operation.endpoint === "settings/openAgentPresetDirectory") {
          const id = record7(operation.payload.args)?.agentPreset;
          const value = latestCandidate && isProfileDshVersion(this.services.version) ? await profilePresetDirectory(() => this.services.profilePresets?.(), id, signal) : await presetDirectory(() => this.services.agentPresets?.(), id, signal);
          emit({ type: "result", id: frame.id, value: { ok: true, value } });
          return;
        }
        if (stream) {
          const source = await openGatewayStream(this.services.gateway, this.services.version, operation.endpoint, operation.payload, signal);
          for await (const value of source) {
            if (signal.aborted) break;
            if (operation.endpoint === "$events") {
              const item = record7(value);
              if (item?.type === "ready" && typeof item.clientId === "string") {
                eventClient = item.clientId;
                this.eventOwners.set(eventClient, owner(context));
                releaseCordis?.();
                releaseCordis = this.cordis.attach(owner(context));
              }
            }
            emit({ type: "event", id: frame.id, value });
          }
          emit({ type: "end", id: frame.id });
        } else {
          if (operation.endpoint === "$events/result") {
            const clientId = record7(operation.payload.args)?.clientId;
            if (typeof clientId !== "string" || this.eventOwners.get(clientId) !== owner(context)) throw new Error("remote_event_owner_denied");
          }
          const fetch2 = () => this.services.connection.createSharedFetchHandler("/api").fetch(new Request(
            `http://dsh.internal/api/${operation.endpoint}`,
            {
              method: "POST",
              signal,
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                type: "client-request",
                rpcId: frame.id,
                method: operation.endpoint,
                payload: workspaceFilePayload(this.services.version, operation.endpoint, operation.payload)
              })
            }
          ));
          const response = operation.endpoint.startsWith("dynamicCordisRunner/") ? await this.cordis.run(owner(context), signal, fetch2) : await fetch2();
          if (!response.ok) {
            await response.body?.cancel();
            throw new Error(`remote_http_${response.status}`);
          }
          const envelope = record7(await (fileContract === "target" && operation.endpoint === "workspaceFiles/readBytes" ? workspaceFileResponse(response, frame.id, signal) : response.json()));
          if (envelope?.type !== "server-response" || envelope.rpcId !== frame.id || !record7(envelope.result)) throw new Error("invalid_remote_response");
          const result = { type: "result", id: frame.id, value: envelope.result };
          if (operation.endpoint === "workspaceFiles/read" && Buffer.byteLength(JSON.stringify(result)) > MAX_FRAME_BYTES) {
            emit({ type: "result", id: frame.id, value: { ok: false, error: {
              code: "workspace-file/too-large",
              message: "The encoded file page exceeds the remote response size limit.",
              details: { path: record7(operation.payload.args)?.path, limit: MAX_FRAME_BYTES }
            } } });
          } else emit(result);
        }
      } else throw new Error("remote_operation_denied");
    } catch (error) {
      const code = error instanceof Error && /^[a-z][a-z0-9_/-]{0,99}$/.test(error.message) ? error.message : this.services.gateway.wireStream.failure(error).code;
      emit({ type: "error", id: frame.id, code: /^[a-z][a-z0-9_/-]{0,99}$/.test(code) ? code : "remote_operation_failed" });
    } finally {
      this.probeOwners.delete(frame.id);
      releaseCordis?.();
      if (eventClient) this.eventOwners.delete(eventClient);
      this.requests.delete(frame.id);
      this.resources.delete(frame.id);
      this.uploads.get(frame.id)?.fail();
      this.uploads.delete(frame.id);
    }
  }
  async *graphs(signal) {
    let changed = true, wake;
    const notify = () => {
      changed = true;
      wake?.();
    };
    const release = this.services.modules.onGraphChanged(notify);
    signal.addEventListener("abort", notify, { once: true });
    try {
      while (!signal.aborted) {
        if (!changed) await new Promise((resolve2) => {
          wake = resolve2;
        });
        if (signal.aborted) break;
        changed = false;
        wake = void 0;
        yield this.services.modules.graph();
      }
    } finally {
      release();
      signal.removeEventListener("abort", notify);
    }
  }
  dispose() {
    this.modelProbe.dispose();
    this.probeOwners.clear();
    for (const controller of this.requests.values()) controller.abort();
    this.requests.clear();
    this.eventOwners.clear();
    this.cordis.dispose();
    this.settings.dispose();
    this.providerSettings.dispose();
    this.providerRemoval.dispose();
    this.providerCreation.dispose();
    this.providerModels.dispose();
    this.deepSeekModels.dispose();
    this.providerEndpoint.dispose();
    this.key?.dispose();
    this.endpoint?.dispose();
    this.searchKey?.dispose();
    this.providerKey?.dispose();
    this.searchEndpoint?.dispose();
    this.workspaceDesktop?.dispose();
    this.attachmentDesktop?.dispose();
    this.desktopApps.dispose();
  }
};

// src/relay.ts
var Relay = class {
  constructor(service, services) {
    this.service = service;
    this.services = services;
    if (services) this.pluginOperations = new PluginOperations(services.connection);
  }
  socket;
  retry;
  heartbeat;
  adapter;
  remote;
  stopped = true;
  attempts = 0;
  state = "disabled";
  pluginOperations;
  start(origin2, token, hostId) {
    this.stop();
    this.stopped = false;
    this.attempts = 0;
    const connect = () => {
      if (this.stopped) return;
      this.state = this.attempts ? "reconnecting" : "connecting";
      const url = new URL("/v1/host/socket", origin2);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      if (this.services && hostId) url.searchParams.set("transport", "2");
      const socket = new WebSocket(url, {
        headers: { authorization: `Bearer ${token}` },
        maxPayload: MAX_FRAME_BYTES,
        perMessageDeflate: false,
        followRedirects: false,
        handshakeTimeout: 1e4
      });
      this.socket = socket;
      const adapter = new SessionAdapter(this.service);
      this.adapter = adapter;
      const remote = this.services && hostId ? new RemoteAdapter(this.services, hostId, this.pluginOperations) : void 0;
      this.remote = remote;
      let alive = true, rejected = false;
      socket.on("open", () => {
        this.state = "online";
        this.attempts = 0;
        this.heartbeat = setInterval(() => {
          if (!alive) {
            socket.terminate();
            return;
          }
          alive = false;
          socket.ping();
        }, 2e4);
        this.heartbeat.unref();
      });
      socket.on("pong", () => {
        alive = true;
      });
      socket.on("message", (raw, binary) => {
        if (binary) {
          socket.close(1008, "invalid_frame");
          return;
        }
        try {
          const message = JSON.parse(raw.toString());
          if (message.type === "cancel") void remote?.receive(message, () => {
          });
          const handler = ["ack", "uploadChunk", "uploadEnd"].includes(message.type) || message.operation?.method?.startsWith("remote.") ? remote : adapter;
          if (!handler) {
            socket.send(JSON.stringify({ type: "error", id: message.id, code: "remote_transport_unavailable" }));
            return;
          }
          void handler.receive(message, (frame) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            let payload = JSON.stringify(frame);
            if (Buffer.byteLength(payload) > MAX_FRAME_BYTES) payload = JSON.stringify({ type: "error", id: frame.id, code: "response_too_large" });
            if (socket.bufferedAmount > MAX_FRAME_BYTES * 2) {
              socket.close(1009, "slow_gateway");
              return;
            }
            socket.send(payload);
          }).catch(() => socket.close(1008, "invalid_request"));
        } catch {
          socket.close(1008, "invalid_frame");
        }
      });
      socket.on("unexpected-response", (_request, response) => {
        rejected = response.statusCode === 401 || response.statusCode === 403;
        response.resume();
        socket.terminate();
      });
      socket.on("error", () => {
      });
      socket.on("close", (code) => {
        adapter.dispose();
        remote?.dispose();
        if (this.socket !== socket) return;
        clearInterval(this.heartbeat);
        if (this.stopped) return;
        if (rejected || code === 4001) {
          this.state = "credential_rejected";
          return;
        }
        this.state = "reconnecting";
        const delay = Math.min(3e4, 500 * 2 ** Math.min(this.attempts++, 6)) + Math.random() * 500;
        this.retry = setTimeout(connect, delay);
        this.retry.unref();
      });
    };
    connect();
  }
  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    this.adapter?.dispose();
    this.socket?.terminate();
    this.socket = void 0;
    this.state = "disabled";
    this.remote?.dispose();
  }
};

// src/management.ts
var recordKey = credentialKey("dsh-mobile", "host");
var savedSchema = z15.object({ origin: z15.string(), name: labelSchema, hostId: z15.uuid(), token: tokenSchema, enabled: z15.boolean() }).strict();
var actions = z15.discriminatedUnion("action", [
  z15.object({ action: z15.literal("server-info"), origin: z15.string().max(2048) }).strict(),
  z15.object({ action: z15.literal("setup"), origin: z15.string().max(2048), name: labelSchema, enrollmentToken: z15.string().max(4096).optional() }).strict(),
  z15.object({ action: z15.literal("change-origin"), origin: z15.string().max(2048), expectedRevision: z15.uuid(), confirmed: z15.boolean() }).strict(),
  z15.object({
    action: z15.literal("replace-server"),
    origin: z15.string().max(2048),
    name: labelSchema,
    enrollmentToken: z15.string().max(4096).optional(),
    expectedRevision: z15.uuid(),
    confirmed: z15.boolean()
  }).strict(),
  z15.object({ action: z15.enum(["enable", "disable", "pair"]) }).strict(),
  z15.object({ action: z15.enum(["approve", "revoke"]), deviceId: z15.uuid() }).strict(),
  z15.object({ action: z15.literal("management"), deviceId: z15.uuid(), enabled: z15.boolean() }).strict()
]);
var devicesSchema = z15.object({ devices: z15.array(z15.object({
  id: z15.uuid(),
  name: labelSchema,
  key_thumbprint: z15.string(),
  status: z15.enum(["pending", "active", "revoked"]),
  management: z15.boolean().default(false),
  created_at: z15.coerce.date(),
  expires_at: z15.coerce.date()
})) });
var Management = class {
  constructor(credentials, service, config, services) {
    this.credentials = credentials;
    this.config = config;
    this.relay = new Relay(service, services);
  }
  saved;
  relay;
  operation = Promise.resolve();
  disposed = false;
  lifetime = new AbortController();
  revision = randomUUID14();
  get configRevision() {
    return this.revision;
  }
  async initialize() {
    const record8 = await this.credentials.readRecord(recordKey);
    if (this.disposed) return;
    if (record8) {
      if (record8.kind !== "grant") throw new Error("invalid_stored_credential");
      this.saved = savedSchema.parse(record8.payload);
      this.origin(this.saved.origin);
      if (this.saved.enabled) this.relay.start(this.saved.origin, this.saved.token, this.saved.hostId);
    }
  }
  origin(raw) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("invalid_gateway_origin");
    }
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("invalid_gateway_origin");
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid_gateway_origin");
    return url.origin;
  }
  async api(path, token, method = "GET", body, origin2 = this.saved?.origin, deadline) {
    if (!origin2) throw new Error("not_configured");
    const response = await fetch(origin2 + path, {
      method,
      redirect: "error",
      signal: AbortSignal.any([this.lifetime.signal, AbortSignal.timeout(15e3), ...deadline ? [deadline] : []]),
      headers: { ...token ? { authorization: "Bearer " + token } : {}, "content-type": "application/json" },
      body: body === void 0 ? void 0 : JSON.stringify(body)
    }).catch((error) => {
      throw new Error(error instanceof Error && error.name === "TimeoutError" ? "gateway_timeout" : "gateway_unreachable");
    });
    if (!response.ok) throw new Error(`gateway_http_${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty_gateway_response");
    let length = 0;
    const chunks = [];
    for (; ; ) {
      const item = await reader.read();
      if (item.done) break;
      length += item.value.byteLength;
      if (length > 1024 * 1024) {
        await reader.cancel();
        throw new Error("gateway_response_too_large");
      }
      chunks.push(item.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  }
  async save(saved) {
    if (this.disposed) throw new Error("plugin_stopped");
    await this.credentials.modifyRecord(recordKey, async () => ({ kind: "grant", payload: saved }));
    this.saved = saved;
    this.revision = randomUUID14();
  }
  async serverInfo(origin2, deadline) {
    try {
      return z15.object({ registrationMode: z15.enum(["open", "private"]) }).parse(await this.api("/v1/server-info", void 0, "GET", void 0, origin2, deadline));
    } catch (error) {
      if (error instanceof Error && error.message === "gateway_http_404") return { registrationMode: "private" };
      throw error;
    }
  }
  async enroll(origin2, name2, enrollmentToken, allowLocalCredential = false, deadline) {
    const { registrationMode } = await this.serverInfo(origin2, deadline);
    let bootstrap;
    if (registrationMode === "private") {
      bootstrap = enrollmentToken?.trim();
      if (!bootstrap && allowLocalCredential) {
        try {
          bootstrap = (await this.credentials.resolve(credentialRef4(this.config.enrollmentRef ?? "DSH_MOBILE_ENROLLMENT_TOKEN")))?.value;
        } catch {
          throw new Error("enrollment_credential_unavailable");
        }
      }
      if (!bootstrap) throw new Error("enrollment_credential_missing");
      const checked = tokenSchema.safeParse(bootstrap);
      if (!checked.success) throw new Error("enrollment_credential_invalid");
      bootstrap = checked.data;
    }
    return z15.object({ id: z15.uuid(), token: tokenSchema }).parse(await this.api("/v1/hosts", bootstrap, "POST", { name: name2 }, origin2, deadline));
  }
  async status() {
    const saved = this.saved;
    if (!saved) return { configured: false, connection: this.relay.state, devices: [] };
    const base = {
      configured: true,
      connection: this.relay.state,
      origin: saved.origin,
      name: saved.name,
      hostId: saved.hostId,
      enabled: saved.enabled,
      configRevision: this.configRevision
    };
    try {
      const result = devicesSchema.parse(await this.api("/v1/host/devices", saved.token));
      return { ...base, devices: result.devices.map((device) => ({
        id: device.id,
        name: device.name,
        fingerprint: device.key_thumbprint,
        status: device.status,
        management: device.management,
        expiresAt: device.expires_at.toISOString()
      })) };
    } catch {
      return { ...base, devices: [], deviceError: "\u65E0\u6CD5\u8BFB\u53D6\u8BBE\u5907\u5217\u8868\uFF0C\u8BF7\u68C0\u67E5\u516C\u7F51\u670D\u52A1\u548C\u7535\u8111\u51ED\u636E\u3002" };
    }
  }
  async action(raw) {
    if (this.disposed) throw new Error("plugin_stopped");
    const input = actions.parse(raw);
    if (input.action === "server-info") return this.serverInfo(this.origin(input.origin));
    if (input.action === "setup") {
      if (this.saved) throw new Error("already_configured");
      const origin2 = this.origin(input.origin);
      const result = await this.enroll(origin2, input.name, input.enrollmentToken, true);
      await this.save({ origin: origin2, name: input.name, hostId: result.id, token: result.token, enabled: false });
      return { configured: true };
    }
    const saved = this.saved;
    if (!saved) throw new Error("not_configured");
    if (input.action === "change-origin" || input.action === "replace-server") {
      if (!input.confirmed) throw new Error("connection_change_confirmation_required");
      if (input.expectedRevision !== this.configRevision) throw new Error("connection_config_changed");
      const origin2 = this.origin(input.origin);
      const deadline = AbortSignal.timeout(15e3);
      let next = { ...saved, origin: origin2 };
      if (input.action === "change-origin") {
        await this.serverInfo(origin2, deadline);
        devicesSchema.parse(await this.api("/v1/host/devices", saved.token, "GET", void 0, origin2, deadline));
      } else {
        const result = await this.enroll(origin2, input.name, input.enrollmentToken, false, deadline);
        devicesSchema.parse(await this.api("/v1/host/devices", result.token, "GET", void 0, origin2, deadline));
        next = { ...next, name: input.name, hostId: result.id, token: result.token };
      }
      if (deadline.aborted) throw new Error("gateway_timeout");
      await this.save(next);
      this.relay.stop();
      if (next.enabled && !this.disposed) this.relay.start(next.origin, next.token, next.hostId);
      return { updated: true };
    }
    if (input.action === "enable" || input.action === "disable") {
      const enabled = input.action === "enable";
      if (!enabled) this.relay.stop();
      await this.save({ ...saved, enabled });
      if (enabled && !this.disposed) this.relay.start(saved.origin, saved.token, saved.hostId);
      return { enabled };
    }
    if (input.action === "pair") {
      const key = randomBytes(32).toString("base64url");
      await this.api("/v1/host/pairings", saved.token, "POST", { key });
      return { link: saved.origin + "/pair#key=" + key, expiresAt: new Date(Date.now() + 3e5).toISOString() };
    }
    if (!("deviceId" in input)) throw new Error("invalid_action");
    await this.api(`/v1/host/devices/${input.deviceId}/${input.action}`, saved.token, "POST", input.action === "management" ? { enabled: input.enabled } : {});
    return { updated: true };
  }
  async handle(request) {
    const headers = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
    try {
      if (request.method === "GET") return Response.json(await this.status(), { headers });
      if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "json_required" }, { status: 415, headers });
      const raw = await request.json();
      const next = this.operation.then(() => this.action(raw));
      this.operation = next.catch(() => {
      });
      return Response.json(await next, { headers });
    } catch (error) {
      const message = error instanceof Error && /^[a-z][a-z0-9_]{0,80}$/.test(error.message) ? error.message : "operation_failed";
      return Response.json({ error: message }, { status: 400, headers });
    }
  }
  dispose() {
    this.disposed = true;
    this.lifetime.abort();
    this.relay.stop();
  }
};

// src/job-control.ts
import { randomUUID as randomUUID15 } from "node:crypto";

// src/job-output.ts
import { constants } from "node:fs";
import { lstat as lstat2, open as open2 } from "node:fs/promises";
async function recoverOutput(request, read, signal) {
  signal.throwIfAborted();
  const first = read(), output = first.output;
  if (output.state !== "available" || !output.lossy || !output.spillPath) return wire(first);
  let handle, recovered;
  try {
    const before = await lstat2(output.spillPath);
    if (!before.isFile() || before.isSymbolicLink()) throw new Error("invalid spill");
    signal.throwIfAborted();
    handle = await open2(output.spillPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new Error("changed spill");
    const size = Math.min(request.maxBytes, output.totalBytes - request.fromByte);
    if (opened.size < output.totalBytes) throw new Error("incomplete spill");
    const buffer = Buffer.alloc(size);
    let length = 0;
    while (length < size) {
      signal.throwIfAborted();
      const { bytesRead } = await handle.read(buffer, length, size - length, request.fromByte + length);
      if (!bytesRead) throw new Error("incomplete spill");
      length += bytesRead;
    }
    const after = await lstat2(output.spillPath);
    if (!after.isFile() || after.dev !== opened.dev || after.ino !== opened.ino || after.size < output.totalBytes) throw new Error("changed spill");
    recovered = buffer;
  } catch {
  } finally {
    await handle?.close();
  }
  signal.throwIfAborted();
  const latest = read();
  if (recovered && latest.output.state === "available" && latest.output.spillPath === output.spillPath && latest.output.totalBytes >= request.fromByte + recovered.byteLength) {
    return wire({ snapshot: latest.snapshot, output: {
      state: "available",
      bytes: recovered,
      startOffset: request.fromByte,
      nextOffset: request.fromByte + recovered.byteLength,
      totalBytes: latest.output.totalBytes,
      lossy: false
    } });
  }
  return wire(latest);
}
function wire({ output, snapshot }) {
  const base = { state: output.state, status: snapshot.status };
  if (output.state !== "available") return base;
  return {
    ...base,
    data: Buffer.from(output.bytes).toString("base64"),
    startOffset: output.startOffset,
    nextOffset: output.nextOffset,
    totalBytes: output.totalBytes,
    lossy: output.lossy
  };
}

// src/job-ring.ts
function ringOutput(registry, id, caller, request) {
  const job = registry.get(id, caller);
  const result = registry.readAt(id, request.fromByte, caller);
  const startOffset = Math.max(request.fromByte, job.output.earliest);
  const nextOffset = Math.min(startOffset + request.maxBytes, result.next);
  if (startOffset > result.next) throw Error("remote_job_output_failed");
  const buffers = [];
  let producerGap = false;
  for (const chunk of result.chunks) {
    if (chunk.at >= nextOffset) break;
    const bytes2 = Buffer.from(chunk.text);
    const begin = Math.max(startOffset, chunk.at), end = Math.min(nextOffset, chunk.at + bytes2.length);
    const channel = chunk.channel === "stderr" ? "stderr" : "stdout";
    if (begin >= end || channel !== request.stream) continue;
    buffers.push(bytes2.subarray(begin - chunk.at, end - chunk.at));
    if (chunk.gapBefore && begin === chunk.at) producerGap = true;
  }
  const bytes = Buffer.concat(buffers);
  return {
    state: "available",
    status: job.status,
    coordinate: "ring",
    data: bytes.toString("base64"),
    startOffset,
    nextOffset,
    totalBytes: result.next,
    lossy: startOffset > request.fromByte,
    skippedBytes: nextOffset - startOffset - bytes.length,
    producerGap
  };
}

// src/job-control.ts
var JobControl = class {
  constructor(ctx, version = "0.1.6-alpha.2") {
    this.ctx = ctx;
    this.version = version;
  }
  generation = randomUUID15();
  active = true;
  dispose() {
    this.active = false;
  }
  get outputCoordinates() {
    return isProfileDshVersion(this.version) ? "ring" : "channel";
  }
  get outputAvailable() {
    return this.active && (this.outputCoordinates === "ring" ? typeof Reflect.get(this.ctx.jobs, "readAt") === "function" : typeof this.ctx.jobs.readOutputBytes === "function");
  }
  job(id, agent) {
    return this.outputCoordinates === "ring" ? this.ctx.jobs.get(id, agent.id) : this.ctx.jobs.get(id, agent);
  }
  async output(operation, signal) {
    const read = () => {
      if (!this.active || operation.generation !== this.generation) throw new Error("remote_job_stale");
      const agent = this.ctx.agents.get(operation.sessionId);
      if (!agent) throw new Error("remote_job_session_closed");
      const id = operation.jobId;
      let job;
      try {
        job = this.job(id, agent);
      } catch {
        throw new Error("remote_job_missing");
      }
      if (job.startedAt !== operation.startedAt) throw new Error("remote_job_stale");
      const jobs = this.ctx.jobs;
      if (typeof jobs.readOutputBytes !== "function") throw new Error("remote_job_output_unavailable");
      try {
        return jobs.readOutputBytes(id, operation, agent);
      } catch {
        throw new Error("remote_job_output_failed");
      }
    };
    if (this.outputCoordinates === "ring") {
      signal.throwIfAborted();
      if (!this.active || operation.generation !== this.generation) throw new Error("remote_job_stale");
      const agent = this.ctx.agents.get(operation.sessionId);
      if (!agent) throw new Error("remote_job_session_closed");
      const id = operation.jobId;
      let job;
      try {
        job = this.job(id, agent);
      } catch {
        throw new Error("remote_job_missing");
      }
      if (job.startedAt !== operation.startedAt) throw new Error("remote_job_stale");
      try {
        return ringOutput(this.ctx.jobs, id, agent.id, operation);
      } catch {
        throw new Error("remote_job_output_failed");
      }
    }
    return recoverOutput(operation, read, signal);
  }
  stop(operation) {
    if (!this.active || operation.generation !== this.generation) throw new Error("remote_job_stale");
    const agent = this.ctx.agents.get(operation.sessionId);
    if (!agent) throw new Error("remote_job_session_closed");
    const id = operation.jobId;
    let job;
    try {
      job = this.job(id, agent);
    } catch {
      throw new Error("remote_job_missing");
    }
    if (job.startedAt !== operation.startedAt) throw new Error("remote_job_stale");
    if (job.status === "stopping") return { status: "already-stopping" };
    if (job.status !== "running") return { status: "already-finished" };
    try {
      return { status: this.outputCoordinates === "ring" ? this.ctx.jobs.kill(id, agent.id, "DSHM user requested stop") : this.ctx.jobs.kill(id, agent, "DSHM user requested stop") };
    } catch {
      throw new Error("remote_job_stop_failed");
    }
  }
};

// src/feedback-notifications.ts
var FeedbackNotifications = class {
  listeners = /* @__PURE__ */ new Map();
  lifetime = new AbortController();
  constructor(ctx) {
    ctx.on("session/event", (session, event) => {
      if (event.type === "feedback/message-put" || event.type === "feedback/message-delete") this.changed(session.id);
    });
    ctx.on("feedback/committed", (inspection) => {
      const event = inspection.events.at(-1);
      if (!["feedback/message-put", "feedback/message-delete"].includes(event?.type ?? "")) return;
      this.changed(inspection.meta.id);
    });
    ctx.effect(() => () => {
      this.lifetime.abort();
      this.listeners.clear();
    }, "dsh-mobile: feedback notifications");
  }
  changed(sessionId2) {
    for (const listener of this.listeners.get(sessionId2) ?? []) listener();
  }
  async *follow(sessionId2, caller) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    signal.throwIfAborted();
    let revision = 0, delivered = 0, wake;
    const notify = () => {
      const resolve2 = wake;
      wake = void 0;
      resolve2?.();
    };
    const changed = () => {
      revision++;
      notify();
    };
    const listeners = this.listeners.get(sessionId2) ?? /* @__PURE__ */ new Set();
    this.listeners.set(sessionId2, listeners);
    listeners.add(changed);
    signal.addEventListener("abort", notify, { once: true });
    try {
      yield { type: "ready", revision: 0 };
      while (!signal.aborted) {
        if (revision !== delivered) {
          delivered = revision;
          yield { type: "changed", revision: delivered };
        } else await new Promise((resolve2) => {
          wake = resolve2;
        });
      }
    } finally {
      signal.removeEventListener("abort", notify);
      listeners.delete(changed);
      if (!listeners.size) this.listeners.delete(sessionId2);
    }
  }
};

// src/task-notifications.ts
import { randomUUID as randomUUID16 } from "node:crypto";
import { SessionId } from "@deepseek-ai/dsh-session";
function notificationText(value, limit) {
  const plain = value.slice(0, 4096).replace(/(```|~~~)[\s\S]*?(?:\1|$)/g, " ").replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= limit) return plain;
  const prefix = plain.slice(0, limit - 1).replace(/[\ud800-\udbff]$/, "");
  return prefix + "\u2026";
}
var TaskNotifications = class {
  constructor(ctx, pending = () => void 0) {
    this.ctx = ctx;
    this.pending = pending;
    ctx.on("session/event", (session, event) => {
      if (event.type === "turn/start") this.replies.delete(session);
      if (event.type === "assistant/message") {
        const text = notificationText(event.data.message.content.filter((block) => block.type === "text").map((block) => block.text).join(" "), 240);
        if (text) this.replies.set(session, { turn: event.data.turn, text });
      }
      if (event.type !== "turn/end") return;
      const reason = event.data.reason.kind;
      if (reason !== "completed" && reason !== "error" && reason !== "blocked" && reason !== "max-tokens") return;
      const outcome = {
        type: "outcome",
        sessionId: session.id,
        seq: event.seq,
        time: event.time,
        turn: event.data.turn,
        reason
      };
      const reply = this.replies.get(session);
      const preview = this.preview(session, reason === "completed" && reply?.turn === event.data.turn ? reply.text : "");
      for (const listener of this.listeners) listener({ ...outcome, preview });
    });
    ctx.effect(() => () => {
      this.lifetime.abort();
      this.listeners.clear();
    }, "dsh-mobile: task notifications");
  }
  generation = randomUUID16();
  listeners = /* @__PURE__ */ new Set();
  lifetime = new AbortController();
  replies = /* @__PURE__ */ new WeakMap();
  get pendingAvailable() {
    return !!this.pending();
  }
  preview(session, text = "") {
    return { title: notificationText(session ? this.ctx.get("sessionTitle")?.get(session)?.title ?? "" : "", 120), text };
  }
  async *follow(caller, previewVersion) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    signal.throwIfAborted();
    if (this.listeners.size >= 64) throw new Error("remote_notifications_busy");
    const queue = [];
    let overflow = false, wake;
    const notify = () => {
      const resolve2 = wake;
      wake = void 0;
      resolve2?.();
    };
    const receive = (event) => {
      if (overflow || signal.aborted) return;
      if (queue.length >= 256) {
        overflow = true;
        queue.length = 0;
      } else queue.push(event);
      notify();
    };
    this.listeners.add(receive);
    signal.addEventListener("abort", notify, { once: true });
    let observation;
    try {
      observation = this.pending()?.observe(receive);
      yield { type: "ready", generation: this.generation, pendingAvailable: !!observation, pending: observation?.snapshot ?? [] };
      while (!signal.aborted) {
        if (overflow) throw new Error("remote_notifications_overflow");
        const event = queue.shift();
        if (event?.type === "outcome") {
          const { preview, ...legacy } = event;
          yield previewVersion === 1 ? event : legacy;
        } else if (event?.type === "pending" && previewVersion === 1) {
          yield { ...event, preview: this.preview(this.ctx.get("sessions")?.get(SessionId(event.item.sessionId))) };
        } else if (event) yield event;
        else await new Promise((resolve2) => {
          wake = resolve2;
        });
      }
    } finally {
      observation?.dispose();
      signal.removeEventListener("abort", notify);
      this.listeners.delete(receive);
      queue.length = 0;
    }
  }
};

// src/feedback-events.ts
function registerFeedbackEvents(ctx, notifications) {
  return ctx.connection.fetch.register({
    path: "/api/dsh-mobile/feedback-events",
    methods: ["GET"],
    requestBody: "buffered",
    fetch: async (request) => {
      const params = new URL(request.url).searchParams;
      const sessionId2 = params.get("sessionId");
      if (!sessionId2 || sessionId2.length > 200 || /[\u0000-\u001f\u007f]/.test(sessionId2) || [...params.keys()].some((key) => key !== "sessionId") || params.getAll("sessionId").length !== 1) {
        return Response.json({ error: "invalid_session" }, { status: 400 });
      }
      const lifetime = new AbortController();
      const signal = AbortSignal.any([request.signal, lifetime.signal]);
      const events = notifications.follow(sessionId2, signal);
      const encoder = new TextEncoder();
      const body = new ReadableStream({
        async pull(controller) {
          try {
            const next = await events.next();
            if (next.done) controller.close();
            else controller.enqueue(encoder.encode(`data: ${JSON.stringify(next.value)}

`));
          } catch (error) {
            controller.error(error);
          }
        },
        async cancel() {
          lifetime.abort();
          await events.return();
        }
      }, { highWaterMark: 0 });
      return new Response(body, { headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        "x-accel-buffering": "no"
      } });
    }
  });
}

// src/index.ts
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";

// src/profile-settings.ts
var modules = {
  "llm-deepseek": ["@deepseek-ai/dsh-llm-deepseek-api-key"],
  "llm-pi-ai": ["@deepseek-ai/dsh-llm-pi-ai"],
  "agent-loop": ["@deepseek-ai/dsh-agent-loop"],
  "agent-preset-registry": ["@deepseek-ai/dsh-agent-preset-registry"],
  "ui-settings": ["@deepseek-ai/dsh-client-ui-settings"],
  subagent: ["@deepseek-ai/dsh-subagent"],
  "subagent-model-selection": ["@deepseek-ai/dsh-subagent-model-selection"],
  "web-search-deepseek": ["@deepseek-ai/dsh-web-search-deepseek"],
  shell: [process.platform === "win32" ? "@deepseek-ai/dsh-pwsh-sandbox" : "@deepseek-ai/dsh-bash-sandbox"]
};
var ProfileSettings = class {
  constructor(forms, entries) {
    this.forms = forms;
    this.entries = entries;
  }
  values = /* @__PURE__ */ new Map();
  get writable() {
    return this.forms.writable;
  }
  entryId(namespace5) {
    return this.bindings().get(namespace5)?.options.id;
  }
  namespaceOf(entryId) {
    return [...this.bindings()].find(([, entry]) => entry.options.id === entryId)?.[0];
  }
  bindings() {
    const result = /* @__PURE__ */ new Map();
    const configurable = new Set(this.forms.describe({ redactSecrets: true }).map((view) => view.ns));
    const entries = this.entries().filter((entry) => configurable.has(entry.options.id));
    for (const [namespace5, names] of Object.entries(modules)) {
      const matches = entries.filter((entry) => names.includes(entry.options.name));
      if (matches.length === 1 && entries.filter((entry) => entry.options.id === matches[0].options.id).length === 1)
        result.set(namespace5, matches[0]);
    }
    return result;
  }
  describe(options) {
    const descriptors = this.forms.describe(options);
    return [...this.bindings()].flatMap(([namespace5, entry]) => {
      const matches = descriptors.filter((view) => view.ns === entry.options.id);
      return matches.length === 1 ? [{ ...matches[0], ns: namespace5, documentId: entry.options.id }] : [];
    });
  }
  get(namespace5) {
    const entry = this.bindings().get(namespace5);
    const descriptors = this.forms.describe();
    const matches = entry ? descriptors.filter((view2) => view2.ns === entry.options.id) : [];
    if (!entry || matches.length !== 1) {
      this.values.delete(namespace5);
      return void 0;
    }
    const view = matches[0], previous = this.values.get(namespace5);
    if (!previous || previous.entry !== entry || previous.revision !== view.revision)
      this.values.set(namespace5, { entry, revision: view.revision, value: view.value });
    return this.values.get(namespace5).value;
  }
  async mutate(namespace5, edits, expectedRevision) {
    const entry = this.bindings().get(namespace5);
    if (!entry) throw new Error("remote_settings_unavailable");
    await this.forms.mutate(entry.options.id, edits, expectedRevision);
  }
};

// src/profile-providers.ts
function profileProviders(runtime, settings) {
  return {
    listProviders: () => runtime.listProviders(),
    listConfigurableProviders: () => runtime.listConfigurableProviders().map((row) => ({
      ...row,
      settingsNs: settings.namespaceOf(row.settingsNs) ?? row.settingsNs
    })),
    discoverModels(namespace5, request, signal) {
      const endpointProbe = namespace5 === "dshm.pi-ai-endpoint-v2";
      const entryId = settings.entryId(endpointProbe ? "llm-pi-ai" : namespace5);
      if (!entryId) throw Error("remote_model_discovery_unavailable");
      return runtime.discoverModels(endpointProbe ? entryId + ":dshm-endpoint-v2" : entryId, request, signal);
    }
  };
}

// src/subagent-service-state.ts
var SubagentServiceState = class {
  available = false;
  listeners = /* @__PURE__ */ new Set();
  lifetime = new AbortController();
  constructor(ctx) {
    const change = (available) => {
      if (this.available === available) return;
      this.available = available;
      for (const listener of this.listeners) listener();
    };
    ctx.inject(["subagents"], (scope) => {
      change(true);
      scope.effect(() => () => change(false), "dsh-mobile: subagent service state");
    });
    ctx.effect(() => () => {
      this.lifetime.abort();
      this.listeners.clear();
    }, "dsh-mobile: subagent state lifetime");
  }
  async *follow(caller) {
    const signal = AbortSignal.any([caller, this.lifetime.signal]);
    signal.throwIfAborted();
    if (this.listeners.size >= 64) throw new Error("remote_subagent_state_busy");
    let changed = true, wake;
    const notify = () => {
      changed = true;
      const resolve2 = wake;
      wake = void 0;
      resolve2?.();
    };
    this.listeners.add(notify);
    signal.addEventListener("abort", notify, { once: true });
    try {
      while (!signal.aborted) {
        if (changed) {
          changed = false;
          yield { available: this.available };
        } else await new Promise((resolve2) => {
          wake = resolve2;
        });
      }
    } finally {
      signal.removeEventListener("abort", notify);
      this.listeners.delete(notify);
    }
  }
};

// src/index.ts
var name = "dsh-mobile";
var inject = ["sessionController", "credentials", "connection", "typertGateway", "clientModules", "attachments"];
var Config = Schema2.object({
  enrollmentRef: Schema2.string().default("DSH_MOBILE_ENROLLMENT_TOKEN")
});
async function apply(ctx, config) {
  const require2 = createRequire(import.meta.url);
  const version = require2("@deepseek-ai/dsh-api-gateway/package.json").version;
  const moduleVersion = require2("@deepseek-ai/dsh-client-modules/package.json").version;
  const presetServices = () => {
    const presets = ctx.get("agentPresets"), editor = ctx.get("configEditor");
    return presets && editor ? { presets, editor } : void 0;
  };
  let profileSettings;
  const settings = () => {
    const forms = ctx.get("settings");
    if (!forms) return void 0;
    if (!isProfileDshVersion(version)) return "get" in forms ? forms : void 0;
    if ("get" in forms) return void 0;
    const editor = ctx.get("configEditor");
    if (!editor) return void 0;
    const identity14 = (value) => Reflect.get(value, symbols16.original) ?? value;
    const formIdentity = identity14(forms), editorIdentity = identity14(editor);
    if (!profileSettings || profileSettings.forms !== formIdentity || profileSettings.editor !== editorIdentity)
      profileSettings = { forms: formIdentity, editor: editorIdentity, value: new ProfileSettings(forms, () => editor.entries()) };
    return profileSettings.value;
  };
  let providerAdapter;
  const providers = () => {
    const runtime = ctx.get("llm");
    if (!runtime || !isProfileDshVersion(version)) return runtime;
    const view = settings();
    if (!(view instanceof ProfileSettings)) return void 0;
    const runtimeIdentity = Reflect.get(runtime, symbols16.original) ?? runtime;
    if (!providerAdapter || providerAdapter.runtime !== runtimeIdentity || providerAdapter.settings !== view)
      providerAdapter = { runtime: runtimeIdentity, settings: view, value: profileProviders(runtime, view) };
    return providerAdapter.value;
  };
  let jobControl;
  ctx.inject(["jobs", "agents"], (scope) => {
    const control = new JobControl(scope, version);
    jobControl = control;
    scope.effect(() => () => {
      control.dispose();
      if (jobControl === control) jobControl = void 0;
    }, "dsh-mobile: job controller");
  });
  let credentialRevision = 0;
  let workspaceDesktop;
  ctx.inject(["fs"], (scope) => {
    const services = { fs: scope.fs, sessions: scope.sessionController };
    workspaceDesktop = services;
    scope.effect(() => () => {
      if (workspaceDesktop === services) workspaceDesktop = void 0;
    }, "dsh-mobile: desktop file services");
  });
  const feedbackNotifications = new FeedbackNotifications(ctx);
  const taskNotifications = new TaskNotifications(ctx);
  const subagentState = new SubagentServiceState(ctx);
  registerFeedbackEvents(ctx, feedbackNotifications);
  ctx.on("credentials/reference-updated", () => {
    credentialRevision++;
  });
  const management = new Management(ctx.credentials, ctx.sessionController, config, {
    connection: ctx.connection,
    gateway: ctx.typertGateway,
    modules: ctx.clientModules,
    attachments: { sessions: ctx.sessionController, store: ctx.attachments },
    attachmentOffice: () => ctx.get("officeToPdf"),
    jobControl: () => jobControl,
    settings,
    agentPresets: () => ctx.get("agentPresets"),
    profilePresets: isProfileDshVersion(version) ? presetServices : void 0,
    modelDiscovery: providers,
    providerDirectory: providers,
    accountModelAvailable: isProfileDshVersion(version) ? async (signal) => {
      signal.throwIfAborted();
      const runtime = ctx.get("llm");
      if (!runtime) return false;
      const models = await runtime.listModels("deepseek-account");
      signal.throwIfAborted();
      return models.length > 0;
    } : void 0,
    environment: () => launchEnvironmentOf(ctx),
    feedbackNotifications,
    taskNotifications,
    subagentState,
    workspaceDesktop: () => workspaceDesktop,
    computerKey: {
      credentials: () => ctx.get("credentials"),
      settings,
      revision: () => credentialRevision,
      enrollmentRef: config.enrollmentRef ?? "DSH_MOBILE_ENROLLMENT_TOKEN"
    },
    version: version === moduleVersion ? version : "incompatible"
  });
  ctx.effect(() => () => management.dispose(), "dsh-mobile: lifecycle");
  await management.initialize();
  ctx.connection.fetch.register({
    path: "/api/dsh-mobile",
    methods: ["GET", "POST"],
    requestBody: "buffered",
    fetch: (request) => management.handle(request)
  });
}
export {
  Config,
  apply,
  inject,
  name
};
