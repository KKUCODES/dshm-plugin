import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceFile } from '../background-output/install-runtime.mjs';
import { prepareLatestEncodingFiles } from './pwsh-encoding.mjs';
import { transformEncodingPreamble } from './pwsh-encoding-changes.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const digest = value => createHash('sha256').update(value).digest('hex');
const byteReader = `
  /** 手机内部的有界字节旁路，不改原 readFrom/snapshot 或模型消费偏移。 */
  readBytesFrom(fromByte, maxBytes) {
    if (!Number.isSafeInteger(fromByte) || fromByte < 0 || fromByte > this.total
      || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536)
      throw Error('invalid independent output range');
    const windowStart = this.total - this.bytes;
    const startOffset = Math.max(fromByte, windowStart);
    const nextOffset = Math.min(this.total, startOffset + maxBytes);
    const bytes = Buffer.alloc(nextOffset - startOffset);
    let position = windowStart;
    for (const chunk of this.chunks) {
      const from = Math.max(startOffset, position), to = Math.min(nextOffset, position + chunk.length);
      if (to > from) chunk.copy(bytes, from - startOffset, from - position, to - position);
      position += chunk.length;
      if (position >= nextOffset) break;
    }
    return { bytes, startOffset, nextOffset, totalBytes: this.total, lossy: fromByte < windowStart,
      ...this.spillFile !== undefined ? { spillPath: this.spillFile } : {} };
  }
`;
const noteReader = `
    ...collected.stderr.readBytesFrom ? { readBytesFrom: (fromByte, maxBytes) => {
      if (providerFailure === undefined) return collected.stderr.readBytesFrom(fromByte, maxBytes);
      const note = Buffer.from(providerFailure.note, 'utf8');
      if (!Number.isSafeInteger(fromByte) || fromByte < 0 || fromByte > note.length
        || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536)
        throw Error('invalid independent output range');
      const nextOffset = Math.min(note.length, fromByte + maxBytes);
      return { bytes: Buffer.from(note.subarray(fromByte, nextOffset)), startOffset: fromByte,
        nextOffset, totalBytes: note.length, lossy: false };
    } } : {},
`;
const emptyReader = `
    readBytesFrom: (fromByte, maxBytes) => {
      if (fromByte !== 0 || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 65536)
        throw Error('invalid independent output range');
      return { bytes: Buffer.alloc(0), startOffset: 0, nextOffset: 0, totalBytes: 0, lossy: false };
    },
`;
const publish = `
/** 仅向原调用作用域发布冻结字节读者，不暴露进程控制对象，不等待观察器。 */
function observeShellOutput(ctx, exec, proc) {
  const reader = source => Object.freeze({
    ...source?.readBytesFrom ? { readBytesFrom: source.readBytesFrom.bind(source) } : {},
  });
  try {
    void ctx.parallel(scopeTarget(ctx.tools, exec.agent), 'tools/shell-output', exec,
      Object.freeze({ stdout: reader(proc.observed?.stdout), stderr: reader(proc.observed?.stderr) })).catch(() => {});
  } catch { /* 观察失败不能遗弃原进程或改变工具结果。 */ }
}
`;
const changes = [
  { name: 'dsh-subprocess-local', file: 'output.js', hash: '4f77ef6da608d36df168c99177e9b527e7145df1418845eba567635e64a4c2a3', edits: [
    ['\tsnapshot() {', byteReader + '\tsnapshot() {'],
  ] },
  ...[
    ['dsh-bash-local', 'LocalBashExecutor', '6d9b4426b8455198b79de398f57c0f5693e7292411059b66d5ac5eba608b59cb'],
    ['dsh-pwsh-local', 'PwshLocalExecutor', '8b7b57eb7f6c597caa5ee72e4dfd88cec7b5ac51e450ed3521b6b6b29306b88e'],
  ].map(([name, executor, hash]) => ({ name, file: 'index.js', hash, edits: [
    [`var ${executor} = class ${executor} extends ShellExecutor {`,
      `var ${executor} = class ${executor} extends ShellExecutor {\n  get foregroundOutputVersion() { return 1; }`],
    ['\t\tconst emptyReader = { readFrom:', '\t\tconst emptyReader = {' + emptyReader + ' readFrom:'],
    ['\t\tconst observedStderr = { readFrom:', '\t\tconst observedStderr = {' + noteReader + ' readFrom:'],
  ] })),
  ...[
    ['dsh-tool-bash', 'db75736c927a4fd795b4e98a12a1164bb4c432c55725ae7095ea58bd2ee0bf92'],
    ['dsh-tool-pwsh', 'c34d2b5ed81c401bcb8c7df87cf1c95cf2ecb0615097c2bb6bcf92d9308c09a7'],
  ].map(([name, hash]) => ({ name, file: 'index.js', hash, edits: [
    ['import { TOOL_ABORTED, defineTool }', 'import { scopeTarget } from "@deepseek-ai/dsh-scope";\n' + publish + 'import { TOOL_ABORTED, defineTool }'],
    ['\t\t\t\t\t\t\treturn proc;', '\t\t\t\t\t\t\tif (args.run_in_background !== true) observeShellOutput(ctx, exec, proc);\n\t\t\t\t\t\t\treturn proc;'],
    ['\t\t\t\tconst result = await (await ctx.shell.execute(ctx.shell.resolve({\n\t\t\t\t\t...request,\n\t\t\t\t\tsignal: exec.signal\n\t\t\t\t}))).result();',
      '\t\t\t\tconst foreground = await ctx.shell.execute(ctx.shell.resolve({\n\t\t\t\t\t...request,\n\t\t\t\t\tsignal: exec.signal\n\t\t\t\t}));\n        observeShellOutput(ctx, exec, foreground);\n        const result = await foreground.result();'],
  ] })),
];

