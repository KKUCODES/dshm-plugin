import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existingInside, replaceFile } from '../background-output/install-runtime.mjs';

const root = fileURLToPath(new URL('../../artifacts/latest-runtime-check/', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const manager = 'node_modules/@deepseek-ai/dsh-plugin-manager';
const client = 'node_modules/@deepseek-ai/dsh-client-ui-plugin-manager';
const processChanges = [
  { path: `${manager}/lib/index.js`, hash: 'c67d5f1e31f5884491fa23262b238fea39eed21428d7dcb0ca7edc8c5587d4ba',
    previousHash: '98f4dcc055db212639d171d2f935147d0240661ccd87a71996b2622c8ee82f99',
    edits: [
      ['\t\ttimeout: options.lookupTimeoutMs ?? LOOKUP_TIMEOUT_MS', '\t\tkillDescendants: true,\n\t\ttimeout: options.lookupTimeoutMs ?? LOOKUP_TIMEOUT_MS'],
      ['\t\ttimeout: options.timeoutMs\n', '\t\tkillDescendants: true,\n\t\ttimeout: options.timeoutMs\n'],
      ['\t\ttimeout: options.timeoutMs,\n\t\t...options.signal', '\t\tkillDescendants: true,\n\t\ttimeout: options.timeoutMs,\n\t\t...options.signal'],
      ['const repairing = execa(options.command ?? "pnpm", [...options.args ?? [], ...repair], {\n',
        'const repairing = execa(options.command ?? "pnpm", [...options.args ?? [], ...repair], {\n\t\t\t\t\tkillDescendants: true,\n'],
      ['pid: repairing.pid,\n\t\t\t\t\tgrouped: false', 'pid: repairing.pid,\n\t\t\t\t\tgrouped: leadsOwnGroup("service")'],
      ['const repaired = await repairing;\n\t\t\t\texitCode = 1;',
        'const repaired = await repairing;\n\t\t\t\tcontrol.stalled ||= repaired.timedOut;\n\t\t\t\texitCode = 1;'],
    ] },
  { path: `${manager}/lib/types/operations.js`, hash: 'bf511a06b6ff2d7aab1f7725fcc80f304eb32a9541790e22cd28f8a9617b2c68',
    previousHash: 'afed5881abca5166a2e98f2a88a9656d621fd7c933dcf8e259aa2510c0e3cdec',
    edits: [
      ['\n        cwd: dir, env: environment, extendEnv: false, reject: false, stdin: \'ignore\',',
        '\n        killDescendants: true,\n        cwd: dir, env: environment, extendEnv: false, reject: false, stdin: \'ignore\','],
      ["stdin: 'ignore', timeout: options.timeoutMs,", "stdin: 'ignore', killDescendants: true, timeout: options.timeoutMs,"],
      ['        timeout: options.timeoutMs, ...options.signal', '        killDescendants: true,\n        timeout: options.timeoutMs, ...options.signal'],
      ["const repairing = execa(options.command ?? 'pnpm', [...options.args ?? [], ...repair], {\n",
        "const repairing = execa(options.command ?? 'pnpm', [...options.args ?? [], ...repair], {\n                    killDescendants: true,\n"],
      ['await recordRun(dir, { pid: repairing.pid, grouped: false });',
        "await recordRun(dir, { pid: repairing.pid, grouped: leadsOwnGroup('service') });"],
      ['const repaired = await repairing;\n                exitCode = 1;',
        'const repaired = await repairing;\n                control.stalled ||= repaired.timedOut;\n                exitCode = 1;'],
    ] },
];
const restartChanges = [{ path: `${client}/lib/client.js`,
  hash: 'cf55c548a8ec731a1b0140e41128d03fa5e5c5bb39288d58e8107d68082d93cd', edits: [
    ['install.installed !== null ? (0, react_jsx_runtime.jsx)', 'install.installed !== null && !install.restartRequired ? (0, react_jsx_runtime.jsx)'],
    ['if (install.phase !== "done" || install.enabling) return;',
      'if (install.phase !== "done" || install.enabling || install.restartRequired) return;'],
  ] }];

/** 固定发布产物全量预检；多入口共同安装，失败仅回滚本次写入。 */
async function prepare(patch, changes) {
  const prepared = [];
  for (const change of changes) {
    const packageDir = change.path.split('/lib/')[0];
    const metadata = JSON.parse(await readFile(await existingInside(root, packageDir + '/package.json'), 'utf8'));
    if (metadata.version !== '0.2.1-alpha.1' || metadata.name !== packageDir.split('node_modules/')[1])
      throw Error('latest_package_management_version_mismatch');
    const target = await existingInside(root, change.path), current = await readFile(target);
    const backupName = change.path.slice('node_modules/@deepseek-ai/'.length).replaceAll('/', '--');
    await mkdir(resolve(root, 'patch-originals'), { recursive: true });
    const backup = resolve(root, 'patch-originals', backupName);
    let original = current;
    if (digest(original) !== change.hash) original = await readFile(await existingInside(root, 'patch-originals/' + backupName));
    if (digest(original) !== change.hash) throw Error('latest_package_management_original_mismatch');
    let text = original.toString();
    for (const [before, after] of change.edits) {
      if (text.split(before).length !== 2) throw Error('latest_package_management_anchor_mismatch: ' + change.path);
      text = text.replace(before, after);
    }
    const modified = Buffer.from(text);
    // 仅接受已核验的上一候选，不能借升级接纳任意中间修改。
    if (![change.hash, change.previousHash, digest(modified)].includes(digest(current))) throw Error('latest_package_management_unknown_edit');
    prepared.push({ ...change, target, backup, current, original, modified });
  }
  const written = [];
  try {
    for (const file of prepared) {
      // 对备份目录及文件也做范围和链接检查，拒绝借备份写到隔离目录之外。
      await existingInside(root, 'patch-originals');
      try { await existingInside(root, 'patch-originals/' + file.backup.split(/[\\/]/).at(-1)) }
      catch (error) { if (error.code !== 'ENOENT') throw error }
      await writeFile(file.backup, file.original);
      if (!(await readFile(file.target)).equals(file.current)) throw Error('latest_package_management_concurrent_change');
      if (!file.current.equals(file.modified)) { await replaceFile(file.target, file.modified); written.push(file) }
    }
    for (const file of prepared) if (!(await readFile(file.target)).equals(file.modified)) throw Error('latest_package_management_final_state');
  } catch (error) {
    const failures = [];
    for (const file of written.reverse()) try {
      if (!(await readFile(file.target)).equals(file.modified)) throw Error('latest_package_management_rollback_changed');
      await replaceFile(file.target, file.current);
    } catch (failure) { failures.push(failure) }
    if (failures.length) throw new AggregateError([error, ...failures], 'Latest package patch rollback needs attention');
    throw error;
  }
  const report = { patch, version: '0.2.1-alpha.1', sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc',
    isolatedCandidateOnly: true, files: prepared.map(file => ({ path: file.target, before: file.hash, after: digest(file.modified) })) };
  await writeFile(resolve(root, patch + '-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
export async function prepareLatestPackageProcess() {
  const { readInstalledLatestPackageRange } = await import('./package-range-runtime.mjs');
  return await readInstalledLatestPackageRange() ?? prepare('latest-plugin-install-cancel', processChanges);
}
export const prepareLatestPluginRestartNotice = () => prepare('latest-plugin-restart-notice', restartChanges);
