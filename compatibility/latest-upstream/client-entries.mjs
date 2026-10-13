import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const originalHash = '9b607a6f28ae9e0d62bde54c78eb933fef1598c3ea707d81012d94b457b51938';
const digest = value => createHash('sha256').update(value).digest('hex');
const edits = [
  ['return JSON.stringify(manifest.modules.map((row) => [\n\t\t\t\trow.id,\n\t\t\t\trow.rev,\n\t\t\t\trow.inject,\n\t\t\t\trow.external\n\t\t\t]));',
    'return JSON.stringify([manifest.modules.map(row => [row.id, row.rev, row.inject, row.external]), manifest.plugins.map(row => row.id)]);'],
  ['\t\t\tsync(graph) {\n\t\t\t\tconst manifest = parseBootManifest(graph);', `
      sync(graph) { return this.syncManifest(parseBootManifest(graph)); }
      /** 保留完整依赖图，仅激活本次图内的手机名单；原桌面 sync 仍全量。 */
      syncSelected(graph, pluginIds) {
        const manifest = parseBootManifest(graph), known = new Set(manifest.plugins.map(row => row.id));
        if (!Array.isArray(pluginIds) || pluginIds.some(id => typeof id !== 'string' || !known.has(id))
          || new Set(pluginIds).size !== pluginIds.length) throw Error('client-modules: invalid activation selection');
        const selected = new Set(pluginIds);
        return this.syncManifest({ ...manifest, plugins: manifest.plugins.filter(row => selected.has(row.id)) });
      }
      syncManifest(manifest) {`],
  ['if (this.stopped || desired === void 0) return;', 'if (this.stopped || desired === void 0 || !this.desired.plugins.some(row => row.id === id)) return;'],
  ['\t\t\t\tfor (const row of manifest.modules) {\n\t\t\t\t\tif (!this.current(generation)) break;',
    '\t\t\t\tfor (const row of manifest.modules) {\n          if (!wanted.has(row.id)) continue;\n\t\t\t\t\tif (!this.current(generation)) break;'],
];

/** 只修改项目内固定 npm 候选 bootstrap，保留原 ModuleLoader 及依赖解析。 */
export async function prepareLatestClientEntries() {
  const path = resolve(runtime, 'node_modules/@deepseek-ai/dsh-client-modules/lib/client.js');
  const pkg = JSON.parse(await readFile(resolve(path, '../../package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-client-modules' || pkg.version !== '0.2.1-alpha.1') throw Error('latest_client_entries_version_mismatch');
  const originals = resolve(runtime, 'patch-originals'); await mkdir(originals, { recursive: true });
  const actual = await realpath(runtime);
  const inside = async path => {
    const rel = relative(actual, await realpath(path));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_client_entries_outside_runtime');
  };
  await inside(path); await inside(originals);
  const backup = resolve(originals, 'client-modules-client.js'), current = await readFile(path);
  let original = current;
  if (digest(original) !== originalHash) { await inside(backup); original = await readFile(backup); }
  if (digest(original) !== originalHash) throw Error('latest_client_entries_original_mismatch');
  let modified = original.toString();
  for (const [before, after] of edits) {
    if (modified.split(before).length !== 2) throw Error('latest_client_entries_anchor_mismatch');
    modified = modified.replace(before, after);
  }
  if (![originalHash, digest(modified)].includes(digest(current))) throw Error('latest_client_entries_changed_outside_patch');
  await writeFile(backup, original); await writeFile(path, modified);
  const report = { patch: 'latest-client-entries-v1', version: pkg.version, sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc',
    isolatedCandidateOnly: true, target: path, before: originalHash, after: digest(modified) };
  await writeFile(resolve(runtime, 'client-entries-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(JSON.stringify(await prepareLatestClientEntries()));
