# Windows SDK 原生依赖加载

- 状态：第十轮完整官方 SDK、原 Python 资源校验及实际 Android 管理组合通过；第九轮配置重载失败已在新完整载体复验解除。原源码/启动配置及完整构建资源精确恢复归档；完整 SDK 兼容及原七条标准未全部完成。
- 维护角色：DSHM 插件兼容维护者。
- 最近核验：2026-10-09。
- 来源：[官方打包驱动](../../scripts/build-latest-sdk-sea.mjs)、[实际载体检查](../../../backend/scripts/latest-sdk-carrier.mjs)、[路径修正](./sdk-native-path.mjs)、[固定源码变换](./source-package-range.mjs)、[原生对照](../../scripts/diagnose-latest-sdk-native.mjs)、[边界测试](../../tests/latest-sdk-native-path.test.mjs)。

## 实际 SDK 结果

### 第十一轮与载体资源冻结（2026-10-09）

新监听修正使载荷变为14组38文件。`sdk-attempt-11`独立源码租约的完整修改后构建347.230秒退出0；真实FsLocal同大小/mtime回归在原tsx/bootstrap入口再次通过。直接Node类型剥离及错误目录的tsx调用在加载前失败，不是产品运行故障。新SDK官方打包、原Python资源和Android组合尚未完成，不能套用SDK10结果。

SDK10已由[归档工具](../../scripts/archive-latest-sdk-completed-products.mjs)核对旧成功组合/清理和新独立源码交付完整恢复后同卷保存，[归档报告](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-10-completed-products-archive.json)记录EXE摘要/原Python资源校验保持。[首次压缩](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-10-compression.json)退出0但整体摘要校验失败：45,182文件中19个Node workspace产物变化。`fsutil hardlink list`证明原FsLocal载体文件与源码lib及SDK7/8/9归档共用同一文件；同期源码完整构建确实重建这些文件。原报告保留，不把旧Node目录称为始终不可变，也不把EXE摘要保持当作整个资源保持。

[冻结工具](../../scripts/freeze-latest-sdk-node-carrier.mjs)仅在本轮38文件ready租约下逐文件核对并原子替换硬链接，拒绝正在变化的文件；[旧归档冻结](../../artifacts/latest-runtime-check/latest-sdk-node-freeze-archive-10.json)26,352个Node文件全部核对，24,122个硬链接拆开，整轮再次核对nlink=1和字节。冻结记录表示当时内容，不重写19项旧差异。[第二次归档压缩](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-10-compression-attempt-2.json)45,182文件前后摘要完全一致。旧EXE及历史成功/失败记录保持。

新SDK11打包驱动在暴露产品入口前强制冻结Node目录；[载体读取器](../../../backend/scripts/latest-sdk-carrier.mjs)额外逐项核对冻结字节/原目录/无硬链接，再运行原Python校验。实际新载体仍待验证。[手机范围守卫](../../../dsh-mobile/scripts/latest-final-test-scope.mjs)只允许明确SDK/Electron模式同时打开三项文件版本标志，继续用独立UID；8项范围及4项WebView守卫共12项通过。独立Android APK的165资源、精确SDK版本及原App23468摘要保持在[本轮复用回执](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-sdk-android-bcf83e64-76de-4396-bd74-27168847519b/apk-installed.json)中核对，没有重装原App或读取Key。

旧SDK7/8/9/10的八个EXE由[无损压缩工具](../../scripts/compress-latest-sdk-executables.ps1)逐个核对归档所有者、原摘要和无链接路径，LZX压缩后字节再次一致，[回执](../../artifacts/latest-runtime-check/latest-sdk-archived-exe-lzx.json)通过，Q盘可用3,159,932,928字节。没有删除旧失败或被拒绝清理的安装夹具。本轮仅对隔离生成目录设置非递归压缩继承，[独立属性租约](../../artifacts/latest-runtime-check/latest-sdk-compression-directory-lease-attempt-11.json)记录原值，SDK结束后还须以`manage-latest-sdk-compression.ps1 -Action restore -Scope sdk-attempt-11`恢复。第十一轮官方打包427.351秒退出1：原日志明确在同步Python numpy资源时ENOSPC。没有成功产品入口，不启动Android测试；失败与恢复边界见下节。

#### SDK11资源同步空间不足与字节恢复

