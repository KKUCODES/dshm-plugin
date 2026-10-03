import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { transform as applications, transformResolver } from '../desktop-apps/changes.mjs';
import { transform } from './changes.mjs';

// 仅从只读基线派生项目内副本，保留已交付的desktop-apps-v1安装包。
const root = resolve('../deepseek-harness/packages/host/open-in-app');
const output = resolve('artifacts/compatibility/desktop-app-icons');
await mkdir(output, { recursive: true });
await cp(resolve(root, 'src'), resolve(output, 'src'), { recursive: true });
await writeFile(resolve(output, 'src/index.ts'), transform(applications(await readFile(resolve(root, 'src/index.ts'), 'utf8'))));
await writeFile(resolve(output, 'src/resolver.ts'), transformResolver(await readFile(resolve(root, 'src/resolver.ts'), 'utf8')));
await build({ entryPoints: { index: resolve(output, 'src/index.ts'), internals: resolve(output, 'src/internals.ts') },
  outdir: resolve(output, 'runtime'), bundle: true, splitting: true, format: 'esm', platform: 'node', packages: 'external' });
console.log('Prepared internal desktop icon service; installed DSH untouched.');
