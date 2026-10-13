import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { prepareLatestPackageProcess, prepareLatestPluginRestartNotice } from './package-management.mjs';

const root = resolve(import.meta.dirname, '../../artifacts/latest-runtime-check');
const manager = resolve(root, 'node_modules/@deepseek-ai/dsh-plugin-manager');
const client = resolve(root, 'node_modules/@deepseek-ai/dsh-client-ui-plugin-manager');
test('fixed published package patches are idempotent across both operation entries and the client', async () => {
  for (const prepare of [prepareLatestPackageProcess, prepareLatestPluginRestartNotice]) {
    const report = await prepare();
    const files = await Promise.all(report.files.map(file => readFile(file.path)));
    assert.deepEqual(await prepare(), report);
    for (const [i, file] of report.files.entries()) assert.deepEqual(await readFile(file.path), files[i]);
  }
});
test('unknown last operation entry blocks writes to the first entry', async () => {
  const firstPath = resolve(manager, 'lib/index.js'), lastPath = resolve(manager, 'lib/types/operations.js');
  const first = await readFile(firstPath), last = await readFile(lastPath);
  const edited = Buffer.concat([last, Buffer.from('\n// isolated unknown edit\n')]);
  try {
    await writeFile(lastPath, edited);
    await assert.rejects(prepareLatestPackageProcess(), /unknown_edit/);
    assert.deepEqual(await readFile(firstPath), first);
    assert.deepEqual(await readFile(lastPath), edited);
  } finally { await writeFile(lastPath, last) }
});
test('adjacent client package version cannot receive a known compiled patch', async () => {
  const pkgPath = resolve(client, 'package.json'), target = resolve(client, 'lib/client.js');
  const metadata = await readFile(pkgPath), original = await readFile(target);
  try {
    const next = JSON.parse(metadata); next.version = '0.2.1-alpha.2';
    await writeFile(pkgPath, JSON.stringify(next));
    await assert.rejects(prepareLatestPluginRestartNotice(), /version_mismatch/);
    assert.deepEqual(await readFile(target), original);
  } finally { await writeFile(pkgPath, metadata) }
});
