import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { sourceRoot, applySourceChange } from '../compatibility/latest-upstream/source-runtime.mjs';
import { sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { sourceEncodingChanges, transformEncodingRunner } from '../compatibility/latest-upstream/pwsh-encoding-changes.mjs';

async function originalRunner() {
  const change = sourceEncodingChanges.find(row => row.path.endsWith('/runner.ts'));
  const before = execFileSync('git', ['show', sourceCommit + ':' + change.path],
    { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' });
  const after = applySourceChange(change, before);
  const anchor = '  const api = await win32()\n';
  const tail = '  // Ignore this process';
  assert.equal(after.slice(after.indexOf(tail)), before.slice(before.indexOf(tail)), 'original confinement and cleanup remain exact');
  return after.slice(after.indexOf(anchor) + anchor.length, after.indexOf(tail));
}

function invoke(code, { command = 'pwsh.exe', codePage = 0, error = 6, accepted = 1,
  allocAccepted = 1, failingSelector, freeAccepted = 1 } = {}) {
  const calls = [];
  const exits = [], handles = new Map([-10, -11, -12].map(selector => [selector, 'original-' + selector]));
  const api = {
    getConsoleOutputCP: () => { calls.push('get'); return codePage; },
    getLastError: () => { calls.push('error'); return error; },
    setConsoleOutputCP: value => { calls.push(['set', value]); return accepted; },
    getStdHandle: selector => { calls.push(['getStd', selector]); return handles.get(selector); },
    allocConsole: () => { calls.push('allocate'); return allocAccepted; },
    freeConsole: () => { calls.push('free'); return freeAccepted; },
    getConsoleWindow: () => 'owned-window',
    showWindow: (window, command) => { calls.push(['hide', window, command]); return 0; },
    setStdHandle: (selector, handle) => {
      calls.push(['restoreStd', selector, handle]);
      return selector === failingSelector ? 0 : 1;
    },
  };
  let failure;
  try { vm.runInNewContext(code, { parsed: { command }, api, fail: detail => { throw Error(detail); },
    process: { once: (event, callback) => { assert.equal(event, 'exit'); exits.push(callback); },
      stderr: { write: text => calls.push(['cleanupWarning', text]) } } }); }
  catch (caught) { failure = caught.message; }
  return { calls, failure, finish: () => { for (const callback of exits) callback(); } };
}

test('the real runner owns a hidden console and restores all original handles before setting UTF-8', async () => {
  const result = invoke(await originalRunner());
  assert.equal(result.failure, undefined);
  assert.deepEqual(result.calls, ['get', 'error', ['getStd', -10], ['getStd', -11], ['getStd', -12], 'allocate',
    ['hide', 'owned-window', 0], ['restoreStd', -10, 'original--10'], ['restoreStd', -11, 'original--11'],
    ['restoreStd', -12, 'original--12'], ['set', 65001]]);
  result.finish(); assert.equal(result.calls.at(-1), 'free');
});

test('an attached console is configured before execution, regardless of its current code page', async () => {
  const code = await originalRunner();
  for (const codePage of [437, 936, 65001]) {
    const result = invoke(code, { codePage });
    assert.equal(result.failure, undefined);
    assert.deepEqual(result.calls, ['get', ['set', 65001]]);
    result.finish(); assert.equal(result.calls.includes('free'), false);
  }
});

test('other GetConsoleOutputCP failures and every SetConsoleOutputCP failure still reject', async () => {
  const code = await originalRunner();
  for (const error of [0, 5, 87]) assert.equal(invoke(code, { error }).failure, `GetConsoleOutputCP failed (Win32 ${error})`);
  for (const error of [6, 5, 87]) assert.equal(invoke(code, { codePage: 936, accepted: 0, error }).failure, `SetConsoleOutputCP failed (Win32 ${error})`);
});

test('allocation and standard-handle failures reject before UTF-8 setup or original command execution', async () => {
  const code = await originalRunner();
  const allocation = invoke(code, { allocAccepted: 0 });
  assert.equal(allocation.failure, 'AllocConsole failed (Win32 6)');
  allocation.finish(); assert.equal(allocation.calls.includes('free'), false);
  for (const failingSelector of [-10, -11, -12]) {
    const result = invoke(code, { failingSelector });
    assert.equal(result.failure, 'SetStdHandle failed (Win32 6)');
    assert.equal(result.calls.some(row => Array.isArray(row) && row[0] === 'set'), false);
    result.finish(); assert.equal(result.calls.at(-1), 'free');
  }
  const cleanup = invoke(code, { freeAccepted: 0 }); cleanup.finish();
  assert.equal(cleanup.failure, undefined);
  assert.equal(cleanup.calls.at(-1)[0], 'cleanupWarning');
});

test('only exact PowerShell executable names use the encoding boundary', async () => {
  const code = await originalRunner();
  for (const command of ['pwsh', 'powershell.exe', 'C:\\Program Files\\PowerShell\\7\\pwsh.exe', 'C:/Windows/powershell.EXE']) {
    assert.equal(invoke(code, { command }).calls.includes('allocate'), true);
  }
  for (const command of ['node.exe', 'not-pwsh.exe', 'pwsh.exe.backup', 'pwsh-script', 'C:/pwsh.exe/node.exe']) {
    assert.deepEqual(invoke(code, { command }).calls, []);
  }
});

test('compiled insertion preserves the same refusal contract and rejects changed anchors', () => {
  const anchor = '\tconst api = await win32();\n';
  const after = transformEncodingRunner(anchor, true).slice(anchor.length);
  assert.equal(invoke(after).failure, undefined);
  assert.equal(invoke(after, { codePage: 936, accepted: 0, error: 5 }).failure, 'SetConsoleOutputCP failed (Win32 5)');
  assert.throws(() => transformEncodingRunner('unknown'), /anchor_changed/);
  assert.throws(() => transformEncodingRunner(anchor + anchor, true), /anchor_changed/);
});
