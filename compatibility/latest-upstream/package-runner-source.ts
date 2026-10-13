// 此载荷追加到固定版本的run-tree.ts；由原TypeScript构建/打包，不从发布JS猜测类型。

/** 只包装Windows写入及修复；其他平台继续由原execa处理进程组。 */
export function packageInvocation(command: string, args: readonly string[]): [string, string[]] {
  if (process.platform !== 'win32') return [command, [...args]]
  const entry = fileURLToPath(import.meta.url)
  // 安装器保留profile工作目录；源码子进程必须显式使用DSH根路径映射。
  const sourceLoader = entry.endsWith('.ts')
    ? 'data:text/javascript,' + encodeURIComponent(`import { register } from ${JSON.stringify(import.meta.resolve('tsx/esm/api'))};register({tsconfig:${JSON.stringify(fileURLToPath(new URL('../../../../tsconfig.json', import.meta.url)))}});`)
    : undefined
  const invocation = sourceLoader !== undefined
    ? ['--import', sourceLoader, entry]
    : [fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-plugin-manager/runner'))]
  return [process.execPath, [...invocation, '--run', command, JSON.stringify(args)]]
}

/** Electron也必须以Node载体启动；这个私有标记不进入实际pnpm环境。 */
export function packageRunnerEnvironment(environment: NodeJS.ProcessEnv): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [name, value] of Object.entries(environment)) if (value !== undefined) result[name] = value
  if (process.platform === 'win32' && process.versions.electron !== undefined && result.ELECTRON_RUN_AS_NODE !== '1') {
    result.ELECTRON_RUN_AS_NODE = '1'
    result.DSHM_PACKAGE_ELECTRON_NODE = '1'
  }
  return result
}

/** Node/source直接入口与单文件打包引导共用这一实现。 */
export async function runPackageRunner(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  if (process.platform !== 'win32') throw new Error('package range runner is Windows-only')
  const [mode, command, encoded] = argv
  if (argv.length !== 3 || (mode !== '--run' && mode !== '--target') || command === undefined || encoded === undefined)
    throw new Error('invalid package range invocation')
  const args: unknown = JSON.parse(encoded)
  if (!Array.isArray(args) || !args.every((arg: unknown) => typeof arg === 'string'))
    throw new Error('invalid package range arguments')
  const environment = { ...process.env }
  delete environment.NODE_CHANNEL_FD
  delete environment.NODE_CHANNEL_SERIALIZATION_MODE
  if (environment.DSHM_PACKAGE_ELECTRON_NODE === '1') {
    delete environment.DSHM_PACKAGE_ELECTRON_NODE
    delete environment.ELECTRON_RUN_AS_NODE
  }
  if (mode === '--target') {
    // pnpm.cmd及应用自带pnpm仍由原execa解析；不自行拼接cmd命令行。
    const result = await execa(command, args, { cwd: process.cwd(), env: environment, extendEnv: false,
      stdin: 'inherit', stdout: 'inherit', stderr: 'inherit', cleanup: false, reject: false })
    if (result.exitCode === undefined) console.error(result.shortMessage ?? 'package command failed to start')
    process.exitCode = result.exitCode ?? (result.code === 'ENOENT' ? 127 : 1)
    return
  }
  if (!process.connected) throw new Error('package range requires caller IPC')
  // 缺失原生能力直接失败，不能降级为仍会遗留写入进程的安装。
  const native = await import('@deepseek-ai/dsh-win32-process')
  const api = native.loadWin32ProcessBindings()
  let target: import('@deepseek-ai/dsh-win32-process').SpawnedJobProcess | undefined
  let parentGone = false
  let terminationError: unknown
  const disconnected = () => {
    parentGone = true
    if (target !== undefined) {
      try { native.terminateJob(api, target.job, 1) } catch (error) { terminationError = error }
    }
  }
  process.once('disconnect', disconnected)
  try {
    if (!process.connected) throw new Error('package caller exited before launch')
    const [, invocation] = packageInvocation(command, args)
    invocation[invocation.indexOf('--run')] = '--target'
    // 挂起创建、加入KILL_ON_JOB_CLOSE后再执行。运行器被强制结束时也由内核清理整个范围。
    target = native.spawnCurrentTokenJobProcess(api, { command: process.execPath, applicationName: process.execPath,
      args: invocation, cwd: process.cwd(), env: packageRunnerEnvironment(environment),
      stdio: { stdin: 0, stdout: 1, stderr: 2 } })
    let exitCode: number | undefined
    let exitedAt: number | undefined
    for (;;) {
      if (terminationError !== undefined) throw terminationError
      exitCode = native.pollProcessExit(api, target.process)
      if (exitCode !== undefined) {
        exitedAt ??= Date.now()
        if (native.isJobEmpty(api, target.job)) break
        // 保留原安装器两秒输出尾部等待；不能因遗留脚本继续写入而提前释放profile锁。
        if (Date.now() - exitedAt >= 2_000) native.terminateJob(api, target.job, 1)
      }
      await new Promise<void>(done => setTimeout(done, 15))
    }
    process.exitCode = parentGone ? 1 : exitCode
  } finally {
    if (target !== undefined) {
      try {
        if (!native.isJobEmpty(api, target.job)) native.terminateJob(api, target.job, 1)
      } finally {
        try { native.closeHandleChecked(api, target.process, 'package target') }
        finally { native.closeHandleChecked(api, target.job, 'package range') }
      }
    }
    process.off('disconnect', disconnected)
    if (process.connected) process.disconnect()
  }
}

if (import.meta.main) {
  try { await runPackageRunner() }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 127
  }
}
