export const baseline = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const patchVersion = 'client-entries-v1';
export const directory = 'packages/client/modules';
export const changes = [{ path: `${directory}/src/client/entries.ts`,
  sha256: '52b438c9541a470b63e41b8880fd608909117168bfcd76cbe65be6dbff651edc', edits: [
    { before: 'return JSON.stringify(manifest.modules.map(row => [row.id, row.rev, row.inject, row.external]))',
      after: 'return JSON.stringify([manifest.modules.map(row => [row.id, row.rev, row.inject, row.external]), manifest.plugins.map(row => row.id)])' },
    { before: '    const manifest = parseBootManifest(graph)\n    if (entryTargets(manifest)', after: `    return this.syncManifest(parseBootManifest(graph))
  }

  /**
   * 保留完整依赖图，只激活调用方选择的插件；不改变普通桌面 sync 的全量语义。
   * 名单必须来自本次图，禁止把任意模块名注入 Loader。
   */
  syncSelected(graph: unknown, pluginIds: readonly string[]): Promise<void> {
    const manifest = parseBootManifest(graph)
    const known = new Set(manifest.plugins.map(row => row.id))
    if (!Array.isArray(pluginIds) || pluginIds.some(id => typeof id !== 'string' || !known.has(id))
      || new Set(pluginIds).size !== pluginIds.length) throw new Error('client-modules: invalid activation selection')
    const selected = new Set(pluginIds)
    return this.syncManifest({ ...manifest, plugins: manifest.plugins.filter(row => selected.has(row.id)) })
  }

  private syncManifest(manifest: BootManifest): Promise<void> {
    if (entryTargets(manifest)` },
    { before: '      if (this.stopped || desired === undefined) return', after: '      if (this.stopped || desired === undefined || !this.desired.plugins.some(row => row.id === id)) return' },
    { before: '    for (const row of manifest.modules) {\n      if (!this.current(generation)) break', after: '    for (const row of manifest.modules) {\n      if (!wanted.has(row.id)) continue\n      if (!this.current(generation)) break' },
  ],
}];
