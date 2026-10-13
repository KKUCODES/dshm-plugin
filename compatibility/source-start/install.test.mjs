import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, writeFile, symlink, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { inputs, latestInputs, outputRoot, originalCommand, patchedCommand, installStartup } from './install.mjs';
import { sourceRoot } from '../background-output/prepare.mjs';

const latestSource = resolve(import.meta.dirname, '../../artifacts/latest-source-check');
async function fixture(crlf = false, latest = false) {
  await mkdir(outputRoot, { recursive: true });
  const root = await mkdtemp(resolve(outputRoot, 'install-test-'));
  for (const [path] of latest ? latestInputs : inputs) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), await readFile(resolve(latest ? latestSource : sourceRoot, path)));
  }
  const manifest = { name: '@deepseek-ai/dsh-root', version: latest ? '0.2.1-alpha.1' : '0.1.6-alpha.2', scripts: { dsh: originalCommand, custom: 'user command' }, user: '保持用户字段' };
  const original = JSON.stringify(manifest, null, 2).replaceAll('\n', crlf ? '\r\n' : '\n') + (crlf ? '\r\n' : '\n');
  await writeFile(resolve(root, 'package.json'), original);
  return { root, original };
}
for (const crlf of [false, true]) test(`install/restore keeps original package bytes (${crlf ? 'CRLF' : 'LF'})`, async () => {
  const { root, original } = await fixture(crlf);
  assert.equal((await installStartup('plan', root)).state, 'original');
  assert.equal((await installStartup('apply', root)).written, 3);
  assert.equal((await installStartup('apply', root)).written, 0);
  assert.equal(JSON.parse(await readFile(resolve(root, 'package.json'))).scripts.dsh, patchedCommand);
  assert.equal((await installStartup('restore', root)).written, 3);
  assert.equal((await installStartup('restore', root)).written, 0);
  assert.equal(await readFile(resolve(root, 'package.json'), 'utf8'), original);
});

for (const crlf of [false, true]) test(`latest fixed source installs/restores (${crlf ? 'CRLF' : 'LF'})`, { skip: !existsSync(latestSource) }, async () => {
  const { root, original } = await fixture(crlf, true);
  const plan = await installStartup('plan', root);
  assert.equal(plan.baseline, '0.2.1-alpha.1');
  assert.equal(plan.patchVersion, 'source-start-v2');
  assert.equal((await installStartup('apply', root)).written, 3);
  assert.equal((await installStartup('apply', root)).written, 0);
  assert.equal((await installStartup('restore', root)).written, 3);
  assert.equal((await installStartup('restore', root)).written, 0);
  assert.equal(await readFile(resolve(root, 'package.json'), 'utf8'), original);
});

test('latest requires every fixed input and rejects adjacent versions before writes', { skip: !existsSync(latestSource) }, async () => {
  const { root, original } = await fixture(false, true);
  for (const [local] of latestInputs) {
    const file = resolve(root, local), before = await readFile(file);
    await writeFile(file, Buffer.concat([before, Buffer.from('\n// unverified customization\n')]));
    await assert.rejects(installStartup('apply', root), /baseline mismatch/);
    assert.equal(await readFile(resolve(root, 'package.json'), 'utf8'), original);
    assert.equal(existsSync(resolve(root, '.dshm-source/register.mjs')), false);
    await writeFile(file, before);
  }
  await writeFile(resolve(root, 'package.json'), original.replace('0.2.1-alpha.1', '0.2.1-alpha.2'));
  await assert.rejects(installStartup('apply', root), /version mismatch/);
  assert.equal(existsSync(resolve(root, '.dshm-source/register.mjs')), false);
});
test('refuses unknown script/source/payload and preserves unrelated user edits during restore', async () => {
  const { root, original } = await fixture();
  const path = resolve(root, 'package.json');
  await writeFile(path, original.replace(originalCommand, 'user source command'));
  await assert.rejects(installStartup('apply', root), /Unknown dsh script/);
  await writeFile(path, original);
  const last = resolve(root, inputs.at(-1)[0]), before = await readFile(last);
  await writeFile(last, 'unknown source');
  await assert.rejects(installStartup('apply', root), /baseline mismatch/);
  assert.equal(await readFile(path, 'utf8'), original);
  await writeFile(last, before);
  await installStartup('apply', root);
  await writeFile(path, (await readFile(path, 'utf8')).replace('user command', 'new user command'));
  const payload = resolve(root, '.dshm-source/register.mjs'), owned = await readFile(payload);
  await writeFile(payload, 'user payload');
  await assert.rejects(installStartup('restore', root), /Unknown startup payload/);
  assert.equal(JSON.parse(await readFile(path)).scripts.dsh, patchedCommand);
  await writeFile(payload, owned);
  await installStartup('restore', root);
  assert.equal(await readFile(path, 'utf8'), original.replace('user command', 'new user command'));
});
test('reference checkout and linked payload directories are read-only', async () => {
  await assert.rejects(installStartup('apply', sourceRoot), /read-only/);
  const { root } = await fixture(), outside = await fixture(), link = resolve(root, '.dshm-source');
  await symlink(outside.root, link, process.platform === 'win32' ? 'junction' : 'dir');
  try { await assert.rejects(installStartup('apply', root), /Linked payload/); }
  finally { await unlink(link); }
});
