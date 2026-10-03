import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, symlink, lstat, realpath, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { installSource, linkPaths } from './install-source.mjs';
import { changes } from './changes.mjs';
import { changes as backgroundChanges } from '../background-output/changes.mjs';
import { sourceRoot, normalize, applyChange } from '../background-output/prepare.mjs';
import { outputRoot } from './build-test-runtime.mjs';

async function fixture(crlf = false) {
  await mkdir(outputRoot, { recursive: true });
  const root = await mkdtemp(resolve(outputRoot, 'source-install-')), originals = new Map();
  const paths = new Set([...changes, ...backgroundChanges].map(change => change.path));
  for (const path of [...paths]) paths.add(path.replace(/\/(src\/.*|package\.json)$/, '/package.json'));
  for (const file of ['package.json', 'src/index.ts', 'src/store.ts']) paths.add(`packages/core/scope/${file}`);
  for (const path of paths) {
    let text = normalize(await readFile(resolve(sourceRoot, path), 'utf8'));
    const background = backgroundChanges.find(change => change.path === path);
    if (background) text = applyChange(background, text);
    const bytes = Buffer.from(crlf ? text.replaceAll('\n', '\r\n') : text);
    await mkdir(dirname(resolve(root, path)), { recursive: true }); await writeFile(resolve(root, path), bytes);
    originals.set(path, bytes);
  }
  // Resolution checks the existing runtime entry without executing it.
  await mkdir(resolve(root, 'packages/core/scope/lib'), { recursive: true });
  await writeFile(resolve(root, 'packages/core/scope/lib/index.js'), 'export const fixture = true;');
  return { root, originals };
}

for (const crlf of [false, true]) test(`前台源码增量安装/恢复保留后台补丁及${crlf ? 'CRLF' : 'LF'}原字节`, async () => {
  const { root, originals } = await fixture(crlf);
  assert.equal((await installSource('plan', root)).missingLinks, 2);
  assert.equal((await installSource('apply', root)).written, 8);
  assert.equal((await installSource('plan', root)).patched, 8);
  assert.equal((await installSource('apply', root)).written, 0);
  for (const tool of ['tool-bash', 'tool-pwsh']) {
    const selected = createRequire(resolve(root, `packages/shell/${tool}/package.json`)).resolve('@deepseek-ai/dsh-scope');
    assert.equal(await realpath(selected), await realpath(resolve(root, 'packages/core/scope/lib/index.js')));
  }
  assert.equal((await installSource('restore', root)).written, 8);
  assert.equal((await installSource('restore', root)).written, 0);
  for (const [path, original] of originals) assert.deepEqual(await readFile(resolve(root, path)), original);
  for (const path of linkPaths) await assert.rejects(lstat(resolve(root, path)), { code: 'ENOENT' });
});

test('恢复只移除本次创建的依赖，不移除原有正确链接', async () => {
  const { root } = await fixture(), path = resolve(root, linkPaths[0]);
  await mkdir(dirname(path), { recursive: true });
  await symlink(resolve(root, 'packages/core/scope'), path, process.platform === 'win32' ? 'junction' : 'dir');
  await installSource('apply', root); await installSource('restore', root);
  assert.equal((await lstat(path)).isSymbolicLink(), true);
  await assert.rejects(lstat(resolve(root, linkPaths[1])), { code: 'ENOENT' });
});

test('未知源码、前置补丁、scope版本和修改后的源码均拒绝，不写入依赖', async () => {
  for (const type of ['source', 'background', 'scope', 'encoding']) {
    const { root, originals } = await fixture();
    const path = type === 'background' ? backgroundChanges.find(change => !changes.some(foreground => foreground.path === change.path)).path
      : type === 'scope' ? 'packages/core/scope/package.json' : changes.at(-1).path;
    await writeFile(resolve(root, path), type === 'encoding' ? originals.get(path).toString().replace('\n', '\r\n') : 'user change');
    await assert.rejects(installSource('apply', root));
    for (const [file, original] of originals) if (file !== path) assert.deepEqual(await readFile(resolve(root, file)), original);
    for (const link of linkPaths) await assert.rejects(lstat(resolve(root, link)), { code: 'ENOENT' });
  }
  const { root } = await fixture(); await installSource('apply', root);
  await writeFile(resolve(root, changes[0].path), 'later user edit');
  await assert.rejects(installSource('restore', root), /Source mismatch/);
  assert.equal(await readFile(resolve(root, changes[0].path), 'utf8'), 'later user edit');
});

test('错误或悬空链接、越界父目录和只读上游均拒绝', async () => {
  await assert.rejects(installSource('apply', sourceRoot), /read-only/);
  for (const kind of ['wrong', 'dangling', 'parent']) {
    const { root, originals } = await fixture(), other = await fixture();
    const path = resolve(root, kind === 'parent' ? 'packages/shell/tool-pwsh/node_modules' : linkPaths[1]);
    await mkdir(dirname(path), { recursive: true });
    await symlink(kind === 'dangling' ? resolve(root, 'missing') : other.root, path, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      await assert.rejects(installSource('apply', root), /link|Linked/i);
      for (const [file, bytes] of originals) assert.deepEqual(await readFile(resolve(root, file)), bytes);
    } finally { await unlink(path); }
  }
});
