import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareLatestPackageProcess } from '../compatibility/latest-upstream/package-management.mjs';

// 原安装器真实 pnpm 修复分支；组件在安装后才可校验，不模拟 pnpm 修改文件。
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const flags = process.argv.slice(2);
assert.ok(flags.length === 0 || flags.length === 1 && flags[0] === '--source-installed');
const sourceInstalled = flags.includes('--source-installed');
const source = resolve(import.meta.dirname, '../artifacts/latest-source-check');
const output = resolve(runtime, 'package-repair');
await mkdir(output, { recursive: true });
const home = await mkdtemp(resolve(output, 'owned-'));
const localRequire = createRequire(resolve(runtime, 'package.json'));
if (sourceInstalled) await (await import('../compatibility/latest-upstream/source-host.mjs')).verifyInstalledSource();
else await prepareLatestPackageProcess();
const { runProfilePnpm } = await import(pathToFileURL(sourceInstalled
  ? resolve(source, 'packages/boot/plugin-manager/lib/types/operations.js') : localRequire.resolve('@deepseek-ai/dsh-plugin-manager/operations')));
const { initProfile } = await import(pathToFileURL(sourceInstalled
  ? resolve(source, 'packages/boot/app-boot/lib/index.js') : localRequire.resolve('@deepseek-ai/dsh-app-boot')));
const dir = resolve(home, 'profile');
await mkdir(dir); initProfile(dir, []);
const name = '@dsh-mobile/latest-repair-test', component = '@dsh-mobile/latest-incompatible-component';
const tarballs = [];
for (const version of ['0.0.1', '0.0.2']) {
  const pkg = resolve(home, version, 'package'); await mkdir(pkg, { recursive: true });
  await writeFile(resolve(pkg, 'package.json'), JSON.stringify({ name, version, type: 'module', exports: './index.mjs',
    peerDependencies: { '@deepseek-ai/dsh': '0.2.1-alpha.1' },
    dsh: { bundle: { patch: './cordis.patch.json' } },
    ...(version === '0.0.2' ? { bundledDependencies: [component], dependencies: { [component]: '0.0.1' } } : {}),
  }));
  await writeFile(resolve(pkg, 'index.mjs'), 'export function apply() {}\n');
  await writeFile(resolve(pkg, 'cordis.patch.json'), JSON.stringify([{ insert: [{ id: 'repair-test', name: version === '0.0.2' ? component : name }] }]));
  if (version === '0.0.2') {
    const nested = resolve(pkg, 'node_modules', component); await mkdir(nested, { recursive: true });
    await writeFile(resolve(nested, 'package.json'), JSON.stringify({ name: component, version: '0.0.1', type: 'module', exports: './index.mjs',
      peerDependencies: { '@deepseek-ai/dsh': '>=999.0.0' } }));
    await writeFile(resolve(nested, 'index.mjs'), 'export function apply() { throw Error("must_not_run"); }\n');
  }
  const tarball = resolve(home, `repair-${version}.tgz`);
  execFileSync('C:/Windows/system32/tar.exe', ['-czf', tarball, '-C', resolve(pkg, '..'), 'package'], { cwd: home, windowsHide: true });
  tarballs.push(tarball);
}
const context = { profile: 'repair-probe', dir, home, cwd: home,
  installAnchor: sourceInstalled ? resolve(source, 'apps/cli/package.json') : localRequire.resolve('@deepseek-ai/dsh/package.json') };
const options = { command: 'F:/Program Files/nodejs/node_global/pnpm.cmd', execution: 'service', outputBytes: 65536, idleTimeoutMs: 60000 };
const report = { at: new Date().toISOString(), mode: sourceInstalled ? 'source-installed' : 'published', scope: 'actual-pnpm-local-bundle-component-rejection-and-repair', home, passed: false };
try {
  const installed = await runProfilePnpm(context, ['add', tarballs[0]], options);
  assert.equal(installed.exitCode, 0, installed.output);
  const files = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  const before = await Promise.all(files.map(file => readFile(resolve(dir, file))));
  const rejected = await runProfilePnpm(context, ['add', tarballs[1]], options);
  assert.equal(rejected.exitCode, 1, rejected.output);
  assert.ok(rejected.incompatible.some(row => row.name === component));
  assert.match(rejected.output, /restored package\.json, pnpm-lock\.yaml, and node_modules/);
  for (const [index, file] of files.entries()) assert.deepEqual(await readFile(resolve(dir, file)), before[index]);
  const restored = JSON.parse(await readFile(resolve(dir, 'node_modules', name, 'package.json'), 'utf8'));
  assert.equal(restored.version, '0.0.1');
  const manifest = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
  assert.deepEqual(manifest.dsh.profile.bundles, [name]);
  await assert.rejects(access(resolve(dir, '.plugin-manager/run.json')), { code: 'ENOENT' });
  report.originalFilesAndOldInstalledVersionRestored = true;
  report.incompatible = rejected.incompatible;
  report.passed = true;
} catch (error) { report.error = String(error); throw error; }
finally { await writeFile(resolve(output, report.mode + '-report.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify({ passed: report.passed, mode: report.mode, scope: report.scope }));
