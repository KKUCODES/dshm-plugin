import assert from 'node:assert/strict';

export const sdkVariants = {
  '0.2.0-rc.2': 'rc2',
  '0.2.1-alpha.1': 'alpha1',
  '0.2.1-alpha.2': 'alpha2',
};

export const githubDshVersions = ['0.2.0-rc.2', '0.2.1-alpha.2'];
export const githubDshVersion = '0.2.1-alpha.2';

/** 只声明已共同验收的离散版本；预发布版本不使用宽泛的 ^ 或 *。 */
export function githubPeerRange(name) {
  if (name.startsWith('@deepseek-ai/dsh-')) return githubDshVersions.join(' || ');
  if (name === '@deepseek-ai/cordis') return '4.0.4 || 4.0.5-alpha.1';
  if (name === '@deepseek-ai/schemastery') return '3.18.4 || 3.18.5-alpha.1';
  throw new Error(`Unreviewed GitHub peer: ${name}`);
}

/** 每个已核验版本使用独立官方 SDK，不按后缀或范围猜测未来版本。 */
export function sdkVariant(version) {
  assert.ok(Object.hasOwn(sdkVariants, version), `Unsupported DSH SDK: ${version}`);
  return sdkVariants[version];
}
