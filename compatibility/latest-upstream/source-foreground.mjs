// 新版原TS的有界观察旁路；保留原进程、审批、取消、消费偏移及结果投影。
const bytesResult = `{ bytes: Uint8Array; startOffset: number; nextOffset: number; totalBytes: number; lossy: boolean; spillPath?: string }`;
const byteReader = `  /** 手机内部有界字节旁路，不改变原readFrom/snapshot或模型消费偏移。 */
  readBytesFrom(fromByte: number, maxBytes: number): ${bytesResult} {
    if (!Number.isSafeInteger(fromByte) || fromByte < 0 || fromByte > this.total
      || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536)
      throw new Error('invalid independent output range')
    const windowStart = this.total - this.bytes
    const startOffset = Math.max(fromByte, windowStart)
    const nextOffset = Math.min(this.total, startOffset + maxBytes)
    const bytes = Buffer.alloc(nextOffset - startOffset)
    let position = windowStart
    for (const chunk of this.chunks) {
      const from = Math.max(startOffset, position), to = Math.min(nextOffset, position + chunk.length)
      if (to > from) chunk.copy(bytes, from - startOffset, from - position, to - position)
      position += chunk.length
      if (position >= nextOffset) break
    }
    return { bytes, startOffset, nextOffset, totalBytes: this.total, lossy: fromByte < windowStart,
      ...this.spillFile !== undefined ? { spillPath: this.spillFile } : {} }
  }

`;
const emptyReader = `      readBytesFrom: (fromByte, maxBytes) => {
        if (fromByte !== 0 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536)
          throw new Error('invalid independent output range')
        return { bytes: Buffer.alloc(0), startOffset: 0, nextOffset: 0, totalBytes: 0, lossy: false }
      },
`;
const noteReader = `      ...collected.stderr.readBytesFrom ? { readBytesFrom: (fromByte: number, maxBytes: number) => {
        if (providerFailure === undefined) return collected.stderr.readBytesFrom!(fromByte, maxBytes)
        const note = Buffer.from(providerFailure.note, 'utf8')
        if (!Number.isSafeInteger(fromByte) || fromByte < 0 || fromByte > note.length
          || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536)
          throw new Error('invalid independent output range')
        const nextOffset = Math.min(note.length, fromByte + maxBytes)
        return { bytes: Buffer.from(note.subarray(fromByte, nextOffset)), startOffset: fromByte,
          nextOffset, totalBytes: note.length, lossy: false }
      } } : {},
`;
const publish = `
/** 仅向原调用作用域发布冻结字节读者，不暴露进程控制对象，不等待观察器。 */
function observeShellOutput(ctx: Context, exec: Readonly<ToolExecution>, proc: ShellExecution): void {
  const reader = (source: ShellExecution['observed']['stdout'] | undefined) => Object.freeze({
    ...source?.readBytesFrom ? { readBytesFrom: source.readBytesFrom.bind(source) } : {},
  })
  try {
    void ctx.parallel(scopeTarget(ctx.tools, exec.agent), 'tools/shell-output', exec,
      Object.freeze({ stdout: reader(proc.observed?.stdout), stderr: reader(proc.observed?.stderr) })).catch(() => {})
  } catch { /* 观察失败不能遗弃原进程或改变工具结果。 */ }
}
`;
const toolTypes = `/** 仅供电脑内部观察的独立字节能力，不含进程控制或可变collector。 */
export interface DshmForegroundOutput {
  readonly stdout: DshmForegroundOutputReader
  readonly stderr: DshmForegroundOutputReader
}
interface DshmForegroundOutputReader {
  readonly readBytesFrom?: (fromByte: number, maxBytes: number) => ${bytesResult}
}

`;
const change = (name, packagePath, file, hash, edits) => ({ patch: 'foreground-observer',
  name: '@deepseek-ai/' + name, package: packagePath, path: `${packagePath}/src/${file}`, hash, edits });

