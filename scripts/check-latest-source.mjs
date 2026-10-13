import { execFileSync } from 'node:child_process';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'artifacts/latest-source-check');
const git = args => execFileSync('git', args, { cwd: source, windowsHide: true, encoding: 'utf8' }).trim();
const commit = git(['rev-parse', 'HEAD']);
if (commit !== '5badb15009ae1756c3afe0ae0cef1faafc290ccc') throw Error('Unexpected latest source commit');
const tag = git(['describe', '--tags', '--exact-match', 'HEAD']);
if (tag !== 'dsh-v0.2.1-alpha.1') throw Error('Unexpected latest source tag');
if (git(['status', '--porcelain'])) throw Error('Latest source checkout has tracked changes');
const manifest = JSON.parse(await readFile(resolve(source, 'package.json'), 'utf8'));
if (manifest.version !== '0.2.1-alpha.1' || manifest.packageManager !== 'pnpm@11.7.0') throw Error('Unexpected latest source manifest');
const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
if (files.length < 10000 || !files.includes('pnpm-lock.yaml') || !files.includes('apps/cli/src/bin.ts')) throw Error('Incomplete latest source checkout');
await Promise.all(['node_modules/tsx/package.json', 'node_modules/typescript/package.json']
  .map(path => access(resolve(source, path))));
const report = { at: new Date().toISOString(), commit, tag, version: manifest.version,
  packageManager: manifest.packageManager, trackedFiles: files.length, clean: true, dependencyEntrypointsPresent: true,
  sourceBuildVerified: false, sourceStartupVerified: false };
if (process.argv.slice(2).some(arg => arg !== '--built')) throw Error('Unknown source-check argument');
if (process.argv.includes('--built')) {
  const { readClientBuildRecord } = await import(pathToFileURL(resolve(source, 'scripts/client-build-environment.ts')).href);
  const record = readClientBuildRecord(source);
  await access(resolve(source, 'apps/cli/lib/bin.js'));
  report.sourceBuildVerified = true;
  report.clientArtifacts = record.artifacts;
}
await writeFile(resolve(root, 'artifacts/latest-runtime-check/source-checkout.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
