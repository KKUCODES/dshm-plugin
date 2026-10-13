import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { transform as lifetime } from '../cordis-client-lifetime/changes.mjs';
import { transform as inventory } from '../cordis-inventory-sync/changes.mjs';
import { transformInventoryReady } from './cordis-inventory-ready.mjs';
import { panelErrorExpression } from './cordis-panel-error.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url)), runtime = resolve(root, 'artifacts/latest-runtime-check');
const digest = value => createHash('sha256').update(value).digest('hex');
const sources = [
  ['extensions/ui-cordis/src/client/inventory.ts', true], ['extensions/ui-cordis/src/client/index.ts', true],
  ['extensions/cordis-client-runner/src/client/inspect-registry.ts', false], ['extensions/cordis-client-runner/src/client/index.ts', false],
];
const targets = [
  ['@deepseek-ai/dsh-client-ui-cordis', 'lib/client.js', '605bac42a6b4e33b2f3b8eeb760e8b9a28733d801cf3a8974e820de7dad7050e', 'cordis-ui-client.js'],
  ['@deepseek-ai/dsh-cordis-client-runner', 'lib/client.js', '814a0d034f84c2b56f337e3eba60ed65835c36d9506c7d73d43ab523bcd2ea02', 'cordis-runner-client.js'],
  ['@deepseek-ai/dsh-api-remotes', 'lib/index.js', 'cec4c600bf45db5d59941bd89203a656a31a5d8dc1903822b7780b0e000aaec5', 'cordis-remote-index.js'],
  ['@deepseek-ai/dsh-api-remotes', 'lib/types/remote-events.js', '554df1dd0acec61d8f523ab2af64ccf34c034970db42b633714d47368cedaa20', 'cordis-remote-events.js'],
];
const parse = text => ts.createSourceFile('candidate.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function find(file, kind, name) {
  const matches = []; const visit = node => {
    if (node.kind === kind && (node.name?.getText(file) === name || (ts.isClassExpression(node)
      && ts.isVariableDeclaration(node.parent) && node.parent.name.getText(file) === name))) matches.push(node);
    ts.forEachChild(node, visit);
  }; visit(file);
  if (matches.length !== 1) throw Error(`latest_cordis_client_binding_mismatch:${name}`);
  return matches[0];
}
function transplant(original, modules, runner) {
  const originalFile = parse(original), edits = [];
  for (const [source, kind, name] of modules) {
    const input = find(parse(source), kind, name), output = find(originalFile, kind, name);
    if (kind === ts.SyntaxKind.VariableDeclaration) {
      edits.push({ start: output.initializer.getStart(originalFile), end: output.initializer.getEnd(), value: input.initializer.getText() });
    } else {
      edits.push({ start: output.getStart(originalFile), end: output.getEnd(), value: input.getText().replace(/^export\s+/, '') });
    }
  }
  for (const row of edits.sort((a, b) => b.start - a.start)) original = original.slice(0, row.start) + row.value + original.slice(row.end);
  if (!runner && !original.includes('cordis/inventory-changed')) throw Error('latest_cordis_client_inventory_hook_missing');
  return original;
}

