# 未修改官方 DSH 的纯插件审查

[默认提问与计划答复发送断线及确认丢失](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问与计划答复发送断线及确认丢失)四种真实手机情况通过：原答案未转发则保持原等待问题、用户明确新决定才结算；实际成功回执未交给手机则重连恢复唯一已完成结果，无自动重放。原历史/草稿/模型/PID保持，计划模式按实际结果恢复；共享测试转发口的原write路径另回归通过。仅新增测试，正常官方Host及已有App复用，三轮授权/测试服务清理完成、官方文件摘要保持。continued补答、计时答案、要求修改发送及其他审批类型在途仍待验。

[默认提问、计划与超时补答的同时竞争](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问计划与超时补答的同时竞争)三组六次通过：两条独立实际鉴权连接同时提交相反决定，原工具结果或原问题补答唯一，手机撤下旧卡片、完整历史/草稿/模型保持。默认问题和计划落败答复为空操作，超时补答落败请求收到已有答案排队的官方错误；结算后旧答案不追加记录。复用正常官方Host及已有App，仅增加测试；计时测试模式已正常移除，290官方包/6263文件摘要保持。continued/其他类型答复发送在途和其他审批类型仍待验。

[默认提问与计划的电脑退出恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问与计划中的电脑退出与恢复)已通过正常官方pnpm/生产中转/真实Android两轮：原waterfall失效、旧卡片撤下、旧答复被拒绝，未知结果与完整历史/草稿/模型保持。显式新提问/计划由手机单次回答/批准/要求修改，计划模式按结果关闭或保持；结算后再重启不重放。六次受控Host退出/正常重开期间手机进程保持，原App身份/前台保持；仅新增测试，没有产品构建或安装。其他工具/审批Host结束、在途及其他审批竞争仍待验。

