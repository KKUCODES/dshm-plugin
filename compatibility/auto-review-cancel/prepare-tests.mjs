import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { output, patch } from './patch.mjs';
const root = resolve(process.argv[2]);
await patch('prepare', root);
const original = await readFile(resolve(root, 'packages/experimental/auto-review/tests/auto-review.spec.ts'), 'utf8');
// 原用例明确规定了旧取消行为；保留测试主体，只修订两个故障场景的预期。
const source = original
  .replace("{ outcome: 'deny', expectedCode: 'AUTO_REVIEW_DENIED' }", "{ outcome: 'deny', expectedCode: TOOL_ABORTED_BEFORE_DISPATCH }")
  .replace("{ outcome: 'failure', expectedCode: 'AUTO_REVIEW_DENIED' }", "{ outcome: 'failure', expectedCode: TOOL_ABORTED_BEFORE_DISPATCH }");
if (source === original) throw Error('Cancellation tests changed upstream');
await writeFile(resolve(output, 'auto-review.spec.ts'), source);
console.log(JSON.stringify({ prepared: true }));
