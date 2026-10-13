import { isProfileDshVersion } from './profile-dsh-version.js'
import { symbols, type Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-api-session-controller'
import type {} from '@deepseek-ai/dsh-credentials'
import type {} from '@deepseek-ai/dsh-api-gateway/types'
import type {} from '@deepseek-ai/dsh-client-modules'
import type {} from '@deepseek-ai/dsh-attachment'
import type {} from '@deepseek-ai/dsh-office-to-pdf'
import type {} from '@deepseek-ai/dsh-settings'
import { createRequire } from 'node:module'
import { Management } from './management.js'
import type { PluginConfig } from './config.js'
import { JobControl } from './job-control.js'
import { FeedbackNotifications } from './feedback-notifications.js'
import { TaskNotifications } from './task-notifications.js'
import { registerFeedbackEvents } from './feedback-events.js'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import type { WorkspaceDesktopServices } from './workspace-desktop.js'
import { ProfileSettings, type ProfileSettingsForms, type ProfileSettingsEntry } from './profile-settings.js'
import type { SettingsAccess } from './settings-access.js'
import { profileProviders } from './profile-providers.js'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import type { ProfilePresetEditor } from './profile-preset-directory.js'
import { SubagentServiceState } from './subagent-service-state.js'

export const name = 'dsh-mobile'
export const inject = ['sessionController', 'credentials', 'connection', 'typertGateway', 'clientModules', 'attachments']
export type Config = PluginConfig
export const Config = Schema.object({
  enrollmentRef: Schema.string().default('DSH_MOBILE_ENROLLMENT_TOKEN'),
})

export async function apply(ctx: Context, config: Config): Promise<void> {
  const require = createRequire(import.meta.url)
  const version: string = require('@deepseek-ai/dsh-api-gateway/package.json').version
  const moduleVersion: string = require('@deepseek-ai/dsh-client-modules/package.json').version
  const presetServices = () => {
    const presets = ctx.get('agentPresets'), editor = ctx.get('configEditor') as ProfilePresetEditor | undefined
    return presets && editor ? { presets, editor } : undefined
  }
  // 预设归档依赖旧本体补丁；纯插件启动不创建此服务，保留官方预设读取入口。
  let profileSettings: { forms: unknown; editor: unknown; value: ProfileSettings } | undefined
  const settings = (): SettingsAccess | undefined => {
    const forms = ctx.get('settings') as ProfileSettingsForms | SettingsAccess | undefined
    if (!forms) return undefined
    if (!isProfileDshVersion(version)) return 'get' in forms ? forms : undefined
    if ('get' in forms) return undefined
    const editor = ctx.get('configEditor') as { entries(): ProfileSettingsEntry[] } | undefined
    if (!editor) return undefined
    const identity = (value: object) => Reflect.get(value, symbols.original) ?? value
    const formIdentity = identity(forms), editorIdentity = identity(editor)
    if (!profileSettings || profileSettings.forms !== formIdentity || profileSettings.editor !== editorIdentity)
      profileSettings = { forms: formIdentity, editor: editorIdentity, value: new ProfileSettings(forms, () => editor.entries()) }
    return profileSettings.value
  }
  let providerAdapter: { runtime: unknown; settings: ProfileSettings; value: ReturnType<typeof profileProviders> } | undefined
  const providers = () => {
    const runtime = ctx.get('llm') as LlmRuntime | undefined
    if (!runtime || !isProfileDshVersion(version)) return runtime
    const view = settings()
    if (!(view instanceof ProfileSettings)) return undefined
    const runtimeIdentity = Reflect.get(runtime, symbols.original) ?? runtime
    if (!providerAdapter || providerAdapter.runtime !== runtimeIdentity || providerAdapter.settings !== view)
      providerAdapter = { runtime: runtimeIdentity, settings: view, value: profileProviders(runtime, view) }
    return providerAdapter.value
  }
  let jobControl: JobControl | undefined
  ctx.inject(['jobs', 'agents'], scope => {
    const control = new JobControl(scope, version)
    jobControl = control
    scope.effect(() => () => { control.dispose(); if (jobControl === control) jobControl = undefined }, 'dsh-mobile: job controller')
  })
  let credentialRevision = 0
  let workspaceDesktop: WorkspaceDesktopServices | undefined
  ctx.inject(['fs'], scope => {
    const services = { fs: scope.fs, sessions: scope.sessionController }
    workspaceDesktop = services
    scope.effect(() => () => { if (workspaceDesktop === services) workspaceDesktop = undefined }, 'dsh-mobile: desktop file services')
  })
  const feedbackNotifications = new FeedbackNotifications(ctx)
  // 只订阅官方会话结算；旧补丁的输出、应用、动态目录及待审批旁路不接入产品。
  const taskNotifications = new TaskNotifications(ctx)
  const subagentState = new SubagentServiceState(ctx)
  registerFeedbackEvents(ctx, feedbackNotifications)
  // 模型与搜索可使用电脑自定义引用；任何引用更新都保守地使旧密码窗口快照失效。
  ctx.on('credentials/reference-updated', () => { credentialRevision++ })
  const management = new Management(ctx.credentials, ctx.sessionController, config, {
    connection: ctx.connection, gateway: ctx.typertGateway, modules: ctx.clientModules,
    attachments: { sessions: ctx.sessionController, store: ctx.attachments },
    attachmentOffice: () => ctx.get('officeToPdf'),
    jobControl: () => jobControl,
    settings,
    agentPresets: () => ctx.get('agentPresets'),
    profilePresets: isProfileDshVersion(version) ? presetServices : undefined,
    modelDiscovery: providers,
    providerDirectory: providers,
    accountModelAvailable: isProfileDshVersion(version) ? async signal => {
      signal.throwIfAborted()
      const runtime = ctx.get('llm')
      if (!runtime) return false
      const models = await runtime.listModels('deepseek-account')
      signal.throwIfAborted()
      return models.length > 0
    } : undefined,
    environment: () => launchEnvironmentOf(ctx),
    feedbackNotifications,
    taskNotifications,
    subagentState,
    workspaceDesktop: () => workspaceDesktop,
    computerKey: { credentials: () => ctx.get('credentials'), settings,
      revision: () => credentialRevision, enrollmentRef: config.enrollmentRef ?? 'DSH_MOBILE_ENROLLMENT_TOKEN' },
    version: version === moduleVersion ? version : 'incompatible',
  })
  ctx.effect(() => () => management.dispose(), 'dsh-mobile: lifecycle')
  await management.initialize()
  // 复用 dsh 的 Host/Origin、桌面窗口及 Cookie 鉴权；公网中继不能访问此路由。
  ctx.connection.fetch.register({ path: '/api/dsh-mobile', methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: request => management.handle(request) })
}
