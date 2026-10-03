import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverySource, registrationSource, compiledSource } from './changes.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const files = [
  ['src/discovery.ts', '4bd67512236c7c50e0316c87f03cd60b3d464026dacf3fbee8bc5c4c6c1318a6', discoverySource],
  ['src/index.ts', '73e3c4b1f6e953fcb482423147d8e782928179dfe75b600dcf7dba31d341dd29', registrationSource],
  ['lib/index.js', '05726d8594f973fea280a3aa196984aca1e4297a8b7a38a4db5afdd94688b457', compiledSource],
];
export async function prepare(root) {
  const pkg = resolve(root, 'packages/llm/llm-pi-ai');
  const records = [];
  // 全部预检后才写候选；从不修改正在运行的安装目录。
  for (const [path, expected, transform] of files) {
    const before = await readFile(resolve(pkg, path));
    if (hash(before) !== expected) throw Error(`Unsupported discovery baseline: ${path}`);
    const text = before.toString('utf8');
    let after = transform(text.replaceAll('\r\n', '\n'));
    if (text.includes('\r\n')) after = after.replaceAll('\n', '\r\n');
    records.push({ path, before, after: Buffer.from(after) });
  }
  const output = fileURLToPath(new URL('../../artifacts/compatibility/model-discovery/', import.meta.url));
  for (const record of records) for (const kind of ['before', 'after']) {
    const target = resolve(output, kind, record.path);
    await mkdir(dirname(target), { recursive: true });
    try { await writeFile(target, record[kind], { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST' || !(await readFile(target)).equals(record[kind])) throw error;
    }
  }
  return { prepared: records.length, installed: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw Error('Expected installed DSH root');
  console.log(JSON.stringify(await prepare(resolve(process.argv[2]))));
}
