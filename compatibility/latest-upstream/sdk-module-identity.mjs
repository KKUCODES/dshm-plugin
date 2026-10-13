import assert from 'node:assert/strict';

// Windows SEA 的所有盘符指向同一 snapshot，但 ESM 按 URL 缓存模块。
// 只统一已经解析出的虚拟路径，避免插件与 CLI 各持有一份启动状态。
export const sdkModuleIdentityResolver = String.raw`      const resolved = nextResolve(specifier, office ? { ...context, parentURL } : context)
      if (process.platform === 'win32' && /^file:\/\/\/[A-Za-z]:\/snapshot(?:\/|$)/.test(resolved.url)) {
        return { ...resolved, url: resolved.url.replace(/^file:\/\/\/[A-Za-z]:/, 'file:///C:') }
      }
      return resolved`;

export function transformSdkModuleIdentity(source) {
  const anchor = '      return nextResolve(specifier, office ? { ...context, parentURL } : context)';
  assert.equal(source.split(anchor).length, 2, 'latest_sdk_module_identity_anchor_mismatch');
  return source.replace(anchor, sdkModuleIdentityResolver);
}
