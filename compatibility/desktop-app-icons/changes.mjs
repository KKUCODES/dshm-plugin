export const patchVersion = 'desktop-app-icons-v1';

function once(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('desktop-app-icons baseline mismatch');
  return source.replace(before, after);
}

/** 叠加在 desktop-apps-v1 上；只复用原图标缓存，不开放路径或网页登录。 */
export function transform(source) {
  source = source.replaceAll('\r\n', '\n');
  source = once(source, '  list(signal?: AbortSignal): Promise<readonly string[]>',
    '  list(signal?: AbortSignal): Promise<readonly string[]>\n  icon(appId: string, signal?: AbortSignal): Promise<OpenInAppIcon | null>');
  return once(source, '    async open(appId, path, signal) {', `    async icon(appId, signal) {
      const active = AbortSignal.any([lifetime.signal, ...(signal ? [signal] : [])])
      active.throwIfAborted()
      const app = OPEN_IN_APP_CATALOG.find(entry => entry.id === appId)
      if (app === undefined) return null
      const resolved = (await availability()).get(app.id)
      active.throwIfAborted()
      if (resolved === undefined) return null
      // 原提取器有自己的超时；取消后不交付，已开始的缓存提取允许自行结束。
      const icon = await iconOf(app, resolved)
      active.throwIfAborted()
      if (icon === null || icon.bytes.length === 0 || icon.bytes.length > 256 * 1024) return null
      return { contentType: icon.contentType, bytes: Buffer.from(icon.bytes) }
    },
    async open(appId, path, signal) {`);
}
