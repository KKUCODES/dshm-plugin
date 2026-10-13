// 仅供独立package-host-only探针；尚未进入生产补丁或源码租约。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpath, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const runtime = resolve(import.meta.dirname, '../../artifacts/latest-runtime-check');
const require = createRequire(resolve(runtime, 'package.json'));
const { execa } = await import(pathToFileURL(require.resolve('execa')));

/** 原execa的输出、取消和超时仍由调用者处理，Windows仅增加原生进程范围。 */
export function packageExeca(command, args, options) {
  assert.equal(process.platform, 'win32');
  assert.match(relative(resolve(runtime, 'package-host-only'), options.cwd).replaceAll('\\', '/'), /^owned-[^/]+\/profile$/);
  return execa(process.execPath, [fileURLToPath(import.meta.url), '--run', command, JSON.stringify(args)],
    { ...options, ipc: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  assert.equal(process.platform, 'win32');
  const [mode, command, encoded] = process.argv.slice(2);
  assert.equal(process.argv.length, 5);
  assert.ok(['--run', '--target'].includes(mode));
  const cwd = await realpath(process.cwd());
  assert.match(relative(await realpath(resolve(runtime, 'package-host-only')), cwd).replaceAll('\\', '/'), /^owned-[^/]+\/profile$/);
  const args = JSON.parse(encoded); assert.ok(Array.isArray(args) && args.every(arg => typeof arg === 'string'));
  if (mode === '--target') {
    // pnpm.cmd的解析继续走原execa；不自行拼接Windows命令字符串。
    const result = await execa(command, args, { cwd, env: process.env, extendEnv: false,
      stdin: 'inherit', stdout: 'inherit', stderr: 'inherit', cleanup: false, reject: false });
    process.exitCode = result.exitCode ?? 1;
  } else {
    assert.equal(process.connected, true, 'owned package runner requires caller IPC');
    const metadata = JSON.parse(await readFile(require.resolve('@deepseek-ai/dsh-win32-process/package.json')));
    assert.equal(metadata.version, '0.2.1-alpha.1');
    const { loadWin32ProcessBindings, spawnCurrentTokenJobProcess, pollProcessExit,
      isJobEmpty, terminateJob, closeHandleChecked } = await import(pathToFileURL(require.resolve('@deepseek-ai/dsh-win32-process')));
    const api = loadWin32ProcessBindings();
    let target, parentGone = false;
    const onDisconnect = () => {
      parentGone = true;
      if (target) terminateJob(api, target.job, 1);
    };
    process.once('disconnect', onDisconnect);
    const env = { ...process.env };
    delete env.NODE_CHANNEL_FD; delete env.NODE_CHANNEL_SERIALIZATION_MODE;
    try {
      if (!process.connected) throw Error('owned package caller exited before launch');
      // 官方API先挂起创建，加入KILL_ON_JOB_CLOSE范围后才执行用户命令。
      target = spawnCurrentTokenJobProcess(api, { command: process.execPath, applicationName: process.execPath,
        args: [fileURLToPath(import.meta.url), '--target', command, encoded], cwd, env,
        stdio: { stdin: 0, stdout: 1, stderr: 2 } });
      let code;
      while ((code = pollProcessExit(api, target.process)) === undefined || !isJobEmpty(api, target.job))
        await new Promise(done => setTimeout(done, 15));
      process.exitCode = parentGone ? 1 : code;
    } finally {
      if (target) {
        // 异常路径同样先结束范围；不让失败的原生启动降级为无保护安装。
        if (!isJobEmpty(api, target.job)) terminateJob(api, target.job, 1);
        closeHandleChecked(api, target.process, 'owned package target');
        closeHandleChecked(api, target.job, 'owned package range');
      }
      process.off('disconnect', onDisconnect);
      if (process.connected) process.disconnect();
    }
  }
}
