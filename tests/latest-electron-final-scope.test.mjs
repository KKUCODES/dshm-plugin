import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { latestElectronFinalPaths } from '../scripts/latest-electron-final-scope.mjs';
import { prepareLatestFinalElectronRestart } from '../scripts/prepare-latest-electron-project.mjs';
import { sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const run = '4756b548-9077-4586-bab6-67b55d177641';
const home = resolve(runtime, 'relay-homes', run);

test('Final Electron isolates both its home and official project from previous live attempts', () => {
  assert.deepEqual(latestElectronFinalPaths(runtime, home, run), {
    directory: resolve(runtime, 'electron-final-' + run),
    readinessFile: resolve(runtime, 'electron-final-' + run, 'private-ready.json'),
  });
  for (const [root, target, id] of [
    [runtime, resolve(runtime, 'live-homes', run), run],
    [runtime, resolve(runtime, 'relay-homes', 'other'), run],
    [runtime, home, '../electron-attempt-1'],
    [resolve(runtime, '..'), home, run],
  ]) assert.throws(() => latestElectronFinalPaths(root, target, id));
});

test('Final Electron restart preserves official JS expressions and managed profile rows', async () => {
  const id = randomUUID(), target = resolve(runtime, 'relay-homes', id);
  const paths = latestElectronFinalPaths(runtime, target, id);
  const profilePatch = resolve(target, 'profiles/desktop/cordis.patch.yml');
  const prepared = {passed:true,home:target,finalRun:id,directory:paths.directory,profilePatch};
  const require = createRequire(resolve(sourceRoot, 'packages/boot/app-boot/package.json'));
  const yaml = require('js-yaml');
  const { entryListSchema } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis-plugin-include')));
  // 使用实际失败的官方配置语法，表达式只能原样保留，不能求值或降为字符串。
  const text = `- insert:
    - id: dsh-mobile
      name: owned-mobile-fixture
    - id: latest-cordis-fixture
      name: owned-cordis-fixture
    - id: latest-preset-fault-source
      name: owned-preset-fixture
    - id: latest-electron-ready
      config:
        finalRun: ${id}
    - id: managed-plugin
      disabled: !!js process.platform === 'win32'
      config:
        label: retained
- update:
    managed-plugin:
      config:
        value: 42
`;
  const expected = yaml.load(text,{schema:entryListSchema});
  expected[0].insert = expected[0].insert.slice(3);
  await mkdir(paths.directory);
  await mkdir(resolve(target, 'profiles/desktop'), {recursive:true});
  try {
    await writeFile(resolve(paths.directory, 'preparation.json'),JSON.stringify(prepared),{flag:'wx'});
    await writeFile(profilePatch,text,{flag:'wx'});
    assert.throws(() => yaml.load(text), /unknown tag/);
    const result = await prepareLatestFinalElectronRestart(prepared);
    assert.equal(result.passed,true);
    assert.equal(await readFile(resolve(paths.directory,'profile-before-restart.yml'),'utf8'),text);
    const after = await readFile(profilePatch,'utf8');
    assert.match(after,/!!js/);
    assert.deepEqual(yaml.load(after,{schema:entryListSchema}),expected);
  } finally {
    for (const owned of [paths.directory,target]) {
      assert.equal(await realpath(owned),owned);
      assert.ok(owned.startsWith(runtime + '\\') || owned.startsWith(runtime + '/'));
      await rm(owned,{recursive:true});
    }
  }
});