[带超时提问中的电脑退出与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#带超时提问中的电脑退出与恢复)已通过正常官方pnpm/生产中转/真实Android：等待时结束电脑后同一手机进程重连，原问题continued且可补答，旧未知工具结果保持、补答用户消息唯一；完成后再重启不重复消息或工具。原草稿/模型及标准模式/默认值保持；仅新增验收代码，没有构建或安装DSH/SDK/插件/App。默认提问/计划恢复见上方专项，答复在途及其他计时策略仍待验。

- 状态：未修改官方 Web Host＋生产网关＋真实 Android 的核心、提问/命令/后台输出、文件预览/下载及普通局部插件安装/交互/卸载通过，菜单清理候选在官方重启后复验通过；其他扩展按[完整功能矩阵](./official-feature-matrix.md)核验，不声明全部兼容。
- 维护角色：DSHM 插件维护者；核验日期：2026-10-09。
- 版本：本页实际运行证据固定为 `0.2.1-alpha.1`；对应源码 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。2026-10-09 再次核对官方发布页，最新已为预发布 `0.2.1-alpha.2`（标签 `dsh-v0.2.1-alpha.2`、提交 `d743267`），npm 官方 registry 同版本可安装。新版另建官方安装环境核验，不把下方 alpha.1 证据当作 alpha.2 通过，也不覆盖原文件审计基线。
- 依据：[官方发布页](https://github.com/deepseek-ai/deepseek-harness/releases)、[当前交付边界](../../../docs/project-knowledge/knowledge/decisions/2026-10-09-official-dsh-plugin-only.md)、下方只读官方源码及 DSHM 实现。

最新 `alpha.2` 的独立正常安装、原文件基线与16组公开声明比较见[新版兼容复验](./official-alpha2.md)。当前候选0.1.79-latest.0按精确官方peer交付，真实核心及普通插件/通知复验已通过；启动不再挂接旧补丁服务或私有输出/待办观察器，见[交付审查](./official-delivery-audit.md)。下方alpha.1证据及旧代码依赖清点保留原版本含义，不解除版本限制冒充支持。

[带超时提问的App恢复与补答](../../../dsh-mobile/docs/integration/official-plugin-only.md#带超时提问的app恢复与补答)通过真实Android：同一等待问题正常重开后回答，或App结束期间超时后重开补答；工具结果与迟到用户消息分别唯一，完整历史/草稿保持。修复共享白名单缺少官方计时流和结构化补答的真实拒绝，旧Host不开放新接口，原Host继续校验问题归属；仅重建DSHM协议/插件，复用App，标准模式/默认目录与290官方包/6263文件保持。其他生命周期仍待验。

## 核心接口与实际验证状态

[默认legacy提问等待时App结束与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问等待时app结束与恢复)已通过实际Android：同一原问题恢复并手机答复，或另一真实连接已回答后手机撤下旧卡片；原草稿/历史前缀保持，消息/调用/结果唯一，旧相反答案为官方幂等空操作。复用同一官方Host/插件/网关/App，没有构建或修改本体；有限超时与补答已有上方独立专项证据，其他生命周期另验。

[计划审批等待时App结束与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#计划审批等待时app结束与恢复)四种真实情况通过：正常Launcher恢复原计划后手机批准/要求修改，或另一生产协议连接已批准/要求修改后恢复已结算记录并撤下旧卡片。原eventId/callId/detail、草稿与完整记录前缀保持，唯一结果/模式与真实完成独立核对；旧相反决定为顺序幂等空操作，不计同时竞争。仅新增测试代码，官方290包/6263文件摘要不变；计划Host恢复见上方专项，答复在途及其他系统回收策略另验。

[普通write答复未转发与实际确认丢失](../../../dsh-mobile/docs/integration/official-plugin-only.md#普通write审批答复断线与确认丢失)已通过真实Android：手机自动恢复原审批或单次结果，无旧批准重放；完整官方原事件、唯一结果和自己的文件独立核对。DSHM修复了载体重连后能力确认前订阅误使协商失效的问题，只构建变化的手机App，新包正常核心整轮也通过；官方Host和插件/网关复用，6263官方文件摘要保持。两次真实失败及收尾保留，其他审批类型/操作在途异常仍待验。

| 核心目标 | 官方接口依据 | 当前状态 |
| --- | --- | --- |
| 会话列表、已有工作区新建、同步消息/历史/结果 | [SessionController](../../artifacts/latest-source-check/packages/api/session-controller/src/index.ts)的公开 Remote 方法 `list/create/prompt/page/follow/control`；工作区服务见同一官方 `packages/api/workspace-controller` | 真实 Android 已读取工作区与历史，在同一工作区创建会话；手机消息、真实模型回复和实际 write 结果已与官方日志/磁盘交叉核对。 |
| 模型切换并同步电脑 | 同一官方 SessionController 的 `selectModel/modelCatalog` | 手机切换到 DeepSeek-V4-Pro，官方投影和随后真实回复的 source.model 一致。 |
| 审批、提问与计划 | [Gateway](../../artifacts/latest-source-check/packages/api/gateway/src/types.ts)公开 `invoke/stream/wireStream/registerRemoteEvents`；[官方说明](../../artifacts/latest-source-check/docs/api-gateway.zh.md)要求按生成描述符调用 | write单次允许/拒绝/改动、提问答案、计划正文及同意执行/要求修改通过。write等待时断线重投同一事件并手机批准、其他连接处理后手机卡片撤下、两个独立连接相反答复只结算一次与旧答复空操作通过。实际范围见[手机证据](../../../dsh-mobile/docs/integration/official-plugin-only.md)；其他类型竞争及答复发送在途断线待验。 |
| 连接、请求与客户端资源 | [Connection](../../artifacts/latest-source-check/packages/client/connection/src/rpc.ts)公开类型；[ClientModules](../../artifacts/latest-source-check/packages/client/modules/src/index.ts)公开 `graph/clientPath/fetch`；现有[中转适配器](../../src/remote-adapter.ts) | 真实生产鉴权/一次性配对/票据/WebSocket及客户端加载通过，手机只加载 DSHM 自有 origin、零 iframe、零页面异常；没有修改官方加载器。 |
| 断线重连与环境保持 | DSHM 中转、App 的既有恢复路径；原 App/绑定/历史受保护 | 中转停用/恢复后原聊天和未发送草稿保持，撤销授权后重连拒绝；实际任务运行中结束测试App后不推送，Launcher重开恢复连接/原结果、不重发，新的完成通知与点击通过。原凭据 App 的 APK/安装路径/PID 保持；[实际范围](../../../dsh-mobile/docs/integration/official-plugin-only.md#完成通知系统点击与app进程结束后的恢复)不包含Host结束或所有回收策略。 |

核心目标缺口必须列明官方需要提供的接口及语义，保持未完成；不能将核心目标从验收中删除后宣称完成。

## 旧补丁目标的依赖清点

此表覆盖[历史18目标](./patch-matrix.md)及新增预设归档。这里只判断旧实现依赖，不把未运行的替代方案写成已经实现。

| 旧目标 | 原依赖与纯插件处理 |
| --- | --- |
| 后台输出 | 新版已有官方 `readAt`，[JobControl](../../src/job-control.ts)的新版分支真实Android运行中双流、自然完成及关闭重开读取通过，无需旧 `readOutputBytes` 补丁；alpha.2普通pwsh停止/断线/大输出/App及Host结束另已验证，见[后台专项](./official-alpha2.md#后台任务停止大输出与断线读取2026-10-10)及后续各节；其他来源/编码仍待验。 |
| 文件元数据 | 官方 provider 可重新读取；取消 `file-version-watch` 对本体修正，原监听边界如实保留。 |
| 前台输出 | [CommandOutput](../../src/command-output.ts)依赖 `foregroundOutputVersion/tools/shell-output`；精确运行中字节观察取消，手机完成后的普通命令stdout/stderr结果已实际核验。 |
| 待办通知 | [PendingNotifications](../../src/pending-notifications.ts)要求额外 `pendingNotifications.observe`；纯官方缺此旁路时不发布待办通知能力。核心聊天内审批另验；[TaskNotifications](../../src/task-notifications.ts)使用原公开会话结算事件的完成通知、摘要、点击和进程恢复已通过。 |
| 客户端增量 | 不向 DSH 添加 `syncSelected`；[手机自身加载](../../../dsh-mobile/src/remote-runtime.jsx)使用 `entries.sync`，普通局部插件安装/启用、交互和升级/重启已有alpha.2真实证据，见[局部插件专项](./official-alpha2.md#普通插件与局部界面)；更广增量、状态和第三方异常仍待验。 |
| 安装取消与恢复 | 不修本体查询运行器、Windows安装权限或进程分类；官方公开管理能力另验，不能承诺旧补丁增强。 |
| 电脑应用 | 现有注入要求补丁 `dshmDesktopApps`，纯官方缺失时不提供该旧服务。 |
| 应用图标 | 随上述服务一起检查，不能依赖本体内部缓存补丁。 |
| 动态目录 | [CordisConnections](../../src/cordis-connections.ts)要求 `dshmClientManifestScopesVersion` 与 `dshmRemoteVersion`；旧连接作用域实现不计纯插件能力。 |
| 动态审批竞争 | 不向原动态插件运行器增加阶段保护；官方扩展点不足时列缺口。 |
| 客户端生命周期 | 不安装原 `CordisPanel` 生命周期补丁；DSHM 自己的连接与组件清理可以独立维护。 |
| 目录同步 | 不补写 DSH Host 清单事件；只使用官方公开清单/通知，未核对完整替代。 |
| PowerShell编码 | 不修改 DSH Shell/runner；同步展示官方结果，编码缺陷不能靠本体补丁修复。 |
| PTC取消 | 不修改 DSH 内部工具取消分类；核心停止请求只能通过官方接口验证。 |
| 自动审核取消 | 不修改 DSH 审核策略或核心错误分类；原错误与拒绝不得伪造成功。 |
| 模型发现 | 不增加本体探测接口；插件已有[发现适配](../../src/provider-model-discovery.ts)，使用[公开提供方适配](../../src/profile-providers.ts)，alpha.2已有合成提供方目录/配置/协议实际入口已验，见[提供方专项](./official-alpha2.md#自定义提供方已有地址目录与协议设置)；草稿地址强制探测取消，不能把目录或配置测试记为第三方真实推理。核心模型选择不依赖此扩展通过。 |
| 重启提示 | 不修改原插件管理页；插件/App 可以根据官方返回值显示提示，不能伪造安装成功。 |
| 源码启动 | 不交付 preload、源路径重定向或根启动命令改写；使用官方正常入口。 |
| 新增预设归档 | 初始化已经取消创建[补丁专属管理器](../../src/profile-preset-management.ts)；能力协商不再启用该服务，官方预设列表/选择仍保留候选。 |

## 本轮实际变更与检查

[插件初始化](../../src/index.ts)取消 `ProfilePresetManagement.create` 和对应注册，不捕获通信初始化错误或伪造服务。新增[真实初始化函数边界测试](../../tests/official-plugin-startup.test.ts)：管理层隔离用于验证启动路径，修正前 `remote_presets_unavailable` 失败，修正后缺少扩展服务仍注册主路由；真正通信初始化失败仍传播且不注册主路由。这不是实际鉴权、配对或官方 Host 加载证据。

- 相关3文件52项 Vitest 通过；完整旧版插件回归42文件220项通过，部分历史测试使用隔离补丁夹具，因此不计纯官方兼容证据。
- `node node_modules/typescript/bin/tsc -p tsconfig.check.json --noEmit` 退出0。
- 仅构建新的独立插件候选 `artifacts/latest-runtime-check/candidate-package-check-OfficialOnly01/package`，版本 `0.1.76-latest.0`；未替换旧持续联调候选或日常安装。
- 新纯官方环境位于 `artifacts/official-dsh-plugin-only`，固定 npm 官方 DSH 版本，正常安装依赖并禁用安装脚本；不应用补丁、不构建 DSH，不复用此前修改版依赖目录。插件经官方 `plugin --profile web add` 安装，正常 `pnpm dsh web --no-open --host 127.0.0.1 --port 16955` 实际加载成功。

## 纯官方实际运行证据

[普通write审批中的电脑端结束与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#普通write审批中的电脑端结束与恢复)通过正常官方pnpm、生产网关和真实Android：等待时进程树实际退出，原会话由官方结算interrupted/TOOL_OUTCOME_UNKNOWN，原记录保持，旧批准拒绝，手机自行重连并显示中断；显式新请求才重新批准并单次写入。完成后再次结束Host不重放消息或工具。新App另通过真实允许/拒绝核心回归，原App/Key/绑定/历史保持；只构建发生修改的DSHM页面和独立APK，290官方包/6263文件仍沿原基线核对。其他工具/提问/计划的Host结束及答复在途异常仍待验；上表完成通知专项的限制不涵盖这一单独write专项。

[外部测试进程](../../scripts/run-official-dsh-web.mjs)只执行正常 pnpm 脚本并把登录输出存于私有日志，不注入 DSH、不改启动入口。pnpm 自动安装导致 npm/pnpm 布局变化，隔离测试配置明确禁用安装脚本；两次 `ERR_PNPM_IGNORED_BUILDS` 失败及私有日志保留，修正测试配置后正常启动。不是 DSH/SDK 构建。

[原文件审计](../../scripts/audit-official-dsh-files.mjs)保留首次 npm 安装的6292文件基线。`verify-pnpm` 按包内相对路径核对290个官方包/6263文件全部 SHA-256 一致；29份 npm 嵌套第三方依赖不属于官方包文件，pnpm 自动生成的链接/shim 同样不纳入比较。没有重建基线掩盖变化。

| 真实检查 | 证据与范围 |
| --- | --- |
| write审批等待时App结束 | [实际Android报告](../../../backend/artifacts/official-plugin-only/official-android-4ad55a60-90a4-48a3-918a-b47c3fd6cc4a.json)65.882秒、十阶段；电脑公开session/prompt发起，手机先留草稿，独立UID实际force-stop/正常Launcher重新进入自有Remote。仍等待的同eventId/callId恢复后手机批准，App关闭期间另一真实连接拒绝后旧卡片清理；原55/79条事件前缀、唯一用户消息/升级write结果、真实模型completed及原草稿/文件核对。原App5147路径/SHA保持，无产品修改/构建；[完整证据、三份驱动失败与剩余范围](../../../dsh-mobile/docs/integration/official-plugin-only.md#审批等待时app结束与原会话恢复)。 |
| 系统目标写入中取消/断线/撤权 | [取消/断线/重试报告](../../../backend/artifacts/official-plugin-only/official-android-926ab524-21ba-4b1d-be22-1e737ea334af.json)159.762秒、十一手机阶段；默认系统Downloads分别写入5767168、8912896字节后实际原按钮取消与生产Host断线，半成品/私有暂存/保存记录清理，重连不自动重存，手动重试完整64 MiB原件SHA一致。[撤权报告](../../../backend/artifacts/official-plugin-only/official-android-e8130c12-cce6-4554-9d14-c90d53a76a92.json)69.131秒、九阶段；目标写入6225920字节后实际桌面撤权，失效页/三类清理/重连拒绝通过。两轮复用Host/APK，无产品修改/构建，原App5147路径/SHA保持；[证据与其他provider/失败清理/回执竞争范围](../../../dsh-mobile/docs/integration/official-plugin-only.md#系统目标写入时取消断线与撤权)。 |
| 系统目标写入时App结束 | [写入进程报告](../../../backend/artifacts/official-plugin-only/official-android-501328bc-9f38-4081-a8a4-c7ada5bbdb35.json)134.687秒、十二手机阶段；真实系统下载目标已写入6815744/67108864字节后冻结并结束自己的UID，普通/Remote未确认提示、确认前后重开、外部半成品保持、原会话/草稿与完整64 MiB原件手动重试通过。复用同Host/APK，无产品修改/构建；[完整证据与范围](../../../dsh-mobile/docs/integration/official-plugin-only.md#系统目标写入时app结束与恢复)区分SIGSTOP/force-stop与其他回收策略，进程存活时的写入中断另见上行。 |
| 手机上传与历史附件 | [附件报告](../../../backend/artifacts/official-plugin-only/official-android-93c1cb23-fd04-45d8-974d-7456facfd3de.json)99.045秒、十六手机阶段；文本/PDF/DOCX真实系统选择和上传、同一官方消息三个引用、模型读取文本独有标记、独立附件原件流及错误会话拒绝、历史5002行/真实PDF与Office画布、三份原件系统保存摘要一致。复用同APK/Host，无产品修改或构建。[首次枚举失败与模拟器重启恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#手机上传与历史附件预览下载)保留；最终原App PID5147/路径/摘要保持，其他格式/生命周期另验。 |
| 系统保存窗口与修复后核心回归 | [系统窗口报告](../../../backend/artifacts/official-plugin-only/official-android-1308b202-23aa-41d6-8edc-5e43477b2618.json)71.610秒、十一手机阶段；完整262149字节暂存后的系统取消/断线关闭、清理、重连不自动重试与显式保存原件摘要一致。[同APK核心回归](../../../backend/artifacts/official-plugin-only/official-android-2f2adff1-9ed0-419e-b323-84a7aa1364a2.json)42.627秒、十阶段真实回复/选模/批准/拒绝/重连/新建/撤销通过。只修改/构建DSHM；[原失败与生命周期修复](../../../dsh-mobile/docs/integration/official-plugin-only.md#系统保存窗口取消断线与显式重试)保留，目标写入阶段另验。 |
| 下载中断与最新原件重试 | [文件恢复报告](../../../backend/artifacts/official-plugin-only/official-android-5075ae19-2434-4f22-9e11-bf373e1731ea.json)，72.830秒、十二手机阶段；真实16 MiB暂存取消/断线/原件尺寸变化后清理，不自动重试，手动保存最新16777274字节及摘要正确，草稿与清理通过。附件、保存过程中断及分享接收端另验；[驱动内存失败与单独恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#文件下载中断与最新完整原件重试)保留。 |
| 正常 pnpm＋无 Key 的基础 Android | [基础报告](../../../backend/artifacts/official-plugin-only/official-android-2b073381-c898-4ad2-b7db-091b6b1c46c2.json)，13.383秒；真实鉴权、会话/模型/消息日志、新建、重连及撤销通过，明确 `coreInferenceVerified=false`。 |
| 正常 pnpm＋用户在隔离官方页配置 Key 后的真实模型/审批 | [核心报告](../../../backend/artifacts/official-plugin-only/official-android-6f959259-9902-4a13-9ac8-a427a7a21db8.json)，38.041秒；[实际 Android](../../../dsh-mobile/artifacts/official-plugin-only/6f959259-9902-4a13-9ac8-a427a7a21db8/android.json)九阶段通过，`coreInferenceVerified=true`。 |
| 官方 Host 重启＋清理菜单的新 DSHM App | [新候选报告](../../../backend/artifacts/official-plugin-only/official-android-3e40a4c6-4b6e-4b54-916e-8cd0c0f17f8b.json)，40.791秒；新 `.officialtest` 十阶段核心/菜单检查全部通过、零页面异常、清理完成。仅构建 DSHM Web/Android，DSH 包原字节保持。 |
| 手机回答与完成命令结果 | [扩展报告](../../../backend/artifacts/official-plugin-only/official-android-b01b7816-c618-4308-a8f0-57e1c6aa3416.json)，28.429秒；实际模型提问/绿色答案、只读命令两种输出及官方结果一致。 |
| 普通后台独立输出 | [后台报告](../../../backend/artifacts/official-plugin-only/official-android-86ffb478-eba7-4627-8e4e-7efbc2ce11eb.json)，67.057秒；运行中stdout/stderr隔离、自然完成、关闭重开读取、手机原始缓冲与另一中转读者一致。 |
| 工作区文件与手机交付 | [文件报告](../../../backend/artifacts/official-plugin-only/official-android-66be0498-ba05-4237-9fd4-ebfce0ecb9d4.json)，49.940秒；按需目录/嵌套/空目录、5002行Unicode分页、三块168961字节读取和实际系统保存大小/摘要一致。Markdown/图片/隔离HTML/PDF通过，分享仅验证系统面板打开，Office/附件和其他生命周期待验。 |
| 普通插件管理与局部界面 | [插件报告](../../../backend/artifacts/official-plugin-only/official-android-e74d4b81-7644-4114-a141-dd2b5c0ed0a5.json)，55.411秒；真实手机安装/立即启用/卸载、原720px面板缩放到388px、按钮/原弹窗/菜单/状态保留，管理权限收回后聊天及草稿保持。卸载目录结算6.492秒；升级/在途异常仍待验。 |
| Office六格式 | [Office报告](../../../backend/artifacts/official-plugin-only/official-android-caa60258-93d6-4eef-bb53-9140c2de27eb.json)，50.628秒；六份真实原件显示实际PDF/中文正文，关闭重开逐字一致，原件大小/摘要核对。复用正常官方转换器，不注入观察器；缓存和转换生命周期不计通过。 |
| 已有工作区注册管理 | [工作区报告](../../../backend/artifacts/official-plugin-only/official-android-21b14a45-bff4-41d2-a80e-0ca54f8fdc57.json)，24.748秒；手机改名、两处排序、确认后移除注册，原文件/原事件和手机会话读取保留，其他工作区身份/标题/路径/相对顺序不变，授权收回及清理通过。 |
| 电脑设置与恢复 | [设置报告](../../../backend/artifacts/official-plugin-only/official-android-a6eae56c-2e1b-4180-b23e-de54ab8e862b.json)，25.916秒；手机读取五项公开值、超时临时增加1秒后保存，恢复原值及默认继承，独立官方脱敏投影与收尾核对一致，授权收回/草稿保持通过。不操作Key或地址，其他字段/提供方另验。 |
| 手机队列、引导、停止与重连 | [队列报告](../../../backend/artifacts/official-plugin-only/official-android-b9487d5d-1467-4bb5-a10f-d50f49ccc07a.json)，74.959秒；编辑保留消息身份，取消项不消费，引导进入当前轮次、编辑消息进入下一轮并实际回复。手机停止前台工具后官方记录 aborted/user 与闲置状态，待发送在重连后身份/内容/草稿保持，仍可取消。多端竞争/写入在途/嵌套工具停止另验。 |
| 搜索、普通分支与归档恢复 | [导航报告](../../../backend/artifacts/official-plugin-only/official-android-20c89d7a-dec1-4643-a76b-c9ae2bede770.json)，21.832秒；手机改名/恢复、标题与内容片段、最新完成轮分支、归档/恢复通过，官方父身份/cwd/继承消息一致、原聊天与草稿保持。内容搜索须电脑开启，官方默认关闭时手机正确提示仅标题；临时内存索引覆盖[精确恢复](../../artifacts/official-dsh-plugin-only/search-profile-restored.json)，三个驱动失败及一次配置校验失败保留，未改本体。 |
| 原环境保护与清理 | 上述早期核心报告 cleanupCompleted/testDevicesRevoked/gatewayClosed 为 true；当时原 App PID23468、APK `58921967…11114b` 和安装路径前后一致。两次测试文件恢复，隔离会话权限恢复，独立 App 停止及16956映射移除。附件轮之前模拟器系统重启，按正常Launcher恢复为PID5147；APK身份保持，失败和单独恢复报告见附件专项。 |

真实验收实现为[后端 opt-in 测试](../../../backend/tests/official-host.test.ts)、[独立 Android 驱动](../../../dsh-mobile/tests/support/official-remote-android.mjs)及[真实写入审批核对](../../../dsh-mobile/tests/support/official-write-approvals.mjs)。工具结果以当前官方 `ToolResultMessage.toolCallId/isError` 验证，不采用旧夹具的嵌套消息格式。前几轮路径核对、模型抄错文件名、WebView受其他App前台影响和结果格式核对失败均保留，没有据此伪报通过；每轮撤销/停止/关网关完成。失败轮的隔离文件现场可能保留，不能称全部失败文件已恢复。

早期基础报告的 `officialHostPid` 在 pnpm 分支实际记录启动进程PID，未代表最内层CLI进程。后续报告改为 `officialLaunchPid` 并记录 `entry`；受控重启另核对实际16955监听Host3696的命令路径，不能用启动器PID代替实际服务身份。

已观测纯官方能力：`presetProfileManagement/desktopApps/desktopAppIcons/taskPendingNotifications/providerModelProbe=false`，`commandOutputGeneration` 未提供，动态运行器所需扩展接口未提供。手机菜单按协商能力隐藏桌面应用选择和汇总待处理入口；普通聊天内审批/提问可用，前台精确实时输出仍按原能力门控。普通后台、文件五类预览/系统保存和普通局部插件管理已有真实证据；通知、Office/附件、其他管理及生命周期仍需分别复验，不能由协商 true 推导全部通过。[R01–R16及协商字段矩阵](./official-feature-matrix.md)列明保留、取消、待验和上游契约需求。新手机候选与扩展的实际证据见[手机纯官方验收](../../../dsh-mobile/docs/integration/official-plugin-only.md)。

历史源码租约、SDK产物与失败仍保留；本轮未修改 DSH 源码、编译资源、日常安装或原 App/Key/绑定/会话。
