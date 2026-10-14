import assert from 'node:assert/strict';
import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sdkVariant } from './dsh-versions.mjs';

const root = resolve(import.meta.dirname, '..');
const version = process.env.DSHM_DSH_VERSION ?? '0.2.1-alpha.2';
assert.ok(process.env.npm_execpath, 'Run through npm run prepare:ci');
const variant = sdkVariant(version);
const runtime = resolve(root, 'artifacts/ci/sdk', variant);
await mkdir(runtime, { recursive: true });
for (const file of ['package.json', 'package-lock.json']) {
  await copyFile(resolve(root, 'ci/sdk', variant, file), resolve(runtime, file));
}
// 安装官方已发布包，禁止执行 SDK 安装脚本或构建 DSH 本体。
const install = spawnSync(process.execPath, [process.env.npm_execpath, 'ci', '--ignore-scripts',
  ...(version === '0.2.1-alpha.1' ? ['--legacy-peer-deps'] : []), '--no-audit', '--no-fund'],
  { cwd: runtime, stdio: 'inherit', windowsHide: true });
assert.equal(install.status, 0, 'CI SDK installation failed');
