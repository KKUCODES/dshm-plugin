import assert from 'node:assert/strict';
import test from 'node:test';
import { access, mkdir, mkdtemp, readFile, rename, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { installLatestPackageRange, packageRangePayload, packageRangeRuntime } from '../compatibility/latest-upstream/package-range-runtime.mjs';

async function fixture() {
  const manifest = JSON.parse(await readFile(resolve(packageRangePayload, 'manifest.json')));
  const root = await mkdtemp(resolve(packageRangePayload, 'install-test-'));
  for (const file of manifest.files) {
    const target = resolve(root, 'node_modules/@deepseek-ai/dsh-plugin-manager', file.local);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(resolve(packageRangePayload, 'original', file.local)));
  }
  const native = resolve(root, 'node_modules/@deepseek-ai/dsh-win32-process/package.json');
  await mkdir(dirname(native), { recursive: true });
  await writeFile(native, await readFile(resolve(packageRangeRuntime, 'node_modules/@deepseek-ai/dsh-win32-process/package.json')));
  const target = local => resolve(root, 'node_modules/@deepseek-ai/dsh-plugin-manager', local);
  const bytes = () => Promise.all(manifest.files.map(file => readFile(target(file.local))));
  return { root, manifest, native, target, bytes };
}

test('all five published entries apply together, stay idempotent and restore exact bytes', async () => {
  const f = await fixture(), before = await f.bytes();
  assert.equal((await installLatestPackageRange('plan', f.root)).original, 5);
  assert.equal((await installLatestPackageRange('apply', f.root)).written, 5);
  assert.equal((await installLatestPackageRange('apply', f.root)).written, 0);
  const metadata = JSON.parse(await readFile(f.target('package.json')));
  assert.equal(metadata.dependencies['@deepseek-ai/dsh-win32-process'], '0.2.1-alpha.1');
  assert.equal(metadata.exports['./runner'].types, './lib/types/run-tree.d.ts');
  for (const file of f.manifest.files)
    assert.deepEqual(await readFile(f.target(file.local)), await readFile(resolve(packageRangePayload, 'patched', file.local)));
  assert.equal((await installLatestPackageRange('restore', f.root)).written, 5);
  assert.equal((await installLatestPackageRange('restore', f.root)).written, 0);
  assert.deepEqual(await f.bytes(), before);
});

test('unknown last file refuses the entire apply before earlier writes', async () => {
  const f = await fixture();
  await writeFile(f.target('package.json'), Buffer.concat([await readFile(f.target('package.json')), Buffer.from('\n')]));
  const before = await f.bytes();
  await assert.rejects(installLatestPackageRange('apply', f.root), /unknown_edit/);
  assert.deepEqual(await f.bytes(), before);
});

test('unknown modified runner refuses restore without discarding edits', async () => {
  const f = await fixture(); await installLatestPackageRange('apply', f.root);
  await writeFile(f.target('lib/types/run-tree.js'), Buffer.concat([await readFile(f.target('lib/types/run-tree.js')), Buffer.from('\n// custom\n')]));
  const before = await f.bytes();
  await assert.rejects(installLatestPackageRange('restore', f.root), /unknown_edit/);
  assert.deepEqual(await f.bytes(), before);
});

test('adjacent native version refuses before any package write', async () => {
  const f = await fixture(), before = await f.bytes();
  const bytes = await readFile(f.native, 'utf8');
  await writeFile(f.native, bytes.replace('"version": "0.2.1-alpha.1"', '"version": "0.2.1-alpha.2"'));
  await assert.rejects(installLatestPackageRange('apply', f.root), /0.2.1-alpha/);
  assert.deepEqual(await f.bytes(), before);
});

test('linked types directory cannot modify another installation', async () => {
  const f = await fixture(), outside = await fixture();
  const target = dirname(f.target('lib/types/run-tree.js')), parked = target + '.original';
  const before = await outside.bytes();
  await rename(target, parked); await symlink(dirname(outside.target('lib/types/run-tree.js')), target, 'junction');
  try {
    await assert.rejects(installLatestPackageRange('apply', f.root), /Linked target/);
    assert.deepEqual(await outside.bytes(), before);
  } finally { await unlink(target); await rename(parked, target); }
  await access(f.target('lib/types/run-tree.js'));
});
