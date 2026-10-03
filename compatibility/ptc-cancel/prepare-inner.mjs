import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { digest } from '../background-output/install-runtime.mjs';

export const output = resolve('artifacts/compatibility/ptc-inner-cancel');
export const files = {
  'packages/core/tools/src/index.ts': 'e040cf44c7a4c1b74650cc32f67503b8881cc1d5b1f47f1cb38cf0167a9bb3da',
  'packages/core/tools/lib/index.js': 'b88c17aca80c921993082eaf0ef1181d474198694a9c9cc5873d1d404336299d',
};
export function transform(source, typescript) {
  const before = typescript
    ? '    } catch (error: unknown) {\n      return toolErrorResult(error)\n    } finally {\n      fused.dispose()'
    : '\t\t} catch (error) {\n\t\t\treturn toolErrorResult(error);\n\t\t} finally {\n\t\t\tfused.dispose();';
  const after = before.replace('return toolErrorResult(error)',
    'return isAborted(signal) && Object.is(error, signal.reason) ? toolAbortedResult() : toolErrorResult(error)');
  if (source.split(before).length !== 2) throw Error('Unsupported tool cancellation boundary');
  // 只认同一 signal 的原始 reason；取消期间独立抛出的执行错误仍按原错误返回。
  return source.replace(before, after);
}
if (process.argv[1]?.endsWith('prepare-inner.mjs')) {
  const root = resolve(process.argv[2]);
  await mkdir(output, { recursive: true });
  for (const [path, hash] of Object.entries(files)) {
    const bytes = await readFile(resolve(root, path));
    if (digest(bytes) !== hash) throw Error(`Unexpected baseline: ${path}`);
    const ext = path.endsWith('.ts') ? 'ts' : 'mjs';
    await writeFile(resolve(output, `original.${ext}`), bytes);
    await writeFile(resolve(output, `candidate.${ext}`), transform(bytes.toString('utf8'), ext === 'ts'));
  }
  const tests = await readFile(resolve(root, 'packages/core/tools/tests/ptc.spec.ts'), 'utf8');
  const regression = await readFile(new URL('./inner-regression.ts', import.meta.url), 'utf8');
  await writeFile(resolve(output, 'ptc.spec.ts'), tests + regression);
  console.log(JSON.stringify({ prepared: true, files: 2 }));
}
