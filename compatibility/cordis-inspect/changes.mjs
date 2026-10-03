import { createHash } from 'node:crypto';
import ts from 'typescript';

const baseline = '1f530c25e6eeffdf6386e2896b4555825111cb6efdb4b784fae71c3cc08e518e';

/** 仅派生已核验的注册表，不增加远程路由或接收页面自报身份。 */
export function transform(source) {
  if (createHash('sha256').update(source).digest('hex') !== baseline) throw new Error('Unsupported Cordis inspect source');
  source = "import { AsyncLocalStorage } from 'node:async_hooks'\n" + source;
  source = source.replace('   * Replace the mirrored Client provider directory.',
    '   * Replace the legacy Client directory, retaining additional connection scopes.');
  source = source.replace("    super(ctx, 'cordisInspect')", `    super(ctx, 'cordisInspect')
    ctx.effect(() => () => {
      this.activeClientScopes.clear()
      this.clientManifestScopes.clear()
      this.legacyClientManifest = []
      this.clientManifest = []
    }, 'dshm: Cordis inspect connection scopes')`);
  source = source.replace('  private nextRequest = 1', `  readonly dshmClientManifestScopesVersion = 1
  private readonly clientManifestContext = new AsyncLocalStorage<symbol>()
  private readonly activeClientScopes = new Set<symbol>()
  private readonly clientManifestScopes = new Map<symbol, readonly CordisInspectProviderManifest[]>()
  private legacyClientManifest: readonly CordisInspectProviderManifest[] = []
  private nextRequest = 1`);
  const start = source.indexOf('    const ids = new Set<string>()', source.indexOf('  syncClientManifest('));
  const end = source.indexOf('\n  /**', start);
  if (start < 0 || end < 0) throw new Error('Cordis inspect source boundary missing');
  source = source.slice(0, start) + `    this.assertClientManifestScope()
    this.updateClientManifest(this.clientManifestContext.getStore(), providers)
  }

  /** Reject a closed Remote generation after original asynchronous argument decoding. */
  assertClientManifestScope(): void {
    const key = this.clientManifestContext.getStore()
    if (key !== undefined && !this.activeClientScopes.has(key)) throw new Error('Client Cordis inspect connection is closed')
  }

  /** Background Host work must not inherit a phone transport's lifetime. */
  outsideClientManifestScope<T>(callback: () => T): T {
    return this.clientManifestContext.exit(callback)
  }

  /**
   * Host-only lifetime for one additional Client connection. The transport owns
   * this handle; a page cannot select another connection's manifest scope.
   */
  createClientManifestScope(): { sync(providers: readonly CordisInspectProviderManifest[]): void; run<T>(callback: () => T): T; dispose(): void } {
    const key = Symbol('client inspect connection')
    this.activeClientScopes.add(key)
    let closed = false
    return Object.freeze({
      sync: (providers: readonly CordisInspectProviderManifest[]): void => {
        if (closed || !this.activeClientScopes.has(key)) throw new Error('Client Cordis inspect connection is closed')
        this.updateClientManifest(key, providers)
      },
      run: <T>(callback: () => T): T => {
        if (closed || !this.activeClientScopes.has(key)) throw new Error('Client Cordis inspect connection is closed')
        return this.clientManifestContext.run(key, callback)
      },
      dispose: (): void => {
        if (closed) return
        closed = true
        this.activeClientScopes.delete(key)
        this.clientManifestScopes.delete(key)
        this.clientManifest = mergeClientManifests([this.legacyClientManifest, ...this.clientManifestScopes.values()])
      },
    })
  }

  private updateClientManifest(key: symbol | undefined, providers: readonly CordisInspectProviderManifest[]): void {
    const ids = new Set<string>()
    const validated = Object.freeze(providers.map((provider) => {
      const manifest = validateManifest(provider)
      if (ids.has(manifest.id)) throw new Error(\`Client Cordis inspect manifest repeats provider "\${manifest.id}"\`)
      ids.add(manifest.id)
      // Retain an independent JSON snapshot: later caller mutation cannot change
      // the contract used to validate an already pending model query.
      const snapshot = snapshotJsonValue(manifest)
      if (snapshot === undefined) throw new Error('Client Cordis inspect manifest is not JSON')
      freezeManifestJson(snapshot)
      return snapshot as unknown as CordisInspectProviderManifest
    }))
    const nextScopes = new Map(this.clientManifestScopes)
    if (key !== undefined) nextScopes.set(key, validated)
    const legacy = key === undefined ? validated : this.legacyClientManifest
    // Validate the complete union before committing either source. Different
    // contracts for the same provider must fail explicitly, never win a race.
    const merged = mergeClientManifests([legacy, ...nextScopes.values()])
    if (key === undefined) this.legacyClientManifest = validated
    else this.clientManifestScopes.set(key, validated)
    this.clientManifest = merged
  }
` + source.slice(end);
  source += `
function freezeManifestJson(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  for (const child of Object.values(value)) freezeManifestJson(child)
  Object.freeze(value)
}

/** Same provider on multiple pages is one capability, not a duplicate tool. */
function mergeClientManifests(sources: readonly (readonly CordisInspectProviderManifest[])[]): readonly CordisInspectProviderManifest[] {
  const merged = new Map<string, CordisInspectProviderManifest>()
  const signatures = new Map<string, string>()
  for (const providers of sources) for (const manifest of providers) {
    const signature = manifestSignature(manifest)
    const previous = signatures.get(manifest.id)
    if (previous !== undefined && previous !== signature) {
      throw new Error(\`Client Cordis inspect provider "\${manifest.id}" has conflicting page contracts\`)
    }
    if (previous === undefined) {
      signatures.set(manifest.id, signature)
      merged.set(manifest.id, manifest)
    }
  }
  return Object.freeze([...merged.values()])
}

function manifestSignature(manifest: CordisInspectProviderManifest): string {
  // Object-key and method-directory order do not change the wire contract.
  const ordered = { ...manifest, methods: [...manifest.methods].sort((a, b) => a.name.localeCompare(b.name)) }
  return JSON.stringify(ordered, (_key: string, value: unknown) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
    const record = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(record).sort().map(key => [key, record[key]]))
  })
}
`;
  return source;
}

