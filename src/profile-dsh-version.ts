import semver from 'semver'

export const profileDshRange = '>=0.2.0-rc.2 <0.3.0-0'

/** 只选择同一契约族；实际服务能力在Remote协商时逐项验证。 */
export function isProfileDshVersion(version: string | undefined) {
  return typeof version === 'string' && semver.valid(version) !== null
    && semver.satisfies(version, profileDshRange, { includePrerelease: true })
}
