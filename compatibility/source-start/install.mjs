import { mkdir, readFile, realpath, lstat, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, existingInside, replaceFile } from '../background-output/install-runtime.mjs';
import { sourceRoot, normalize } from '../background-output/prepare.mjs';

export const inputs = [
  ['tsconfig.json', '9eb420010dfd10daaa1a5374ce018fd691b1ba56a4bea60f2ebd8d548ffdffa4'],
  ['tsconfig.base.json', 'dab17021b5fa628c060f12d2423689f2d82238a6dbf1e6a28e9fe0eb987d352e'],
  ['apps/cli/src/bin.ts', '4dbb5ecab6e320125847e872534b3fa3550255c29601e590b43d73df694a3808'],
  ['apps/cli/src/profile-boot.ts', '45d376dca5504bfda07e76d84bd5b327cb09ffad13436bfc7194621d7e2cfcee'],
  ['packages/boot/app-boot/src/profile-resolution/resolver.ts', 'dd25f919f037bef9bdad9adaf49b7816e72f4b85b7bbe975c4e0c8ab7746b2d4'],
  ['packages/boot/app-boot/src/profile-resolution/service.ts', '567a675b99e05cabb4933bcfb613b7980db9bbf38c8d210e1d2b563b471312c4'],
];
export const originalCommand = 'node --import tsx/esm apps/cli/src/bin.ts';
export const patchedCommand = 'node --import tsx/esm --import ./.dshm-source/bootstrap.mjs apps/cli/src/bin.ts';
export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/source-start/', import.meta.url));

async function optionalFile(root, local) {
  const target = resolve(root, local);
  // New payloads still require every existing ancestor to be an ordinary in-root directory.
  for (let parent = dirname(target); parent !== root; parent = dirname(parent)) {
    const rel = relative(root, parent);
    if (isAbsolute(rel) || rel.startsWith('..')) throw Error('Payload escaped installation');
    try {
      const stat = await lstat(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink() || (await realpath(parent)).toLowerCase() !== parent.toLowerCase()) throw Error('Linked payload directory is not supported');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  try {
    if ((await lstat(target)).isSymbolicLink()) throw Error('Linked payload file is not supported');
    return { target: await existingInside(root, local), bytes: await readFile(target) };
  }
  catch (error) { if (error.code !== 'ENOENT') throw error; return { target, bytes: undefined }; }
}

/** Install only the dsh script value and two owned preloads; unknown changes are never overwritten. */
export async function installStartup(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const root = await realpath(resolve(targetDirectory));
  if (root.toLowerCase() === (await realpath(sourceRoot)).toLowerCase()) throw Error('Reference checkout is read-only');
  for (const [path, sha256] of inputs) {
    const text = normalize(await readFile(await existingInside(root, path), 'utf8'));
    if (digest(text) !== sha256) throw Error(`Source startup baseline mismatch: ${path}`);
  }
  const packagePath = await existingInside(root, 'package.json');
  const current = await readFile(packagePath), text = current.toString('utf8'), manifest = JSON.parse(text);
  if (!Buffer.from(text).equals(current)) throw Error('Unsupported package.json encoding');
  if (manifest.name !== '@deepseek-ai/dsh-root' || manifest.version !== '0.1.6-alpha.2') throw Error('Root package version mismatch');
  const command = manifest.scripts?.dsh;
  if (![originalCommand, patchedCommand].includes(command)) throw Error('Unknown dsh script; no changes made');
  if (text.split(JSON.stringify(command)).length !== 2) throw Error('Ambiguous dsh script text');
  const entries = [];
  for (const name of ['register.mjs', 'bootstrap.mjs']) {
    const local = `.dshm-source/${name}`;
    const payload = await readFile(new URL(name, import.meta.url));
    const { target, bytes } = await optionalFile(root, local);
    if (bytes && !bytes.equals(payload)) throw Error(`Unknown startup payload: ${local}`);
    entries.push({ path: local, target, current: bytes, desired: action === 'restore' ? undefined : payload });
  }
  const scriptPatched = command === patchedCommand;
  const present = entries.filter(entry => entry.current !== undefined).length;
  // An interrupted apply can safely be repaired, but a patched script without its payload cannot be called healthy.
  const state = scriptPatched && present === 2 ? 'patched' : !scriptPatched && present === 0 ? 'original' : 'partial';
  const summary = { action, targetRoot: root, patchVersion: 'source-start-v1', state, payloads: present };
  if (action === 'plan') return summary;
  const desiredCommand = action === 'apply' ? patchedCommand : originalCommand;
  const nextText = text.replace(JSON.stringify(command), JSON.stringify(desiredCommand));
  const packageEntry = { path: 'package.json', target: packagePath, current, desired: Buffer.from(nextText) };
  // Activate only after both files exist; restore the old command before removing either file.
  if (action === 'apply') entries.push(packageEntry); else entries.unshift(packageEntry);
  const same = (a, b) => a === undefined ? b === undefined : b !== undefined && a.equals(b);
  const written = [];
  const check = async (entry, expected) => {
    const actual = await optionalFile(root, entry.path);
    if (!same(actual.bytes, expected)) throw Error(`Concurrent modification: ${entry.path}`);
  };
  const write = async (entry, value) => {
    if (value === undefined) await unlink(entry.target);
    else { await mkdir(dirname(entry.target), { recursive: true }); await optionalFile(root, entry.path); await replaceFile(entry.target, value); }
  };
  try {
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
    if (failures.length) throw new AggregateError([error, ...failures], 'Startup install failed; rollback needs attention');
    throw error;
  }
  const result = { ...summary, state: action === 'apply' ? 'patched' : 'original', written: written.length };
  await mkdir(outputRoot, { recursive: true });
  await writeFile(resolve(outputRoot, 'install-receipt.json'), JSON.stringify({ ...result, at: new Date().toISOString() }, null, 2));
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target] = process.argv.slice(2);
  if (!target) throw Error('Specify a source installation; stop DSH before apply/restore');
  console.log(JSON.stringify(await installStartup(action, target)));
}
