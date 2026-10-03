# 指定电脑应用打开工作区：服务兼容补丁

图标读取后续扩展见[desktop-app-icons](../desktop-app-icons/README.md)：复用原缓存的内部服务及四文件包已准备，尚未安装或接Remote传输。此处已交付v1安装包保持不变。

- 状态：七文件源码/编译补丁已安装；0.1.48 配套网关和 APK 已接 Remote 固定操作及手机确认页，MuMu 资源管理器打开通过。其他应用与完整异常仍待验收。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-09-27。
- 基线：DSH `0.1.6-alpha.2`，提交 `ddefc45fbc7f8e46dd73185e68295696d1297887`，参考检出保持只读。
- 来源：原[网页控制器](../../../deepseek-harness/packages/client/ui-open-in-app/src/client/controller.ts)、[Host 路由](../../../deepseek-harness/packages/host/open-in-app/src/index.ts)、[启动器](../../../deepseek-harness/packages/host/open-in-app/src/resolver.ts)、[兼容补丁授权](../../../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md)。

## 选择与边界

原功能使用 `/open-in-app/apps` 探测可用应用、`/open-in-app/open` 启动选定应用。它们属于原网页登录边界，不在 `connection.createSharedFetchHandler('/api')` 的共享处理器内。代理网页路由需额外处理登录和任意目录风险；复制启动器会产生第二套平台逻辑。因此本补丁提取同一插件内的服务，让原网页与未来 Remote 适配共用目录、缓存和启动行为。

服务是电脑内部能力，**不代表远程授权**。后续 Remote 必须核验设备、已有会话所属工作区、确认快照和连接代次，不可直接开放 `app/path` 给手机。没有新增 HTTP 路由或凭据处理；图标路由未改，Remote 图标传输仍待接入。

## 当前实现

[changes.mjs](./changes.mjs)提供 `ctx.dshmDesktopApps.list(signal?)` 和 `open(appId, path, signal?)`。原网页仍先校验 Host/Origin/登录、方法、JSON类型和64 KiB请求体，再调用同一服务。目录必须绝对且存在，应用必须来自同一已探测目录，不能提供任意可执行文件或命令。

目录缓存按插件生命期共用，丢失可执行文件保留原单次重新探测。`launchResolved` 增加可选取消信号，在首选启动返回后、备用启动前检查，避免取消或卸载后再尝试备用启动器。已经启动的应用不终止；启动后的取消属于可能已执行，Remote 后续不能自动重发。

## 验证

在插件目录执行：

```text
node compatibility/desktop-apps/prepare.mjs
node --test compatibility/desktop-apps/core.test.mjs
node compatibility/desktop-apps/typecheck.mjs
npm run typecheck
```

[prepare.mjs](./prepare.mjs)仅生成项目内源码副本、测试运行包和两个源文件的前后hash，不安装到DSH。固定开发依赖 `@deepseek-ai/dsh-subprocess@0.1.6-alpha.2` 用于原启动器测试，保留上游凭据清理逻辑。

[九项测试](./core.test.mjs)通过真实Cordis、补丁后的原插件和实际临时目录检查：共享探测/启动、三个网页路由401/403、方法/请求体拒绝、未知应用/路径拒绝、取消/卸载、缺失应用重探测和禁止取消后的备用启动。[报告](../../artifacts/desktop-apps-core.log)、[严格源码类型检查](../../artifacts/desktop-apps-typecheck.log)、[插件类型检查](../../artifacts/desktop-apps-plugin-typecheck.log)通过。初跑测试依赖缺失，补齐后重跑。

上述九项的平台注册、连接信任判断和进程启动是明确的测试替身，不证明真实网页登录或手机入口可用。后续实际安装与只读服务结果如下。

## 安装与实际服务验证（2026-09-27）

