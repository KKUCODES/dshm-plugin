// 固定新版执行器的实际输出检查；不读取模型配置，不改变语言或文件权限。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { originalPreamble, encodingPreamble } from '../compatibility/latest-upstream/pwsh-encoding-changes.mjs';

assert.equal(process.platform, 'win32');
assert.equal(process.env.DSHM_RUN_LIVE, '1');
const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const sourceMode = process.env.DSHM_ENCODING_SOURCE === '1';
const source = resolve(root, 'artifacts/latest-source-check');
const require = createRequire(resolve(runtime, 'package.json'));
const sourcePackages = {
  cordis: 'vendor/cordis', 'dsh-session-projection': 'packages/session/session-projection',
  'dsh-sandbox-local': 'packages/sandbox/sandbox-local', 'dsh-sandbox-policy': 'packages/sandbox/sandbox-policy',
  'dsh-subprocess-local': 'packages/subprocess/subprocess-local', 'dsh-pwsh-local': 'packages/shell/pwsh-local',
  'dsh-pwsh-sandbox': 'packages/shell/pwsh-sandbox', 'dsh-sandbox-windows-acl': 'packages/sandbox/sandbox-windows-acl',
};
const variant = process.env.DSHM_ENCODING_VARIANT ?? 'original';
assert.ok(['original', 'guard', 'guard-prelaunch', 'installed'].includes(variant));
const runLabel = process.argv[2]?.slice('--run='.length);
assert.ok(process.argv.length === 2 || process.argv.length === 3 && ['--run=electron-encoding-2', '--run=electron-encoding-3', '--run=electron-owned-console-probe', '--run=electron-owned-console-probe-2'].includes(process.argv[2]));
const noConsole = process.env.DSHM_ENCODING_NO_CONSOLE === '1';
if (noConsole) assert.ok(variant === 'installed' && (sourceMode && ['electron-encoding-2', 'electron-encoding-3'].includes(runLabel)
  || !sourceMode && ['electron-owned-console-probe', 'electron-owned-console-probe-2'].includes(runLabel)));
