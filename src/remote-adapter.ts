import { isProfileDshVersion } from './profile-dsh-version.js'
import type { HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'
import type { TypertGateway } from '@deepseek-ai/dsh-api-gateway/types'
import type { ClientModuleRegistry } from '@deepseek-ai/dsh-client-modules'
import { REMOTE_TRANSPORT_VERSION, routedFrameSchema, remoteEndpoints, remotePermission, remoteRequestAllowed,
  RESOURCE_CHUNK_BYTES, RESOURCE_WINDOW, MAX_UPLOAD_BYTES, MAX_FRAME_BYTES, type HostFrame, type RemoteContext } from '@dsh-mobile/protocol'
import { ResourceWindow } from './resource-window.js'
import { RemoteSyncCache } from './sync-cache.js'
import { ResourceValidator } from './resource-validator.js'
import { UploadBody } from './upload-body.js'
import { streamOffice } from './office-preview.js'
import { streamAttachment, type AttachmentServices } from './attachment-preview.js'
import { streamAttachmentOffice, type AttachmentOfficeProvider } from './attachment-office.js'
import { streamChanges } from './changes-preview.js'
import { streamSessionExport } from './session-export.js'
import type { JobControl } from './job-control.js'
import type { CommandOutput } from './command-output.js'
import { ComputerSettings } from './computer-settings.js'
import { readModelReadiness } from './model-readiness.js'
import { presetDirectory, type PresetDirectoryService } from './preset-directory.js'
import { profilePresetDirectory, type ProfilePresetServices } from './profile-preset-directory.js'
import type { ProfilePresetManagement } from './profile-preset-management.js'
import { ProviderSettings } from './provider-settings.js'
import { readProviderCard } from './provider-card.js'
import { ProviderRemoval } from './provider-removal.js'
import { ProviderCreation, type ProviderDirectory } from './provider-creation.js'
import { ProviderModels } from './provider-models.js'
import { discoverProviderModels, type ModelDiscovery } from './provider-model-discovery.js'
import { ModelProbe } from './model-probe.js'
import type { SettingsAccess as SettingsProvider } from './settings-access.js'
import { ComputerKey, type ComputerKeyServices } from './computer-key.js'
import { ComputerEndpoint } from './computer-endpoint.js'
import { ProviderEndpoint } from './provider-endpoint.js'
import { desktopOpen } from './desktop-open.js'
import { WorkspaceDesktop, type WorkspaceDesktopServices } from './workspace-desktop.js'
import { AttachmentDesktop } from './attachment-desktop.js'
import { DesktopApps, type DesktopAppServices } from './desktop-apps.js'
import type { LaunchEnvironmentSnapshot } from '@deepseek-ai/dsh-launch-environment'
import type { FeedbackNotifications } from './feedback-notifications.js'
import type { TaskNotifications } from './task-notifications.js'
import { PluginOperations } from './plugin-operations.js'
import { CordisConnections, type CordisInspectService } from './cordis-connections.js'
import { openGatewayStream } from './gateway-stream.js'
import { workspaceFilePayload, workspaceFileResponse } from './workspace-file-contract.js'
import type { SubagentServiceState } from './subagent-service-state.js'

export interface RemoteServices {
  agentPresets?: () => PresetDirectoryService | undefined
  profilePresets?: () => ProfilePresetServices | undefined
  presetManagement?: Pick<ProfilePresetManagement, 'read' | 'write'>
  connection: Pick<HostConnectionHandle, 'createSharedFetchHandler'>
  gateway: Pick<TypertGateway, 'wireStream'>
  modules: Pick<ClientModuleRegistry, 'graph' | 'onGraphChanged' | 'fetchBundle'>
  version: string
  attachments?: AttachmentServices
  attachmentOffice?: () => AttachmentOfficeProvider | undefined
  jobControl?: () => (Pick<JobControl, 'generation' | 'stop'> & Partial<Pick<JobControl, 'output' | 'outputAvailable' | 'outputCoordinates'>>) | undefined
  commandOutput?: () => Pick<CommandOutput, 'generation' | 'available' | 'read'> | undefined
  settings?: () => Pick<SettingsProvider, 'describe' | 'get' | 'mutate' | 'writable'> | undefined
  modelDiscovery?: () => ModelDiscovery | undefined
  providerDirectory?: () => ProviderDirectory | undefined
  accountModelAvailable?: (signal: AbortSignal) => Promise<boolean>
  computerKey?: ComputerKeyServices
  environment?: () => LaunchEnvironmentSnapshot
  feedbackNotifications?: Pick<FeedbackNotifications, 'follow'>
  taskNotifications?: Pick<TaskNotifications, 'follow' | 'pendingAvailable'>
  subagentState?: Pick<SubagentServiceState, 'follow'>
  workspaceDesktop?: () => WorkspaceDesktopServices | undefined
  desktopApps?: () => DesktopAppServices | undefined
  cordisInspect?: () => CordisInspectService | undefined
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
const owner = (context: RemoteContext) => `${context.deviceId}:${context.connectionId}`

// 新版仍在专项验收，只由隔离候选构建启用；正常交付不提前扩大兼容声明。
declare const DSHM_LATEST_CANDIDATE: boolean
const latestCandidate = typeof DSHM_LATEST_CANDIDATE !== 'undefined' && DSHM_LATEST_CANDIDATE

/** 仅适配物理传输；参数解码、业务错误、原始流和审批竞争仍由 DSH Gateway 处理。 */
export class RemoteAdapter {
  private readonly requests = new Map<string, AbortController>()
  private readonly probeOwners = new Map<string, string>()
  private readonly modelProbe: ModelProbe
  private readonly eventOwners = new Map<string, string>()
  private readonly resources = new Map<string, ResourceWindow>()
  private readonly syncCache = new RemoteSyncCache()
  private readonly resourceValidator = new ResourceValidator()
  private readonly uploads = new Map<string, UploadBody>()
  private officeReaders = 0
  private attachmentReaders = 0
  private promptUploads = 0
  private changesReaders = 0
  private exportReaders = 0
  private outputReaders = 0
  private settings: ComputerSettings
  private providerSettings: ProviderSettings
  private providerRemoval: ProviderRemoval
  private providerCreation: ProviderCreation
  private providerModels: ProviderModels
  private deepSeekModels: ProviderModels
  private providerEndpoint: ProviderEndpoint
  private key?: ComputerKey
  private endpoint?: ComputerEndpoint
  private searchKey?: ComputerKey
  private providerKey?: ComputerKey
  private searchEndpoint?: ComputerEndpoint
  private workspaceDesktop?: WorkspaceDesktop
  private attachmentDesktop?: AttachmentDesktop
  private desktopApps: DesktopApps
  private readonly cordis: CordisConnections
  constructor(private services: RemoteServices, private hostId: string, private pluginOperations = new PluginOperations(services.connection)) {
    this.modelProbe = new ModelProbe({ settings: () => services.settings?.(), runtime: () => services.modelDiscovery?.(),
      credentialRevision: () => services.computerKey?.revision() ?? -1,
      // 仅已通过当前请求context管理检查、且尚未取消的调用可使用快照。
      permitted: key => [...this.probeOwners].some(([id, current]) => current === key && this.requests.has(id) && !this.requests.get(id)!.signal.aborted),
    })
    this.cordis = new CordisConnections(() => services.cordisInspect?.())
    this.desktopApps = new DesktopApps(() => services.desktopApps?.())
    this.settings = new ComputerSettings(() => services.settings?.())
    this.providerSettings = new ProviderSettings(() => services.settings?.(), () => !!services.computerKey?.credentials(), () => services.providerDirectory?.())
    this.providerRemoval = new ProviderRemoval(() => services.settings?.())
    this.providerCreation = new ProviderCreation(() => services.settings?.(), () => services.providerDirectory?.(), () => !!services.computerKey?.credentials())
    this.providerModels = new ProviderModels(() => services.settings?.())
    this.deepSeekModels = new ProviderModels(() => services.settings?.(), 'llm-deepseek')
    this.providerEndpoint = new ProviderEndpoint(() => services.settings?.(), () => services.providerDirectory?.())
    if (services.computerKey) this.key = new ComputerKey(services.computerKey)
    if (services.environment) this.endpoint = new ComputerEndpoint(() => services.settings?.(), services.environment)
    if (services.computerKey) this.searchKey = new ComputerKey(services.computerKey, 'web-search-deepseek')
    if (services.computerKey) this.providerKey = new ComputerKey(services.computerKey)
    if (services.environment) this.searchEndpoint = new ComputerEndpoint(() => services.settings?.(), services.environment, 'web-search-deepseek')
    if (services.workspaceDesktop) this.workspaceDesktop = new WorkspaceDesktop(services.connection, services.workspaceDesktop)
    if (services.workspaceDesktop && services.attachments) this.attachmentDesktop = new AttachmentDesktop(services.attachments, services.workspaceDesktop)
  }

  async receive(raw: unknown, send: (frame: HostFrame) => void): Promise<void> {
    const frame = routedFrameSchema.parse(raw)
    if (frame.type === 'cancel') { this.requests.get(frame.id)?.abort(); return }
    if (frame.type === 'ack') {
      try { this.resources.get(frame.id)?.acknowledge(frame.count) }
      catch { this.requests.get(frame.id)?.abort(); send({ type: 'error', id: frame.id, code: 'invalid_resource_ack' }) }
      return
    }
    if (frame.type === 'uploadChunk' || frame.type === 'uploadEnd') {
      const upload = this.uploads.get(frame.id)
      if (!upload) return
      try { frame.type === 'uploadChunk' ? upload.push(frame.data) : upload.end() }
      catch {
        upload.fail(new Error('invalid_upload_frame'))
        send({ type: 'error', id: frame.id, code: 'invalid_upload_frame' })
        this.requests.get(frame.id)?.abort()
      }
      return
    }
    if (this.requests.has(frame.id)) throw new Error('duplicate_request_id')
    if (this.requests.size >= 256) { send({ type: 'error', id: frame.id, code: 'host_capacity' }); return }
    const controller = new AbortController(), signal = controller.signal
    this.requests.set(frame.id, controller)
    const emit = (value: HostFrame) => { if (!signal.aborted) send(value) }
    let eventClient: string | undefined
    let releaseCordis: (() => void) | undefined
    try {
      const { operation, context } = frame
      if (!context || context.hostId !== this.hostId) throw new Error('remote_identity_denied')
      if (this.services.version !== '0.1.6-alpha.2' && !(latestCandidate && isProfileDshVersion(this.services.version))) throw new Error('unsupported_dsh_version')
      if (operation.method === 'remote.negotiate') {
        emit({ type: 'result', id: frame.id, value: { transport: REMOTE_TRANSPORT_VERSION, dshVersion: this.services.version,
          management: context.management, channels: ['rpc', 'stream', 'graph', 'bundle', 'upload', 'prompt', 'office', 'changes', ...(this.services.attachments ? ['attachment'] : []), ...(this.services.attachments && this.services.attachmentOffice?.() ? ['attachmentOffice'] : [])],
          limits: { uploadBytes: MAX_UPLOAD_BYTES, chunkBytes: RESOURCE_CHUNK_BYTES, window: RESOURCE_WINDOW },
          jobControlGeneration: this.services.jobControl?.()?.generation,
          jobOutput: this.services.jobControl?.()?.outputAvailable === true,
          jobOutputCoordinates: this.services.jobControl?.()?.outputCoordinates,
          commandOutputGeneration: this.services.commandOutput?.()?.available ? this.services.commandOutput()?.generation : undefined,
          planModeControl: true,
          officePriority: true,
          subagentPromptUpload: true,
          subagentState: !!this.services.subagentState,
          workspaceManagement: true,
          sessionExport: true,
          desktopOpen: true,
          desktopReveal: true,
          desktopApps: !!this.services.desktopApps?.(),
          desktopAppIcons: typeof this.services.desktopApps?.()?.apps.icon === 'function',
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
          presetDefaultSettings: latestCandidate && isProfileDshVersion(this.services.version)
            && !!this.services.settings?.()?.describe({ redactSecrets: true }).some(view => view.ns === 'agent-preset-registry'),
          presetProfileDirectory: latestCandidate && isProfileDshVersion(this.services.version) && !!this.services.profilePresets?.(),
          presetProfileManagement: latestCandidate && isProfileDshVersion(this.services.version) && !!this.services.presetManagement,
          codingToolsSettings: latestCandidate && isProfileDshVersion(this.services.version)
            && !!this.services.settings?.()?.describe({ redactSecrets: true }).some(view => view.ns === 'ui-settings'),
          pluginOperationGeneration: this.pluginOperations.generation,
          subagentSettings: !!this.services.settings?.(),
          webSearchSettings: !!this.services.settings?.() && !!this.searchKey && !!this.searchEndpoint,
          computerKey: !!this.key,
          computerEndpoint: !!this.endpoint,
          feedbackNotifications: !!this.services.feedbackNotifications,
          taskNotifications: !!this.services.taskNotifications,
          taskNotificationPreview: this.services.taskNotifications ? 1 : undefined,
          taskPendingNotifications: this.services.taskNotifications?.pendingAvailable === true,
          syncCacheVersion: 1,
          endpoints: remoteEndpoints(context.management, this.cordis.available,
            latestCandidate && isProfileDshVersion(this.services.version) ? 'target' : 'legacy',
            this.services.version === '0.2.1-alpha.2'), graphRevision: this.services.modules.graph().rev } })
      } else if (operation.method === 'remote.presetManagementRead' || operation.method === 'remote.presetCopy' || operation.method === 'remote.presetDelete') {
        if (!context.management) throw Error('management_required')
        if (!latestCandidate || !isProfileDshVersion(this.services.version) || !this.services.presetManagement) throw Error('remote_operation_denied')
        const value = operation.method === 'remote.presetManagementRead'
          ? await this.services.presetManagement.read(owner(context), operation.preset, signal)
          : await this.services.presetManagement.write(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.pluginOperationStart' || operation.method === 'remote.pluginOperationRead' || operation.method === 'remote.pluginOperations') {
        if (!context.management) throw new Error('management_required')
        // 接收者由中继鉴权提供；同设备换连接可查询，其他设备不能读该笔操作。
        const operationOwner = `${context.hostId}:${context.deviceId}`
        const value = operation.method === 'remote.pluginOperations' ? this.pluginOperations.list(operationOwner)
          : operation.method === 'remote.pluginOperationRead' ? this.pluginOperations.read(operationOwner, operation.generation, operation.operationId)
            : this.pluginOperations.start(operationOwner, operation.generation, operation.operationId, operation.endpoint, operation.payload)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.endpointRead' || operation.method === 'remote.endpointWrite') {
        if (!context.management) throw new Error('management_required')
        if (typeof operation.target === 'object') {
          const value = operation.method === 'remote.endpointRead' ? this.providerEndpoint.read(owner(context), operation.target.provider, operation.resetPolicy === true)
            : await this.providerEndpoint.write(owner(context), operation, signal)
          emit({ type: 'result', id: frame.id, value })
          return
        }
        const endpoint = operation.target ? this.searchEndpoint : this.endpoint
        if (!endpoint) throw new Error('remote_endpoint_unavailable')
        const value = operation.method === 'remote.endpointRead' ? endpoint.read(owner(context))
          : await endpoint.write(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.keyRead' || operation.method === 'remote.keyWrite') {
        if (!context.management) throw new Error('management_required')
        const key = typeof operation.target === 'object' ? this.providerKey : operation.target ? this.searchKey : this.key
        if (!key) throw new Error('remote_key_unavailable')
        const value = operation.method === 'remote.keyRead' ? await key.read(owner(context), operation.target)
          : await key.write(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.providerCreationRead' || operation.method === 'remote.providerCreationWrite') {
        if (!context.management) throw new Error('management_required')
        const value = operation.method === 'remote.providerCreationRead' ? this.providerCreation.read(owner(context))
          : await this.providerCreation.create(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.providerRemovalRead' || operation.method === 'remote.providerRemovalWrite') {
        if (!context.management) throw new Error('management_required')
        const value = operation.method === 'remote.providerRemovalRead' ? this.providerRemoval.read(owner(context), operation.provider)
          : await this.providerRemoval.remove(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.deepSeekModelsRead' || operation.method === 'remote.deepSeekModelsWrite') {
        if (!context.management) throw new Error('management_required')
        const value = operation.method === 'remote.deepSeekModelsRead' ? this.deepSeekModels.read(owner(context), 'deepseek')
          : await this.deepSeekModels.write(owner(context), { ...operation, method: 'remote.providerModelsWrite', provider: 'deepseek' }, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.modelProbePrepare' || operation.method === 'remote.modelProbeExecute') {
        if (!context.management) throw new Error('management_required')
        this.probeOwners.set(frame.id, owner(context))
        const value = operation.method === 'remote.modelProbePrepare' ? this.modelProbe.prepare(owner(context), operation)
          : await this.modelProbe.execute(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.providerModelsDiscover') {
        if (!context.management) throw new Error('management_required')
        const value = await discoverProviderModels(operation.provider, () => this.services.settings?.(), () => this.services.modelDiscovery?.(), signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.providerModelsRead' || operation.method === 'remote.providerModelsWrite') {
        if (!context.management) throw new Error('management_required')
        const value = operation.method === 'remote.providerModelsRead' ? this.providerModels.read(owner(context), operation.provider, operation.scope)
          : await this.providerModels.write(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.modelReadiness') {
        if (!context.management) throw new Error('management_required')
        const value = await readModelReadiness({ settings: () => this.services.settings?.(), directory: () => this.services.providerDirectory?.(),
          key: this.services.computerKey, accountAvailable: this.services.accountModelAvailable }, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.providerCardRead') {
        if (!context.management) throw new Error('management_required')
        const value = await readProviderCard({ settings: () => this.services.settings?.(), directory: () => this.services.providerDirectory?.(),
          key: this.services.computerKey }, operation.provider, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.providerSettingsList' || operation.method === 'remote.providerSettingsRead' || operation.method === 'remote.providerSettingsWrite' || operation.method === 'remote.providerKeySetup') {
        if (!context.management) throw new Error('management_required')
        const value = operation.method === 'remote.providerSettingsList' ? this.providerSettings.list()
          : operation.method === 'remote.providerSettingsRead' ? this.providerSettings.read(owner(context), operation.provider)
          : await this.providerSettings.write(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.codingToolsRead') {
        if (!latestCandidate || !isProfileDshVersion(this.services.version)) throw new Error('remote_settings_unavailable')
        const view = this.services.settings?.()?.describe({ redactSecrets: true }).find(view => view.ns === 'ui-settings')
        const enabled = view?.value && typeof view.value === 'object' ? Reflect.get(view.value, 'enabled') : undefined
        if (typeof enabled !== 'boolean') throw new Error('remote_settings_unavailable')
        emit({ type: 'result', id: frame.id, value: { enabled, ...(view?.documentId ? { documentId: view.documentId } : {}) } })
      } else if (operation.method === 'remote.settingsRead' || operation.method === 'remote.settingsWrite') {
        if (!context.management) throw new Error('management_required')
        if (['agent-preset-registry', 'ui-settings'].includes(operation.namespace ?? '') && (!latestCandidate || !isProfileDshVersion(this.services.version)))
          throw new Error('remote_settings_unavailable')
        const value = operation.method === 'remote.settingsRead' ? this.settings.read(owner(context), operation.namespace)
          : await this.settings.write(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.sessionExport') {
        if (this.exportReaders >= 2) throw new Error('remote_export_busy')
        this.exportReaders++
        const window = new ResourceWindow(); this.resources.set(frame.id, window)
        try { await streamSessionExport(this.services.connection, frame.id, operation, signal, window, emit) }
        finally { this.exportReaders-- }
      } else if (operation.method === 'remote.desktopAppIcon') {
        emit({ type: 'result', id: frame.id, value: await this.desktopApps.icon(operation.sessionId, operation.appId, signal) })
      } else if (operation.method === 'remote.desktopApps' || operation.method === 'remote.prepareDesktopApp' || operation.method === 'remote.openDesktopApp') {
        const value = operation.method === 'remote.desktopApps' ? await this.desktopApps.list(operation.sessionId, signal)
          : operation.method === 'remote.prepareDesktopApp' ? await this.desktopApps.prepare(owner(context), operation, signal)
            : await this.desktopApps.open(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.desktop' || operation.method === 'remote.openFile') {
        emit({ type: 'result', id: frame.id, value: await desktopOpen(this.services.connection, operation, signal) })
      } else if (operation.method === 'remote.prepareDesktopFile' || operation.method === 'remote.openDesktopFile') {
        if (!this.workspaceDesktop) throw new Error('remote_desktop_unavailable')
        const value = operation.method === 'remote.prepareDesktopFile'
          ? await this.workspaceDesktop.prepare(owner(context), operation, signal)
          : await this.workspaceDesktop.open(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.prepareDesktopAttachment' || operation.method === 'remote.openDesktopAttachment') {
        if (!this.attachmentDesktop) throw new Error('remote_desktop_unavailable')
        const value = operation.method === 'remote.prepareDesktopAttachment'
          ? await this.attachmentDesktop.prepare(owner(context), operation, signal)
          : await this.attachmentDesktop.open(owner(context), operation, signal)
        emit({ type: 'result', id: frame.id, value })
      } else if (operation.method === 'remote.commandOutput') {
        const output = this.services.commandOutput?.()
        if (!output?.available) throw new Error('remote_command_unavailable')
        if (this.outputReaders >= 4) throw new Error('remote_command_busy')
        this.outputReaders++
        try { emit({ type: 'result', id: frame.id, value: await output.read(operation, signal) }) }
        finally { this.outputReaders-- }
      } else if (operation.method === 'remote.jobOutput') {
        const control = this.services.jobControl?.()
        if (!control?.outputAvailable || !control.output) throw new Error('remote_job_output_unavailable')
        if (this.outputReaders >= 4) throw new Error('remote_job_output_busy')
        this.outputReaders++
        try { emit({ type: 'result', id: frame.id, value: await control.output(operation, signal) }) }
        finally { this.outputReaders-- }
      } else if (operation.method === 'remote.jobStop') {
        const control = this.services.jobControl?.()
        if (!control) throw new Error('remote_job_control_unavailable')
        emit({ type: 'result', id: frame.id, value: control.stop(operation) })
      } else if (operation.method === 'remote.changes') {
        if (this.changesReaders >= 2) throw new Error('remote_changes_busy')
        this.changesReaders++
        const window = new ResourceWindow(); this.resources.set(frame.id, window)
        try { await streamChanges(this.services.connection, frame.id, operation, signal, window, emit) }
        finally { this.changesReaders-- }
      } else if (operation.method === 'remote.attachment') {
        if (!this.services.attachments) throw new Error('remote_attachment_unavailable')
        if (this.attachmentReaders >= 4) throw new Error('remote_attachment_busy')
        this.attachmentReaders++
        const window = new ResourceWindow(); this.resources.set(frame.id, window)
        try { await streamAttachment(this.services.attachments, frame.id, operation, signal, window, emit) }
        finally { this.attachmentReaders-- }
      } else if (operation.method === 'remote.attachmentOffice') {
        if (!this.services.attachments || !this.services.attachmentOffice) throw new Error('remote_office_unavailable')
        if (this.officeReaders >= (operation.priority === 'background' ? 1 : 2)) throw new Error('remote_office_busy')
        this.officeReaders++
        const window = new ResourceWindow(); this.resources.set(frame.id, window)
        emit({ type: 'event', id: frame.id, value: { type: 'converting' } })
        try { await streamAttachmentOffice(this.services.attachments, this.services.attachmentOffice, frame.id, operation, signal, window, emit) }
        finally { this.officeReaders-- }
      } else if (operation.method === 'remote.office') {
        if (this.officeReaders >= (operation.priority === 'background' ? 1 : 2)) throw new Error('remote_office_busy')
        this.officeReaders++
        const window = new ResourceWindow(); this.resources.set(frame.id, window)
        emit({ type: 'event', id: frame.id, value: { type: 'converting' } })
        try { await streamOffice(this.services.connection, frame.id, operation.sessionId, operation.path, signal, window, emit, operation.priority, this.services.version) }
        finally { this.officeReaders-- }
      } else if (operation.method === 'remote.prompt') {
        if (this.promptUploads >= 2) throw new Error('remote_prompt_busy')
        this.promptUploads++
        const upload = new UploadBody(signal, count => emit({ type: 'event', id: frame.id, value: { type: 'credit', count } }))
        this.uploads.set(frame.id, upload)
        emit({ type: 'event', id: frame.id, value: { type: 'credit', count: RESOURCE_WINDOW } })
        try {
          // 不自行入库或合成 receipt；原路由保留参数、模型能力、图片解码、会话和 requestId 检查。
          const init: RequestInit & { duplex: 'half' } = { method: 'POST', signal, body: upload.body,
            headers: { 'content-type': 'application/json' }, duplex: 'half' }
          const endpoint = operation.endpoint ?? 'session/prompt'
          const response = await this.services.connection.createSharedFetchHandler('/api').fetch(new Request(`http://dsh.internal/api/${endpoint}`, init))
          if (!response.ok) { await response.body?.cancel(); throw new Error(`remote_http_${response.status}`) }
          const envelope = record(await response.json())
          if (envelope?.type !== 'server-response' || envelope.rpcId !== operation.rpcId || !record(envelope.result)) throw new Error('invalid_remote_response')
          emit({ type: 'result', id: frame.id, value: envelope.result })
        } finally { this.promptUploads-- }
      } else if (operation.method === 'remote.upload') {
        const upload = new UploadBody(signal, count => emit({ type: 'event', id: frame.id, value: { type: 'credit', count } }))
        this.uploads.set(frame.id, upload)
        emit({ type: 'event', id: frame.id, value: { type: 'credit', count: RESOURCE_WINDOW } })
        const url = new URL('/api/session/uploadFileBinary', 'http://dsh.internal')
        url.searchParams.set('sessionId', operation.sessionId)
        if (operation.name !== undefined) url.searchParams.set('name', operation.name)
        // 固定的原文件入口，Host 仍负责会话解析、附件校验及 receipt 归属。
        const init: RequestInit & { duplex: 'half' } = { method: 'POST', signal, body: upload.body,
          headers: { 'content-type': 'application/octet-stream' }, duplex: 'half' }
        const response = await this.services.connection.createSharedFetchHandler('/api').fetch(new Request(url, init))
        if (!response.ok) { await response.body?.cancel(); throw new Error(`remote_http_${response.status}`) }
        const result = record(await response.json())
        if (typeof result?.ok !== 'boolean') throw new Error('invalid_remote_response')
        emit({ type: 'result', id: frame.id, value: result })
      } else if (operation.method === 'remote.resource') {
        // 只交给原模块注册表，绝不使用任意 URL 的 fetch，也不转发 Host 本地管理接口。
        const url = new URL(operation.path, 'http://dsh.internal')
        if (!operation.path.startsWith('/plugins/') || url.origin !== 'http://dsh.internal' || url.hash
          || `${url.pathname}${url.search}` !== operation.path || operation.path.includes('\\')) throw new Error('remote_resource_denied')
        const response = await this.resourceValidator.fetch(new Request(url, { method: operation.verb, signal }),
          this.services.modules.graph().rev, request => this.services.modules.fetchBundle(request))
        const headers: Record<string, string> = {}
        for (const name of ['content-type', 'content-length', 'content-range', 'etag', 'accept-ranges']) {
          const value = response.headers.get(name); if (value !== null) headers[name] = value
        }
        emit({ type: 'event', id: frame.id, value: { type: 'headers', status: response.status, headers } })
        const window = new ResourceWindow(); this.resources.set(frame.id, window)
        const reader = response.body?.getReader()
        try {
          let length = 0
          while (reader) {
            signal.throwIfAborted()
            const item = await reader.read(); if (item.done) break
            length += item.value.byteLength
            if (length > 64 * 1024 * 1024) throw new Error('remote_resource_too_large')
            for (let offset = 0; offset < item.value.byteLength; offset += RESOURCE_CHUNK_BYTES) {
              await window.take(signal)
              emit({ type: 'event', id: frame.id, value: { type: 'chunk', data: Buffer.from(item.value.subarray(offset, offset + RESOURCE_CHUNK_BYTES)).toString('base64') } })
            }
          }
        } finally { await reader?.cancel(); reader?.releaseLock() }
        emit({ type: 'end', id: frame.id })
      } else if (operation.method === 'remote.subagentStateFollow') {
        if (!this.services.subagentState) throw new Error('remote_subagent_state_unavailable')
        for await (const value of this.services.subagentState.follow(signal)) emit({ type: 'event', id: frame.id, value })
        emit({ type: 'end', id: frame.id })
      } else if (operation.method === 'remote.taskFollow') {
        if (!this.services.taskNotifications) throw new Error('remote_task_notifications_unavailable')
        for await (const value of this.services.taskNotifications.follow(signal, operation.previewVersion)) {
          emit({ type: 'event', id: frame.id, value })
        }
        emit({ type: 'end', id: frame.id })
      } else if (operation.method === 'remote.feedbackFollow') {
        if (!this.services.feedbackNotifications) throw new Error('remote_feedback_notifications_unavailable')
        for await (const value of this.services.feedbackNotifications.follow(operation.sessionId, signal)) {
          emit({ type: 'event', id: frame.id, value })
        }
        emit({ type: 'end', id: frame.id })
      } else if (operation.method === 'remote.graph') {
        emit({ type: 'result', id: frame.id, value: this.services.modules.graph() })
      } else if (operation.method === 'remote.graphFollow') {
        for await (const value of this.graphs(signal)) emit({ type: 'event', id: frame.id, value })
        emit({ type: 'end', id: frame.id })
      } else if (operation.method === 'remote.rpc' || operation.method === 'remote.stream') {
        const stream = operation.method === 'remote.stream'
        const sync = this.syncCache.prepare(JSON.stringify([context.hostId, context.deviceId, context.management, this.services.version]),
          operation.endpoint, stream, operation.payload)
        operation.payload = sync.payload
        const permission = remotePermission(operation.endpoint, stream)
        const fileContract = latestCandidate && isProfileDshVersion(this.services.version) ? 'target' : 'legacy'
        if (!permission || !remoteRequestAllowed(operation.endpoint, operation.payload, fileContract)) throw new Error('remote_operation_denied')
        if (operation.endpoint === 'schedule/list' && this.services.version !== '0.2.1-alpha.2') throw new Error('remote_operation_denied')
        if (permission === 'management' && !context.management) throw new Error('management_required')
        if (operation.endpoint === 'settings/openAgentPresetDirectory') {
          const id = record(operation.payload.args)?.agentPreset as string
          const value = latestCandidate && isProfileDshVersion(this.services.version)
            ? await profilePresetDirectory(() => this.services.profilePresets?.(), id, signal)
            : await presetDirectory(() => this.services.agentPresets?.(), id, signal)
          emit({ type: 'result', id: frame.id, value: { ok: true, value } })
          return
        }
        if (stream) {
          const source = await openGatewayStream(this.services.gateway, this.services.version, operation.endpoint, operation.payload, signal)
          let opening = true
          for await (const value of source) {
            if (signal.aborted) break
            if (operation.endpoint === '$events') {
              const item = record(value)
              if (item?.type === 'ready' && typeof item.clientId === 'string') {
                eventClient = item.clientId
                this.eventOwners.set(eventClient, owner(context))
                releaseCordis?.()
                releaseCordis = this.cordis.attach(owner(context))
              }
            }
            const baseline = opening && ['baseline', 'snapshot'].includes(String(record(value)?.type))
            opening = false
            emit({ type: 'event', id: frame.id, value: baseline ? await sync.encode(value) : value })
          }
          emit({ type: 'end', id: frame.id })
        } else {
          // 原 DSH 的 clientId 是同一可信桌面内的关联 id；公网另加设备/连接归属。
          if (operation.endpoint === '$events/result') {
            const clientId = record(operation.payload.args)?.clientId
            if (typeof clientId !== 'string' || this.eventOwners.get(clientId) !== owner(context)) throw new Error('remote_event_owner_denied')
          }
          const fetch = () => this.services.connection.createSharedFetchHandler('/api').fetch(new Request(
            `http://dsh.internal/api/${operation.endpoint}`, { method: 'POST', signal,
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ type: 'client-request', rpcId: frame.id, method: operation.endpoint,
                payload: workspaceFilePayload(this.services.version, operation.endpoint, operation.payload) }) }))
          const response = operation.endpoint.startsWith('dynamicCordisRunner/')
            ? await this.cordis.run(owner(context), signal, fetch) : await fetch()
          if (!response.ok) { await response.body?.cancel(); throw new Error(`remote_http_${response.status}`) }
          const envelope = record(await (fileContract === 'target' && operation.endpoint === 'workspaceFiles/readBytes'
            ? workspaceFileResponse(response, frame.id, signal) : response.json()))
          if (envelope?.type !== 'server-response' || envelope.rpcId !== frame.id || !record(envelope.result)) throw new Error('invalid_remote_response')
          const result: HostFrame = { type: 'result', id: frame.id, value: envelope.result }
          // UTF-8 页上限不等于 JSON 帧大小（引号/控制字符会膨胀）。保留原文件错误契约，
          // 避免通用 Relay 的 response_too_large 在原客户端折叠成 gateway/internal。
          if (operation.endpoint === 'workspaceFiles/read' && Buffer.byteLength(JSON.stringify(result)) > MAX_FRAME_BYTES) {
            emit({ type: 'result', id: frame.id, value: { ok: false, error: {
              code: 'workspace-file/too-large', message: 'The encoded file page exceeds the remote response size limit.',
              details: { path: record(operation.payload.args)?.path, limit: MAX_FRAME_BYTES },
            } } })
          } else emit({ ...result, value: record(envelope.result)?.ok === true ? await sync.encode(envelope.result) : envelope.result })
        }
      } else throw new Error('remote_operation_denied')
    } catch (error) {
      const code = error instanceof Error && /^[a-z][a-z0-9_/-]{0,99}$/.test(error.message) ? error.message
        : this.services.gateway.wireStream.failure(error).code
      emit({ type: 'error', id: frame.id, code: /^[a-z][a-z0-9_/-]{0,99}$/.test(code) ? code : 'remote_operation_failed' })
    } finally {
      this.probeOwners.delete(frame.id)
      releaseCordis?.()
      if (eventClient) this.eventOwners.delete(eventClient)
      this.requests.delete(frame.id)
      this.resources.delete(frame.id)
      this.uploads.get(frame.id)?.fail(); this.uploads.delete(frame.id)
    }
  }

  private async *graphs(signal: AbortSignal) {
    let changed = true, wake: (() => void) | undefined
    const notify = () => { changed = true; wake?.() }
    const release = this.services.modules.onGraphChanged(notify)
    signal.addEventListener('abort', notify, { once: true })
    try {
      while (!signal.aborted) {
        if (!changed) await new Promise<void>(resolve => { wake = resolve })
        if (signal.aborted) break
        changed = false; wake = undefined
        // 清单是完整快照，可合并连续更新；不能合并原始会话增量。
        yield this.services.modules.graph()
      }
    } finally { release(); signal.removeEventListener('abort', notify) }
  }

dispose() { this.modelProbe.dispose(); this.probeOwners.clear(); for (const controller of this.requests.values()) controller.abort(); this.requests.clear(); this.eventOwners.clear(); this.cordis.dispose(); this.settings.dispose(); this.providerSettings.dispose(); this.providerRemoval.dispose(); this.providerCreation.dispose(); this.providerModels.dispose(); this.deepSeekModels.dispose(); this.providerEndpoint.dispose(); this.key?.dispose(); this.endpoint?.dispose(); this.searchKey?.dispose(); this.providerKey?.dispose(); this.searchEndpoint?.dispose(); this.workspaceDesktop?.dispose(); this.attachmentDesktop?.dispose(); this.desktopApps.dispose() }
}
