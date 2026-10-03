import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseline, patchVersion, changes } from './changes.mjs';

const pluginRoot = fileURLToPath(new URL('../../', import.meta.url));
export const sourceRoot = resolve(pluginRoot, '../deepseek-harness');
export const outputRoot = resolve(pluginRoot, 'artifacts/compatibility/background-output');
export const normalize = text => text.replaceAll('\r\n', '\n');
export const sha256 = text => createHash('sha256').update(normalize(text)).digest('hex');

export function applyChange(change, text) {
  let result = normalize(text);
  if (sha256(result) !== change.sha256) throw new Error(`Baseline mismatch: ${change.path}`);
  for (const { before, after } of change.edits) {
    if (result.split(before).length !== 2) throw new Error(`Ambiguous patch anchor: ${change.path}`);
    result = result.replace(before, after);
  }
  return result;
}

/** 先完整核对十个文件再生成副本；不提供原地覆盖电脑安装的选项。 */
export async function prepare() {
  const root = await realpath(pluginRoot);
  await mkdir(outputRoot, { recursive: true });
  const output = await realpath(outputRoot);
  const rel = relative(root, output);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Output must stay inside plugin project');
  const files = await Promise.all(changes.map(async change => {
    const original = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
    return { ...change, original, modified: applyChange(change, original) };
  }));
  for (const file of files) {
    for (const [kind, text] of [['original', file.original], ['patched', file.modified]]) {
      const target = resolve(outputRoot, kind, file.path);
      await mkdir(dirname(target), { recursive: true });
      // 禁止既有目录链接把构建写入导出到项目之外。
      const parent = relative(root, await realpath(dirname(target)));
      if (parent.startsWith('..') || isAbsolute(parent)) throw new Error('Output directory escaped project');
      try { if (await realpath(target) !== target) throw new Error('Output file must not be a link'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      await writeFile(target, text);
    }
  }
  const manifest = { baseline, patchVersion, files: files.map(file => ({
    path: file.path, originalSha256: file.sha256, patchedSha256: sha256(file.modified),
  })) };
  await writeFile(resolve(outputRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  let diff;
  try {
    diff = execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-ext-diff', '--src-prefix=a/', '--dst-prefix=b/', '--', 'original', 'patched'],
      { cwd: outputRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    if (error.status !== 1 || typeof error.stdout !== 'string') throw error;
    diff = error.stdout;
  }
  // 仅规范 diff 头；不替换源码中可能恰好出现的相同文字。
  diff = diff.split('\n').map(line => /^(diff --git |--- |\+\+\+ )/.test(line)
    ? line.replaceAll('a/original/', 'a/').replaceAll('b/patched/', 'b/') : line).join('\n');
  await writeFile(resolve(outputRoot, `${patchVersion}.patch`), diff);
  execFileSync('git', ['-c', 'core.autocrlf=false', 'apply', '--check', resolve(outputRoot, `${patchVersion}.patch`)],
    { cwd: resolve(outputRoot, 'original'), windowsHide: true, stdio: 'pipe' });
  execFileSync('git', ['-c', 'core.autocrlf=false', 'apply', '--reverse', '--check', resolve(outputRoot, `${patchVersion}.patch`)],
    { cwd: resolve(outputRoot, 'patched'), windowsHide: true, stdio: 'pipe' });
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await prepare();
  console.log(JSON.stringify({ baseline, patchVersion, files: manifest.files.length, outputRoot }));
}
