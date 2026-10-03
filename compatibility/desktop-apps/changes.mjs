export const baseline = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const patchVersion = 'desktop-apps-v1';

const contract = `/** 电脑内部应用服务；Remote 调用方仍须核验会话工作区、设备权限和用户确认。 */
export interface DesktopApplications {
  list(signal?: AbortSignal): Promise<readonly string[]>
  open(appId: string, path: string, signal?: AbortSignal): Promise<{
    status: number
    payload: { ok: true } | { code: string; message: string }
  }>
}
declare module '@deepseek-ai/cordis' {
  interface Context { dshmDesktopApps: DesktopApplications }
}

`;

const service = `  const lifetime = new AbortController()
  ctx.effect(() => () => lifetime.abort(), 'open-in-app: service lifetime')
  const desktopApps: DesktopApplications = {
    async list(signal) {
      const active = AbortSignal.any([lifetime.signal, ...(signal ? [signal] : [])])
      active.throwIfAborted()
      const map = await availability()
      active.throwIfAborted()
      return [...map.keys()]
    },
    async open(appId, path, signal) {
      const active = AbortSignal.any([lifetime.signal, ...(signal ? [signal] : [])])
      active.throwIfAborted()
      if (typeof appId !== 'string' || typeof path !== 'string') {
        return { status: 400, payload: { code: 'bad-request', message: 'app and path must be strings' } }
      }
      const app = OPEN_IN_APP_CATALOG.find(entry => entry.id === appId)
      const resolved = app === undefined ? undefined : (await availability()).get(app.id)
      active.throwIfAborted()
      if (app === undefined || resolved === undefined) {
        return { status: 400, payload: { code: 'bad-request', message: 'unknown or unavailable app: ' + appId } }
      }
      if (path === '' || !isAbsolute(path)) {
        return { status: 400, payload: { code: 'bad-request', message: 'path must be an absolute directory path' } }
      }
      let directory: boolean
      try { directory = (await stat(path)).isDirectory() }
      catch { directory = false }
      active.throwIfAborted()
      if (!directory) return { status: 404, payload: { code: 'not-found', message: 'directory does not exist: ' + path } }
      // 启动后取消只能报告未知结果，不能终止用户应用或再次启动。
      let outcome = await launchResolved(resolved, path, config.launchWatchMs, catalogInternals(), active)
      active.throwIfAborted()
      if (outcome === 'missing') {
        // 保留原网页的单次重新探测；取消或卸载后不能进入第二次启动。
        const fresh = await refreshResolution(app)
        active.throwIfAborted()
        outcome = fresh === undefined ? 'failed' : await launchResolved(fresh, path, config.launchWatchMs, catalogInternals(), active)
        active.throwIfAborted()
      }
      return outcome === 'launched'
        ? { status: 200, payload: { ok: true } }
        : { status: 502, payload: { code: 'launch-failed', message: 'failed to launch ' + app.id } }
    },
  }
  ctx.provide('dshmDesktopApps', desktopApps)

`;

function once(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('desktop-apps baseline mismatch');
  return source.replace(before, after);
}

export function transform(source) {
  source = source.replaceAll('\r\n', '\n');
  source = once(source, '/** Cordis function-plugin name. */', contract + '/** Cordis function-plugin name. */');
  source = once(source, '  /** Answer an untrusted/unauthenticated request; true when it was rejected. */', service + '  /** Answer an untrusted/unauthenticated request; true when it was rejected. */');
  source = once(source, 'sendJson(res, 200, { apps: [...(await availability()).keys()] })', 'sendJson(res, 200, { apps: await desktopApps.list() })');
  const start = source.indexOf('      const app = OPEN_IN_APP_CATALOG.find(entry => entry.id === parsed.app)');
  const end = source.indexOf('\n    },\n  }), `open-in-app: POST', start);
  if (start < 0 || end < 0 || !source.slice(start, end).includes("if (outcome === 'launched')")) throw new Error('desktop-apps launch baseline mismatch');
  return source.slice(0, start) + '      const outcome = await desktopApps.open(parsed.app, parsed.path)\n      sendJson(res, outcome.status, outcome.payload)' + source.slice(end);
}

export function transformResolver(source) {
  source = source.replaceAll('\r\n', '\n');
  source = once(source, '  resolved: OpenInAppResolvedLaunch, path: string, watchMs: number, internals: OpenInAppInternals = {},\n): Promise<OpenInAppLaunchOutcome>',
    '  resolved: OpenInAppResolvedLaunch, path: string, watchMs: number, internals: OpenInAppInternals = {}, signal?: AbortSignal,\n): Promise<OpenInAppLaunchOutcome>');
  source = once(source, '  const primary = await runLaunch(resolved.launch, path, watchMs, completed)',
    '  signal?.throwIfAborted()\n  const primary = await runLaunch(resolved.launch, path, watchMs, completed)\n  // 已发生的启动不撤回，但取消后不能再尝试备用启动器。\n  signal?.throwIfAborted()');
  return once(source, '  const fallback = await runLaunch(resolved.fallbackLaunch, path, watchMs, completed)',
    '  const fallback = await runLaunch(resolved.fallbackLaunch, path, watchMs, completed)\n  signal?.throwIfAborted()');
}
