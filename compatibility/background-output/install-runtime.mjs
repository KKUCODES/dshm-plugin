import { readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outputRoot, sourceRoot, normalize, applyChange } from './prepare.mjs';
import { baseline, patchVersion, changes } from './changes.mjs';
import { digest, existingInside, replaceFile } from '../install-files.mjs';
export { digest, existingInside, replaceFile } from '../install-files.mjs';
const allowedPackages = new Set([
  'packages/jobs/jobs', 'packages/jobs/jobs-local',
  'packages/shell/shell', 'packages/shell/bash-local', 'packages/shell/pwsh-local',
  'packages/shell/tool-bash', 'packages/shell/tool-pwsh',
  'packages/subprocess/subprocess', 'packages/subprocess/subprocess-local',
]);

export async function installRuntime(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw new Error('Expected plan, apply or restore');
  const targetRoot = await realpath(resolve(targetDirectory));
  if (targetRoot.toLowerCase() === (await realpath(sourceRoot)).toLowerCase()) throw new Error('Reference checkout is read-only');
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'runtime-manifest.json'), 'utf8'));
  if (manifest.baseline !== baseline || manifest.patchVersion !== patchVersion || !manifest.files.length) throw new Error('Unexpected manifest');
  for (const pkg of manifest.packages) {
    if (!allowedPackages.has(pkg.directory)) throw new Error('Unexpected package');
    const actual = JSON.parse(await readFile(await existingInside(targetRoot, `${pkg.directory}/package.json`), 'utf8'));
    if (actual.name !== pkg.name || actual.version !== pkg.version) throw new Error(`Package mismatch: ${pkg.directory}`);
  }
  // 适用范围是已核验源码构建；未知升级/定制源码不能静默被旧补丁覆盖。
  for (const source of manifest.sourceInputs) {
    const actual = normalize(await readFile(await existingInside(targetRoot, source.path), 'utf8'));
    if (digest(actual) !== source.sha256) {
      // 同版本源码补丁可以与编译补丁共存；不因安装源码补丁而失去编译产物的恢复入口。
      const change = changes.find(item => item.path === source.path && item.sha256 === source.sha256);
      const original = change && await readFile(resolve(sourceRoot, change.path), 'utf8');
      if (!change || actual !== applyChange(change, original)) throw new Error(`Source mismatch: ${source.path}`);
    }
  }
  const entries = [];
  const paths = new Set();
  for (const file of manifest.files) {
    const directory = file.path.split('/lib/')[0];
    if (!allowedPackages.has(directory) || !/\/lib\/(?:[\w-]+\.js|types\/[\w/-]+\.d\.ts)$/.test(file.path)
      || paths.has(file.path)) throw new Error('Unexpected runtime path');
    paths.add(file.path);
    const target = await existingInside(targetRoot, file.path);
    const before = await readFile(resolve(outputRoot, 'runtime-original', file.path));
    const after = await readFile(resolve(outputRoot, 'runtime', file.path));
    if (digest(before) !== file.before || digest(after) !== file.after) throw new Error(`Bundle hash mismatch: ${file.path}`);
    const current = await readFile(target), hash = digest(current);
    if (hash !== file.before && hash !== file.after) throw new Error(`Installed file changed: ${file.path}`);
    entries.push({ ...file, target, beforeBytes: before, afterBytes: after, current, hash });
  }
  const original = entries.filter(file => file.hash === file.before).length;
  const patched = entries.length - original;
  const result = { action, targetRoot, patchVersion, files: entries.length, original, patched };
  if (action === 'plan') return result;
  const desired = action === 'apply' ? 'after' : 'before';
  const written = [];
  try {
    for (const file of entries) {
      if (file.hash === file[desired]) continue;
      // 预检和写入之间若文件变化，停止并恢复本次已经写入的文件。
      if (digest(await readFile(file.target)) !== file.hash) throw new Error(`Concurrent modification: ${file.path}`);
      await replaceFile(file.target, file[`${desired}Bytes`]);
      written.push(file);
    }
    for (const file of entries) if (digest(await readFile(file.target)) !== file[desired]) throw new Error(`Verification failed: ${file.path}`);
  } catch (error) {
    const failures = [];
    for (const file of written.reverse()) {
      try {
        if (digest(await readFile(file.target)) !== file[desired]) throw new Error(`Rollback found external change: ${file.path}`);
        await replaceFile(file.target, file.current);
      } catch (rollback) { failures.push(rollback); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Install failed and rollback needs attention');
    throw error;
  }
  // 回执仅写插件产物目录；原文件副本随安装包保留，恢复时再次验证其hash。
  await writeFile(resolve(outputRoot, 'install-receipt.json'), JSON.stringify({
    ...result, at: new Date().toISOString(), written: written.length,
    state: action === 'apply' ? 'patched' : 'original',
  }, null, 2) + '\n');
  return { ...result, written: written.length, state: action === 'apply' ? 'patched' : 'original' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, targetDirectory] = process.argv.slice(2);
  if (!targetDirectory) throw new Error('Specify the DSH installation directory; stop DSH before apply/restore');
  console.log(JSON.stringify(await installRuntime(action, targetDirectory)));
}
