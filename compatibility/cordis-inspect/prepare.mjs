import { readFile, mkdir, writeFile, copyFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { transform, transformRunner } from './changes.mjs';

const source = resolve('../deepseek-harness/packages/extensions/cordis-host-runner/src');
const output = resolve('artifacts/compatibility/cordis-inspect');
await mkdir(resolve(output, 'src'), { recursive: true });
await cp(source, resolve(output, 'src'), { recursive: true });
await writeFile(resolve(output, 'src/inspect-registry.ts'), transform(await readFile(resolve(source, 'inspect-registry.ts'), 'utf8')));
await writeFile(resolve(output, 'src/index.ts'), transformRunner(await readFile(resolve(source, 'index.ts'), 'utf8')));
await copyFile(resolve(source, 'types.ts'), resolve(output, 'src/types.ts'));
await build({ entryPoints: [resolve(output, 'src/inspect-registry.ts')], outfile: resolve(output, 'runtime/inspect-registry.mjs'),
  bundle: true, format: 'esm', platform: 'node', packages: 'external' });
// 完整 runner 使用同一份修改后的注册表；原生成贡献在测试中从已核验安装读取，不改写。
await build({ entryPoints: [resolve(output, 'src/index.ts')], outfile: resolve(output, 'runtime/runner.mjs'),
  bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external' });
const installed = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness', 'packages/extensions/cordis-host-runner');
const pkg = JSON.parse(await readFile(resolve(installed, 'package.json'), 'utf8'));
if (pkg.name !== '@deepseek-ai/dsh-cordis-host-runner' || pkg.version !== '0.1.6-alpha.2') throw new Error('Unsupported installed Cordis runner');
const generated = await readFile(resolve(installed, 'lib/typert.host.js'));
await writeFile(resolve(output, 'runtime/typert.host.mjs'), generated);
await writeFile(resolve(output, 'generated-source.json'), JSON.stringify({ source: resolve(installed, 'lib/typert.host.js'),
  sha256: createHash('sha256').update(generated).digest('hex'), package: pkg.name, version: pkg.version }, null, 2) + '\n');
console.log('Prepared scoped Cordis inspect registry in project artifacts; installed DSH untouched.');
