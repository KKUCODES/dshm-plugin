import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { installSourceRuntime, outputRoot, sourceRoot } from './source-runtime.mjs';
import { sourceChanges, sourceCommit } from './source-changes.mjs';
import { installStartup } from '../source-start/install.mjs';

/** 源码联调必须使用实际安装的完整载荷；不能以npm补丁或测试预加载替代。 */
export async function verifyInstalledSource() {
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, windowsHide: true, encoding: 'utf8' }).trim(), sourceCommit);
  await installSourceRuntime('plan', sourceRoot);
  assert.equal((await installStartup('plan', sourceRoot)).state, 'patched');
  const manifest = JSON.parse(await readFile(resolve(outputRoot, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.patches, [...new Set(sourceChanges.map(file => file.patch))]);
  assert.equal(manifest.files.length, sourceChanges.length);
  for (const file of manifest.files) {
    const bytes = await readFile(resolve(sourceRoot, file.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.after, `Source patch is not installed: ${file.path}`);
  }
  const { readClientBuildRecord } = await import(new URL('../../artifacts/latest-source-check/scripts/client-build-environment.ts', import.meta.url));
  return { sourceCommit, patches: manifest.patches, files: manifest.files.length, clientArtifacts: readClientBuildRecord(sourceRoot).artifacts };
}
