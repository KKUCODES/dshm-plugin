// 小型源码载荷独立封存；不能覆盖旧实验清单或已归档失败。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
const scope = process.argv[2]; assert.equal(process.argv.length, 3);
assert.ok(['electron-encoding-2', 'electron-encoding-3'].includes(scope));
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const lease = JSON.parse(await readFile(resolve(runtime, `latest-live-source-lease-${scope}-final.json`)));
assert.equal(lease.state, 'restored'); assert.equal(lease.scope, scope);
assert.equal(lease.restoredOriginalBytes, true); assert.equal(lease.restoredOriginalClientArtifacts, true);
const bytes = await readFile(resolve(outputRoot, 'manifest.json')), manifest = JSON.parse(bytes);
assert.equal(manifest.files.length, 37); assert.equal(manifest.sourceCommit, lease.sourceCommit);
const hash = value => createHash('sha256').update(value).digest('hex');
assert.deepEqual(manifest.files.map(row => ({ path: row.path, sha256: row.before })), lease.originals);
const prepared = [];
for (const row of manifest.files) {
  for (const [kind, expected] of [['original', row.before], ['patched', row.after]]) {
    const file = await readFile(resolve(outputRoot, kind, row.path)); assert.equal(hash(file), expected);
    prepared.push({ kind, path: row.path, file });
  }
  assert.equal(hash(await readFile(resolve(sourceRoot, row.path))), row.before);
}
const target = resolve(import.meta.dirname, `../artifacts/latest-source-patches-${scope}`);
await assert.rejects(access(target), { code: 'ENOENT' }); await mkdir(target);
for (const row of prepared) {
  const file = resolve(target, row.kind, row.path); assert.ok(file.startsWith(target + '\\'));
  await mkdir(dirname(file), { recursive: true }); await writeFile(file, row.file, { flag: 'wx' });
  assert.deepEqual(await readFile(file), row.file);
}
await writeFile(resolve(target, 'manifest.json'), bytes, { flag: 'wx' });
console.log(JSON.stringify({ scope, files: manifest.files.length, manifestSha256: hash(bytes), independentSnapshot: true }));
