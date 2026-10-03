import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFile, writeFile, unlink } from 'node:fs/promises';

// 仅固定样例走已安装的真实沙箱；不改宿主配置、不调用模型、不放宽语言或文件权限。
assert.equal(process.env.DSHM_RUN_LIVE, '1');
const root = 'F:/Program Files/deepseek-harness';
const runCase = process.env.DSHM_ENCODING_CASE || 'direct';
assert.match(runCase, /^[a-z0-9-]+$/);
const patchedRunner = ['patched-runner', 'patched-runner-win51'].includes(runCase);
const legacy = runCase === 'patched-runner-win51';
const localCase = runCase === 'patched-local';
const require = createRequire(pathToFileURL(`${root}/packages/shell/pwsh-sandbox/package.json`));
const load = name => import(pathToFileURL(require.resolve(name)).href);
const { Context } = await load('@deepseek-ai/cordis');
const { SessionProjectionRegistry } = await load('@deepseek-ai/dsh-session-projection');
const { LocalSandboxProvider } = await load('@deepseek-ai/dsh-sandbox-local');
const { SandboxPolicyService } = await load('@deepseek-ai/dsh-sandbox-policy');
const { default: LocalSubprocessRuntime } = await load('@deepseek-ai/dsh-subprocess-local');
const { SandboxPwshExecutor } = await load('@deepseek-ai/dsh-pwsh-sandbox');
const { resolvePwshPath } = await load('@deepseek-ai/dsh-pwsh-local');
const patchRoot = resolve('artifacts/compatibility/pwsh-output-encoding');
const patchedLocal = patchedRunner || localCase
  ? await import(pathToFileURL(resolve(patchRoot, 'packages/shell/pwsh-local/lib/index.js')).href) : null;
