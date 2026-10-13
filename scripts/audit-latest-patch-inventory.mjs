// 只读核对18项目标与真实固定载荷，不把文件覆盖率当成功能验收完成率。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sourceChanges, sourceCommit } from '../compatibility/latest-upstream/source-changes.mjs';
import { installSourceRuntime, outputRoot, sourceRoot } from '../compatibility/latest-upstream/source-runtime.mjs';
import { installStartup } from '../compatibility/source-start/install.mjs';

assert.equal(process.argv.length, 2);
const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const output = await mkdtemp(resolve(runtime, 'patch-inventory-'));
const mappings = [
  ['background-output', 'official-api', []],
  ['foreground-output', 'migrate', ['foreground-observer', 'ptc-cancel', 'pwsh-output-encoding']],
  ['pending-notifications', 'migrate', ['pending-observer']],
  ['client-entries', 'migrate', ['client-entries']],
  ['plugin-install-cancel', 'migrate', ['plugin-install-cancel']],
  ['file-metadata', 'official-api-with-watch-fix', ['file-version-watch']],
  ['desktop-apps', 'migrate', ['desktop-apps-icons']],
  ['desktop-app-icons', 'migrate', ['desktop-apps-icons']],
  ['cordis-inspect', 'migrate', ['cordis-scopes']],
  ['cordis-approval-race', 'migrate', ['cordis-scopes']],
  ['cordis-client-lifetime', 'migrate', ['cordis-client-lifetime']],
  ['cordis-inventory-sync', 'migrate', ['cordis-client-lifetime', 'cordis-scopes']],
  ['pwsh-output-encoding', 'migrate', ['pwsh-output-encoding']],
  ['ptc-cancel', 'migrate', ['ptc-cancel']],
  ['auto-review-cancel', 'migrate', ['auto-review-cancel']],
  ['model-discovery', 'migrate', ['model-discovery']],
  ['plugin-restart-notice', 'migrate', ['plugin-restart-notice']],
  ['source-start', 'startup', []],
];
const report = { at: new Date().toISOString(), passed: false, fullAcceptancePassed: false, sourceCommit };
try {
  const legacy = (await readdir(resolve(root, 'compatibility'), { withFileTypes: true }))
    .filter(item => item.isDirectory() && item.name !== 'latest-upstream').map(item => item.name).sort();
  assert.equal(mappings.length, 18);
  assert.deepEqual(legacy, mappings.map(row => row[0]).sort());
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim(), sourceCommit);
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim(), '');
  await assert.rejects(access(resolve(runtime, 'latest-live-source-lease.json')), { code: 'ENOENT' });
  // 原安装器plan检查每个包版本、前后摘要、变换结果与路径；不执行apply/restore。
  const plan = await installSourceRuntime('plan', sourceRoot);
  assert.equal(plan.written, 0); assert.equal(plan.files, 38);
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json')));
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  for (const file of manifest.files)
    assert.equal(digest(await readFile(resolve(sourceRoot, file.path))), file.before, 'source_not_original: ' + file.path);
  assert.equal(new Set(sourceChanges.map(file => file.path)).size, 38);
  const groups = [...new Set(sourceChanges.map(file => file.patch))];
  assert.equal(groups.length, 14);
  assert.deepEqual([...manifest.patches].sort(), [...groups].sort());
  const mappedGroups = [...new Set(mappings.flatMap(row => row[2]))].sort();
  assert.deepEqual(mappedGroups, groups.filter(name => name !== 'preset-archive').sort());
  report.groups = groups.map(patch => ({ patch, files: manifest.files.filter(file => file.patch === patch).map(file => file.path) }));
  report.legacy = mappings.map(([name, direction, patches]) => ({ name, direction, patches,
    files: manifest.files.filter(file => patches.includes(file.patch)).map(file => file.path) }));
  report.startup = await installStartup('plan', sourceRoot);
  assert.equal(report.startup.state, 'original'); assert.equal(report.startup.payloads, 0);
  // “官方已有”只核对实际接口及当前适配调用；更多语义仍由各专项证明。
  const officialJobs = await readFile(resolve(sourceRoot, 'packages/jobs/jobs-local/src/index.ts'), 'utf8');
  assert.match(officialJobs, /readAt\(/);
  const officialFiles = await readFile(resolve(sourceRoot, 'packages/api/workspace-files/src/client/provider.ts'), 'utf8');
  assert.match(officialFiles, /const again = await stat\(\)/);
  const adapter = await readFile(resolve(root, 'src/job-ring.ts'), 'utf8');
  assert.match(adapter, /readAt/);
  report.officialApiReferences = true;
  report.sourceOriginal = true; report.sourceLeaseAbsent = true;
  report.additionalGroup = 'preset-archive'; report.legacyGoals = 18;
  report.sourceFiles = 38; report.sourceGroups = 14; report.passed = true;
} catch (error) {
  report.failure = { name: error.name, message: error.message, code: error.code };
  process.exitCode = 1;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
console.log(JSON.stringify({ output, passed: report.passed, fullAcceptancePassed: false,
  legacyGoals: report.legacyGoals, sourceGroups: report.sourceGroups, sourceFiles: report.sourceFiles,
  failure: report.failure }));
