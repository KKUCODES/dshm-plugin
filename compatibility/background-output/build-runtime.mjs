import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepare, sourceRoot, outputRoot, normalize } from './prepare.mjs';
import { baseline, patchVersion, changes } from './changes.mjs';

const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
const installedRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
try {
  const previous = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8'));
  for (const file of previous.files) {
    if (digest(await readFile(resolve(installedRoot, file.path))) === file.after && file.before !== file.after) {
      throw new Error('Restore the installed compatibility patch before rebuilding its backups');
    }
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim();
if (head !== baseline) throw new Error('Reference commit does not match compatibility baseline');
await prepare();
execFileSync(process.execPath, ['compatibility/background-output/typecheck.mjs', installedRoot, '--emit'],
  { cwd: pluginRoot, stdio: 'inherit', windowsHide: true });
const runtimeRoot = resolve(outputRoot, 'runtime');
const inputs = new Set();
const changed = new Map(changes.map(file => [resolve(sourceRoot, file.path).toLowerCase(), file.path]));
const entries = [
  ['packages/subprocess/subprocess-local', 'output'],
  ['packages/jobs/jobs', 'index'], ['packages/jobs/jobs-local', 'index'],
  ['packages/shell/bash-local', 'index'], ['packages/shell/pwsh-local', 'index'],
  ['packages/shell/tool-bash', 'index'], ['packages/shell/tool-pwsh', 'index'],
];
for (const [directory, entry] of entries) {
  const result = await build({
    absWorkingDir: sourceRoot, entryPoints: [resolve(sourceRoot, directory, 'src', `${entry}.ts`)],
    outfile: resolve(runtimeRoot, directory, 'lib', `${entry}.js`),
    bundle: true, format: 'esm', platform: 'node', target: 'es2024', packages: 'external', metafile: true,
    plugins: [{ name: 'verified-source-patch', setup(build) {
      build.onLoad({ filter: /\.ts$/ }, async args => {
        const path = changed.get(args.path.toLowerCase());
        if (path) return { contents: await readFile(resolve(outputRoot, 'patched', path), 'utf8'), loader: 'ts', resolveDir: dirname(args.path) };
      });
    } }],
  });
  for (const path of Object.keys(result.metafile.inputs)) inputs.add(path);
  // 原模块的导出面必须完整保留；仅静态解析，不执行电脑配置或工具。
  const original = await build({ entryPoints: [resolve(installedRoot, directory, 'lib', `${entry}.js`)],
    bundle: false, write: false, metafile: true, format: 'esm', platform: 'node', logLevel: 'silent' });
  const oldExports = Object.values(original.metafile.outputs)[0].exports;
  const newExports = Object.values(result.metafile.outputs)[0].exports;
  for (const name of oldExports) if (!newExports.includes(name)) throw new Error(`Missing export ${name}: ${directory}`);
}

// 除十个已核对的修改点外，也核对被编入包的辅助源码与当前安装源码。
const sourceInputs = [];
for (const path of inputs) {
  const expected = normalize(await readFile(resolve(sourceRoot, path), 'utf8'));
  const actual = normalize(await readFile(resolve(installedRoot, path), 'utf8'));
  if (actual !== expected) throw new Error(`Installed source differs from reference: ${path}`);
  sourceInputs.push({ path, sha256: digest(expected) });
}
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) {
      const local = relative(runtimeRoot, path).replaceAll('\\', '/');
      const original = await readFile(resolve(installedRoot, local));
      const replacement = await readFile(path);
      if (original.equals(replacement)) continue;
      const backup = resolve(outputRoot, 'runtime-original', local);
      await mkdir(dirname(backup), { recursive: true }); await writeFile(backup, original);
      files.push({ path: local, before: digest(original), after: digest(replacement) });
    } else throw new Error(`Unexpected runtime entry: ${path}`);
  }
}
await collect(runtimeRoot);
// 原工具内相同生产者的独立验证入口；不安装此文件，不绕过正式工具的审批入口。
await build({ entryPoints: [resolve(outputRoot, 'patched/packages/shell/tool-pwsh/src/background.ts')],
  outfile: resolve(outputRoot, 'native-producer.mjs'), bundle: true, format: 'esm', platform: 'node', target: 'es2024' });
const packages = [];
for (const directory of new Set(files.map(file => file.path.split('/lib/')[0]))) {
  const source = JSON.parse(await readFile(resolve(sourceRoot, directory, 'package.json'), 'utf8'));
  const target = JSON.parse(await readFile(resolve(installedRoot, directory, 'package.json'), 'utf8'));
  if (source.name !== target.name || source.version !== target.version) throw new Error(`Installed package mismatch: ${directory}`);
  packages.push({ directory, name: source.name, version: source.version });
}
await writeFile(resolve(outputRoot, 'runtime-manifest.json'), JSON.stringify({ baseline, patchVersion, packages, sourceInputs, files }, null, 2) + '\n');
console.log(JSON.stringify({ runtimeRoot, packages: packages.length, files: files.length, sourceInputs: sourceInputs.length }));
