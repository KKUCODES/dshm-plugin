// 只在新的审查目录生成和解包候选；不覆盖运行中的candidate或日常安装。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildLatestCandidate } from './build-latest-candidate.mjs';

assert.equal(process.argv.length, 2);
const root = resolve(import.meta.dirname, '..');
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const pnpm = resolve(root, 'artifacts/latest-source-check/node_modules/pnpm/bin/pnpm.cjs');
const output = await mkdtemp(resolve(runtime, 'candidate-package-check-'));
assert.equal(await realpath(output), output);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { at: new Date().toISOString(), output, targetVersion: '0.2.1-alpha.1', passed: false };
const tree = async directory => {
  const rows = [];
  for (const item of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    assert.equal(item.isSymbolicLink(), false);
    if (item.isDirectory()) rows.push(...(await tree(resolve(directory, item.name))).map(row => ({ ...row, path: item.name + '/' + row.path })));
    else if (item.isFile()) rows.push({ path: item.name, sha256: hash(await readFile(resolve(directory, item.name))) });
  }
  return rows;
};
const liveBefore = await tree(resolve(runtime, 'candidate'));
const productBefore = hash(await readFile(resolve(root, 'package.json')));
const command = (binary, args, cwd) => execFileSync(binary, args, {
  cwd, windowsHide: true, encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024,
});
try {
  const original = JSON.parse(command(process.execPath, [pnpm, 'pack', '--dry-run', '--json'], resolve(runtime, 'candidate')));
  assert.equal(original.name, '@dsh-mobile/plugin'); assert.equal(original.version, '0.1.76-latest.0');
  await writeFile(resolve(output, 'original-dry-run.json'), JSON.stringify(original, null, 2), { flag: 'wx' });
  report.originalMissing = ['README.md', 'dist/index.d.ts', 'dist/config.d.ts', 'dist/client/index.d.ts']
    .filter(path => !original.files.some(file => file.path === path));
  assert.equal(report.originalMissing.length, 4, 'Review the original fixture when its package has changed');

  const built = await buildLatestCandidate(basename(output) + '/package');
  report.sourceSnapshot = built.snapshot;
  const { evaluatePluginCompatibility } = await import(pathToFileURL(resolve(runtime, 'node_modules/@deepseek-ai/dsh-app-boot/lib/index.js')));
  assert.equal(evaluatePluginCompatibility(built.manifest, {}, '0.2.1-alpha.1'), undefined);
  for (const version of ['0.1.6-alpha.2', '0.2.1-alpha.2', '0.2.1', '0.3.0'])
    assert.equal(evaluatePluginCompatibility(built.manifest, {}, version).exempted, false);
  const externals = [...new Set(Object.values(built.hostMetafile.outputs).flatMap(file => file.imports)
    .filter(item => item.external && !item.path.startsWith('node:')).map(item => item.path))];
  for (const name of externals) {
    assert.ok(built.manifest.peerDependencies[name] ?? built.manifest.dependencies[name], 'Undeclared runtime dependency: ' + name);
    if (name.startsWith('@deepseek-ai/dsh-')) assert.equal(built.manifest.peerDependencies[name], '0.2.1-alpha.1');
  }
  report.runtimeExternals = externals;
  const packed = JSON.parse(command(process.execPath, [pnpm, 'pack', '--json', '--pack-destination', output], built.target));
  assert.equal(packed.name, built.manifest.name); assert.equal(packed.version, built.manifest.version);
  assert.equal(basename(packed.filename), 'dsh-mobile-plugin-0.1.76-latest.0.tgz');
  const tarball = resolve(output, packed.filename);
  assert.equal(tarball, resolve(output, 'dsh-mobile-plugin-0.1.76-latest.0.tgz'));
  assert.equal(await realpath(tarball), tarball);
  const entries = command('tar', ['-tf', tarball], output).trim().split(/\r?\n/);
  for (const entry of entries) assert.match(entry, /^package\/(?!.*(?:^|\/)\.\.\/)[A-Za-z0-9._/-]+$/);
  const expected = await tree(built.target);
  assert.deepEqual(entries.map(name => name.slice('package/'.length)).sort(), expected.map(file => file.path).sort());
  for (const path of ['README.md', 'dist/index.d.ts', 'dist/config.d.ts', 'dist/client/index.d.ts'])
    assert.ok(entries.includes('package/' + path));
  report.package = { path: tarball, sha256: hash(await readFile(tarball)), files: expected.length };

  const consumer = resolve(output, 'consumer');
  const installed = resolve(consumer, 'node_modules/@dsh-mobile/plugin');
  await mkdir(installed, { recursive: true }); assert.equal(await realpath(installed), installed);
  command('tar', ['-xf', tarball, '--strip-components=1', '-C', installed], output);
  const installedTree = await tree(installed);
  assert.deepEqual(installedTree.filter(file => file.path !== 'package.json'), expected.filter(file => file.path !== 'package.json'));
  // pnpm重排manifest字段并格式化JSON；全字段比较，不能只检查name/version或忽略依赖。
  assert.deepEqual(JSON.parse(await readFile(resolve(installed, 'package.json'))), built.manifest);
  report.packedManifestSha256 = hash(await readFile(resolve(installed, 'package.json')));
  // 从归档的真实包名入口导入，不从构建目录或类型替身读取。
  await writeFile(resolve(consumer, 'package.json'), '{"type":"module"}\n', { flag: 'wx' });
  await writeFile(resolve(consumer, 'runtime.mjs'), `import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {apply,Config,name} from '@dsh-mobile/plugin';
const require=createRequire(import.meta.url);
assert.equal(require.resolve('@dsh-mobile/plugin'),${JSON.stringify(resolve(installed, 'dist/index.js'))});
assert.equal(name,'dsh-mobile');assert.equal(typeof apply,'function');assert.ok(Config);
console.log('installed package runtime import passed');\n`, { flag: 'wx' });
  command(process.execPath, [resolve(consumer, 'runtime.mjs')], consumer);
  await writeFile(resolve(consumer, 'consumer.ts'), `import type {Context} from '@deepseek-ai/cordis';
import {apply,type Config} from '@dsh-mobile/plugin';
import {apply as applyClient} from '@dsh-mobile/plugin/client';
const host:(ctx:Context,config:Config)=>Promise<void>=apply;
const client:(ctx:Context)=>void=applyClient;
const config:Config={enrollmentRef:'DSH_MOBILE_ENROLLMENT_TOKEN'};
void host;void client;void config;\n`, { flag: 'wx' });
  await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    strict: true, module: 'NodeNext', moduleResolution: 'NodeNext', target: 'ES2023', noEmit: true, skipLibCheck: false,
  }, include: ['consumer.ts'] }, null, 2), { flag: 'wx' });
  command(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json', '--pretty', 'false'], consumer);
  report.installedPackage = { payloadBytesIdentical: true, manifestContentIdentical: true, runtimeImport: true, hostAndClientTypes: true };
  report.exactVersionGate = true;
  report.passed = true;
} catch (error) {
  report.failure = { name: error.name, message: error.message, code: error.code, status: error.status };
  // 编译/工具原始失败只留在本项目证据，不把完整命令日志作为用户输出。
  if (error.stdout || error.stderr) await writeFile(resolve(output, 'failure.log'), String(error.stdout ?? '') + String(error.stderr ?? ''), { flag: 'wx' });
  process.exitCode = 1;
} finally {
  assert.deepEqual(await tree(resolve(runtime, 'candidate')), liveBefore);
  assert.equal(hash(await readFile(resolve(root, 'package.json'))), productBefore);
  report.runningCandidatePreserved = true; report.productionManifestPreserved = true;
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
}
console.log(JSON.stringify({ output, passed: report.passed, missingBefore: report.originalMissing,
  files: report.package?.files, runningCandidatePreserved: report.runningCandidatePreserved, failure: report.failure?.name }));
process.exit(process.exitCode ?? 0);
