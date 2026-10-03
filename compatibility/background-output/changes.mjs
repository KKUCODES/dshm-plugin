// 精确基线替换；构建仅写入插件自有副本，不修改上游参考或已安装 DSH。
export const baseline = 'ddefc45fbc7f8e46dd73185e68295696d1297887';
export const patchVersion = 'background-output-v1';
const edit = (before, after) => ({ before, after });
const prepend = (anchor, addition) => edit(anchor, addition + anchor);

const bytesShape = `{
    bytes: Uint8Array
    startOffset: number
    nextOffset: number
    totalBytes: number
    lossy: boolean
    spillPath?: string
  }`;
const requestShape = `{ stream: 'stdout' | 'stderr'; fromByte: number; maxBytes: number }`;
const validateRequest = `    if ((request.stream !== 'stdout' && request.stream !== 'stderr')
      || !Number.isSafeInteger(request.fromByte) || request.fromByte < 0
      || !Number.isSafeInteger(request.maxBytes) || request.maxBytes < 1 || request.maxBytes > 65536) {
      throw new Error('invalid independent output request')
    }
`;
const producerEdit = prepend('    readOutput: () => process === undefined', `    // 独立读取准确的任务进程；不调用模型的消费接口。
    readOutputBytes: (request) => {
      if (process === undefined) return { state: preparing ? 'pending' : 'unsupported' }
      const reader = process.collected?.[request.stream]
      if (!reader?.readBytesFrom) return { state: 'unsupported' }
      return { state: 'available', ...reader.readBytesFrom(request.fromByte, request.maxBytes) }
    },
`);
const producerEdits = [
  prepend('  let process: ShellProcess | undefined', '  let preparing = true\n'),
  edit('      process = await start(controller.signal)', '      process = await start(controller.signal)\n      preparing = false'),
  edit('    } catch (error: unknown) {\n      return {', '    } catch (error: unknown) {\n      preparing = false\n      return {'),
  producerEdit,
];

