// 仅恢复本轮独立桌面观察器配置；不触碰日常 DSH 或其他 profile。
import assert from 'node:assert/strict';
import { access, readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const state = JSON.parse(await readFile(resolve(runtime, 'latest-live-state.json')));
assert.equal(state.executionMode, 'electron');
const cleanup = JSON.parse(await readFile(resolve(state.home, 'cleanup.json')));
assert.equal(cleanup.stopped, true); assert.equal(cleanup.hostPid, state.hostPid);
const carrier = state.electronCarrier;
assert.equal(carrier.attempt, 2); assert.equal(carrier.encodingUpgrade, true);
const directory = resolve(runtime, 'electron-attempt-2');
assert.equal(carrier.directory, directory);
for (const pid of [state.hostPid, carrier.electronHostPid]) {
  assert.throws(() => process.kill(pid, 0), {code:'ESRCH'});
}
const patch = resolve(state.home, 'profiles/desktop/cordis.patch.yml');
assert.equal(await realpath(patch), patch);
const plugin = resolve(runtime, 'candidate-package-check-1xqe3A/consumer/node_modules/@dsh-mobile/plugin/dist/index.js');
const expected = JSON.stringify([{insert:[{id:'dsh-mobile',name:pathToFileURL(plugin).href},
  {id:'latest-electron-ready',name:pathToFileURL(resolve(import.meta.dirname,'../tests/support/latest-electron-ready/index.mjs')).href,
    config:{reportPath:resolve(directory,'private-ready.json')}}]}]);
const receipt = resolve(directory, 'profile-restored.json');
await assert.rejects(access(receipt), {code:'ENOENT'});
const original = await readFile(resolve(directory, 'original-profile-patch.yml'));
const yaml = createRequire(resolve(sourceRoot,'package.json'))('js-yaml');
const rows = yaml.load(original.toString('utf8'));
assert.deepEqual(rows[0].insert.slice(0,1), JSON.parse(expected)[0].insert.slice(0,1));
assert.equal(rows[0].insert[1].config.reportPath, resolve(runtime,'electron-attempt-1/private-ready.json'));
rows[0] = JSON.parse(expected)[0];
const current = await readFile(patch);
// 官方设置服务会重写 YAML 格式；仍逐项要求只有本轮观察器路径改变。
assert.deepEqual(yaml.load(current.toString('utf8')), rows);
await writeFile(resolve(directory,'profile-before-restoration.yml'), current, {flag:'wx'});
assert.deepEqual(await readFile(patch), current);
await writeFile(patch, original);
assert.deepEqual(await readFile(patch), original);
await writeFile(receipt, JSON.stringify({at:new Date().toISOString(),passed:true,
  originalBytesRestored:true,onlyOwnedDesktopProfile:true},null,2), {flag:'wx'});
console.log(JSON.stringify({passed:true,originalBytesRestored:true}));
