import type { Context } from '@deepseek-ai/cordis'
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
import { CommandOutput } from './command-output.js'
import { FeedbackNotifications } from './feedback-notifications.js'
import { TaskNotifications } from './task-notifications.js'
import { pendingNotificationsOf } from './pending-notifications.js'
import { registerFeedbackEvents } from './feedback-events.js'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import type { WorkspaceDesktopServices } from './workspace-desktop.js'
import type { DesktopAppServices } from './desktop-apps.js'
import { cordisInspectService } from './cordis-connections.js'

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
  let jobControl: JobControl | undefined
  ctx.inject(['jobs', 'agents'], scope => {
    const control = new JobControl(scope)
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
  let commandOutput: CommandOutput | undefined
  let desktopApps: DesktopAppServices | undefined
  ctx.inject(['fs', 'dshmDesktopApps'], scope => {
    const services = { fs: scope.fs, sessions: scope.sessionController, apps: scope.dshmDesktopApps }
    desktopApps = services
    scope.effect(() => () => { if (desktopApps === services) desktopApps = undefined }, 'dsh-mobile: desktop application services')
  })
  ctx.inject(['tools', 'shell', 'agents'], scope => {
    const output = new CommandOutput(scope)
    commandOutput = output
    scope.effect(() => () => { output.dispose(); if (commandOutput === output) commandOutput = undefined }, 'dsh-mobile: command output')
  })
  const feedbackNotifications = new FeedbackNotifications(ctx)
  const taskNotifications = new TaskNotifications(ctx, () => pendingNotificationsOf(ctx.typertGateway))
  registerFeedbackEvents(ctx, feedbackNotifications)
  // 模型与搜索可使用电脑自定义引用；任何引用更新都保守地使旧密码窗口快照失效。
  ctx.on('credentials/reference-updated', () => { credentialRevision++ })
  const management = new Management(ctx.credentials, ctx.sessionController, config, {
    connection: ctx.connection, gateway: ctx.typertGateway, modules: ctx.clientModules,
    attachments: { sessions: ctx.sessionController, store: ctx.attachments },
    attachmentOffice: () => ctx.get('officeToPdf'),
    jobControl: () => jobControl,
    commandOutput: () => commandOutput,
    settings: () => ctx.get('settings'),
    agentPresets: () => ctx.get('agentPresets'),
    modelDiscovery: () => ctx.get('llm'),
    providerDirectory: () => ctx.get('llm'),
    environment: () => launchEnvironmentOf(ctx),
    feedbackNotifications,
    taskNotifications,
    workspaceDesktop: () => workspaceDesktop,
    desktopApps: () => desktopApps,
    cordisInspect: () => cordisInspectService(ctx.get('cordisInspect'), ctx.get('dynamicCordisRunner')),
    computerKey: { credentials: () => ctx.get('credentials'), settings: () => ctx.get('settings'),
      revision: () => credentialRevision, enrollmentRef: config.enrollmentRef ?? 'DSH_MOBILE_ENROLLMENT_TOKEN' },
    version: version === moduleVersion ? version : 'incompatible',
  })
  ctx.effect(() => () => management.dispose(), 'dsh-mobile: lifecycle')
  await management.initialize()
  // 复用 dsh 的 Host/Origin、桌面窗口及 Cookie 鉴权；公网中继不能访问此路由。
  ctx.connection.fetch.register({ path: '/api/dsh-mobile', methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: request => management.handle(request) })
}
