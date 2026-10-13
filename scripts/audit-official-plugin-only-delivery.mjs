import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile), root = resolve(import.meta.dirname, '..');
assert.equal(process.argv.length, 2);
const directory = resolve(root, 'artifacts/official-alpha2-sdk/candidate-package-check-Alpha2PublicOnly02');
const archive = resolve(directory, 'dsh-mobile-plugin-0.1.80-latest.0.tgz');
const tar = async args => (await execute('tar', args, { cwd: directory, windowsHide: true,
  timeout: 10000, maxBuffer: 2 * 1024 * 1024 })).stdout;
const files = (await tar(['-tzf', archive])).trim().split(/\r?\n/);
assert.equal(files.length, 63);
for (const file of files) {
  assert.ok(file.startsWith('package/') && !file.includes('..'));
  assert.ok(/^package\/(?:README\.md|package\.json|cordis\.patch\.yml|dist\/.+\.(?:js|js\.map|d\.ts))$/.test(file));
}
const manifest = JSON.parse(await tar(['-xOf', archive, 'package/package.json']));
assert.equal(manifest.name, '@dsh-mobile/plugin'); assert.equal(manifest.version, '0.1.80-latest.0');
assert.equal(manifest.scripts, undefined);
assert.deepEqual(Object.keys(manifest.dependencies).sort(), ['ws', 'zod']);
for (const [name, version] of Object.entries(manifest.peerDependencies))
  if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(version, '0.2.1-alpha.2');
assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
// 这是官方插件配置声明，只插入自己的组件；与修改 DSH 源码的旧补丁不同。
assert.equal(await tar(['-xOf', archive, 'package/cordis.patch.yml']),
  await readFile(resolve(directory, 'package/cordis.patch.yml'), 'utf8'));
for (const file of files) {
  const packed = await tar(['-xOf', archive, file]);
  assert.equal(packed, await readFile(resolve(directory, file), 'utf8'), `Packed file changed: ${file}`);
}
const build = JSON.parse(await readFile(resolve(directory, 'own-build-report.json'), 'utf8'));
assert.equal(build.candidateVersion, manifest.version);
assert.equal(build.patchOnlyStartupWiringAbsent, true);
assert.equal(build.legacyOutputAndPendingObserversNotBundled, true);
assert.equal(await readFile(resolve(build.snapshot, 'src/index.ts'), 'utf8'),
  await readFile(resolve(root, 'src/index.ts'), 'utf8'));
for (const observer of ['command-output.ts', 'pending-notifications.ts'])
  assert.ok(!build.hostInputs.some(file => file.replaceAll('\\', '/').endsWith('/src/' + observer)));

// 比对实际包的 source map，而不只比对入口：旧快照不能替代当前插件/协议源码。
const inside = (base, file) => {
  const path = relative(base, file);
  return path !== '..' && !path.startsWith('../') && !path.startsWith('..\\') && !isAbsolute(path);
};
const ownSource = resolve(build.snapshot, 'src');
const protocolSource = resolve(root, '../backend/packages/protocol/src');
const dependencies = resolve(root, 'node_modules');
const sourceChecks = { plugin: 0, protocol: 0, dependencies: 0 };
for (const entry of ['index', 'client']) {
  const mapPath = resolve(directory, 'package/dist', entry + '.js.map');
  const map = JSON.parse(await readFile(mapPath, 'utf8'));
  assert.equal(map.sources.length, map.sourcesContent.length);
  assert.equal(map.sourceRoot ?? '', '');
  for (let index = 0; index < map.sources.length; index++) {
    const source = resolve(dirname(mapPath), map.sources[index]);
    const kind = inside(ownSource, source) ? 'plugin'
      : inside(protocolSource, source) ? 'protocol' : inside(dependencies, source) ? 'dependencies' : undefined;
    assert.ok(kind, `Unexpected packed source: ${map.sources[index]}`);
    const current = kind === 'plugin' ? resolve(root, 'src', relative(ownSource, source)) : source;
    assert.equal(map.sourcesContent[index], await readFile(current, 'utf8'), `Packed source changed: ${relative(root, current)}`);
    sourceChecks[kind]++;
  }
}
assert.ok(sourceChecks.plugin > 0 && sourceChecks.protocol > 0);

const official = resolve(root, 'artifacts/official-dsh-alpha2');
const receipt = JSON.parse(await readFile(resolve(official, 'official-web-receipt.json'), 'utf8'));
assert.equal(receipt.stage, 'plugin-ready'); assert.equal(receipt.port, 16958);
assert.equal(receipt.version, '0.2.1-alpha.2'); assert.equal(receipt.entry, 'pnpm dsh web');
process.kill(receipt.pid, 0);
// 仅在内存中使用自己隔离 Host 的正常登录地址，不写入报告或标准输出。
const log = await readFile(receipt.privateLog, 'utf8');
const url = log.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
assert.equal(new URL(url).origin, 'http://127.0.0.1:16958');
const login = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
assert.equal(login.status, 303);
const cookie = login.headers.get('set-cookie').split(';')[0];
const method = 'pluginManager/listBundles', rpcId = randomUUID();
const response = await fetch('http://127.0.0.1:16958/api/' + method, { method: 'POST',
  headers: { cookie, 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'client-request', rpcId, method, payload: { args: {} } }),
  signal: AbortSignal.timeout(10000) });
assert.equal(response.status, 200);
const frame = await response.json(); assert.equal(frame.rpcId, rpcId); assert.equal(frame.result.ok, true);
const installed = frame.result.value.find(item => item.name === manifest.name);
assert.equal(installed.version, manifest.version); assert.equal(installed.installed, true); assert.equal(installed.enabled, true);

