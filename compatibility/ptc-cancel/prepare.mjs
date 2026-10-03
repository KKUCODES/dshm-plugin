import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { digest } from '../background-output/install-runtime.mjs';

export const output = resolve('artifacts/compatibility/ptc-cancel');
export const files = {
  'packages/core/tools/src/ptc.ts': '7a7c19cfdabce7bad053291614b1d727205e94601771a7b239790b3b0f0a7eab',
  'packages/core/tools/lib/index.js': 'a5dad5666e38a1e16bc7b56213637621bb5a1bd5ef19337152afcf61419860c6',
};
export function transform(source, typescript) {
  const before = typescript
    ? "constructor(message: string) {\n    super(message, 'CODE_RUN_FAILED')\n    this.name = 'CodeRunFailedError'"
    : 'constructor(message) {\n\t\tsuper(message, "CODE_RUN_FAILED");\n\t\tthis.name = "CodeRunFailedError";';
  const after = typescript
    ? "constructor(message: string, aborted = false) {\n    super(message, aborted ? 'ABORTED' : 'CODE_RUN_FAILED')\n    this.name = aborted ? 'AbortError' : 'CodeRunFailedError'"
    : 'constructor(message, aborted = false) {\n\t\tsuper(message, aborted ? "ABORTED" : "CODE_RUN_FAILED");\n\t\tthis.name = aborted ? "AbortError" : "CodeRunFailedError";';
  if (source.split(before).length !== 2) throw Error('Unsupported PTC error constructor');
  const call = /throw new CodeRunFailedError\((`code run failed[^\r\n]+`)\)/g;
  if ([...source.matchAll(call)].length !== 1) throw Error('Unsupported PTC failure boundary');
  // 只使用运行时结构化 kind；保留完整诊断与已捕获输出，不根据文本或点击时序猜测。
  return source.replace(before, after).replace(call, 'throw new CodeRunFailedError($1, result.error.kind === "abort")');
}
if (process.argv[1]?.endsWith('prepare.mjs')) {
  const root = resolve(process.argv[2]);
  await mkdir(output, { recursive: true });
  for (const [path, hash] of Object.entries(files)) {
    const bytes = await readFile(resolve(root, path));
    if (digest(bytes) !== hash) throw Error(`Unexpected baseline: ${path}`);
    const ext = path.endsWith('.ts') ? 'ts' : 'mjs';
    await writeFile(resolve(output, `original.${ext}`), bytes);
    await writeFile(resolve(output, `candidate.${ext}`), transform(bytes.toString('utf8'), ext === 'ts'));
  }
  const original = await readFile(resolve(root, 'packages/core/tools/tests/ptc.spec.ts'), 'utf8');
  const anchor = "expect((result.content[0] as { text: string }).text).toContain('code run failed (abort)')";
  if (original.split(anchor).length !== 2) throw Error('Unsupported abort test');
  const tests = original.replace(anchor, `${anchor}\n    expect(result.error?.info).toEqual({ name: 'AbortError', code: 'ABORTED' })`);
  await writeFile(resolve(output, 'ptc.spec.ts'), tests);
  console.log(JSON.stringify({ prepared: true, files: 2 }));
}
