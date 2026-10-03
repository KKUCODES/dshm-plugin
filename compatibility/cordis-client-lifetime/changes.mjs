import { createHash } from 'node:crypto';

export const hashes = {
  'ui-cordis/src/client/inventory.ts': '065d3e967f041459cbcdb56f354700a7d40e779beed84ec09abd65be87b92bbf',
  'ui-cordis/src/client/index.ts': '086cc61d2b6f8c4e3806daaee34622e9e5db86473a866768185876fe9539573a',
  'cordis-client-runner/src/client/inspect-registry.ts': 'b8d31dfa1628f77b175ba825c7744531a9888e95260ca149843c1d3b2bcd26bb',
  'cordis-client-runner/src/client/index.ts': '6202f71ca5a99823d1372f29d6d9d42786ad87c6bc3ebcebe5bc1c912115149a',
};

/** 固定上游派生；不修改协议、认证或原插件内部布局。 */
export function transform(path, source) {
  if (createHash('sha256').update(source).digest('hex') !== hashes[path]) throw Error(`Unsupported source: ${path}`);
  function replace(before, after) {
    if (source.split(before).length !== 2) throw Error(`Non-unique lifecycle boundary: ${path}`);
    source = source.replace(before, after);
  }
  if (path.endsWith('/inventory.ts')) {
    replace('  reset(): void\n}', '  reset(): void\n  /** Stop publishing after the owning plugin is released. */\n  dispose(): void\n}');
    replace('  let generation = 0', '  let generation = 0\n  let disposed = false');
    replace('      if (inFlight !== undefined) return', '      if (disposed || inFlight !== undefined) return');
    replace('    retire: (pluginId) => {', '    retire: (pluginId) => {\n      if (disposed) return');
    replace('    reset: () => {', '    reset: () => {\n      if (disposed) return');
    replace('      publish({ rows: [], removed: snapshot.removed, read: false })\n    },', `      publish({ rows: [], removed: snapshot.removed, read: false })
    },
    dispose: () => {
      disposed = true
      generation += 1
      inFlight = undefined
      listeners.clear()
    },`);
  } else if (path.endsWith('/inspect-registry.ts')) {
    replace('  private publishQueued = false', '  private publishQueued = false\n  private generation = 0\n  private disposed = false');
    replace('    const { manifest } = registration', "    if (this.disposed) throw new Error('Client Cordis inspect registry is disposed')\n    const { manifest } = registration");
    replace('    if (this.publishQueued) return', '    if (this.disposed || this.publishQueued) return\n    const generation = this.generation\n    const current = (): boolean => !this.disposed && generation === this.generation');
    replace('    queueMicrotask(() => {\n      this.publishQueued = false', '    queueMicrotask(() => {\n      if (!current()) return\n      this.publishQueued = false');
    replace('        await this.host.sync(manifests)', '        if (current()) await this.host.sync(manifests)');
    replace("        console.error('[cordis-client-runner] syncing inspect providers failed:', error)", "        if (current()) console.error('[cordis-client-runner] syncing inspect providers failed:', error)");
    replace('  /**\n   * Execute and answer one Host-broadcast query.', `  /** Invalidate work owned by a lost connection; retain provider registrations. */
  reset(): void {
    this.generation += 1
    this.publishQueued = false
    for (const controller of this.active.values()) controller.abort()
    this.active.clear()
  }

  /** Drop queued publications before provider disposal schedules any more work. */
  dispose(): void {
    this.disposed = true
    this.reset()
    this.providers.clear()
  }

  /**
   * Execute and answer one Host-broadcast query.`);
    replace('    if (this.active.has(request.requestId)) return', '    if (this.disposed || this.active.has(request.requestId)) return');
    replace('      this.active.delete(request.requestId)', '      if (this.active.get(request.requestId) === controller) this.active.delete(request.requestId)');
    replace("  ctx.provide('cordisInspect', registry)", "  ctx.provide('cordisInspect', registry)\n  ctx.effect(() => () => registry.dispose(), 'cordis inspect lifecycle')");
  } else if (path.startsWith('ui-cordis/')) {
    source = "import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'\n" + source;
    replace('export function apply(ctx: ClientContext): void {', "export function apply(ctx: ClientContext): void {\n  const connection = ctx.get('connection') as ConnectionHandle");
    replace("  'slots', 'locale', 'remote', 'remote.dynamicCordisRunner', 'dynamicCordisRunner',", "  'slots', 'locale', 'remote', 'remote.dynamicCordisRunner', 'dynamicCordisRunner', 'connection',");
    replace('  const runner = ctx.dynamicCordisRunner', `  ctx.effect(() => {
    const off = connection.generation.subscribe(() => {
      if (!connection.generation.getSnapshot()) inventory.reset()
    })
    return () => { off(); inventory.dispose() }
  }, 'ui-cordis: inventory lifecycle')
  const runner = ctx.dynamicCordisRunner`);
  } else {
    source = "import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'\n" + source;
    replace('export function apply(ctx: Context): void {', "export function apply(ctx: Context): void {\n  const connection = ctx.get('connection') as ConnectionHandle");
    replace("'remote.dynamicCordisRunner']", "'remote.dynamicCordisRunner', 'connection']");
    replace('    sync: async (providers) => {', '    sync: async (providers) => {\n      if (!connection.generation.getSnapshot()) return');
    replace('  provideClientCordisInspect(ctx, inspect)', `  provideClientCordisInspect(ctx, inspect)
  ctx.effect(() => connection.generation.subscribe(() => {
    if (!connection.generation.getSnapshot()) inspect.reset()
  }), 'cordis inspect connection lifetime')`);
  }
  return source;
}