[实际失败报告](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-11.json)与[原打包日志](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-11.log)保持；327,077,888字节EXE已经生成，但Python资源同步不完整，不能宣称完整SDK。原构建PID3712已退出。[停止产物压缩](../../artifacts/latest-runtime-check/latest-sdk11-failed-products-compression.json)40,003文件前后摘要一致；[失败归档](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-11-failed-products-archive.json)同卷保存整个runtime及dist-exe，EXE摘要`116a7028463a3f4f823aef0103db5119bcdc3daa4d57d03dc5ac6596f09fd790`。失败Node目录仍可能共享源码硬链接，不把它作为完成冻结或运行通过的载体；失败EXE和日志保持原字节。[两份EXE强压缩](../../artifacts/latest-runtime-check/latest-sdk11-failed-exe-lzx.json)前后字节一致，没有实质释放空间。

[目录属性租约](../../artifacts/latest-runtime-check/latest-sdk-compression-directory-lease-attempt-11.json)已恢复原属性，再封存生成目录。[原源码租约](../../artifacts/latest-runtime-check/latest-live-source-lease.json)以`restore --scope=sdk-attempt-11 --restore-bytes-only`恢复38原文件/根命令/两个启动载荷并核对Git干净；state仍为restoring、originalBuildDeferredForSdk11DiskExhaustion=true，完整原构建及355资源尚未恢复。该明确分支只接受本轮原ENOSPC失败、无成功产品和实际低于1GiB余量，不改完整恢复成功条件。空间恢复后必须用同scope普通restore继续原完整构建及355摘要核对，再归档租约；不得重新prepare覆盖恢复依据。

[原App核对](../../artifacts/latest-runtime-check/latest-source-office-metadata-33ccf7e8-8f1a-4021-a833-26aeca1777e6-original-6e7f5eb5-5133-48bd-9190-38d6ff3fa6c1.json)保持23468/29132、APK/绑定/1837主历史摘要和管理false；[全历史](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk11-disk-restored-20261009-before.json)与本轮之前identity逐项相同，26会话3799事件没有新增。Q盘现余约100MB，已请求用户在项目之外释放至少6GB；没有删除其他项目、旧失败或此前被自动审批拒绝清理的夹具。新SDK/Electron实际组合及本轮完整恢复继续未完成，完整新版支持未发布。

### 完整第十轮与 Android 管理组合（2026-10-09）

本次重新核对 Q 盘可用6,089,474,048字节，空间限制解除，继续原 `sdk-attempt-10/ready` 的37文件候选，没有重新prepare覆盖恢复依据。[原官方完整打包](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-10.json)435.436秒退出0；327,077,376字节EXE及同步副本的摘要均为 `287ffb6eff947ebaf44add0076355ae5c4bec1b504c66dd3986e11b2a7d84ff8`。[不可变清单](../../artifacts/latest-runtime-check/latest-source-manifest-sdk-attempt-10.json)摘要与固定新bootstrap核对；原Python `bundled_runtime_path` 检查通过。官方打包日志也核对20个Office包、原文档往返和Python依赖；没有跳过资源或用小型SEA替代。

[真实SDK/生产网关/Android组合](../../artifacts/latest-runtime-check/latest-final-sdk-android-496a79c6-4631-4247-957c-6647837d214a-test.json)164.802秒退出0，Android阶段126.816秒。独立UID复用已核验APK，本轮不重装原App；62文件插件包与全部55源码摘要、165手机资源及DSH SDK版本逐项核对。原官方模型写入返回 `result`，原隐藏字段及默认继承恢复，SDK9的原配置重载错误在完整新载体实际调用中解除。手机配对/历史/选模、局部动态插件、预设/工具、提供方及原生测试Key、模型目录、文件元数据刷新、撤权后拒绝重连、归档预设Host重启均通过。本轮不发送真实模型推理，也不把电脑应用的确认取消计为实际启动。

[清理回执](../../artifacts/latest-runtime-check/latest-final-sdk-android-496a79c6-4631-4247-957c-6647837d214a-cleanup.json)和实际进程探测核对Host48808/32160均停止；独立测试UID停止、反向映射清理、测试授权撤销。[原App恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-sdk-android-496a79c6-4631-4247-957c-6647837d214a/original-app-restored.json)核对原App3722、同一APK/Key/绑定和管理false，原真实回复可见、1837聊天记录摘要不变、空草稿、零整站iframe。开始与结束的完整只读审计逐项深比较26会话/3799事件、投影与设备身份完全相同；原Host29132保持。Windows捕获显示日期/锁屏背景，激活返回 `failed to activate captured window`，已请求用户解锁；Android内部前台不代表电脑窗口实际置前。

