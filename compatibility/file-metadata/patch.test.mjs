import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { changes, directory, outputRoot, install } from './patch.mjs';
import { sourceRoot } from '../background-output/prepare.mjs';

async function bundle(patched) {
  let module;
  runInNewContext(await readFile(resolve(outputRoot, patched ? 'after' : 'before', `${directory}/lib/client.js`), 'utf8'), {
    window: { __ModuleLoader__: { load(entry) { module = entry.factory(() => ({})); } } }, Promise, URL,
  });
  return module;
}
function queue() {
  const items = []; let wake, ended = false;
  return {
    push(value) { items.push(value); wake?.(); },
    async dispose() { ended = true; wake?.(); },
    async *[Symbol.asyncIterator]() {
      while (!ended) {
        if (items.length) yield { value: items.shift(), accept() {} };
        else await new Promise(resolve => { wake = resolve; });
      }
    },
  };
}
async function harness(patched) {
  const feed = queue(), abort = new AbortController(); let provider, release, calls = 0;
  let value = { ok: true, value: { absolutePath: 'Q:/test/file.txt', version: 'v1', bytes: 34 } };
  const remote = { workspaceFiles: { async stat() { calls++; return value; } }, $stream() { return feed; } };
  (await bundle(patched)).apply({ remote, resources: { register(p) { provider = p; return () => abort.abort(); } }, effect(fn) { release = fn(); } });
  const stream = provider.open('dsh-resource://file/session/test/file.txt', { signal: abort.signal })[Symbol.asyncIterator]();
  feed.push({ kind: 'ready' });
  assert.equal((await stream.next()).value.value.bytes, 34);
  return { stream, feed, abort, set(next) { value = next; }, get calls() { return calls; },
    changed(version) { feed.push({ kind: 'change', change: { absolutePath: 'Q:/test/file.txt', version } }); },
    async close() { abort.abort(); await stream.return(); await release(); } };
}
for (const patched of [false, true]) test(`${patched ? '补丁' : '原基线复现'}：实际浏览器模块的版本及字节数`, { timeout: 5000 }, async () => {
  const h = await harness(patched);
  try {
    h.set({ ok: true, value: { absolutePath: 'Q:/test/file.txt', version: 'v2', bytes: 33 } });
    h.changed('v2');
    const next = (await h.stream.next()).value;
    assert.equal(next.value.version, 'v2');
    assert.equal(next.value.bytes, patched ? 33 : 34);
    assert.equal(h.calls, patched ? 2 : 1);
  } finally { await h.close(); }
});
test('同版本去重、消失错误、恢复及取消沿用原 ChangeFeed', { timeout: 5000 }, async () => {
  const h = await harness(true);
  try {
    h.changed('v1');
    h.feed.push({ kind: 'change', change: { absolutePath: 'Q:/test/other.txt', version: 'ignored' } });
    h.set({ ok: false, error: { code: 'workspace-file/not-found' } });
    h.changed('v2');
    assert.equal((await h.stream.next()).value.ok, false);
    assert.equal(h.calls, 2);
    h.feed.push({ kind: 'change', change: { absolutePath: 'Q:/test/file.txt', absent: true } });
    h.set({ ok: true, value: { absolutePath: 'Q:/test/file.txt', version: 'v3', bytes: 100 } });
    h.changed('v3');
    assert.equal((await h.stream.next()).value.value.bytes, 100);
    assert.equal(h.calls, 3);
    h.abort.abort();
    assert.equal((await h.stream.next()).done, true);
  } finally { await h.close(); }
});
test('补丁 TypeScript 源码和编译 provider 均刷新完整 stat', async () => {
  for (const path of [`${directory}/src/client/provider.ts`, `${directory}/lib/types/client/provider.js`]) {
    const text = await readFile(resolve(outputRoot, 'after', path), 'utf8');
    const result = await build({ stdin: { contents: text, loader: path.endsWith('.ts') ? 'ts' : 'js', resolveDir: resolve(sourceRoot, directory, 'src/client') }, bundle: true, write: false, platform: 'node', format: 'cjs',
      alias: { '@deepseek-ai/dsh-typert-protocol': resolve(sourceRoot, 'packages/typert/protocol/src/index.ts'),
        '@deepseek-ai/dsh-util-workspace-path': resolve(sourceRoot, 'packages/util/workspace-path/src/index.ts') } });
    const module = { exports: {} };
    runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, URL });
    let calls = 0, disposed = false;
    const provider = module.exports.createFileResourceProvider({ workspaceFiles: { async stat() {
      calls++; return { ok: true, value: { absolutePath: '/test.txt', version: `v${calls}`, bytes: calls * 10 } };
    } } }, { follow() { return { ready: Promise.resolve(true), bind() {}, dispose() { disposed = true; },
      async *[Symbol.asyncIterator]() { yield { kind: 'changed', version: 'v2' }; } }; } });
    const frames = [];
    for await (const frame of provider.open('dsh-resource://file/session/test/test.txt', { signal: new AbortController().signal })) frames.push(frame);
    assert.equal(frames[1].value.bytes, 20); assert.equal(disposed, true);
  }
});
async function fixture(crlf = false) {
  const root = await mkdtemp(resolve(outputRoot, 'install-test-'));
  await mkdir(resolve(root, directory), { recursive: true });
  await writeFile(resolve(root, directory, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-api-workspace-files', version: '0.1.6-alpha.2' }));
  for (const { path } of changes) {
    const text = (await readFile(resolve(outputRoot, 'before', path), 'utf8')).replaceAll('\r\n', '\n');
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), crlf ? text.replaceAll('\n', '\r\n') : text);
  }
  return root;
}
test('LF/CRLF 安装、幂等、恢复均保留字节', async () => {
  for (const crlf of [false, true]) {
    const root = await fixture(crlf), original = await Promise.all(changes.map(c => readFile(resolve(root, c.path))));
    assert.equal((await install('plan', root)).patched, 0);
    assert.equal((await install('apply', root)).written, 3);
    assert.equal((await install('apply', root)).written, 0);
    assert.equal((await install('restore', root)).written, 3);
    for (const [index, change] of changes.entries()) assert.deepEqual(await readFile(resolve(root, change.path)), original[index]);
  }
});
test('拒绝参考检出及未知修改，并保持其他文件', async () => {
  await assert.rejects(install('apply', sourceRoot), /read-only/);
  const root = await fixture();
  const first = await readFile(resolve(root, changes[0].path));
  await writeFile(resolve(root, changes[2].path), '// user change');
  await assert.rejects(install('apply', root), /Unknown installed/);
  assert.deepEqual(await readFile(resolve(root, changes[0].path)), first);
});
