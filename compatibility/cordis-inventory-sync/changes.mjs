import { createHash } from 'node:crypto';

// 已安装的 lifecycle-v1 + approval-race-v1 基线；参考检出保持只读。
export const hashes = {
  'extensions/ui-cordis/src/client/inventory.ts': '5cf2ea686725500c64f5e8701374ffe9bd8ee999d87dc360676e9595713287ca',
  'extensions/ui-cordis/src/client/index.ts': '147f81b85f8c4056cd30e961ec9f4434e8f7992aa40cd38a56b866a5b642c123',
  'extensions/cordis-host-runner/src/index.ts': '879d24ba2a8c3428fdaaf3d31b0c90874870e137dad90af3f6127fcdfd2f1d01',
  'extensions/cordis-host-runner/src/types.ts': '2bf88fd24feeb3c6ae05bd739fabdd72a61dbad2362f9b46cbdcd588313c83c1',
  'extensions/cordis-host-runner/src/inspect-registry.ts': '71db05059b78aafa556bfb02069a149c4ec90024d070adfc69f50fe0d5557ea8',
  'api/remotes/src/remote-events.ts': '044b39ba31617e69310d773a821381af160b83fabdbd6efa4c62d20d58fdbad9',
};

export function transform(path, source) {
  if (createHash('sha256').update(source).digest('hex') !== hashes[path]) throw Error(`Unsupported inventory source: ${path}`);
  function replace(before, after) {
    if (source.split(before).length !== 2) throw Error(`Non-unique inventory boundary: ${path}`);
    source = source.replace(before, after);
  }
  if (path.endsWith('/inventory.ts')) {
    replace('  /** Read the registry unless a read is already in flight. */', '  /** Read the registry; coalesce changes received during a read into one follow-up. */');
    replace('  // Bumped by reset; a read whose generation is stale publishes nothing.', '  // Reset, retirement and disposal invalidate reads that could restore obsolete rows.');
    replace('  let disposed = false', '  let disposed = false\n  let refreshQueued = false');
    replace('  return {\n    getSnapshot:', '  const inventory: CordisInventory = {\n    getSnapshot:');
    replace('      if (disposed || inFlight !== undefined) return', `      if (disposed) return
      if (inFlight !== undefined) {
        refreshQueued = true
        return
      }
      refreshQueued = false`);
    replace('      ).then(() => { if (issued === generation) inFlight = undefined })', `      ).then(() => {
        if (issued !== generation) return
        inFlight = undefined
        if (refreshQueued) inventory.refresh()
      })`);
    replace('    retire: (pluginId) => {\n      if (disposed) return', `    retire: (pluginId) => {
      if (disposed) return
      // The remove acknowledgement is newer than every read already in flight.
      generation += 1
      inFlight = undefined
      refreshQueued = false`);
    replace('      publish({ rows: [], removed: snapshot.removed, read: false })', '      refreshQueued = false\n      publish({ rows: [], removed: snapshot.removed, read: false })');
    replace('      listeners.clear()', '      refreshQueued = false\n      listeners.clear()');
    replace('    },\n  }\n}', '    },\n  }\n  return inventory\n}');
  } else if (path === 'extensions/ui-cordis/src/client/index.ts') {
    replace("  ctx.remote.$on('cordis/dynamic-package'", "  ctx.remote.$on('cordis/inventory-changed', () => { inventory.refresh() })\n  ctx.remote.$on('cordis/dynamic-package'");
  } else if (path === 'extensions/cordis-host-runner/src/index.ts') {
    replace('  readonly dshmRemoteVersion = 1', '  readonly dshmRemoteVersion: 1 = 1');
    replace('    plugin.packages.set(packageId, definition)', "    plugin.packages.set(packageId, definition)\n    this.ctx.emit('cordis/inventory-changed')");
    replace('    this.registry.delete(pluginId)', "    this.registry.delete(pluginId)\n    // Notify after deletion, including definitions that have never been activated.\n    this.ctx.emit('cordis/inventory-changed')");
  } else if (path.endsWith('/inspect-registry.ts')) {
    replace('  readonly dshmClientManifestScopesVersion = 1', '  readonly dshmClientManifestScopesVersion: 1 = 1');
  } else if (path.endsWith('/types.ts')) {
    replace("    'cordis/dynamic-retract'(retracted: DynamicCordisRetracted): void", `    'cordis/dynamic-retract'(retracted: DynamicCordisRetracted): void
    /**
     * Definitions or their versions changed; consumers re-read the registry.
     * @mode emit
     */
    'cordis/inventory-changed'(): void`);
  } else {
    replace("  { event: 'cordis/dynamic-retract', mode: 'emit' },", "  { event: 'cordis/dynamic-retract', mode: 'emit' },\n  { event: 'cordis/inventory-changed', mode: 'emit' },");
  }
  return source;
}