37原源码/启动配置字节已恢复。首次原完整恢复构建因 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` 退出1，[失败日志](../../artifacts/latest-runtime-check/latest-live-source-sdk-attempt-10-restored-build.log)及[失败租约](../../artifacts/latest-runtime-check/latest-live-source-sdk-attempt-10-restore-failed-lease.json)保持；原锁、pnpm11.7.0、offline/frozen-lockfile/ignore-scripts/prod=false及confirmModulesPurge=false恢复依赖退出0。同scope重试仅接受该原失败且原字节已恢复，[原完整恢复构建](../../artifacts/latest-runtime-check/latest-live-source-sdk-attempt-10-restored-build-retry-2.log)333.909秒退出0、无超时，355资源摘要恢复为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`，原Git干净，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-sdk-attempt-10-final.json)。归档驱动补齐第十轮明确范围，并在本次真实完整恢复路径通过。恢复后两份新SDK EXE及原Python资源再次通过，未覆盖SDK9失败或读取Key。七条总标准继续，完整新版支持未发布。

完整历史核对来源：[开始审计](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-management-10-20261009-before.json)、[结束审计](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-management-10-final-20261009-before.json)。两份均通过且同一Host29132的identity逐项深比较一致，26会话/3799事件保持。

以下2026-10-08的失败、空间阻塞与旧轮次记录保留为历史证据；当前进展以上方第十轮为准。

### 配置重载失败与模块身份修正（2026-10-08）

完整 SDK9、当前62文件插件和生产网关的[实际管理组合](../../artifacts/latest-runtime-check/latest-final-sdk-android-56bf6697-b732-4f96-9a64-16c6a1777f44-test.json)在手机阶段之前失败：`remote_settings_write_unconfirmed`。直接调用原服务同样返回 `settings/rejected / dsh: profile reload requires the root Include entry`，不能归因于手机页面或认证，也没有成功写入的证据。[清理回执](../../artifacts/latest-runtime-check/latest-final-sdk-android-56bf6697-b732-4f96-9a64-16c6a1777f44-cleanup.json)及实际进程检查确认自有Host退出，旧失败保持。

原 app-boot 在模块内 WeakMap 保存根 Include 入口。独立观察实际 SDK 的 C:/snapshot 与 Q:/snapshot 导入，得到 `sameReconciler=false`；同一虚拟文件的不同 ESM URL 创建两份模块，重载函数读取另一份空表。观察器已移至[明确诊断目录](../../../backend/tests/support/diagnostics/latest-sdk-profile-observer.mjs)，正式验收不加载，失败启动探针与旧报告没有覆盖。

两种可行修正是改变原 DSH 的状态存储，或统一 SDK 虚拟模块 URL。采用[SDK 专属路径修正](./sdk-module-identity.mjs)：只在原 SEA resolver 内将已解析的 Windows snapshot URL 盘符统一为 C，Office 父路径分派、其余 resolver 字段、真实磁盘、其他系统和错误传播保持。没有放宽管理权限、版本校验或补写根入口。

[真实小型官方 SEA 对照](../../artifacts/latest-runtime-check/sdk-module-identity-diagnostic--attempt-2/report.json)由同一个实际 EXE 运行两次：原行为退出2、`sameRegistry=false/rootVisible=false`；修正退出0、两者为true。此结果证明故障模式与修正机制，不能替代完整SDK复测。[4项模块边界](../../tests/latest-sdk-module-identity.test.mjs)、原8项native/runner测试及新独立候选9项安装边界共21项通过，后端显式tsconfig类型检查通过。

SDK9的整个runtime、dist-exe和产品记录已[同卷归档](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-9-profile-products-archive.json)，两份EXE摘要仍为 `989222642e2e05a287e15fbe52a232a5b2ae810b2b82785858d88a6c80992803`，归档后原Python校验再次通过。保存原Python模块/元数据以使用原实现定位资源，不替换校验函数。当前源码载荷仍13组/37文件，bootstrap为 `d8b2790415e8031e3476e069cf0770461e97ef0674a9ab102fa0468118ce39a2`；新第十轮采用独立清单/租约和报告，既有SDK9通过范围不扩写。原App/Key/绑定及26会话3799原事件保持，未重新安装或发送新消息。

