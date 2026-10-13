# Electron 桌面与原 Android 验收

固定目标为 DSH `0.2.1-alpha.1`、提交 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。本轮使用官方 Electron 44 桌面入口和 SDK 第九轮完整运行资源，测试项目及用户目录独立；日常 DSH 安装未修改。

## 完整 Android 管理组合2026-10-09

- 状态：[独立第二轮完整事务](../../artifacts/latest-runtime-check/latest-final-electron-run-ce65a05a-0f82-4cb1-91a2-a957707bf003.json)退出0并通过，包含314.221秒完整补丁构建、真实Electron/Android管理及重启193.477秒、322.633秒原完整恢复构建、37原源码/启动字节、Git干净及355客户端资源精确恢复。首轮测试脚本缺少官方`entryListSchema`导致`!!js`解析失败，已修正并有实际重启回归，[失败与原恢复记录](../../artifacts/latest-runtime-check/latest-final-electron-run-2d3c344e-9c76-4a77-bca4-dd4d2e9616d8.json)保留。完整新版七条总标准尚未全部完成。
- 维护角色：DSH Mobile 项目协作 Agent；核验日期：2026-10-09。
- 来源：[原完整Host验收](../../../backend/tests/latest-host.test.ts)、[官方桌面工程准备入口](../../scripts/prepare-latest-electron-project.mjs)、[独立路径守卫](../../scripts/latest-electron-final-scope.mjs)、[原Host身份观察器](../../tests/support/latest-electron-ready.mjs)、[独立Android范围守卫](../../../dsh-mobile/scripts/latest-final-test-scope.mjs)。

本专项将既有npm/源码/SDK Android管理流程换成官方Electron主程序启动，保留配对、原生鉴权/传输、历史/选模、局部动态插件、预设/工具/提供方/目录管理、文件刷新、撤销与原Host重启断言，不以CLI冒充桌面。官方开发工程准备器及原资源检查复用完整SDK10资源；不修改原桌面IPC或生产认证。桌面主进程和Node Host的实际父子关系必须分别核对，首次及重启各自保留身份记录，收尾由系统确认两个主进程及两个Host退出。

第二轮实际主进程41748/Host23096及重启45932/Host24680均按官方Electron44/Node24.18.1父子关系核对；配对/历史/选模、动态局部插件、预设/提供方/模型目录、文件刷新、撤销和原profile重启恢复通过。重启仅移除三项外加夹具，官方`!!js`表达式与其他管理配置保留，原预设归档会话在没有临时插件时恢复。独立测试授权已撤销，四个拥有进程退出。来源：[完整链路](../../artifacts/latest-runtime-check/latest-final-electron-android-ce65a05a-0f82-4cb1-91a2-a957707bf003-test.json)、[进程收尾](../../artifacts/latest-runtime-check/latest-final-electron-android-ce65a05a-0f82-4cb1-91a2-a957707bf003-cleanup.json)、[原profile重启记录](../../artifacts/latest-runtime-check/electron-final-ce65a05a-0f82-4cb1-91a2-a957707bf003/restart-profile.json)。

第二轮原App16722/Host29132保持，原APK、绑定、管理权限关闭、1837条主聊天及原回复不变；全部26会话3799事件与首轮开始identity逐项相同。恢复构建后[原App再检查](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-electron-android-ce65a05a-0f82-4cb1-91a2-a957707bf003/original-app-restored-after-guard.json)通过，Android前台为原Remote，无远端iframe；[全部历史](../../artifacts/latest-runtime-check/latest-live-child-retention-electron-final-pass-restored-20261009-before.json)和[18目标/13组只读审计](../../artifacts/latest-runtime-check/patch-inventory-nk5Hx5/report.json)通过。本轮未发起真实模型推理，Windows可见桌面仍未用浏览器或Android截图替代验证。

首轮实际主进程43552/Host26080、Electron44/Node24.18.1父子关系通过；生产网关与独立Android的配对、历史、模型、局部插件、预设、提供方/模型目录、文件刷新和撤销全部通过。整轮179.115秒失败位置是重启准备解析官方profile，尚未启动第二个桌面Host；不得用手机阶段通过替代整轮通过。测试授权已撤销，两个拥有进程退出，失败profile及日志不改写。

