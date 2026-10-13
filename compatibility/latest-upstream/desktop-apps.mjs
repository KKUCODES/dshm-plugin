import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existingInside, replaceFile } from '../background-output/install-runtime.mjs';

const project = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(project, 'artifacts/latest-runtime-check');
const output = resolve(runtime, 'desktop-apps');
const packagePath = 'node_modules/@deepseek-ai/dsh-host-open-in-app';
const version = '0.2.1-alpha.1';
const sourceCommit = '5badb15009ae1756c3afe0ae0cef1faafc290ccc';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [
  ['lib/index.js', 'b1d17a0c2646389b27eefab2e1e22576a693b11c61c76884fc049aff54e00d96', 'bundle/index.js'],
  ['lib/types/index.js', '6238c1ff448b4501448fd53358cd20d4bc245546a7627295050013bb4c1ebee2', 'compiled/index.js'],
  ['lib/types/resolver.js', '3d6c5a87d3d14d604cedda05779b5d920aaf53f191bf7654c35884c05719ac5e', 'compiled/resolver.js'],
  ['lib/types/index.d.ts', '51d18093ff9b4459aeb221540b2fd04f9eb3fc374374d238186e87f9a8ddab78', 'compiled/index.d.ts'],
  ['lib/types/resolver.d.ts', '58888a8b8cfb72d2d287d3391e767cc21326193ebe064c5be79700cc2d838b77', 'compiled/resolver.d.ts'],
];

/** 从固定原源码生成两个编译入口及声明，不在发布产物中猜测源码结构。 */
export async function prepareLatestDesktopApps() {
  const run = args => {
    const result = spawnSync(process.execPath, args, { cwd: project, windowsHide: true, encoding: 'utf8', timeout: 60000 });
    if (result.status !== 0) throw Error('latest_desktop_build_failed: ' + result.stdout + result.stderr);
  };
  run(['scripts/verify-latest-desktop-apps.mjs']);
  run(['node_modules/typescript/bin/tsc', '--strict', '--skipLibCheck', '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext', '--target', 'es2023', '--rewriteRelativeImportExtensions',
    '--esModuleInterop', '--declaration', '--outDir', resolve(output, 'compiled'),
    resolve(output, 'validation/index.ts'), resolve(output, 'validation/resolver.ts')]);
  const require = createRequire(resolve(runtime, 'package.json'));
  await require('esbuild').build({ absWorkingDir: project, entryPoints: [resolve(output, 'compiled/index.js')],
    outfile: resolve(output, 'bundle/index.js'), bundle: true, packages: 'external',
    platform: 'node', format: 'esm', target: 'es2023', logLevel: 'silent' });
  const manifest = { version, sourceCommit, isolatedCandidateOnly: true, files: [] };
  for (const [path, before, payload] of files) {
    const bytes = await readFile(await existingInside(output, payload));
    manifest.files.push({ path, before, payload, after: digest(bytes) });
  }
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

/** 五个发布文件完整预检；只允许隔离候选及其内部测试副本，未知修改不覆盖。 */
export async function installLatestDesktopApps(action, directory = runtime) {
  assert.ok(['plan', 'apply', 'restore'].includes(action));
  const root = await realpath(directory), allowed = await realpath(runtime);
  const scope = relative(allowed, root);
  assert.ok(!isAbsolute(scope) && scope !== '..' && !scope.startsWith('..\\') && !scope.startsWith('../'), 'latest_desktop_outside_candidate');
  const metadata = JSON.parse(await readFile(await existingInside(root, packagePath + '/package.json'), 'utf8'));
  assert.equal(metadata.name, '@deepseek-ai/dsh-host-open-in-app');
  assert.equal(metadata.version, version);
  const manifest = JSON.parse(await readFile(await existingInside(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, version); assert.equal(manifest.sourceCommit, sourceCommit);
  assert.equal(manifest.files.length, files.length);
  const prepared = [];
  for (const [index, [path, before, payload]] of files.entries()) {
    const entry = manifest.files[index];
    assert.equal(entry.path, path); assert.equal(entry.before, before); assert.equal(entry.payload, payload);
    const modified = await readFile(await existingInside(output, payload));
    assert.equal(digest(modified), entry.after);
    const target = await existingInside(root, packagePath + '/' + path), current = await readFile(target);
    const backupName = path.replaceAll('/', '--');
    let original = current;
    if (digest(original) !== before) original = await readFile(await existingInside(root, 'desktop-app-originals/' + backupName));
    assert.equal(digest(original), before, 'latest_desktop_original_mismatch');
    assert.ok([before, entry.after].includes(digest(current)), 'latest_desktop_unknown_edit');
    prepared.push({ target, current, original, modified, backupName });
  }
  const report = { action, version, sourceCommit, isolatedCandidateOnly: true, files: files.length, written: 0 };
  if (action === 'plan') return report;
  await mkdir(resolve(root, 'desktop-app-originals'), { recursive: true });
  await existingInside(root, 'desktop-app-originals');
  // 所有原件先保存；即使最后一个文件不匹配，也不会提前改写前面的入口。
  for (const file of prepared) {
    try { await existingInside(root, 'desktop-app-originals/' + file.backupName); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(resolve(root, 'desktop-app-originals', file.backupName), file.original);
  }
  const written = [];
  try {
    for (const file of prepared) {
      assert.deepEqual(await readFile(file.target), file.current, 'latest_desktop_concurrent_change');
      const desired = action === 'apply' ? file.modified : file.original;
      if (file.current.equals(desired)) continue;
      await replaceFile(file.target, desired); written.push({ file, desired });
    }
    for (const file of prepared) assert.deepEqual(await readFile(file.target), action === 'apply' ? file.modified : file.original);
  } catch (error) {
    const failures = [];
    for (const { file, desired } of written.reverse()) try {
      assert.deepEqual(await readFile(file.target), desired, 'latest_desktop_rollback_changed');
      await replaceFile(file.target, file.current);
    } catch (failure) { failures.push(failure); }
    if (failures.length) throw new AggregateError([error, ...failures], 'Latest desktop rollback needs attention');
    throw error;
  }
  report.written = written.length;
  await writeFile(resolve(root, 'latest-desktop-apps-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action] = process.argv.slice(2);
  console.log(JSON.stringify(action === 'prepare' ? await prepareLatestDesktopApps() : await installLatestDesktopApps(action)));
}
