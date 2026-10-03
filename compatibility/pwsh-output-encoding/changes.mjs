import { createHash } from 'node:crypto';

// pwsh-local 基线包含已有前台输出补丁；其他两文件来自固定上游版本。
export const hashes = {
  'packages/shell/pwsh-local/src/index.ts': 'aefd52102ec21d6b120a5697eae6a2acdc126b9e6609d27a66b0fb818c4ffb60',
  'packages/sandbox/sandbox-windows-acl/src/runner.ts': '542b77278d974f5f93c2a0b925468e96e52737366ed88df7d118a5af67c2eff0',
  'packages/sandbox/sandbox-windows-acl/src/ffi.ts': 'c00ef2456ec0270c654a5561ed51dd3ffab6f80e9330f6490cde852192af4755',
};
const once = (text, before, after) => {
  if (text.split(before).length !== 2) throw Error('Encoding patch boundary changed');
  return text.replace(before, after);
};
export function transform(path, source) {
  if (!hashes[path] || createHash('sha256').update(source).digest('hex') !== hashes[path]) throw Error(`Unsupported encoding source: ${path}`);
  if (path.includes('/pwsh-local/')) {
    return once(source,
      "  '[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); '",
      "  // 只读 Windows 沙箱由原生 runner 在启动前设置代码页；受限语言不能构造编码类型。\n  'if ($ExecutionContext.SessionState.LanguageMode -eq \"FullLanguage\") { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false); $OutputEncoding = [System.Text.UTF8Encoding]::new($false); }; '");
  }
  if (path.endsWith('/ffi.ts')) {
    source = once(source, '  setConsoleCtrlHandler(handler: null, add: number): number',
      '  setConsoleCtrlHandler(handler: null, add: number): number\n  setConsoleOutputCP(codePage: number): number');
    return once(source, "    setConsoleCtrlHandler: bind(kernel32, 'SetConsoleCtrlHandler', 'int', [PVOID, 'int']),",
      "    setConsoleCtrlHandler: bind(kernel32, 'SetConsoleCtrlHandler', 'int', [PVOID, 'int']),\n    setConsoleOutputCP: bind(kernel32, 'SetConsoleOutputCP', 'int', ['uint32']),");
  }
  return once(source, '  const api = await win32()\n', `  const api = await win32()
  // PowerShell 在启动时缓存控制台代码页，进入 ConstrainedLanguage 后再设置已经太晚。
  // 与原 FullLanguage 编码前缀一样选择 UTF-8；不改变 token、ACL、语言限制或 stdio。
  if (/(?:^|[\\\\/])(?:pwsh|powershell)(?:\\.exe)?$/i.test(parsed.command)
    && api.setConsoleOutputCP(65001) === 0) {
    fail(\x60SetConsoleOutputCP failed (Win32 \x24{api.getLastError()})\x60)
  }
`);
}
