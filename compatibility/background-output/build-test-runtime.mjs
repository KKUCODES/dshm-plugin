import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { prepare, sourceRoot, outputRoot } from './prepare.mjs';
import { changes } from './changes.mjs';

await prepare();
const aliases = {
  '@deepseek-ai/dsh-jobs': 'packages/jobs/jobs/src/index.ts',
  '@deepseek-ai/dsh-shell': 'packages/shell/shell/src/index.ts',
  '@deepseek-ai/dsh-subprocess': 'packages/subprocess/subprocess/src/index.ts',
  '@deepseek-ai/dsh-http-proxy': 'packages/util/http-proxy/src/index.ts',
  '@deepseek-ai/dsh-sandbox': 'packages/sandbox/sandbox/src/index.ts',
  '@deepseek-ai/dsh-bash-local': 'packages/shell/bash-local/src/index.ts',
  '@deepseek-ai/dsh-pwsh-local': 'packages/shell/pwsh-local/src/index.ts',
};
const patched = new Map(changes.map(file => [resolve(sourceRoot, file.path).toLowerCase(), file.path]));
const entries = [
  ['OutputCollector', 'packages/subprocess/subprocess-local/src/output.ts'],
  ['LocalJobRegistry', 'packages/jobs/jobs-local/src/index.ts'],
  ['processJob as bashProcessJob', 'packages/shell/tool-bash/src/background.ts'],
  ['processJob as pwshProcessJob', 'packages/shell/tool-pwsh/src/background.ts'],
  ['LocalBashExecutor', 'packages/shell/bash-local/src/index.ts'],
  ['PwshLocalExecutor', 'packages/shell/pwsh-local/src/index.ts'],
  ['SandboxBashExecutor', 'packages/shell/bash-sandbox/src/index.ts'],
  ['SandboxPwshExecutor', 'packages/shell/pwsh-sandbox/src/index.ts'],
];
await build({
  stdin: { contents: entries.map(([exports, path]) => `export { ${exports} } from ${JSON.stringify(resolve(sourceRoot, path))};`).join('\n'),
    resolveDir: sourceRoot, sourcefile: 'background-output-test-runtime.ts', loader: 'ts' },
  outfile: resolve(outputRoot, 'test-runtime.mjs'), bundle: true, format: 'esm', platform: 'node', target: 'node24', external: ['undici'],
  plugins: [{ name: 'verified-compatibility-copy', setup(build) {
    build.onResolve({ filter: /^@deepseek-ai\// }, args => aliases[args.path]
      ? { path: resolve(sourceRoot, aliases[args.path]) } : { path: args.path, external: true });
    build.onLoad({ filter: /\.ts$/ }, async args => {
      const path = patched.get(args.path.toLowerCase());
      if (path) return { contents: await readFile(resolve(outputRoot, 'patched', path), 'utf8'), loader: 'ts', resolveDir: dirname(args.path) };
    });
  } }],
});
console.log('Built isolated patched runtime; no installed DSH files changed.');
