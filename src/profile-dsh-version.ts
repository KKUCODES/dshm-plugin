/** 已审阅的公开profile契约；不按版本前缀放行未来版本。 */
export function isProfileDshVersion(version: string | undefined) {
  return version === '0.2.1-alpha.1' || version === '0.2.1-alpha.2'
}