原App重开后PID从3722变为16722，原因未确认；旧PID保持检查的失败另存，不能声称进程保持。独立重开核验通过原APK、绑定指纹、管理权限关闭、同一1837条历史及原回复，未重装、读取Key或重配对；全部26会话3799事件与开始identity逐项相同，原Host29132保持。证据：[首次恢复检查失败](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-electron-android-2d3c344e-9c76-4a77-bca4-dd4d2e9616d8/original-app-restored-after-failed-electron.json)、[重开核验](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-electron-android-2d3c344e-9c76-4a77-bca4-dd4d2e9616d8/original-app-restored-after-failed-electron-reopened.json)、[全部历史复核](../../artifacts/latest-runtime-check/latest-live-child-retention-electron-final-restored-20261009-before.json)。

Windows锁屏仅限制实际桌面窗口、系统弹窗及第三方编辑器信任提示的可见操作。DSH Web页面可通过侧边浏览器继续验证，Android页面及后台生命周期通过ADB验证，原Electron Host可以独立进行真实链路检查；锁屏不是Remote整体验证的阻塞条件。当前未把浏览器页面或Android截图记为Windows实际窗口验证。

本轮侧边浏览器补查没有取得页面：未启动或先核对旧3080服务便直接访问，得到`ERR_CONNECTION_REFUSED`；随后系统监听检查确认3080没有监听进程，独立16901仍由30912监听。独立地址的侧边浏览器导航返回`ERR_BLOCKED_BY_CLIENT`，原因未确认；两项都不证明锁屏阻止浏览器。没有更改浏览器安全策略、重新启动日常DSH或把连接失败记为页面验证通过。

每次使用新的UUID、`relay-homes/<UUID>`、`electron-final-<UUID>` 和独立user-data，不能复用原live-home或旧失败目录。原桌面profile保留本轮管理的其他配置；重启只移除外加的DSHM及两项业务夹具，保留严格只读身份观察器，随后沿原profile核验已归档模式和旧会话恢复。本次不发送真实模型推理请求，不能用管理协议代替既有真实模型专项。

独立App `dev.dshmobile.validation.latestfinaltest`沿[原APK检查入口](../../../dsh-mobile/scripts/prepare-latest-final-apk.mjs)复用既有已核验包，未安装或清除原App。[本轮165项资源核对](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-final-electron-android-2d3c344e-9c76-4a77-bca4-dd4d2e9616d8/apk-installed.json)通过，APK摘要 `54e920866d4fe220c4bc23cb1e92a15c7033cd3603b60c3ebaa98e67acbef973`；全部DSH SDK版本为0.2.1-alpha.1，原App3722及原APK摘要保持。[测试前全历史审计](../../artifacts/latest-runtime-check/latest-live-child-retention-electron-final-20261009-before.json)通过26会话/3799事件。Windows窗口捕获此前显示锁屏，可见前台仍待用户解锁核对。

执行入口为插件目录 `node scripts/verify-latest-source-remote.mjs --final-electron`，须显式指定独立 `DSHM_LATEST_FINAL_RUN` 和已核验Android设备/ADB；外层完整安装、构建、原字节/完整恢复构建与355资源核对始终执行。上述运行中状态不能借用早期Electron真实消息、命令结果或SDK10管理组合宣称通过。

## 已通过的真实入口

无控制台修正候选已通过第二次完整 Electron 与原 Android 链路：手机唯一发送并收到 `DSHM_ELECTRON_e4656e6c69994a10`，电脑实际窗口显示同一回复。用户事件 1829、助手事件 1833；原 App PID 3250、安装包摘要、工作区权限及管理权限关闭保持。以下首轮记录保留当时的范围。

- 官方开发项目准备、完整 Python/Node/pnpm/Office 资源检查及 37 文件候选完整构建通过。原 Electron 主进程和其 Node Host 的父子关系核对通过。
- 原 Android App 经原网关、Host 发送唯一测试消息，取得真实模型回复 `DSHM_ELECTRON_3556aeb374544cb7`。用户事件 1814、助手事件 1820；历史前缀、模型、工作区权限和空草稿保持，未加载远端页面。
- 用同一可执行文件、同一独立用户目录走官方单实例激活入口后，实际完整 DSH 桌面窗口可见。电脑原测试会话显示同一手机消息及回复，模型为 `DeepSeek-V41-Flash High`、权限为工作区内修改。
- 原 MuMu App 未重装，原 Key 和配对保持，管理权限为关闭。收尾后实际窗口重新置前，并显示原测试聊天和上述回复。

