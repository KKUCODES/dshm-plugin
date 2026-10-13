import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installLatestPackageRange, packageRangeRuntime, prepareLatestPackageRangePayload } from '../compatibility/latest-upstream/package-range-runtime.mjs';

const action = process.argv[2]; assert.equal(process.argv.length, 3);
assert.ok(['prepare', 'plan', 'apply', 'restore'].includes(action));
if (action === 'prepare') {
  const manifest = await prepareLatestPackageRangePayload();
  console.log(JSON.stringify({ sealed: true, files: manifest.files.length, version: manifest.version }));
} else {
  if (action !== 'plan') {
    const state = JSON.parse(await readFile(resolve(packageRangeRuntime, 'latest-live-state.json')));
    if (state.executionMode === 'release') {
      for (const pid of [state.hostPid, state.supervisorPid]) {
        assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH', 'Stop the owned release before replacing its package');
      }
      const cleanup = JSON.parse(await readFile(resolve(state.home, 'cleanup.json')));
      assert.equal(cleanup.hostPid, state.hostPid); assert.equal(cleanup.stopped, true);
    }
  }
  const result = await installLatestPackageRange(action);
  if (action !== 'plan') await writeFile(resolve(packageRangeRuntime, 'latest-package-range-profile-published-' + action + '.json'),
    JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ action, files: result.files.length, written: result.written, original: result.original, patched: result.patched }));
}
setTimeout(() => process.exit(0), 200);
