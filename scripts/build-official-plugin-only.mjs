import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildLatestCandidate } from './build-latest-candidate.mjs';

assert.equal(process.argv.length, 2);
const entry = await readFile(resolve(import.meta.dirname, '../src/index.ts'), 'utf8');
for (const removed of ['CommandOutput', 'pendingNotificationsOf', 'dshmDesktopApps', 'cordisInspectService'])
  assert.ok(!entry.includes(removed), `Patch-only startup wiring remains: ${removed}`);
const result = await buildLatestCandidate('candidate-package-check-Alpha2PublicOnly02/package', {
  targetVersion: '0.2.1-alpha.2', candidateVersion: '0.1.80-latest.0',
});
const inputs = Object.keys(result.hostMetafile.inputs);
for (const removed of ['command-output.ts', 'pending-notifications.ts'])
  assert.ok(!inputs.some(path => path.replaceAll('\\', '/').endsWith('/src/' + removed)),
    `Patch-only observer bundled into Host runtime: ${removed}`);
const report = { at: new Date().toISOString(), version: result.version, candidateVersion: result.manifest.version,
  candidate: result.target, snapshot: result.snapshot, hostInputs: inputs,
  patchOnlyStartupWiringAbsent: true, legacyOutputAndPendingObserversNotBundled: true,
  officialDshModified: false, officialDshBuilt: false, sdkBuilt: false, appBuilt: false };
await writeFile(resolve(result.target, '../own-build-report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ candidate: report.candidate, version: report.candidateVersion,
  hostInputs: inputs.length, patchOnlyStartupWiringAbsent: true, legacyOutputAndPendingObserversNotBundled: true }));
