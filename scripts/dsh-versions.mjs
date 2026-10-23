import assert from 'node:assert/strict';

export const sdkVariants = {
  '0.2.0-rc.2': 'rc2',
  '0.2.1-alpha.1': 'alpha1',
  '0.2.1-alpha.2': 'alpha2',
  '0.2.1-rc.2': 'rc21',
};

export const githubDshVersions = ['0.2.0-rc.2', '0.2.1-alpha.2', '0.2.1-rc.2'];
export const githubDshVersion = '0.2.1-alpha.2';

/** 限定同一契约族；运行时仍核验服务与模块能力。显式包含两条预发布版本线。 */
export function githubPeerRange(name) {
  if (name.startsWith('@deepseek-ai/dsh-')) return '>=0.2.0-rc.2 <0.3.0-0 || >=0.2.1-alpha.1 <0.3.0-0';
  if (name === '@deepseek-ai/cordis') return '>=4.0.4 <4.1.0-0 || >=4.0.5-alpha.1 <4.1.0-0';
  if (name === '@deepseek-ai/schemastery') return '>=3.18.4 <3.19.0-0 || >=3.18.5-alpha.1 <3.19.0-0';
  throw new Error(`Unreviewed GitHub peer: ${name}`);
}

/** 每个已核验版本使用独立官方 SDK，不按后缀或范围猜测未来版本。 */
export function sdkVariant(version) {
  assert.ok(Object.hasOwn(sdkVariants, version), `Unsupported DSH SDK: ${version}`);
  return sdkVariants[version];
}
