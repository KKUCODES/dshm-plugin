import { sourcePackageRepairEdits } from './source-package-repair.mjs';
import { sourcePackageRangeEdits } from './source-package-range.mjs';

/** 查询与修复超时结束完整进程树；取消仍等待原修复完成。 */
export const sourcePackageProcessChanges = [{
  patch: 'plugin-install-cancel', name: '@deepseek-ai/dsh-plugin-manager', package: 'packages/boot/plugin-manager',
  path: 'packages/boot/plugin-manager/src/operations.ts',
  hash: '16d141f794041d06122ce9f8ab7bae6f55b4a78feefb620f9cb6c7ba5efac547',
  edits: [
    ["\n    cwd: dir, env: environment, extendEnv: false, reject: false, stdin: 'ignore',",
      "\n    // 查询取消或超时也必须结束Windows启动器的子进程。\n    killDescendants: true,\n    cwd: dir, env: environment, extendEnv: false, reject: false, stdin: 'ignore',"],
    ["stdin: 'ignore', timeout: options.timeoutMs,",
      "stdin: 'ignore', killDescendants: true, timeout: options.timeoutMs,"],
    ["    timeout: options.timeoutMs, ...options.signal === undefined ? {} : { cancelSignal: options.signal },",
      "    killDescendants: true,\n    timeout: options.timeoutMs, ...options.signal === undefined ? {} : { cancelSignal: options.signal },"],
    ...sourcePackageRepairEdits,
    ...sourcePackageRangeEdits,
  ],
}];
