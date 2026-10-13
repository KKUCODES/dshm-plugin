/** 新版仍有独立的页面与控制器入口，两个入口都必须保留重启确认。 */
export const sourcePluginRestartChanges = [
  { path: 'packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx',
    hash: '5b0d7fea975e699b185c5f3c4f9ca170a122f7113a337520b56269a216231310',
    edits: [[ ': install.installed !== null\n', ': install.installed !== null && !install.restartRequired\n' ]] },
  { path: 'packages/client/ui-plugin-manager/src/client/manager-store.ts',
    hash: '45d1df317b8bfb8b117afeb430ee96d953d973d0147df819739099c1c01e397b',
    edits: [[ "if (install.phase !== 'done' || install.enabling) return",
      "// 需要重启的升级不能用当前缓存模块的启用动作结算。\n    if (install.phase !== 'done' || install.enabling || install.restartRequired) return" ]] },
].map(change => ({ ...change, patch: 'plugin-restart-notice',
  name: '@deepseek-ai/dsh-client-ui-plugin-manager', package: 'packages/client/ui-plugin-manager' }));
