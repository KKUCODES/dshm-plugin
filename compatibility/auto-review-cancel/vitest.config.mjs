import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
const installed = createRequire('F:/Program Files/deepseek-harness/packages/experimental/auto-review/package.json');
const source = readFileSync('artifacts/compatibility/auto-review-cancel/auto-review.spec.ts', 'utf8');
const names = [...new Set([...source.matchAll(/from '(@deepseek-ai\/[^']+)'/g)].map(match => match[1]))];
export default defineConfig({
  resolve: { alias: names.map(name => ({ find: name, replacement: name === '@deepseek-ai/dsh-experimental-auto-review'
    ? process.env.DSHM_AUTO_REVIEW_ENTRY ?? resolve('artifacts/compatibility/auto-review-cancel/candidate.mjs') : installed.resolve(name) })) },
  test: { include: ['artifacts/compatibility/auto-review-cancel/auto-review.spec.ts'] },
});
