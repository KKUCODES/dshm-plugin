import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// 实际安装执行器与真实子进程；独立Cordis树，不改用户DSH配置或模型会话。
const installedRoot = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
const installed = path => import(pathToFileURL(resolve(installedRoot, path)).href);
const require = createRequire(resolve(installedRoot, 'apps/cli/package.json'));
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href);
const { default: Subprocess } = await installed('packages/subprocess/subprocess-local/lib/index.js');
const { default: Pwsh } = await installed('packages/shell/pwsh-local/lib/index.js');
const directory = resolve('artifacts/compatibility/foreground-output'); await mkdir(directory, { recursive: true });
const ctx = new Context(), fibers = [];
const report = { at: new Date().toISOString(), cases: [], errors: [] };
try {
  for (const plugin of [Subprocess, Pwsh]) { const fiber = ctx.plugin(plugin, {}); fibers.push(fiber); await fiber.await(); }
  report.executable = ctx.shell.pwshPath;
  const cases = [
    ['version', '[Console]::Write($PSVersionTable.PSVersion.ToString())'],
    ['pipeline', '$PSStyle.OutputRendering = \'Ansi\'; Write-Output "`e[31mDSHM_ANSI_RED`e[0m"'],
    ['console', '[Console]::Write(([char]27) + "[31mDSHM_ANSI_RED" + ([char]27) + "[0m")'],
  ];
  for (const [name, command] of cases) {
    let reader;
    const result = await ctx.shell.run(ctx.shell.resolve({ command, workdir: directory, timeoutMs: 10000,
      signal: new AbortController().signal, observeOutput(output) { reader = output.stdout; } }));
    assert.ok(reader?.readBytesFrom);
    const raw = reader.readBytesFrom(0, 65536);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr.text, '');
    if (name === 'pipeline') assert.equal(raw.bytes.includes(27), false, 'This host pipeline strips ANSI before collection');
    if (name === 'console') assert.equal(raw.bytes.toString(), '\u001b[31mDSHM_ANSI_RED\u001b[0m');
    report.cases.push({ name, result, raw });
  }
} catch (error) { report.errors.push(error.stack); process.exitCode = 1; }
finally {
  for (const fiber of fibers.reverse()) await fiber.dispose();
  await writeFile(resolve(directory, 'native-ansi-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
