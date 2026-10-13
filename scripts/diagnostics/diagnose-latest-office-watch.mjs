import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, utimes, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync, utimesSync } from 'node:fs';

// 只使用隔离安装的原 FsLocal 和真实文件；不连接手机或修改上游源码。
const runtime = resolve(import.meta.dirname, '../../artifacts/latest-runtime-check');
const require = createRequire(resolve(runtime, 'package.json'));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const { LocalFileSystem } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-fs-local')).href);
const home = await mkdtemp(resolve(runtime, 'office-watch-diagnostic-'));
const synchronous = process.argv.includes('--sync');
assert.ok(process.argv.slice(2).every(arg => arg === '--sync'));
const report = { at: new Date().toISOString(), home, synchronous, scope: 'original-fs-local-ready-watch-real-ctime-change', cases: [] };
const ctx = new Context(), fs = new LocalFileSystem(ctx, { cwd: home, diffBasisMaxBytes: 1048576 });
try {
  for (const restoreMtime of [true, true, true, false]) {
    const path = resolve(home, `case-${report.cases.length}.txt`);
    await writeFile(path, 'CONTENT_A');
    const fixed = new Date('2020-01-01T00:00:00.000Z');
    await utimes(path, fixed, fixed);
    // 原PDF/预览读取会推进atime；该条件使chokidar的旧mtime过滤能稳定复现。
    await readFile(path);
    const target = await fs.resolve(path), controller = new AbortController(), events = [];
    const close = await fs.watch(target, error => events.push(error ? error.message : 'change'), controller.signal);
    try {
      const before = await stat(path, { bigint: true }), versionBefore = (await fs.stat(target)).version;
      if (synchronous) {
        writeFileSync(path, 'CONTENT_B');
        if (restoreMtime) utimesSync(path, before.atime, fixed);
      } else {
        await writeFile(path, 'CONTENT_B');
        if (restoreMtime) await utimes(path, before.atime, fixed);
      }
      const after = await stat(path, { bigint: true }), versionAfter = (await fs.stat(target)).version;
      await new Promise(done => setTimeout(done, 1200));
      assert.equal(before.size, after.size); assert.notEqual(versionBefore, versionAfter);
      if (restoreMtime) assert.equal(before.mtimeNs, after.mtimeNs);
      report.cases.push({ restoreMtime, bytes: Number(after.size), versionBefore, versionAfter,
        atimeNs: String(before.atimeNs), beforeMtimeNs: String(before.mtimeNs), afterMtimeNs: String(after.mtimeNs),
        beforeCtimeNs: String(before.ctimeNs), afterCtimeNs: String(after.ctimeNs), events });
    } finally { controller.abort(); await close(); }
  }
} finally { await ctx.fiber.dispose(); }
await writeFile(resolve(home, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log('[DEBUG-office-watch]', JSON.stringify({ report: resolve(home, 'report.json'),
  cases: report.cases.map(({restoreMtime, events}) => ({ restoreMtime, events })) }));