第十轮完整源码构建342.259秒退出0，[原业务86项](../../artifacts/latest-runtime-check/package-range-source/original-regressions-attempt-10.json)及[原函数46项](../../artifacts/latest-runtime-check/latest-sdk-attempt-10-source-units-attempt-2.log)通过。原spec字节保持；首次原函数命令将Windows绝对路径直接传给ESM导入而在加载前失败，[原日志](../../artifacts/latest-runtime-check/latest-sdk-attempt-10-source-units.log)保留，改为已有驱动使用的file URL后运行原46项。不是SDK或产品功能的新故障，也未删改业务断言。

当时[独立源码租约](../../artifacts/latest-runtime-check/latest-live-source-lease-sdk-attempt-10-final.json)为`sdk-attempt-10 / ready / 37文件`，只修改项目内隔离检出，保留原恢复字节/355资源记录；尚未恢复为原源码，等待下一步SDK打包，不应开始另一轮安装或重新prepare覆盖。日常F盘DSH和原发布服务保持。该阶段官方完整SDK打包、原资源检查、真实SDK Host管理组合及最终源码精确恢复尚未通过，也没有新SDK产品入口。Q盘实际余量1,232,162,816字节，旧SDK整套约2.14GB；已请求用户手动释放至少3GB项目外空间，未执行预计空间不足的打包。此前被自动审批拒绝的清理未重试或绕过。该记录现已完成恢复归档，结果以上方2026-10-09为准。

[本轮开始快照](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-module-identity-20261008-before.json)与[结束快照](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-module-identity-20261008-final-before.json)在同一原Host29132核对全部26会话/3799事件、投影和设备身份逐项完全相同；原App3722/RemoteActivity保持。本轮没有重启原服务、读取Key或发送新消息。下一步在空间充足后运行`node scripts/build-latest-sdk-sea.mjs --attempt-10`，其要求当前完整37文件/固定bootstrap、同scope归属记录、原生成目录不存在，并按新轮排他记录manifest；随后消费完整载体运行原组合，不能复用SDK9的通过结论。

