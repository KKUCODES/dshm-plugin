import { changes as backgroundChanges } from '../background-output/changes.mjs';
import { applyChange, normalize, sha256 } from '../background-output/prepare.mjs';

export const patchVersion = 'foreground-output-v1';
export const prerequisite = 'background-output-v1';
const edit = (before, after) => ({ before, after });
const observerField = `  /** 可选的电脑内部只读观察器，仅 run() 发布；观察失败不改变命令结果。 */
  observeOutput?: ((output: ShellForegroundOutput) => void | Promise<void>) | undefined
`;
const helper = `/** 仅发布独立字节读者，不暴露 stdin、终止进程或原始 collector 对象。 */
export function observeShellOutput(spec: ShellExecSpec, collected: SubprocessCollectedOutputs): void {
  if (!spec.observeOutput) return
  const reader = (source: SubprocessOutputReader | undefined) => Object.freeze({
    ...source?.readBytesFrom ? { readBytesFrom: source.readBytesFrom.bind(source) } : {},
  })
  try {
    // 观察器不属于执行控制链：不等待它，也不让其同步异常/异步拒绝遗弃在途进程。
    void Promise.resolve(spec.observeOutput(Object.freeze({
      stdout: reader(collected.stdout), stderr: reader(collected.stderr),
    }))).catch(() => {})
  } catch { /* 同步观察失败同样不能跳过原有 done/deadline 清理。 */ }
}

`;

export const changes = [
  {
    path: 'packages/shell/shell/src/types.ts',
    edits: [
      edit('DshEnvironment, SubprocessCollectedOutputs }', 'DshEnvironment, SubprocessCollectedOutputs, SubprocessOutputReader }'),
      edit('/**\n * A caller\'s execution REQUEST:', `/** 前台命令的独立输出能力；旧 provider 可缺少读取方法，不允许回退为消费读取。 */
export interface ShellForegroundOutput {
  readonly stdout: Readonly<Pick<SubprocessOutputReader, 'readBytesFrom'>>
  readonly stderr: Readonly<Pick<SubprocessOutputReader, 'readBytesFrom'>>
}

/**
 * A caller's execution REQUEST:`),
      edit('export interface ShellExecRequest {', `export interface ShellExecRequest {
${observerField}`),
      edit('export interface ShellExecSpec {', `export interface ShellExecSpec {
${observerField}`),
    ],
  },
  {
    path: 'packages/shell/shell/src/index.ts',
    sha256: '1c2defdf5e9c7eff586bc1990027072081261886696beb385952995df9d02110',
    edits: [
      edit("import { Context, Service }", "import type { SubprocessCollectedOutputs, SubprocessOutputReader } from '@deepseek-ai/dsh-subprocess'\nimport { Context, Service }"),
      edit('export type {\n  ShellExecRequest,', 'export type {\n  ShellForegroundOutput,\n  ShellExecRequest,'),
      edit("declare module '@deepseek-ai/cordis' {", helper + "declare module '@deepseek-ai/cordis' {"),
      edit('  get sandboxMode(): SandboxMode | undefined {\n    return undefined\n  }', '  get sandboxMode(): SandboxMode | undefined {\n    return undefined\n  }\n\n  /** 可探测的前台输出观察能力；旧 provider 保持不支持。 */\n  get foregroundOutputVersion(): 1 | undefined { return undefined }'),
    ],
  },
  ...[['bash-local', 'LocalBashExecutor'], ['pwsh-local', 'PwshLocalExecutor']].map(([name, executor]) => ({
    path: `packages/shell/${name}/src/index.ts`,
    edits: [
      edit('SHELL_SETTINGS_NAMESPACE, ShellExecutor }', 'SHELL_SETTINGS_NAMESPACE, ShellExecutor, observeShellOutput }'),
      edit(`export class ${executor} extends ShellExecutor {`, `export class ${executor} extends ShellExecutor {\n  override get foregroundOutputVersion(): 1 { return 1 }\n`),
      edit('      sandboxPolicy: request.sandboxPolicy,', '      sandboxPolicy: request.sandboxPolicy,\n      ...request.observeOutput ? { observeOutput: request.observeOutput } : {},'),
      edit(`    const outcome = await handle.done\n    const collected = ${executor}.collected(handle)`,
        `    observeShellOutput(spec, handle.collected)\n    const outcome = await handle.done\n    const collected = ${executor}.collected(handle)`),
    ],
  })),
  ...[
    ['tool-bash', 'a86feede898f5aa961d7c2e805a42ef2d0656c08f5d865b52e9f560306f4560a'],
    ['tool-pwsh', '806e010012cef0cc50ab1fd6904f8b49eaa147922c736a19ece7c77f28b38aff'],
  ].map(([name, sha256]) => ({
    path: `packages/shell/${name}/src/index.ts`, sha256,
    edits: [
      edit("import type { ShellRunResult } from '@deepseek-ai/dsh-shell'", `import type { ShellRunResult, ShellForegroundOutput } from '@deepseek-ai/dsh-shell'
import { scopeTarget } from '@deepseek-ai/dsh-scope'

declare module '@deepseek-ai/cordis' {
  interface Events {
    /** 原工具批准并建立前台进程后发布；按 exec.agent 分发，观察不参与执行控制。 */
    'tools/shell-output'(exec: Readonly<ToolExecution>, output: ShellForegroundOutput): void
  }
}`),
      edit('        signal: exec.signal,\n      }))', `        signal: exec.signal,
        observeOutput: output => ctx.parallel(scopeTarget(ctx.tools, exec.agent), 'tools/shell-output', exec, output),
      }))`),
    ],
  })),
  ...[
    ['tool-bash', '7c27f82a07713b1ce9c32f07dfe21a03abfdac7888467080867811dbe954ef68'],
    ['tool-pwsh', 'e34bdf6d271d14d56149e23985137268ee95b51fbffbf8a84dcb8afdb75796f7'],
  ].map(([name, sha256]) => ({
    path: `packages/shell/${name}/package.json`, sha256,
    edits: [edit('  "peerDependencies": {', '  "peerDependencies": {\n    "@deepseek-ai/dsh-scope": "workspace:^",')],
  })),
];

/** 验证只读上游基线，再组合已验证的后台补丁；不接受现场未知源码。 */
export function applyForegroundChange(change, text) {
  const background = backgroundChanges.find(file => file.path === change.path);
  const original = background ? applyChange(background, text) : normalize(text);
  if (!background && sha256(original) !== change.sha256) throw new Error(`Baseline mismatch: ${change.path}`);
  let modified = original;
  for (const { before, after } of change.edits) {
    if (modified.split(before).length !== 2) throw new Error(`Ambiguous foreground anchor: ${change.path}`);
    modified = modified.replace(before, after);
  }
  return { original, modified };
}
