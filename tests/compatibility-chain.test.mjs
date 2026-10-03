import test from 'node:test';
import assert from 'node:assert/strict';
import { finalPatch } from '../scripts/check-installed-compatibility.mjs';

test('叠加补丁只接受最终哈希，顺序和重复记录不影响结果', () => {
  const first = { before: 'a', after: 'b' }, last = { before: 'b', after: 'c' };
  assert.equal(finalPatch([last, first, first]).after, 'c');
});

test('分叉、断链与循环不能伪装为有效叠加补丁', () => {
  for (const history of [
    [{ before: 'a', after: 'b' }, { before: 'b', after: 'c' }, { before: 'b', after: 'd' }],
    [{ before: 'a', after: 'b' }, { before: 'c', after: 'd' }],
    [{ before: 'a', after: 'b' }, { before: 'b', after: 'a' }],
  ]) assert.throws(() => finalPatch(history));
});