export const changes = [
  {
    path: 'packages/subprocess/subprocess/src/types.ts',
    sha256: 'e65166444ff791994a7198a86ac4a821e8329120bd551f342913623c87e5a715',
    edits: [edit('  readFrom(fromByte: number): SubprocessOutputRead', `  readFrom(fromByte: number): SubprocessOutputRead
  /** 独立原始字节读取，最多 64 KiB；调用方持有偏移并负责连续解码。旧 provider 可不提供。 */
  readBytesFrom?(fromByte: number, maxBytes: number): ${bytesShape}
`) ],
  },
  {
    path: 'packages/subprocess/subprocess-local/src/output.ts',
    sha256: 'c6ff5e2527166179f255157605b2c9629c097796345cba6c44ded69bdb8216eb',
    edits: collectorEdits(),
  },
  {
    path: 'packages/shell/shell/src/types.ts',
    sha256: '60fc7fd33903517a51e3a58dd26caef6323969f77ffdfb04aa5d37980ddf213a',
    edits: [
      edit('import type { CollectedOutput, DshEnvironment }', 'import type { CollectedOutput, DshEnvironment, SubprocessCollectedOutputs }'),
      prepend('  /**\n   * Read output produced since the previous read', '  /** 可选独立读取能力；不改变 readOutput 的消费位置。仅供电脑内部使用。 */\n  readonly collected?: SubprocessCollectedOutputs\n'),
    ],
  },
  ...[
    ['bash-local', '73524a84612d664b8726b9374406e689b70119df0bc60989e49330f81ae52a16'],
    ['pwsh-local', '814dd5524270c6a663d366a4e83315f06b6fad701aa5056a9c53866ddab6e5dc'],
  ].map(([name, sha256]) => ({
    path: `packages/shell/${name}/src/index.ts`, sha256,
    edits: [edit('    const proc: ShellProcess = {\n      status:', '    const proc: ShellProcess = {\n      collected,\n      status:')],
  })),
  ...[
    ['tool-bash', 'e82b2a064f6ef10bb3f6ba012abd909d1f1ae9f1eb7ee81b275a1f9840d7e7b0'],
    ['tool-pwsh', '156d124e65130c1edd021209b55319786654c2b5e1056bad5144dc1261a4c939'],
  ].map(([name, sha256]) => ({ path: `packages/shell/${name}/src/background.ts`, sha256, edits: producerEdits })),
  {
    path: 'packages/jobs/jobs/src/types.ts',
    sha256: 'e5c440b983e350859e893fa849d8cdcb036894f1b63cfaa27e9217d28abc5de2',
    edits: [
      prepend('/** Hooks through which the runtime controls and observes producer work. */', `/** 电脑内部独立读取；路径不能直接暴露给远程客户端。 */
export type JobOutputBytesRequest = ${requestShape}
export type JobOutputBytes = { state: 'pending' | 'unsupported' }
  | ({ state: 'available' } & ${bytesShape})
export interface JobIndependentRead {
  output: JobOutputBytes
  snapshot: JobSnapshot
}

`),
      prepend('  /**\n   * Consume output produced since the previous call.', '  /** 每次读取互不消费；缺少时不能以 readOutput 替代。 */\n  readOutputBytes?(request: JobOutputBytesRequest): JobOutputBytes\n'),
    ],
  },
  {
    path: 'packages/jobs/jobs/src/index.ts',
    sha256: '11e4a5fc2aa1bf2cb131f5dfdead07864614f2de2aa325dcc2e292f5eed94a10',
    edits: [
      edit('  JobDoneListener, JobId, JobRead, JobSnapshot, JobStart, JobsChangedListener,', '  JobDoneListener, JobId, JobRead, JobSnapshot, JobStart, JobsChangedListener,\n  JobOutputBytesRequest, JobIndependentRead,'),
      prepend('  JobHooks,', '  JobOutputBytesRequest,\n  JobOutputBytes,\n  JobIndependentRead,\n'),
      edit('  abstract read(id: JobId, caller?: Agent): JobRead', `  abstract read(id: JobId, caller?: Agent): JobRead

  /** 可选能力的兼容默认：先验证可访问，再明确不支持；不调用 read。 */
  readOutputBytes(id: JobId, _request: JobOutputBytesRequest, caller?: Agent): JobIndependentRead {
    return { output: { state: 'unsupported' }, snapshot: this.get(id, caller) }
  }`),
    ],
  },
  {
    path: 'packages/jobs/jobs-local/src/index.ts',
    sha256: 'c1f0cc7de70a11989f6f0f1bf8df8c275858b462603fde19bc8df5b7517bf479',
    edits: [
      prepend('  JobsChangedListener,', '  JobOutputBytesRequest, JobIndependentRead, JobHooks,\n'),
      prepend('  readOutput: (() => string) | undefined', "  readOutputBytes: JobHooks['readOutputBytes']\n"),
      prepend('      readOutput: hooks.readOutput?.bind(hooks),', '      readOutputBytes: hooks.readOutputBytes?.bind(hooks),\n'),
      prepend("  kill(id: JobId, caller?: Agent, reason?: string): 'requested' | 'already-finished' {", `  override readOutputBytes(id: JobId, request: JobOutputBytesRequest, caller?: Agent): JobIndependentRead {
    const job = this.expect(id)
    this.assertAccess(job, caller)
${validateRequest}    let output: JobIndependentRead['output']
    if (job.readOutputBytes !== undefined) {
      output = job.readOutputBytes(request)
    } else if (job.readOutput !== undefined) {
      output = { state: 'unsupported' }
    } else if (!isTerminal(job.status)) {
      output = { state: 'pending' }
    } else {
      // 最终输出型任务也不调用 read，保留原完成通知的 reported 状态。
      const bytes = Buffer.from(request.stream === 'stdout' ? job.output ?? '' : '', 'utf8')
      if (request.fromByte > bytes.length) throw new Error('invalid independent output offset')
      const nextOffset = Math.min(bytes.length, request.fromByte + request.maxBytes)
      output = { state: 'available', bytes: bytes.subarray(request.fromByte, nextOffset),
        startOffset: request.fromByte, nextOffset, totalBytes: bytes.length, lossy: false }
    }
    return { output, snapshot: this.snapshot(job) }
  }

`),
    ],
  },
];

// 只增加方法，原 readFrom/snapshot 与所有模型调用点保持字节级原样。
function collectorEdits() {
  return [prepend('  /**\n   * Copy the retained raw tail with its position in the complete observed stream.', `  /** 有界字节旁路；复制返回数据，外部读者不能修改原始输出。 */
  readBytesFrom(fromByte: number, maxBytes: number): ${bytesShape} {
    if (!Number.isSafeInteger(fromByte) || fromByte < 0 || fromByte > this.total
      || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536) {
      throw new Error('invalid independent output range')
    }
    const windowStart = this.total - this.bytes
    const startOffset = Math.max(fromByte, windowStart)
    const nextOffset = Math.min(this.total, startOffset + maxBytes)
    const bytes = Buffer.alloc(nextOffset - startOffset)
    let position = windowStart
    for (const chunk of this.chunks) {
      const from = Math.max(startOffset, position)
      const to = Math.min(nextOffset, position + chunk.length)
      if (to > from) chunk.copy(bytes, from - startOffset, from - position, to - position)
      position += chunk.length
      if (position >= nextOffset) break
    }
    return { bytes, startOffset, nextOffset, totalBytes: this.total, lossy: fromByte < windowStart,
      ...this.spillFile !== undefined ? { spillPath: this.spillFile } : {} }
  }

`)];
}
