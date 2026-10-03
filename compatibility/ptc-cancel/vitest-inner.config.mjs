import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
const installed = createRequire('F:/Program Files/deepseek-harness/packages/core/tools/package.json');
const source = readFileSync('artifacts/compatibility/ptc-inner-cancel/ptc.spec.ts', 'utf8');
const names = [...new Set([...source.matchAll(/from '(@deepseek-ai\/[^']+)'/g)].map(match => match[1]))];
export default defineConfig({
  resolve: { alias: names.map(name => ({ find: name, replacement: name === '@deepseek-ai/dsh-tools'
    ? process.env.DSHM_PTC_INNER_ENTRY ?? resolve('artifacts/compatibility/ptc-inner-cancel/candidate.mjs') : installed.resolve(name) })) },
  test: { include: ['artifacts/compatibility/ptc-inner-cancel/ptc.spec.ts'] },
});
