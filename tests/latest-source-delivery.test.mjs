import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { watch } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rename, symlink, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { latestInputs, originalCommand } from '../compatibility/source-start/contract.mjs';
import { sourceRoot, outputRoot } from '../compatibility/latest-upstream/source-runtime.mjs';

const root = resolve(import.meta.dirname, '..');
const candidate = process.env.DSHM_SOURCE_DELIVERY_CANDIDATE;
assert.ok(candidate, '必须显式选择本轮独立候选目录');
const manifest = JSON.parse(await readFile(resolve(candidate, 'manifest.json'), 'utf8'));
const parent = await mkdtemp(resolve(root, 'artifacts/latest-source-delivery/tests-'));
const relocated = resolve(parent, 'standalone');
await cp(candidate, relocated, { recursive: true, errorOnExist: true, force: false });
const { installSourceDelivery: install } = await import(pathToFileURL(resolve(relocated, 'install.mjs')).href);
const baselineFiles = new Map();
for (const path of new Set(['package.json', ...latestInputs.map(([path]) => path), ...manifest.files.map(file => `${file.package}/package.json`)])) {
  if (!manifest.files.some(file => file.path === path)) baselineFiles.set(path,
    execFileSync('git', ['show', `${manifest.sourceCommit}:${path.replace(/^\.\//, '')}`], { cwd: sourceRoot, windowsHide: true }));
}

// 这是安装边界夹具，只复制真实基线文件并保留真实 Git HEAD；不是完整 DSH 运行验收。
async function fixture({ crlf = false } = {}) {
  const target = await mkdtemp(resolve(parent, 'target-'));
  execFileSync('git', ['clone', '--shared', '--no-checkout', '--quiet', sourceRoot, target], { cwd: root, windowsHide: true });
  const paths = new Set(['package.json', ...latestInputs.map(([path]) => path),
    ...manifest.files.flatMap(file => [file.path, `${file.package}/package.json`])]);
  for (const path of paths) {
    let bytes = manifest.files.some(f => f.path === path) ? await readFile(resolve(outputRoot, 'original', path)) : baselineFiles.get(path);
    if (crlf) bytes = Buffer.from(bytes.toString('utf8').replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'));
    await mkdir(dirname(resolve(target, path)), { recursive: true });
    await writeFile(resolve(target, path), bytes);
  }
  const bytes = () => Promise.all([...paths].map(path => readFile(resolve(target, path))));
  return { target, paths, bytes };
}

for (const crlf of [false, true]) test(`relocated standalone CLI installs/restores all files exactly (${crlf ? 'CRLF' : 'LF'})`, async () => {
  const f = await fixture({ crlf }), original = await f.bytes();
  const cli = action => JSON.parse(execFileSync(process.execPath, [resolve(relocated, 'install.mjs'), action, f.target], {
    cwd: parent, encoding: 'utf8', windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: '', NODE_PATH: '' },
  }));
  assert.equal(cli('plan').state, 'original');
  assert.equal(cli('apply').written, manifest.files.length + 3);
  assert.equal(cli('apply').written, 0);
  assert.equal(cli('plan').state, 'patched');
  assert.equal(cli('restore').written, manifest.files.length + 3);
  assert.equal(cli('restore').written, 0);
  assert.deepEqual(await f.bytes(), original);
  await assert.rejects(readFile(resolve(f.target, '.dshm-source/register.mjs')), { code: 'ENOENT' });
  await assert.rejects(readFile(resolve(f.target, '.dshm-source/bootstrap.mjs')), { code: 'ENOENT' });
});

test('unknown final source, startup command or startup payload blocks every write', async () => {
  for (const kind of ['source', 'command', 'startup']) {
    const f = await fixture();
    if (kind === 'source') await writeFile(resolve(f.target, manifest.files.at(-1).path), '// user file\n');
    if (kind === 'command') {
      const path = resolve(f.target, 'package.json');
      await writeFile(path, (await readFile(path, 'utf8')).replace(originalCommand, 'node custom-start.mjs'));
    }
    if (kind === 'startup') {
      await mkdir(resolve(f.target, '.dshm-source'));
      await writeFile(resolve(f.target, '.dshm-source/bootstrap.mjs'), '// user preload\n');
    }
    const original = await f.bytes();
    await assert.rejects(install('apply', f.target), /target_changed|unknown_startup_command|startup_changed/);
    assert.deepEqual(await f.bytes(), original);
  }
});

test('restore preserves a user edit and refuses before changing earlier patched files', async () => {
  const f = await fixture(); await install('apply', f.target);
  await writeFile(resolve(f.target, manifest.files.at(-1).path), '// patched user edit\n');
  const before = await f.bytes();
  await assert.rejects(install('restore', f.target), /target_changed/);
  assert.deepEqual(await f.bytes(), before);
});