最初几轮观察器及测试包元数据错误的报告独立保留。首次检查时窗口隐藏，但原后端及工作区已经就绪；隐藏原因未证实，不将官方激活记为启动缺陷修复。

## 未通过的命令与根因

在原只读编码测试会话通过 Android 发送一次真实 pwsh 命令，原调用事件 527、结果 528。命令未执行：原沙箱返回 `SANDBOX_UNAVAILABLE`，细节为 `windows-acl-run: SetConsoleOutputCP failed (Win32 6)`。手机实际命令详情显示相同失败，未重发、提高权限或绕过沙箱。

同一 koffi/kernel32 调用的最小独立对照确认：Electron Node 24.18.1 没有控制台，读取代码页为 0、设置代码页失败且错误为 6；普通 Node 24.11 附有控制台时设置成功，并在自己的进程恢复原 936 代码页。相同普通 Node 以 detached 模式运行也得到代码页 0、错误 6，因而故障与没有控制台有关，而非 Electron ABI 不兼容。

原首轮候选无条件设置控制台代码页。后续修正和实际结果见下一节；首轮与 SDK 第九轮的载荷、清单和失败证据保持独立，不能用后续代码重写历史结论。

## 无控制台修正与实际边界

- 状态：无控制台编码修正及完整 Electron/原 Android 命令链路通过；原运行环境和源码/资源精确恢复归档，完整新版支持尚未交付。
- 维护角色：DSH Mobile 项目协作 Agent；核验日期：2026-10-08。
- 来源：[编码变换](./pwsh-encoding-changes.mjs)、[进程环境验证器](../../scripts/verify-latest-pwsh-console-modes.mjs)、[独立原生对照](../../scripts/probe-latest-electron-owned-console.mjs)。

`electron-encoding-2` 尝试只在控制台存在时设置代码页。347.111 秒完整构建、5 项边界测试和 46 项原源码回归通过；普通 Node 的独占控制台及 detached 两组实际四组合通过，但 Electron 的只读 PowerShell 7/5.1 输出仍按 936 编码，中文与 emoji 损坏。语言限制、原标准/观察输出一致及只读写入拒绝仍保持，整轮不通过。该轮未切换持久 Host 或发送手机测试消息。

第二轮已恢复并精确核验 37 原文件、314.208 秒完整恢复构建、355 原资源及源码 Git 干净，归档 `electron-encoding-2-final`。全部原/后源码及完整清单独立封存于 `artifacts/latest-source-patches-electron-encoding-2`，清单摘要 `3bda1d5648d0669d4930f2648467cb68b1ed4ed77cbf7504ecee995d4fdbf225`。

独立原生对照随后验证另一方案：仅为没有控制台的沙箱执行器分配隐藏控制台，保存并恢复全部原标准句柄，再设 65001。原 stdin 是 NUL 字符设备，stdout/stderr 是管道；首轮验证器误要求三者都是管道而失败，原记录保留。修正断言后的真实 Electron 对照中，四组合全部通过，六个实际 runner 的原句柄类型保持 `[2,3,3]`，中文/emoji、双通道、语言限制及只读拒绝通过，六进程均退出。这是诊断预加载证据，尚不能替代交付代码的完整桌面/手机验收。

第三轮独立候选已把此方案写入原 FFI/runner 的编码边界，6 项错误/句柄恢复/释放测试通过；仅在错误为 6 时分配自己拥有的控制台，其他读取、分配、句柄恢复或编码设置错误均拒绝执行。原 token、ACL、stdio、控制管道及原后续执行/清理代码保持。完整候选构建 308.996 秒、46 项原源码回归和 8 项恢复入口守卫通过。

实际原执行器通过三种进程环境：普通 Node 独占控制台每次从 936 开始、detached Node 无控制台、Electron 44 的 Node 24.18.1 无控制台。每种环境执行 PowerShell 7/5.1 普通及只读沙箱四组合，共 12 组合，中文/emoji 双流、原结果与观察输出一致、原只读写入拒绝和语言限制均通过。生产候选由原执行器创建所需控制台，没有诊断预加载代替执行。