export const sourceForegroundChanges = [
  change('dsh-subprocess', 'packages/subprocess/subprocess', 'types.ts', 'e65166444ff791994a7198a86ac4a821e8329120bd551f342913623c87e5a715', [
    ['export interface SubprocessOutputReader {', `export interface SubprocessOutputReader {
  /** 可选的有界、非消费式原字节读取；旧provider保持不支持，不回退为readFrom。 */
  readBytesFrom?(fromByte: number, maxBytes: number): ${bytesResult}`],
  ]),
  change('dsh-subprocess-local', 'packages/subprocess/subprocess-local', 'output.ts', '1151a91d7bc31ffcd6ea3db85af2ef8c19ac4bc2d3a41654da9feac29cae7433', [
    ['  /**\n   * Copy the retained raw tail', byteReader + '  /**\n   * Copy the retained raw tail'],
  ]),
  ...[
    ['bash-local', 'LocalBashExecutor', '03f7d8c0a6162aec6c71c719c937ab8b6b7fa011b7fcdc386e513c4d0aeab353'],
    ['pwsh-local', 'PwshLocalExecutor', 'feebf120ba9c27590b138da54fbc4124bbf79a1a63b56008199676c30239f5a4'],
  ].map(([directory, executor, hash]) => change('dsh-' + directory, 'packages/shell/' + directory, 'index.ts', hash, [
    [`export class ${executor} extends ShellExecutor {`, `export class ${executor} extends ShellExecutor {\n  get foregroundOutputVersion(): 1 { return 1 }\n`],
    ['    const emptyReader: SubprocessOutputReader = {', '    const emptyReader: SubprocessOutputReader = {\n' + emptyReader],
    ['    const observedStderr: SubprocessOutputReader = {', '    const observedStderr: SubprocessOutputReader = {\n' + noteReader],
  ])),
  ...[
    ['tool-bash', '53b18db95b1f2fc0bd82a5560756f8644ba8898197534b4915f96f7e3e450956'],
    ['tool-pwsh', '735e7e6598f6e58625a0650dcf94ed058194de53910cc50d86e298e0c910bbb6'],
  ].map(([directory, hash]) => change('dsh-' + directory, 'packages/shell/' + directory, 'index.ts', hash, [
    ["import { defineTool, TOOL_ABORTED } from '@deepseek-ai/dsh-tools'", "import { defineTool, TOOL_ABORTED, scopeTarget } from '@deepseek-ai/dsh-tools'"],
    ['              proc = await ctx.shell.execute({ ...spec, signal })\n              return proc',
      '              proc = await ctx.shell.execute({ ...spec, signal })\n              if (args.run_in_background !== true) observeShellOutput(ctx, exec, proc)\n              return proc'],
    ['        const foreground = await ctx.shell.execute(ctx.shell.resolve({ ...request, signal: exec.signal }))\n        const result = await foreground.result()',
      '        const foreground = await ctx.shell.execute(ctx.shell.resolve({ ...request, signal: exec.signal }))\n        observeShellOutput(ctx, exec, foreground)\n        const result = await foreground.result()'],
    // 追加本地函数，不改原工具注册、签名或事件控制链。
    ['export const name = ', publish + '\nexport const name = '],
  ])),
  change('dsh-tools', 'packages/core/tools', 'index.ts', '9107a2b6447b10c2ecb90429d7c1b80b956759e96d35230af16f5a88f5d3eccd', [
    ["import type { ScopeKey, ScopeLayer, Scoped } from '@deepseek-ai/dsh-scope'",
      "import type { ScopeKey, ScopeLayer, Scoped } from '@deepseek-ai/dsh-scope'\n// 导出已有导入绑定；跨包转导出会让原Typert生成器反复展开导出图。\nexport { scopeTarget }"],
    ["declare module '@deepseek-ai/cordis' {", toolTypes + "declare module '@deepseek-ai/cordis' {"],
    ['  interface Events {', "  interface Events {\n    /** 原工具建立前台进程后按Agent作用域发布，只读观察不参与执行控制。 */\n    'tools/shell-output'(exec: Readonly<ToolExecution>, output: DshmForegroundOutput): void"],
  ]),
];