// 区分正常安装器的开发链接与独立归档缓存，二者都必须逐文件比对，不能互相代替证据。
const installedRoot = resolve(official, 'home/profiles/web/node_modules/@dsh-mobile/plugin');
const installedPath = await realpath(installedRoot);
const installedLinked = installedPath === await realpath(resolve(directory, 'package'));
if (!installedLinked) {
  const profile = resolve(official, 'home/profiles/web');
  assert.ok(inside(profile, installedPath));
  assert.ok(relative(profile, installedPath).replaceAll('\\', '/').startsWith('node_modules/'));
  const profileManifest = JSON.parse(await readFile(resolve(profile, 'package.json'), 'utf8'));
  assert.ok(profileManifest.dependencies['@dsh-mobile/plugin'].endsWith('.tgz'));
}
for (const file of files) {
  const name = file.slice('package/'.length);
  assert.equal(await readFile(resolve(installedRoot, name), 'utf8'), await tar(['-xOf', archive, file]),
    `Installed file changed: ${name}`);
}

const evidenceRoot = resolve(root, '../backend/artifacts/official-plugin-only');
const candidates = [];
for (const name of await readdir(evidenceRoot)) {
  if (!/^official-android-[0-9a-f-]+\.json$/.test(name)) continue;
  const path = resolve(evidenceRoot, name), check = JSON.parse(await readFile(path, 'utf8'));
  if (check.passed && check.cleanupCompleted && check.desktopPluginVersion === manifest.version
    && check.coreInferenceVerified && check.retiredPresetInterfaces?.managementRestored)
    candidates.push({ run: check.run, at: (await stat(path)).mtimeMs });
}
candidates.sort((a, b) => b.at - a.at);
assert.ok(candidates.length > 0, 'Current candidate has no successful real core/endpoint-denial report');
const runs = [candidates[0].run];
const checks = [];
for (const run of runs) {
  const base = resolve(root, '../backend/artifacts/official-plugin-only', 'official-android-' + run);
  const check = JSON.parse(await readFile(base + '.json', 'utf8'));
  const outcome = JSON.parse(await readFile(base + '.outcome.json', 'utf8'));
  assert.equal(check.passed, true); assert.equal(check.cleanupCompleted, true); assert.deepEqual(check.cleanupFailures, []);
  // 真实重启后当前 PID 会变化；历史报告应保留当时 PID，而不是要求旧报告属于新进程。
  assert.ok(Number.isSafeInteger(check.officialLaunchPid) && check.officialLaunchPid > 0);
  assert.equal(check.version, receipt.version);
  assert.equal(check.entry, 'pnpm dsh web'); assert.equal(check.testDevicesRevoked, true);
  assert.equal(check.android.passed, true); assert.deepEqual(check.android.pageErrors, []); assert.deepEqual(check.android.renderingErrors, []);
  assert.equal(outcome.run, run); assert.equal(outcome.exitCode, 0); assert.equal(outcome.unhandledErrors, false);
  assert.equal(outcome.desktopPluginVersion, manifest.version);
  assert.equal(check.desktopPluginVersion, manifest.version);
  assert.equal(check.coreInferenceVerified, true);
  assert.equal(check.retiredPresetInterfaces.productionRelayAndInstalledPlugin, true);
  assert.equal(check.retiredPresetInterfaces.managementRestored, true);
  assert.deepEqual(check.retiredPresetInterfaces.checks, [false, true].flatMap(management =>
    ['agentPresets/copy', 'agentPresets/deletePreset'].map(endpoint => ({ endpoint, management,
      advertised: false, code: management ? 'remote_operation_denied' : 'management_required' }))));
  for (const name of ['presetProfileManagement', 'desktopApps', 'desktopAppIcons', 'taskPendingNotifications', 'providerModelProbe'])
    assert.equal(check.capabilities[name], false);
  assert.equal(check.capabilities.commandOutputGeneration, undefined);
  for (const endpoints of Object.values(check.capabilities.endpoints))
    assert.ok(!endpoints.some(name => name.startsWith('dynamicCordisRunner/')));
  checks.push({ run, scope: check.scope, stages: check.android.stages.length, exitCode: outcome.exitCode,
    historicalOfficialLaunchPid: check.officialLaunchPid });
}
const bytes = await readFile(archive);
const report = { at: new Date().toISOString(), pluginVersion: manifest.version, dshVersion: receipt.version,
  archive, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), files: files.length,
  installedPluginVersion: installed.version, officialLaunchPid: receipt.pid, checks,
  patchOnlyStartupWiringAbsent: true, legacyOutputAndPendingObserversNotBundled: true,
  ordinaryPluginConfigurationDeclaration: true, metadataIncludesHistoricalTypes: true,
  officialDshPayloadIncluded: false, credentialsIncluded: false, officialDshModified: false,
  officialDshBuilt: false, sdkBuilt: false, appBuilt: false,
  runtimeAndManifestComparedWithPack: true, allPackedFilesCompared: true, sourceChecks,
  currentPluginAndProtocolSourcesCompared: true, installedLinkedFilesCompared: installedLinked,
  installedPath, installedCacheBytesCompared: !installedLinked };
const reportDirectory = resolve(root, 'artifacts/official-plugin-only');
await mkdir(reportDirectory, { recursive: true });
const reportPath = resolve(reportDirectory, 'delivery-audit-' + randomUUID() + '.json');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ version: report.pluginVersion, bytes: report.bytes, sha256: report.sha256,
  files: report.files, runs: checks.length, installed: true, sourceChecks,
  currentOfficialLaunchPid: receipt.pid, installedLinkedFilesCompared: installedLinked,
  installedCacheBytesCompared: !installedLinked, reportPath,
  patchOnlyStartupWiringAbsent: true }));
