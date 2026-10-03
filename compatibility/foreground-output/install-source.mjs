import { readFile, writeFile, realpath, lstat, mkdir, symlink, unlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changes, patchVersion, applyForegroundChange } from './changes.mjs';
import { changes as backgroundChanges } from '../background-output/changes.mjs';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { existingInside, replaceFile } from '../background-output/install-runtime.mjs';

const receiptPath = '.dshm-foreground/source-links.json';
const dependency = 'packages/core/scope';
export const linkPaths = ['tool-bash', 'tool-pwsh'].map(name => `packages/shell/${name}/node_modules/@deepseek-ai/dsh-scope`);
const same = (a, b) => a === undefined ? b === undefined : b !== undefined && a.equals(b);

/** New files and junctions require real in-root parents, including pnpm's package-local namespace. */
async function writablePath(root, local) {
  const target = resolve(root, local);
  const rel = relative(root, target);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error('Path escaped installation');
  for (let parent = dirname(target); parent !== root; parent = dirname(parent)) {
    try {
      const stat = await lstat(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(parent)).toLowerCase() !== parent.toLowerCase()) throw Error('Linked parent is not supported');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}

async function receipt(root) {
  const path = await writablePath(root, receiptPath);
  try {
    if ((await lstat(path)).isSymbolicLink()) throw Error('Linked receipt is not supported');
    const bytes = await readFile(path), value = JSON.parse(bytes.toString());
    if (value.patchVersion !== patchVersion || !Array.isArray(value.createdLinks)
      || new Set(value.createdLinks).size !== value.createdLinks.length
      || value.createdLinks.some(path => !linkPaths.includes(path))
      || Object.keys(value).sort().join(',') !== 'createdLinks,patchVersion') throw Error('Unknown install receipt');
    return { path, bytes, value };
  } catch (error) { if (error.code !== 'ENOENT') throw error; return { path }; }
}

async function linkExists(root, local) {
  const path = await writablePath(root, local);
  try {
    const stat = await lstat(path);
    if (!stat.isSymbolicLink() || (await realpath(path)).toLowerCase() !== resolve(root, dependency).toLowerCase()) throw Error(`Unknown dependency link: ${local}`);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // A dangling link also gives ENOENT from realpath, but is not safe to replace.
    try { await lstat(path); } catch (missing) { if (missing.code === 'ENOENT') return false; throw missing; }
    throw Error(`Dangling dependency link: ${local}`);
  }
}

/** Incremental on background-output-v1; restore returns to that version, never clean upstream. */
export async function installSource(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const root = await realpath(resolve(targetDirectory));
  if (root.toLowerCase() === (await realpath(sourceRoot)).toLowerCase()) throw Error('Reference checkout is read-only');
  const records = [], paths = new Set(changes.map(change => change.path));
  for (const change of backgroundChanges.filter(change => !paths.has(change.path))) {
    const expected = applyChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'));
    if (normalize(await readFile(await existingInside(root, change.path), 'utf8')) !== expected) throw Error(`Background prerequisite mismatch: ${change.path}`);
  }
  for (const change of changes) {
    const directory = change.path.replace(/\/(src\/.*|package\.json)$/, '');
    const expectedPackage = JSON.parse(await readFile(resolve(sourceRoot, directory, 'package.json'), 'utf8'));
    const actualPackage = JSON.parse(await readFile(await existingInside(root, `${directory}/package.json`), 'utf8'));
    if (actualPackage.name !== expectedPackage.name || actualPackage.version !== expectedPackage.version) throw Error(`Package mismatch: ${directory}`);
    const { original, modified } = applyForegroundChange(change, await readFile(resolve(sourceRoot, change.path), 'utf8'));
    const target = await existingInside(root, change.path), current = await readFile(target), text = current.toString('utf8');
    if (!Buffer.from(text).equals(current) || /\r(?!\n)/.test(text) || (text.includes('\r\n') && /(?<!\r)\n/.test(text))) throw Error(`Unsupported source encoding or line endings: ${change.path}`);
    const normalized = normalize(text);
    if (normalized !== original && normalized !== modified) throw Error(`Source mismatch: ${change.path}`);
    const encode = value => Buffer.from(text.includes('\r\n') ? value.replaceAll('\n', '\r\n') : value);
    records.push({ path: change.path, target, current, desired: encode(action === 'restore' ? original : modified), patched: normalized === modified });
  }
  // Never link another installed version, registry package, or a copy outside this checkout.
  for (const file of ['package.json', 'src/index.ts', 'src/store.ts']) {
    const local = `${dependency}/${file}`;
    if (normalize(await readFile(await existingInside(root, local), 'utf8')) !== normalize(await readFile(resolve(sourceRoot, local), 'utf8'))) throw Error(`Scope baseline mismatch: ${file}`);
  }
  await existingInside(root, `${dependency}/lib/index.js`);
  const prior = await receipt(root), links = [];
  for (const path of linkPaths) links.push({ path, present: await linkExists(root, path) });
  if (prior.value?.createdLinks.some(path => !links.find(link => link.path === path)?.present)) throw Error('Owned dependency link is missing');
  const summary = { action, targetRoot: root, patchVersion, files: records.length,
    patched: records.filter(record => record.patched).length, missingLinks: links.filter(link => !link.present).length };
  if (action === 'plan') return summary;
  const owned = prior.value?.createdLinks ?? [];
  const nextOwned = [...owned, ...links.filter(link => !link.present).map(link => link.path)];
  const nextReceipt = action === 'restore' ? undefined : Buffer.from(JSON.stringify({ patchVersion, createdLinks: nextOwned }, null, 2) + '\n');
  const undo = [];
  const setLink = async (local, present) => {
    const target = await writablePath(root, local);
    if (present) {
      await mkdir(dirname(target), { recursive: true }); await writablePath(root, local);
      await symlink(resolve(root, dependency), target, process.platform === 'win32' ? 'junction' : 'dir');
    } else await unlink(target); // unlink only the exact verified junction, never its target tree.
  };
  const checkFile = async (record, expected) => {
    await existingInside(root, record.path);
    if (!(await readFile(record.target)).equals(expected)) throw Error(`Concurrent modification: ${record.path}`);
  };
  const changeLinks = async () => {
    for (const link of links) {
      if (await linkExists(root, link.path) !== link.present) throw Error('Dependency changed during install');
      const wanted = action === 'apply' || (link.present && !owned.includes(link.path));
      if (wanted === link.present) continue;
      await setLink(link.path, wanted);
      undo.push(async () => {
        if (await linkExists(root, link.path) !== wanted) throw Error('Dependency changed before rollback');
        await setLink(link.path, link.present);
      });
    }
  };
  let written = 0;
  try {
    if (action === 'apply') await changeLinks();
    for (const record of records) {
      await checkFile(record, record.current);
      if (record.current.equals(record.desired)) continue;
      await replaceFile(record.target, record.desired); written++;
      undo.push(async () => { await checkFile(record, record.desired); await replaceFile(record.target, record.current); });
    }
    for (const record of records) await checkFile(record, record.desired);
    if (action === 'restore') await changeLinks();
    else for (const tool of ['tool-bash', 'tool-pwsh']) {
      const selected = createRequire(resolve(root, `packages/shell/${tool}/package.json`)).resolve('@deepseek-ai/dsh-scope');
      if ((await realpath(selected)).toLowerCase() !== resolve(root, dependency, 'lib/index.js').toLowerCase()) throw Error('Dependency resolved to another scope instance');
    }
    if (!same((await receipt(root)).bytes, prior.bytes)) throw Error('Receipt changed during install');
    if (!same(prior.bytes, nextReceipt)) {
      if (nextReceipt) { await mkdir(dirname(prior.path), { recursive: true }); await writablePath(root, receiptPath); await replaceFile(prior.path, nextReceipt); }
      else await unlink(prior.path);
    }
  } catch (error) {
    const failures = [];
    for (const revert of undo.reverse()) { try { await revert(); } catch (failure) { failures.push(failure); } }
    if (failures.length) throw new AggregateError([error, ...failures], 'Foreground source install failed; rollback needs attention');
    throw error;
  }
  return { ...summary, written, state: action === 'apply' ? 'patched' : 'background-only' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target] = process.argv.slice(2);
  if (!target) throw Error('Specify a source installation; stop DSH before apply/restore');
  console.log(JSON.stringify(await installSource(action, target)));
}
