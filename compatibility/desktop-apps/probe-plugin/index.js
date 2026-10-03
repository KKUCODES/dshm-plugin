import { writeFile } from 'node:fs/promises';

export const inject = ['dshmDesktopApps'];

// 只观察实际 DSH 提供的应用目录，不请求启动，也不读取凭据或用户聊天。
export async function apply(ctx) {
  const lifetime = new AbortController();
  ctx.effect(() => () => lifetime.abort());
  const result = { at: new Date().toISOString(), pid: process.pid };
  try {
    const apps = await ctx.dshmDesktopApps.list(lifetime.signal);
    result.apps = apps;
    result.repeatedReadMatches = JSON.stringify(apps) === JSON.stringify(await ctx.dshmDesktopApps.list(lifetime.signal));
    const cancelled = new AbortController(); cancelled.abort();
    try { await ctx.dshmDesktopApps.list(cancelled.signal); result.cancelRejected = false; }
    catch (error) { result.cancelRejected = error.name === 'AbortError'; }
  } catch (error) { result.error = error.message; }
  await writeFile('Q:/Tanxian/LToys/dsh-mobile/plugin/artifacts/desktop-apps-live-service.json', JSON.stringify(result, null, 2));
}
