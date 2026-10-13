import assert from 'node:assert/strict';
import { resolve } from 'node:path';

/** 独立桌面组合不能复用原 live-home、旧尝试目录或其他验收的写入路径。 */
export function latestElectronFinalPaths(runtime, home, run) {
  assert.equal(runtime, resolve(import.meta.dirname, '../artifacts/latest-runtime-check'));
  assert.match(run, /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.equal(home, resolve(runtime, 'relay-homes', run));
  const directory = resolve(runtime, 'electron-final-' + run);
  return { directory, readinessFile: resolve(directory, 'private-ready.json') };
}
