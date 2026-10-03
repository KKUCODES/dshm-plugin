import { createHash } from 'node:crypto';

export const directory = 'packages/client/ui-plugin-manager';
export const patchVersion = 'plugin-restart-notice-v1';
export const hashes = {
  [`${directory}/src/client/PluginManagerPage.tsx`]: '765b00aa866b09124c51d748055bc6e29824f11152e4f95cb08f94dca0ff9490',
  [`${directory}/src/client/manager-store.ts`]: '27d4f0254f6e626a65b8d1a0748433c90f5948833a8c551600ac9fda815e705e',
  [`${directory}/lib/client.js`]: '0a9cc2fa8d4c47c2c1565b52604fdb1bc759eae73233e5ab371ca8cc03c1e280',
};
export const digest = value => createHash('sha256').update(value).digest('hex');

export function transform(path, source) {
  if (digest(source) !== hashes[path]) throw Error(`Unsupported plugin manager source: ${path}`);
  const page = path.endsWith('PluginManagerPage.tsx');
  const before = page ? ': install.installed !== null\n' : "if (install.phase !== 'done' || install.enabling) return";
  const after = page ? ': install.installed !== null && !install.restartRequired\n'
    : "// A restart acknowledgement cannot be completed by toggling the cached module.\n    if (install.phase !== 'done' || install.enabling || install.restartRequired) return";
  if (source.split(before).length !== 2) throw Error(`Non-unique restart boundary: ${path}`);
  return source.replace(before, after);
}
