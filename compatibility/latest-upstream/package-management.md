# 新版插件安装取消与升级重启提示

2026-10-06后续：[修复取消与超时](./package-repair.md)补齐真实进程故障、窄补丁、发布/源码Android取消及修复中完整DSH树退出恢复、完整构建和失败保留；两种入口的手机修复超时原分类、失败详情及进程停止也已通过。下文“修复中取消与崩溃待验”是各历史场景当时的范围；普通安装脚本的手机超时主文案、原分类、失败回执及进程退出在两种入口另已通过。仅Host退出、手机安装摘要冷恢复等完整范围继续，不能扩大旧报告覆盖范围。

- 状态：固定源码与隔离发布包完成迁移，单项及十项源码构建/Android/恢复组合通过；发布包Web另通过。发布/源码入口的真实手机安装、升级/重启后执行新版、卸载，以及真实pnpm兼容拒绝后的修复通过；本轮26个源码原字节、355项原客户端产物与Git干净恢复通过，完整异常仍待验。
- 维护角色：DSH Mobile项目协作Agent；核验日期：2026-10-06。
- 基线：`0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，官方Pre-release。
- 来源：[查询源码变更](./source-package-process.mjs)、[升级源码变更](./source-plugin-restart.mjs)、[发布包变更](./package-management.mjs)、[实际进程验证](../../scripts/verify-latest-package-process.mjs)、[原组件与控制器验证](../../scripts/verify-latest-plugin-restart.mjs)、[安装边界](./package-management.test.mjs)。

## 取消查询

官方主安装已按`service/cli`分别处理进程树，不能照搬旧版统一设为true的补丁，否则会改变CLI的原调用者进程组。新版三个查询仍没有`killDescendants`：安装前的包兼容查询、默认registry查询以及包信息查询。查询迁移只为这三个入口启用原execa能力，不改参数、超时、取消信号或认证环境；后续独立修复进程的超时与分类补丁见[修复记录](./package-repair.md)。

实际Windows测试经过已安装的`pnpm.cmd`，让真实pnpm执行项目内受控父子进程，不连接外部registry或安装第三方代码。原发布包的主安装取消通过；其余四项（包查询取消/超时、registry超时、安装前查询取消）均未在原时限内完成，测试Node父子进程仍存在。测试器随后清理自己记录的PID；这些事后清理不算产品成功。见[原失败](../../artifacts/latest-runtime-check/package-process/original-report.json)。

固定源码修复、已安装发布operations入口和实际安装/构建后的源码operations产物分别通过五项：调用正常结算，Node父子进程先于测试清理消失，查询超时分类和配置原字节保持。见[源码变换进程验证](../../artifacts/latest-runtime-check/package-process/candidate-report.json)、[实际发布入口](../../artifacts/latest-runtime-check/package-process/published-report.json)和[十项实际源码安装产物](../../artifacts/latest-runtime-check/package-process/source-ten-installed-report.json)。原operations套件72项保持通过。这是受控真实进程验证，尚不能代替真实手机取消下载或运行插件脚本。未验证POSIX环境。官方拒绝不兼容组件后的修复安装有独立进程记录与恢复策略，本次没有改变该分支；真实修复安装及手机卸载的证据见下方专项，修复过程中取消与崩溃仍待验。

## 升级需重启

新版页面已显示需要重启的文字，但仍提供“立即启用”；控制器也会发出启用当前缓存模块的请求。这不能证明新版本代码已经加载。补丁在页面隐藏此动作，保留完成/关闭按钮；控制器同样拒绝该动作，避免其他调用入口绕过界面。首次安装且可直接应用时仍可启用，原失败与取消流程保持。

复用固定新版的完整原组件和控制器测试套件，仅替换过时的重启按钮断言，并增加两个控制器边界用例。原版188项失败3项，修复及实际安装源码各188项全部通过；运行于原Vitest/jsdom配置，不是Android视觉或真实Host升级测试。验证器每次核对原测试和源码哈希，临时夹具删除；候选模式逐字节恢复源码且Git干净，安装模式则保留安装载荷并核验全部哈希。见[原失败](../../artifacts/latest-runtime-check/plugin-restart/original-report.json)、[修复结果](../../artifacts/latest-runtime-check/plugin-restart/candidate-report.json)和[十项实际安装回归](../../artifacts/latest-runtime-check/plugin-restart/source-ten-installed-report.json)。

手机管理入口使用原插件管理局部组件，从电脑模块载体取得客户端包；本次修复编译客户端包，同时纳入源码组合重建，不另写一份手机私有安装对话框。下方真实手机专项已从这个入口完成安装升级；188项组件测试作为独立回归，不代替手机证据。

## 手机实际安装升级（发布入口，2026-10-05）

[独立Host管理专项](../../../backend/tests/latest-plugin-upgrade.test.ts)使用真实新版CLI、原profile管理、PGlite网关和[独立Android测试UID](../../../dsh-mobile/tests/support/latest-plugin-upgrade-android.mjs)。手机从DSHM自有聊天打开原管理局部组件，安装两个由本项目打包、没有脚本或第三方依赖的同名测试包。实际40.55秒通过：首次安装可立即启用；升级只提示下次启动加载、没有立即启用；重启前实际包回执仍为0.0.1及原PID，原Host重启后回执为0.0.2及新PID，手机详情随后显示v0.0.2和一个运行中组件。手机卸载后，列表、原profile依赖及bundle选择均移除。

见[发布入口报告](../../artifacts/latest-runtime-check/latest-plugin-upgrade-npm-passed.json)、[Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-upgrade-npm-passed.json)和[实际截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-upgrade-npm-passed.png)。测试包代码自身在原Host加载时写回执，不替换原Loader；页面不含iframe，无组件或控制台错误。临时管理权限收回、测试设备撤销、测试App停止、反向端口移除，日常DSH和App保持原位。专用测试会话的消息只用于产生列表记录，无Key环境中的凭据缺失不算模型推理。

测试器初轮空会话列表入口、安装弹窗随阶段改名、聊天页缺少首页连接文案、重启异步重读尚未完成及卸载确认先关闭的失败均保留；最终按原界面真实阶段等待，不降低版本、运行PID、配置移除或权限断言。另有一轮原安装失败显示“没有写入权限”，尚未取得其底层errno和完整日志，后续重跑没有复现；不把它宣布为已修复或长期稳定性通过。见[该轮记录](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-upgrade-permission-failure.json)。

固定十项源码实际安装/完整构建后，通过同一专项的原`pnpm dsh web`入口再验68.68秒：两次原Host运行PID不同、升级前后真实回执为0.0.1/0.0.2，手机自动重读新版详情、原卸载及profile清理、管理收回/设备撤销均通过，无页面和控制台错误。见[源码Host专项](../../artifacts/latest-runtime-check/latest-source-plugin-upgrade.json)、[Android专项](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-upgrade-source-passed.json)与[截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-upgrade-source-passed.png)。这次不包含Office/模型高级设置/Web专项，不能替代此前十项完整Android记录或真实推理。

源码外层[完整报告](../../artifacts/latest-runtime-check/latest-source-plugin-management.json)也通过：修改后原构建292.61秒，41项源码函数、159项取消、188项客户端、五项真实pnpm进程、72项operations及实际安装身份通过。手机专项完成后，26个原文件和启动载荷精确恢复，原构建293.78秒、原355项客户端摘要及Git干净核验通过。可在插件目录运行`node scripts/verify-latest-source-remote.mjs --plugin-management`；该选项单独运行管理专项，不与其他专项标志合并。

## 不兼容组件后的真实修复安装

[真实pnpm验证](../../scripts/verify-latest-package-repair.mjs)先在独立profile安装兼容v0.0.1，再安装包含不兼容组件的v0.0.2。组件需要安装后才能核验；原manager拒绝该组件后确实执行原修复分支，恢复package.json、锁文件、workspace配置的原字节，以及node_modules中的旧v0.0.1和原bundle选择，运行记录也已清除。发布operations实际入口通过，见[报告](../../artifacts/latest-runtime-check/package-repair/published-report.json)。使用本项目本地归档和真实pnpm.cmd，没有模拟pnpm文件变更或连接第三方账户；不代表任意安装脚本副作用可回滚，也未验证修复过程中取消或进程崩溃。

实际安装并完整构建后的源码operations产物另通过同一修复场景，执行`node scripts/verify-latest-package-repair.mjs --source-installed`前严格核对全部安装载荷，见[源码产物报告](../../artifacts/latest-runtime-check/package-repair/source-installed-report.json)。该项单独执行，不冒充Android操作或外层构建组合的一部分。

## 手机下载中取消（2026-10-05）

管理专项增加`DSHM_LATEST_PLUGIN_CANCEL_CHECK=1`时，真实pnpm通过电脑本地HTTP下载本项目归档；服务器仅暂停传输，不替换安装器。下载已开始后，核对原run.json记录的启动PID及TCP连接对应的实际下载PID，再从手机原管理组件点击“取消安装”。原界面确认取消并保留地址，两个PID和下载连接先于清理结束，运行记录移除，profile的配置/锁文件/workspace原字节保持且测试包未选中。随后继续真实安装、升级、重启执行新版与卸载；发布入口整轮75.57秒通过，见[Host记录](../../artifacts/latest-runtime-check/latest-plugin-cancellation-npm-passed.json)、[手机记录](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-cancellation-npm-passed.json)与[取消后截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-cancellation-confirmed.png)。源码入口另有自己的手机与外层构建/恢复证据，不借用发布入口结果。

源码入口相同的真实手机流程85.80秒通过，见[源码Host](../../artifacts/latest-runtime-check/latest-source-plugin-cancellation.json)及[Android记录](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-cancellation-source-passed.json)。`node scripts/verify-latest-source-remote.mjs --plugin-cancellation`专门执行取消后再安装/升级/重启/卸载；[外层完整报告](../../artifacts/latest-runtime-check/latest-source-plugin-cancellation-combined.json)通过：修改后原构建454.84秒，41项函数/159项取消/188项客户端/五项pnpm进程/72项operations和安装身份通过；26源码及启动载荷精确恢复，原构建405.27秒、355资源摘要及Git干净通过。实际Host、测试UID、反向端口及临时授权已清理，无页面或控制台错误。此范围不包含Office/Web/模型推理或安装脚本副作用。

首轮下载取消已通过，随后卸载失败；[原pnpm日志](../../artifacts/latest-runtime-check/relay-homes/6e770417-65a0-4a07-8791-a9b24987dd00/profiles/web/.plugin-manager/logs/operation-N3vkj0/pnpm.log)显示Windows的`EPERM ... rename pnpm-lock.yaml`，插件已停用但依赖仍保留。文件属性不是只读，但底层占用者未确定，不宣布已修复。失败记录[Host](../../artifacts/latest-runtime-check/latest-plugin-cancellation-uninstall-failure.json)及[手机](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-plugin-cancellation-uninstall-failure.json)保留；最终测试器还自动保存每次pnpm原日志，避免仅记录Toast消失后的等待超时。相同步骤重跑通过，不代替长期稳定性结论；安装脚本/修复中取消与崩溃仍待验。

## 手机安装脚本取消与中断（2026-10-06）

[实际手机专项](../../../dsh-mobile/docs/integration/latest-install-recovery.md#安装脚本取消与退出恢复)已在固定源码pnpm和npm发布入口通过原脚本拒绝、手机明确批准、实际PID运行后取消，以及运行中结束拥有的DSH进程树后未知结果恢复。取消确认前原进程已退出，包清单/锁文件恢复，原管理器保留批准；测试仅清理本来源。突然退出留下锁文件测试包记录，不能宣布自动回滚；手机没有自动重装，原聊天和权限恢复。独立测试清理与发布清理的原失败/只读恢复证据分别记录，脚本不写文件且只等待90秒，不代表任意脚本副作用可回滚。不兼容组件后的修复安装在途取消/崩溃仍待验。

## 交付边界

新版原管理器安装回执丢失后使用 `waitForInstall`；中转遗漏此查询已在[实际下载中退出与恢复](../../../dsh-mobile/docs/integration/latest-install-recovery.md)专项中复现并修复。它是受限协议接入，不增加源码补丁：仅管理设备和固定新版 Host 接受原 UUID 请求编号，不重发安装。两种入口的脚本取消/中断也已通过，功能、磁盘残留与独立测试清理分别记录；修复安装在途及最终31文件组合恢复继续。

三个源码文件加入[十项组合](./source-runtime.md)，源码安装仍完整预检、固定版本/哈希和原字节恢复。发布包同时修改Host bundle、独立operations入口和客户端bundle，只用于隔离候选。未知编辑、相邻版本和越界链接拒绝，写入失败只回滚本次改变的文件；[发布包边界回归](./package-management.test.mjs)覆盖幂等、后入口未知编辑阻止前入口和相邻版本拒绝。日常旧版DSH、原插件和普通App保持原位。
