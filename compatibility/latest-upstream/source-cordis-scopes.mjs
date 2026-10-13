import { createHash } from 'node:crypto';
import ts from 'typescript';

const digest = value => createHash('sha256').update(value).digest('hex');
const targets = {
  'index.ts': '512f97b15f015d3615e11b3059bebd116edefaa400044f5e70585bd893870369',
  'inspect-registry.ts': '3ece5db5adb24e13680097caf841ca988aedcc8a0a546dbbdb042a2f6e0f423a',
};
export const sourceCordisRemoteNames = ['undefineFromPanel', 'runHostHalf', 'getClientCode', 'resolveRequestRun', 'settleUserRun',
  'stopFromPanel', 'syncInspectManifest', 'resolveInspectQuery', 'inventory', 'reportRenderFailure', 'reportClientGuardFailure', 'invoke'];

// 句柄由已鉴权的Host连接持有，不接受客户端自报连接身份。
const registryMembers = `
  readonly dshmClientManifestScopesVersion: 1 = 1
  private readonly dshmManifestContext = new DshmAsyncLocalStorage<symbol>()
  private readonly dshmActiveScopes = new Set<symbol>()
  private readonly dshmScopeManifests = new Map<symbol, readonly CordisInspectProviderManifest[]>()
  private dshmLegacyManifest: readonly CordisInspectProviderManifest[] = []
  private dshmClosed = false

  assertClientManifestScope(): void {
    const key = this.dshmManifestContext.getStore()
    if (this.dshmClosed || (key !== undefined && !this.dshmActiveScopes.has(key)))
      throw new Error('Client Cordis inspect connection is closed')
  }

  outsideClientManifestScope<T>(callback: () => T): T {
    return this.dshmManifestContext.exit(callback)
  }

  createClientManifestScope(): DshmClientManifestScope {
    this.assertClientManifestScope()
    const key = Symbol('client inspect connection')
    this.dshmActiveScopes.add(key)
    let closed = false
    const assertActive = () => {
      if (closed || this.dshmClosed || !this.dshmActiveScopes.has(key))
        throw new Error('Client Cordis inspect connection is closed')
    }
    return Object.freeze({
      sync: (providers: readonly CordisInspectProviderManifest[]) => {
        assertActive()
        this.dshmUpdateManifest(key, providers)
      },
      run: <T>(callback: () => T): T => {
        assertActive()
        return this.dshmManifestContext.run(key, callback)
      },
      dispose: () => {
        if (closed) return
        closed = true
        this.dshmActiveScopes.delete(key)
        this.dshmScopeManifests.delete(key)
        if (!this.dshmClosed)
          this.clientManifest = dshmMergeManifests([this.dshmLegacyManifest, ...this.dshmScopeManifests.values()])
      },
    })
  }

  private dshmUpdateManifest(key: symbol | undefined, providers: readonly CordisInspectProviderManifest[]): void {
    const ids = new Set<string>()
    const validated = Object.freeze(providers.map(provider => {
      const manifest = validateManifest(provider)
      if (ids.has(manifest.id)) throw new Error(\`Client Cordis inspect manifest repeats provider "\${manifest.id}"\`)
      ids.add(manifest.id)
      const snapshot = snapshotJsonValue(manifest)
      if (snapshot === undefined) throw new Error('Client Cordis inspect manifest is not JSON')
      dshmFreezeManifest(snapshot)
      // 原验证已确认契约结构，snapshot保留其无损JSON并隔离页面可变引用。
      return snapshot as unknown as CordisInspectProviderManifest
    }))
    const scopes = new Map(this.dshmScopeManifests)
    if (key !== undefined) scopes.set(key, validated)
    const legacy = key === undefined ? validated : this.dshmLegacyManifest
    // 完整并集先校验后提交；同名不同契约不能由上报顺序决定覆盖结果。
    const merged = dshmMergeManifests([legacy, ...scopes.values()])
    if (key === undefined) this.dshmLegacyManifest = validated
    else this.dshmScopeManifests.set(key, validated)
    this.clientManifest = merged
  }
`;
const helpers = `
export interface DshmClientManifestScope {
  sync(providers: readonly CordisInspectProviderManifest[]): void
  run<T>(callback: () => T): T
  dispose(): void
}

function dshmFreezeManifest(value: unknown): void {
  if (value === null || typeof value !== 'object') return
  for (const child of Object.values(value)) dshmFreezeManifest(child)
  Object.freeze(value)
}

function dshmMergeManifests(sources: readonly (readonly CordisInspectProviderManifest[])[]): readonly CordisInspectProviderManifest[] {
  const merged = new Map<string, CordisInspectProviderManifest>()
  const signatures = new Map<string, string>()
  for (const providers of sources) for (const manifest of providers) {
    const ordered = { ...manifest, methods: [...manifest.methods].sort((a, b) => a.name.localeCompare(b.name)) }
    const signature = JSON.stringify(ordered, (_key: string, value: unknown) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
      const record = value as Record<string, unknown>
      return Object.fromEntries(Object.keys(record).sort().map(key => [key, record[key]]))
    })
    const previous = signatures.get(manifest.id)
    if (previous !== undefined && previous !== signature)
      throw new Error(\`Client Cordis inspect provider "\${manifest.id}" has conflicting page contracts\`)
    if (previous === undefined) {
      signatures.set(manifest.id, signature)
      merged.set(manifest.id, manifest)
    }
  }
  return Object.freeze([...merged.values()])
}
`;