/** 固定新版候选中移植已核验同源逻辑，保留原 ModuleLoader 包壳、组件与依赖身份。 */
export async function prepareLatestCordisClientLifetime({ write = true } = {}) {
  const compiled = [], sourceReport = [];
  for (const [path, withInventory] of sources) {
    const original = await readFile(resolve(root, 'artifacts/latest-sources/packages', path), 'utf8');
    // 旧变换仍逐文件校验固定原哈希；新版源码身份相同，不能放宽哈希来强行借用。
    let changed = lifetime(path.slice('extensions/'.length), original);
    if (withInventory) changed = inventory(path, changed);
    if (path === 'extensions/ui-cordis/src/client/index.ts') changed = transformInventoryReady(changed);
    const code = ts.transpileModule(changed, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    compiled.push(code); sourceReport.push({ path, before: digest(original), after: digest(changed) });
  }
  const actual = await realpath(runtime), originals = resolve(runtime, 'patch-originals');
  if (write) await mkdir(originals, { recursive: true });
  const inside = async path => {
    const rel = relative(actual, await realpath(path));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_cordis_client_outside_runtime');
  }; await inside(originals);
  const changes = [];
  for (const [name, entry, before, backupName] of targets) {
    const pkgRoot = resolve(runtime, 'node_modules', name), pkg = JSON.parse(await readFile(resolve(pkgRoot, 'package.json'), 'utf8'));
    if (pkg.name !== name || pkg.version !== '0.2.1-alpha.1') throw Error(`latest_cordis_client_version_mismatch:${name}`);
    const path = resolve(pkgRoot, entry), backup = resolve(originals, backupName); await inside(path);
    const current = await readFile(path); let original = current;
    if (digest(original) !== before) { await inside(backup); original = await readFile(backup); }
    if (digest(original) !== before) throw Error(`latest_cordis_client_original_mismatch:${name}`);
    let modified;
    if (name.endsWith('ui-cordis')) {
      modified = transplant(original.toString(), [
        [compiled[0], ts.SyntaxKind.FunctionDeclaration, 'createCordisInventory'],
        [compiled[1], ts.SyntaxKind.FunctionDeclaration, 'apply'], [compiled[1], ts.SyntaxKind.VariableDeclaration, 'inject'],
      ], false);
      const file = parse(modified), panel = find(file, ts.SyntaxKind.FunctionDeclaration, 'CordisPanel');
      const failure = find(parse(panel.getText(file)), ts.SyntaxKind.VariableDeclaration, 'failure');
      if (failure.initializer.getText() !== 'errors.get(pluginId)') throw Error('latest_panel_error_bundle_mismatch');
      const offset = panel.getStart(file);
      // 按实际组件内的唯一绑定定位，保留原 JSX 和包壳，不重新生成整页。
      modified = modified.slice(0, offset + failure.initializer.getStart()) + panelErrorExpression
        + modified.slice(offset + failure.initializer.getEnd());
    }
    else if (name.endsWith('cordis-client-runner')) {
      // 原 bundle 用匿名 class expression，源派生用具名 class declaration。
      const text = original.toString(), file = parse(text), target = find(file, ts.SyntaxKind.ClassExpression, 'ClientCordisInspectRegistry');
      const src = parse(compiled[2]), cls = find(src, ts.SyntaxKind.ClassDeclaration, 'ClientCordisInspectRegistry');
      const members = compiled[2].slice(cls.members.pos, cls.members.end);
      const changed = text.slice(0, target.members.pos) + members + text.slice(target.members.end);
      modified = transplant(changed, [[compiled[2], ts.SyntaxKind.FunctionDeclaration, 'provideClientCordisInspect'],
        [compiled[3], ts.SyntaxKind.FunctionDeclaration, 'apply'], [compiled[3], ts.SyntaxKind.VariableDeclaration, 'inject']], true);
    } else {
      const text = original.toString(), file = parse(text), list = find(file, ts.SyntaxKind.VariableDeclaration, 'API_REMOTE_FORWARDED_EVENTS');
      if (!ts.isArrayLiteralExpression(list.initializer)) throw Error('latest_cordis_client_event_list_mismatch');
      const end = list.initializer.getEnd() - 1;
      const separator = list.initializer.elements.hasTrailingComma ? '' : ',';
      modified = text.slice(0, end) + separator + '{ event: "cordis/inventory-changed", mode: "emit" }' + text.slice(end);
    }
    const after = digest(modified);
    const previousEventHash = entry === 'lib/index.js' && name.endsWith('api-remotes')
      ? '105eb27af926cb28605b825ddb2c27c1fc6abbc26aeff0a4e21cd09818dd357b'
      : entry === 'lib/types/remote-events.js' ? '58021710f8a5f83e54fb64712e9dbfe22946b20fec0df7f51072f4875a9a0c41' : undefined;
    const previousUiHash = name.endsWith('ui-cordis') ? 'fe98ad4e314edf13b993fe8637fc5ff8c5af4d295668fabcf328ac0418659e14' : undefined;
    const previousReadyUiHash = name.endsWith('ui-cordis') ? 'f1a15ed98063fb01c6cbe8387fdc665836e80a87debcb3b3fabc18e99c5de66d' : undefined;
    if (![before, after, previousEventHash, previousUiHash, previousReadyUiHash].includes(digest(current))) throw Error(`latest_cordis_client_changed_outside_patch:${name}`);
    changes.push({ path, backup, original, modified, before, after });
  }
  if (!write) return { patch: 'latest-cordis-client-lifetime-inventory-v2', sources: sourceReport, files: changes };
  for (const row of changes) { await writeFile(row.backup, row.original); await writeFile(row.path, row.modified); }
  const report = { patch: 'latest-cordis-client-lifetime-inventory-v2', version: '0.2.1-alpha.1', sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc',
    isolatedCandidateOnly: true, sources: sourceReport, files: changes.map(({ path, backup, before, after }) => ({ path, backup, before, after })) };
  await writeFile(resolve(runtime, 'cordis-client-lifetime-patch.json'), JSON.stringify(report, null, 2) + '\n'); return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await prepareLatestCordisClientLifetime()));
