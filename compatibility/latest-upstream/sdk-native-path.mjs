import assert from 'node:assert/strict';

// SEA 已把所有 Windows 盘符映射到同一 /snapshot；旧 pkg 的 dlopen 提取器只识别 C/V。
// 仅规范化这个虚拟命名空间，实际磁盘路径、原生 flags 及后续原提取/摘要逻辑保持。
export const seaNativeDlopenPrelude = String.raw`  if (process.platform === 'win32') {
    const originalDlopen = process.dlopen
    process.dlopen = function (...args) {
      if (typeof args[1] === 'string') {
        const path = args[1].replace(/^\\\\\?\\/, '')
        if (/^[A-Za-z]:[\\/]snapshot(?:[\\/]|$)/.test(path) && !/^[CV]:/i.test(path)) {
          args[1] = 'C:' + path.slice(2)
        }
      }
      return Reflect.apply(originalDlopen, this, args)
    }
  }
`;

// SEA 的 Windows VFS 把盘符折叠为同一 snapshot；只比较两个已解析 runner 的相同尾路径。
// 不拓宽到任意脚本、真实磁盘、UNC 或相似目录，仍由原 runner 校验参数和执行权限。
export const seaRunnerMatch = String.raw`function matchesSdkRunner(value, expected) {
  if (typeof expected !== 'string') return false
  if (value === expected) return true
  if (!isSea() || process.platform !== 'win32' || typeof value !== 'string') return false
  const snapshot = /^[A-Za-z]:[\\/]snapshot(?:[\\/]|$)/
  return snapshot.test(value) && snapshot.test(expected) && value.slice(2) === expected.slice(2)
}

`;

export function transformSdkNativePath(source) {
  const anchor = '\nif (isSea()) {\n';
  assert.equal(source.split(anchor).length, 2, 'latest_sdk_native_sea_anchor_mismatch');
  return source.replace(anchor, anchor + seaNativeDlopenPrelude);
}