function findClass(file, name) {
  const matches = file.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === name);
  if (matches.length !== 1) throw Error(`latest_source_cordis_class_mismatch:${name}`);
  return matches[0];
}

export function sourceCordisDeclarations(source) {
  const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return findClass(file, 'DynamicCordisRunnerService').members.filter(node => ts.isMethodDeclaration(node)
    && ts.getDecorators(node)?.some(dec => ts.isCallExpression(dec.expression) && dec.expression.expression.getText(file) === 'Remote'))
    .map(node => ({ name: node.name.getText(file), signature: source.slice(node.getStart(file), node.body.getStart(file)) }));
}

/** 仅修改固定原TS方法体，保留官方装饰器、签名、生成codec与参数查找。 */
export function transformSourceCordisScopes(name, source) {
  if (!Object.hasOwn(targets, name) || digest(source) !== targets[name]) throw Error('latest_source_cordis_unsupported_input');
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), edits = [];
  if (name === 'inspect-registry.ts') {
    const cls = findClass(file, 'CordisInspectRegistryService');
    edits.push({ start: cls.members.pos, end: cls.members.pos, value: registryMembers });
    const ctor = cls.members.find(ts.isConstructorDeclaration);
    const superCall = ctor?.body?.statements.find(node => ts.isExpressionStatement(node)
      && ts.isCallExpression(node.expression) && node.expression.expression.kind === ts.SyntaxKind.SuperKeyword);
    if (!superCall) throw Error('latest_source_cordis_constructor_mismatch');
    edits.push({ start: superCall.getEnd(), end: superCall.getEnd(), value: `
    ctx.effect(() => () => {
      this.dshmClosed = true
      this.dshmActiveScopes.clear()
      this.dshmScopeManifests.clear()
      this.dshmLegacyManifest = []
      this.clientManifest = []
    }, 'dshm: Cordis inspect connection scopes')` });
    const sync = cls.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(file) === 'syncClientManifest');
    if (!sync?.body) throw Error('latest_source_cordis_sync_mismatch');
    edits.push({ start: sync.body.getStart(file) + 1, end: sync.body.getEnd() - 1,
      value: '\n    this.assertClientManifestScope()\n    this.dshmUpdateManifest(this.dshmManifestContext.getStore(), providers)\n  ' });
  } else {
    if (JSON.stringify(sourceCordisDeclarations(source).map(row => row.name)) !== JSON.stringify(sourceCordisRemoteNames))
      throw Error('latest_source_cordis_remote_contract_mismatch');
    const cls = findClass(file, 'DynamicCordisRunnerService');
    for (const [methodName, anchor] of [['define', 'plugin.packages.set(packageId, definition)'], ['undefine', 'this.registry.delete(pluginId)']]) {
      const method = cls.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(file) === methodName);
      if (!method?.body) throw Error(`latest_source_cordis_inventory_method_mismatch:${methodName}`);
      const body = method.body.getText(file), offset = body.indexOf(anchor);
      if (offset < 0 || body.split(anchor).length !== 2) throw Error(`latest_source_cordis_inventory_boundary_mismatch:${methodName}`);
      const end = method.body.getStart(file) + offset + anchor.length;
      edits.push({ start: end, end, value: "\n    this.ctx.emit('cordis/inventory-changed')" });
    }
    edits.push({ start: cls.members.pos, end: cls.members.pos, value: '\n  readonly dshmRemoteVersion: 1 = 1\n' });
    for (const methodName of sourceCordisRemoteNames) {
      const matches = cls.members.filter(node => ts.isMethodDeclaration(node) && node.name.getText(file) === methodName);
      if (matches.length !== 1 || !matches[0].body || !matches[0].type) throw Error(`latest_source_cordis_method_mismatch:${methodName}`);
      const member = matches[0], start = member.body.getStart(file) + 1, end = member.body.getEnd() - 1;
      let body = source.slice(start, end);
      if (methodName === 'reportRenderFailure') {
        const anchor = '      if (definition !== undefined && shouldSteer)';
        if (body.split(anchor).length !== 2) throw Error('latest_source_cordis_render_failure_boundary_mismatch');
        // 只广播原有效运行已提交的诊断，保留旧运行报告的忽略语义。
        body = body.replace(anchor, "      this.ctx.emit('cordis/inventory-changed')\n" + anchor);
      }
      if (methodName === 'runHostHalf') {
        const boundary = "latest.status !== expectedStatus && (!pending.requiresApproval && latest.status !== 'client-pending')";
        if (body.split(boundary).length !== 2) throw Error('latest_source_cordis_approval_start_mismatch');
        body = body.replace(boundary, "latest.status !== expectedStatus && (pending.requiresApproval || latest.status !== 'client-pending')");
      }
      if (methodName === 'resolveRequestRun') {
        const boundary = '    this.registry.claimRequest(requestId)';
        if (body.split(boundary).length !== 2) throw Error('latest_source_cordis_approval_settlement_mismatch');
        body = body.replace(boundary, `    // 批准已开始时，另一页面的旧拒绝/重复启动失败不能抢走结算权。
    const attempt = plugin?.latestRun
    if (attempt?.pluginRunId !== pending.pluginRunId) return { accepted: false }
    if (!resolution.ok && resolution.reason === 'rejected' && attempt.status !== 'awaiting-approval') return { accepted: false }
    if (!resolution.ok && resolution.reason === 'host-half-failed' && attempt.status !== 'failed') return { accepted: false }
${boundary}`);
      }
      const guard = '\n    this.inspectRegistry.assertClientManifestScope()';
      const asyncMethod = member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
      // 回调沿用原返回类型，避免泛型推导把原判别联合的字面量拓宽为boolean。
      edits.push({ start, end, value: methodName === 'syncInspectManifest' ? guard + body
        : guard + `\n    return ${asyncMethod ? 'await ' : ''}this.inspectRegistry.outsideClientManifestScope(${asyncMethod ? 'async ' : ''}(): ${member.type.getText(file)} => {${body}\n    })\n  ` });
    }
  }
  for (const { start, end, value } of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, start) + value + source.slice(end);
  return name === 'inspect-registry.ts' ? "import { AsyncLocalStorage as DshmAsyncLocalStorage } from 'node:async_hooks'\n" + source + helpers : source;
}
