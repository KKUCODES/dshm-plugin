import { readFile, writeFile, mkdir, realpath, open, unlink } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';
import { baseline } from '../desktop-apps/changes.mjs';
import { directory, regular, targetRoot } from '../desktop-apps/package.mjs';
import { install as applications } from '../desktop-apps/install.mjs';
import { digest, replaceFile } from '../background-output/install-runtime.mjs';
import { patchVersion, transform } from './changes.mjs';

export const output = fileURLToPath(new URL('../../artifacts/compatibility/desktop-app-icons/package', import.meta.url));
const prepared = resolve(output, '..');
export const hashes = {
  'src/index.ts': 'bc4656e9080153def03ca1c63ebb43f9b0ed8229a1bcd47241cc7c541e52b86b',
  'lib/index.js': '8c55fcdb5bb7475545aef62188ab6c5b14ee398a90d5062e18e2e5079e8117c9',
  'lib/types/index.js': '2e0c1ac5c5f69ccac91c3bf84d319bcd6753a1b3e2dcaf274ae599e900bf7ee5',
  'lib/types/index.d.ts': '33543636f2bdd22b7fcb65b9c04561a97c184577ac5313e6322b41559dc43e07',
};

async function writeOwned(local, bytes) {
  const path = resolve(output, local);
  await mkdir(dirname(path), { recursive: true });
  if ((await realpath(dirname(path))).toLowerCase() !== dirname(path).toLowerCase()) throw Error('Linked output directory');
  try { await writeFile(path, bytes, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST' || !(await readFile(await regular(output, local))).equals(Buffer.from(bytes))) throw error; }
}

export async function preparePackage(target) {
  const root = await targetRoot(target);
  if ((await applications('plan', root)).patched !== 7) throw Error('Requires complete desktop-apps-v1');
  const previousManifest = JSON.parse(await readFile(new URL('../../artifacts/compatibility/desktop-apps/package/manifest.json', import.meta.url), 'utf8'));
  const source = await readFile(await regular(root, `${directory}/src/index.ts`), 'utf8');
  if (await readFile(resolve(prepared, 'src/index.ts'), 'utf8') !== transform(source)) throw Error('Prepared icons source stale');
  execFileSync(process.execPath, [fileURLToPath(new URL('../desktop-apps/typecheck.mjs', import.meta.url)), root, '--icons', '--emit'],
    { cwd: fileURLToPath(new URL('../../', import.meta.url)), stdio: 'pipe', windowsHide: true });
  await build({ entryPoints: [resolve(prepared, 'production/lib/types/index.js')], outfile: resolve(prepared, 'production/lib/index.js'),
    bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external' });
  const files = [], dependencies = [];
  for (const input of [...previousManifest.inputs, ...previousManifest.files]) {
    if (dependencies.some(item => item.path === input.path)) continue;
    const bytes = await readFile(await regular(root, input.path));
    dependencies.push({ path: input.path, hash: digest(bytes) });
  }
  for (const [local, beforeHash] of Object.entries(hashes)) {
    const path = `${directory}/${local}`, before = await readFile(await regular(root, path));
    if (digest(before) !== beforeHash) throw Error('Unknown desktop-apps-v1 bytes');
    const after = await readFile(resolve(prepared, local.startsWith('src/') ? local : `production/${local}`));
    await writeOwned(`before/${path}`, before); await writeOwned(`after/${path}`, after);
    files.push({ path, before: beforeHash, after: digest(after) });
  }
  await writeOwned('manifest.json', JSON.stringify({ baseline, patchVersion, files, dependencies }, null, 2));
  return { files: files.length, output };
}

/** 图标扩展只覆盖四文件；restore退回已验证的应用服务v1，不移除原补丁。 */
export async function install(action, target, write = replaceFile) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Unknown action');
  const root = await targetRoot(target);
  if ((await realpath(output)).toLowerCase() !== output.toLowerCase()) throw Error('Linked package');
  const manifest = JSON.parse(await readFile(await regular(output, 'manifest.json'), 'utf8'));
  const allowed = Object.keys(hashes).map(path => `${directory}/${path}`).sort();
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion
    || JSON.stringify(manifest.files.map(item => item.path).sort()) !== JSON.stringify(allowed)) throw Error('Unexpected icon manifest');
  const records = [];
  for (const item of manifest.files) {
    const before = await readFile(await regular(output, `before/${item.path}`));
    const after = await readFile(await regular(output, `after/${item.path}`));
    if (item.before !== hashes[item.path.slice(directory.length + 1)] || digest(before) !== item.before || digest(after) !== item.after) throw Error('Icon payload mismatch');
    const path = await regular(root, item.path), current = await readFile(path);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Unknown installed changes: ${item.path}`);
    records.push({ ...item, path, local: item.path, beforeBytes: before, afterBytes: after, current });
  }
  for (const input of manifest.dependencies) {
    if (!input.path.startsWith(`${directory}/`)) throw Error('Unexpected dependency');
    const current = digest(await readFile(await regular(root, input.path)));
    if (current !== input.hash && current !== records.find(item => item.local === input.path)?.after) throw Error('Icon dependency changed');
  }
  const result = { action, root, files: records.length, patched: records.filter(item => item.current.equals(item.afterBytes)).length };
  if (action === 'plan') return result;
  const lockPath = resolve(output, `install-${digest(root.toLowerCase())}.lock`), lock = await open(lockPath, 'wx');
  const written = [], desired = action === 'apply' ? 'afterBytes' : 'beforeBytes';
  const check = async (item, bytes) => {
    if (await regular(root, item.local) !== item.path || !(await readFile(item.path)).equals(bytes)) throw Error('Concurrent modification');
  };
  try {
    for (const item of records) await check(item, item.current);
    for (const item of records) {
      await check(item, item.current); if (item.current.equals(item[desired])) continue;
      await write(item.path, item[desired]); written.push(item);
    }
    for (const item of records) await check(item, item[desired]);
  } catch (error) {
    const failures = [];
    for (const item of written.reverse()) {
      try { await check(item, item[desired]); await write(item.path, item.current); } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Icon rollback needs attention');
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
  return { ...result, written: written.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, stopped] = process.argv.slice(2);
  if (!target || (['apply', 'restore'].includes(action) && stopped !== '--stopped')) throw Error('Use prepare/plan <root>, apply/restore <root> --stopped');
  console.log(JSON.stringify(action === 'prepare' ? await preparePackage(target) : await install(action, target)));
}
