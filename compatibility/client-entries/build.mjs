import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { baseline, patchVersion, directory, changes } from './changes.mjs';
import { sourceRoot, normalize, sha256, applyChange } from '../background-output/prepare.mjs';
import { write } from '../pending-notifications/build-test-runtime.mjs';

export const outputRoot = fileURLToPath(new URL('../../artifacts/compatibility/client-entries/', import.meta.url));
/** 固定基线源码的独立构建副本；不改参考检出或实际安装。 */
export async function prepare() {
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', windowsHide: true }).trim();
  if (commit !== baseline) throw Error('Client modules reference commit mismatch');
  const overrides = new Map();
  for (const change of changes) {
    const original = normalize(await readFile(resolve(sourceRoot, change.path), 'utf8'));
    const patched = applyChange(change, original);
    overrides.set(resolve(sourceRoot, change.path).toLowerCase(), patched);
    await write(resolve(outputRoot, 'original', change.path), original);
    await write(resolve(outputRoot, 'patched', change.path), patched);
  }
  const result = await build({ absWorkingDir: sourceRoot, entryPoints: [`${directory}/src/client/index.ts`],
    bundle: true, write: false, metafile: true, format: 'cjs', platform: 'browser', target: 'es2022',
    plugins: [{ name: 'verified-client-entries', setup(builder) {
      builder.onLoad({ filter: /\.ts$/ }, args => {
        const contents = overrides.get(args.path.toLowerCase());
        if (contents !== undefined) return { contents, loader: 'ts', resolveDir: dirname(args.path) };
      });
    } }],
  });
  // bootstrap 不得内联框架副本或依赖运行时 require；其依赖应全部是本包纯模块。
  const sourceInputs = [];
  for (const path of Object.keys(result.metafile.inputs)) {
    if (!path.startsWith(`${directory}/src/client/`)) throw Error(`Unexpected bootstrap dependency: ${path}`);
    const before = normalize(await readFile(resolve(sourceRoot, path), 'utf8'));
    const after = overrides.get(resolve(sourceRoot, path).toLowerCase()) ?? before;
    sourceInputs.push({ path, before: sha256(before), after: sha256(after) });
  }
  if (Object.values(result.metafile.outputs).some(output => output.imports.length)) throw Error('External bootstrap import');
  const code = result.outputFiles[0].text;
  await write(resolve(outputRoot, 'client.js'), `window.__ModuleLoader__.load({id:'@deepseek-ai/dsh-client-modules',factory(require){const module={exports:{}};const exports=module.exports;\n${code}\nreturn module.exports;}});\n`);
  await write(resolve(outputRoot, 'test-runtime.cjs'), code);
  await write(resolve(outputRoot, 'manifest.json'), JSON.stringify({ baseline, patchVersion, sourceInputs }, null, 2) + '\n');
  return { baseline, patchVersion, inputs: sourceInputs.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await prepare()));
