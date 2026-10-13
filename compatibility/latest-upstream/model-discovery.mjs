import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const originalHash = 'd46dbc30aeb3414190000e6f8aeaaf994246b5e5c651de07639f4a7e92de37ef';
const digest = value => createHash('sha256').update(value).digest('hex');
const edits = [
  ['async function discoverModels(request, storedProfile) {', 'async function discoverModels(request, storedProfile, options) {'],
  ['\tif (request.provider !== void 0) {\n\t\tconst installed = catalogModels(request.provider);',
    '\tif (options?.catalog !== false && request.provider !== void 0) {\n\t\tconst installed = catalogModels(request.provider);'],
  ['\t\tresponse = await fetch(url, {\n\t\t\tmethod: "GET",',
    '\t\tresponse = await fetch(url, {\n\t\t\t...options?.redirect === "error" ? { redirect: "error" } : {},\n\t\t\tmethod: "GET",'],
  ['\t}, () => storedDiscoveryProfile(request.provider)));\n\tlet registration;',
    '\t}, () => storedDiscoveryProfile(request.provider)));\n\t// 专用手机探测按真实实例隔离；原目录入口与认证解析保留。\n\tctx.llm.registerModelDiscovery(settingsNs + ":dshm-endpoint-v2", (request, signal) => discoverModels({\n\t\t...request,\n\t\t...signal === void 0 ? {} : { signal }\n\t}, () => storedDiscoveryProfile(request.provider), { redirect: "error", catalog: false }));\n\tlet registration;'],
];

/** 只修改固定新版隔离 npm 文件，未知版本/字节/路径均拒绝。 */
export async function prepareLatestModelDiscovery() {
  const dir = resolve(runtime, 'node_modules/@deepseek-ai/dsh-llm-pi-ai');
  const path = resolve(dir, 'lib/index.js'), originals = resolve(runtime, 'patch-originals');
  await mkdir(originals, { recursive: true });
  const actual = await realpath(runtime);
  const inside = async target => {
    const rel = relative(actual, await realpath(target));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_discovery_outside_runtime');
  };
  await inside(path); await inside(originals);
  const pkg = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-llm-pi-ai' || pkg.version !== '0.2.1-alpha.1') throw Error('latest_discovery_version_mismatch');
  const backup = resolve(originals, 'llm-pi-ai-index.js'), current = await readFile(path);
  let original = current;
  if (digest(original) !== originalHash) { await inside(backup); original = await readFile(backup); }
  if (digest(original) !== originalHash) throw Error('latest_discovery_original_mismatch');
  let modified = original.toString();
  for (const [before, after] of edits) {
    if (modified.split(before).length !== 2) throw Error('latest_discovery_anchor_mismatch');
    modified = modified.replace(before, after);
  }
  if (![originalHash, digest(modified)].includes(digest(current))) throw Error('latest_discovery_changed_outside_patch');
  await writeFile(backup, original); await writeFile(path, modified);
  const report = { patch: 'latest-model-discovery-v1', version: pkg.version,
    sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc', isolatedCandidateOnly: true,
    target: path, before: originalHash, after: digest(modified) };
  await writeFile(resolve(runtime, 'model-discovery-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareLatestModelDiscovery();
