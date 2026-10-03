import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdtemp, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { outputRoot } from './build.mjs';
import { sourceRoot, applyChange } from '../background-output/prepare.mjs';
import { changes, directory } from './changes.mjs';
import { write } from '../pending-notifications/build-test-runtime.mjs';

const installedRoot = process.env.DSHM_INSTALLED_DSH ?? 'F:/Program Files/deepseek-harness';
const installedRequire = createRequire(resolve(installedRoot, directory, 'package.json'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { if (error.code === 'ESRCH') return false; throw error; } };

async function runtime() {
  const path = resolve(sourceRoot, changes[0].path), original = await readFile(path, 'utf8');
  const result = await build({ stdin: { contents: applyChange(changes[0], original), resolveDir: resolve(sourceRoot, directory, 'src'), loader: 'ts' },
    write: false, bundle: true, format: 'esm', platform: 'node', target: 'es2024',
    plugins: [{ name: 'original-installed-dependencies', setup(builder) {
      builder.onResolve({ filter: /^(?:@deepseek-ai\/|execa$)/ }, args => ({ path: pathToFileURL(installedRequire.resolve(args.path)).href, external: true }));
    } }],
  });
  const target = resolve(outputRoot, 'test-patched.mjs');
  await write(target, result.outputFiles[0].contents);
  return import(pathToFileURL(target));
}

test('补丁：取消结束继承输出管道的子进程', { skip: process.platform !== 'win32', timeout: 15000 }, async () => {
  const { runProfilePnpm } = await runtime();
  const dir = await mkdtemp(resolve(outputRoot, 'cancel-process-'));
  await write(resolve(dir, 'package.json'), '{"name":"dshm-install-cancellation-test","private":true}');
  const childPidFile = resolve(dir, 'child.pid');
  await write(resolve(dir, 'child.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(childPidFile)}, String(process.pid)); setInterval(() => {}, 1000);`);
  await write(resolve(dir, 'parent.mjs'), `import { spawn } from 'node:child_process'; spawn(process.execPath, [${JSON.stringify(resolve(dir, 'child.mjs'))}], { stdio: 'inherit', windowsHide: true }); setInterval(() => {}, 1000);`);
  const abort = new AbortController(); let pid;
  const running = runProfilePnpm({ profile: 'test', dir, cwd: dir, installAnchor: resolve(dir, 'package.json') }, [], {
    command: process.execPath, args: [resolve(dir, 'parent.mjs')], execution: 'service', signal: abort.signal, outputBytes: 1024, activateNewBundles: false,
  });
  try {
    for (let i = 0; i < 100; i++) { try { pid = Number(await readFile(childPidFile, 'utf8')); if (pid > 0) break; } catch (error) { if (error.code !== 'ENOENT') throw error; } await delay(25); }
    assert.ok(pid > 0 && alive(pid));
    abort.abort();
    const result = await running;
    assert.notEqual(result.exitCode, 0); assert.equal(alive(pid), false);
  } finally {
    abort.abort();
    if (pid && alive(pid)) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
    await running;
  }
});

for (const mode of ['cancel', 'timeout']) test(`包信息查询的${mode}结束子进程`, { skip: process.platform !== 'win32', timeout: 15000 }, async () => {
  const { viewProfilePackage } = await runtime();
  const dir = await mkdtemp(resolve(outputRoot, 'lookup-process-'));
  const childPidFile = resolve(dir, 'child.pid');
  await write(resolve(dir, 'child.mjs'), `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(childPidFile)}, String(process.pid)); setInterval(() => {}, 1000);`);
  await write(resolve(dir, 'parent.mjs'), `import { spawn } from 'node:child_process'; spawn(process.execPath, [${JSON.stringify(resolve(dir, 'child.mjs'))}], { stdio: 'inherit', windowsHide: true }); setInterval(() => {}, 1000);`);
  const abort = new AbortController(); let pid;
  const running = viewProfilePackage(dir, 'test-only', { command: process.execPath, args: [resolve(dir, 'parent.mjs')], signal: abort.signal, timeoutMs: mode === 'timeout' ? 1500 : 10000 });
  try {
    for (let i = 0; i < 100; i++) { try { pid = Number(await readFile(childPidFile, 'utf8')); if (pid > 0) break; } catch (error) { if (error.code !== 'ENOENT') throw error; } await delay(25); }
    assert.ok(pid > 0 && alive(pid));
    if (mode === 'cancel') abort.abort();
    const result = await running;
    assert.equal(result.timedOut, mode === 'timeout'); assert.notEqual(result.exitCode, 0); assert.equal(alive(pid), false);
  } finally {
    abort.abort();
    if (pid && alive(pid)) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 5000 });
    await running;
  }
});
