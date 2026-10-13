// 真正的 Windows SEA 回归：相同 snapshot 的跨盘符模块共享启动 WeakMap。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { sdkModuleIdentityResolver } from '../compatibility/latest-upstream/sdk-module-identity.mjs';

assert.equal(process.platform, 'win32');
assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--attempt-2');
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'artifacts/latest-runtime-check/sdk-module-identity-diagnostic' + (process.argv[2] ?? ''));
await mkdir(output);
const fixture = resolve(output, 'fixture'); await mkdir(fixture);
const source = resolve(root, 'artifacts/latest-source-check');
const pkg = resolve(source, 'node_modules/@yao-pkg/pkg');
assert.equal(JSON.parse(await readFile(resolve(pkg, 'package.json'))).version, '6.21.0');
await writeFile(resolve(fixture, 'package.json'), JSON.stringify({ name: 'dshm-sdk-module-identity-diagnostic',
  version: '0.0.0', type: 'module', bin: 'entry.mjs', pkg: { assets: ['registry.mjs'] } }), { flag: 'wx' });
await writeFile(resolve(fixture, 'registry.mjs'), 'export const contexts = new WeakMap();\n', { flag: 'wx' });
await writeFile(resolve(fixture, 'entry.mjs'), `import { registerHooks } from 'node:module';
if (process.argv.includes('--candidate')) registerHooks({ resolve(specifier, context, nextResolve) {
  const office = false, parentURL = context.parentURL;
${sdkModuleIdentityResolver}
} });
const original = new URL('./registry.mjs', import.meta.url);
const alias = new URL(original); alias.pathname = alias.pathname.replace(/^\\/[A-Za-z]:/, '/Q:');
const first = await import(original.href), second = await import(alias.href), owner = {};
first.contexts.set(owner, 'root-include');
console.log(JSON.stringify({ original: original.href, alias: alias.href,
  sameRegistry: first.contexts === second.contexts, rootVisible: second.contexts.get(owner) === 'root-include' }));
process.exitCode = first.contexts === second.contexts && second.contexts.get(owner) === 'root-include' ? 0 : 2;
`, { flag: 'wx' });
const exe = resolve(output, 'module-identity.exe');
const report = { at: new Date().toISOString(), passed: false, productionModified: false, modelRequests: 0 };
const capture = (command, args) => {
  const result = spawnSync(command, args, { cwd: fixture, windowsHide: true, encoding: 'utf8',
    timeout: 120000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env,
      TEMP: resolve(root, 'artifacts/latest-runtime-check/sdk-sea-temporary'),
      TMP: resolve(root, 'artifacts/latest-runtime-check/sdk-sea-temporary'),
      PKG_CACHE_PATH: resolve(root, 'artifacts/latest-runtime-check/sdk-sea-temporary/pkg-cache') } });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '', error: result.error?.code };
};
try {
  const syntax = capture(process.execPath, ['--check', resolve(fixture, 'entry.mjs')]);
  assert.equal(syntax.status, 0, syntax.stderr);
  console.log(JSON.stringify({ stage: 'real-sea-identity-regression-build' }));
  report.build = capture(process.execPath, [resolve(pkg, 'lib-es5/bin.js'), fixture,
    '--sea', '--targets=node24-win-x64', '--output', exe]);
  await writeFile(resolve(output, 'build.log'), report.build.stdout + report.build.stderr, { flag: 'wx' });
  assert.equal(report.build.status, 0);
  report.exeSha256 = createHash('sha256').update(await readFile(exe)).digest('hex');
  report.baseline = capture(exe, []); assert.equal(report.baseline.status, 2);
  assert.equal(JSON.parse(report.baseline.stdout.trim()).rootVisible, false);
  report.candidate = capture(exe, ['--candidate']); assert.equal(report.candidate.status, 0);
  assert.equal(JSON.parse(report.candidate.stdout.trim()).rootVisible, true);
  report.passed = true;
} catch (error) { report.failure = { name: error.name, message: error.message }; process.exitCode = 1; }
finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(report));
}
