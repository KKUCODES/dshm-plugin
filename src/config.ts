export interface PluginConfig {
  enrollmentRef?: string
  /** 兼容已安装版本的配置；HTTP 与 HTTPS 现在均允许，此项不再生效。 */
  allowInsecureLocalhost?: boolean
}
