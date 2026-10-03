import { execFileSync } from 'node:child_process';
import { mkdir, readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const out = fileURLToPath(new URL('../../artifacts/compatibility/source-start/', import.meta.url));
export async function runIdentity(root, mode) {
  await mkdir(out, { recursive: true });
  const source = await readFile(new URL('./identity-worker.mjs', import.meta.url), 'utf8');
  const home = await mkdtemp(resolve(out, 'identity-'));
  let worker = source;
  if (mode === 'compiled') {
    for (const [name, path] of [['@deepseek-ai/cordis', 'vendor/cordis/lib/index.js'], ['@deepseek-ai/dsh-tools', 'packages/core/tools/lib/index.js'], ['@deepseek-ai/dsh-app-boot', 'packages/boot/app-boot/lib/index.js']]) {
      worker = worker.replace(`from '${name}';`, `from '${pathToFileURL(resolve(root, path)).href}';`);
    }
    worker = worker.replace("earlyPath: import.meta.resolve('@deepseek-ai/dsh-tools')", `earlyPath: '${pathToFileURL(resolve(root, 'packages/core/tools/lib/index.js')).href}'`);
  }
  let stdout;
  try { stdout = execFileSync(process.execPath, [...(mode === 'compiled' ? [] : ['--import', 'tsx/esm']),
    ...(mode === 'canonical-preload' ? ['--import', new URL('./preload-probe.mjs', import.meta.url).href] : []),
    '--input-type=module', '--eval', worker], {
    cwd: root, env: { ...process.env, DSHM_IDENTITY_HOME: home, DSHM_IDENTITY_MODE: mode,
      DSHM_IDENTITY_REGISTER: new URL('./register.mjs', import.meta.url).href,
      DSHM_SOURCE_ROOT: root,
      DSHM_PLUGIN_ROOT: fileURLToPath(new URL('../../', import.meta.url)),
      ...(mode === 'explicit-tsconfig' ? { TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.json') } : {}),
    },
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  }); } catch (error) {
    throw Error(`Identity child failed (${mode}): ${String(error.stderr ?? error.message).slice(-3000)}`);
  }
  return JSON.parse(stdout.trim());
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? 'F:/Program Files/deepseek-harness');
  const results = [];
  for (const mode of (process.argv[3]?.split(',') ?? ['original-source', 'original-source'])) results.push(await runIdentity(root, mode));
  await writeFile(resolve(out, process.argv[3] ? 'identity-probes.json' : 'identity-reproduction.json'), JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
