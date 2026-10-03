import { readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { changes, patchVersion } from './changes.mjs';
import { applyChange, normalize, outputRoot, sourceRoot } from './prepare.mjs';
import { digest, existingInside, replaceFile } from './install-runtime.mjs';

/** 精确原文与补丁双向匹配；只改十个声明过的源码文件，不修改配置、包入口或参考检出。 */
export async function installSource(action, targetDirectory) {
  if (!['plan', 'apply', 'restore'].includes(action)) throw Error('Expected plan, apply or restore');
  const targetRoot = await realpath(resolve(targetDirectory));
  if (targetRoot.toLowerCase() === (await realpath(sourceRoot)).toLowerCase()) throw Error('Reference checkout is read-only');
  const entries = [];
  for (const change of changes) {
    const directory = change.path.split('/src/')[0];
    const referencePackage = JSON.parse(await readFile(resolve(sourceRoot, directory, 'package.json'), 'utf8'));
    const targetPackage = JSON.parse(await readFile(await existingInside(targetRoot, `${directory}/package.json`), 'utf8'));
    if (targetPackage.name !== referencePackage.name || targetPackage.version !== referencePackage.version) throw Error(`Package mismatch: ${directory}`);
    const original = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
    const patched = applyChange(change, original);
    const target = await existingInside(targetRoot, change.path);
    const current = await readFile(target);
    const text = current.toString('utf8'), normalized = normalize(text);
    // 保留目标文件原换行；非 UTF-8 或混合换行不能保证精确恢复，因此在任何写入前拒绝。
    if (!Buffer.from(text).equals(current) || /\r(?!\n)/.test(text)
      || (text.includes('\r\n') && /(?<!\r)\n/.test(text))) throw Error(`Unsupported source encoding or line endings: ${change.path}`);
    if (normalized !== original && normalized !== patched) throw Error(`Source mismatch: ${change.path}`);
    const encode = value => Buffer.from(text.includes('\r\n') ? value.replaceAll('\n', '\r\n') : value);
    entries.push({ path: change.path, target, current, original: encode(original), patched: encode(patched),
      state: normalized === patched ? 'patched' : 'original' });
  }
  const summary = { action, targetRoot, patchVersion, files: entries.length,
    original: entries.filter(entry => entry.state === 'original').length,
    patched: entries.filter(entry => entry.state === 'patched').length };
  if (action === 'plan') return summary;
  const desired = action === 'apply' ? 'patched' : 'original', written = [];
  try {
    for (const entry of entries) {
      if (entry.state === desired) continue;
      // 重新核对路径和内容；不把预检后出现的链接或其他修改当作自己的文件覆盖。
      await existingInside(targetRoot, entry.path);
      if (digest(await readFile(entry.target)) !== digest(entry.current)) throw Error(`Concurrent modification: ${entry.path}`);
      await replaceFile(entry.target, entry[desired]); written.push(entry);
    }
    for (const entry of entries) {
      await existingInside(targetRoot, entry.path);
      if (digest(await readFile(entry.target)) !== digest(entry[desired])) throw Error(`Verification failed: ${entry.path}`);
    }
  } catch (error) {
    const failures = [];
    for (const entry of written.reverse()) {
      try {
        await existingInside(targetRoot, entry.path);
        if (digest(await readFile(entry.target)) !== digest(entry[desired])) throw Error(`Rollback found external change: ${entry.path}`);
        await replaceFile(entry.target, entry.current);
      } catch (rollback) { failures.push(rollback); }
    }
    if (failures.length) throw new AggregateError([error, ...failures], 'Source install failed and rollback needs attention');
    throw error;
  }
  const result = { ...summary, written: written.length, state: desired };
  await writeFile(resolve(outputRoot, 'source-install-receipt.json'), JSON.stringify({ ...result, at: new Date().toISOString() }, null, 2) + '\n');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, target] = process.argv.slice(2);
  if (!target) throw Error('Specify the DSH source installation directory; stop DSH before apply/restore');
  console.log(JSON.stringify(await installSource(action, target)));
}
