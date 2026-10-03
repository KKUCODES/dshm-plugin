import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['compatibility/cordis-inspect/remote.test.ts'] } });
