import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const digest = value => createHash('sha256').update(value).digest('hex');
const targets = [
  ['lib/index.js', '5d014094bd734dae0fb220977723588a12e5ba42e8b197d70f28078cef800f67', 'cordis-runner-index.js', true, true],
  ['lib/types/inspect-registry.js', '82824813191a1916e30c5e84a955e14cb270d9d307a64ed5ce01f1cfcbb5787c', 'cordis-inspect-registry.js', true, false],
  ['lib/types/index.js', '83a4f8f25bbf39f65f219a8abf95a76e3a1671f0dc73e524cc91c86ed59c6abe', 'cordis-runner-types.js', false, true],
];
const remoteNames = ['undefineFromPanel', 'runHostHalf', 'getClientCode', 'resolveRequestRun', 'settleUserRun',
  'stopFromPanel', 'syncInspectManifest', 'resolveInspectQuery', 'inventory', 'reportRenderFailure', 'reportClientGuardFailure', 'invoke'];

// 手机目录不改写电脑原目录；句柄只由已鉴权 Host 连接持有，不接收页面自报身份。
const registryMembers = `
  dshmClientManifestScopesVersion = 1;
  dshmManifestContext = new DshmAsyncLocalStorage();
  dshmActiveScopes = new Set();
  dshmScopeManifests = new Map();
  dshmLegacyManifest = [];
  dshmClosed = false;
  assertClientManifestScope() {
    const key = this.dshmManifestContext.getStore();
    if (this.dshmClosed || (key !== undefined && !this.dshmActiveScopes.has(key)))
      throw Error('Client Cordis inspect connection is closed');
  }
  outsideClientManifestScope(callback) { return this.dshmManifestContext.exit(callback); }
  createClientManifestScope() {
    this.assertClientManifestScope();
    const key = Symbol('client inspect connection'); this.dshmActiveScopes.add(key);
    let closed = false;
    const assertActive = () => {
      if (closed || this.dshmClosed || !this.dshmActiveScopes.has(key))
        throw Error('Client Cordis inspect connection is closed');
    };
    return Object.freeze({
      sync: providers => { assertActive(); this.dshmUpdateManifest(key, providers); },
      run: callback => { assertActive(); return this.dshmManifestContext.run(key, callback); },
      dispose: () => {
        if (closed) return; closed = true;
        this.dshmActiveScopes.delete(key); this.dshmScopeManifests.delete(key);
        if (!this.dshmClosed) this.clientManifest = dshmMergeManifests([this.dshmLegacyManifest, ...this.dshmScopeManifests.values()]);
      },
    });
  }
  dshmUpdateManifest(key, providers) {
    const ids = new Set();
    const validated = Object.freeze(providers.map(provider => {
      const manifest = validateManifest(provider);
      if (ids.has(manifest.id)) throw Error(\`Client Cordis inspect manifest repeats provider "\${manifest.id}"\`);
      ids.add(manifest.id);
      const snapshot = snapshotJsonValue(manifest);
      if (snapshot === undefined) throw Error('Client Cordis inspect manifest is not JSON');
      dshmFreezeManifest(snapshot); return snapshot;
    }));
    const scopes = new Map(this.dshmScopeManifests);
    if (key !== undefined) scopes.set(key, validated);
    const legacy = key === undefined ? validated : this.dshmLegacyManifest;
    // 完整并集先校验后提交；同名不同契约不能由上报顺序决定覆盖结果。
    const merged = dshmMergeManifests([legacy, ...scopes.values()]);
    if (key === undefined) this.dshmLegacyManifest = validated;
    else this.dshmScopeManifests.set(key, validated);
    this.clientManifest = merged;
  }
`;
const helpers = `
function dshmFreezeManifest(value) {
  if (value === null || typeof value !== 'object') return;
  for (const child of Object.values(value)) dshmFreezeManifest(child);
  Object.freeze(value);
}
function dshmMergeManifests(sources) {
  const merged = new Map(), signatures = new Map();
  for (const providers of sources) for (const manifest of providers) {
    const ordered = { ...manifest, methods: [...manifest.methods].sort((a, b) => a.name.localeCompare(b.name)) };
    const signature = JSON.stringify(ordered, (_key, value) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]]));
    });
    const previous = signatures.get(manifest.id);
    if (previous !== undefined && previous !== signature)
      throw Error(\`Client Cordis inspect provider "\${manifest.id}" has conflicting page contracts\`);
    if (previous === undefined) { signatures.set(manifest.id, signature); merged.set(manifest.id, manifest); }
  }
  return Object.freeze([...merged.values()]);
}
`;

