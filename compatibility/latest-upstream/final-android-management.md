# 完整插件候选与 Android 管理页组合验收

- 状态：本页限定的 npm 发布、实际源码启动和完整 Windows SDK 三种管理组合通过；不代表七条总标准全部通过，完整新版支持尚未发布。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-10-09。
- 任务：[KKC-24](https://linear.app/kkcodes/issue/KKC-24)。
- 上游：本轮直接读取[官方发布列表](https://github.com/deepseek-ai/deepseek-harness/releases)，最新仍为 `0.2.1-alpha.1`，标记 Pre-release，短提交 `5badb15`。固定完整提交沿用已核验的 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，日常旧版安装未更换。

## 本轮组合与结果

完整 62 文件插件包（`0.1.76-latest.0`，SHA-256 `16835594509559deb424e7d747ee7c64dfdabcf2d4f82bb7323a30f30daba0aa`）由隔离的真实 npm Host 加载，生产网关和 Store 接入独立 Android UID `dev.dshmobile.validation.latestfinaltest`。隔离测试插件通过原 Host 提供固定内容、已知模型目录和测试凭据；DPoP、票据、WebSocket、资源桥和权限检查沿用生产路径，没有伪造认证。

Android APK 为 `54e920866d4fe220c4bc23cb1e92a15c7033cd3603b60c3ebaa98e67acbef973`，打包的 165 文件逐字节等于当前新版 Web 产物；所有 DSH SDK 依赖版本核对为 `0.2.1-alpha.1`。真实完整测试退出 0，用时 175.735 秒，Android 子范围用时 127.458 秒。

| 实际入口 | 结果与边界 |
| --- | --- |
| 原生配对、历史和选模 | 等待批准、真实传输、读取测试聊天、手机选择模型后电脑同一会话同步 |
| 原局部动态插件 | 原面板打开、定义/版本推送、手机批准、局部界面调用原 Host、移除推送；无整站 iframe |
| 预设与工具配置 | 历史模式锁定；空白会话选模/预设、默认继承/恢复、位置显示、复制/取消/删除、工具设置推送 |
| 创造模式入口 | 历史保护、已有空会话复用；本轮没有真实模型生成插件 |
| 模型提供方 | 新增/改名/容量与模型保留、取消/移除；实际原生临时探测与保存/移除测试 Key，拒绝重定向，页面不获得 Key 文本 |
| 模型目录 | 官方清单保存和恢复默认、内置模型覆盖、能力/输入模板/协议切换与恢复 |
| 文件与电脑应用 | 原文件元数据实时刷新；主/旁栏的原生应用图标、路径确认和取消，零次实际打开；不替代既有真正启动编辑器的专项 |
| 撤权与重启 | 收回管理权限、撤销测试设备后原生重新连接被拒绝；Host 重启后原归档预设的会话恢复 |

手机测试前和文件读取后分别断言无运行错误。撤销后记录的唯一 `[Remote] http_401` 是授权已失效的预期结果，单独保留；不把它称为全程零错误。

## 证据与原环境保持

- [本轮 Host/网关完整报告](../../artifacts/latest-runtime-check/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332-test.json)、[测试日志](../../artifacts/latest-runtime-check/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332.log)、[清理回执](../../artifacts/latest-runtime-check/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332-cleanup.json)。
- [APK 安装与原 UID 保持](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332/apk-installed.json)、[实际 Android 分项报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332/latest-remote-android.json)。
- [原 App 恢复核验](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332/original-app-restored.json)、[原手机实际画面](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332/original-app.png)。

测试 Host `20076/44608` 均已停止，系统进程探测独立确认不存在。测试 App 已停止、独立端口反向映射已移除，测试配对已撤销。原发布 Host `73900`、原 App `3250`、原 APK/安装路径和配对指纹保持，管理权限关闭；原聊天 1837 条记录完整读取、原模型回复 `DSHM_ELECTRON_e4656e6c69994a10` 可见，输入为空。Android 前台确认为原 RemoteActivity，实际 MuMu 设备窗口再次置前观察，显示同一聊天。没有重装原 App、读取/修改用户 Key、替换绑定或向原会话发新消息。

## 可重复执行的隔离入口

Gradle 新增 `latestFinalTest` 专用 UID/产物目录，必须同时指定 `latestCompatibilityTest`，与 Office、双客户端和通知测试包互斥。构建仍使用当前已核验 Web 产物。原生 WebView/测试窗口助手仅增加这个明确 UID，不接受任意包名。

[范围守卫](../../../dsh-mobile/scripts/latest-final-test-scope.mjs)要求 UUID、授权模拟器和真实 Android 标志，拒绝混入其他专项；[3 项测试](../../../dsh-mobile/tests/latest-final-test-scope.test.mjs)覆盖误选原身份、缺失 Android、错误序列号、越界编号及混用源码/文件/交付专项。历史通用 Android 调用未选择独立专项时，现在在任何 Host/配对/手机清理动作前拒绝，不能再默认清除持有真实 Key 的长期验收 App；Office 专项仍用自己的 UID。安装助手[prepare-latest-final-apk.mjs](../../../dsh-mobile/scripts/prepare-latest-final-apk.mjs)仅安装此前不存在的独立 UID，先核对资源/SDK 和原 App 摘要，安装后再次核对原路径、进程与摘要。

后端 [latest-host.test.ts](../../../backend/tests/latest-host.test.ts) 设置 `DSHM_LATEST_FINAL_RUN=<UUID>`、`DSHM_LATEST_ANDROID_CHECK=1`、`DSHM_ANDROID_SERIAL=emulator-5554` 和已核验 `DSHM_ADB_PATH` 后消费完整归档、核对全部 55 源码摘要，并按 UUID 分开报告/清理；手机助手也按同一 UUID 独立证据目录，避免覆盖历史结果。构建/API类型/语法及守卫测试均通过。

同一真实 Vitest 入口另以历史未隔离的 Android 参数运行，预期在首个范围检查拒绝，外层严格检查退出 1 和原拒绝原因后通过：[负例原日志](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332/historical-unsafe-scope-denied.log)。该拒绝在任何 Host/配对/手机操作和清理钩子注册之前，不算产品测试失败或完整功能通过；独立 UID 守卫 3 项与原 WebView 4 项共 7 项、后端类型和 160 份文档/9466 本地链接通过。

拒绝后[再次核验原 App](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-android-9752570f-98b6-455c-b42b-00ee12c1c332/original-app-restored-after-guard.json)，安装路径/摘要/进程/会话/绑定/管理状态及前台保持。1837 条完整历史摘要 `f8efee5a70f0d21c39fa4e93824b3abcd84e5b287efd6717ddd3d6cb7cb60e7f` 与负例之前相同。

首轮 Gradle 因未设置 SDK 地址而停止，原 [失败日志](../../../dsh-mobile/artifacts/latest-final-android-build.log)保留；在进程环境设置已有 `ANDROID_HOME` 后离线构建 33 秒通过，[成功日志](../../../dsh-mobile/artifacts/latest-final-android-build-attempt-2.log)独立保存。没有安装新 SDK 或改系统环境。

## 仍需完成

SDK9的原配置重载失败保持；SDK10完整官方打包、原Python资源检查及实际Android管理组合已通过，详见[完整第十轮专项](./sdk-native.md#完整第十轮与-android-管理组合2026-10-09)。原App3722/Key/绑定/26会话3799事件保持；37原源码/启动配置、333.909秒原完整恢复构建及355资源精确恢复归档。Windows窗口捕获显示锁屏背景且激活失败，已请求用户解锁，不能将Android内部前台称为电脑窗口已置前。

上述 npm 轮次不是实际源码或 SDK/Electron 的全管理组合，不发送真实模型请求；此前那些入口的实际模型/命令结果保留各自范围。源码交付已通过 [独立 ZIP 专项](./source-delivery.md)，源码管理组合的后续证据见下节。七条总标准中的其他有效工具/通知/文件异常与交付组合仍需补验，不能以本页组合通过宣布完整新版支持。

Q 盘测试结束仍仅约 213 MiB 余量；前一轮临时安装夹具清理被自动审批拒绝，未绕过，保留失败证据与产物。此次独立 APK 构建通过不代表有足够空间进行下一轮完整源码/SDK 构建。

## MuMu 重开后的原 App 恢复（2026-10-08）

重新观察时，MuMu 实际连接为 `127.0.0.1:16384`，ADB 起初没有设备；原 App 和原服务均没有运行。已连接实际 MuMu，原 App 安装路径及 APK 摘要与上轮一致，启动原 App 后显示 DSHM 首页，没有重新安装或清除数据。此前 `emulator-5554` 的独立源码组合准备因此停止，后续入口也因没有安装核验回执而拒绝；发生在独立源码安装/构建之前，本轮没有源码 Android 组合通过结果。

原发布状态中的 Host 为73900，退出回执仍指向上一轮 Electron66540，正常 `--resume` 严格拒绝。保留原失败与旧回执，新加 `--resume --recover-stopped` 仅限原发布入口：必须核对原home边界、原Host/控制器及旧回执进程都不存在、原网关端口实际拒绝连接，独立保存观察证据，不能伪造正常退出回执或与其他载体/诊断组合。原九项恢复守卫实际通过，包括真实监听端口拒绝和恢复前状态/旧回执保持。

已恢复同一home/16901网关，当前Host29132、原App3722，原生反向映射恢复。[实际恢复报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/mumu-foreground-20261008/report.json)和[设备实际画面](../../../dsh-mobile/artifacts/latest-mobile-runtime/mumu-foreground-20261008/foreground.png)证明原 RemoteActivity 在Android前台，原真实回复 `DSHM_ELECTRON_e4656e6c69994a10` 可见，原配对指纹保持，管理false、输入为空、零整站iframe。1837条完整聊天摘要仍为 `f8efee5a70f0d21c39fa4e93824b3abcd84e5b287efd6717ddd3d6cb7cb60e7f`；[完整父子审计](../../artifacts/latest-runtime-check/latest-live-child-retention-mumu-cold-20261008-before.json)另核对26会话/3799事件。没有读取Key、替换配对、重装或发送新消息。

Windows窗口置前助手两次返回 `failed to activate captured window`，其抓图显示桌面，不能据此称Windows置前成功；实际页面与Android前台依据独立ADB/原WebView和设备截图。手机恢复助手只允许已核验的两个MuMu连接名称，当前loopback入口额外核对原APK摘要。

独立源码Android组合入口已补充明确source模式与分离报告，并可只复用已核验的独立UID APK；源码模式守卫4项与原WebView4项共8项、驱动语法/后端类型通过。该入口本轮尚未实际运行，不能作为源码组合通过证据。Q盘当前约1.93GiB可用，空间变化来源未判定；没有再次执行被拒绝的清理动作。

## 实际源码与 Android 管理组合（2026-10-08）

此前设备检查失败保留，后续在已核验的MuMu连接 `127.0.0.1:16384` 进行新一轮 `875862b7-4497-4ab7-91ab-79193c2e6b06`。范围守卫只接受已观察的两个MuMu连接名，错误端口/设备仍拒绝；5项范围与4项WebView共9项通过。原App3722/安装路径/摘要保持，独立测试APK复用上轮已验证归档和实际安装摘要，本轮没有安装或构建APK；165资源及全部DSH SDK版本再次核对。

独立源码安装器实际应用37源码和3项启动值，重复安装零写。真实官方完整构建328.807秒、46项原源码回归通过，实际 `pnpm dsh web` 加载完整62文件插件，生产网关/Store/认证/票据/资源桥连接独立测试UID。与上述npm轮次相同的管理范围完整通过：配对/历史/选模、主旁栏电脑应用确认取消、动态插件、预设/工具/创作入口、提供方/原生测试Key、模型目录、文件刷新、撤权及Host重启。整轮链路236.751秒，Android到实际撤销152.194秒；本轮不发送真实模型推理，电脑应用实际启动保留既有专项。

| 证据 | 实际结果 |
| --- | --- |
| [源码完整安装/构建/运行/恢复](../../artifacts/latest-runtime-check/latest-source-delivery-android-run-875862b7-4497-4ab7-91ab-79193c2e6b06.json) | 全阶段退出0；独立CLI恢复40项、重复零写，37源码/原启动字节精确恢复，原完整构建310.626秒 |
| [原源码回归日志](../../artifacts/latest-runtime-check/latest-source-delivery-android-run-875862b7-4497-4ab7-91ab-79193c2e6b06-source-units.log) | 46项通过、失败0，使用安装后的实际源码与引导 |
| [真实源码Host/网关报告](../../artifacts/latest-runtime-check/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06-test.json) | executionMode=source、command=pnpm dsh web，62文件归档及55源码摘要核对，Android通过 |
| [Android实际分项](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06/latest-remote-android.json)、[独立APK复用](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06/apk-installed.json) | 原生配对/管理交互/撤销通过；页面错误0，撤销后的唯一401单独保留 |
| [自有Host清理](../../artifacts/latest-runtime-check/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06-cleanup.json) | 两个Host676/32092实际退出，测试设备撤销、测试App停止及独立端口映射移除 |
| [原手机恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06/original-app-restored.json)、[实际设备画面](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06/original-app.png) | 原Host29132/App3722、原Key/绑定/真实回复保持，Android RemoteActivity前台、空草稿、管理false，无整站iframe |
| [全部原历史精确比较](../../artifacts/latest-runtime-check/latest-final-source-android-875862b7-4497-4ab7-91ab-79193c2e6b06-original-retention.json) | 26会话/3799事件的身份、投影和每条事件摘要与前轮完全相同；主聊天1837条完整摘要保持 |

原客户端355资源摘要精确恢复为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`，现场Git干净再次核对。所有证据以新UUID保存，原npm与此前失败报告未覆盖；日常 `F:\Program Files\deepseek-harness` 未修改。

这轮补齐实际源码的完整管理页面组合，仍不是SDK/Electron全管理或全部七条标准。其他工具/通知/文件异常和最终交付继续，完整新版支持声明尚未发布。Q盘结束时约1.86GiB可用，没有绕过此前清理拒绝。
