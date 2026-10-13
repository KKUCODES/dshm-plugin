import { createHash } from 'node:crypto';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const normalizeSource = text => text.replaceAll('\r\n', '\n');

/** 开发安装器与独立交付包共用固定变换，不能靠清单伪造兼容的修改后字节。 */
export function applySourceChange(change, text) {
  let next = normalizeSource(text);
  if (digest(next) !== change.hash) throw Error(`latest_source_baseline_mismatch: ${change.path}`);
  if (change.transform !== undefined) next = change.transform(next);
  for (const [before, after] of change.edits ?? []) {
    if (next.split(before).length !== 2) throw Error(`latest_source_anchor_mismatch: ${change.path}`);
    next = next.replace(before, after);
  }
  return text.includes('\r\n') ? next.replaceAll('\n', '\r\n') : next;
}