SDK9归档随后按[无损压缩专项](../../docs/project-knowledge/validation/storage-maintenance.md#第九轮归档的压缩与硬链接长度核验2026-10-08)释放约433MiB。首轮清单因硬链接FileInfo旧长度而失败，原报告保留；实际路径/全部内容摘要一致，修正同一只读句柄取长度/摘要后，真实硬链接3项及45,179文件复验通过。SDK9两份EXE摘要、原Python资源再次核对。第十轮源码ready保持，未启动打包，结束余量1,662,586,880字节仍不能证明原完整SDK及临时文件空间充足；不是SDK管理组合通过，也没有新产品入口。

压缩后的[完整历史快照](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-compression-20261008-final-before.json)与上一结束快照在同一Host29132的identity逐项深比较完全一致，全部26会话/3799事件保持。实际ADB另确认原App PID3722及RemoteActivity保持；没有操作用户Key、授权或会话。

后续两次实际磁盘核对仍仅1,662,205,952字节。无损压缩后，同一空间限制连续三轮未解除；当前目标标记为阻塞、未完成，等待已请求的项目外额外空间释放。SDK10构建报告与产品入口均不存在，原构建PID32220及失败Host26236已退出，不是等待存活的构建进程。独立Electron完整管理准备同样要求匹配资源，不能把SDK9旧结果替代SDK10。恢复工作时先核对实际空间及当前ready租约，继续原官方打包、原Python检查、完整SDK/Android管理组合，最后用同scope精确恢复原源码；不重新prepare覆盖恢复依据。原七条总标准保持。

第九轮 `sdk-attempt-9` 原源码完整候选构建377.325秒、[官方完整 SDK 打包](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-9.json)493.313秒退出0；326915584字节EXE，生成和同步摘要均为 `989222642e2e05a287e15fbe52a232a5b2ae810b2b82785858d88a6c80992803`，原Python资源检查通过。SDK Host21012沿原home、16901网关和原App3250的[实际普通续聊](../../artifacts/latest-runtime-check/latest-sdk-sea-android-attempt-9.json)通过：用户seq1801/回复seq1805，唯一新标记、原历史前缀、空草稿、原权限和零iframe均核对，没有更换Key或配对。

同一完整SDK的[实际手机命令启动](../../artifacts/latest-runtime-check/latest-live-sdk-attempt-9-encoding-android-live-start.json)、[结算核对](../../artifacts/latest-runtime-check/latest-live-sdk-attempt-9-encoding-android-observe.json)和[历史重入](../../artifacts/latest-runtime-check/latest-live-sdk-attempt-9-encoding-android-replay.json)均通过。真实模型只调用一次指定pwsh，在原只读会话运行20秒；结算前已显示中文/emoji标准输出和预期错误输出，手机内容与原结果一致，权限保持read-only。第八轮ACL runner盘符分派故障在此实际路径已解除，不扩大为所有工具或SDK完整兼容。

[完整SDK包管理运行器复验](../../artifacts/latest-runtime-check/sdk-runner-settlement-recheck-attempt-9/report.json)通过四个Q/C入口边界、缺IPC拒绝、正常结束、遗留写入子进程清理和调用者主动断开。实际退出码、原cwd/含空格参数/中文环境、标准/错误输出、所有PID退出及写入停止独立核验；不安装插件或请求模型。[首轮等待失败](../../artifacts/latest-runtime-check/sdk-runner-execution-attempt-9/report.json)和[进一步观察失败](../../artifacts/latest-runtime-check/sdk-runner-disconnect-observation-attempt-9/report.json)保持原记录：实际exit=1、两流EOF、三PID死亡，但未触发close。相同Node24.11.0的[独立普通Node对照](../../artifacts/latest-runtime-check/node-disconnect-close-control-attempt-9.json)复现相同现象；[官方源码](https://github.com/nodejs/node/blob/v24.11.0/lib/internal/child_process.js)的主动disconnect与IPC读EOF路径对close计数不同。验证器改为同时等待真实exit、两个流结束和IPC结束，仍检查完整进程树/写入停止；没有修改产品进程控制或放宽权限。

SDK9正常停止后原发布Host27408恢复。首次[恢复历史审计](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-9-after-restore-audited.json)通过26会话/3729事件，手机打开原聊天后追加官方空end-seed，旧快照的seq校验失败。[原失败](../../artifacts/latest-runtime-check/latest-sdk-sea-android-restored-attempt-9.json)保留；仅在同一Host重读的[完整审计](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-9-after-restore-audited-phone-settled.json)核验26会话/3730事件、全部原前缀/投影和唯一空恢复标记，[Android恢复](../../artifacts/latest-runtime-check/latest-sdk-sea-android-restored-attempt-9-audit-settled.json)通过同一App3250/APK、原聊天seq1808、空草稿及管理false。没有重启Host、重发消息或忽略新增事件。源码原37文件/独立启动/根命令字节恢复、384.677秒原完整恢复构建退出0，355资源摘要恢复为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`，Git干净，[本轮原租约已排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-sdk-attempt-9-final.json)。SDK9完整载体保留，日常安装未更换。

以下第八、七轮保留为修正前证据。

第八轮独立 `sdk-attempt-8` 完整候选构建373.643秒退出0，[官方 SDK 打包](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-8.json)495.495秒退出0；326915072字节EXE，生成与同步摘要均为 `1ba71341f0ae3c9ceed8c8b9da7c739fd361ec7fcaa8ef3ee31269fab7e6a57c`，原Python资源检查通过。[实际 MuMu 续聊](../../artifacts/latest-runtime-check/latest-sdk-sea-android-attempt-8.json)沿SDK Host58968、原App3250、原输入框唯一发送并收到同标记的新模型回复；用户seq1788/回复seq1792，原历史前缀、原权限、空草稿和零iframe通过。第七轮原生依赖故障已在完整SDK的这一实际路径复验通过，不代表全部工具或完整SDK兼容。

[实际命令发送](../../artifacts/latest-runtime-check/latest-live-sdk-attempt-8-encoding-seed.json)已被原会话接收，但[手机实时输出检查](../../artifacts/latest-runtime-check/latest-live-sdk-attempt-8-encoding-android-live-start.json)超时失败。[原结果只读核对](../../artifacts/latest-runtime-check/latest-sdk-sea-encoding-inspection-attempt-8.json)确认会话已结束，唯一pwsh调用的runner路径被 `runCli` 当作profile，退出1；实际pwsh子进程没有执行。保留原失败，不重发该标记、不将空输出或工具框架的isError字段视为执行成功。

以下第七轮记录保留为修正前证据。

第七轮独立 `sdk-attempt-7` 租约完整候选构建374.864秒退出0，37文件沿原固定提交应用。[原官方完整打包](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-7.json)505.540秒退出0，没有写入探针；生成326914560字节 EXE，SHA-256 为 `538d4fbdb7e54ccf8d6099c7d90ef6d5f844052fba474fa6f73107fccf40feb6`。同步 EXE 同摘要，原 Python `bundled_runtime_path` 资源校验实际通过。这一轮的磁盘前提已解除，不能继续称“尚未生成成功记录”。

实际 SDK Host70272加载当前已审阅的62文件插件归档、55源码摘要，原 home、16901网关和原设备保持。[完整启动前历史](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-7-before.json)与[SDK读取审计](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-7-after-review-audited.json)均通过26会话/3665原事件，管理权限false，没有桌面网页 iframe。

手机原输入框唯一发送的[记录](../../artifacts/latest-runtime-check/latest-sdk-sea-message-attempt-7.json)未被原 DSH 接收。[真实失败](../../artifacts/latest-runtime-check/latest-sdk-sea-native-failure-attempt-7.json)保留原错误 `The specified module could not be found`，路径是 `Q:\snapshot\...\@koromix\koffi-win32-x64\win32_x64\koffi.node`；原seq1782不变、新事件0、草稿保留。等待新回复的[Android报告](../../artifacts/latest-runtime-check/latest-sdk-sea-android-attempt-7.json)因240秒超时失败。页面中的旧模型回复不能算本轮成功，不自动重发。

## 最小复现与修正边界

原SDK暂存的Koffi3.1.1在普通Node实际调用 `GetCurrentProcessId` 成功；初次[CommonJS夹具](../../artifacts/latest-runtime-check/sdk-native-drive-diagnostic/report.json)和[普通ESM夹具](../../artifacts/latest-runtime-check/sdk-native-drive-diagnostic-esm/report.json)也退出0，因未复现失败而保留为失败的诊断断言，不当作产品故障。

进一步以实际SDK错误中的Q盘虚拟caller路径调用原 `createRequire`，同版本原打包器的[最小SEA对照](../../artifacts/latest-runtime-check/sdk-native-drive-diagnostic-q-caller/report.json)复现相同的Q盘native错误，退出1；只规范化盘符后退出0。Koffi原件、夹具和提取缓存的摘要均为 `eb0587c804bb76262968bf83028528da4dc2d4322f558845cce205c709e2ba20`，原文件未被替换。原打包器 `insideSnapshot` 只识别C/V，而VFS已经支持移除任意Windows盘符；这个差异足以解释最小复现中的提取遗漏，完整SDK仍需复验。

可选方案：直接修第三方pkg的预置bundle及其pnpm补丁/锁，能同时覆盖其他虚拟调用，但扩大第三方维护范围；或在SDK专属bootstrap中只规范化Windows虚拟native路径，然后交回原提取器。采用后者，保留原文件提取、摘要、native flags、Office解析和runner分派。真实磁盘、C/V、POSIX、UNC和类似 `snapshot-other` 路径不变，普通Node以及Linux/macOS不安装此包装。

[同一候选代码的实际SEA对照](../../artifacts/latest-runtime-check/sdk-native-drive-diagnostic-candidate/report.json)退出1→0，6项边界/实际固定bootstrap语法和原始摘要检查通过。修正已组合到原 `python/sdk-runtime/runtime-bootstrap.mjs` 的维护变换，仍是13组/37文件，新的bootstrap摘要 `38edf143c0190e8051a4d1b9d63d9908c577c6776100153d6c780f8ebbf2fdc1`；原SDK第七轮的[完整旧manifest](../../artifacts/latest-runtime-check/latest-source-manifest-sdk-attempt-7.json)保留，第八轮前新载荷只生成和plan；本轮已建立独立源码租约应用至固定检出，日常安装保持。新[18项目标审计](../../artifacts/latest-runtime-check/patch-inventory-gjpLCp/report.json)通过，`fullAcceptancePassed=false`。

## 恢复与下一轮

第八轮收尾：SDK控制器正常停止，原发布Host33004恢复。[切换前](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-8-restarted-before-restore.json)26会话/3696事件与[恢复后](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-8-restarted-after-restore-audited.json)全部原事件前缀、投影、绑定和管理false一致，仅追加官方空恢复标记至3697事件。[实际 Android 恢复](../../artifacts/latest-runtime-check/latest-sdk-sea-android-restored-attempt-8-read-repair.json)通过同一App3250、APK摘要、原聊天seq1795/空草稿和Remote前台；未重装、未读取Key或更换配对。首个恢复驱动将发送结果误当作包含home的记录，其[只读校验失败](../../artifacts/latest-runtime-check/latest-sdk-sea-android-restored-attempt-8.json)独立保留，修正读取字段后通过。实际MuMu设备窗口已置于前台并显示此原聊天。

37原源码与独立启动/根命令字节恢复、382.730秒原完整构建退出0、355资源原摘要和Git干净均通过，[原租约排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-sdk-attempt-8-final.json)。SDK8完整产物及旧成功/失败证据仍保留，未覆盖为新候选。

SDK8打包后源码依赖状态导致非TTY冷启动失败，新增仅失败时输出脱敏stdout后确认 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`；[初次失败](../../artifacts/latest-runtime-check/latest-source-startup-installed-sdk-attempt-8-post-deploy-failure.json)与[观察失败](../../artifacts/latest-runtime-check/latest-source-startup-installed-sdk-attempt-8-post-deploy-observed-failure.json)均保留。沿原pnpm11.7.0离线、冻结锁、ignore-scripts、prod=false和confirmModulesPurge=false恢复完整依赖后，[完整候选源码实际启动](../../artifacts/latest-runtime-check/latest-source-startup-installed-sdk-attempt-8-restored-dependencies.json)通过，随后完成上方原源码恢复。没有忽略原激活错误或改用缺少37补丁的启动检查。

并行发布入口回归曾因把SDK新bootstrap摘要用于此前封存的普通Node运行器而5项全部失败，[错误摘要记录](../../artifacts/latest-runtime-check/latest-sdk-native-published-payload-regression-failure.json)保留。已纠正为分别核验：发布运行器保留原封存摘要，SDK修正载荷由完整源码和SDK载体检查；没有覆盖旧发布副本或复用旧36文件通过证据。5项发布安装/幂等/精确恢复/未知编辑/版本/链接边界复验全部通过。

旧[启动器交付检查](../../scripts/verify-latest-source-delivery.mjs)在原源码上仅安装三份引导文件和根命令，没有应用完整37文件候选。当前插件依赖预设归档兼容接口，原启动报`remote_presets_unavailable`，`/api/dsh-mobile`返回404。[交付失败快照](../../artifacts/latest-runtime-check/latest-source-delivery-sdk-native-unpatched.json)与[实际启动错误](../../artifacts/latest-runtime-check/latest-source-startup-installed-sdk-native-unpatched.json)保留；finally已恢复原文件/命令，355资源和Git干净重新核验。该检查没有运行SDK/Koffi；既不能据此判定SDK修正失败，也不能视为启动通过。实际候选必须使用完整兼容载荷，不放宽原接口或忽略激活错误。

SDK控制器正常停止后，原发布Host19556恢复；[切换前](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-7-before-restore.json)及[恢复后](../../artifacts/latest-runtime-check/latest-live-child-retention-sdk-attempt-7-after-restore-audited.json)完整26会话/3665事件和原设备身份相同。

用户发现前台MuMu没有App，实际设备管理窗口没有设备画面；打开设备画面时模拟器重启，原App32632退出，新App3250启动。恢复原16901 adb reverse后，[真实Android恢复](../../artifacts/latest-runtime-check/latest-sdk-sea-android-restored-attempt-7-attempt-2.json)核验同一APK摘要、配对、管理false、seq1782、workspace-write、原Remote前台和零iframe。只清理原未被接收的精确测试草稿，没有读取Key、重装、清空数据或重新配对。首轮恢复驱动读错审计字段的[失败](../../artifacts/latest-runtime-check/latest-sdk-sea-android-restored-attempt-7.json)保留。

37原源码/启动配置已经恢复。首次原完整构建因pnpm非TTY依赖清理提示失败，[日志](../../artifacts/latest-runtime-check/latest-live-source-sdk-attempt-7-restored-build.log)与[失败租约](../../artifacts/latest-runtime-check/latest-live-source-sdk-attempt-7-restore-failed-lease.json)保留；原锁offline/frozen-lockfile/ignore-scripts/prod=false/confirmModulesPurge=false恢复依赖退出0，同一租约原完整构建重试366.169秒退出0、无超时。355资源摘要恢复为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`、Git干净，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-sdk-attempt-7-final.json)。

下一轮必须新建源码租约、保留当前完整但运行失败的SDK产物/报告，再运行原官方打包和原Python校验、实际SDK Host以及MuMu原聊天唯一发送/回复。不能把小型SEA、启动成功、旧回复或载荷审计视为完整SDK续聊通过。Electron、最终交付和原七条有效总标准保持未完成；整体入口见[新版验收](../../../dsh-mobile/docs/integration/latest-compatibility.md)。

第七轮完整但续聊失败的载体已由[独立归档工具](../../scripts/archive-latest-sdk-native-failure.mjs)核对官方成功报告、原Python资源校验、失败Host退出和完整源码恢复后，同卷改名保存整个runtime（含同步EXE/原Python和Office资源）、dist-exe及产品记录。[归档报告](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-7-native-products-archive.json)通过，两个EXE摘要保持；原错误没有覆盖。第八轮已建立独立源码租约应用13组/37文件修正载荷并执行完整构建，日常安装保持。新打包及启动检查要求manifest和修正bootstrap摘要一致，避免误用旧载体；完整新SDK续聊仍待验。

## SDK runner 分派的第二个盘符问题

第八轮完整产物由同一[归档工具](../../scripts/archive-latest-sdk-native-failure.mjs)的显式 `--attempt-8` 分支核验原成功续聊、失败命令、4个SDK对照、进程退出和完整源码恢复后，同卷保存整个runtime、dist-exe及产品记录。[归档报告](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-8-runner-products-archive.json)通过，两个EXE摘要保持。第九轮独立 `sdk-attempt-9` 已应用同一13组/37文件修正组合，完整候选构建377.325秒退出0；[86项原回归](../../artifacts/latest-runtime-check/package-range-source/original-regressions-attempt-9.json)通过且原spec字节保持。[本轮不可变manifest](../../artifacts/latest-runtime-check/latest-source-manifest-sdk-attempt-9.json)37文件/新bootstrap摘要已在原官方SDK打包前排他记录，随后完整打包、实际手机和运行器专项通过，范围见上方。

打包驱动中第八轮新增的scope分支曾漏写suffix前导连字符，未执行该分支；其manifest/新bootstrap仍由当时完整源码、报告摘要、独立保存和实际SDK载体检查核验。第九轮已修正真实suffix判断，实际排他清单已经生成，旧SDK8证据不被重写。普通Node封存载荷与SDK不可变清单继续分别核验。

原沙箱 `windowsAclRunnerInvocation` 将原 `import.meta.resolve` 路径作为SDK第一个参数；bootstrap另行解析同一个入口并使用字符串严格相等判断。本轮真实命令参数为Q盘snapshot，bootstrap入口为C盘snapshot，未命中ACL分支后落入原CLI。插件包管理runner有相同入口形态。

[原完整SDK对照](../../scripts/diagnose-latest-sdk-runner.mjs)从实际失败文本读取ACL路径，只给入口路径而不给工作区、模式或命令：[4个原SDK运行](../../artifacts/latest-runtime-check/sdk-runner-dispatch-diagnostic-attempt-8/report.json)中Q盘ACL/包管理均被误当profile，C盘分别正确到达原ACL缺workspace校验（127）和原包管理缺参数校验。没有模型请求、实际沙箱命令或权限更改，旧EXE摘要保持。这将盘符分派原因从推断变为实际对照事实。

两种可行修正：规范化所有spawn入口盘符会涉及多个生产者；或仅在SDK bootstrap比较已解析的两个已知runner时折叠snapshot盘符。采用后者，`isSea`且Windows才接受相同snapshot尾路径的另一盘符，真实磁盘、UNC、相似目录、遍历、不同脚本或斜杠形式仍保留原精确判断。只进入原两个runner，argv移位、原参数和受限沙箱执行保持；不增加任意脚本分派或无约束执行回退。

[维护候选](./sdk-native-path.mjs)已组合至同一13组/37文件来源，bootstrap新摘要 `61241cde85c14d3abd279867ff70a2babf12f3bf8d70f125883159c7fa714ae3`。8项路径/平台/参数/原bootstrap语法测试和7项启动恢复门槛通过；封存普通Node载荷保留原摘要。SDK载体现按该轮不可变manifest核对，第八轮旧摘要及证据仍有效。第九轮完整打包、实际SDK工具/手机和运行器结果见上方；Electron、最终交付及原七条总标准保持未完成。
