import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, stat, utimes } from 'node:fs/promises';
import { writeFileSync, utimesSync, unlinkSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// 使用实际固定发布包的 FsLocal，不替换 stat、watch 或操作系统通知。
const runtime = resolve(import.meta.dirname, '../artifacts/latest-runtime-check');
const source = process.env.DSHM_LATEST_SOURCE_ROOT;
if (source) assert.equal(resolve(source), resolve(import.meta.dirname, '../artifacts/latest-source-check'));
const require = createRequire(resolve(runtime, 'package.json'));
const { Context } = await import(pathToFileURL(source ? resolve(source, 'vendor/cordis/src/index.ts')
  : require.resolve('@deepseek-ai/cordis')).href);
const { LocalFileSystem } = await import(pathToFileURL(source ? resolve(source, 'packages/fs/fs-local/src/index.ts')
  : require.resolve('@deepseek-ai/dsh-fs-local')).href);
const sleep = ms => new Promise(done => setTimeout(done, ms));
async function notified(events, before) {
  const end = Date.now() + 2500;
  while (events.length === before && Date.now() < end) await sleep(25);
  assert.ok(events.length > before, '真实文件版本变化必须通知已准备好的订阅');
  assert.ok(events.slice(before).every(event => event === 'change'));
}

test('Windows FsLocal 监听同大小/同mtime的真实内容变化，并保持路径过滤和关闭语义',
  { skip: process.platform !== 'win32' }, async () => {
    const home = await mkdtemp(resolve(runtime, 'file-watch-regression-'));
    const ctx = new Context();
    const fs = new LocalFileSystem(ctx, { cwd: home, diffBasisMaxBytes: 1048576 });
    const path = resolve(home, 'watched.txt'), sibling = resolve(home, 'sibling.txt');
    const fixed = new Date('2020-01-01T00:00:00.000Z');
    await writeFile(path, 'CONTENT_A'); await utimes(path, fixed, fixed); await readFile(path);
    const target = await fs.resolve(path), controller = new AbortController(), events = [];
    const close = await fs.watch(target, error => events.push(error ?? 'change'), controller.signal);
    try {
      for (const content of ['CONTENT_B', 'CONTENT_A', 'CONTENT_B']) {
        const before = await stat(path, { bigint: true });
        const versionBefore = (await fs.stat(target)).version, count = events.length;
        // 同一事件循环内改写并恢复mtime，避免短暂mtime变化掩盖原过滤问题。
        writeFileSync(path, content); utimesSync(path, before.atime, fixed);
        const after = await stat(path, { bigint: true });
        assert.equal(after.size, before.size); assert.equal(after.mtimeNs, before.mtimeNs);
        assert.notEqual(after.ctimeNs, before.ctimeNs);
        assert.notEqual((await fs.stat(target)).version, versionBefore);
        await notified(events, count); await sleep(80);
      }
      const siblingCount = events.length;
      await writeFile(sibling, 'unrelated'); await sleep(250);
      assert.equal(events.length, siblingCount, '相邻文件不能冒充被订阅文件变化');
      let count = events.length;
      unlinkSync(path); await notified(events, count); await sleep(80);
      count = events.length;
      writeFileSync(path, 'CONTENT_A'); await notified(events, count); await sleep(80);
      const replacement = resolve(home, 'replacement.txt');
      writeFileSync(replacement, 'CONTENT_B'); await sleep(80);
      count = events.length;
      renameSync(replacement, path); await notified(events, count); await sleep(80);
      await close(); await close();
      const closedCount = events.length;
      writeFileSync(path, 'CONTENT_C'); await sleep(250);
      assert.equal(events.length, closedCount, '关闭后不能继续推送变化');
      const aborted = new AbortController(); aborted.abort();
      await assert.rejects(fs.watch(target, () => assert.fail('已取消订阅不能监听'), aborted.signal),
        error => error.name === 'AbortError');
    } finally { controller.abort(); await close(); await ctx.fiber.dispose(); }
  });
