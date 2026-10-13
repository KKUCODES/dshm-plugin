import type { Context } from '@deepseek-ai/cordis'
import { ComputerSettings } from '../../src/computer-settings.js'
import { ProfileSettings, type ProfileSettingsForms, type ProfileSettingsEntry } from '../../src/profile-settings.js'

export const name = 'latest-settings-probe'
export const inject = ['settings', 'configEditor', 'connection']

/** 仅在独立 DSH_HOME 的真实最新版 Host 验收表单；不用于产品安装。 */
export function apply(ctx: Context) {
  const editor = ctx.get('configEditor') as { entries(): ProfileSettingsEntry[] }
  const settings = new ProfileSettings(ctx.get('settings') as ProfileSettingsForms, () => editor.entries())
  const adapter = new ComputerSettings(() => settings)
  ctx.effect(() => () => adapter.dispose())
  ctx.connection.fetch.register({ path: '/api/latest-settings-probe', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      const action = await request.json() as { kind: string; operation?: Parameters<ComputerSettings['write']>[1] }
      try {
        const value = action.kind === 'read' ? adapter.read('isolated-test')
          : action.kind === 'write' && action.operation ? await adapter.write('isolated-test', action.operation, request.signal)
          : undefined
        if (!value) return Response.json({ error: 'invalid-test-action' }, { status: 400 })
        return Response.json(value)
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : 'test-failed' }, { status: 409 })
      }
    } })
}
