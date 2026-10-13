import { transformLatestAutoReviewCancellation } from './auto-review-cancel.mjs';

export const sourceAutoReviewCancellationChanges = [{
  patch: 'auto-review-cancel', name: '@deepseek-ai/dsh-experimental-auto-review',
  package: 'packages/experimental/auto-review', path: 'packages/experimental/auto-review/src/index.ts',
  hash: '5a869b87bf4ac397fffca5cf0a6ace05879fdbf1aecffc101b5464186a26e2e2',
  transform: source => transformLatestAutoReviewCancellation(source, true),
}];
