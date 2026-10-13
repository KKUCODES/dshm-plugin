import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtime = resolve(root, 'artifacts/latest-runtime-check');
const digest = value => createHash('sha256').update(value).digest('hex');
const plans = [
  { name: 'dsh-agent-preset', hash: '23cd2dd62ac3b27522a2d377e14b5a93f80c2189e733937dcdd02b73a6d3d1da', edits: [
    ['\t\tid: z.string().required(),', '\t\tid: z.string().required(),\n\t\tarchived: z.boolean().default(false),'],
  ] },
  { name: 'dsh-agent-preset-registry', hash: '7e23c01514303b2dfa1b69a95929cb19e43ba761d3478a3104d0f565ca537be7', previous: ['67f15cfa04c2acd14c132f5c01578e53329a2751de9663755a06c7ed8ea44fcb', '2a283d9ad7f91e1b39c80c9e41879b10e5038ed8a5f4b8c077b97a4a6b7bcadd'], edits: [
    ['\t\t\treturn (await Promise.all([...this.definitions.values()].map(async (record) => {', '\t\t\treturn (await Promise.all([...this.definitions.values()].filter(record => record.config.archived !== true).map(async (record) => {'],
    ['\t\tasync select(agent, agentPreset) {', '\t\tasync select(agent, agentPreset) {\n\t\t\tif (this.definitions.get(agentPreset)?.config.archived === true) throw new RemoteError("agent-preset/not-found", "This preset is no longer selectable", { agentPreset, available: [...this.definitions.keys()] });'],
    ['\t\tasync retain(id) {', '\t\tasync retain(id, selectable = false) {'],
    ['\t\t\t\tif (this.definitions.get(wanted) !== record) continue;', '\t\t\t\tif (this.definitions.get(wanted) !== record) continue;\n\t\t\t\tif (selectable && record.config.archived === true) throw new RemoteError("agent-preset/not-found", "This preset is no longer selectable", { agentPreset: wanted, available: [...this.definitions.keys()] });'],
    ['\t\tasync mount(ctx, id) {\n\t\t\tconst generation = await this.retain(id);', '\t\tasync mount(ctx, id, selectable = false) {\n\t\t\tconst generation = await this.retain(id, selectable);'],
    ['\t\t\tconst preset = await this.mount(ctx, id);', '\t\t\tconst preset = await this.mount(ctx, id, true);'],
    ['export { AgentPresetRegistry,', 'export const DSHM_PRESET_ARCHIVE_VERSION = 2;\nexport { AgentPresetRegistry,'],
  ] },
];

/** 仅固定候选编译文件：从目录删除但保留原声明，旧会话仍走原 resolve/mount/retain。 */
export async function prepareLatestPresetArchive() {
  const actual = await realpath(runtime), originals = resolve(runtime, 'patch-originals');
  await mkdir(originals, { recursive: true });
  const inside = async path => {
    const rel = relative(actual, await realpath(path));
    if (rel === '..' || rel.startsWith('../') || rel.startsWith('..\\') || isAbsolute(rel)) throw Error('latest_preset_outside_runtime');
  };
  await inside(originals);
  const prepared = [];
  // 两个输入全部预检后再修改；未知字节不覆盖。
  for (const plan of plans) {
    const dir = resolve(runtime, 'node_modules/@deepseek-ai', plan.name), path = resolve(dir, 'lib/index.js');
    await inside(path);
    const pkg = JSON.parse(await readFile(resolve(dir, 'package.json'), 'utf8'));
    if (pkg.name !== '@deepseek-ai/' + plan.name || pkg.version !== '0.2.1-alpha.1') throw Error('latest_preset_version_mismatch');
    const backup = resolve(originals, plan.name + '-index.js'), current = await readFile(path);
    let original = current;
    if (digest(original) !== plan.hash) { await inside(backup); original = await readFile(backup); }
    if (digest(original) !== plan.hash) throw Error('latest_preset_original_mismatch');
    let next = original.toString();
    for (const [before, after] of plan.edits) {
      if (next.split(before).length !== 2) throw Error('latest_preset_anchor_mismatch');
      next = next.replace(before, after);
    }
    if (![plan.hash, digest(next), ...(plan.previous ?? [])].includes(digest(current))) throw Error('latest_preset_changed_outside_patch');
    prepared.push({ path, backup, original, next, before: plan.hash, after: digest(next) });
  }
  for (const item of prepared) { await writeFile(item.backup, item.original); await writeFile(item.path, item.next); }
  const report = { version: '0.2.1-alpha.1', sourceCommit: '5badb15009ae1756c3afe0ae0cef1faafc290ccc', patch: 'latest-preset-archive-v3',
    isolatedCandidateOnly: true, files: prepared.map(({ path, before, after }) => ({ path, before, after })) };
  await writeFile(resolve(runtime, 'preset-archive-patch.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareLatestPresetArchive();