if (variant === 'guard-prelaunch') assert.equal(process.env.DSHM_PRIVATE_CONSOLE, '1');
let consoleEvidence;
let resetPrivateConsole;
const consoleSamples = [];
if (noConsole) {
  const nativeRequire = createRequire(sourceMode ? resolve(source, 'packages/subprocess/win32-process/package.json')
    : require.resolve('@deepseek-ai/dsh-win32-process/package.json'));
  const kernel = nativeRequire('koffi').load('kernel32.dll');
  const getCodePage = kernel.func('unsigned int __stdcall GetConsoleOutputCP()');
  const getError = kernel.func('unsigned int __stdcall GetLastError()');
  const outputCodePage = getCodePage(), error = outputCodePage === 0 ? getError() : 0;
  assert.equal(outputCodePage, 0); assert.equal(error, 6);
  consoleEvidence = { ownedPid: process.pid, noConsole: true, outputCodePage, error,
    electron: process.versions.electron ?? null, node: process.versions.node };
}
if (process.env.DSHM_PRIVATE_CONSOLE === '1') {
  // 先脱离继承的控制台，再验证独占新控制台；不能更改用户终端的代码页。
  const nativeRequire = createRequire(sourceMode ? resolve(source, 'packages/subprocess/win32-process/package.json')
    : require.resolve('@deepseek-ai/dsh-win32-process/package.json'));
  const koffi = nativeRequire('koffi');
  const kernel = koffi.load('kernel32.dll');
  const free = kernel.func('int __stdcall FreeConsole()');
  const alloc = kernel.func('int __stdcall AllocConsole()');
  const list = kernel.func('unsigned int __stdcall GetConsoleProcessList(void *list, unsigned int length)');
  const setCodePage = kernel.func('int __stdcall SetConsoleOutputCP(unsigned int codePage)');
  const getCodePage = kernel.func('unsigned int __stdcall GetConsoleOutputCP()');
  const window = kernel.func('void * __stdcall GetConsoleWindow()');
  const hide = koffi.load('user32.dll').func('int __stdcall ShowWindow(void *window, int command)');
  assert.notEqual(free(), 0); assert.notEqual(alloc(), 0);
  hide(window(), 0);
  const pids = Buffer.alloc(16 * 4);
  assert.equal(list(pids, 16), 1); assert.equal(pids.readUInt32LE(0), process.pid);
  assert.notEqual(setCodePage(936), 0); assert.equal(getCodePage(), 936);
  resetPrivateConsole = async () => {
    // 原结果可以先于Windows控制台释放结算；等待原子进程退出，不更改仍附着的进程代码页。
    const deadline = Date.now() + 2000;
    let count;
    do {
      count = list(pids, 16);
      assert.ok(count >= 1 && count <= 16);
      const attached = Array.from({ length: count }, (_, index) => pids.readUInt32LE(index * 4));
      if (consoleSamples.at(-1)?.pids.join(',') !== attached.join(','))
        consoleSamples.push({ pids: attached });
      assert.ok(attached.includes(process.pid));
      if (count === 1) break;
      await new Promise(done => setTimeout(done, 25));
    } while (Date.now() < deadline);
    assert.equal(count, 1); assert.equal(pids.readUInt32LE(0), process.pid);
    assert.notEqual(setCodePage(936), 0); assert.equal(getCodePage(), 936);
    if (variant === 'guard-prelaunch') {
      assert.notEqual(setCodePage(65001), 0); assert.equal(getCodePage(), 65001);
    }
    return getCodePage();
  };
  consoleEvidence = { ownedPid: process.pid, attachedPids: [process.pid], initialOutputCodePage: 936 };
}
const load = name => {
  if (sourceMode) {
    assert.ok(Object.hasOwn(sourcePackages, name));
    return import(pathToFileURL(resolve(source, sourcePackages[name], 'lib/index.js')).href);
  }
  return import(pathToFileURL(require.resolve('@deepseek-ai/' + name)).href);
};
for (const name of ['dsh-pwsh-local', 'dsh-pwsh-sandbox', 'dsh-sandbox-windows-acl']) {
  const pkg = sourceMode ? JSON.parse(await readFile(resolve(source, sourcePackages[name], 'package.json'), 'utf8'))
    : require('@deepseek-ai/' + name + '/package.json');
  assert.equal(pkg.name, '@deepseek-ai/' + name); assert.equal(pkg.version, '0.2.1-alpha.1');
}
const [{ Context }, { default: Projections }, { default: Sandbox }, { default: Policy },
  { default: Subprocess }, local, { default: SandboxPwsh }] = await Promise.all([
  'cordis', 'dsh-session-projection', 'dsh-sandbox-local', 'dsh-sandbox-policy',
  'dsh-subprocess-local', 'dsh-pwsh-local', 'dsh-pwsh-sandbox',
].map(load));
assert.equal(local.ENCODING_PREAMBLE, variant === 'installed' ? encodingPreamble : originalPreamble);
const parent = resolve(runtime, 'encoding-check'); await mkdir(parent, { recursive: true });
const scratch = await mkdtemp(resolve(parent, 'case-'));
const report = { at: new Date().toISOString(), target: '0.2.1-alpha.1',
  variant, executionMode: sourceMode ? 'source-built' : 'npm', privateConsole: process.env.DSHM_PRIVATE_CONSOLE === '1',
  consoleEvidence, consoleSamples, inferenceVerified: false, cases: [], passed: false };
const guardedPreamble = "if ($ExecutionContext.SessionState.LanguageMode -eq 'FullLanguage') { "
  + local.ENCODING_PREAMBLE + '} ';