test('changed package identity and wrong Git commit are rejected without writes', async () => {
  const f = await fixture(), path = resolve(f.target, 'package.json');
  await writeFile(path, (await readFile(path, 'utf8')).replace('0.2.1-alpha.1', '0.2.1-alpha.2'));
  const before = await f.bytes();
  await assert.rejects(install('apply', f.target), /root_version_mismatch/);
  assert.deepEqual(await f.bytes(), before);
  const otherCommit = execFileSync('git', ['-c', 'user.name=DSHM Test', '-c', 'user.email=test@dshm.invalid',
    'commit-tree', 'HEAD^{tree}', '-p', 'HEAD'], { cwd: f.target, windowsHide: true, encoding: 'utf8', input: 'Wrong target revision fixture\n' }).trim();
  execFileSync('git', ['update-ref', 'HEAD', otherCommit], { cwd: f.target, windowsHide: true });
  await assert.rejects(install('apply', f.target), /commit_mismatch/);
  assert.deepEqual(await f.bytes(), before);
});

test('linked source and startup directories cannot write to another installation', async () => {
  for (const startup of [false, true]) {
    const f = await fixture(), other = await fixture();
    const local = startup ? '.dshm-source' : dirname(manifest.files[0].path), path = resolve(f.target, local);
    if (startup) await mkdir(resolve(other.target, local)); else await rename(path, `${path}.parked`);
    const before = await f.bytes().catch(() => undefined), outside = await other.bytes();
    await symlink(resolve(other.target, local), path, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      await assert.rejects(install('apply', f.target), /Linked target|linked_startup/);
      assert.deepEqual(await other.bytes(), outside);
    } finally {
      await unlink(path);
      if (!startup) await rename(`${path}.parked`, path);
    }
    if (before) assert.deepEqual(await f.bytes(), before);
  }
});

test('tampered payload or forged startup hash cannot be accepted by the standalone installer', async () => {
  const f = await fixture(), before = await f.bytes();
  for (const local of [`payload/patched/${manifest.files.at(-1).path}`, 'payload/startup/register.mjs']) {
    const path = resolve(relocated, local), original = await readFile(path);
    try {
      await writeFile(path, Buffer.concat([original, Buffer.from('// tampered\n')]));
      await assert.rejects(install('apply', f.target), /payload_mismatch/);
      assert.deepEqual(await f.bytes(), before);
    } finally { await writeFile(path, original); }
  }
});

test('known partial installation can be completed and unrelated package settings remain byte exact', async () => {
  const f = await fixture(), first = manifest.files[0], rootPackage = resolve(f.target, 'package.json');
  await writeFile(rootPackage, (await readFile(rootPackage, 'utf8')).replace('"private": true,', '"private": true,\n  "dshmUserNote": "keep byte exact",'));
  const original = await f.bytes();
  await writeFile(resolve(f.target, first.path), await readFile(resolve(relocated, 'payload/patched', first.path)));
  assert.equal((await install('plan', f.target)).state, 'partial');
  assert.equal((await install('apply', f.target)).written, manifest.files.length + 2);
  await install('restore', f.target);
  assert.deepEqual(await f.bytes(), original);
});

test('actual concurrent late-file edit rolls back earlier writes and preserves the external edit', async () => {
  const f = await fixture(), first = manifest.files[0].path, last = manifest.files.at(-1).path;
  const original = new Map(await Promise.all([...f.paths].map(async path => [path, await readFile(resolve(f.target, path))])));
  const firstAfter = await readFile(resolve(relocated, 'payload/patched', first));
  const external = Buffer.from('// real concurrent user edit\n');
  let watcher, timer, mutating = false;
  const changed = new Promise((done, fail) => {
    timer = setTimeout(() => fail(Error('No actual first-file write observed')), 10000);
    watcher = watch(dirname(resolve(f.target, first)), async (_event, name) => {
      if (String(name) !== first.split('/').at(-1) || mutating) return;
      try {
        if (!(await readFile(resolve(f.target, first))).equals(firstAfter)) return;
        mutating = true;
        await writeFile(resolve(f.target, last), external);
        done(true);
      } catch (error) { fail(error); }
    });
  });
  try {
    const result = install('apply', f.target).then(() => { throw Error('Concurrent edit unexpectedly accepted'); }, error => error);
    const [error] = await Promise.all([result, changed]);
    assert.match(error.message, /concurrent_change/);
    assert.equal(mutating, true);
    for (const path of f.paths) assert.deepEqual(await readFile(resolve(f.target, path)), path === last ? external : original.get(path));
  } finally { clearTimeout(timer); watcher.close(); }
});
