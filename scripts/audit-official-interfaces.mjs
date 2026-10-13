import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// 只读取已安装的官方声明和已有真实报告；不启动、改写或构建 DSH。
assert.equal(process.argv.length, 2);
const root = resolve(import.meta.dirname, '..');
const sdk = resolve(root, 'artifacts/official-alpha2-sdk/node_modules/@deepseek-ai');
const sources = resolve(root, '../dsh-mobile/artifacts/official-alpha2-source');
const declarations = new Map();
let packages = 0;
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name === 'typert.remote-client.d.ts') {
      const content = await readFile(path, 'utf8');
      for (const match of content.matchAll(/['"]([^'"]+\/[^'"]+)['"]\s*:/g)) {
        const list = declarations.get(match[1]) ?? [];
        list.push(path); declarations.set(match[1], list);
      }
    }
  }
}
for (const entry of await readdir(sdk, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('dsh-')) continue;
  const metadata = JSON.parse(await readFile(resolve(sdk, entry.name, 'package.json'), 'utf8'));
  assert.equal(metadata.version, '0.2.1-alpha.2'); packages++;
  const entries = await readdir(resolve(sdk, entry.name));
  // web-frontend 等纯资源包没有 lib；它们不提供 RPC 声明。
  if (entries.includes('lib')) await collect(resolve(sdk, entry.name, 'lib'));
}
const policy = await import(pathToFileURL(resolve(root, '../backend/packages/protocol/dist/remote-policy.js')).href);
const endpoints = policy.remoteEndpoints(true, false, 'target', true);
const sampleRun = '54489ba0-4cb6-4b9f-9483-1da9be208f77';
const sample = JSON.parse(await readFile(resolve(root, '../backend/artifacts/official-plugin-only',
  'official-android-' + sampleRun + '.json'), 'utf8'));
assert.equal(sample.passed, true); assert.equal(sample.cleanupCompleted, true);
assert.equal(sample.version, '0.2.1-alpha.2');
assert.equal(sample.capabilities.management, false);
const basicEndpoints = policy.remoteEndpoints(false, false, 'target', true);
for (const kind of ['calls', 'streams'])
  assert.deepEqual([...sample.capabilities.endpoints[kind]].sort(), [...basicEndpoints[kind]].sort());

const gateway = resolve(sources, 'packages/api/gateway/src/stream-protocol.ts');
const gatewaySource = await readFile(gateway, 'utf8');
assert.ok(gatewaySource.includes("'$events/result'") && gatewaySource.includes("'$events'"));
const adapterPath = resolve(root, 'src/remote-adapter.ts');
const adapter = await readFile(adapterPath, 'utf8');
assert.ok(adapter.includes("operation.endpoint === 'settings/openAgentPresetDirectory'"));
assert.ok(adapter.includes('await profilePresetDirectory('));
const retired = ['agentPresets/copy', 'agentPresets/deletePreset'];
for (const endpoint of retired) {
  assert.equal(declarations.has(endpoint), false);
  assert.equal(endpoints.calls.includes(endpoint), false);
  const args = endpoint === 'agentPresets/copy' ? { from: 'standard', id: 'audit-unused' } : { id: 'audit-unused' };
  assert.equal(policy.remoteRequestAllowed(endpoint, { args }, 'target'), false);
  assert.equal(policy.remoteRequestAllowed(endpoint, { args }, 'legacy'), true);
}
const rows = [];
for (const kind of ['calls', 'streams']) for (const endpoint of endpoints[kind]) {
  let contract, paths = declarations.get(endpoint);
  if (paths) contract = 'official-generated-remote-declaration';
  else if (endpoint === '$events' || endpoint === '$events/result') {
    contract = 'official-gateway-event-protocol'; paths = [gateway];
  } else if (endpoint === 'settings/openAgentPresetDirectory') {
    contract = 'dshm-adapter-over-public-profile-services';
    paths = [adapterPath, resolve(root, 'src/profile-preset-directory.ts')];
  } else throw Error(`Unmapped endpoint: ${endpoint}`);
  rows.push({ endpoint, kind, contract, paths });
}
const missing = rows.filter(row => row.contract === 'legacy-endpoint-absent-from-target').map(row => row.endpoint);
assert.deepEqual(missing, []);
const report = { at: new Date().toISOString(), officialVersion: sample.version, packages,
  sampleRun, basicSampleEndpointsMatched: true, managementEndpointsEnumeratedFromPolicy: true,
  calls: endpoints.calls.length, streams: endpoints.streams.length,
  rows, allEndpointsMapped: true, unsupportedAdvertisedEndpoints: missing,
  allAdvertisedEndpointsSupported: true, retiredPresetCallsExcludedAndDenied: true,
  legacyPresetCallsPreserved: true, runtimeCallsExecutedThisAudit: false,
  dshModified: false, dshBuilt: false, sdkBuilt: false, appBuilt: false, keyRead: false };
const output = resolve(root, 'artifacts/official-plugin-only');
await mkdir(output, { recursive: true });
const reportPath = resolve(output, 'interface-audit-' + randomUUID() + '.json');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ packages, calls: report.calls, streams: report.streams,
  allEndpointsMapped: true, unsupportedAdvertisedEndpoints: missing, reportPath }));
