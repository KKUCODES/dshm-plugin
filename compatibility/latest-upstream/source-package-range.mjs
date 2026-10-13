import { readFileSync } from 'node:fs';
import { seaRunnerMatch, transformSdkNativePath } from './sdk-native-path.mjs';
import { transformSdkModuleIdentity } from './sdk-module-identity.mjs';

const manager = { patch: 'plugin-install-cancel', name: '@deepseek-ai/dsh-plugin-manager', package: 'packages/boot/plugin-manager' };
const root = { patch: 'plugin-install-cancel', name: '@deepseek-ai/dsh-root', package: '.' };
const runner = readFileSync(new URL('./package-runner-source.ts', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
export const sourcePackageRangeChanges = [
  { ...manager, path: 'packages/boot/plugin-manager/src/run-tree.ts',
    hash: 'd3da95db5f30882ed1a7dfb499de7b35cb9fd71eb137fc2384ebc2a5d18c38cd',
    transform: source => "import { execa } from 'execa'\nimport { fileURLToPath } from 'node:url'\n\n" + source + '\n' + runner },
  { ...manager, path: 'packages/boot/plugin-manager/package.json',
    hash: '111c237143afde7a59f8ccaab02e1669067a30c1b4065c609906c3511f5303ee', edits: [
      ['    "./types": {', '    "./runner": {\n      "types": "./lib/types/run-tree.d.ts",\n      "default": "./lib/types/run-tree.js"\n    },\n    "./types": {'],
      ['    "@deepseek-ai/dsh-atomic-write": "workspace:*",',
        '    "@deepseek-ai/dsh-atomic-write": "workspace:*",\n    "@deepseek-ai/dsh-win32-process": "workspace:*",'],
    ] },
  { ...manager, path: 'packages/boot/plugin-manager/tsconfig.json',
    hash: 'b23905dbe27b7d2bb0aedebce6f8ac1a913d12b80bd31aaecf6f96ed0a8e1b79', edits: [
      ['      "path": "../../subprocess/subprocess"\n    },',
        '      "path": "../../subprocess/subprocess"\n    },\n    {\n      "path": "../../subprocess/win32-process"\n    },'],
    ] },
  { ...root, path: 'pnpm-lock.yaml',
    hash: '2893d71a9ef07d2d72d47b2199e581b9e8d90638a15ee151908eebf69dfc637c', edits: [
      ["  packages/boot/plugin-manager:\n    dependencies:\n      '@deepseek-ai/dsh-app-boot':\n        specifier: workspace:*\n        version: link:../app-boot\n      '@deepseek-ai/dsh-atomic-write':\n        specifier: workspace:*\n        version: link:../../util/atomic-write\n",
        "  packages/boot/plugin-manager:\n    dependencies:\n      '@deepseek-ai/dsh-app-boot':\n        specifier: workspace:*\n        version: link:../app-boot\n      '@deepseek-ai/dsh-atomic-write':\n        specifier: workspace:*\n        version: link:../../util/atomic-write\n      '@deepseek-ai/dsh-win32-process':\n        specifier: workspace:*\n        version: link:../../subprocess/win32-process\n"],
    ] },
  { ...root, path: 'python/sdk-runtime/runtime-bootstrap.mjs',
    hash: '882230845cdf5e6c4782b5db651cdefbe496af5ae32d0ceaab6d3a548ab12547',
    transform: source => transformSdkModuleIdentity(transformSdkNativePath(source)), edits: [
      ["if (aclRunner !== undefined && process.argv[2] === aclRunner) {",
        seaRunnerMatch + "const packageRunner = process.platform === 'win32'\n  ? fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-plugin-manager/runner'))\n  : undefined\n\nif (matchesSdkRunner(process.argv[2], packageRunner)) {\n  process.argv.splice(1, 1)\n  const { runPackageRunner } = await import('@deepseek-ai/dsh-plugin-manager/runner')\n  await runPackageRunner()\n} else if (matchesSdkRunner(process.argv[2], aclRunner)) {"],
    ] },
];

export const sourcePackageRangeEdits = [
  ["import { awaitTreeGone, leadsOwnGroup, treeAlive, type RunTree } from './run-tree.ts'",
    "import { awaitTreeGone, leadsOwnGroup, treeAlive, packageInvocation, packageRunnerEnvironment, type RunTree } from './run-tree.ts'"],
  ["const child = execa(options.command ?? 'pnpm', [...options.args ?? [], ...args.map(arg => anchorPathSpec(arg, context.cwd))], {\n    cwd: dir, env: environment, extendEnv: false, reject: false,",
    "const child = execa(...packageInvocation(options.command ?? 'pnpm', [...options.args ?? [], ...args.map(arg => anchorPathSpec(arg, context.cwd))]), {\n    ipc: process.platform === 'win32',\n    cwd: dir, env: packageRunnerEnvironment(environment), extendEnv: false, reject: false,"],
  ["const repairing = execa(options.command ?? 'pnpm', [...options.args ?? [], ...repair], {",
    "const repairing = execa(...packageInvocation(options.command ?? 'pnpm', [...options.args ?? [], ...repair]), {\n          ipc: process.platform === 'win32',"],
  ["          cwd: dir, env: environment, extendEnv: false, reject: false, stdin: 'ignore',",
    "          cwd: dir, env: packageRunnerEnvironment(environment), extendEnv: false, reject: false, stdin: 'ignore',"],
];
