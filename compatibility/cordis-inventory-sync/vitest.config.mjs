import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitest/config';

const installed = createRequire(resolve(process.env.DSHM_CORDIS_BASELINE ?? 'F:/Program Files/deepseek-harness', 'packages/extensions/cordis-host-runner/package.json'));
export default defineConfig({
  resolve: { alias: [
    { find: resolve('artifacts/compatibility/cordis-approval-race/src/index.ts'), replacement: resolve('artifacts/compatibility/cordis-inventory-sync/runtime/runner.mjs') },
    { find: '@deepseek-ai/cordis-plugin-timer', replacement: installed.resolve('@deepseek-ai/cordis-plugin-timer') },
  ] },
  test: { include: ['artifacts/compatibility/cordis-approval-race/tests/*.spec.ts'] },
});
