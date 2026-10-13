import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import type { ProfileSettings } from './profile-settings.js'

type Runtime = Pick<LlmRuntime, 'listProviders' | 'listConfigurableProviders' | 'discoverModels'>

/** 新版目录/发现按实例 ID 寻址，Remote 仍只暴露已核验的固定设置空间。 */
export function profileProviders(runtime: Runtime, settings: ProfileSettings): Runtime {
  return {
    listProviders: () => runtime.listProviders(),
    listConfigurableProviders: () => runtime.listConfigurableProviders().map(row => ({
      ...row, settingsNs: settings.namespaceOf(row.settingsNs) ?? row.settingsNs,
    })),
    discoverModels(namespace, request, signal) {
      const endpointProbe = namespace === 'dshm.pi-ai-endpoint-v2'
      const entryId = settings.entryId(endpointProbe ? 'llm-pi-ai' : namespace)
      if (!entryId) throw Error('remote_model_discovery_unavailable')
      // 草稿探测不能回退到会跳转或优先返回内置目录的原发现入口。
      return runtime.discoverModels(endpointProbe ? entryId + ':dshm-endpoint-v2' : entryId, request, signal)
    },
  }
}
