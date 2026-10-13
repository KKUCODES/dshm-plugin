// 仅用于隔离原执行器的原生假设验证；不是交付补丁，不作用于模型Host。
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFile, realpath, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const runtime = resolve(import.meta.dirname, '../../artifacts/latest-runtime-check');
const packagePath = resolve(runtime, 'node_modules/@deepseek-ai/dsh-sandbox-windows-acl/package.json');
const runner = resolve(runtime, 'node_modules/@deepseek-ai/dsh-sandbox-windows-acl/lib/runner.js');
if (process.argv[1] && resolve(process.argv[1]) === runner) {
  assert.equal(process.versions.electron, '44.0.0');
  assert.equal(await realpath(runner), runner);
  assert.equal(createHash('sha256').update(await readFile(runner)).digest('hex'),
    '457d7bc97b8fdc2ce9f034cff53b879886fef4c012901fb041b42e0de91f4013');
  const require = createRequire(packagePath), koffi = require('koffi');
  const kernel = koffi.load('kernel32.dll');
  const getCP = kernel.func('uint32 __stdcall GetConsoleOutputCP()');
  const getError = kernel.func('uint32 __stdcall GetLastError()');
  const before = getCP(), initialError = before === 0 ? getError() : 0;
  assert.equal(before, 0); assert.equal(initialError, 6);
  const getStd = kernel.func('void * __stdcall GetStdHandle(int kind)');
  const setStd = kernel.func('int __stdcall SetStdHandle(int kind, void * handle)');
  const fileType = kernel.func('uint32 __stdcall GetFileType(void * handle)');
  const handles = [-10, -11, -12].map(kind => ({ kind, handle: getStd(kind) }));
  // 原执行器关闭stdin时使用NUL字符设备；标准输出与错误仍必须为原管道。
  const standardHandleTypes = handles.map(row => fileType(row.handle));
  assert.ok([2, 3].includes(standardHandleTypes[0]));
  assert.equal(standardHandleTypes[1], 3); assert.equal(standardHandleTypes[2], 3);
  const alloc = kernel.func('int __stdcall AllocConsole()');
  assert.equal(alloc(), 1);
  const getWindow = kernel.func('void * __stdcall GetConsoleWindow()');
  koffi.load('user32.dll').func('int __stdcall ShowWindow(void * window, int command)')(getWindow(), 0);
  const attached = Buffer.alloc(4 * 16);
  const list = kernel.func('uint32 __stdcall GetConsoleProcessList(void * list, uint32 length)');
  assert.equal(list(attached, 16), 1); assert.equal(attached.readUInt32LE(0), process.pid);
  for (const [index, { kind, handle }] of handles.entries()) {
    assert.equal(setStd(kind, handle), 1);
    assert.equal(getStd(kind), handle); assert.equal(fileType(handle), standardHandleTypes[index]);
  }
  assert.equal(kernel.func('int __stdcall SetConsoleOutputCP(uint32 page)')(65001), 1);
  assert.equal(getCP(), 65001);
  assert.ok(process.env.DSHM_OWNED_CONSOLE_ATTEMPT === '2');
  await writeFile(resolve(runtime, 'electron-owned-console-probe-2', `runner-${process.pid}.json`), JSON.stringify({
    pid: process.pid, electron: process.versions.electron, originalCodePage: before, initialError,
    allocatedOwnedConsole: true, attachedPids: [process.pid], standardHandleTypes, originalStdioPipesPreserved: true, outputCodePage: getCP(),
    argvUnchanged: true, tokenAndAclUnchanged: true, diagnosticOnly: true,
  }), { flag: 'wx' });
}
