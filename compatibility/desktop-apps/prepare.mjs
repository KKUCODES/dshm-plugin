import assert from 'node:assert/strict';
import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { transform, transformResolver, baseline, patchVersion } from './changes.mjs';

// 只生成项目内副本，不修改上游参考或正在运行的 DSH。
const root = resolve('..', 'deepseek-harness/packages/host/open-in-app');
const output = resolve('artifacts/compatibility/desktop-apps');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
assert.equal(pkg.version, '0.1.6-alpha.2');
await mkdir(output, { recursive: true });
await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
const files = [];
for (const [name, apply] of [['index.ts', transform], ['resolver.ts', transformResolver]]) {
  const original = await readFile(resolve(root, 'src', name), 'utf8');
  const patched = apply(original);
  await writeFile(resolve(output, 'src', name), patched);
  files.push({ source: `packages/host/open-in-app/src/${name}`,
    originalHash: createHash('sha256').update(original).digest('hex'),
    patchedHash: createHash('sha256').update(patched).digest('hex') });
}
await build({ entryPoints: { index: resolve(output, 'src/index.ts'), internals: resolve(output, 'src/internals.ts'), resolver: resolve(output, 'src/resolver.ts') },
  outdir: resolve(output, 'runtime'), bundle: true, splitting: true, format: 'esm', platform: 'node', packages: 'external' });
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ baseline, patchVersion, files, state: 'prepared-not-installed' }, null, 2));
console.log('Prepared desktop-apps source/runtime copy; no installed DSH changes.');
