import { cp, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// 检查当前产品源码，而不覆盖首轮未修改源码的审计副本和证据。
const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'artifacts/latest-runtime-check/current-source');
await mkdir(target, { recursive: true });
await cp(resolve(root, 'src'), resolve(target, 'src'), { recursive: true });
await writeFile(resolve(target, 'tsconfig.json'), JSON.stringify({ extends: '../../../tsconfig.json',
  compilerOptions: { rootDir: 'src', noEmit: true }, include: ['src/**/*.ts', 'src/**/*.tsx'] }, null, 2) + '\n');
const child = spawnSync(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json', '--pretty', 'false'],
  { cwd: target, encoding: 'utf8', windowsHide: true });
const output = child.stdout + child.stderr;
await writeFile(resolve(target, 'typecheck.txt'), output);
console.log(output || 'Current plugin source passed latest DSH typecheck.');
process.exitCode = child.status ?? 1;