第二次完整桌面入口复用原 SDK9 完整资源、原 home/网关/App/身份。手机在原只读编码会话仅调用一次 pwsh，20 秒运行期间已显示中文/emoji，结算后标准输出、预期错误输出、原执行结果和历史重入全部通过；原命令及结果对应 `call_00_ET_iWKyMluJUKs3V4kBqU3S4943`，权限始终只读。首轮失败 527/528 保留，未重发旧请求。新模型消息验证器首次缺少 Android 序列号，在连接设备及生成发送凭据前失败；严格核对没有发送后独立保存原报告，再补齐设备环境，原 App 未重启或重配对。

本轮官方设置服务将桌面 profile 改写为 YAML；恢复器先核对全部语义配置与原备份一致，只有观察器路径为本轮目录，再保存当前字节并恢复原备份。第一轮错误地要求 JSON 字节格式的守卫拒绝发生在写入之前，未覆盖未知配置。原发布 Host 73900 恢复后，26 会话原前缀/投影及绑定保持，3797→3799 仅新增两个官方空恢复标记。原 App PID/安装包/回复/空草稿及管理 false 复核通过，MuMu 实际前台显示同一测试聊天。日常安装未修改；隔离 npm 执行器按严格旧摘要升级到本轮编码候选，不能描述成 npm 两个运行文件字节未变。

## 恢复与证据

首轮原发布入口、同一 App、身份和 26 个会话已恢复。恢复前 3765 个事件全部保留，恢复后 3767 个事件仅增加两个官方空恢复标记。37 个原源码及启动字节、352.303 秒完整恢复构建、355 个原客户端资源和源码 Git 干净状态精确核验后，归档为 `latest-live-source-lease-electron-final.json`。

第三轮完整原构建恢复 366.888 秒退出 0，37 个原源码/独立启动/根命令字节及 355 个原资源精确恢复、源码 Git 干净，归档为 `latest-live-source-lease-electron-encoding-3-final.json`。全部 74 份原/后源码与清单独立封存于 `artifacts/latest-source-patches-electron-encoding-3`，清单摘要 `1d8a13fce4a4e08d74a1e34d36e9901806a6f57a1c718aef8309816e6a5b4324`。18 项旧目标与当前 13 组/37 文件只读审计通过；这不是七条总验收标准通过。SDK9 原 EXE/清单/Python 资源再次核对通过，未替换其既有载荷。

本地证据位于插件 `artifacts/latest-runtime-check/`，不随 Git 分发：

- `electron-attempt-1/preparation.json`、`official-activation.json`、`actual-desktop-ui-observation.json`：原资源和实际桌面入口。
- `latest-electron-android-attempt-1.json`：实际手机唯一发送与模型回复。
- `latest-live-electron-attempt-1-encoding-original-failure.json`：原命令失败。
- `electron-attempt-1/console-codepage-control.json`、`console-codepage-detached-control.json`：独立原生对照。
- `latest-electron-android-restored-prepare.json`、`latest-electron-android-restored-check.json` 和源码恢复归档：原 App/历史及源码精确恢复。
- `latest-electron-encoding-3-console-modes.json`：实际原执行器三环境/12 组合。
- `electron-attempt-2/actual-desktop-ui-observation.json`、`latest-electron-android-attempt-2.json`：修正后完整桌面与原手机同一真实回复。
- `latest-live-electron-attempt-2-encoding-android-{live-start,observe,replay}.json`：实际原命令实时输出、双流结果和历史重入。
- `latest-electron-android-attempt-2-before-device-failed.json`：连接设备前的验证器失败，未生成发送凭据。
- `electron-attempt-2/profile-restored.json`、`latest-electron-android-attempt-2-restored-{prepare,check}.json`：本轮独立 profile 和原 App 恢复。
- `latest-live-source-lease-electron-encoding-3-final.json`、`patch-inventory-h079KS/report.json`：第三轮完整恢复及补丁只读审计。

本轮通过范围包括完整桌面、真实手机消息及原只读命令的实时编码/历史重入；七条总验收标准和完整新版交付继续保持未完成，日常支持声明不变。
