import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, realpath, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, existingInside, replaceFile } from '../install-files.mjs';
import { latestInputs, originalCommand, patchedCommand } from '../source-start/contract.mjs';
import { sourceChanges, sourceCommit } from './source-changes.mjs';
import { applySourceChange, normalizeSource } from './source-transform.mjs';

const startupHashes = typeof DSHM_SOURCE_DELIVERY_STARTUP_HASHES === 'undefined'
  ? undefined : DSHM_SOURCE_DELIVERY_STARTUP_HASHES;
const bundle = dirname(fileURLToPath(import.meta.url));
const same = (a, b) => a === undefined ? b === undefined : b !== undefined && a.equals(b);
const inside = (root, path) => { const rel = relative(root, path); return rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel); };

async function optionalStartup(root, local) {
  const path = resolve(root, local), parent = dirname(path);
  try {
    if (!(await lstat(parent)).isDirectory() || (await lstat(parent)).isSymbolicLink()
      || (await realpath(parent)).toLowerCase() !== parent.toLowerCase()) throw Error('latest_delivery_linked_startup_directory');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { return { path, bytes: await readFile(await existingInside(root, local)) }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; return { path, bytes: undefined }; }
}

/** 一个事务覆盖全部源码和启动入口；任何未知字节都在首次写入前拒绝。 */
export async function installSourceDelivery(action, targetDirectory) {
  if (!startupHashes) throw Error('latest_delivery_not_built');
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('latest_delivery_node_version');
  const targetRoot = await realpath(resolve(targetDirectory));
  if (inside(bundle, targetRoot) || inside(targetRoot, bundle)) throw Error('latest_delivery_overlapping_target');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetRoot, windowsHide: true, encoding: 'utf8' }).trim();
  if (commit !== sourceCommit) throw Error('latest_delivery_commit_mismatch');
  const manifest = JSON.parse(await readFile(await existingInside(bundle, 'manifest.json'), 'utf8'));
  if (manifest.version !== '0.2.1-alpha.1' || manifest.sourceCommit !== sourceCommit
    || manifest.files.length !== sourceChanges.length) throw Error('latest_delivery_manifest_mismatch');
  const packagePath = await existingInside(targetRoot, 'package.json');
  const packageBytes = await readFile(packagePath), packageText = packageBytes.toString('utf8'), pkg = JSON.parse(packageText);
  if (!Buffer.from(packageText).equals(packageBytes) || pkg.name !== '@deepseek-ai/dsh-root' || pkg.version !== manifest.version)
    throw Error('latest_delivery_root_version_mismatch');
  const command = pkg.scripts?.dsh;
  if (![originalCommand, patchedCommand].includes(command) || packageText.split(JSON.stringify(command)).length !== 2)
    throw Error('latest_delivery_unknown_startup_command');
  for (const [path, hash] of latestInputs)
    if (digest(normalizeSource(await readFile(await existingInside(targetRoot, path), 'utf8'))) !== hash)
      throw Error(`latest_delivery_startup_baseline_mismatch: ${path}`);
  const entries = [];
  let original = 0, patched = 0;
  for (const [index, change] of sourceChanges.entries()) {
    const file = manifest.files[index];
    if (file.path !== change.path || file.package !== change.package || file.packageName !== change.name
      || file.patch !== change.patch || file.sourceHash !== change.hash) throw Error('latest_delivery_manifest_path_mismatch');
    const target = await existingInside(targetRoot, file.path);
    const packageManifest = JSON.parse(await readFile(await existingInside(targetRoot, `${file.package}/package.json`), 'utf8'));
    if (packageManifest.name !== change.name || packageManifest.version !== manifest.version) throw Error('latest_delivery_package_mismatch');
    const beforePayload = await readFile(await existingInside(bundle, `payload/original/${file.path}`));
    const afterPayload = await readFile(await existingInside(bundle, `payload/patched/${file.path}`));
    if (digest(beforePayload) !== file.before || digest(afterPayload) !== file.after
      || !Buffer.from(applySourceChange(change, beforePayload.toString('utf8'))).equals(afterPayload))
      throw Error('latest_delivery_payload_mismatch');
    const current = await readFile(target);
    const endings = text => current.includes(Buffer.from('\r\n')) ? normalizeSource(text).replaceAll('\n', '\r\n') : normalizeSource(text);
    const before = Buffer.from(endings(beforePayload.toString('utf8'))), after = Buffer.from(endings(afterPayload.toString('utf8')));
    if (!same(current, before) && !same(current, after)) throw Error(`latest_delivery_target_changed: ${file.path}`);
    if (same(current, before)) original++; else patched++;
    entries.push({ local: file.path, target, current, desired: action === 'restore' ? before : after });
  }
  const startup = [];
  for (const name of ['register.mjs', 'bootstrap.mjs']) {
    const bytes = await readFile(await existingInside(bundle, `payload/startup/${name}`));
    if (digest(bytes) !== startupHashes[name]) throw Error('latest_delivery_startup_payload_mismatch');
    const local = `.dshm-source/${name}`, current = await optionalStartup(targetRoot, local);
    if (current.bytes !== undefined && !same(current.bytes, bytes)) throw Error(`latest_delivery_startup_changed: ${local}`);
    startup.push({ local, target: current.path, current: current.bytes, desired: action === 'restore' ? undefined : bytes });
  }
  const payloads = startup.filter(e => e.current !== undefined).length;
  const state = original === entries.length && command === originalCommand && payloads === 0 ? 'original'
    : patched === entries.length && command === patchedCommand && payloads === 2 ? 'patched' : 'partial';
  const desiredCommand = action === 'restore' ? originalCommand : patchedCommand;
  const script = { local: 'package.json', target: packagePath, current: packageBytes,
    desired: Buffer.from(packageText.replace(JSON.stringify(command), JSON.stringify(desiredCommand))) };
  // 恢复时先停用启动入口；安装时先落全部载荷，再切换启动入口。
  if (action === 'restore') entries.unshift(script); else entries.push(...startup, script);
  if (action === 'restore') entries.push(...startup);
  const report = { action, targetRoot, version: manifest.version, sourceCommit, state,
    sourceFiles: sourceChanges.length, startupPayloads: payloads, original, patched, written: 0 };
  if (action === 'plan') return report;
  const check = async (entry, expected) => {
    const actual = entry.local.startsWith('.dshm-source/')
      ? (await optionalStartup(targetRoot, entry.local)).bytes
      : await readFile(await existingInside(targetRoot, entry.local));
    if (!same(actual, expected)) throw Error(`latest_delivery_concurrent_change: ${entry.local}`);
  };
  const write = async (entry, bytes) => {
    if (bytes === undefined) await unlink(entry.target);
    else {
      if (entry.local.startsWith('.dshm-source/')) {
        await mkdir(dirname(entry.target), { recursive: true });
        await optionalStartup(targetRoot, entry.local);
      }
      await replaceFile(entry.target, bytes);
    }
  };
  const written = [];
  try {
    // 即使最后一个文件在预检之后变化，也不能先改前面的源码。
    for (const entry of entries) await check(entry, entry.current);
    for (const entry of entries) {
      await check(entry, entry.current);
      if (same(entry.current, entry.desired)) continue;
      await write(entry, entry.desired); written.push(entry);
    }
    for (const entry of entries) await check(entry, entry.desired);
  } catch (error) {
    const failures = [];
    for (const entry of [...written].reverse()) {
      try { await check(entry, entry.desired); await write(entry, entry.current); }
      catch (rollback) { failures.push(rollback); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Latest delivery rollback needs attention');
    throw error;
  }
  return { ...report, state: action === 'restore' ? 'original' : 'patched', written: written.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target, ...extra] = process.argv.slice(2);
  if (!target || extra.length) throw Error('Usage: node install.mjs <plan|apply|restore> <stopped DSH source checkout>');
  console.log(JSON.stringify(await installSourceDelivery(action, target)));
}