const patchedPreamble = patchedLocal?.ENCODING_PREAMBLE ?? null;
if (runCase === 'prelaunch-utf8') {
  // 只允许由本专项创建的独立隐藏控制台，不能更改用户现有终端的代码页。
  assert.equal(process.env.DSHM_PROBE_PRIVATE_CONSOLE, '1');
  const nativeRequire = createRequire(pathToFileURL(`${root}/packages/subprocess/win32-process/package.json`));
  const koffi = nativeRequire('koffi');
  const kernel = koffi.load('kernel32.dll');
  const setOutputCodePage = kernel.func('int __stdcall SetConsoleOutputCP(unsigned int codePage)');
  assert.notEqual(setOutputCodePage(65001), 0);
}
// 候选只在诊断子进程替换编码前缀，原 SandboxPwshExecutor 的 confine/权限/终止链保留。
const NativeEncodingExecutor = class extends SandboxPwshExecutor {
  argv(spec) {
    const argv = super.argv(spec);
    assert.ok(argv.at(-1).endsWith(spec.command));
    argv[argv.length - 1] = patchedPreamble !== null ? patchedPreamble + spec.command : runCase === 'prelaunch-utf8' ? spec.command
      : '& "$env:SystemRoot\\System32\\chcp.com" 65001 > $null; ' + spec.command;
    return argv;
  }
};
const ctx = new Context(), scopes = [];
const pwshPath = legacy ? resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe') : resolvePwshPath();
const report = { at: new Date().toISOString(), runCase, program: pwshPath, runs: [] };
const cwd = resolve('../DSH-TEST');
try {
  const Executor = localCase ? patchedLocal.PwshLocalExecutor
    : patchedRunner || ['native-codepage', 'prelaunch-utf8'].includes(runCase) ? NativeEncodingExecutor : SandboxPwshExecutor;
  for (const [plugin, config] of [[SessionProjectionRegistry, undefined], [LocalSandboxProvider, {}], [SandboxPolicyService, { mode: 'read-only', workspaceRoot: cwd }], [LocalSubprocessRuntime, undefined], [Executor, { pwshPath }]]) {
    const scope = ctx.plugin(plugin, config); scopes.push(scope); await scope.await();
  }
  if (patchedRunner) ctx.sandbox.internals.windowsAclRunnerEntry = resolve(patchRoot, 'packages/sandbox/sandbox-windows-acl/lib/runner.js');
  for (let index = 0; index < 2; index++) {
    let output;
    const result = await ctx.shell.run(ctx.shell.resolve({ command: "Write-Output 'DSHM_ENCODING_中文'; [Console]::OutputEncoding.CodePage; $ExecutionContext.SessionState.LanguageMode; $PSVersionTable.PSVersion; Write-Error 'DSHM_ENCODING_错误'", workdir: cwd,
      sandboxPolicy: { mode: 'read-only', workspaceRoot: cwd }, timeoutMs: 10000, observeOutput: value => { output = value; } }));
    assert.ok(output, 'Installed foreground reader must be available');
    const read = reader => {
      const bytes = Buffer.from(reader.readBytesFrom(0, 65536).bytes);
      return { bytes: bytes.length, utf8: bytes.toString('utf8'), gb18030: new TextDecoder('gb18030').decode(bytes) };
    };
    report.runs.push({ exitCode: result.exitCode, sandbox: result.sandbox, stdout: read(output.stdout), stderr: read(output.stderr),
      finalStdout: result.stdout.text, finalStderr: result.stderr.text });
    if (localCase) {
      assert.ok(result.stdout.text.includes('DSHM_ENCODING_中文'));
      assert.ok(result.stdout.text.includes('FullLanguage'));
      assert.equal(result.stderr.text.trim(), 'Write-Error: DSHM_ENCODING_错误');
      assert.equal(result.exitCode, 1);
    }
    if (patchedRunner) {
      assert.ok(result.stdout.text.includes('DSHM_ENCODING_中文'));
      assert.ok(result.stdout.text.includes('65001'));
      assert.ok(result.stdout.text.includes('ConstrainedLanguage'));
      if (legacy) { assert.ok(result.stderr.text.includes('DSHM_ENCODING_错误')); assert.ok(!result.stderr.text.includes('InvalidOperation')); }
      else assert.equal(result.stderr.text.trim(), 'Write-Error: DSHM_ENCODING_错误');
      assert.equal(result.sandbox.mode, 'read-only'); assert.equal(result.exitCode, 1);
      assert.ok(!result.stdout.text.includes('\ufffd')); assert.ok(!result.stderr.text.includes('\ufffd'));
    }
  }
  if (patchedRunner) {
    const canary = resolve(cwd, `dshm-encoding-boundary-${Date.now()}.txt`), original = 'DSHM_ENCODING_CANARY';
    await writeFile(canary, original, { flag: 'wx' });
    try {
      const command = `try { Set-Content -LiteralPath '${canary.replaceAll("'", "''")}' -Value 'modified' -ErrorAction Stop; 'WRITE_ALLOWED' } catch { 'WRITE_DENIED' }; [Console]::WriteLine('TYPE_ALLOWED')`;
      const result = await ctx.shell.run(ctx.shell.resolve({ command, workdir: cwd,
        sandboxPolicy: { mode: 'read-only', workspaceRoot: cwd }, timeoutMs: 10000 }));
      assert.equal(await readFile(canary, 'utf8'), original);
      assert.ok(result.stdout.text.includes('WRITE_DENIED')); assert.ok(!result.stdout.text.includes('TYPE_ALLOWED'));
      assert.match(result.stderr.text, /InvalidOperation|MethodInvocationNotSupportedInConstrainedLanguage/); assert.ok(!result.stderr.text.includes('\ufffd'));
      report.boundary = { writeDenied: true, canaryUnchanged: true, languageRestrictionRetained: true,
        stdout: result.stdout.text, stderr: result.stderr.text, exitCode: result.exitCode };
    } finally { await unlink(canary); }
  }
} catch (error) { report.failure = error.message; process.exitCode = 1; }
finally {
  for (const scope of scopes.toReversed()) await scope.dispose();
  await writeFile(`artifacts/pwsh-encoding-${runCase}.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
