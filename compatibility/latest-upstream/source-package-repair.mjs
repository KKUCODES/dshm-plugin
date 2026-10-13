/** 修复捕获输出，即使从CLI发起也独立终止整个树；取消仍等待旧版本修复完成。 */
export const sourcePackageRepairEdits = [
  ["const repairing = execa(options.command ?? 'pnpm', [...options.args ?? [], ...repair], {\n          cwd:",
    "const repairing = execa(options.command ?? 'pnpm', [...options.args ?? [], ...repair], {\n          // 修复超时必须先结束安装脚本，避免释放锁后仍继续写入。\n          killDescendants: true,\n          cwd:"],
  ['await recordRun(dir, { pid: repairing.pid, grouped: false })',
    "await recordRun(dir, { pid: repairing.pid, grouped: leadsOwnGroup('service') })"],
  ['const repaired = await repairing\n        exitCode = 1',
    'const repaired = await repairing\n        control.stalled ||= repaired.timedOut\n        exitCode = 1'],
];
