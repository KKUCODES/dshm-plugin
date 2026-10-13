import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rename, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { applySourceChange, installSourceRuntime, outputRoot, sourceRoot } from './source-runtime.mjs';
import { sourceChanges } from './source-changes.mjs';

async function fixture() {
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  const root = await mkdtemp(resolve(outputRoot, 'install-test-'));
  await writeFile(resolve(root, 'package.json'), await readFile(resolve(sourceRoot, 'package.json')));
  for (const file of manifest.files) {
    await mkdir(dirname(resolve(root, file.path)), { recursive: true });
    await writeFile(resolve(root, file.path), await readFile(resolve(outputRoot, 'original', file.path)));
    if (!manifest.files.some(item => resolve(item.path) === resolve(file.package, 'package.json')))
      await writeFile(resolve(root, file.package, 'package.json'), await readFile(resolve(sourceRoot, file.package, 'package.json')));
  }
  const bytes = () => Promise.all(manifest.files.map(file => readFile(resolve(root, file.path))));
  return { root, manifest, bytes };
}

test('fixed source install/restore is idempotent and restores every exact byte', async () => {
  const f = await fixture(), before = await f.bytes();
  assert.equal((await installSourceRuntime('plan', f.root)).files, sourceChanges.length);
  assert.equal((await installSourceRuntime('apply', f.root)).written, sourceChanges.length);
  assert.equal((await installSourceRuntime('apply', f.root)).written, 0);
  assert.equal((await installSourceRuntime('restore', f.root)).written, sourceChanges.length);
  assert.equal((await installSourceRuntime('restore', f.root)).written, 0);
  assert.deepEqual(await f.bytes(), before);
});

test('all source inputs and edits require the fixed baseline', async () => {
  for (const change of sourceChanges) {
    const text = await readFile(resolve(outputRoot, 'original', change.path), 'utf8');
    assert.throws(() => applySourceChange(change, text + '\n// unknown\n'), /baseline_mismatch/);
    assert.equal(applySourceChange(change, text), await readFile(resolve(outputRoot, 'patched', change.path), 'utf8'));
    assert.equal(applySourceChange(change, text.replaceAll('\n', '\r\n')), applySourceChange(change, text).replaceAll('\n', '\r\n'));
  }
});

test('unknown last file blocks the whole apply before any earlier write', async () => {
  const f = await fixture(), file = resolve(f.root, f.manifest.files.at(-1).path);
  await writeFile(file, Buffer.concat([await readFile(file), Buffer.from('\n// user change\n')]));
  const before = await f.bytes();
  await assert.rejects(installSourceRuntime('apply', f.root), /target_changed/);
  assert.deepEqual(await f.bytes(), before);
});

test('unknown patched file blocks restore and preserves all user changes', async () => {
  const f = await fixture(); await installSourceRuntime('apply', f.root);
  const file = resolve(f.root, f.manifest.files.at(-1).path);
  await writeFile(file, Buffer.concat([await readFile(file), Buffer.from('\n// user change\n')]));
  const before = await f.bytes();
  await assert.rejects(installSourceRuntime('restore', f.root), /target_changed/);
  assert.deepEqual(await f.bytes(), before);
});

test('adjacent root or package versions are rejected before writes', async () => {
  const f = await fixture(), before = await f.bytes(), rootManifest = resolve(f.root, 'package.json');
  const original = await readFile(rootManifest, 'utf8');
  await writeFile(rootManifest, original.replace('0.2.1-alpha.1', '0.2.1-alpha.2'));
  await assert.rejects(installSourceRuntime('apply', f.root), /root_version_mismatch/);
  await writeFile(rootManifest, original);
  const local = resolve(f.root, f.manifest.files.at(-1).package, 'package.json');
  await writeFile(local, (await readFile(local, 'utf8')).replace('0.2.1-alpha.1', '0.2.1-alpha.2'));
  await assert.rejects(installSourceRuntime('apply', f.root), /package_mismatch/);
  assert.deepEqual(await f.bytes(), before);
});

test('a linked source directory cannot write to another installation', async () => {
  const f = await fixture(), outside = await fixture();
  const local = dirname(f.manifest.files[0].path), target = resolve(f.root, local), parked = `${target}.original`;
  const before = await outside.bytes();
  await rename(target, parked);
  await symlink(resolve(outside.root, local), target, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    await assert.rejects(installSourceRuntime('apply', f.root), /Linked target/);
    assert.deepEqual(await outside.bytes(), before);
  } finally { await unlink(target); await rename(parked, target); }
});