/** 新版 npm 候选的精确字节补丁；全部预检通过才写入，不修改源码检出或日常安装。 */
export async function prepareLatestForegroundObserver() {
  const originalDir = resolve(runtime, 'patch-originals');
  await mkdir(originalDir, { recursive: true });
  const actualRuntime = await realpath(runtime);
  const inside = async path => {
    const rel = relative(actualRuntime, await realpath(path));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel))
      throw Error('latest_foreground_target_outside_runtime');
  };
  await inside(originalDir);
  const prepared = [];
  for (const change of changes) {
    const packageDir = resolve(runtime, 'node_modules/@deepseek-ai', change.name);
    await inside(packageDir);
    const pkg = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'));
    if (pkg.name !== '@deepseek-ai/' + change.name || pkg.version !== '0.2.1-alpha.1')
      throw Error('latest_foreground_package_mismatch');
    const path = resolve(packageDir, 'lib', change.file), backup = resolve(originalDir, change.name + '-' + change.file);
    await inside(path);
    const current = await readFile(path);
    let original = current;
    if (digest(original) !== change.hash) { await inside(backup); original = await readFile(backup); }
    if (digest(original) !== change.hash) throw Error('latest_foreground_original_mismatch');
    let modified = original.toString();
    for (const [before, after] of change.edits) {
      if (modified.split(before).length !== 2) throw Error('latest_foreground_anchor_mismatch: ' + change.name);
      modified = modified.replace(before, after);
    }
    const previousHash = digest(modified);
    if (change.name === 'dsh-pwsh-local') modified = transformEncodingPreamble(modified, true);
    if (![change.hash, previousHash, digest(modified)].includes(digest(current))) throw Error('latest_foreground_changed_outside_patch');
    prepared.push({ path, backup, current, original, modified, name: pkg.name, before: change.hash, after: digest(modified) });
  }
  prepared.push(...await prepareLatestEncodingFiles());
  const written = [];
  try {
    for (const item of prepared) {
      if (!(await readFile(item.path)).equals(item.current)) throw Error('latest_foreground_concurrent_change');
      await writeFile(item.backup, item.original);
      const desired = Buffer.from(item.modified);
      if (!desired.equals(item.current)) {
        await replaceFile(item.path, desired);
        written.push({ ...item, desired });
      }
    }
    for (const item of prepared)
      if (!(await readFile(item.path)).equals(Buffer.from(item.modified))) throw Error('latest_foreground_final_state_mismatch');
  } catch (error) {
    const failures = [];
    for (const item of written.reverse()) {
      try {
        if (!(await readFile(item.path)).equals(item.desired)) throw Error('latest_foreground_rollback_concurrent_change');
        await replaceFile(item.path, item.current);
      } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Latest output patch rollback needs attention');
    throw error;
  }
  const report = { patch: 'latest-foreground-observer-v2', version: '0.2.1-alpha.1',
    includes: ['foreground-observer', 'pwsh-output-encoding'],
    sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc', isolatedCandidateOnly: true,
    files: prepared.map(({ path, name, before, after }) => ({ path, name, before, after })) };
  await writeFile(resolve(runtime, 'foreground-observer-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await prepareLatestForegroundObserver()));
