import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot, sources } from './build-test-runtime.mjs';
import { runtimePaths, extraBaselines } from './build-runtime.mjs';
import { patchVersion, prerequisite } from './changes.mjs';
import { baseline } from '../background-output/changes.mjs';
import { sourceRoot, outputRoot as backgroundRoot, normalize } from '../background-output/prepare.mjs';
import { existingInside, digest, replaceFile } from '../background-output/install-runtime.mjs';
import { installSource } from './install-source.mjs';

/** Restore runtime before restoring source: no loader may run during either step. */
export async function installRuntime(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const root = await realpath(resolve(targetDirectory));
  const source = await installSource('plan', root);
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8'));
  const background = JSON.parse(await readFile(resolve(backgroundRoot, 'runtime-manifest.json'), 'utf8'));
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion || manifest.prerequisite !== prerequisite
    || background.baseline !== baseline || background.patchVersion !== prerequisite
    || manifest.files.length !== runtimePaths.size || new Set(manifest.files.map(file => file.path)).size !== runtimePaths.size
    || manifest.files.some(file => !runtimePaths.has(file.path))) throw Error('Unexpected runtime manifest');
  const { overrides } = await sources();
  for (const input of manifest.sourceInputs) {
    const reference = await existingInside(sourceRoot, input.path);
    const original = normalize(await readFile(reference, 'utf8'));
    const combined = overrides.get(reference.toLowerCase()) ?? original;
    if (digest(original) !== input.original || digest(combined) !== input.combined) throw Error('Source manifest mismatch');
    if (original === combined && normalize(await readFile(await existingInside(root, input.path), 'utf8')) !== original) throw Error(`Source input mismatch: ${input.path}`);
  }
  for (const file of background.files.filter(file => !runtimePaths.has(file.path))) {
    if (digest(await readFile(await existingInside(root, file.path))) !== file.after) throw Error(`Background runtime prerequisite mismatch: ${file.path}`);
  }
  const beforeHashes = new Map(background.files.map(file => [file.path, file.after]));
  for (const [path, hash] of Object.entries(extraBaselines)) beforeHashes.set(path, hash);
  const records = [];
  for (const file of manifest.files) {
    if (file.before !== beforeHashes.get(file.path)) throw Error('Runtime baseline manifest mismatch');
    const target = await existingInside(root, file.path), current = await readFile(target);
    const before = await readFile(resolve(outputRoot, 'runtime-original', file.path));
    const after = await readFile(resolve(outputRoot, 'runtime', file.path));
    if (digest(before) !== file.before || digest(after) !== file.after) throw Error(`Payload hash mismatch: ${file.path}`);
    if (!current.equals(before) && !current.equals(after)) throw Error(`Installed runtime changed: ${file.path}`);
    records.push({ path: file.path, target, current, before, after });
  }
  const summary = { action, targetRoot: root, patchVersion, files: records.length,
    patched: records.filter(record => record.current.equals(record.after)).length };
  if (action === 'plan') return summary;
  if (action === 'apply' && (source.patched !== source.files || source.missingLinks !== 0)) throw Error('Apply foreground source and dependencies before runtime');
  const check = async (record, bytes) => {
    await existingInside(root, record.path);
    if (!(await readFile(record.target)).equals(bytes)) throw Error(`Concurrent runtime modification: ${record.path}`);
  };
  const desired = action === 'apply' ? 'after' : 'before', written = [];
  try {
    for (const record of records) {
      await check(record, record.current);
      if (record.current.equals(record[desired])) continue;
      await replaceFile(record.target, record[desired]); written.push(record);
    }
    for (const record of records) await check(record, record[desired]);
  } catch (error) {
    const failures = [];
    for (const record of written.reverse()) {
      try { await check(record, record[desired]); await replaceFile(record.target, record.current); }
      catch (rollback) { failures.push(rollback); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Runtime install failed; rollback needs attention');
    throw error;
  }
  return { ...summary, written: written.length, state: action === 'apply' ? 'patched' : 'background-only' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target] = process.argv.slice(2);
  if (!target) throw Error('Specify a source installation; stop DSH before apply/restore');
  console.log(JSON.stringify(await installRuntime(action, target)));
}
