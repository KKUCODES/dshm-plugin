import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const source = resolve(root, 'artifacts/latest-source-check');
const checkout = JSON.parse(await readFile(resolve(runtime, 'source-checkout.json'), 'utf8'));
assert.equal(checkout.commit, '5badb15009ae1756c3afe0ae0cef1faafc290ccc');
assert.equal(checkout.sourceBuildVerified, true);
const probe = await readFile(resolve(root, 'compatibility/latest-upstream/source-identity-probe.mjs'), 'utf8');
const report = { at: new Date().toISOString(), commit: checkout.commit, cases: [] };
const installed = process.argv.includes('--installed');
for (const mode of installed ? ['installed'] : ['original-source', 'canonical-preload']) {
  const home = resolve(runtime, 'source-identity-homes', randomUUID());
  await mkdir(home, { recursive: true });
  const env = { DSH_HOME: home, DSHM_IDENTITY_HOME: home, DSHM_IDENTITY_MODE: mode,
    DSHM_IDENTITY_CANDIDATE: resolve(runtime, 'candidate'), DSHM_SOURCE_ROOT: source };
  for (const key of ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'APPDATA', 'LOCALAPPDATA', 'USERPROFILE'])
    if (process.env[key] !== undefined) env[key] = process.env[key];
  const args = ['--import', 'tsx/esm'];
  // 实验对照只复用已验证的解析函数，不安装旧版引导器或改变源码入口。
  if (mode === 'canonical-preload') args.push('--import', pathToFileURL(resolve(root, 'compatibility/source-start/preload-probe.mjs')).href);
  if (mode === 'installed') args.push('--import', pathToFileURL(resolve(source, '.dshm-source/bootstrap.mjs')).href);
  args.push('--input-type=module', '--eval', probe);
  try {
    const output = execFileSync(process.execPath, args, { cwd: source, env, encoding: 'utf8', windowsHide: true, timeout: 45000, maxBuffer: 1024 * 1024 });
    const result = JSON.parse(output.trim());
    result.passed = ['sameSymbol', 'sameClass', 'sameSubpath', 'externalSameSymbol', 'cjsSameSymbol', 'cjsSameClass', 'hostBootSameReconcile', 'hostBootSameResolution'].every(key => result[key] === true)
      && result.worker?.sameSymbol === true && result.worker?.sameClass === true && result.worker?.cjsSameSymbol === true
      && result.pinned === 'DSHM_IDENTITY_PINNED' && result.mobilePlugin?.apply === 'function' && result.toolValue === 'DSHM_IDENTITY_OK';
    report.cases.push(result);
  } catch (error) {
    report.cases.push({ mode, passed: false, error: String(error.stderr ?? error.message).slice(-4000) });
  }
}
await writeFile(resolve(runtime, installed ? 'latest-source-identity-installed.json' : 'latest-source-identity.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
assert.equal(report.cases.at(-1).passed, true, 'canonical preload must pass the complete identity probe');
