import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// 只升级隔离profile里的自有插件，通过官方安装接口，不改官方安装文件。
assert.ok(process.argv.length === 2 || (process.argv.length === 3 && ['--endpoint-policy', '--plugin-only', '--preset-policy'].includes(process.argv[2])));
const policy = process.argv[2] === '--endpoint-policy';
const pluginOnly = process.argv[2] === '--plugin-only';
const presetPolicy = process.argv[2] === '--preset-policy';
const root = resolve(import.meta.dirname, '../artifacts/official-dsh-alpha2');
const candidate = resolve(import.meta.dirname, '../artifacts/official-alpha2-sdk', presetPolicy
  ? 'candidate-package-check-Alpha2PublicOnly02/package' : pluginOnly
  ? 'candidate-package-check-Alpha2PublicOnly01/package' : policy
  ? 'candidate-package-check-Alpha2EndpointPolicy01/package' : 'candidate-package-check-Alpha2Schedule01/package');
const manifest = JSON.parse(await readFile(resolve(candidate, 'package.json'), 'utf8'));
assert.equal(manifest.name, '@dsh-mobile/plugin'); assert.equal(manifest.version, presetPolicy ? '0.1.80-latest.0' : pluginOnly ? '0.1.79-latest.0' : policy ? '0.1.78-latest.0' : '0.1.77-latest.0');
const receipt = JSON.parse(await readFile(resolve(root, 'official-web-receipt.json'), 'utf8'));
assert.equal(receipt.stage, 'plugin-ready'); assert.equal(receipt.port, 16958);
assert.equal(receipt.version, '0.2.1-alpha.2'); assert.equal(receipt.entry, 'pnpm dsh web');
process.kill(receipt.pid, 0);
const log = await readFile(receipt.privateLog, 'utf8');
const url = log.match(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/)?.[1];
assert.equal(new URL(url).origin, 'http://127.0.0.1:16958');
const login = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
assert.equal(login.status, 303);
const cookie = login.headers.get('set-cookie').split(';')[0];
const rpc = async (method, args) => {
  const rpcId = randomUUID();
  const response = await fetch('http://127.0.0.1:16958/api/' + method, { method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId, method, payload: { args } }),
    signal: AbortSignal.timeout(120000) });
  assert.equal(response.status, 200);
  const frame = await response.json(); assert.equal(frame.rpcId, rpcId); assert.equal(frame.result.ok, true);
  return frame.result.value;
};
const before = (await rpc('pluginManager/listBundles', {})).find(item => item.name === manifest.name);
assert.equal(before.installed, true); assert.equal(before.enabled, true);
assert.equal(before.version, presetPolicy ? '0.1.79-latest.0' : pluginOnly ? '0.1.78-latest.0' : policy ? '0.1.77-latest.0' : '0.1.76-latest.0');
const requestId = randomUUID(), path = resolve(root, presetPolicy ? 'own-plugin-preset-policy-upgrade.json' : pluginOnly ? 'own-plugin-public-only-upgrade.json' : policy ? 'own-plugin-endpoint-policy-upgrade.json' : 'own-plugin-upgrade.json');
const report = { at: new Date().toISOString(), requestId, candidate, from: before.version,
  to: manifest.version, oldLaunchPid: receipt.pid, started: true, completed: false };
await writeFile(path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
try {
  const result = await rpc('pluginManager/installBundle', { spec: candidate, options: { requestId } });
  if (result.version !== undefined) assert.equal(result.version, manifest.version);
  assert.ok(['applied', 'restart-required'].includes(result.application));
  const installed = (await rpc('pluginManager/listBundles', {})).find(item => item.name === manifest.name);
  assert.equal(installed.version, manifest.version); assert.equal(installed.enabled, true);
  report.application = result.application; report.completed = true;
  console.log(JSON.stringify({ version: manifest.version, application: result.application, completed: true }));
} catch (error) { report.failure = error.message; throw error; }
finally { await writeFile(path, JSON.stringify(report, null, 2) + '\n'); }