const guard = Base => class extends Base {
  argv(spec) {
    const argv = super.argv(spec);
    assert.equal(argv.at(-1), local.ENCODING_PREAMBLE + spec.command);
    argv[argv.length - 1] = guardedPreamble + spec.command;
    return argv;
  }
};
try {
  for (const version of ['7', '5.1']) for (const sandbox of [false, true]) {
    const ctx = new Context();
    const program = version === '7' ? local.resolvePwshPath()
      : resolve(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
    const item = { version, sandbox, program, passed: false };
    try {
      for (const [plugin, config] of [[Projections, {}], [Subprocess, {}],
        ...(sandbox ? [[Sandbox, {}], [Policy, { mode: 'read-only', workspaceRoot: scratch }]] : []),
        [['guard', 'guard-prelaunch'].includes(variant) ? guard(sandbox ? SandboxPwsh : local.default)
          : sandbox ? SandboxPwsh : local.default, { pwshPath: program }]]) {
        const fiber = ctx.plugin(plugin, config); await fiber.await();
      }
      for (let index = 0; index < 2; index++) {
        // 普通执行器会把共享控制台改为65001；每次恢复936，避免后续沙箱假通过。
        const launchConsoleOutputCodePage = await resetPrivateConsole?.();
        const execution = await ctx.shell.execute(ctx.shell.resolve({
          command: "Write-Output 'DSHM_ENCODING_中文🙂'; Write-Output $ExecutionContext.SessionState.LanguageMode; Write-Output ([Console]::OutputEncoding.CodePage); Write-Error 'DSHM_ENCODING_错误🙂' -ErrorAction Continue",
          workdir: scratch, timeoutMs: 10000,
          ...(sandbox ? { sandboxPolicy: { mode: 'read-only', workspaceRoot: scratch } } : {}),
        }));
        const result = await execution.result();
        const observed = { stdout: execution.observed.stdout.readFrom(0).text,
          stderr: execution.observed.stderr.readFrom(0).text };
        (item.runs ??= []).push({ index, launchConsoleOutputCodePage, exitCode: result.exitCode, sandbox: result.sandbox,
          stdout: result.stdout.text, stderr: result.stderr.text, observed });
      }
      item.outputCorrect = item.runs.every(run => run.stdout.includes('DSHM_ENCODING_中文🙂')
        && run.stderr.includes('DSHM_ENCODING_错误🙂') && !run.stdout.includes('\ufffd') && !run.stderr.includes('\ufffd'));
      item.originalAndObservedAgree = item.runs.every(run => run.stdout === run.observed.stdout
        && run.stderr === run.observed.stderr);
      item.noInitializationErrors = item.runs.every(run => !/InvalidOperation|MethodInvocationNotSupportedInConstrainedLanguage|CannotCreateTypeConstrainedLanguage/i.test(run.stderr));
      item.originalLanguageRetained = item.runs.every(run => run.stdout.includes(sandbox ? 'ConstrainedLanguage' : 'FullLanguage'));
      item.originalReadOnlyModeRetained = !sandbox || item.runs.every(run => run.sandbox?.mode === 'read-only');
      if (sandbox) {
        const canary = resolve(scratch, 'encoding-canary-' + version + '.txt');
        await writeFile(canary, 'DSHM_ORIGINAL', { flag: 'wx' });
        const result = await (await ctx.shell.execute(ctx.shell.resolve({
          command: "try { Set-Content -LiteralPath '" + canary.replaceAll("'", "''")
            + "' -Value 'unexpected' -ErrorAction Stop; 'WRITE_ALLOWED' } catch { 'WRITE_DENIED' }; [Console]::WriteLine('TYPE_ALLOWED')",
          workdir: scratch, timeoutMs: 10000, sandboxPolicy: { mode: 'read-only', workspaceRoot: scratch },
        }))).result();
        item.writeDenied = result.stdout.text.includes('WRITE_DENIED')
          && await readFile(canary, 'utf8') === 'DSHM_ORIGINAL';
        item.languageRestrictionRetained = !result.stdout.text.includes('TYPE_ALLOWED')
          && /MethodInvocationNotSupportedInConstrainedLanguage|InvalidOperation/i.test(result.stderr.text);
      }
      item.passed = item.outputCorrect && item.noInitializationErrors && item.originalLanguageRetained
        && item.originalAndObservedAgree && item.originalReadOnlyModeRetained
        && (!sandbox || item.writeDenied && item.languageRestrictionRetained);
    } catch (error) { item.failure = { name: error.name, code: error.code ?? 'validation_failed',
      ...(typeof error.actual === 'number' ? { actual: error.actual, expected: error.expected } : {}) }; }
    finally { await ctx.fiber.dispose(); report.cases.push(item); }
  }
  report.passed = report.cases.length === 4 && report.cases.every(item => item.passed);
} finally {
  assert.equal(scratch.startsWith(parent + '\\'), true);
  await rm(scratch, { recursive: true, force: true });
  report.scratchRemoved = true;
  const reportName = (sourceMode ? 'source-' : '') + (report.privateConsole ? 'private-console-' : noConsole ? 'no-console-' : '')
    + (runLabel ? runLabel + '-' + (process.versions.electron ? 'electron-' : 'node-') : '') + variant + '.json';
  await writeFile(resolve(parent, reportName), JSON.stringify(report, null, 2), runLabel ? { flag: 'wx' } : undefined);
  console.log(JSON.stringify({ passed: report.passed, variant, privateConsole: report.privateConsole,
    cases: report.cases.map(({ version, sandbox, passed, outputCorrect, noInitializationErrors, originalLanguageRetained, writeDenied, failure }) =>
      ({ version, sandbox, passed, outputCorrect, noInitializationErrors, originalLanguageRetained, writeDenied, failure })) }));
  if (!report.passed) process.exitCode = 1;
}