function findClass(file, name) {
  const matches = [];
  const visit = node => {
    if ((ts.isClassDeclaration(node) || ts.isClassExpression(node))
      && (node.name?.text === name || (ts.isVariableDeclaration(node.parent) && node.parent.name.getText(file) === name))) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  if (matches.length !== 1) throw Error(`latest_cordis_class_mismatch:${name}`);
  return matches[0];
}

/** 修改原方法体，保留官方装饰器、生成 codec、服务身份和参数查找。 */
export function transformLatestCordis(source, registry, runner, approvalRace = true, inventorySync = true, renderFailureSync = true) {
  if (!targets.some(([, hash, , hasRegistry, hasRunner]) => hash === digest(source) && hasRegistry === registry && hasRunner === runner))
    throw Error('latest_cordis_unsupported_input');
  const file = ts.createSourceFile('candidate.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), edits = [];
  if (registry) {
    const cls = findClass(file, 'CordisInspectRegistryService');
    edits.push({ start: cls.members.pos, end: cls.members.pos, value: registryMembers });
    const ctor = cls.members.find(ts.isConstructorDeclaration);
    const superCall = ctor?.body?.statements.find(node => ts.isExpressionStatement(node)
      && ts.isCallExpression(node.expression) && node.expression.expression.kind === ts.SyntaxKind.SuperKeyword);
    if (!superCall) throw Error('latest_cordis_constructor_mismatch');
    edits.push({ start: superCall.getEnd(), end: superCall.getEnd(), value: `
      ctx.effect(() => () => {
        this.dshmClosed = true; this.dshmActiveScopes.clear(); this.dshmScopeManifests.clear();
        this.dshmLegacyManifest = []; this.clientManifest = [];
      }, 'dshm: Cordis inspect connection scopes');` });
    const sync = cls.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(file) === 'syncClientManifest');
    if (!sync?.body) throw Error('latest_cordis_sync_mismatch');
    edits.push({ start: sync.body.getStart(file) + 1, end: sync.body.getEnd() - 1,
      value: '\n    this.assertClientManifestScope(); this.dshmUpdateManifest(this.dshmManifestContext.getStore(), providers);\n  ' });
  }
  if (runner) {
    const cls = findClass(file, 'DynamicCordisRunnerService');
    if (inventorySync) for (const [name, anchor] of [['define', 'plugin.packages.set(packageId, definition);'], ['undefine', 'this.registry.delete(pluginId);']]) {
      const method = cls.members.find(node => ts.isMethodDeclaration(node) && node.name.getText(file) === name);
      if (!method?.body) throw Error(`latest_cordis_inventory_method_mismatch:${name}`);
      const body = method.body.getText(file), offset = body.indexOf(anchor);
      if (offset < 0 || body.split(anchor).length !== 2) throw Error(`latest_cordis_inventory_boundary_mismatch:${name}`);
      const end = method.body.getStart(file) + offset + anchor.length;
      edits.push({ start: end, end, value: '\n    this.ctx.emit("cordis/inventory-changed");' });
    }
    edits.push({ start: cls.members.pos, end: cls.members.pos, value: '\n  dshmRemoteVersion = 1;\n' });
    for (const name of remoteNames) {
      const matches = cls.members.filter(node => ts.isMethodDeclaration(node) && node.name.getText(file) === name);
      if (matches.length !== 1 || !matches[0].body) throw Error(`latest_cordis_method_mismatch:${name}`);
      const member = matches[0], start = member.body.getStart(file) + 1, end = member.body.getEnd() - 1;
      let body = source.slice(start, end);
      if (renderFailureSync && name === 'reportRenderFailure') {
        const anchors = ['if (definition !== void 0 && shouldSteer)', 'if (definition !== undefined && shouldSteer)'];
        const matched = anchors.filter(anchor => body.includes(anchor));
        if (matched.length !== 1 || body.split(matched[0]).length !== 2) throw Error('latest_cordis_render_failure_boundary_mismatch');
        const anchor = matched[0];
        // 当前运行的诊断提交后再广播；旧运行的迟到报告仍由原条件忽略。
        body = body.replace(anchor, 'this.ctx.emit("cordis/inventory-changed");\n\t\t\t\t' + anchor);
      }
      if (approvalRace && name === 'runHostHalf') {
        const boundaries = ['latest.status !== expectedStatus && !pending.requiresApproval && latest.status !== "client-pending"',
          "latest.status !== expectedStatus && (!pending.requiresApproval && latest.status !== 'client-pending')"];
        const matched = boundaries.filter(value => body.includes(value));
        if (matched.length !== 1 || body.split(matched[0]).length !== 2) throw Error('latest_cordis_approval_start_mismatch');
        body = body.replace(matched[0], 'latest.status !== expectedStatus && (pending.requiresApproval || latest.status !== "client-pending")');
      }
      if (approvalRace && name === 'resolveRequestRun') {
        const boundary = 'this.registry.claimRequest(requestId);';
        if (body.split(boundary).length !== 2) throw Error('latest_cordis_approval_settlement_mismatch');
        body = body.replace(boundary, `
          // 批准已开始时，另一页面的旧拒绝/重复启动失败不能抢走结算权。
          const attempt = plugin?.latestRun;
          if (attempt?.pluginRunId !== pending.pluginRunId) return { accepted: false };
          if (!resolution.ok && resolution.reason === 'rejected' && attempt.status !== 'awaiting-approval') return { accepted: false };
          if (!resolution.ok && resolution.reason === 'host-half-failed' && attempt.status !== 'failed') return { accepted: false };
          ${boundary}`);
      }
      const guard = '\n    this.inspectRegistry.assertClientManifestScope();';
      const asyncMethod = member.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
      edits.push({ start, end, value: name === 'syncInspectManifest' ? guard + body
        : guard + `\n    return ${asyncMethod ? 'await ' : ''}this.inspectRegistry.outsideClientManifestScope(${asyncMethod ? 'async ' : ''}() => {${body}\n    });\n  ` });
    }
  }
  for (const { start, end, value } of edits.sort((a, b) => b.start - a.start)) source = source.slice(0, start) + value + source.slice(end);
  return registry ? "import { AsyncLocalStorage as DshmAsyncLocalStorage } from 'node:async_hooks';\n" + source + helpers : source;
}

/** 仅固定新版 npm 候选；原字节或本脚本生成字节之外的修改全部拒绝。 */
export async function prepareLatestCordisScopes({ write = true } = {}) {
  const pkgRoot = resolve(runtime, 'node_modules/@deepseek-ai/dsh-cordis-host-runner');
  const pkg = JSON.parse(await readFile(resolve(pkgRoot, 'package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-cordis-host-runner' || pkg.version !== '0.2.1-alpha.1') throw Error('latest_cordis_version_mismatch');
  const source = await readFile(resolve(root, 'artifacts/latest-sources/packages/extensions/cordis-host-runner/src/index.ts'), 'utf8');
  if (digest(source) !== '512f97b15f015d3615e11b3059bebd116edefaa400044f5e70585bd893870369') throw Error('latest_cordis_source_mismatch');
  const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const declared = findClass(file, 'DynamicCordisRunnerService').members.filter(node => ts.isMethodDeclaration(node)
    && ts.getDecorators(node)?.some(dec => ts.isCallExpression(dec.expression) && dec.expression.expression.getText(file) === 'Remote')).map(node => node.name.getText(file));
  if (JSON.stringify(declared) !== JSON.stringify(remoteNames)) throw Error('latest_cordis_remote_contract_mismatch');
  const originals = resolve(runtime, 'patch-originals'); await mkdir(originals, { recursive: true });
  const actual = await realpath(runtime);
  const inside = async path => {
    const rel = relative(actual, await realpath(path));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_cordis_outside_runtime');
  };
  await inside(originals);
  const changes = [];
  for (const [entry, before, name, registry, runner] of targets) {
    const path = resolve(pkgRoot, entry), backup = resolve(originals, name); await inside(path);
    const current = await readFile(path); let original = current;
    if (digest(original) !== before) { await inside(backup); original = await readFile(backup); }
    if (digest(original) !== before) throw Error(`latest_cordis_original_mismatch:${entry}`);
    const modified = transformLatestCordis(original.toString(), registry, runner), after = digest(modified);
    const scopeOnly = digest(transformLatestCordis(original.toString(), registry, runner, false, false, false));
    const scopeAndApproval = digest(transformLatestCordis(original.toString(), registry, runner, true, false, false));
    const previous = digest(transformLatestCordis(original.toString(), registry, runner, true, true, false));
    if (![before, scopeOnly, scopeAndApproval, previous, after].includes(digest(current))) throw Error(`latest_cordis_changed_outside_patch:${entry}`);
    changes.push({ path, backup, original, modified, before, after });
  }
  // 全部目标先核验；任何未知字节不允许只更新一半服务。
  if (write) for (const row of changes) { await writeFile(row.backup, row.original); await writeFile(row.path, row.modified); }
  const report = { patch: 'latest-cordis-scopes-approval-inventory-v3', version: pkg.version, sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc',
    isolatedCandidateOnly: true, remoteMethods: remoteNames, files: changes.map(({ path, backup, before, after }) => ({ path, backup, before, after })) };
  if (write) await writeFile(resolve(runtime, 'cordis-scopes-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return write ? report : { ...report, files: changes };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await prepareLatestCordisScopes()));
