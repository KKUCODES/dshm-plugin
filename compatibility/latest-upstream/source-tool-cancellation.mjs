import { transform as outerCancel } from '../ptc-cancel/prepare.mjs';
import { transform as innerCancel } from '../ptc-cancel/prepare-inner.mjs';

/** 原语义仍成立；新版类型生成器要求公开构造参数显式声明类型。 */
export const transformOuterCancellation = source => outerCancel(source, true)
  .replace('aborted = false', 'aborted: boolean = false');
export const transformInnerCancellation = source => innerCancel(source, true);
export const sourceToolCancellationChanges = [
  { patch: 'ptc-cancel', name: '@deepseek-ai/dsh-tools', package: 'packages/core/tools',
    path: 'packages/core/tools/src/ptc.ts',
    hash: '227d0d5221432fa9caf5492058ca08f449f732f18a566e708c2aea1a9ee2d96a',
    transform: transformOuterCancellation },
];
