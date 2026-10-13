// 固定版本的Windows文件监听修正；目录和其他平台仍沿用原Chokidar。
export const fileWatchSourceHash = '77cdf3a1a259c9e24fef28f42f937a6b5ce1ad6d692fbc8dab148925cc4f1f28';
export const fileWatchCompiledHash = '63fbb41d2c33e07111884b798be507e68c2752acab8249c821c20ade436e894f';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw Error('latest_file_watch_anchor_mismatch');
  return source.replace(before, after);
}

function nativeBranch(typescript) {
  return `
    // FsVersion包含ctime；不能让Chokidar仅按mtime过滤真实内容变化。
    // 监听父目录同时覆盖原子替换和删除后重建；只通知当前文件。
    if (process.platform === 'win32' && !directory) {
      let closing${typescript ? ': Promise<void> | undefined' : ''}
      const native = watchNative(root, (_event, entry) => {
        if (closing === undefined && (entry === null || resolve(root, entry) === path)) changed()
      })
      native.on('error', error => { if (closing === undefined) changed(error) })
      return () => closing ??= new Promise${typescript ? '<void>' : ''}(done => {
        native.once('close', done)
        native.close()
      })
    }
`;
}

export function transformFileWatchSource(source) {
  source = replaceOnce(source, "import { watch } from 'chokidar'",
    "import { watch } from 'chokidar'\nimport { watch as watchNative } from 'node:fs'");
  return replaceOnce(source, '    const root = directory ? path : dirname(path)\n',
    '    const root = directory ? path : dirname(path)\n' + nativeBranch(true));
}

export function transformFileWatchCompiled(source) {
  source = replaceOnce(source, 'import { watch } from "chokidar";',
    'import { watch } from "chokidar";\nimport { watch as watchNative } from "node:fs";');
  return replaceOnce(source, '\t\tconst root = directory ? path : dirname(path);\n',
    '\t\tconst root = directory ? path : dirname(path);\n' + nativeBranch(false));
}

export const sourceFileWatchChanges = [{ patch: 'file-version-watch', name: '@deepseek-ai/dsh-fs-local',
  package: 'packages/fs/fs-local', path: 'packages/fs/fs-local/src/index.ts',
  hash: fileWatchSourceHash, transform: transformFileWatchSource }];