[package.mjs](./package.mjs)核验原包版本、全部源输入及七个目标文件的固定hash，重新严格编译当前副本后生成源码、单文件生产bundle及两组JS/声明。不会将测试internals分片安装到电脑，也不打包另一份Cordis。[install.mjs](./install.mjs)提供完整预检、锁定、逐文件复验、失败逆序恢复与逐字节还原；未知改动、参考检出及链接目标拒绝。

```text
node compatibility/desktop-apps/package.mjs "F:/Program Files/deepseek-harness"
node compatibility/desktop-apps/install.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/desktop-apps/install.mjs apply "F:/Program Files/deepseek-harness" --stopped
```

先准备和预检，停止目标DSH后才执行apply；恢复同样先停止，再用 `restore` 代替apply。已安装后不要从补丁文件重新准备原包；原始字节随 `artifacts/compatibility/desktop-apps/package/before/` 保留。安装器保护本补丁七文件，不负责跨其他补丁的升级兼容。

[六项安装测试](./install.test.mjs)通过副本安装/重复操作/还原、未知改动和版本拒绝、写入失败回滚、并发外部改动保留、目录链接拒绝、重复严格编译产物一致；见[报告](../../artifacts/desktop-apps-install-test.log)。注入写入故障仅在测试参数中，正常CLI使用原子文件替换。**实际F盘还原尚未执行**，不能将副本回滚当作现场回滚验收。

[本机安装记录](../../artifacts/desktop-apps-install-live.log)确认七文件写入。重启实际源码入口后，[临时只读插件](./probe-plugin/index.js)于17:07:36 UTC从真实服务读到 explorer/cursor/vscode/intellij，重复读取一致、预先取消被拒绝，见[报告](../../artifacts/desktop-apps-live-service.json)。未使用平台替身，也未启动任何应用。随后卸载临时插件并恢复DSH，[MuMu日常入口收尾](../../../dsh-mobile/artifacts/desktop-apps-service-cleanup.json)通过原聊天/草稿/只读命令及零页面资源错误。网关、APK、Key和设备权限未改。

## 下一步

1. 实测其他电脑应用启动、确认期间真实断线和撤权，补充 R16 的完整边界。
2. 核对原 ui-open-in-app 局部插件入口与手机自有选择页的衔接；当前原网页路由仍不在手机开放。

## Remote 与手机入口（2026-09-27）

[DesktopApps](../../src/desktop-apps.ts)从原 `sessionController.list` 的可见会话取得 cwd，使用原 fs 解析、目录 stat 和 Host 路径反向映射。不激活 Agent；最终应用必须仍在原目录中。准备快照绑定设备/连接/会话、服务实例、应用和解析后的工作区，五分钟有效、一次消费；最终重新查询可见会话和工作区，变化则拒绝。取消与服务卸载停止后续步骤，已经发出的原生启动不自动重发。

[Remote 适配](../../src/remote-adapter.ts)及[协议](../../../docs/protocol.md#指定电脑应用打开工作区)沿用已批准设备的聊天授权。`ctx.inject(['fs','dshmDesktopApps'])` 跟随原服务生命周期，旧电脑协商能力为 false。手机请求经过 Android 原生白名单，进入 DSHM 自有菜单、列表和确认页；没有转发整页或任意 URL。

[四项适配测试](../../tests/desktop-apps.test.ts)使用真实 LocalFileSystem，明确替换会话查询和平台启动，覆盖身份/连接隔离、不可见会话、路径变化、非目录、应用消失、取消、服务替换、过期、迟到准备与未知结果单次。连同原适配回归共31项通过，见[结果](../../artifacts/desktop-apps-adapter-tests.log)。后端六项含真实 HTTP/WS/SQL 的三操作路由与原设备权限回归，见[结果](../../artifacts/desktop-apps-gateway-tests.log)。手机单元/实际组件回放和真实 MuMu 证据统一见[当前验收](../../../dsh-mobile/docs/integration/remote-current.md#指定电脑应用手机接入2026-09-27)。
