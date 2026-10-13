import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, realpath, lstat, rename, unlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function replaceFile(target, bytes) {
  const temporary = `${target}.dshm-${randomUUID()}.tmp`;
  try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, target); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}

/** 只接受本补丁核验过的已存在文件；禁止经目录或文件链接写出目标安装。 */
export async function existingInside(root, local) {
  if (isAbsolute(local) || local.includes('\\') || local.split('/').includes('..')) throw new Error('Unsafe manifest path');
  const path = resolve(root, local);
  const actual = await realpath(path);
  const inside = relative(root, actual);
  if (inside.startsWith('..') || isAbsolute(inside) || (await lstat(path)).isSymbolicLink()) throw new Error('Linked target is not supported');
  return path;
}
