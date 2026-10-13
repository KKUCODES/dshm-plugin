// 与新版原语言、token和进程契约组合；这里只变换已核对的编码边界。
export const originalPreamble = '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); ';
export const encodingPreamble = 'if ($ExecutionContext.SessionState.LanguageMode -eq "FullLanguage") { ' + originalPreamble + '}; ';
const once = (source, before, after) => {
  if (source.split(before).length !== 2) throw Error('latest_encoding_anchor_changed');
  return source.replace(before, after);
};
export function transformEncodingPreamble(source, compiled = false) {
  return once(source, compiled ? JSON.stringify(originalPreamble) : "'" + originalPreamble + "'",
    compiled ? JSON.stringify(encodingPreamble) : "'" + encodingPreamble + "'");
}
export function transformEncodingBindings(source, compiled = false) {
  if (!compiled) source = once(source, '  setConsoleCtrlHandler(handler: null, add: number): number',
    '  setConsoleCtrlHandler(handler: null, add: number): number\n  getConsoleOutputCP(): number\n  setConsoleOutputCP(codePage: number): number\n  allocConsole(): number\n  freeConsole(): number\n  getConsoleWindow(): NativePtr\n  setStdHandle(selector: number, handle: NativePtr): number\n  showWindow(window: NativePtr, command: number): number');
  const binding = compiled
    ? '\t\tsetConsoleCtrlHandler: bind(kernel32, "SetConsoleCtrlHandler", "int", [PVOID, "int"]),'
    : "    setConsoleCtrlHandler: bind(kernel32, 'SetConsoleCtrlHandler', 'int', [PVOID, 'int']),";
  return once(source, binding, binding + (compiled
    ? '\n\t\tgetConsoleOutputCP: bind(kernel32, "GetConsoleOutputCP", "uint32", []),\n\t\tsetConsoleOutputCP: bind(kernel32, "SetConsoleOutputCP", "int", ["uint32"]),\n\t\tallocConsole: bind(kernel32, "AllocConsole", "int", []),\n\t\tfreeConsole: bind(kernel32, "FreeConsole", "int", []),\n\t\tgetConsoleWindow: bind(kernel32, "GetConsoleWindow", PVOID, []),\n\t\tsetStdHandle: bind(kernel32, "SetStdHandle", "int", ["int", PVOID]),\n\t\tshowWindow: bind(koffi.load("user32.dll"), "ShowWindow", "int", [PVOID, "int"]),'
    : "\n    getConsoleOutputCP: bind(kernel32, 'GetConsoleOutputCP', 'uint32', []),\n    setConsoleOutputCP: bind(kernel32, 'SetConsoleOutputCP', 'int', ['uint32']),\n    allocConsole: bind(kernel32, 'AllocConsole', 'int', []),\n    freeConsole: bind(kernel32, 'FreeConsole', 'int', []),\n    getConsoleWindow: bind(kernel32, 'GetConsoleWindow', PVOID, []),\n    setStdHandle: bind(kernel32, 'SetStdHandle', 'int', ['int', PVOID]),\n    showWindow: bind(koffi.load('user32.dll'), 'ShowWindow', 'int', [PVOID, 'int']),"));
}
export function transformEncodingRunner(source, compiled = false) {
  const anchor = compiled ? '\tconst api = await win32();\n' : '  const api = await win32()\n';
  const indent = compiled ? '\t' : '  ';
  const end = compiled ? ';' : '';
  return once(source, anchor, anchor + [
    '// 受限PowerShell不能构造编码类型；附有控制台时在子进程启动前设置UTF-8。',
    '// Electron没有控制台；仅为执行器分配隐藏控制台，并保留原stdin/stdout/stderr。',
    '// 保留原token、ACL、语言限制、stdio和失败即拒绝执行的契约。',
    'if (/(?:^|[\\\\/])(?:pwsh|powershell)(?:\\.exe)?$/i.test(parsed.command)) {',
    '  const outputCodePage = api.getConsoleOutputCP()' + end,
    '  if (outputCodePage === 0) {',
    '    const error = api.getLastError()' + end,
    '    if (error !== 6) fail(`GetConsoleOutputCP failed (Win32 ${error})`)' + end,
    '    const handles = [-10, -11, -12].map(selector => ({ selector, handle: api.getStdHandle(selector) }))' + end,
    '    if (api.allocConsole() === 0) fail(`AllocConsole failed (Win32 ${api.getLastError()})`)' + end,
    '    // 无论子进程结算或早期失败，执行器退出时释放自己分配的控制台。',
    "    process.once('exit', () => {",
    '      if (api.freeConsole() === 0) process.stderr.write(`windows-acl-run: cleanup: FreeConsole failed (Win32 ${api.getLastError()})\\n`)' + end,
    '    })' + end,
    '    api.showWindow(api.getConsoleWindow(), 0)' + end,
    '    for (const { selector, handle } of handles) {',
    '      if (api.setStdHandle(selector, handle) === 0) fail(`SetStdHandle failed (Win32 ${api.getLastError()})`)' + end,
    '    }',
    '  }',
    '  if (api.setConsoleOutputCP(65001) === 0) {',
    '    fail(`SetConsoleOutputCP failed (Win32 ${api.getLastError()})`)' + end,
    '  }',
    '}',
  ].map(line => indent + line).join('\n') + '\n');
}
export const sourceEncodingChanges = [
  { patch: 'pwsh-output-encoding', name: '@deepseek-ai/dsh-sandbox-windows-acl',
    package: 'packages/sandbox/sandbox-windows-acl', path: 'packages/sandbox/sandbox-windows-acl/src/ffi.ts',
    hash: '9e90ba38afee21078bfa93c976459a131e8f50fdafd22a8fcf3a3433117b1535',
    transform: transformEncodingBindings },
  { patch: 'pwsh-output-encoding', name: '@deepseek-ai/dsh-sandbox-windows-acl',
    package: 'packages/sandbox/sandbox-windows-acl', path: 'packages/sandbox/sandbox-windows-acl/src/runner.ts',
    hash: '542b77278d974f5f93c2a0b925468e96e52737366ed88df7d118a5af67c2eff0',
    transform: transformEncodingRunner },
];
