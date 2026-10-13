import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existingInside } from '../background-output/install-runtime.mjs';
import { transformEncodingBindings, transformEncodingRunner } from './pwsh-encoding-changes.mjs';

const runtime = fileURLToPath(new URL('../../artifacts/latest-runtime-check/', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const files = [
  ['types-Cl_DXjhk.js', '0bb3a34508785bdc34626542f9358d398fd9f60fdaf4b48201dfdff2122f25fc', transformEncodingBindings,
    'b4b515fd9687fc3ca5ee08864a3a74554df2cd615534ebb17d67722575114db2'],
  ['runner.js', '9159aaa995d417e5948dd1cc3d8cd40616270e320048e577c58a1c65be3f3a2d', transformEncodingRunner,
    '457d7bc97b8fdc2ce9f034cff53b879886fef4c012901fb041b42e0de91f4013'],
];

/** 只准备固定npm副本的原生载荷；由前台输出组合安装器一起预检、写入和回滚。 */
export async function prepareLatestEncodingFiles() {
  const directory = 'node_modules/@deepseek-ai/dsh-sandbox-windows-acl';
  const pkg = JSON.parse(await readFile(await existingInside(runtime, directory + '/package.json'), 'utf8'));
  if (pkg.name !== '@deepseek-ai/dsh-sandbox-windows-acl' || pkg.version !== '0.2.1-alpha.1')
    throw Error('latest_encoding_package_mismatch');
  await mkdir(resolve(runtime, 'patch-originals'), { recursive: true });
  await existingInside(runtime, 'patch-originals');
  const prepared = [];
  for (const [file, hash, transform, previousHash] of files) {
    const path = await existingInside(runtime, directory + '/lib/' + file);
    const current = await readFile(path), backupName = 'dsh-sandbox-windows-acl-' + file;
    const backup = resolve(runtime, 'patch-originals', backupName);
    let original = current;
    if (digest(original) !== hash) original = await readFile(await existingInside(runtime, 'patch-originals/' + backupName));
    if (digest(original) !== hash) throw Error('latest_encoding_original_mismatch');
    const modified = Buffer.from(transform(original.toString('utf8'), true));
    // 仅接管已独立核验的上一轮隔离候选；未知修改仍不能覆盖。
    if (![hash, previousHash, digest(modified)].includes(digest(current))) throw Error('latest_encoding_changed_outside_patch');
    prepared.push({ path, backup, current, original, modified, name: pkg.name, before: hash, after: digest(modified) });
  }
  return prepared;
}