/** Keep every original Remote decoder/method; add only the transport-lifetime entry guard. */
export function transformRunner(source) {
  if (createHash('sha256').update(source).digest('hex') !== '6cf4486a16f335ab13e120d131ac0e4c0e296116061cd920ecac7e0ef65f10dc')
    throw new Error('Unsupported Cordis runner source');
  source = source.replace("  static inject = ['tools']", "  readonly dshmRemoteVersion = 1\n  static inject = ['tools']");
  const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const runner = file.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'DynamicCordisRunnerService');
  if (!runner) throw new Error('Cordis runner class missing');
  const replacements = [];
  for (const member of runner.members) {
    if (!ts.isMethodDeclaration(member) || !member.body) continue;
    const remote = ts.getDecorators(member)?.some(decorator => ts.isCallExpression(decorator.expression)
      && decorator.expression.expression.getText(file) === 'Remote');
    if (!remote) continue;
    const start = member.body.getStart(file) + 1, end = member.body.getEnd() - 1;
    const body = source.slice(start, end);
    const guard = '\n    this.inspectRegistry.assertClientManifestScope()';
    const asyncMethod = member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
    const replacement = member.name.getText(file) === 'syncInspectManifest' ? guard + body
      : guard + `\n    return ${asyncMethod ? 'await ' : ''}this.inspectRegistry.outsideClientManifestScope(${asyncMethod ? 'async ' : ''}() => {${body}\n    })\n  `;
    replacements.push({ start, end, replacement });
  }
  if (replacements.length !== 12) throw new Error('Unexpected Cordis Remote method count');
  for (const { start, end, replacement } of replacements.sort((a, b) => b.start - a.start))
    source = source.slice(0, start) + replacement + source.slice(end);
  return source;
}
