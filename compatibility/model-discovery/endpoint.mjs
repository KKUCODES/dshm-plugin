import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../background-output/install-runtime.mjs';
import { install } from './install.mjs';

export const namespace = 'dshm.pi-ai-endpoint-v2';
export const output = fileURLToPath(new URL('../../artifacts/compatibility/model-discovery-endpoint/', import.meta.url));
function once(source, before, after) {
  if (source.split(before).length !== 2) throw Error('Unsupported endpoint discovery source');
  return source.replace(before, after);
}
const registration = source => once(source, "'dshm.pi-ai-draft'", `'${namespace}'`)
  .replace("{ redirect: 'error' }", "{ redirect: 'error', catalog: false }");
export const files = [
  ['src/discovery.ts', '7b04ce6303929de3122a35d387d7dace9b2f8edd24b1dd9227dd7e090d51b20b', source =>
    once(once(source, 'options?: { redirect: "error" }', 'options?: { redirect: "error"; catalog?: false }'),
      '  if (request.provider !== undefined) {', '  if (options?.catalog !== false && request.provider !== undefined) {')],
  ['src/index.ts', '74aae8d61c93e670c2392cfc130fa7053d5ca4a1e0532e96df06f7e3b68f9df8', registration],
  ['lib/index.js', '1ea3752765d19119dc47ba86db6c702d636132c5ec3eefd9f487d8353862aa80', source =>
    registration(once(source, '\tif (request.provider !== void 0) {\n\t\tconst installed = catalogModels(request.provider);',
      '\tif (options?.catalog !== false && request.provider !== void 0) {\n\t\tconst installed = catalogModels(request.provider);'))],
];
export async function prepare(root) {
  const records = [];
  for (const [path, expected, transform] of files) {
    const before = await readFile(resolve(root, 'packages/llm/llm-pi-ai', path));
    if (digest(before) !== expected) throw Error(`Unsupported endpoint baseline: ${path}`);
    const text = before.toString('utf8'); let after = transform(text.replaceAll('\r\n', '\n'));
    if (text.includes('\r\n')) after = after.replaceAll('\n', '\r\n');
    records.push({ path, before, after: Buffer.from(after) });
  }
  for (const record of records) for (const kind of ['before', 'after']) {
    const target = resolve(output, kind, record.path); await mkdir(dirname(target), { recursive: true });
    try { await writeFile(target, record[kind], { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST' || !(await readFile(target)).equals(record[kind])) throw error; }
  }
  return { prepared: records.length, installed: false };
}
export const patch = (action, root, write) => install(action, root, write, { files, output });
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, root, stopped] = process.argv.slice(2);
  if (!root) throw Error('Expected DSH root');
  if (!['prepare', 'plan'].includes(action) && stopped !== '--stopped') throw Error('Stop DSH before writing');
  console.log(JSON.stringify(action === 'prepare' ? await prepare(root) : await patch(action, root)));
}
