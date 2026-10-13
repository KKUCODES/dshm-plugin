# 官方 0.2.1-alpha.2 的兼容复验

- 状态：官方发布包、独立插件加载与真实 Android 核心链路已通过；扩展能力继续分别复验，不发布全兼容声明。
- 维护角色：DSHM 插件维护者；最近核验：2026-10-10。
- 来源：[官方发布页](https://github.com/deepseek-ai/deepseek-harness/releases)、[独立安装清单](../../artifacts/official-dsh-alpha2/package.json)、[声明差异报告](../../artifacts/official-dsh-alpha2/public-contract-comparison.json)、[只读审查脚本](../../scripts/inspect-official-alpha2.mjs)。

## 版本与环境

官方最新条目为预发布 `0.2.1-alpha.2`，标签 `dsh-v0.2.1-alpha.2`，提交 `d743267`。npm 官方 registry 的 `@deepseek-ai/dsh@0.2.1-alpha.2` 完整性值为 `sha512-CkRE0uAOg2ldL2VpfF4cNRsl178CH5nM+8YklPrlMZl5ln0KhVfd42dJuRlgOXZmkpizCRvrVS8LAL+GKfgk0w==`；官方域名和现有镜像查询的值一致，实际安装使用官方 registry。

在插件自己的 `artifacts/official-dsh-alpha2` 正常执行 `pnpm install --ignore-scripts --registry=https://registry.npmjs.org`，固定版本、独立依赖目录，80.5秒退出0。禁用安装脚本，没有构建 DSH/SDK，也没有复用历史改造版包。pnpm 自动增加的新包发布时间例外保留于生成配置，不隐藏安装行为；现有 npm 用户配置警告、一个依赖弃用提示和部分下载慢警告保留，不当作运行时失败。

同一安装目录实际执行官方 `node node_modules/@deepseek-ai/dsh/lib/bin.js --version`，退出0并返回 `0.2.1-alpha.2`；这只证明 CLI 能读取其运行版本，不是 Web Host、插件加载或 Android 通过证据。

[新原文件基线](../../artifacts/official-dsh-alpha2/official-core-baseline.json)独立记录299个官方包、6386文件，仅首次正常安装后用 `wx` 创建，后续只能验证，不能重建掩盖修改。原 `alpha.1` 的290包/6263文件审计基线、安装目录、运行报告和16955服务均保留。新版本通过正常官方插件安装器安装候选，并以正常 `pnpm dsh web` 在独立 home、16958启动；没有修改官方文件或构建 DSH/SDK。

## 已发现的接入限制

插件候选现在可分别选择配套 `alpha.1` 或 `alpha.2` SDK与精确peer；[版本策略](../../src/profile-dsh-version.ts)只允许这两个已审阅的新版，不接受任意未来版本。手机[通信层](../../../dsh-mobile/src/remote-transport.mjs)仍要求电脑版本与构建时 SDK 完全一致，[构建入口](../../../dsh-mobile/scripts/build-web.mjs)嵌入这一版本。

仅修改版本声明或解除手机版本检查不能证明兼容。独立 npm SDK、只读官方源码与手机渲染适配分别核验；只构建变化的 DSHM 插件/App。源码检出固定 `d743267388641bc76f17c45ce8b4c231aed1d32c`，派生产物写入手机自有 artifacts，不写回官方源码。

## 真实 Android 核心复验

[生产中转报告](../../../backend/artifacts/official-plugin-only/official-android-7e20012a-4519-464c-bb8b-ec9f6a9ba395.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/7e20012a-4519-464c-bb8b-ec9f6a9ba395/android.json)固定验证 `0.2.1-alpha.2`，36.313秒通过十个手机阶段：原生单次配对与批准、真实已有工作区/历史、菜单能力隐藏、手机选模同步、唯一消息及真实模型回复、write允许一次/拒绝、断线恢复聊天与草稿、已有工作区新建会话、撤销后拒绝重连。官方工具结果与实际文件核对一致，拒绝后不写入、不重试。`passed/coreInferenceVerified/cleanupCompleted=true`，零页面异常与被Slots隔离的渲染异常。

正常凭据提供方通过官方公开 `path` 配置读取用户此前保存的凭据文件，未读取或复制 Key内容；新home/profile/历史保持独立。实际测试UID为 `.officialtest`，当前候选13,356,973字节、SHA-256 `bebdf1d85b9d27f9740b76841b54d55e0893e8404d6069ef882d3faef349d79e`。原 `.latesttest` 的安装路径、APK摘要和PID4249前后一致；测试设备已撤销，独立UID停止、16956映射及网关清理。

真实失败保留，不用后续成功改写：`8f02c9ec`的页面白屏来自手机传给新主题组件的旧字段；`498faff6`与[诊断轮](../../../dsh-mobile/artifacts/official-plugin-only/0e593f41-f9f5-4554-8ec2-6f0d657f0c6d/android.json)的聊天文字缺失来自新ChatNodeSeat缺少底部订阅及groupAction。只修DSHM主题默认值/手机组合，原节点与公开源继续使用官方实现。`34f0e639`已通过真实回复，旧测试错误要求运行中相对路径能直接打开；新版官方有意等执行结果确认目标，改为核对原调用目标、实际预览内容和允许/拒绝后文件，而不恢复旧导航策略。

[启动探针](../../../dsh-mobile/scripts/check-official-mobile-startup.mjs)在375×667分别检查普通聊天与Remote入口，无伪造原生桥/配对；浏览器只能证明页面启动，真实功能以上述Android为准。当前479项手机Node回归、自己的Web构建、增量Android构建与lint通过。SDK解析按独立目录真实路径及精确版本核对，防止Node向父目录误借旧包；相关三项回归通过。

## 提问与命令详情复验

[新版专项](../../../backend/artifacts/official-plugin-only/official-android-7568d6bc-f9e1-45aa-a2c7-7b9aab6d7f1c.json)与[实际Android](../../../dsh-mobile/artifacts/official-plugin-only/7568d6bc-f9e1-45aa-a2c7-7b9aab6d7f1c/android.json)28.877秒通过：手机选择绿色提交，官方提问唯一结果及真实回复一致；只读pwsh的标准/错误/完成标记在命令输出正文显示，另与官方结果核对，不把完整命令里的同名标记冒充输出。十个手机阶段、零页面/隔离渲染异常、授权及网关/UID清理完成。

[原失败](../../../dsh-mobile/artifacts/official-plugin-only/723d6890-1d05-41bc-9c14-6131b4bbcb2e/android.json)已完成提问，但命令详情的新版TerminalBlock要求 `labels.commandLine`，自有窗口遗漏后导致root条目被隔离。只在[手机命令窗口](../../../dsh-mobile/src/ui/RemoteCommand.jsx)补齐标签及英文翻译；未修改官方组件。修复候选13,357,065字节、SHA-256 `16ee48c169c282f5b602a38cd1ff4de30c59fad3bb5bb5d335d7f92d8fb641b7`，增量构建/lint14秒通过，安装守卫再次核对原App身份保持。后台输出与电脑重启的专项结果见下文；精确前台实时输出仍不交付。

## 后台任务与电脑重启

后台Job的[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-3e88bb3b-58f9-42ff-bced-603fc6dc930a.json)66.638秒通过：45秒只读后台任务运行中标准/错误输出分开显示，自然完成后关闭重开重新读取；完成后的实际接收缓冲与独立真实中转读者一致，另核对界面输出。运行中两次读取时刻不同，不宣称逐字节一致。`backgroundVerified/passed/cleanupCompleted=true`、十阶段、零页面/隔离渲染异常。只复用现有官方Host与候选APK，没有新产品构建；手机主动停止及其他Job边界另验。

电脑重启的[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-3e1be7c6-ce40-4256-ad1f-8a82258e8a17.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/3e1be7c6-ce40-4256-ad1f-8a82258e8a17/android.json)55.977秒通过：只结束所属独立16958官方Host，再以正常 `pnpm dsh web` 重启；等待write审批时恢复为官方 `TOOL_OUTCOME_UNKNOWN` 和已中断，旧审批返回 `remote_event_owner_denied`，日志与文件保持不变。明确提交一轮新的请求后，手机审批新callId、实际文件与唯一官方结果一致；已完成状态下再次重启，原84条记录前缀保持，仅追加官方会话结束记录，不重复消息或工具。手机进程、草稿、模型和历史在两次Host重启间保持。

`hostRestartVerified/passed/cleanupCompleted=true`、十一阶段、零页面/隔离渲染异常。测试文件及只读审批设置恢复，测试设备撤销、独立App及中转清理，原App路径/摘要/PID4249未变。当前16958由测试第二次正常重启的官方Host继续运行；启动回执记录launcher PID39296，后续操作必须重新核对所属进程，不能复用已结束的PID24300或11444。

## 排队与停止

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-89ba278c-6b65-4441-8cfc-6988638d79d0.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/89ba278c-6b65-4441-8cfc-6988638d79d0/android.json)71.824秒通过十一阶段：手机排队、同身份编辑、移除及立即引导，实际官方inbox逐项一致；引导进入当前轮，编辑消息进入下一轮，取消消息没有消费。手机停止60秒只读前台工具后，官方同callId结果seq82、`aborted/user`结束seq84及闲置状态确认；待发送项保留，中转重连后身份/正文/草稿相同，手机仍可取消。运行中模型切换正确禁用。

`queueVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常。现有Host/APK复用，没有产品构建，原App身份保持；自己的待发项、会话、授权、UID/中转均按测试收尾。该结果证明停止当前会话，不推导后台独立Job停止或所有工具进程退出。

## 会话导航与搜索

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-8df39da6-4e08-4ddd-bbe5-e0486e35e111.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/8df39da6-4e08-4ddd-bbe5-e0486e35e111/android.json)19.949秒通过十阶段：手机改名/恢复、标题搜索、真实内容片段搜索、最新完成轮分支、归档/恢复；独立读取官方父身份/cwd/继承消息逐项核对，各自草稿保持，分支收尾归档。`navigationVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常，原App身份保持，没有产品构建。

内容搜索需电脑开启；仅在独立16958测试profile的正常 `cordis.patch.yml` 临时配置官方 `session-query-sqlite` 的 `path: ':memory:' / openAt: first-search`，正常CLI重启后验收。随后删除该临时行，原配置字节及SHA-256 `070a8874275f5ef5eec3e9ab9686bfedcf97cc58b956e46c453b1db8098cdf2c`完全恢复，正常重启后公开search RPC再次返回搜索关闭；[恢复报告](../../artifacts/official-dsh-alpha2/search-profile-alpha2-restored.json)固定版本、正常入口、launcher23188/16958。没有改官方包、读取Key或承诺默认关闭内容搜索的电脑具备全文搜索。

## 文件预览与完整下载

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-63a44338-e1aa-43bf-bf44-c55c24cf1adc.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/63a44338-e1aa-43bf-bf44-c55c24cf1adc/android.json)49.939秒通过十三阶段：实际工作区按需展开/空目录/嵌套、5002行Unicode分页、168961字节分三块完整读取；独立真实中转读者与Android系统保存的原件大小/SHA-256一致。Markdown、图片、隔离HTML（不暴露原生桥）、实际PDF画布均可查看，草稿保持。系统分享只证明面板打开，没有选择接收者或声称送达。

`filesVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常；自己的原件/导出/授权/UID/网关清理，原App身份保持。只复用现有Host/APK，不推导文件在途异常、全部附件或Office格式通过。

## 普通插件与局部界面

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-ffeed94a-97ad-4cef-b9d0-0589960788ff.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/ffeed94a-97ad-4cef-b9d0-0589960788ff/android.json)48.782秒通过：无管理授权时隐藏安装入口，授权重连后手机安装普通测试插件0.0.5、立即启用，720px局部面板等比例缩放至388px；DSHM自有页面内零iframe，计数按钮、原弹窗/菜单及跨面板返回状态保持。手机卸载后另等待官方目录结算6.053秒确认不存在，管理授权收回后聊天/草稿保持。

`pluginsVerified/passed/cleanupCompleted=true`、十三阶段、零页面/隔离渲染异常，原App身份保持。普通插件包与测试权限全部清理，只复用现有Host/APK；该测试不证明任意插件、升级或安装在途取消兼容，也不恢复旧动态运行器补丁接口。

## Office六格式预览

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-1dba214a-4deb-4ed8-add7-2acf5e17adc6.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/1dba214a-4deb-4ed8-add7-2acf5e17adc6/android.json)43.894秒通过十四阶段：doc/docx、xls/xlsx、ppt/pptx经正常官方转换器显示实际PDF画布和中文正文，关闭重开逐字相同；另一真实中转读者核对六份原件大小/摘要，ppt原件606720字节分十块完整读取。各格式 `cacheReuseVerified=false`，重开相同不冒充缓存命中。

`officeVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常，草稿及原App身份保持；自己的六份原件/权限/UID/网关清理，现有Host/APK复用。不推导所有历史附件格式或转换生命周期异常通过。

## 已有工作区管理

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-28229b5a-685c-4664-a7cf-04c18ed31694.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/28229b5a-685c-4664-a7cf-04c18ed31694/android.json)24.940秒通过十二阶段：手机对专用已登记工作区改名、排序到另一专用工作区前和最后、明确确认后移除注册；官方投影一致，其他工作区身份/路径/相对顺序保持。移除只取消注册，磁盘原件和原聊天事件逐项未变，手机仍能打开原会话。

`workspaceManagementVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常；管理权限收回后聊天/草稿保留，专用注册及授权/UID/网关清理，原App身份保持，没有产品构建。不提供手机创建工作区，也不推导并发或在途异常通过。

## 电脑公开设置

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-c0933adb-927d-4be6-9791-82c29b83417b.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/c0933adb-927d-4be6-9791-82c29b83417b/android.json)23.240秒通过十一阶段：无管理授权时没有设置输入；授权后读取五个指定公开字段，只将等待输出超时300000暂改301000毫秒，经官方脱敏describe逐项核对，再从手机恢复默认300000及 `overridden=false`，其他四项不变。收尾再次核对 `testSettingsRestored=true`。

`settingsVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常；管理收回后聊天/草稿保留，原App身份保持，没有产品构建。不读写Key、地址或提供方，不扩大为所有字段/namespace写入或敏感设置验证。

## 计划审批

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-26bfce61-7fbd-46da-aef1-3602130a99bb.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/26bfce61-7fbd-46da-aef1-3602130a99bb/android.json)26.943秒通过十阶段：真实模型调用 `exit_plan_mode`，手机实际查看两份计划正文；同意执行后原callId的唯一工具结果与真实回复匹配，官方 `plan.active=false`。要求修改后原callId唯一结果及真实回复匹配，`plan.active=true/pending=false`；随后通过正常手机入口退出，收尾再次恢复。

`planReviewVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常，原App身份及草稿保持，自己的计划/权限/授权/UID/网关清理，现有Host/APK复用。测试计划批准后仅回复标记，不执行文件任务，不推导计划实际执行或答复在途边界通过。

## 手机上传与历史附件

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-663dd170-9dcc-43d6-aa8c-e5c23a56a2ad.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/663dd170-9dcc-43d6-aa8c-e5c23a56a2ad/android.json)97.812秒通过十六阶段：真实Android系统选择并上传文本178990字节/5002行、PDF990字节、DOCX911字节；同一官方用户消息保留三份引用，模型读取文本独有标记，提示词及电脑工作区未提供该标记。另一实际生产中转连接核对完整附件字节/摘要及归属，错误会话读取被拒绝。

DSHM自有历史窗口显示完整Unicode文本、实际PDF画布及官方转换后的DOCX中文正文；三份原件经真正Android系统保存窗口导出，大小/SHA与上传原件一致，草稿保留。`attachmentsVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常。自己的输入/导出/后端原件及授权/UID/网关清理，官方测试消息/附件存储保留为证据，原App身份保持，没有产品构建。不推导其他附件格式、分享送达或传输生命周期异常通过。

## 通知与App进程恢复

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-6e1a7875-da60-4d8a-8d4d-a9604b0b6c88.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/6e1a7875-da60-4d8a-8d4d-a9604b0b6c88/android.json)121.143秒通过十三阶段：正在看的会话完成时不重复提醒；手机后台收到一条实际标题/回复摘要通知，系统点击回到原会话。任务运行中结束测试App，电脑自然完成时手机进程不存在且没有推送。正常Launcher重开在普通首页已恢复原生通知连接，不补发旧通知，进入Remote后原消息/结果/草稿保持；中转重连不重复，后续新任务完成仍通知并可点击。

`notificationsVerified/passed/cleanupCompleted=true`、零页面/隔离渲染异常。测试App正常重开的新进程与原会话恢复并独立核对；原受保护App PID4249未变。只读任务及测试授权/UID/网关清理，没有产品构建。force-stop只证明受控进程结束场景，不推导所有厂商后台回收或更多通知类型。

[原失败](../../../backend/artifacts/official-plugin-only/official-android-d36a3ce1-3ec6-404d-ac0f-e9da2f9ed2fd.json)78.547秒保留且正常清理：模型省略可选 `run_in_background=false`，旧测试硬要求显式键。只读核对官方pwsh公开源码仅true进入后台后，测试仅允许false/undefined，仍核对准确命令/120000超时/只读权限/尚未结算；未修改产品或官方行为。共享队列判断同样按该公开语义核对，不接受其他类型。

## 审批答复在途断线

[新版真实报告](../../../backend/artifacts/official-plugin-only/official-android-76a9ff1d-3924-4e2d-9810-ffbab80c800a.json)与[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/76a9ff1d-3924-4e2d-9810-ffbab80c800a/android.json)45.103秒通过十阶段：真实手机write答复尚未交给电脑时，外部测试转发口关闭连接，重连恢复原审批/历史/草稿且文件未写；明确新决定才结算。电脑已单次处理write、原成功回执未交给手机时断线，重连显示原唯一工具结果/真实回复，旧卡片消失，不重发批准。官方完整记录及真实文件逐项核对，不以回执成功冒充执行或结果唯一。

`approvalSendingVerified/passed/cleanupCompleted/externalProxyClosed=true`、零页面/隔离渲染异常，原App身份保持。两个场景均沿实际生产通信路径，外部转发口只用于验收断线，不修改网关/Host函数、客户端响应或认证。测试权限/文件/授权/UID/双端口转发服务清理，没有产品构建；不推导其他审批类型全部在途语义通过。

## 真实子会话创建与手机续聊

[真实报告](../../../backend/artifacts/official-plugin-only/official-android-dedb72e1-f293-409b-83bf-e93888fff076.json)与[实际手机证据](../../../dsh-mobile/artifacts/official-plugin-only/dedb72e1-f293-409b-83bf-e93888fff076/subagents.json)33.439秒通过十阶段：手机发送任务，真实父模型只调用一次官方subagent创建可继续子会话；手机从子会话列表打开自有聊天页面，直接续聊后官方记录包含唯一用户消息、真实模型回复及completed结算，没有额外工具调用。子历史37条记录、原前缀、父子草稿及断线重连均核对保持，零iframe、页面或隔离渲染异常。

官方运行器会把子任务结算自动投递给父会话，即使续聊要求模型不调用send_message。父历史原前缀保持，新增唯一的subagent-settled通知来自同一childSessionId；这属于正常结果同步，不应要求父历史完全不变。手机经真实中转以unknown地址读取同一37条原记录，错误one-shot模式返回subagent/unauthorized，读取不改变记录。

[第一轮失败](../../../backend/artifacts/official-plugin-only/official-android-020271c3-1030-4ffb-ab5f-ce78794c8f05.json)是验收错误禁止父会话新增官方结算通知；[第二轮失败](../../../backend/artifacts/official-plugin-only/official-android-8e5e2f91-0293-48af-82c8-e5f6e64a8915.json)是Playwright跨进程序列化RemoteError时不保留自定义code。仅修正[手机验收脚本](../../../dsh-mobile/tests/support/official-subagents.mjs)及[后端真实入口](../../../backend/tests/official-host.test.ts)，没有改产品组件、DSH或重新构建安装。新版公开工具参数不再包含run_in_background，测试遵守实际官方schema。

`subagentsVerified/passed/cleanupCompleted=true`，测试子任务已请求停止，设备撤销、独立UID/网关/映射清理，原App身份保持。该报告只证明一层原生可继续子会话的创建、续聊、结果、草稿及连接恢复；进行中的只读pwsh轮停止与随后续聊[另验通过](#可继续子会话的手机停止与再次续聊2026-10-10)。嵌套/一次性子任务、父Agent释放及冷Host恢复、服务停用和其他提供方仍待分别核验。

## 手机目标控制与真实自动续轮

[真实报告](../../../backend/artifacts/official-plugin-only/official-android-7ff9bf21-2ba0-4c57-8ae4-a8dce9d699a3.json)与[手机目标证据](../../../dsh-mobile/artifacts/official-plugin-only/7ff9bf21-2ba0-4c57-8ae4-a8dce9d699a3/goals.json)25.303秒通过11阶段：手机创建并暂停目标，电脑修改后手机同步；旧revision的编辑由官方拒绝，原历史不变。手机修改、恢复后，官方运行器实际发起第二轮目标消息，模型给出真实回复并正常结算，达到两轮上限后解除自动激活，手机恢复按钮禁用。手机完成、取消清除及确认清除分别核对；断线重连保留草稿和完整历史，不重放目标轮次。

独立读取官方`goals/get`、持久goal投影及原消息source，核对同一目标身份/版本/round=2；没有工具调用或文件修改。仅测试专用会话且使用正常read-only权限。测试目标/授权/UID/网关清理完成，原App身份保持，零页面/隔离渲染异常。失败的`f8e0f8c5`、`fe7931c7`、`13c5fa5a`分别来自验收权限准备、命令回执形状及旧目标错误码假设；实际旧版本编辑的官方wire返回`gateway/internal`，不伪造`GOAL_STALE_REVISION`。失败报告保留且清理无异常，仅修正自有[目标核对](../../../backend/tests/support/official-goals.ts)与[手机操作](../../../dsh-mobile/tests/support/official-goals.mjs)。复用原Host/App，没有产品构建；不推导无限目标、Host重启或其他竞争均已通过。

## 真实工作流与成员会话导航

[真实报告](../../../backend/artifacts/official-plugin-only/official-android-d16845f3-420d-45c8-878b-9ecf7ab60c97.json)与[手机证据](../../../dsh-mobile/artifacts/official-plugin-only/d16845f3-420d-45c8-878b-9ecf7ab60c97/workflows.json)40.490秒通过十阶段：手机发送明确任务，真实模型只调用一次workflow，按原脚本并行启动两名成员。原run-start、agent-start/end、run-end、唯一tool/result和真实最终回复与手机卡片逐项匹配；手机从运行中的卡片打开成员，返回父聊天保留独立草稿；完成后两名成员显示完成，断线重连保留原结果和历史，不重放工作流，零iframe/页面/隔离渲染异常。

修复了DSHM仍将工作流成员限定为旧one-shot的导航错误。官方新版[本地activation](../../../dsh-mobile/artifacts/official-alpha2-source/packages/subagent/subagent/src/manager.ts)确立continuable身份；手机[导航检查](../../../dsh-mobile/src/remote-workflows.mjs)保留官方投影mode，核对父子关系、成员运行状态及会话归属，缺失/冲突/未知身份仍拒绝。旧一次性成员按原关系继续支持。只重建发生变化的DSHM Web/App，13,357,118字节APK；插件、官方DSH和SDK未重建。两项导航回归、后端类型与Android lint通过。

失败边界保留：`f313e498`是提交期间输入框暂不可编辑；`46d58ef9`在workspace-write沙箱准备中出现Windows `SetNamedSecurityInfoW`权限错误，工作流未启动成员。后续只读验证使用正常read-only设置，没有修改沙箱或ACL，因此不证明workspace-write运行环境全部正常。`365ae44b`定位到上述DSHM类型判断；`e465bb20`是测试在最终turn/end到达前核对结算，`ed00a059`是测试未展开官方默认收起的已完成轮次。所有失败报告原样保留且清理完成，修正[真实入口](../../../backend/tests/official-host.test.ts)与[手机脚本](../../../dsh-mobile/tests/support/official-workflows.mjs)后复验通过。工作流取消、后台运行、嵌套、Host结束和外部提供方另验。

[成员最终回复强化复验](../../../backend/artifacts/official-plugin-only/official-android-f6a12f42-4371-48df-9581-a03f4a98e1e1.json)另在41.251秒通过十阶段。[手机子聊天截图](../../../dsh-mobile/artifacts/official-plugin-only/f6a12f42-4371-48df-9581-a03f4a98e1e1/workflow-child.png)实际查看，完整正文和唯一标记显示；[原子历史核对](../../../dsh-mobile/artifacts/official-plugin-only/f6a12f42-4371-48df-9581-a03f4a98e1e1/workflows.json)20条，真实任务消息一条、真实模型回复一条、最终turn/end completed且没有工具调用。`670d7f2c`失败来自测试误将官方指令/环境/技能/时间的user/message上下文也计为任务；按原source.kind区分后复验，不删改原历史、不构建安装产品。两轮成功及这轮失败都清理无异常。

## 定时任务的新版接入差异

源代码核验确认，alpha.2的定时任务改为Host持久服务，当前会话读取走[官方schedule/list](../../../dsh-mobile/artifacts/official-alpha2-source/packages/schedule/schedule/src/index.ts)，通过`schedule/changed`通知刷新。已在[通信策略](../../../backend/packages/protocol/src/remote-policy.ts)及[插件适配](../../src/remote-adapter.ts)中接入指定会话的受限只读查询，仅已审阅alpha.2候选协商开放，旧Host不公布或转发。未开放手机直接创建/修改/删除、全局catalog或触发历史接口；用户在聊天中提出提醒要求，由DSH原模型工具执行。[手机目录](../../../dsh-mobile/src/remote-schedules.mjs)按原连接代次读取及刷新，关闭后释放订阅，断线保留最近结果并显示待核对，失败不会伪装为空列表；旧版继续读取原会话投影。

[实际专项09868223](../../../backend/artifacts/official-plugin-only/official-android-09868223-8581-443c-9d2d-f393ff95edb3.json)118.409秒通过12个Android阶段。真实模型严格创建after/at/every/daily/weekly/cron六类提醒，原六次schedule_create调用、参数及成功结果逐项核对；手机标题/正文/UTC目标/周期文案与官方list匹配。电脑正常公开update只改名，手机正在打开的面板实时刷新，原时间/规则和会话记录不变。真实断线保留六项并显示待核对，重连恢复原目录和草稿，不重放创建。

90秒after提醒自然触发后，手机自动移除已结束项、保留其余五项；官方持久history中唯一messageId/目标时间/已送达时间与原source.kind=schedule消息对应，真实模型只回复唯一标记且原turn/end completed，没有新工具调用，原历史前缀与草稿保持。[手机完整证据](../../../dsh-mobile/artifacts/official-plugin-only/09868223-8581-443c-9d2d-f393ff95edb3/schedules.json)及[实际列表截图](../../../dsh-mobile/artifacts/official-plugin-only/09868223-8581-443c-9d2d-f393ff95edb3/schedule-six-rules.png)已查看。通过正常电脑API清理本轮六项后，手机显示无待触发提醒，原聊天不删改；测试授权、UID及网关收尾完成。其他五类只验证创建、规则与目录，未等其自然触发；周期重复触发、Host重启迁移、时区切换、夏令时和其他生命周期不在本轮结论内。

只构建变化的自有协议、插件0.1.77-latest.0、Web/App；[正常官方安装回执](../../artifacts/official-dsh-alpha2/own-plugin-upgrade.json)要求下次启动加载，[受控正常重启](../../artifacts/official-dsh-alpha2/own-plugin-upgrade-restart.json)只结束本项目隔离Host并通过同home的pnpm dsh web恢复，launcher23188→35588，未修改或构建DSH/SDK。[独立测试APK](../../../dsh-mobile/artifacts/official-alpha2-android-build/official-app.json)13,358,436字节、SHA-256 `0be1061e354413a39ad54b634833520bd5d80f482400311a68ed4b45c05367dd`，原App身份保持。随后[同APK核心回归94a34028](../../../backend/artifacts/official-plugin-only/official-android-94a34028-5fe6-478b-9e18-e79c8ece2a58.json)35.392秒、10阶段通过真实续聊/选模/write允许与拒绝/重连/新建/撤销，零页面或隔离渲染异常，coreInferenceVerified/passed/cleanupCompleted=true。四项通信策略、48项插件相关回归、三项手机目录回归、类型检查、自有构建及Android lint通过。

查看首轮实际截图后发现提醒正文中的长英文标记超出面板，已仅在[自有样式](../../../dsh-mobile/src/ui/remote-product.css)中补充换行；强化[真实手机验证](../../../dsh-mobile/tests/support/official-schedules.mjs)逐项检查目录行无横向溢出，并将最终回复滚入实际屏幕再截图。[强化专项ac52f1fe](../../../backend/artifacts/official-plugin-only/official-android-ac52f1fe-19f6-431c-980f-bd1a660c2593.json)116.079秒、12阶段完整通过，六类原工具参数/记录、改名刷新、断线待核对、真实单次触发与清理保持。[周期规则截图](../../../dsh-mobile/artifacts/official-plugin-only/ac52f1fe-19f6-431c-980f-bd1a660c2593/schedule-calendar-rules.png)及[手机最终定时回复](../../../dsh-mobile/artifacts/official-plugin-only/ac52f1fe-19f6-431c-980f-bd1a660c2593/schedule-real-delivery.png)实际查看，原草稿保持。只更新自己的Web/App，仍13,358,436字节，最终APK SHA-256 `2dbce54dd1c1dffe6aee8f2d70b5f395279bab0d193fd341f66477225e6215e6`；插件及DSH无需再次构建或重启。[最终同APK核心回归c2b7b1d7](../../../backend/artifacts/official-plugin-only/official-android-c2b7b1d7-7df5-41b1-a99c-29cec58fdde4.json)38.501秒、10阶段通过真实聊天/选模/允许拒绝审批/重连/新建/撤销，零页面和隔离渲染异常，收尾完成。首轮功能验证继续保留，不用最终截图冒充首轮实际可见回复。

## 电脑 Key 状态、原生取消与服务地址确认

[生产中转专项](../../../backend/artifacts/official-plugin-only/official-android-bb5d7d11-1d1e-4eb2-930a-3305f4027eb2.json)29.896秒通过11个真实手机阶段：[手机证据](../../../dsh-mobile/artifacts/official-plugin-only/bb5d7d11-1d1e-4eb2-930a-3305f4027eb2/computer-key-endpoint.json)中的 configured/writable 两个布尔值与官方 `credentials/describe` 独立核对一致。原生密码窗口只显示确切空框提示，不显示旧 Key；点击取消后状态保持，没有输入、保存、移除 Key，也没有读取或摘要凭据文件。

服务地址显示 `https://api.deepseek.com`、Messages、默认继承，与官方 `settings/describe` 的固定默认配置核对一致。手机输入专用 HTTP 测试地址，只进入确认页，实际显示目标站点/完整路径及 HTTP 未加密提示；[确认页截图](../../../dsh-mobile/artifacts/official-plugin-only/bb5d7d11-1d1e-4eb2-930a-3305f4027eb2/computer-endpoint-confirm-cancel.png)已查看。点击取消并重新读取后，设置 revision、公开值、独立普通 profile 文件摘要和完整测试会话记录保持；没有确认提交地址或向新站点发送模型请求。

无管理时入口不展示输入控件；临时授权、实际原生取消及地址确认取消后收回管理权限，仍保留同一聊天/草稿，正常重连/已有工作区新建/撤销后拒绝也通过。`credentialEndpointsVerified/passed/cleanupCompleted=true`，零页面/隔离渲染异常。只新增[真实验收脚本](../../../dsh-mobile/tests/support/official-credential-endpoints.mjs)及[网关真实调用入口](../../../backend/tests/official-host.test.ts)，复用原插件/最终APK/正常官方Host，没有任何产品构建、安装或Host重启。

首轮 `21465428-d4d9-44df-ab27-4762db86070c` 失败保留：Android accessibility 在空密码框返回 hint，旧脚本错误要求空字符串。结合自有原生窗口源代码修正为只接受确切提示后复验；首轮也已撤销权限、清理独立测试环境。此专项不证明 Key 实际更换/移除、地址实际保存、其他提供方或写入生命周期，不能扩大取消操作的通过范围。

## DeepSeek 模型清单、实时选模目录与恢复默认

[生产中转专项](../../../backend/artifacts/official-plugin-only/official-android-49f69fdf-bee2-4bd7-ae2b-c713b010158a.json)26.501秒通过11个真实手机阶段。[手机实际编辑器](../../../dsh-mobile/tests/support/official-deepseek-models.mjs)先核对两个默认模型与官方 `settings/describe` 的完整公开行，再将第一个模型的名称临时改为唯一测试标记、上下文1000000改为1000001、输入类型改为文字，从手机保存。独立官方 `session/modelCatalog` 当即显示新名称；手机聚焦输入框后打开自己的选模器，同步显示新名称，[实际截图](../../../dsh-mobile/artifacts/official-plugin-only/49f69fdf-bee2-4bd7-ae2b-c713b010158a/deepseek-model-picker-live-name.png)已查看。

[电脑独立核对](../../../backend/tests/support/official-deepseek-models.ts)逐项比较完整公开行，另一个模型、`description/systemPromptUpdate/toolUpdate` 等未展示字段保持，其他五项设置和完整会话历史不变。手机沿“恢复默认模型清单→保存”恢复原两行及未覆盖状态，再重新读取确认；独立普通profile摘要恢复原值。临时管理已收回、同一草稿保持，正常重连、新建会话和撤销后拒绝继续通过。`modelSettingsVerified/passed/cleanupCompleted=true`，`testModelSettingsRestored` 确认目录/继承/profile恢复，零页面/隔离渲染异常。

首轮 `8090f631-edfa-46f7-85a0-40852c1e80f7` 已成功保存，但脚本未聚焦输入框便寻找按设计收起的选模按钮，等待超时。沿官方正常 `settings/mutate` 仅回退本轮明确写入的行，原目录、继承及profile摘要恢复，失败证据保留。修正手机操作顺序后完整通过，没有修改或重新构建插件/App/DSH。此专项只证明DeepSeek目录设置和即时目录同步，不证明临时容量/输入声明被真实推理采用，也不替代其他提供方、目录发现、整行增删或并发写入的验收。

## 自定义提供方、已有地址目录与协议设置

[生产中转专项](../../../backend/artifacts/official-plugin-only/official-android-ec965391-d697-4bbe-90f1-e30e0d009470.json)58.021秒通过13个真实手机阶段。[手机表单](../../../dsh-mobile/tests/support/official-providers.mjs)临时授权管理后返回原测试会话，再创建无Key的专用 `dshm-phone-management` 提供方、手工添加模型、改名并保存。随后从已保存地址读取真实HTTP目录，将候选模型加入编辑草稿并保存；[独立官方核对](../../../backend/tests/support/official-providers.ts)确认目录读取与加入草稿不写电脑设置，保存后 `settings/describe` 和 `session/modelCatalog` 的公开行一致。

两次目录请求均为本机临时服务的 `/v1/models`，没有认证头；该服务只返回测试目录，不模拟模型推理。手机填写另一个未保存地址后，已有提供方的目录发现仍使用电脑已保存地址，未向草稿地址发送请求。模型输入类型、思考档位、兼容布尔/枚举/优先级与模板变量保存、重新读取、禁用及恢复均独立核对；提供方共同默认值、协议切换确认取消、Completions→Responses→Completions以及兼容覆盖恢复也核对通过。测试不向该提供方发送聊天，不读、保存或移除用户Key。

手机取消移除时配置保持，明确确认后提供方从官方设置和选模目录消失，[移除后截图](../../../dsh-mobile/artifacts/official-plugin-only/ec965391-d697-4bbe-90f1-e30e0d009470/provider-removed.png)已查看。原会话历史/草稿保持，管理权限收回后设置无输入控件；正常重连、已有工作区新建和撤销后拒绝也通过。`providerManagementVerified/passed/cleanupCompleted=true`，零页面/隔离渲染异常；恢复原 `providers` 默认继承及普通profile摘要，临时HTTP服务关闭，没有产品构建、安装或Host重启。

**取消边界仍有效：** `providerModelProbe=false`，新增及已有提供方两处“从当前地址获取模型”区域实际不存在。旧 [ModelProbe](../../src/model-probe.ts)通过[实例映射](../../src/profile-providers.ts)要求专用 `:dshm-endpoint-v2`，它由[历史补丁](./source-changes.mjs)注册；当前官方服务只注册正常实例发现入口，并没有该专用注册。正常官方发现会优先返回内置目录、默认允许重定向，不能替代原草稿探测的固定网络目标语义。未回退或启用补丁，也不把取消入口记为通过；已有地址目录读取与核心选模保留。若以后恢复，需公开可强制查询实际地址、拒绝跳转且保持Host认证隔离的契约。

三轮失败保留且清理完成：`c6707c87-4445-4b2c-9c21-d874c01d6d00` 的旧脚本要求已取消的探测入口；`eb94fee7-3522-44c7-8007-9d0b83cd3b48` 未等改名保存完成便读取；`22c501e3-bd99-4404-99a0-256737a744a7` 已完成提供方操作，但授权重连后未回原会话便检查草稿。仅修正验收脚本的真实操作顺序，并增加取消入口/无请求的负向核对，完整复验才计通过。此无Key专项不包括后述隔离Key管理；地址另见后述独立专项；内置提供方覆盖、更多协议、真实模型执行与写入生命周期继续另验。

## 独立存储中的提供方 Key 管理（2026-10-10）

接口依据为只读核对的[官方公开凭据控制器](../../../dsh-mobile/artifacts/official-alpha2-source/packages/api/settings-controller/src/credentials.ts)和[本地凭据服务](../../../dsh-mobile/artifacts/official-alpha2-source/packages/credentials/credentials-local/src/index.ts)：公开describe只返回状态，set/unset负责正常凭据存储更新。新的默认存储来自独立DSH_HOME，不修改凭据服务实现。

[生产中转专项](../../../backend/artifacts/official-plugin-only/official-android-f44d711f-0c1f-4927-a78a-00da549b27c0.json)87.711秒通过23个真实手机阶段。[手机实际表单和原生窗口](../../../dsh-mobile/tests/support/official-provider-keys.mjs)覆盖两条入口：为无Key的已建提供方启用Key；新建提供方时勾选使用Key。两次都生成独立随机引用，虚构测试值只在手机原生密码窗口输入，既没有显示旧Key，也没有进入WebView页面。取消不写入，空输入拒绝且保留窗口；保存后公开状态显示已配置。

[电脑独立核对](../../../backend/tests/support/official-provider-keys.ts)使用官方 `credentials/describe` 的布尔投影与 `settings/describe` 核验引用和设置，不调用凭据resolve，不读、复制或摘要凭据文件。两个真实HTTP `/v1/models` 请求均被临时目录服务分类为使用已保存测试值认证，不记录认证头内容；没有向该服务发送模型请求。手机原生两步确认移除后引用均未配置；已建提供方再次读取目录失败，没有发出第三个请求。随后手机确认移除两条测试提供方，官方配置与选模目录均清理，完整会话历史、原草稿及默认继承保持。

本轮复用原官方安装、候选插件和现有APK，以[外部验收进程](../../scripts/run-official-key-host.mjs)执行正常 `pnpm dsh web`，仅指定新的空 `DSH_HOME` 和16960端口。通过官方 `dsh plugin --profile web add link:…` 安装已有候选，没有构建DSH/SDK/插件/App，不复制或替换原Key。原16958 Host仍为PID35588；本轮Host PID42304已受控结束，16960端口关闭，测试网关和目录服务关闭，临时管理与聊天授权已撤销。

`providerKeysVerified/passed/cleanupCompleted=true`，两条随机引用通过原生移除及公开布尔核对，普通profile摘要恢复，零页面/隔离渲染异常。[最终审计](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-final-restoration.json)包含28轮/356个实际手机阶段，另检查原DeepSeek Key仍已配置/可写、原App PID4249/APK身份及前台保持，官方alpha.2的299包/6386文件和alpha.1的290包/6263文件未变。没有打开用户Key内容或替换绑定。

此轮 `coreInferenceVerified=false`：新存储没有真实DeepSeek Key，聊天消息只证明官方日志和缺少凭据的实际结果，不能记作真实模型回复/工具执行。核心推理证据仍取前述真实Key的独立核心轮次。本轮也不证明真实服务接受这些Key、已有Key更换、内置提供方覆盖、环境变量只读凭据、写入中断/并发竞争或全部协议兼容；上述范围继续单独核验。

## 服务地址写入、默认恢复与旧确认保护（2026-10-10）

[实际中转及Android报告](../../../backend/artifacts/official-plugin-only/official-android-9bd5c5fd-8c95-4b7f-9de6-c0120c61f9d7.json)46.86秒通过39个手机阶段。使用独立空凭据目录、正常官方 `pnpm dsh web` 的16961 Host与原候选插件/APK；只补充[手机验收](../../../dsh-mobile/tests/support/official-endpoints.mjs)、[电脑公开设置核对](../../../backend/tests/support/official-endpoints.ts)和恢复审计，没有产品构建、重装或官方文件修改。

| 实际入口 | 已核验结果 |
| --- | --- |
| 电脑设置 → 模型设置 → DeepSeek地址 | 无效输入拒绝、确认取消不写入；HTTP/HTTPS地址保存、重新读取、恢复默认继承通过。 |
| Remote选项 → 电脑插件 → 插件设置 → 插件配置 → 网页搜索 | 与聊天地址分别保存；无效输入/取消、HTTP/HTTPS写入、读取与默认恢复通过，不改聊天地址或搜索其他选项。 |
| 电脑设置 → 其他模型提供方 → 专用手动路由 | 手机新建无Key路由，更换完整HTTP地址；实际目录请求抵达新地址并显示候选模型。旧确认拒绝与明确移除路由通过；删除必需地址的拒绝见下文。 |

每个表单都实际拒绝FTP、账号/密码、查询参数和片段；取消后的普通配置摘要不变。HTTP确认页显示未加密提示；HTTPS仅核验配置写入，不向 `example.invalid` 发请求。目录服务只收到一条新地址 `/v1/models` 请求，认证分类为none，旧地址零请求；不把目录读取当作模型推理。

三类旧确认保护分别实测：手机已核对的地址尚未确认时，另一正常官方连接修改同一字段；随后手机确认明确提示“电脑配置已变化或页面已过期，请重新读取地址。”电脑新值保持，其他字段和完整历史不变。独立空目录的DeepSeek Key状态始终未配置，没有读取或摘要任何凭据文件。

公开设置中的 `value` 包含默认值，`user` 只表示填写的覆盖，两者分别完整核对。搜索地址的官方编辑器还会显式保留默认 `apiKeyEnv` 引用名：[独立对照](../../../backend/tests/support/official-endpoints.ts)先通过正常 `settings/mutate` 复现，再恢复并核对整份配置摘要；手机写入只允许这项已证实的投影差异，不忽略其他字段。提供方默认模型容量/空兼容对象与手填配置同样分别核对。

**手动路由没有默认站点。** [官方严格写入校验](../../../dsh-mobile/artifacts/official-alpha2-source/packages/llm/llm-pi-ai/src/config.ts)与[模型目录解析](../../../dsh-mobile/artifacts/official-alpha2-source/packages/llm/llm-pi-ai/src/catalog.ts)要求未被内置目录描述的模型保留baseURL。实际正常API删除该字段返回 `needs a baseURL`，手机操作同样被拒绝，普通配置摘要和完整历史保持。[手机拒绝截图](../../../dsh-mobile/artifacts/official-plugin-only/9bd5c5fd-8c95-4b7f-9de6-c0120c61f9d7/endpoint-provider-reset-refused.png)没有成功提示，重新读取仍显示原地址；本项是拒绝用例，不能记为恢复默认成功。当时手机显示通用“保存结果尚未确认”并限制重复写入，现已由下方默认地址策略修复取代，内置OpenAI目录默认恢复已另验。

[聊天默认恢复](../../../dsh-mobile/artifacts/official-plugin-only/9bd5c5fd-8c95-4b7f-9de6-c0120c61f9d7/endpoint-chat-restored.png)、[网页搜索默认恢复](../../../dsh-mobile/artifacts/official-plugin-only/9bd5c5fd-8c95-4b7f-9de6-c0120c61f9d7/endpoint-search-restored.png)和拒绝截图已查看。管理授权收回后设置无输入控件，原草稿保持；正常重连、已有工作区新建及撤销后拒绝也通过。`endpointWritesVerified/passed/cleanupCompleted=true`，零页面/隔离渲染异常；三个namespace的完整值/覆盖及原profile摘要均恢复，测试提供方移除，网关与两个HTTP目录服务关闭。

六轮失败报告仍保留且清理完成：`a75ae884`、`b5d31757` 错把网页搜索当顶层设置；`f05bef5b` 未区分搜索默认凭据引用投影；`4992366e` 把提供方有效默认值当作用户覆盖；`27233f1e`、`a1cf791a` 错误期待手动路由删除必需地址成功。修正真实导航及精确断言，并把最后一项明确作为官方拒绝场景复验，没有修改DSH使这些错误假设成立，也没有用后续成功覆盖原失败。

地址Host PID41184已受控结束，16961端口关闭；原16958 Host/PID35588保持。[28轮/356阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-final-restoration.json)继续确认原App PID4249/APK/前台、原Key已配置状态、两版官方文件及只读源码未变。本轮 `coreInferenceVerified=false`，不证明真实模型/搜索请求、HTTPS连通性、内置提供方覆盖或写入中断/回执竞争；真实推理仍取此前核心专项。

## 无默认地址的入口限制与内置目录恢复（2026-10-10）

候选插件 `0.1.78-latest.0` 和新版测试App已修复上轮无默认地址的恢复入口。相比仅改错误文案，公开目录判断、手机禁用和插件拒绝可阻止旧客户端或直接请求删除必需地址。只维护自有协议/插件/App，不导入官方内部校验函数。

[插件](../../src/provider-endpoint.ts)根据设置继承地址或官方 `listConfigurableProviders` 的唯一匹配行判断；仅 `declared=false` 表示内置目录，未知/缺失/重复的目录不猜默认。新增 `providerEndpointResetPolicy` 协商和显式 `resetPolicy:true`：新手机取得 `resettable`，旧手机响应不加字段；无默认的unset在原写入前明确拒绝，手机不把拒绝锁为未知写入。正常官方设置接口仍作最终校验。

[实际报告](../../../backend/artifacts/official-plugin-only/official-android-987f3c9b-8f48-4bc9-a491-540d02349ae2.json)67.85秒/46手机阶段通过，使用新空用户目录、16962正常官方Host及生产鉴权中转。手机显示“当前没有可恢复的默认地址，请填写完整服务地址。”并禁用恢复；旧格式和协商格式的实际中转请求均返回 `remote_endpoint_reset_unavailable`，配置摘要保持。随后显式保存地址成功。[提示与禁用截图](../../../dsh-mobile/artifacts/official-plugin-only/987f3c9b-8f48-4bc9-a491-540d02349ae2/endpoint-provider-reset-refused.png)已查看。

正常公开设置登记临时内置OpenAI，手机打开已有提供方、保存地址并成功恢复目录默认。电脑有效配置与用户覆盖分别恢复，[截图](../../../dsh-mobile/artifacts/official-plugin-only/987f3c9b-8f48-4bc9-a491-540d02349ae2/endpoint-catalog-restored.png)已查看；临时路由移除，聊天/搜索地址、整个profile摘要与历史恢复。空凭据状态保持，目录仅一条无认证 `/v1/models`；不证明推理、HTTPS连通或全部内置提供方覆盖。

首轮 `e8f08b0b-6a63-413c-90b8-d8a688c64d57` 因脚本等待隐藏HTML选项可见而失败，完整清理保持，不计通过；修正为等待选项存在后真实选择。正常16958升级另遇测试器错误要求可选 `ChangeResult.version`，公开目录随后确认0.1.78已安装/启用，不重复安装；原失败与[只读核对](../../artifacts/official-dsh-alpha2/own-plugin-endpoint-policy-observation.json)分别保留。

只构建变化的自有协议、插件、Web及独立Android。新APK13,358,780字节，SHA-256 `d70e40b9cdb6e5ebc71f452c72b8258b5d8cf543de4422b6d6a12a3972516dbb`；[安装记录](../../../dsh-mobile/artifacts/official-alpha2-android-build/official-app.json)确认原App身份保持。正常官方Host受控重启到PID20992后，[同新版App/插件核心回归](../../../backend/artifacts/official-plugin-only/official-android-83c59ec1-010f-41e2-9d82-49814d10bb6b.json)38.08秒/10阶段通过真实回复、选模、write允许/拒绝、重连、新会话及撤销拒绝。没有修改或构建DSH/SDK。

65项相关检查、两项目类型、Web/Android构建通过。16962/PID46396结束，授权、网关、反向映射和测试UID清理完成。30轮/412实际手机阶段的[恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-final-restoration.json)通过；两版官方文件、只读源码、原Key配置状态及原App前台保持。地址写入中断/回执竞争、其他提供方仍待复验。

## 服务地址保存中断与真实回执丢失（2026-10-10）

三类实际手机入口各验证两次断线：聊天地址、网页搜索插件地址、自定义提供方地址。复用候选插件0.1.78-latest.0和官方安装，新增独立空凭据Host16963；只增量构建发生变化的手机Web/App，没有构建或修改DSH、SDK或网关产品。

[外部传输测试](../../../backend/tests/support/official-endpoint-transport.ts)转发原始HTTP和WebSocket，在手机真实确认后截断连接，不替换鉴权、设置服务或伪造回执。[实际Android操作](../../../dsh-mobile/tests/support/official-endpoint-interruption.mjs)使用手机表单和按钮，[公开配置核验](../../../backend/tests/support/official-endpoints.ts)逐项检查三个namespace的完整有效值、用户覆盖、其他字段及完整会话记录。

| 故障点 | 实际结果 |
| --- | --- |
| 写入尚未转给电脑 | 不转发请求；原配置摘要、完整值及历史保持。手机显示结果未确认，重连读取仍是原地址，无自动重发。 |
| 电脑保存成功，真实回执尚未送达手机 | 转发原请求，收到真实成功结果后丢弃回执并断开。电脑已保存新地址，手机仍显示结果未确认；重连读取显示实际新站点，无自动重发。 |

实测发现网页搜索插件设置和自定义提供方表单在断线时卸载，导致原组件中的未知结果提示丢失。已将提示保留在[地址通信服务](../../../dsh-mobile/src/remote-endpoint.mjs)：外层[插件设置页](../../../dsh-mobile/src/ui/RemotePlugins.jsx)和[电脑设置页](../../../dsh-mobile/src/ui/RemoteComputerSettings.jsx)可继续显示。旧连接读取不解除未确认写入限制，新连接核对真实配置后清除服务提示；不自动重复写入。

[成功报告](../../../backend/artifacts/official-plugin-only/official-android-c065349e-a1ec-46d3-9d0b-cc61aab5d6f1.json)63.01秒、32手机阶段、六个真实切断通过，测试进程退出0。六次写入与六次切断逐一对应，管理权收回、原聊天草稿/手机进程保持，零页面和隔离渲染异常。所有地址、用户覆盖、整个普通配置摘要与完整历史恢复，测试提供方移除，两个HTTP目录服务没有请求并关闭；本轮无Key，不是模型或搜索推理验收。

修复后的同一APK另以[核心回归](../../../backend/artifacts/official-plugin-only/official-android-25862e0b-f438-490b-920f-9b3171ff223b.json)35.85秒、十手机阶段通过真实聊天/选模/允许拒绝审批/新建/重连与撤销；无重建或重装。当前测试APK为13,359,058字节、SHA256 `9ca0cb74d9b1deccf7d82e39c9e7d299909d4ce5f067bc74c94a1e265e7135c0`，保护原App未覆盖。

失败与局限保留：760ccbe9因命令漏填Android编号提前退出；5477bdcf复现搜索提示丢失，1f753cd0复现提供方提示丢失；51660497的业务断线场景通过，但Vitest退出时有ADB5037未捕获超时，整轮退出1，不计入成功轮数。测试驱动发现第二设备观察句柄未关闭，现只保留目标MuMu连接，并用公开close释放其他Playwright句柄，不停止其他模拟器或App；最终断线及核心两轮均无该异常。9项地址回归、后端类型检查和自有Web/Android构建通过。此专项不覆盖App/Host结束、两设备同时写入、其他提供方或其他回执竞态。

## 服务地址的两条真实连接竞争（2026-10-10）

复用候选0.1.78-latest.0和同一测试APK，官方正常CLI另用独立空凭据Host16964。只新增测试和收尾核验代码，没有重建或重装App、插件、网关、DSH或SDK。[真实Android入口](../../../dsh-mobile/tests/support/official-endpoint-race.mjs)实际操作聊天地址、网页搜索插件地址和自定义提供方地址；另一条已批准的协议连接使用独立设备身份与事件clientId，不冒用手机快照。

[外部传输闸门](../../../backend/tests/support/official-endpoint-transport.ts)等待两份不同快照、相同读取版本的真实请求都在途后，同时放行原始报文，交替交换先发顺序，不等第一份完成、不伪造回执、不替换鉴权或设置服务。每个入口各两组，合计六组/十二次写入，均只有一个真实成功回执，另一个明确返回remote_endpoint_stale；各入口分别实际出现手机胜出和另一连接胜出。

手机胜出时显示已保存；另一连接胜出时显示配置已变化，撤掉旧输入和确认，重新读取才可再次修改。没有误判为结果未知，没有自动重发、断线或手机进程重启。实际配置版本每组只增加一次，公开配置的完整值、用户覆盖和邻接字段与胜出地址匹配，完整会话记录和原聊天草稿保持。

[成功报告](../../../backend/artifacts/official-plugin-only/official-android-e35ec405-670c-4f76-8b24-242d60c00a8c.json)73.66秒/26个真实手机阶段通过，零页面/隔离渲染异常；[独立进程结果](../../../backend/artifacts/official-plugin-only/official-android-e35ec405-670c-4f76-8b24-242d60c00a8c.outcome.json)记录退出0且无未捕获异常。普通配置整文件摘要及完整历史恢复，三个地址和继承状态恢复，临时提供方移除、两设备授权收回并撤销，网关、两个HTTP目录服务和反向映射关闭。16964/PID47688受控结束，原App前台/安装身份、原Key公开状态及官方文件原摘要保持。

首轮失败[e5f8b919](../../../backend/artifacts/official-plugin-only/official-android-e5f8b919-6d67-415e-816b-af448cf1dde4.json)保留且不计成功：自定义提供方的另一地址恰等于初值，是合法无变化保存，版本不增加，两次成功并不说明覆盖。修正为两个都不同于原值的地址后复验通过，未因此添加产品锁或修改DSH。自定义提供方的第三地址为example.invalid上的有效HTTPS配置值，没有发出HTTP/TLS或模型请求；本轮无Key，不是服务可用性或推理验收。

范围限定为三个入口的两个不同新值、真实Android加另一协议连接，不代表两台手机显示、修改不同配置字段、App/Host结束或其他回执竞态。原App/产品均未变化，所以本轮没有重复构建或重跑模型核心链路；同APK此前真实核心结果保持原独立证据。

## 服务地址保存时App结束与恢复（2026-10-10）

候选插件仍为0.1.78-latest.0，独立官方Host16965使用空凭据home，正常`pnpm dsh web`启动，没有修改或构建DSH。手机的新待核对记录在发请求前严格提交，仅存目标类别/核对编号/记录版本，不保存地址、Key或请求内容；存储提交失败则不发送网络写入。明确成功/拒绝按原编号清理，旧回执不能清除新标记；结果未知或进程结束时保留，重开后的实际读取核对后清除，不重放写入。代码见[持久记录](../../../dsh-mobile/src/remote-endpoint-journal.mjs)、[按绑定存储](../../../dsh-mobile/src/remote-drafts.mjs)、[地址服务](../../../dsh-mobile/src/remote-endpoint.mjs)及[自有聊天提示](../../../dsh-mobile/src/ui/RemoteWorkspace.jsx)。

真实Android专项[报告c463bedf-983c-482d-83e4-e1e2fc350fdb](../../../backend/artifacts/official-plugin-only/official-android-c463bedf-983c-482d-83e4-e1e2fc350fdb.json)在89.35秒/32阶段通过，Vitest实际退出0、无未捕获异常，[独立退出证据](../../../backend/artifacts/official-plugin-only/official-android-c463bedf-983c-482d-83e4-e1e2fc350fdb.outcome.json)保存。手机聊天、搜索插件及自定义提供方三个真实入口，分别在未转发和电脑成功保存但原回执未送达时结束测试App，共六次。外部闸门只扣留真实请求/回执，进程结束前socket仍开着、未向手机报告失败，随后实际App死亡关闭连接；不替换认证或DSH服务。每次正常Launcher重开、新PID、自己的Remote页面和原会话/草稿恢复，显示结果未确认提示，读取实际配置后提示清除；六次写入没有自动重复。三个namespace完整有效值/用户覆盖/邻接字段、整份普通profile摘要与全部历史精确恢复，临时提供方移除、权限收回和设备撤销、两个目录零请求/关闭。实际截图见[恢复提示](../../../dsh-mobile/artifacts/official-plugin-only/c463bedf-983c-482d-83e4-e1e2fc350fdb/endpoint-process-chat-before-forward-restored.png)，[手机六场景记录](../../../dsh-mobile/artifacts/official-plugin-only/c463bedf-983c-482d-83e4-e1e2fc350fdb/endpoint-process.json)逐项保留。

修复前的[ca943f4a失败](../../../backend/artifacts/official-plugin-only/official-android-ca943f4a-4cbb-44f8-b12e-ea8f9ce25a38.json)实际复现进程重开后没有未确认提示；修复后的首轮[d1f4f8c8失败](../../../backend/artifacts/official-plugin-only/official-android-d1f4f8c8-12c3-48e7-8322-80139fc7e3d0.json)已通过聊天/搜索四场景及提供方恢复提示，但测试未重新展开“其他模型提供方”而超时。只修正测试点击顺序，沿同一APK复验六场景通过；两份失败及清理证据保持，不计为成功。

本次只增量构建变化的自有Web/App；新APK13,360,021字节、SHA256 `fc9672f5b7ddd390dc55d4137cdb680837e1f277b30b762233a94cdef7675734`，37个Android任务中5执行/32复用。22项地址/草稿回归、后端类型与相关JS语法通过。未修改插件/协议/后端产品，不重新构建它们或DSH/SDK。随后相同APK在正常16958官方Host完成[真实核心回归c0c19290](../../../backend/artifacts/official-plugin-only/official-android-c0c19290-3e43-484f-b998-59ea66344d91.json)：34.76秒/10阶段、真实回复、选模、write允许一次/拒绝、已有工作区新建、重连与撤销通过，零页面和隔离渲染异常，实际退出0。原App/Key/绑定保持。地址专项不覆盖Host结束、存储损坏、其他系统回收策略或其他设置写入，不把隔离无Key消息当作真实模型验收。

## 纯插件启动挂接清理与复验（2026-10-10）

[当前交付审查](./official-delivery-audit.md)汇总四部分组成、精确版本、安装包、六类已取消扩展及未验边界。候选0.1.79-latest.0移除旧前台输出观察、私有待办getter、指定应用和动态Cordis启动挂接；普通后台Job、公开插件资源和会话完成通知保留。11项真实初始化/通知回归及插件/后端类型通过，只构建自己的插件，没有构建DSH/SDK/App/后端。官方管理器升级后正常重启隔离16958一次，launcher变为15844；仍使用原正常CLI与凭据提供方。

新候选和同一已有APK实际完成：[核心a05391b2](../../../backend/artifacts/official-plugin-only/official-android-a05391b2-adab-4ca9-aacd-6c337e5c3e3a.json)36.63秒/10阶段；[普通插件541d88aa](../../../backend/artifacts/official-plugin-only/official-android-541d88aa-b983-4d42-9082-c95a1c25f30a.json)49.57秒/13阶段；[通知0ae98f34](../../../backend/artifacts/official-plugin-only/official-android-0ae98f34-6f92-4f2a-b675-53c8ee1e46f8.json)121.11秒/13阶段。三轮真实退出0、零未捕获/页面/隔离渲染异常，授权及临时服务清理。普通局部插件交互/状态/缩放/卸载保持，通知包括App死亡无推送、Launcher重开不补发旧通知、新完成继续通知一次，不将普通测试插件推广为任意插件兼容。

[独立tgz及审查](../../artifacts/official-alpha2-sdk/candidate-package-check-Alpha2PublicOnly01/own-delivery-audit.json)63文件/234,003字节，精确peer为官方alpha.2，只有自有代码和官方插件配置声明；没有DSH载荷、凭据或安装脚本。实际解包内容/自有JS和manifest比对通过，官方目录已安装启用版本一致；没有逐字节比较官方管理器缓存。README版本文案修正不影响已实测JS。旧帮助代码和类型保留，不宣称全部旧模块删除；两类私有观察器不再进入Host打包输入，三轮协商均不公开已取消能力或动态Cordis描述符。

## 预设公开入口复验（2026-10-10）

[实际预设专项3f9fce86](../../../backend/artifacts/official-plugin-only/official-android-3f9fce86-91eb-46e5-8003-560f1c0edf53.json)在正常16958 Host、候选0.1.79-latest.0及同一已有APK通过，29.98秒/14个真实Android阶段，实际退出0、零页面与隔离渲染异常。[独立退出记录](../../../backend/artifacts/official-plugin-only/official-android-3f9fce86-91eb-46e5-8003-560f1c0edf53.outcome.json)保留；本轮仅新增[手机驱动](../../../dsh-mobile/tests/support/official-presets.mjs)、[公开接口核对](../../../backend/tests/support/official-presets.ts)与恢复断言，没有产品修改、构建或安装。

已开始的standard历史会话选择器禁用；已有工作区新建空白会话，手机从共享菜单选择minimal，电脑公开投影一致。未授管理权时设置不可改；临时授权后手机显示standard/ptc/minimal/cordis四行，实际minimal声明2322字节与官方`agentPresets/read`逐字一致，[弹窗截图](../../../dsh-mobile/artifacts/official-plugin-only/3f9fce86-91eb-46e5-8003-560f1c0edf53/preset-declaration.png)已查看。配置位置为正常profile文件，长路径包含在容器中，取消选项后旧位置撤下，没有显示已取消的归档管理。

手机把新会话默认改为minimal，另一新建空白会话实际继承minimal，原standard历史模式和完整记录不变。电脑通过正常`settings/mutate`清除自己的默认覆盖，手机重读显示原默认；完整有效值、用户覆盖、目录、profile摘要和原历史精确恢复。恢复属于官方API清理，不证明手机“恢复继承”入口。临时管理权收回、草稿保持，重连/已有工作区新建/撤销拒绝通过；[分项记录](../../../dsh-mobile/artifacts/official-plugin-only/3f9fce86-91eb-46e5-8003-560f1c0edf53/presets.json)保存。`presetSettingsVerified/passed/cleanupCompleted=true`；`coreInferenceVerified=false`，本轮基础真实文本回复不替代此前完整工具审批专项。

四轮失败及清理保留、不计成功：[4f1fca77](../../../backend/artifacts/official-plugin-only/official-android-4f1fca77-ebdc-460e-a49d-6a184b119052.json)错误寻找空白会话不存在的历史模式按钮；[18782511](../../../backend/artifacts/official-plugin-only/official-android-18782511-8c9f-4433-b125-bf887078f187.json)错误要求裸UUID；[4b38464c](../../../backend/artifacts/official-plugin-only/official-android-4b38464c-68ef-4f85-b630-64813d50d36f.json)错误读取未公开turnBoundary投影；[bf00a8f8](../../../backend/artifacts/official-plugin-only/official-android-bf00a8f8-addb-4a9f-a37c-c0cf1f7e1176.json)弹窗X与底部关闭按钮同名，测试定位冲突。修正实际导航、ID契约和公开日志断言后沿同产品复验，没有修改DSH或以mock替代。

此专项只覆盖现有四行显示、健康minimal预设声明/选择/默认继承，不覆盖Creator、自定义或故障预设、所有声明、写入竞争与其他生命周期。预设归档复制/删除仍取消；后端类型检查通过，39轮/572阶段恢复核对通过，原App正常Launcher前台截图已查看。

## 四种模式与创造入口（2026-10-10）

复用正常16958官方Host、候选0.1.79-latest.0与同一已有APK，新增[手机真实操作](../../../dsh-mobile/tests/support/official-preset-creator.mjs)和[公开配置/日志核对](../../../backend/tests/support/official-preset-creator.ts)，没有产品修改、构建或安装。

| 实际专项 | 范围与结果 |
| --- | --- |
| [57bfac0f](../../../backend/artifacts/official-plugin-only/official-android-57bfac0f-61fc-4c46-9d38-d910d897368b.json) | 33.81秒/14阶段。四种模式的声明逐字与官方读取一致，standard/ptc/minimal/cordis均能在空白会话选择且电脑公开投影一致。历史会话的设置入口进入已有空白会话，再从空白会话设置及插件管理“让Agent创建插件”入口复用同一会话。 |
| [22ff090e](../../../backend/artifacts/official-plugin-only/official-android-22ff090e-49cc-444d-b219-b4707213bbbb.json) | 34.87秒/14阶段。加强无已有空白会话的路径：操作前该专用工作区仅有原历史会话，第一次设置入口创建此前电脑目录中不存在的新会话；空白设置和插件管理入口继续复用它。随后四种模式选择均在该新会话同步。 |

两轮[退出记录57bfac0f](../../../backend/artifacts/official-plugin-only/official-android-57bfac0f-61fc-4c46-9d38-d910d897368b.outcome.json)和[退出记录22ff090e](../../../backend/artifacts/official-plugin-only/official-android-22ff090e-49cc-444d-b219-b4707213bbbb.outcome.json)均为实际Vitest退出0、无未捕获异常。`presetCreatorVerified/passed/cleanupCompleted=true`，零页面/隔离渲染异常；基础真实文本回复保持，`coreInferenceVerified=false`，不代替此前完整工具审批专项。

声明字节分别为standard 5515、ptc 5656、minimal 2322、cordis 5865，[手机声明与空白会话截图](../../../dsh-mobile/artifacts/official-plugin-only/22ff090e-49cc-444d-b219-b4707213bbbb/creator-blank.png)及[创造模式声明](../../../dsh-mobile/artifacts/official-plugin-only/57bfac0f-61fc-4c46-9d38-d910d897368b/creator-declaration.png)已实际查看。每个创造入口均通过官方会话日志证明没有user/message或turn/start；选择模式和打开入口不发送创作指令。原历史模式/完整记录、原草稿、预设目录、默认有效值/用户覆盖和整份普通profile摘要保持，未改变默认继承。临时管理权收回后设置不可改，聊天继续可用，测试设备撤销、自己的UID与中转清理。

这证明四种内置模式的选择/声明及创造入口的会话导航，不证明模型实际编写插件、任意Cordis工具和审批、故障/自定义预设、写入竞争或其他生命周期。历史57bfac0f只证明已有空白复用，不用后续结果扩大它；22ff090e另证新建路径。预设归档复制/删除与旧动态Cordis运行器仍取消。后端类型与相关JS语法通过，累计41轮/600阶段恢复核对通过，原App正常Launcher前台截图已查看。

## 创造模式真实Host工具与源码审批（2026-10-10）

复用正常16958官方Host、独立插件0.1.79-latest.0及同一APK，新增[手机真实操作](../../../dsh-mobile/tests/support/official-creator-task.mjs)、[公开日志核对](../../../backend/tests/support/official-creator-task.ts)，通过既有[单次写入验收](../../../dsh-mobile/tests/support/official-write-approvals.mjs)的专用源码分支验证；没有产品修改、构建或安装。

[真实报告2c201c6b](../../../backend/artifacts/official-plugin-only/official-android-2c201c6b-b078-453d-a083-35e6d4f2bcc8.json)与[独立退出记录](../../../backend/artifacts/official-plugin-only/official-android-2c201c6b-b078-453d-a083-35e6d4f2bcc8.outcome.json)为45.86秒/11阶段、实际Vitest退出0，无未捕获、页面或隔离渲染异常，`creatorTaskVerified/coreInferenceVerified/passed/cleanupCompleted=true`。手机进入已选择cordis的专用会话，真实模型先调用`cordis_inspect_list`，再根据其Host Tool/listTools目录调用`cordis_inspect_query`；两个唯一真实结果与官方日志一致，34个工具包含write及查询工具，手机自己的工具详情显示原结果，不内嵌电脑页面。[查询截图](../../../dsh-mobile/artifacts/official-plugin-only/2c201c6b-b078-453d-a083-35e6d4f2bcc8/creator-host-tools.png)已实际查看。

手机把会话改为仅可查看，模型分别申请专用`creator-allow.mjs`及`creator-reject.mjs`的单次write。两次均先核对待写入目标、官方审批与实际磁盘未变，在自己的工具详情显示待写入源码；允许一次后文件内容与模型参数一致，拒绝后保留原文件且没有新工具重试。每个审批仅对应一个正式结果，工具详情和磁盘证明不是仅显示回复标记。源码具有name/apply声明，只进行`node --check`语法校验，未安装、加载或执行。[允许修改预览](../../../dsh-mobile/artifacts/official-plugin-only/2c201c6b-b078-453d-a083-35e6d4f2bcc8/approval-allow-diff.png)和[拒绝修改预览](../../../dsh-mobile/artifacts/official-plugin-only/2c201c6b-b078-453d-a083-35e6d4f2bcc8/approval-reject-diff.png)已查看；完成后恢复测试文件与会话权限，普通profile及原历史前缀保持。真实文本回复、手机选模、重连/草稿、已有工作区新建和撤销拒绝亦通过。

工具契约来源：[官方工具注册](../../../dsh-mobile/artifacts/official-alpha2-source/packages/extensions/tool-cordis/src/index.ts)、[Host provider](../../../dsh-mobile/artifacts/official-alpha2-source/packages/extensions/tool-cordis/src/providers.ts)及[官方运行器说明](../../../dsh-mobile/artifacts/official-alpha2-source/packages/extensions/cordis-host-runner/README.zh.md)。官方创造模式通过只读目录发现接口，持久插件走正常包管理；旧动态定义路径是另一条能力，仍取消。本次不查询Client、不提供伪造响应；Client检查、插件安装运行、任意工具和其他生命周期没有本轮结论。

[首轮c978c285](../../../backend/artifacts/official-plugin-only/official-android-c978c285-3750-4ae3-89ee-00449779533c.json)及[失败退出记录](../../../backend/artifacts/official-plugin-only/official-android-c978c285-3750-4ae3-89ee-00449779533c.outcome.json)保留，43.09秒退出1。真实工具记录已核对，但完成轮次默认收起，脚本直接等待隐藏的内部行而超时。修正为先点击用户入口展开再查看工具详情，没有修改产品来满足错误定位；失败清理完成，不计成功。最终42轮/611阶段恢复审计通过，原App正常Launcher前台截图已实际查看，原Key仅核对公开已配置/可写状态。

## 普通插件升级与正常重启（2026-10-10）

[真实专项6a93a438](../../../backend/artifacts/official-plugin-only/official-android-6a93a438-32b5-4262-b74a-d91c75294301.json)与[独立退出记录](../../../backend/artifacts/official-plugin-only/official-android-6a93a438-32b5-4262-b74a-d91c75294301.outcome.json)为81.29秒/15个实际Android阶段，Vitest实际退出0，零未捕获、页面及隔离渲染异常，`pluginUpgradeVerified/pluginsVerified/passed/cleanupCompleted=true`。复用官方alpha.2、独立插件0.1.79-latest.0和同一APK；本轮只增加验收与自有测试包，没有产品修改、构建或App安装，没有修改或构建DSH/SDK。

手机经正常管理入口安装和启用自有0.0.5测试包，再覆盖安装0.0.6。[测试包生成](../../../backend/tests/support/official-plugin-upgrade.ts)只修改五文件归档中的manifest版本与客户端两处标题/一处面板标题，新包3,409字节，无安装脚本或运行依赖，Host入口为空；不是上一轮模型写出的Creator源码。新版已安装与官方目录一致，原弹窗刷新消失后，手机从自己的“最近插件操作”读取同一操作编号、完成状态和“重启电脑DSH后生效”真实回执，不重新发送安装。证据见[手机升级操作](../../../dsh-mobile/tests/support/official-plugin-upgrade.mjs)与[分项结果](../../../dsh-mobile/artifacts/official-plugin-only/6a93a438-32b5-4262-b74a-d91c75294301/plugin-upgrade.json)。

仅结束已登记的隔离16958官方进程树，确认旧端口关闭，再用原`pnpm dsh web`启动同一home。launcher由5272变为44660，正常登录/插件状态分别303/200；手机原进程自行恢复，公开目录仍为0.0.6。从新版公开指南入口打开面板，显示“DSHM升级版本0.0.6”，实际计数0→1、零iframe；[新版实际截图](../../../dsh-mobile/artifacts/official-plugin-only/6a93a438-32b5-4262-b74a-d91c75294301/plugin-upgrade-new-runtime.png)已查看。旧标签标题来自保留布局，不要求它随新版指南标题改变，也不把旧标题当成旧代码证据。

随后通过手机正常卸载并等官方目录结算，临时管理权限收回而聊天保留。原草稿、完整历史前缀、其他bundle和普通profile摘要保持；只接受官方重启追加的一条`session/end-seed`及清理权限的`command/run/command/done`，没有新任务、用户消息或原记录改写。[公开契约与清理核对](../../../backend/tests/support/official-plugin-upgrade.ts)及[官方会话重载](../../../dsh-mobile/artifacts/official-alpha2-source/packages/core/session/src/index.ts)为来源。真实文本回复/选模、已有工作区新建、重连草稿和最终设备撤销同时通过。测试设备/UID/中转/映射清理，最终43轮/626阶段恢复检查通过。

三个先行失败保留并不计成功：[077d996a](../../../backend/artifacts/official-plugin-only/official-android-077d996a-5406-42d8-9a91-9d225edc0b9e.json)181.97秒退出1，驱动漏查弹窗刷新后的持久回执，清理断言还只允许旧版本；[受控正常卸载](../../../backend/artifacts/official-plugin-only/plugin-upgrade-cleanup-077d996a-5406-42d8-9a91-9d225edc0b9e.json)另存，原`cleanupCompleted=false`不改写。[2a91b625](../../../backend/artifacts/official-plugin-only/official-android-2a91b625-1a84-4bb5-af93-96fd5f9d8481.json)94.69秒退出1，重启前错误要求旧面板可用，清理通过。[9acb72ea](../../../backend/artifacts/official-plugin-only/official-android-9acb72ea-6e8d-42cd-980c-9935e787d05a.json)106.54秒退出1，错误将已保存标签标题当成新版入口，且清理断言漏掉官方恢复标记；[实际卸载及事件类型检查](../../../backend/artifacts/official-plugin-only/plugin-upgrade-inspect-9acb72ea-6e8d-42cd-980c-9935e787d05a.json)另存，仍保留原失败状态。只修正验收路径和官方事件断言，未改变产品或DSH使错误假设成立。

范围限于正常自有tgz升级、已完成安装的正常重启与新版局部界面。安装正在执行时退出、其他升级来源/安装脚本、未知结果、多端竞争和任意第三方插件仍待验；Creator产出源码的安装执行与Client工具查询没有本轮结论，旧动态运行器仍取消。

## 插件下载取消与电脑退出（2026-10-10）

[真实专项083c85e3](../../../backend/artifacts/official-plugin-only/official-android-083c85e3-e8ac-4726-bc54-d7d6f7501b65.json)与[独立退出记录](../../../backend/artifacts/official-plugin-only/official-android-083c85e3-e8ac-4726-bc54-d7d6f7501b65.outcome.json)为87.52秒/15个实际Android阶段，Vitest退出0，`pluginInterruptionVerified/pluginsVerified/passed/cleanupCompleted=true`，零未捕获、页面及隔离渲染异常。复用官方alpha.2、独立插件0.1.79-latest.0和同一APK，只新增测试驱动，没有产品修改、构建、App安装或DSH/SDK改动。

[外部下载服务](../../../backend/tests/support/official-plugin-download.ts)向官方正常安装器提供两个不同的HTTP地址：已有自有测试包3,453字节，仅发送前32字节并保持连接，分别用于取消和电脑退出。没有替换官方安装函数。手机从自己的管理页发起下载，首个实际运行中点击取消后，HTTP连接关闭；最近操作显示同一编号的“已取消”正式回执。后续观察无新下载，官方目录无该包，普通profile的package.json与pnpm-lock.yaml保持原字节。[取消截图](../../../dsh-mobile/artifacts/official-plugin-only/083c85e3-e8ac-4726-bc54-d7d6f7501b65/plugin-install-cancelled.png)已实际查看。

第二次在下载连接保持时结束已登记的16958隔离官方进程树，确认PNPM子进程和HTTP连接退出、端口关闭，再用原`pnpm dsh web`启动同一home。launcher23276→40520，正常登录/插件状态303/200；手机原进程自行重连，最近操作保留原编号并提示“结果未知”，不提供自动重试按钮，也没有重新下载或安装。普通清单/锁文件未变，官方目录仍无该包。[未知结果截图](../../../dsh-mobile/artifacts/official-plugin-only/083c85e3-e8ac-4726-bc54-d7d6f7501b65/plugin-install-host-unknown.png)、[手机实际路径](../../../dsh-mobile/tests/support/official-plugin-interruption.mjs)和[分项结果](../../../dsh-mobile/artifacts/official-plugin-only/083c85e3-e8ac-4726-bc54-d7d6f7501b65/plugin-interruption.json)独立保存。

随后手机显式发起新的正常本地tgz安装，实际立即启用、720px局部面板缩放、按钮/原弹窗/菜单/状态保留、零iframe和正常卸载均通过。临时管理权收回后聊天保留，原草稿、完整原历史前缀、其他bundle和普通profile保持；真实回复/选模、已有工作区新建、重连和最终设备撤销亦通过。下载服务13239、测试UID、中转及映射均清理，正常官方Host保留、Remote关闭，原App PID4249/安装身份/前台和Key公开状态保持。累计44轮/641阶段恢复审计通过。

[首轮af54072b](../../../backend/artifacts/official-plugin-only/official-android-af54072b-bc8a-4091-a850-2d68858945b9.json)和[失败退出记录](../../../backend/artifacts/official-plugin-only/official-android-af54072b-bc8a-4091-a850-2d68858945b9.outcome.json)保留，74.57秒退出1、清理通过。驱动错误要求冷会话在实例化前已经追加恢复标记。官方[历史读取](../../../dsh-mobile/artifacts/official-alpha2-source/packages/api/session-controller/src/history.ts)与[会话实例化](../../../dsh-mobile/artifacts/official-alpha2-source/packages/core/session/src/index.ts)表明读取冷历史不必创建Agent；[保护断言](../../../backend/tests/support/official-plugin-upgrade.ts)修正为完整前缀保持，只接受零或一条已知`session/end-seed`及权限清理命令，不放行任意消息/任务，最终复验实际有一条恢复标记。没有改变产品或DSH使错误假设成立。

本次仅证明普通tgz尚在下载阶段时的取消、电脑退出后的未知结果与无自动重放，以及后续显式安装仍可用。进入应用阶段、安装脚本、其他来源、App结束、多端竞争和其他安装在途异常仍待验；不包括Creator源码安装执行或任意第三方插件兼容。

## 自有安装脚本审批、取消与失败（2026-10-10）

[完整专项1fa8086f](../../../backend/artifacts/official-plugin-only/official-android-1fa8086f-9b70-4b82-a06e-e61c23725c4d.json)与[实际退出记录](../../../backend/artifacts/official-plugin-only/official-android-1fa8086f-9b70-4b82-a06e-e61c23725c4d.outcome.json)为111.51秒/17个真实Android阶段，Vitest退出0，`pluginScriptsVerified/pluginsVerified/passed/cleanupCompleted=true`，零未捕获、页面及隔离渲染异常。复用官方alpha.2、独立插件0.1.79-latest.0和同一APK，只新增测试和自有fixture，不构建或修改产品、DSH/SDK，不安装App。

[自有六文件测试包与外部控制服务](../../../backend/tests/support/official-plugin-scripts.ts)从已有普通fixture分别生成0.0.7、0.0.8、0.0.9，Host入口仍为空，没有运行依赖。新增Node postinstall只输出测试标记、连接本轮127.0.0.1服务并报告自身PID，不读取环境、凭据或项目文件。三份本地tgz都先经手机正常安装入口取得官方“需要允许安装脚本”结果，脚本零次启动，清单与锁文件保持。手机逐份点击原“允许这些脚本并重试”，不是自动授予任意包或通配规则。[真实审批截图](../../../dsh-mobile/artifacts/official-plugin-only/1fa8086f-9b70-4b82-a06e-e61c23725c4d/plugin-script-approval.png)已查看。

| 专用包 | 实际手机结果及进程/文件核对 |
| --- | --- |
| 0.0.7 | 批准后真实Node脚本PID39600保持HTTP请求；手机执行中取消后连接和脚本进程结束，官方取消提示出现，包未安装，清单/锁文件恢复，无自动重跑。 |
| 0.0.8 | 单独批准后脚本PID25436运行；本机服务返回503使自有脚本退出17，手机显示原安装失败。脚本进程结束，包未安装，清单/锁文件恢复，无自动重试。[失败截图](../../../dsh-mobile/artifacts/official-plugin-only/1fa8086f-9b70-4b82-a06e-e61c23725c4d/plugin-script-failed.png)已查看。 |
| 0.0.9 | 单独批准后脚本PID27532运行；本机服务返回200，官方安装成功、公开目录版本0.0.9。通过原关闭按钮退出结果页，再从手机正常卸载并等官方目录清除。 |

批准标识遵循官方实际pendingBuilds：本地包会带完整`包名@file:相对tgz地址`，不能擅自截成包名或复用另一份归档的授权。来源：[原build审批](../../../dsh-mobile/artifacts/official-alpha2-source/packages/boot/plugin-manager/src/build-approval.ts)、[原安装器](../../../dsh-mobile/artifacts/official-alpha2-source/packages/boot/plugin-manager/src/index.ts)和[手机实际路径](../../../dsh-mobile/tests/support/official-plugin-scripts.mjs)。本轮3个请求/3个不同脚本PID均实际结束，无自动重放；[分项结果](../../../dsh-mobile/artifacts/official-plugin-only/1fa8086f-9b70-4b82-a06e-e61c23725c4d/plugin-scripts.json)独立保存。

官方脚本授权会持久留在profile；测试在安装前保存[非凭据文件基线](../../../backend/artifacts/official-plugin-only/1fa8086f-9b70-4b82-a06e-e61c23725c4d/script-control-baseline.json)，卸载后只移除精确匹配这三份自有归档的批准项，原pnpm-workspace.yaml逐字节恢复，不放行其他规则或未知修改。随后原无脚本0.0.5的显式安装/立即启用、720px局部交互、卸载、管理权收回与草稿保持均通过；真实回复/选模、已有工作区新建、重连和设备撤销同时通过。原完整历史前缀、其他bundle和普通profile保持，只追加测试权限清理命令；本轮没有Host重启。外部14662服务及三个子进程、测试UID、中转、映射和授权清理，45轮/658阶段恢复审计通过，原App PID4249/安装身份/前台和Key公开状态保持。

两次驱动失败保留且不计成功：[39d31563原报告](../../../backend/artifacts/official-plugin-only/official-android-39d31563-e9fa-4259-a6f0-7afcfb8d01f1.json)与[退出记录](../../../backend/artifacts/official-plugin-only/official-android-39d31563-e9fa-4259-a6f0-7afcfb8d01f1.outcome.json)73.79秒退出1，错误只按包名定位审批，清理也漏匹配完整file标识；脚本未运行，原cleanupCompleted=false保留。[单条测试策略受控恢复](../../../backend/artifacts/official-plugin-only/plugin-script-policy-recovery-39d31563-e9fa-4259-a6f0-7afcfb8d01f1.json)另存，恢复前已核对该项只属于本轮。[01821c80报告](../../../backend/artifacts/official-plugin-only/official-android-01821c80-a992-471e-a9d6-efc1c3c16320.json)与[退出记录](../../../backend/artifacts/official-plugin-only/official-android-01821c80-a992-471e-a9d6-efc1c3c16320.outcome.json)118.32秒退出1，已记录三种脚本结果，但误找新安装页不存在的“完成”按钮；原页提供立即启用和关闭，清理通过。只修正测试定位与精确策略恢复，未改变产品或官方规则。

范围限于本机自有tgz和上述Node安装脚本。官方`applying`在PNPM结束后开始，此时原cancelInstall返回too-late；本轮未覆盖该阶段的取消/退出，也未覆盖复杂脚本/更多后代进程、其他来源、App结束或多端竞争。Creator源码安装执行和任意插件兼容仍另验。

## 插件单独启用时的加载与电脑退出（2026-10-10）

[完整专项7ac0c278](../../../backend/artifacts/official-plugin-only/official-android-7ac0c278-439f-4c1c-ab96-61c3f92db15b.json)、[实际退出记录](../../../backend/artifacts/official-plugin-only/official-android-7ac0c278-439f-4c1c-ab96-61c3f92db15b.outcome.json)与[原始Vitest报告](../../../backend/artifacts/official-plugin-only/plugin-activation-vitest-7ac0c278-439f-4c1c-ab96-61c3f92db15b.json)为125.81秒/15个真实Android阶段，退出0，`pluginApplyingVerified/pluginsVerified/passed/cleanupCompleted=true`，零未捕获、页面及隔离渲染异常。复用固定官方alpha.2、独立插件0.1.79-latest.0和同一APK；仅补充验收驱动及自有fixture，无产品修改、构建、App安装或DSH/SDK改动。

范围按实际入口区分：官方“添加插件”先完成安装且保持禁用；手机随后点击“立即启用”。本轮等待的是后一次启用中的真实ESM模块加载，不是`installBundle`自动启用安装的`applying`阶段。两次安装完成与禁用状态均由官方目录核对，启用操作在最近记录中标为“切换插件包”，不能拿它证明安装中取消返回too-late。

[外部控制服务及五文件fixture](../../../backend/tests/support/official-plugin-applying.ts)分别生成唯一包名`@dsh-mobile/activation-finish-7ac0c278`（0.0.10）与`@dsh-mobile/activation-host-7ac0c278`（0.0.11），Host与客户端模块注册标识一并匹配。无安装脚本或运行依赖；Host入口顶层等待只连接本轮127.0.0.1:14663服务并报告PID，不读取环境、Key或项目文件，也不替换官方加载器。完整归档各下载一次后，控制服务保持真实模块请求，以复现加载等待。[手机实际路径](../../../dsh-mobile/tests/support/official-plugin-applying.mjs)与[分项结果](../../../dsh-mobile/artifacts/official-plugin-only/7ac0c278-439f-4c1c-ab96-61c3f92db15b/plugin-applying.json)独立保存。

| 实际入口 | 手机结果与电脑核对 |
| --- | --- |
| 0.0.10安装后单独启用 | Host PID44888实际加载等待，立即启用按钮禁用且aria-busy=true；最近记录保留同一操作8f1dbfb3-fa52-4bdb-a0af-4b042673c1c9并显示电脑正在处理，没有取消入口。外部服务释放模块后，同编号显示正式已完成，官方目录enabled=true，再经手机正常卸载并确认不存在。 |
| 0.0.11安装后单独启用中结束Host | 旧Host PID44888的模块请求未释放时结束已登记的launcher43440进程树，核对旧Host退出、连接与16958端口关闭，再正常pnpm dsh web启动同一home（launcher46652）。手机原进程重连，同一操作246344d5-8c36-49e1-bc41-0245ed9148ef显示无法确认结果，没有自动重试按钮；官方目录显示已保存的0.0.11启用，随后正常卸载。 |

[等待截图](../../../dsh-mobile/artifacts/official-plugin-only/7ac0c278-439f-4c1c-ab96-61c3f92db15b/plugin-activation-pending.png)与[电脑退出后的未知结果](../../../dsh-mobile/artifacts/official-plugin-only/7ac0c278-439f-4c1c-ab96-61c3f92db15b/plugin-applying-host-unknown.png)已实际查看。正常启动会加载已选择的现存bundle（新Host PID40872一次请求），不是重新安装：归档下载数不增加，已保存清单和锁文件与启用等待时原字节一致；2秒观察期间无再次下载安装。未知提示没有被目录读取伪装成原操作成功回执。原弹窗因客户端图更新而刷新消失时，从最近操作继续核对原编号，不重新发送。

随后普通0.0.5的显式安装/启用、720px局部面板缩放、原按钮/弹窗/菜单交互、状态保持、零iframe及卸载通过；临时管理权收回后聊天保留。真实选模/发送/回复、已有工作区新建、重连/原草稿保持及设备撤销同时通过。原完整历史前缀、其他bundle、普通profile和脚本策略字节保持，仅接受已知官方恢复标记。临时服务14663、测试UID、中转、反向映射和授权清理；46轮/673阶段独立恢复审计通过，原App PID4249/安装身份/前台及Key公开状态保持。

四次先行失败保留，均不计成功；原清理均完成：

| 失败轮次与实际退出 | 保留的失败边界 |
| --- | --- |
| [32b193bc报告](../../../backend/artifacts/official-plugin-only/official-android-32b193bc-6b66-48c6-8931-ded213dbae8f.json) / [退出记录](../../../backend/artifacts/official-plugin-only/official-android-32b193bc-6b66-48c6-8931-ded213dbae8f.outcome.json)，88.66秒退出1 | 错把已安装但禁用视为会立即加载；未出现真实模块请求。按官方页面纠正为安装后独立启用，不将短暂安装状态当成模块加载证据。 |
| [529aa3ef报告](../../../backend/artifacts/official-plugin-only/official-android-529aa3ef-9401-453d-ad53-14a989bdbf02.json) / [退出记录](../../../backend/artifacts/official-plugin-only/official-android-529aa3ef-9401-453d-ad53-14a989bdbf02.outcome.json)，89.39秒退出1 | 复用旧包名/入口没有触发自有请求。公开目录可见HMR组件，不能据此说官方没有热加载；缓存原因仍未证明，改用各自独立包名和入口消除测试串扰。 |
| [0cba8957报告](../../../backend/artifacts/official-plugin-only/official-android-0cba8957-1756-4254-8432-427b4e68d281.json) / [退出记录](../../../backend/artifacts/official-plugin-only/official-android-0cba8957-1756-4254-8432-427b4e68d281.outcome.json)，84.72秒退出1 | 已有真实Host请求，但错误要求原按钮一直挂载；客户端图刷新后原弹窗可消失。异步apply回调也不等于加载等待，最终以顶层ESM等待及持久操作记录验证。 |
| [74861eb5报告](../../../backend/artifacts/official-plugin-only/official-android-74861eb5-9439-4811-b11c-a7513c0651d8.json) / [退出记录](../../../backend/artifacts/official-plugin-only/official-android-74861eb5-9439-4811-b11c-a7513c0651d8.outcome.json)，144.56秒退出1 | 15阶段执行但自有fixture仍注册旧客户端模块名，产生两次duplicate factory页面错误，不能计完整通过。只修正fixture的两个注册标识和菜单标识，产品与DSH不变。 |

本轮仅证明上述安装后单独启用、模块加载等待/完成和Host结束后的未知结果/正常启动核对。自动启用安装的`applying`阶段取消/退出、复杂脚本/更多后代进程、其他来源、App结束、多端竞争、Creator源码安装和任意插件兼容仍另验。先前安装脚本章节的未验结论按原范围保留。

## 自动启用安装的应用阶段取消与电脑退出（2026-10-10）

[完整专项51247080](../../../backend/artifacts/official-plugin-only/official-android-51247080-030f-4ecc-a0d4-5249f9ffc2a2.json)、[实际退出记录](../../../backend/artifacts/official-plugin-only/official-android-51247080-030f-4ecc-a0d4-5249f9ffc2a2.outcome.json)与[原始Vitest报告](../../../backend/artifacts/official-plugin-only/plugin-auto-applying-vitest-51247080-030f-4ecc-a0d4-5249f9ffc2a2.json)为138.21秒/16个真实Android阶段，退出0，`pluginApplyingVerified/pluginsVerified/passed/cleanupCompleted=true`，零未捕获、页面及隔离渲染异常。复用固定官方0.2.1-alpha.2、独立插件0.1.79-latest.0和同一APK；只新增测试驱动及三份自有无脚本五文件fixture，没有产品修改/构建/App安装或DSH/SDK改动。[官方发布页](https://github.com/deepseek-ai/deepseek-harness/releases)在本轮仍以该预发布及d743267为最新条目。

入口选择有明确依据：[官方InstallBundleOptions](../../../dsh-mobile/artifacts/official-alpha2-source/packages/boot/plugin-manager/src/types.ts)允许enabled:true且默认启用，但[普通添加界面](../../../dsh-mobile/artifacts/official-alpha2-source/packages/client/ui-plugin-manager/src/client/manager-store.ts)传入false，只有官方目录安装入口携带选择状态。直接协议测试只能证明接口；本轮选择正常安装一个自有控制插件，让手机在DSHM局部插件面板点击“安装并启用”，通过原`ctx.remote.pluginManager.installBundle(spec, { enabled: true, requestId })`发起写入。没有改官方目录或控制器，没有注入调用手机内部函数，也不将该自有按钮说成普通添加页的新功能。

[控制插件与外部真实模块等待](../../../backend/tests/support/official-plugin-applying.ts)包含三个互不重名包：controller 0.0.12、finish 0.0.10及host 0.0.11。控制插件先通过手机普通添加/立即启用，局部面板零iframe。两份目标Host入口用顶层ESM等待本轮127.0.0.1:14663服务；控制界面通过原`plugin-manager/install-state`事件显示真实applying阶段，requestId与本轮源码一致，不伪造阶段。没有安装脚本、运行依赖或环境/Key/项目文件读取。[手机实际路径](../../../dsh-mobile/tests/support/official-plugin-auto-applying.mjs)与[完整分项](../../../dsh-mobile/artifacts/official-plugin-only/51247080-030f-4ecc-a0d4-5249f9ffc2a2/plugin-auto-applying.json)独立保存。

| 在途情况 | 实际结果与保护 |
| --- | --- |
| finish安装自动启用的applying阶段请求取消 | PNPM完成且官方选择bundle后，Host PID40872实际模块请求保持，手机收到原applying事件。自有面板取消收到原RPC `{ok:true,value:{status:'too-late'}}`；DSHM正式最近操作中的“取消此次安装”也显示“插件正在应用，已无法取消，请等待结果。”，同编号仍pending，没有显示已取消。释放模块后，同一安装正式已完成、官方目录enabled=true，随后手机正常卸载。 |
| host安装自动启用的applying阶段结束电脑 | 相同实际阶段/模块等待时结束拥有的launcher46652进程树，确认旧Host PID40872退出、连接和16958端口关闭，再正常pnpm dsh web启动同一home（launcher45332/Host15924）。手机原进程重连，保留原安装编号d96df2e4-e4a1-4e92-9abb-6c2375d3ec59且显示无法确认结果，没有自动重试按钮。原保存的0.0.11在正常启动时加载一次，目录enabled=true，随后手机正常卸载。 |

[原too-late回执](../../../dsh-mobile/artifacts/official-plugin-only/51247080-030f-4ecc-a0d4-5249f9ffc2a2/plugin-auto-applying-raw-too-late.png)、[正式取消提示](../../../dsh-mobile/artifacts/official-plugin-only/51247080-030f-4ecc-a0d4-5249f9ffc2a2/plugin-auto-applying-too-late.png)和[Host退出后的未知结果](../../../dsh-mobile/artifacts/official-plugin-only/51247080-030f-4ecc-a0d4-5249f9ffc2a2/plugin-auto-applying-host-unknown.png)均已实际查看。未知不能因目录已安装变成原成功回执；正常启动已有选择不是再次安装。finish/host目标归档各仅一次完整下载，加载等待至结算/重启核对期间所有归档记录逐项一致，原已选择的清单/锁文件字节不变。控制包另有两次完整请求，均在首份目标加载等待前，具体原因未单独归因；不将此计作目标自动重放，也不声明所有包管理操作只下载一次。

两份目标及控制包全部通过手机正常卸载，原无脚本0.0.5继续通过显式安装/启用、720px局部缩放与按钮/弹窗/菜单/状态保持、零iframe及卸载。临时管理权收回后聊天保留；真实选模/消息/回复、已有工作区新建、重连/原草稿及最终设备撤销同时通过。原完整历史前缀、其他bundle、普通profile和脚本策略字节保持；外部服务、测试UID、中转/映射/授权均清理。47轮/689阶段独立恢复审计通过，原App PID4249/安装身份/前台及Key公开状态保持。

此结论补足前节未覆盖的自有tgz自动启用安装applying取消/Host退出；前节安装后独立启用及四次失败仍保留原范围。没有本轮完整驱动失败。复杂脚本/更多后代进程、其他来源和官方目录组合包、App结束、多端竞争、Creator源码安装或任意插件兼容仍待验。

## 后台任务停止、大输出与断线读取（2026-10-10）

手机停止真实后台任务、断线后显式恢复、缓存缺口提示、双流与分段读取已通过。[原始报告](../../../backend/artifacts/official-plugin-only/official-android-73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe.json)、[手机报告](../../../dsh-mobile/artifacts/official-plugin-only/73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe/android.json)、[专项输出](../../../dsh-mobile/artifacts/official-plugin-only/73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe/background-control.json)、[Vitest](../../../backend/artifacts/official-plugin-only/background-control-vitest-73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe.json)及[真实退出](../../../backend/artifacts/official-plugin-only/official-android-73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe.outcome.json)记录49.62秒/11阶段、退出0；backgroundControlVerified/backgroundVerified/passed/cleanupCompleted=true，零未捕获、页面和隔离渲染异常。固定官方alpha.2、正常CLI、独立插件及同一Android APK，只有验收代码改变，没有产品修改、构建或安装，也没有DSH/SDK修改或构建。

实际模型在专用只读会话中调用两次pwsh，两个jobId/startedAt/owner与原工具回执逐项匹配。一个命令等待自有HTTP门控，另一个通过现有Node原生进程输出1000行中文与emoji、每40行等待250ms，再等待另一门控；没有替换官方执行器、缓存或任务状态。真实手机操作由[手机驱动](../../../dsh-mobile/tests/support/official-background-control.mjs)完成；[外部门控与独立生产中转读者](../../../backend/tests/support/official-background-control.ts)只控制测试命令自身的时机和读取原接口。

| 实际场景 | 原始结果与核对 |
| --- | --- |
| 停止确认与实际终态 | 先取消确认，原任务仍running；再确认停止，原Job状态killed、等待中的实际HTTP连接关闭且未释放，没有执行后续结束标记。手机显示任务已取消，另一个任务仍运行。 |
| 断线期间持续产出 | Host中转关闭后释放大输出命令，实际到达large-finish门控。重连后手机保持原offset314及原文本，须点击重新读取，没有自行续读。 |
| 缺口与UTF-8恢复 | 原共享ring总量436364字节、最早可读174714；独立读者取得261600字节stdout。手机显示真实缺口提示，保留内容逐字节/摘要匹配，中文与emoji正常且无替换字符，缺口标记只有一次。 |
| 双流和共享坐标 | 错误输出与stdout使用同一ring坐标，跨过没有本通道数据的65536字节区间。手机显示缺口前缀及原50字节STDERR_END，与独立stderr读者匹配；不能用本通道字符数替代原共享偏移。 |
| 运行中的历史分段 | 任务实际仍running、输出门控保持时读取四段：65536/65536/65536/64992字节，全部与独立读者匹配。第一段明确lossy，后续无缺口；末段实际显示LINE_0999。跨段UTF-8解码保持，完成前核对避免模型消费后缓存收缩影响。 |
| 自然完成与草稿 | 释放finish后原任务completed、LARGE_END实际可见，手机取消任务仍已取消。最终共享总量436400字节；原配置/只读权限/历史前缀保持，草稿保留，任务命令未重放。本成功轮最终核对时额外job_output为0；其他轮原模型正常查询不等于重新执行pwsh。 |

[停止提示](../../../dsh-mobile/artifacts/official-plugin-only/73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe/background-control-stopped.png)、[实际缺口提示](../../../dsh-mobile/artifacts/official-plugin-only/73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe/background-control-gap-resumed.png)、[末段中文与emoji](../../../dsh-mobile/artifacts/official-plugin-only/73bb9e74-e86e-4aa7-9ed4-af4ca458f8fe/background-control-history-end.png)和恢复后的原App前台已实际查看。临时端口11066、测试UID、中转/映射及设备授权清理，普通profile字节保持。独立恢复审计累计48个成功专项/700阶段；八次失败不计入成功数量。

本轮保留八次完整驱动失败：[独立原任务及清理核对](../../../backend/artifacts/official-plugin-only/background-failure-cleanup.json)实际确认所有原任务已终止、服务器关闭、授权撤销、原App身份保持；第2次原清理失败不改写为成功。恢复读者早于当前测试结束运行的一次核对因远程连接仍开启退出1，修正调用时机后重新核对，不放宽关闭断言；诊断脚本的两次缺失marker异常也保持工具原输出，最后使用驱动定义的确定标记。

| 原失败报告 | 原因与本次处理 |
| --- | --- |
| [3cb2f426](../../../backend/artifacts/official-plugin-only/official-android-3cb2f426-7641-4237-8d3d-c2f81a16fab3.json) | 测试配置基线捕获早于通用手机选模；改为实际选模完成后保护，不改配置行为。 |
| [e41b76fd](../../../backend/artifacts/official-plugin-only/official-android-e41b76fd-b07e-402c-bc9d-7e9a5f30ab70.json) | 离线元素定位匹配两处；限定输出窗口。原清理完成标记false另保留，关闭响应后等待实际close并独立核对原任务终态。 |
| [a01c92de](../../../backend/artifacts/official-plugin-only/official-android-a01c92de-95ec-4a6f-909c-c06fd34cc3f1.json) | 独立中转读者也处于Host离线，不能读原输出；改为恢复连接后、手机显式重读前核对。 |
| [0021bb5d](../../../backend/artifacts/official-plugin-only/official-android-0021bb5d-0f86-4b1d-aa2d-65be50ad5bca.json) | 突发生产先越过原Shell缓存，原job/follow有producerGap且总量362200；改为测试命令分批产出，不扩大官方缓存。 |
| [7225daac](../../../backend/artifacts/official-plugin-only/official-android-7225daac-3ae2-48fc-9350-abe7387caa27.json) | 原输出文件就是GBK字节，emoji已变问号，手机与原缓存匹配但UTF-8目标失败；不把它说成传输损坏。 |
| [0828e3d0](../../../backend/artifacts/official-plugin-only/official-android-0828e3d0-e072-48f9-ba48-ecb4e46bc43c.json) | 本机受限PowerShell禁止.NET流方法，UTF-8生产夹具未成功；改为正常执行现有Node生成字节，不修改安全策略。 |
| [27c7deb6](../../../backend/artifacts/official-plugin-only/official-android-27c7deb6-35f4-4689-918b-d76c019ad949.json) | 测试遗漏stderr的共享ring缺口前缀；按原lossy标记核对前缀与原数据，不删用户提示。 |
| [8231238e](../../../backend/artifacts/official-plugin-only/official-android-8231238e-b841-4561-bcce-065fc86a48d0.json) | 原模型完成通知后实际调用job_output，测试错误要求全部工具只有两次。现仅要求两个原pwsh命令不重放；其他工具只允许查询这两个原jobId。原缓存消费后收缩到尾部，故完整分段移到运行中稳定门控阶段，完成后只核对实际保留内容与终态。 |

[原生产编码诊断](../../../backend/artifacts/official-plugin-only/background-producer-diagnosis.json)保留原文件摘要、非UTF-8字节和受限语言错误：官方UTF-8前导本机同样被拒绝。本次Node来源只证明已知UTF-8字节的真实传输，不证明所有PowerShell命令编码正常，也不提供错误编码猜测修复。原Shell约64000字节观察缓存、Job运行中约256KiB共享缓存及完成消费后收缩是公开接口的边界；丢失内容不会由手机还原或自动重跑命令。

其他生产者/编码、停止请求在途及多端竞争、App结束/Host结束的任务读取生命周期仍待验，前台精确实时输出仍不交付。当前结论仅补足alpha.2中上述普通后台pwsh来源与读取场景，不扩大为任意任务、无限历史或所有异常恢复。

## 后台任务中的App结束与恢复（2026-10-10）

[完整驱动报告](../../../backend/artifacts/official-plugin-only/official-android-aa19d525-8379-4833-b501-32d87e956731.json)、[实际退出记录](../../../backend/artifacts/official-plugin-only/official-android-aa19d525-8379-4833-b501-32d87e956731.outcome.json)、[原Vitest回执](../../../backend/artifacts/official-plugin-only/background-process-vitest-aa19d525-8379-4833-b501-32d87e956731.json)、[手机阶段](../../../dsh-mobile/artifacts/official-plugin-only/aa19d525-8379-4833-b501-32d87e956731/android.json)及[任务与进程原证据](../../../dsh-mobile/artifacts/official-plugin-only/aa19d525-8379-4833-b501-32d87e956731/background-control.json)独立保存。专项范围为 `phone-background-output-app-process-death-running-and-settled-recovery`，同一官方驱动显式启用 `DSHM_OFFICIAL_JOB_PROCESS_CHECK=1`；与前节中转断线开关互斥，不把两种恢复合并成同一次测试。

固定未修改官方0.2.1-alpha.2、正常 `pnpm dsh web`、独立插件0.1.79-latest.0、生产配对/鉴权/中转与原测试APK，完整驱动首次运行65.81秒、12个实际Android阶段退出0；`backgroundProcessVerified/backgroundControlVerified/backgroundVerified/passed/cleanupCompleted=true`，零未捕获、页面或隔离渲染异常。手机真实核心选模、同会话消息和模型回复、已有工作区新建、重连/草稿及撤销拒绝同时核对，背景输出结果以下表的实际任务和进程为准。

| 原任务状态与手机操作 | 实际核对 |
| --- | --- |
| 原任务运行时结束自己的测试App | PID19797结束且不存在；同一个原job仍running，并在App已结束期间继续产生已知UTF-8输出。正常Launcher重开至新PID20201，重新进入DSHM自有Remote页面，恢复原会话和草稿；原任务仍运行。 |
| App结束期间原任务完成 | PID20201结束且不存在；释放原命令的完成门控后，独立生产读者确认原job实际completed，期间App没有进程。连续3秒只检查本测试UID的 `dshm.remote.notice.` 通知键，始终为0；正常Launcher重开至PID20694后，原任务显示completed、另一个已停止任务仍cancelled，原会话及草稿保持。 |

两个恢复都没有iframe或自动弹出输出窗口；用户明确点击原任务的“查看实时输出”后才读取原官方缓存。原共享ring436364字节、最早174714，保留stdout261600字节；运行中四段65536/65536/65536/64992字节与独立生产中转读者逐段/摘要一致，真实缺口、stderr共享坐标、中文与emoji保持。第二次恢复读取最终436400字节的原终态和仍保留的stdout261636字节，结束标记实际可见；最终独立核对未出现额外job_output，两个原pwsh命令没有重放。普通profile、只读权限、原历史前缀与草稿均保持。

本节不宣称App结束后保留内存中的输出读取位置。重新打开输出窗口按原接口重新读取仍保留的缓存；前节只有同一App进程内的中转断线才证明已读位置保留。电脑任务与App进程独立，手机结束不等于停止电脑任务；“没有推送”只覆盖上述实际任务结算及3秒观察窗，不扩大为所有通知类型或所有Android回收策略。

[运行中恢复后的缺口](../../../dsh-mobile/artifacts/official-plugin-only/aa19d525-8379-4833-b501-32d87e956731/background-control-gap-resumed.png)、[末段中文与emoji](../../../dsh-mobile/artifacts/official-plugin-only/aa19d525-8379-4833-b501-32d87e956731/background-control-history-end.png)、[App已结束期间完成后的读取](../../../dsh-mobile/artifacts/official-plugin-only/aa19d525-8379-4833-b501-32d87e956731/background-process-settled-restored.png)以及恢复后的原App前台均实际查看。只新增或调整自有验收驱动与独立恢复断言；没有产品修改、构建、App安装，也没有DSH/SDK修改或构建。本轮没有新增失败；前节八次失败和原PowerShell受限编码问题保留，不将已知UTF-8的Node来源扩大为任意命令编码正常。

[独立恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-final-restoration.json)累计49个成功专项/712阶段，原App PID4249、安装身份/前台、Key公开状态、绑定和历史保持，16958正常官方Host launcher45332保留且远程连接关闭；门控10871及前节临时端口、测试UID、中转/映射和授权均清理。其他生产者/编码、停止请求在途、多端竞争、Host结束及其他App生命周期仍待验，前台精确实时输出仍不交付。

## 后台任务中的电脑退出与恢复（2026-10-10）

专项 `822ec274-76df-46e1-879f-2b0a1dacab6a`，范围 `phone-background-host-exit-running-and-completed-output-loss-and-no-replay`，经过真实模型、生产配对鉴权中转、未修改的官方 `0.2.1-alpha.2` 正常 `pnpm dsh web`、独立插件 `0.1.79-latest.0` 与现有真实Android，完整退出0（66.90秒/10阶段）。本轮仅新增或调整自有验收驱动与恢复断言，没有产品修改、构建或App安装，没有DSH/SDK修改、构建或启动注入。

真实模型分别只调用一次原pwsh后台命令。运行中退出时，原任务确为running，BEGIN已从官方缓存读到；受控结束自己隔离Host的进程树后，真实生产连接关闭，未释放完成门控。另一任务先由原命令完成，官方completed、BEGIN/END及72字节文本摘要与手机显示核对，再结束Host。两次均正常官方启动：launcher25412→49788→43816，登录303/插件200且任务代次分别更新；手机测试进程PID22589始终保持。

两次离线均提示并暂停读取；重连后旧输出窗口显示“任务已变化，请返回任务列表重新查看。”，实际点击重新读取仍拒绝。生产协议的旧代次read/stop均返回 `remote_job_stale`，新代次查询原任务返回 `remote_job_missing`，手机显示“当前没有后台任务。”。官方任务目录和输出ring保存在Host内存，进程退出后不能继续读取；手机窗口先前已读取的内容仍可见，不等于电脑缓存继续保留。聊天历史前缀、原回复、草稿、只读权限和普通profile字节保持，两个原命令没有重放；不能把被中断的任务伪标为completed/cancelled，也不承诺电脑重启后恢复后台命令。

原始证据：[后端](../../../backend/artifacts/official-plugin-only/official-android-822ec274-76df-46e1-879f-2b0a1dacab6a.json)、[实际退出](../../../backend/artifacts/official-plugin-only/official-android-822ec274-76df-46e1-879f-2b0a1dacab6a.outcome.json)、[原Vitest](../../../backend/artifacts/official-plugin-only/background-host-vitest-822ec274-76df-46e1-879f-2b0a1dacab6a.json)、[手机步骤](../../../dsh-mobile/artifacts/official-plugin-only/822ec274-76df-46e1-879f-2b0a1dacab6a/background-host.json)。已实际查看[运行中退出的旧输出提示](../../../dsh-mobile/artifacts/official-plugin-only/822ec274-76df-46e1-879f-2b0a1dacab6a/background-host-running-output-stale.png)、[运行中恢复列表](../../../dsh-mobile/artifacts/official-plugin-only/822ec274-76df-46e1-879f-2b0a1dacab6a/background-host-running-restored.png)、[完成后退出的旧输出提示](../../../dsh-mobile/artifacts/official-plugin-only/822ec274-76df-46e1-879f-2b0a1dacab6a/background-host-settled-output-stale.png)和[完成后恢复列表](../../../dsh-mobile/artifacts/official-plugin-only/822ec274-76df-46e1-879f-2b0a1dacab6a/background-host-settled-restored.png)。测试入口为[实际Host门控](../../../backend/tests/support/official-background-host.ts)、[实际手机操作](../../../dsh-mobile/tests/support/official-background-host.mjs)和[实际进程退出runner](../../../backend/scripts/run-official-background-host-check.mjs)。

两次失败原件均保留，不计成功阶段：[2b883974](../../../backend/artifacts/official-plugin-only/official-android-2b883974-70bc-4888-ab8f-cee69aa48e70.json)因页面和输出窗口的两个离线提示误触严格定位，清理又在已关闭中转后读取而超时，原cleanupCompleted=false不改写；[58f6fdfb](../../../backend/artifacts/official-plugin-only/official-android-58f6fdfb-9e6a-44ad-b6e9-258d6db32986.json)已执行两次Host退出，但回复定位误匹配思考内容引用的标记，原退出1/cleanupCompleted=true保留。修正自有定位与收尾后整轮重跑通过。[失败后的独立恢复核对](../../../backend/artifacts/official-plugin-only/background-host-failed-attempts-restoration.json)确认11517/9520连接拒绝、测试设备撤销与环境恢复，不用后续成功覆盖原失败。

独立恢复审计累计50个成功专项/722个真实Android阶段通过；本轮门控9915及测试UID/中转/映射/授权清理，原App PID4249/安装摘要/正常Launcher前台、Key公开状态、绑定和历史保持。官方原文件与只读源码摘要保持，16958正常官方Host launcher43816保留且远程连接关闭。本节只证明普通pwsh的运行中与完成后两种Host退出，其他来源/编码、停止在途、多端竞争、其他Host/App生命周期另验；前节受限PowerShell编码问题不变，前台精确实时输出仍不交付。

## 后台停止发送断线与两端同时请求（2026-10-10）

手机停止原普通pwsh后台任务的三个真实场景已验：请求转发前断线、正式回执丢失、两条连接同时停止。[修正后原报告](../../../backend/artifacts/official-plugin-only/official-android-7fba3ad2-6a05-4a45-b3cb-05dc98becf2a.json)、[实际退出](../../../backend/artifacts/official-plugin-only/official-android-7fba3ad2-6a05-4a45-b3cb-05dc98becf2a.outcome.json)、[原Vitest](../../../backend/artifacts/official-plugin-only/background-stop-vitest-7fba3ad2-6a05-4a45-b3cb-05dc98becf2a.json)及[手机操作证据](../../../dsh-mobile/artifacts/official-plugin-only/7fba3ad2-6a05-4a45-b3cb-05dc98becf2a/background-stop.json)记录48.775秒/11阶段、退出0，范围为phone-background-stop-before-forward-receipt-loss-two-connections-and-settled-notice。backgroundStopVerified/passed/cleanupCompleted=true，零未捕获、页面及隔离渲染异常。固定未修改官方alpha.2正常CLI、独立插件0.1.79-latest.0与新自有测试APK；没有修改或构建DSH/SDK、插件或后端产品。

[外部传输控制](../../../backend/tests/support/official-job-stop-transport.ts)只切断精确原会话/jobId/startedAt/generation的真实生产停止请求或回执，不生成成功、终态或鉴权数据。[真实后台来源](../../../backend/tests/support/official-background-stop.ts)让模型调用原pwsh(run_in_background=true)，三个ASCII命令各一次、原HTTP来源各连接一次；生产鉴权、票据、WebSocket和Job服务完整保留。[Android驱动](../../../dsh-mobile/tests/support/official-background-stop.mjs)实际点击任务停止和确认，使用同一App进程PID25189，不注入界面状态。

- 转发前断线：请求未到电脑，原任务与生产连接仍运行；手机显示结果未确认、离线时没有可用停止按钮。重连保持原任务running，仍只有原一次未转发请求；用户在手机明确重新确认后才发送第二次，真实终态killed、来源关闭。
- 正式回执丢失：电脑实际接收停止并返回requested，但手机未收到；原任务已killed。重连读取同一任务真实终态后显示“任务已取消。”，旧未确认提示消失；只有一次停止请求，不自动重发。
- 两端同时停止：手机及另一条已批准生产连接的两份原请求同时释放，两个不同桥接连接分别得到requested和already-stopping，只有一次首次停止。手机处理中按钮不可重复点击，随后原任务killed、来源关闭；不把already-stopping当作第二次执行命令。

三个场景均核对原BEGIN而没有后续END、完整历史前缀/普通profile字节/只读权限/原会话和草稿保持、原命令没有重跑。三个终态提示与原任务相符；设备撤销、原任务收尾和外部代理/来源/中转关闭。门控11506及此前通过门控10671均由独立恢复脚本核对关闭。实际查看[转发前未知提示](../../../dsh-mobile/artifacts/official-plugin-only/7fba3ad2-6a05-4a45-b3cb-05dc98becf2a/background-stop-before-forward-unknown.png)、[回执丢失后真实终态提示](../../../dsh-mobile/artifacts/official-plugin-only/7fba3ad2-6a05-4a45-b3cb-05dc98becf2a/background-stop-after-receipt-settled.png)和[同时停止后的提示](../../../dsh-mobile/artifacts/official-plugin-only/7fba3ad2-6a05-4a45-b3cb-05dc98becf2a/background-stop-race-settled.png)。

此前[55149a5a协议专项](../../../backend/artifacts/official-plugin-only/official-android-55149a5a-ed30-4455-8488-66044e1a2756.json)44.428秒/11阶段实际通过，但[原终态截图](../../../dsh-mobile/artifacts/official-plugin-only/55149a5a-ed30-4455-8488-66044e1a2756/background-stop-after-receipt-settled.png)发现“未确认”提示未更新，不能将其算作该提示修复的证据。[RemoteJobs](../../../dsh-mobile/src/ui/RemoteJobs.jsx)原catch只保存错误文字；现在同时保存原任务身份，仅收到该任务真实结束状态时更新提示，不推测终态。[内部迭代记录](../../../docs/iteration-history/dshm.md)已更新。只增量构建自己的Web/App并安装自己的officialtest UID，assembleDebug/lintDebug实际退出0；新APK13,360,021字节、SHA256 1dad86ac687c87d3b693b3927464f924f37a1120d15b8bd3dad5e7a786c8c638。旧APK和收据已归档，[构建收据](../../../dsh-mobile/artifacts/official-alpha2-android-build/background-stop-notice-build.json)保留三次启动参数/环境错误及随后正式成功，没有放宽版本守卫。原用户App未替换。

同一新APK的[最终核心回归](../../../backend/artifacts/official-plugin-only/official-android-cdb7cd85-053e-4fec-8647-eed6f2ceff69.json)及[实际退出](../../../backend/artifacts/official-plugin-only/official-android-cdb7cd85-053e-4fec-8647-eed6f2ceff69.outcome.json)39.765秒/10阶段退出0：已有工作区/历史、手机选模同步电脑、同会话真实回复、实际write允许一次与拒绝不写入、重连/草稿、已有工作区新会话及撤销后拒绝均通过。各测试outcome的productsBuilt/appInstalled=false只表示该测试本身复用产品；不能据此说本轮未构建App。其他历史扩展专项没有因这次App改动全部重跑。

首轮[46d4ea21失败报告](../../../backend/artifacts/official-plugin-only/official-android-46d4ea21-5b3f-4f34-a32d-6ca3f94e735e.json)及[真实退出](../../../backend/artifacts/official-plugin-only/official-android-46d4ea21-5b3f-4f34-a32d-6ca3f94e735e.outcome.json)45.132秒退出1：真实请求未送达和未知提示已成立，断言错误要求离线时停止按钮disabled，而实际入口隐藏。只修正自有断言允许“隐藏或不可用”，原失败/cleanupCompleted=true保留，不计成功阶段。[独立失败收尾](../../../backend/artifacts/official-plugin-only/background-stop-failed-attempt-restoration.json)核对失败门控15897连接拒绝、原报告摘要与完整恢复，不重写原件。

范围只限上述普通pwsh任务的三种停止场景。其他生产者/编码、其他停止与完成竞态、多端其他操作及其他Host/App生命周期另验；原受限PowerShell编码边界保持，不承诺所有后台任务或插件兼容，也不交付前台精确实时输出。

## 会话日志导出与系统保存（2026-10-10）

固定未修改官方 `0.2.1-alpha.2`、独立插件 `0.1.79-latest.0`、正常 `pnpm dsh web`/16958/launcher43816 与真实 Android 的专项 `534cadbd-053f-41b5-997a-723fe3c1d38c` 实际退出0，86.395秒、14阶段。复用现有APK `1dad86ac687c87d3b693b3927464f924f37a1120d15b8bd3dad5e7a786c8c638` 和所有产品；本轮仅新增验收与修正审计，没有修改或构建DSH/SDK、插件、App或后端产品，没有重新安装App。

手机从DSHM自有会话选项进入“导出会话日志”，默认不勾选子会话，再单独勾选导出。通过真实系统文件选择上传的453417字节附件含中文与emoji；原官方根会话83条事件、真实子会话37条事件及唯一附件引用由公开历史独立核对。默认ZIP387425字节只包含原 `session.v4.jsonl` 和附件；勾选后的ZIP417389字节另外包含 `subagents/<原childId>/session.v4.jsonl`。两次归档均超过四块65536字节的资源窗口，走原生产转发与ACK。保存到Android实际“下载”目录后读取物理文件，分别核对原根/子会话全部事件、附件原字节/摘要和准确条目集合，并与正常官方HTTP `/api/session.export` 的独立导出逐条解包内容匹配。手机归档与独立新导出的整包摘要不同，结论是解包条目字节匹配，不能称两份ZIP容器字节相同。

第三次实际打开系统保存窗口后返回取消，手机显示“已取消导出”，没有成功提示；私有下载暂存为空，草稿、原根/子会话完整历史和普通profile字节保持，无提示词重发、无电脑Web iframe。真实上传来源和两份手机保存副本先核对摘要再清理；独立收尾再次确认六个成功/失败测试目标均不存在。原生 `RemoteSaveJournal` 正常结算会删除待确认文件并留下空目录，审计必须确认目录不存在或确实为空，不能把空目录当作未清理。

首轮 `829cff1d-4181-4c9f-8336-535301298f6c` 实际退出1/59.950秒：测试在常规手机选模之前冻结profile，误把已授权模型切换当作导出修改。只将基线移到正式导出前，原失败及原 `cleanupCompleted=true` 保留，失败不计成功。首次汇总审计又因“目录必须不存在”断言退出1；按原生结算代码修正为不存在或空目录后，54轮/768阶段独立审计退出0。未把这两次测试问题记作产品修复，也未覆盖失败原件。

证据与真实入口：

- [原专项报告](../../../backend/artifacts/official-plugin-only/official-android-534cadbd-053f-41b5-997a-723fe3c1d38c.json)、[终态与耗时](../../../backend/artifacts/official-plugin-only/official-android-534cadbd-053f-41b5-997a-723fe3c1d38c.outcome.json)、[实际Vitest结果](../../../backend/artifacts/official-plugin-only/session-export-vitest-534cadbd-053f-41b5-997a-723fe3c1d38c.json)。
- [手机逐项记录](../../../dsh-mobile/artifacts/official-plugin-only/534cadbd-053f-41b5-997a-723fe3c1d38c/session-export.json)、[默认ZIP](../../../dsh-mobile/artifacts/official-plugin-only/534cadbd-053f-41b5-997a-723fe3c1d38c/session-export-root.zip)、[包含子会话ZIP](../../../dsh-mobile/artifacts/official-plugin-only/534cadbd-053f-41b5-997a-723fe3c1d38c/session-export-descendants.zip)。
- [默认保存截图](../../../dsh-mobile/artifacts/official-plugin-only/534cadbd-053f-41b5-997a-723fe3c1d38c/session-export-root.png)、[子会话保存截图](../../../dsh-mobile/artifacts/official-plugin-only/534cadbd-053f-41b5-997a-723fe3c1d38c/session-export-descendants.png)、[系统取消截图](../../../dsh-mobile/artifacts/official-plugin-only/534cadbd-053f-41b5-997a-723fe3c1d38c/session-export-cancelled.png)均实际查看。
- [首轮失败原报告](../../../backend/artifacts/official-plugin-only/official-android-829cff1d-4181-4c9f-8336-535301298f6c.json)、[失败终态](../../../backend/artifacts/official-plugin-only/official-android-829cff1d-4181-4c9f-8336-535301298f6c.outcome.json)、[独立失败收尾与审计修正记录](../../../backend/artifacts/official-plugin-only/session-export-failed-attempt-restoration.json)。
- [公开历史/独立HTTP核对](../../../backend/tests/support/official-session-export.ts)、[手机实际系统操作](../../../dsh-mobile/tests/support/official-session-export.mjs)、[独立恢复断言](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)、[插件原转发](../../src/session-export.ts)、[手机原导出窗口](../../../dsh-mobile/src/ui/RemoteSessionExport.jsx)、[原生保存结算](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteSaveRecovery.kt)。

原App正常Launcher前台/PID4249/安装摘要保持，不读原Key、不替换绑定或历史；测试UID停止、中转/映射/授权清理，16958原Host继续运行且远程关闭。两版官方包与只读d743267源码摘要保持。本专项只证明当前三个导出场景和一个真实子会话/附件，不替代其他格式、多层后代、运行中导出、传输断线、Host/App结束、其他保存provider或成功回执竞态；消息与会话反馈由下节独立专项另证。

## 消息与会话反馈及本机日志出口（2026-10-10）

固定未修改官方 `0.2.1-alpha.2`、独立插件 `0.1.79-latest.0`、正常 `pnpm dsh web`/16958 与真实 Android 的专项 `5b1d9f0b-f688-4625-8f42-ff6e4e695c17` 实际退出0，53.288秒、15阶段。复用当前APK `1dad86ac687c87d3b693b3927464f924f37a1120d15b8bd3dad5e7a786c8c638` 和全部产品，只补充验收，没有修改或构建DSH/SDK、插件、App或后端产品，没有重新安装App。

手机通过自己的聊天页面和官方局部反馈组件操作真实模型回复。消息与会话反馈弹窗取消均无新增事件；手机提交“任务结果”好评及指定测试备注后，独立正常官方HTTP读取核对原消息id与版本。另一条正常官方HTTP请求将它更新为差评，手机没有点击或悬停就自动显示新状态；旧版本的HTTP写入明确返回 `version-conflict`，没有新增事件。手机随后撤回差评；电脑侧重新好评，真实停用/重连后仍显示同一评价并保留草稿，不重复提交；电脑侧删除评价也自动同步。此处电脑侧证据是公开HTTP请求，不声称已操作桌面浏览器的反馈按钮，也不替代手机在途同时提交的冲突界面测试。

最后手机从“Remote选项”进入原会话反馈弹窗，提交“产品功能与交互”及指定备注。原会话只增加六条准确反馈事件：seq35/36的好评/差评put、seq37撤回、seq38重新好评、seq39删除及seq40的唯一 `feedback/record`；事件身份、评级、类别和备注逐项核对。各阶段原非反馈记录、模型/权限、普通profile字节保持，反馈不会重新调用模型或执行任务。会话反馈的成功回执只表示官方日志已接收追加，不作为持久落盘保证。

依据[官方配置](../../../dsh-mobile/artifacts/official-alpha2-source/packages/bundle/base/cordis.patch.yml)，测试临时以正常CLI的 `DSH_TELEMETRY_OTLP_URL` 和 `DSH_TELEMETRY_MODE=FEEDBACK_ONLY` 指向 `http://127.0.0.1:10508/v1/logs`。首次反馈前没有该测试会话的遥测；实际收到1份OTLP请求、41条该会话事件元数据，其中准确包含六条反馈事件，拒绝数0。实际请求正文在解析后丢弃，没有保存日志正文/身份或向外转发。这个本机出口只用于验收，不改变产品默认反馈目的地；反馈可能授权官方配置的日志上传，不能把它描述成仅本地标记。

验收前正常Host launcher43816受控退出，本机反馈测试使用正常launcher38500，结束后该进程树退出并恢复未加测试环境覆盖的正常launcher23704；原普通profile字节保持，临时收集器关闭。55轮/783阶段的独立恢复核对另行重新读取原证据和元数据，并实际确认10508/中转端口停止、测试授权/映射清理、原App PID4249及前台/安装摘要/Key公开状态/绑定/历史保持、16958正常Host继续运行且远程关闭，两版官方原文件和只读源码保持。

原始证据与入口：

- [后端范围及原事件](../../../backend/artifacts/official-plugin-only/official-android-5b1d9f0b-f688-4625-8f42-ff6e4e695c17.json)、[真实退出](../../../backend/artifacts/official-plugin-only/official-android-5b1d9f0b-f688-4625-8f42-ff6e4e695c17.outcome.json)、[原Vitest](../../../backend/artifacts/official-plugin-only/feedback-vitest-5b1d9f0b-f688-4625-8f42-ff6e4e695c17.json)、[手机反馈步骤](../../../dsh-mobile/artifacts/official-plugin-only/5b1d9f0b-f688-4625-8f42-ff6e4e695c17/feedback.json)、[只保留元数据的实际收集记录](../../../backend/artifacts/official-plugin-only/feedback-collector-5b1d9f0b-f688-4625-8f42-ff6e4e695c17.json)。
- 已实际查看[手机好评](../../../dsh-mobile/artifacts/official-plugin-only/5b1d9f0b-f688-4625-8f42-ff6e4e695c17/feedback-phone-positive.png)、[电脑差评自动同步](../../../dsh-mobile/artifacts/official-plugin-only/5b1d9f0b-f688-4625-8f42-ff6e4e695c17/feedback-desktop-negative.png)、[会话反馈后原会话](../../../dsh-mobile/artifacts/official-plugin-only/5b1d9f0b-f688-4625-8f42-ff6e4e695c17/feedback-session-recorded.png)和[恢复后的原App前台](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-original-foreground.png)。
- [实际HTTP/OTLP核对](../../../backend/tests/support/official-feedback.ts)、[手机实际操作](../../../dsh-mobile/tests/support/official-feedback.mjs)、[正常CLI进程管理](../../../backend/tests/support/official-host-lifecycle.ts)、[独立恢复断言](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)、[原官方消息反馈服务](../../../dsh-mobile/artifacts/official-alpha2-source/packages/feedback/message-feedback/src/index.ts)、[原官方局部反馈界面](../../../dsh-mobile/artifacts/official-alpha2-source/packages/client/ui-message-feedback/src/client/MessageFeedbackActions.tsx)。

本专项只证明当前热会话的上述反馈、自动同步和重连，以及本机实际日志出口。冷存档/分支会话、其他类别/超长备注、手机在途同时写入、提交断线/回执丢失、Host/App结束与官方外部出口另验；此前导出及核心保持各自固定范围，没有在本轮全部重跑，任务继续进行。

## 历史会话反馈、分支隔离与电脑重启（2026-10-10）

固定未修改官方 `0.2.1-alpha.2`、独立插件 `0.1.79-latest.0`、正常 `pnpm dsh web`/16958和真实Android，专项 `15957f77-42aa-43e2-88e6-2ca17b5451a8` 实际退出0，111.33秒/16阶段。复用当前APK及全部产品，只增加验收；没有修改或构建DSH/SDK、插件、App或后端产品，没有重新安装App。

手机好评并归档真实两轮聊天后，受控结束本项目的正常官方Host并正常启动。独立公开历史先确认原评价仍在，再通过官方HTTP将最后一条回复改为差评；公开目录的 `agentAvailable=false`、原非反馈记录及配置保持，证明这次冷历史读写没有创建Agent或启动模型。手机随后从“查看已归档聊天”打开原会话，实际显示同一差评版本并可撤回，原草稿保持；取消归档后再提交好评。读取公开历史与手机打开会话是不同路径：正常手机follow可恢复Session并追加一条官方 `session/end-seed`，不将它算作重复消息。

第一条真实回复的父评价在第二轮之前写入，因此实际默认完成边界分支包含它的原事件。原继承消息逐项相同，但子会话评价列表为空；手机在子会话提交差评，父会话仍为好评。独立HTTP删除父评价后，子评价保持；手机来回切换父/子会话，评级和草稿各自保持。第二次正常Host重启时仍选中子会话，恢复相同原评价版本、原草稿及同一手机PID32410；手机撤回子评价后，父会话较早回复的原好评不变。父会话六条反馈seq21/36/37/39/40/41、子会话自己的put/delete seq43/45逐项核对，继承事件不能被当作子会话自己的评价。

各阶段普通profile原字节、模型/权限和原消息/工具记录保持，没有额外模型任务；两次恢复只允许已核验的官方结束种子记录。正常测试Host launcher46356→49120→11848，最终恢复默认启动环境的正常launcher32812；当前远程连接关闭、测试授权/中转/映射清理。实际本机18879收集器收到4请求/207条事件元数据，包含父/子会话准确反馈；跨正常重启及冷提交可能重复上传历史前缀，不等于重复写入评价。正文解析后丢弃，不保存正文/身份或向外转发，收集器已关闭。两个重启都在相关日志实际送达后执行，本结论不保证未送达的异步队列跨退出保存。

失败原件保持：[首轮65.683秒](../../../backend/artifacts/official-plugin-only/official-android-89f0b7a5-5177-4583-afd6-42e4304fbe8f.outcome.json)在“正在读取聊天记录”时过早检查按钮，已实际查看原截图，只修测试等待真实回复和反馈按钮。另轮[118.561秒](../../../backend/artifacts/official-plugin-only/official-android-84513f1e-7bff-4b73-8a8a-e1bab53656e3.outcome.json)的手机隔离/恢复已到达，但强停前父反馈seq39–41尚未送达，最终OTLP断言失败；官方按新提交触发捕获，普通重启不会主动重新提交旧评价。后续仅调整验收时序，先确认实际上传批次再重启，没有更改官方上传策略。两轮均清理完成，原件摘要与端口关闭由[独立失败恢复审计](../../../backend/artifacts/official-plugin-only/feedback-history-failed-attempts-restoration.json)核对，不计成功。类型检查曾误用pnpm触发后端依赖预处理，已立即中止并恢复12个原目录；改用原Node/TypeScript入口检查，不重装或构建官方DSH。

原始证据：[后端原事件与恢复](../../../backend/artifacts/official-plugin-only/official-android-15957f77-42aa-43e2-88e6-2ca17b5451a8.json)、[实际退出](../../../backend/artifacts/official-plugin-only/official-android-15957f77-42aa-43e2-88e6-2ca17b5451a8.outcome.json)、[Vitest](../../../backend/artifacts/official-plugin-only/feedback-history-vitest-15957f77-42aa-43e2-88e6-2ca17b5451a8.json)、[Android详细阶段](../../../dsh-mobile/artifacts/official-plugin-only/15957f77-42aa-43e2-88e6-2ca17b5451a8/feedback-history.json)、[实际OTLP元数据](../../../backend/artifacts/official-plugin-only/feedback-collector-15957f77-42aa-43e2-88e6-2ca17b5451a8.json)。已实际查看[冷历史差评](../../../dsh-mobile/artifacts/official-plugin-only/15957f77-42aa-43e2-88e6-2ca17b5451a8/feedback-history-cold-negative.png)、[重启后的分支](../../../dsh-mobile/artifacts/official-plugin-only/15957f77-42aa-43e2-88e6-2ca17b5451a8/feedback-history-fork-restored.png)、[恢复原父会话](../../../dsh-mobile/artifacts/official-plugin-only/15957f77-42aa-43e2-88e6-2ca17b5451a8/feedback-history-parent-restored.png)及原App前台。

入口与事实来源：[真实HTTP/历史核对](../../../backend/tests/support/official-feedback-history.ts)、[Android自己的页面操作](../../../dsh-mobile/tests/support/official-feedback-history.mjs)、[独立恢复断言](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)、[原官方反馈服务](../../../dsh-mobile/artifacts/official-alpha2-source/packages/feedback/message-feedback/src/index.ts)、[官方反馈触发的日志捕获](../../../dsh-mobile/artifacts/official-alpha2-source/packages/session/session-telemetry-otel/src/index.ts)、[官方异步上传处理](../../../dsh-mobile/artifacts/official-alpha2-source/packages/telemetry/otel/src/session-log.ts)。

本结论只覆盖上述已结算评价、归档历史、实际完成边界分支及两次正常Host恢复。其他类别/超长备注、指定轮次或深层分支、手机提交在途竞争/断线/回执丢失、提交中的Host/App结束、外部出口和未送达日志恢复仍待验；不把会话反馈追加确认升级为持久落盘或上传保证，任务继续进行。

## 普通消息发送断线与回执丢失（2026-10-10）

- 状态：固定未修改官方alpha.2的实际Android专项通过。
- 维护角色：DSH Mobile项目协作Agent。
- 来源：[生产入口验收](../../../backend/tests/official-host.test.ts)、[原报文外部截断](../../../backend/tests/support/official-prompt-transport.ts)、[官方原历史核对](../../../backend/tests/support/official-prompt-sending.ts)、[实际手机输入和恢复](../../../dsh-mobile/tests/support/official-prompt-sending.mjs)。

普通文字提交的两种发送中断，以消息所用的真实WebSocket为边界核验；公网网关鉴权、原请求编号、插件及官方HTTP服务保持原样。复用现有APK与正常Host launcher32812，无产品修改、构建或安装。成功run `d7499d62-8adc-411c-9480-d000871c7526`，真实退出0，37.157秒/12个Android阶段，零页面与渲染错误。

| 中断位置 | 手机实际行为 | 电脑原始记录 |
| --- | --- | --- |
| 消息尚未转发 | 断线和自动重连后保留提交前草稿，不自动重发；仅点击发送后显式重试 | 被截断请求编号 `46c89ffa-0fec-475a-8ea6-5cac13dcc2e2` 无事件；手动重试使用新编号 `c3fee506-4aa3-452e-97e6-0a62209d5445`，原用户事件seq39/实际模型回复seq41各一条，只有一轮，无工具调用 |
| 已接受但手机未收到回执 | 回执前原事件也扣住，断线时保留草稿；自动重连读取原历史，按原编号确认已发送并清空草稿，无重发 | 原编号 `4b8c9e07-f0e9-4b01-a10c-6f04d774a1c6`，真实accepted回执被截断，原用户事件seq48/实际模型回复seq50各一条，电脑在手机消息连接离线期间完成该轮 |

同一App PID3207与原会话 `session-96222129-3927-411a-9bf2-1a76fb6f6440` 保持，全部原历史前缀、模型选择、权限及profile字节不变。外部代理记录含初始手机正常提交、转发前截断、显式重试和回执丢失，共四个实际请求；两阶段各只有一个到达电脑。App运行中的独立通知通道可能仍收到完成提示，不将提示当作消息请求回执，亦不宣称整台手机完全断网。

两次原失败run `ff650721-a62b-4673-a1c1-291a6414d1d4`（52.322秒）和 `e91ad7d9-b970-4e61-8a16-ca5eac213caa`（51.277秒）均完成转发前验证，失败于回执丢失重连后的空编辑器断言。原编辑器的空段落使innerText为换行，textContent及已保存草稿均为空；只修正验收，同时核对DOM与公开草稿，不改产品。每轮10份原件摘要、退出1、授权/中转清理和原App身份由[失败恢复审计](../../../backend/artifacts/official-plugin-only/prompt-sending-failed-attempts-restoration.json)核对；失败不计入成功专项。

原始证据：[后端报告](../../../backend/artifacts/official-plugin-only/official-android-d7499d62-8adc-411c-9480-d000871c7526.json)、[实际退出](../../../backend/artifacts/official-plugin-only/official-android-d7499d62-8adc-411c-9480-d000871c7526.outcome.json)、[Vitest原结果](../../../backend/artifacts/official-plugin-only/prompt-sending-vitest-d7499d62-8adc-411c-9480-d000871c7526.json)、[手机阶段与草稿](../../../dsh-mobile/artifacts/official-plugin-only/d7499d62-8adc-411c-9480-d000871c7526/prompt-sending.json)。实际查看[未转发时的原草稿](../../../dsh-mobile/artifacts/official-plugin-only/d7499d62-8adc-411c-9480-d000871c7526/prompt-before-forward-offline.png)、[回执丢失时](../../../dsh-mobile/artifacts/official-plugin-only/d7499d62-8adc-411c-9480-d000871c7526/prompt-after-receipt-offline.png)、[自动核对后单次原回复](../../../dsh-mobile/artifacts/official-plugin-only/d7499d62-8adc-411c-9480-d000871c7526/prompt-after-receipt-settled.png)与恢复后的原App前台。

范围限于已有普通会话、纯文字queue提交、发送连接两种中断及同进程重连。不替代图片/附件上传、steer、子会话、连续或多端同时发送、提交中的Host/App进程结束和其他生命周期验收。任务保持进行中。

## App 发送中结束与恢复（2026-10-10）

固定未修改的官方 `0.2.1-alpha.2`、正常 `pnpm dsh web`、独立插件 `0.1.79-latest.0` 与现有测试 APK，通过纯文字 `queue` 提交的两种真实 App 退出场景。实际 run `3b36ab1c-a720-442a-88f8-d0d156cb4bd9`，45.394 秒/14 个 Android 阶段、退出0；官方 Host launcher32812 没有重启。本轮只扩展验收工具，全部产品/APK复用，无产品修改、构建或安装。

外部代理保持原 HTTP、鉴权和 WebSocket 报文结构：未转发时扣住原提交；已接受时扣住正式成功回执及此前的原事件。门控先确认原手机进程仍活着、消息连接尚未关闭，再真正结束自有测试 UID，等待连接由进程退出关闭。不是先人工断线再宣称 App 退出覆盖。实际自有进程3888→4192→4571；两次 `am force-stop` 后进程为空，以正常 Launcher 重开，手机从普通首页进入 Remote、复用已有绑定打开原会话，没有重新配对或加载电脑网页。

| 场景 | 原请求与电脑记录 | 手机恢复结果 |
| --- | --- | --- |
| 未转发即结束 App | 原请求 `92b85de4-1a30-4eab-a43a-f606300b9fad` 未进入电脑日志；恢复后明确点击发送的新编号 `d7a96472-07f2-4a57-8fba-c1ee8d226621` 才执行，user seq39/assistant seq41各一条 | 原草稿保留，原会话恢复；重开和观察期间不自动重发，只有明确重试才清除已发送草稿 |
| 电脑已接受、手机未获回执时结束 App | 原请求 `eaf27a00-abd3-4c38-8928-25edcdc9c516` 的真实 `accepted:true` 回执被扣住；user seq48/assistant seq50各一条、一轮、实际模型回复唯一 | 正常重开后按原请求编号核对原历史并确认发送，已发送草稿清空，没有重试或重复消息 |

两次都回到原会话 `session-b06c2d22-f2f4-4ac7-bf00-528dda9f0456`，完整历史前缀、profile、模型 `deepseek-v4-pro` 和权限保持；iframe数0、零页面和局部渲染异常。模型真实回复在重开前已独立核对，但没有用额外时间证据断言回复恰好在 App 停止后才完成。

原件：[后端与传输报告](../../../backend/artifacts/official-plugin-only/official-android-3b36ab1c-a720-442a-88f8-d0d156cb4bd9.json)、[终端结算](../../../backend/artifacts/official-plugin-only/official-android-3b36ab1c-a720-442a-88f8-d0d156cb4bd9.outcome.json)、[实际 Vitest 结果](../../../backend/artifacts/official-plugin-only/prompt-process-vitest-3b36ab1c-a720-442a-88f8-d0d156cb4bd9.json)、[原草稿/请求/退出/重开逐项核对](../../../dsh-mobile/artifacts/official-plugin-only/3b36ab1c-a720-442a-88f8-d0d156cb4bd9/prompt-sending.json)。实际查看[未转发时退出前](../../../dsh-mobile/artifacts/official-plugin-only/3b36ab1c-a720-442a-88f8-d0d156cb4bd9/prompt-before-forward-pending-before-app-exit.png)、[回执扣住时退出前](../../../dsh-mobile/artifacts/official-plugin-only/3b36ab1c-a720-442a-88f8-d0d156cb4bd9/prompt-after-receipt-pending-before-app-exit.png)及[恢复后](../../../dsh-mobile/artifacts/official-plugin-only/3b36ab1c-a720-442a-88f8-d0d156cb4bd9/prompt-after-receipt-settled.png)；退出前的本地待确认气泡不等于电脑已接受。

共享工具变更后，原同进程普通断线场景以 run `f847cd78-e1ab-4cf9-9e63-b497df70e1e6` 再次通过，34.62 秒/12个 Android 阶段、退出0；[独立报告](../../../backend/artifacts/official-plugin-only/official-android-f847cd78-e1ab-4cf9-9e63-b497df70e1e6.json)和[结算](../../../backend/artifacts/official-plugin-only/official-android-f847cd78-e1ab-4cf9-9e63-b497df70e1e6.outcome.json)保留，此回归不替换上一节的原报告。工具为[真实传输门控](../../../backend/tests/support/official-prompt-transport.ts)、[电脑原日志核对](../../../backend/tests/support/official-prompt-sending.ts)、[Android发送/退出/正常重开](../../../dsh-mobile/tests/support/official-prompt-sending.mjs)及[逐轮恢复审计](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)。独立恢复核对累计59轮/837阶段通过，原App PID4249/Key公开状态/绑定/历史保持，测试UID、授权、中转和映射已清理。

范围仅为已有普通会话、纯文字 `queue` 的两种提交边界及真实 force-stop/正常重开；当时未覆盖的发送中Host结束已由下一节单独核验，附件、steer、连续或多端竞争、其他退出或系统回收策略仍待专项。此结果不承诺 DSH 重启继续执行任务，也不替代独立通知策略验收。

## 普通消息发送中的电脑退出与恢复（2026-10-10）

- 状态：固定未修改官方 `0.2.1-alpha.2`、正常 `pnpm dsh web`、独立插件 `0.1.79-latest.0` 和原测试APK的真实Android专项已通过。
- 维护角色：DSHM项目维护者；最近核验：2026-10-10。
- 来源：[官方原记录核对](../../../backend/tests/support/official-prompt-host.ts)、[原报文传输门控](../../../backend/tests/support/official-prompt-transport.ts)、[实际手机操作与截图](../../../dsh-mobile/tests/support/official-prompt-host.mjs)和[逐轮恢复核对](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)。

首轮 `d6b952b9-52b9-4c0d-9001-017f83b9501e` 为61.731秒/16阶段退出0。截图原本停在较早消息，随后只调整验收的截图滚动位置，以 `549feaae-fbac-4d19-8355-3b1a6ed0f9f3` 再验67.114秒/16阶段退出0，实际看到了“已中断”及新消息的唯一回复。全部产品和APK复用，没有修改、构建DSH/SDK或重新安装App。

门控先保持原手机消息连接：未转发时扣住原提交；已接受时扣住真实成功回执及此前原事件。随后真正结束自有官方Host进程树，确认端口关闭，将中转实际产生的 `host_disconnected_outcome_unknown` 原错误交给手机。正常官方CLI重启后，手机自己恢复；没有先人工切断手机连接，没有伪造审批、模型答复或中断状态。

| 场景（截图复验） | 原电脑记录与手机恢复 |
| --- | --- |
| 请求未转发时Host退出 | 原编号 `ba6076ad-1bc5-4be5-9525-a022cb161c46` 没有原用户事件或轮次。恢复后草稿保留、观察期间不重发；明确点击发送的新编号 `fb6bc0dc-6d4d-42d8-a68e-7c7ac73c445c` 才执行，user40/assistant43各一次 |
| 电脑已接受、手机未确认时Host退出 | 原编号 `d299ff96-bf98-49fe-b04f-ea013370093e` 有唯一user50；退出前仍在运行，正常重启后的官方turn/end53为interrupted。手机确认原消息后清草稿，显示“已中断”，没有重发或自动续跑 |
| 恢复后明确发送独立新消息 | 新编号 `4dcfb429-519d-4e51-b9df-5265eab3833a` 有唯一user59/assistant62和真实DeepSeek回复；先前原请求仍只有一次，不把新请求算作旧请求重放 |

截图复验的手机进程始终为11866、原会话 `session-c8b24e77-90d4-4330-874d-87cf57cfdffc`；Host launcher47060→39220→35892，两次真实退出、正常启动且后台任务代次不同。完整原历史前缀、profile、模型及权限保持，iframe0、零页面和局部渲染异常。首轮同样通过，手机进程10449保持，Host43160→24064→47060。原任务是否中断以官方记录为准；模型可能在退出检查与进程树真正结束之间完成，不强制把实际完成改写为中断。

原件：[截图复验完整报告](../../../backend/artifacts/official-plugin-only/official-android-549feaae-fbac-4d19-8355-3b1a6ed0f9f3.json)、[终端结算](../../../backend/artifacts/official-plugin-only/official-android-549feaae-fbac-4d19-8355-3b1a6ed0f9f3.outcome.json)、[真实Vitest结果](../../../backend/artifacts/official-plugin-only/prompt-host-vitest-549feaae-fbac-4d19-8355-3b1a6ed0f9f3.json)、[原请求/退出/恢复核对](../../../dsh-mobile/artifacts/official-plugin-only/549feaae-fbac-4d19-8355-3b1a6ed0f9f3/prompt-host.json)，以及[首轮报告](../../../backend/artifacts/official-plugin-only/official-android-d6b952b9-52b9-4c0d-9001-017f83b9501e.json)和[首轮结算](../../../backend/artifacts/official-plugin-only/official-android-d6b952b9-52b9-4c0d-9001-017f83b9501e.outcome.json)。实际查看[首轮未送达时保留草稿](../../../dsh-mobile/artifacts/official-plugin-only/d6b952b9-52b9-4c0d-9001-017f83b9501e/prompt-host-before-forward-offline.png)、[截图复验原轮中断](../../../dsh-mobile/artifacts/official-plugin-only/549feaae-fbac-4d19-8355-3b1a6ed0f9f3/prompt-host-after-receipt-recovered.png)及[独立新消息回复](../../../dsh-mobile/artifacts/official-plugin-only/549feaae-fbac-4d19-8355-3b1a6ed0f9f3/prompt-host-after-receipt-settled.png)。

四次失败都保留原报告、退出1结算、公开原历史、手机截图和字节摘要；独立恢复核对均通过，未计为成功：

| 失败 | 实际结论与仅验收修正 | 不变原件/恢复依据 |
| --- | --- | --- |
| 初始57.089秒 | 模型在进程树结束前实际完成；此前“必须没有回复”的断言错误。允许官方真实completed或interrupted，仍检查原请求唯一 | [13份原件及恢复](../../../backend/artifacts/official-plugin-only/prompt-host-initial-failure-restoration.json)、[原历史](../../../backend/artifacts/official-plugin-only/prompt-host-initial-failure-public-history.json) |
| 独立新消息234.309秒 | 原消息中断且没有重发；模型在新回复中补答了旧题，导致要求的单一回复检查失败。新测试消息明确只处理本条，不把模型文本重复当作网络重放 | [15份原件及恢复](../../../backend/artifacts/official-plugin-only/prompt-host-followup-failure-restoration.json)、[原历史](../../../backend/artifacts/official-plugin-only/prompt-host-followup-failure-public-history.json) |
| 轮次顺序61.702秒 | 官方新turn/start在新user/message前；用下条用户消息切割旧轮错误计入新轮。保持恢复时整段原历史，再单独核对新请求 | [14份原件及恢复](../../../backend/artifacts/official-plugin-only/prompt-host-ordering-failure-restoration.json)、[原历史](../../../backend/artifacts/official-plugin-only/prompt-host-ordering-failure-public-history.json) |
| 请求到达54.295秒 | 手机点击后脚本立即读取门控，实际新帧稍后已到达；过早断言失败，清理中该新轮被正常停止。改为等待真实新帧再查唯一性 | [14份原件及恢复](../../../backend/artifacts/official-plugin-only/prompt-host-arrival-failure-restoration.json)、[原历史](../../../backend/artifacts/official-plugin-only/prompt-host-arrival-failure-public-history.json) |

恢复审计还修正Windows进程编号复用的误判：旧测试PID47688在退出回执之后被新正常Host的cmd.exe子进程复用，真实创建时间为2026-10-09T23:28:28.160Z，旧退出回执mtime为2026-10-09T17:36:26.583Z。现在以[只读身份核对](../../../dsh-mobile/scripts/official-stopped-process.mjs)及[原生WMI查询](../../../dsh-mobile/scripts/windows-process-identity.vbs)区分已退出旧进程与后来创建的新进程；不按旧PID结束新进程，不读取命令行、环境或Key。上述第三次失败的冻结恢复报告保存了实际复用身份，后续原Host正常退出时其自有子进程才随树清理。

共享传输门控的原同进程断线回归 `d07b1dfd-80d6-490b-ab90-608aab444670` 为37.677秒/12阶段退出0，[报告](../../../backend/artifacts/official-plugin-only/official-android-d07b1dfd-80d6-490b-ab90-608aab444670.json)与[结算](../../../backend/artifacts/official-plugin-only/official-android-d07b1dfd-80d6-490b-ab90-608aab444670.outcome.json)保留。App发送中强停回归按下方当前收尾的原报告与结算记录。范围仅为已有普通会话、纯文字queue的两个原提交边界；附件、steer、连续或多端发送及其他生命周期仍待专项，不保证电脑重启续跑旧任务。

App发送中强停的共享工具回归另以 `1cb8b120-5495-431a-9f2b-f553952786a0` 通过47.224秒/14个真实Android阶段、退出0：[完整报告](../../../backend/artifacts/official-plugin-only/official-android-1cb8b120-5495-431a-9f2b-f553952786a0.json)、[结算](../../../backend/artifacts/official-plugin-only/official-android-1cb8b120-5495-431a-9f2b-f553952786a0.outcome.json)和[实际退出/正常重开核对](../../../dsh-mobile/artifacts/official-plugin-only/1cb8b120-5495-431a-9f2b-f553952786a0/prompt-sending.json)保持。没有重新构建或安装产品；四个成功报告与四次失败原件由下方67轮恢复审计独立核对，不以新的成功覆盖旧失败。

## 附件上传与消息提交断线（2026-10-10）

证据责任为DSHM独立插件/手机验收，固定未修改官方`0.2.1-alpha.2`、插件`0.1.79-latest.0`和正常`pnpm dsh web`。成功专项`77f1199c-d1d8-4cd4-9d66-8ae23c98c888`为58.284秒/14个真实Android阶段、退出0；共享传输工具的普通文字断线回归`9a3e61ff-1eb5-4630-a8a9-d308613c2b64`为35.43秒/12阶段、退出0。只增加验收和恢复审计，复用现有App/APK、插件、网关与官方Host，不构建或安装产品，不修改DSH/SDK、认证或receipt逻辑。

| 真实边界 | 手机恢复与电脑事实 |
| --- | --- |
| 原Host已消费上传首块 | 真实credit=1确认消费65536字节才结束手机连接；没有转发结束帧或收到receipt。完整194000字节Blob和SHA仍在手机，无自动重传或消息。重连后用户点击“重新准备附件”，三块完整上传，取得原官方真实receipt |
| 已上传附件随queue消息尚未转发 | 原请求没有用户事件，原文件与文字草稿保留，无自动重发。“结果未知”附件不允许直接重试；核对电脑记录后，用户手动移除、通过真实Android系统选择器重选同一原件，再明确新发。新receipt和新请求各一次，原用户事件不出现 |
| 电脑已接受但手机未收到成功回执 | 扣住原回执及此前下行事件，再结束真实手机连接。重连按原请求编号确认，清掉已发送的文字和附件草稿，没有重新上传或发送，原用户事件与真实回复唯一 |

两份自有TXT分别194000/193999字节、5002行，原件放在工作区外，首行独有内容不出现在测试提示词。手机实际系统选取、原Blob全文SHA、完整重传字节及真实receipt核对；电脑原消息中的FileRef由独立生产附件流读取，三块完整字节与源文件一致，另一会话读取原引用被真实拒绝。原公开历史还核对两次真实`read`工具各以`limit=1`读取官方attachments目录中的对应SHA原件，随后唯一DeepSeek V4 Pro回复各自首行；没有以假上传或假模型结果代替。原会话、同一App进程、完整历史前缀、profile、模型和权限保持。

原件：[成功报告](../../../backend/artifacts/official-plugin-only/official-android-77f1199c-d1d8-4cd4-9d66-8ae23c98c888.json)、[实际Vitest](../../../backend/artifacts/official-plugin-only/attachment-sending-vitest-77f1199c-d1d8-4cd4-9d66-8ae23c98c888.json)、[退出结算](../../../backend/artifacts/official-plugin-only/official-android-77f1199c-d1d8-4cd4-9d66-8ae23c98c888.outcome.json)、[手机原件/恢复/提交核对](../../../dsh-mobile/artifacts/official-plugin-only/77f1199c-d1d8-4cd4-9d66-8ae23c98c888/attachment-sending.json)、[官方公开原历史](../../../backend/artifacts/official-plugin-only/attachment-sending-public-history-77f1199c-d1d8-4cd4-9d66-8ae23c98c888.json)。实际查看[首块上传后断线](../../../dsh-mobile/artifacts/official-plugin-only/77f1199c-d1d8-4cd4-9d66-8ae23c98c888/attachment-partial-upload-offline.png)、[未转发后明确新发的附件回复](../../../dsh-mobile/artifacts/official-plugin-only/77f1199c-d1d8-4cd4-9d66-8ae23c98c888/attachment-before-forward-settled.png)及[原回执丢失后唯一回复](../../../dsh-mobile/artifacts/official-plugin-only/77f1199c-d1d8-4cd4-9d66-8ae23c98c888/attachment-after-receipt-settled.png)。共享普通文字回归的[报告](../../../backend/artifacts/official-plugin-only/official-android-9a3e61ff-1eb5-4630-a8a9-d308613c2b64.json)与[结算](../../../backend/artifacts/official-plugin-only/official-android-9a3e61ff-1eb5-4630-a8a9-d308613c2b64.outcome.json)保存。

首轮`ef526e51-922e-403d-b0b9-6472743acc72`为28.678秒退出1：脚本误以为同Host重连的上传取消必须显示restored，真实页面显示error并提供显式准备按钮，原件完整且没有自动上传。代码核对确认同Host保留原model，取消回调可显示error；测试改为接受两种原件保留状态，同时继续严格核对原件、无receipt、显式按钮及完整上传。只修验收，没有修产品。其[9份原件摘要与冻结63轮恢复审计](../../../backend/artifacts/official-plugin-only/attachment-state-failure-restoration.json)、[公开原历史](../../../backend/artifacts/official-plugin-only/attachment-state-failure-public-history.json)和[退出1结算](../../../backend/artifacts/official-plugin-only/official-android-ef526e51-922e-403d-b0b9-6472743acc72.outcome.json)保留，不计成功。

范围仅为同Host、同App进程、已有普通会话、单个TXT+文字queue的三个边界。图片、其他文件/多附件、Host结束及其他App回收策略、steer、连续/多端发送及其他生命周期仍待专项；不保证未知发送自动重试。独立恢复脚本逐项核对本轮实际字节/receipt/请求、原历史工具调用及失败原件，再核对67个成功专项/952个真实Android阶段的环境保护，具体收尾见下方。 三种具体App强停恢复另见下方专项。

## 附件上传与提交中的App结束与恢复（2026-10-10）

证据责任为DSHM独立插件/手机验收，固定未修改官方`0.2.1-alpha.2`、独立插件`0.1.79-latest.0`和正常`pnpm dsh web`。专项`394a7390-5800-442b-89df-2142e55b128b`为75.497秒/17个真实Android阶段、退出0；同进程附件断线回归`15134ef2-7b8d-4bdb-90c1-6727facd3d28`为57.434秒/14阶段、退出0。只扩展验收与恢复审计，复用全部产品及现有APK，没有产品修改、构建或安装，更未改造DSH/SDK。

| 实际App结束时机 | 正常Launcher重开后的事实 |
| --- | --- |
| 原Host已消费上传首块，尚无receipt | 实际消费65536字节后保持连接和在途状态，再真实force-stop。新进程从本机存储找回完整194000字节Blob，SHA一致，旧receipt/FileRef不存在；不自动上传，用户明确准备后三块完整上传并取得原官方receipt |
| 带单个TXT的queue消息尚未转发 | 保持原提交连接，再force-stop；原请求没有电脑用户事件。正常重开复用原绑定/会话，文字草稿与完整原件保持，未知附件核对后由用户移除、通过实际系统选择器重选同一原件再明确新发；原请求不重放，新receipt/请求各一次 |
| 电脑已接受，但原回执与此前下行未到达 | 保持原手机提交连接，再force-stop。正常重开后按原requestId确认电脑历史，清掉已发送的文字和附件草稿，不重新上传或发送；原用户事件、真实文件读取和模型回复唯一 |

三次实际进程链为`17663→18155→18448→19029`，均从正常Launcher打开App、由原Remote入口和现有绑定进入同一`session-d65eabcd-7d50-41cf-89cd-56d793e7a9cd`，没有重新配对或加载电脑网页。两份自有TXT分别194000/193999字节，工作区外原件、实际系统选取、手机Blob全文SHA、官方真实receipt、原历史FileRef和独立附件流全部字节逐项匹配，错误会话读取引用被拒绝。原公开历史中两次真实`read`工具各以`limit=1`读取官方attachments/SHA目录中的对应原件，再由DeepSeek V4 Pro各只回复第一行；独有首行没有出现在提示词。原profile、模型、权限和完整历史前缀保持。

原件：[成功完整报告](../../../backend/artifacts/official-plugin-only/official-android-394a7390-5800-442b-89df-2142e55b128b.json)、[实际Vitest结果](../../../backend/artifacts/official-plugin-only/attachment-process-vitest-394a7390-5800-442b-89df-2142e55b128b.json)、[退出结算](../../../backend/artifacts/official-plugin-only/official-android-394a7390-5800-442b-89df-2142e55b128b.outcome.json)、[原Blob/草稿/三次进程及公开历史](../../../dsh-mobile/artifacts/official-plugin-only/394a7390-5800-442b-89df-2142e55b128b/attachment-sending.json)。实际查看[重开后完整重新准备的附件](../../../dsh-mobile/artifacts/official-plugin-only/394a7390-5800-442b-89df-2142e55b128b/attachment-partial-upload-prepared.png)、[未送达后明确新发的首行回复](../../../dsh-mobile/artifacts/official-plugin-only/394a7390-5800-442b-89df-2142e55b128b/attachment-before-forward-settled.png)及[已接受原请求的唯一首行回复](../../../dsh-mobile/artifacts/official-plugin-only/394a7390-5800-442b-89df-2142e55b128b/attachment-after-receipt-settled.png)。共享工具的同进程回归保留[完整报告](../../../backend/artifacts/official-plugin-only/official-android-15134ef2-7b8d-4bdb-90c1-6727facd3d28.json)和[退出0结算](../../../backend/artifacts/official-plugin-only/official-android-15134ef2-7b8d-4bdb-90c1-6727facd3d28.outcome.json)。

首轮`ad30c71e-b9e7-48d5-a4c2-0877586ac822`为55.01秒退出1：部分上传中App退出/完整原件恢复已成功，随后测试错误要求原提交仍在途时输入框必须保留原文字。实际原DSH shell已经暂时清空输入并呈现“正在发送”，DSHM保留提交前的持久化草稿；[输入绑定代码](../../../dsh-mobile/src/remote-input-session.mjs)和原失败截图确认这一契约。只修退出前的验收为核对保存草稿，正常重开后的输入框恢复仍严格核对；没有改产品。其[10份原件摘要及冻结65轮恢复审计](../../../backend/artifacts/official-plugin-only/attachment-process-editor-failure-restoration.json)、[公开原历史](../../../backend/artifacts/official-plugin-only/attachment-process-editor-failure-public-history.json)及[退出1结算](../../../backend/artifacts/official-plugin-only/official-android-ad30c71e-b9e7-48d5-a4c2-0877586ac822.outcome.json)保留，不计为成功。独立恢复脚本逐项核对原报告、真实进程/字节/receipt/用户事件/工具读取及失败原件，再核对67个成功专项/952个真实Android阶段的环境保护。

范围仅为同Host、已有普通会话、单个TXT+文字queue的这三种真实App强停与正常重开；不代表任意系统回收策略、图片/其他文件/多附件、附件Host结束、steer或多端竞争通过。其他保留功能与生命周期继续验收，任务保持进行中。

## 附件上传与提交中的电脑退出与恢复（2026-10-10）

固定未修改官方alpha.2与正常 `pnpm dsh web`，[真实Host退出专项](../../../backend/artifacts/official-plugin-only/official-android-35d98ba2-c5fa-4038-af39-663c62d89630.json)107.202秒/14个实际Android阶段退出0，[原Vitest结果](../../../backend/artifacts/official-plugin-only/attachment-host-vitest-35d98ba2-c5fa-4038-af39-663c62d89630.json)及[退出结算](../../../backend/artifacts/official-plugin-only/official-android-35d98ba2-c5fa-4038-af39-663c62d89630.outcome.json)保留。共享附件断线[回归报告](../../../backend/artifacts/official-plugin-only/official-android-54489ba0-4cb6-4b9f-9483-1da9be208f77.json)58.871秒/14阶段退出0，[结算](../../../backend/artifacts/official-plugin-only/official-android-54489ba0-4cb6-4b9f-9483-1da9be208f77.outcome.json)和[原Vitest结果](../../../backend/artifacts/official-plugin-only/attachment-sending-vitest-54489ba0-4cb6-4b9f-9483-1da9be208f77.json)另存。没有新增本轮失败。只增加验收/恢复审计，所有产品/APK复用，没有产品修改、构建或安装，也没有DSH/SDK改造。

三次真正结束所属隔离Host进程树并确认16958端口关闭，再从同一home正常启动；launcher35892→48420→40440→31080，三次真实协商的jobControlGeneration不同。手机PID20686一直存活，复用原绑定和会话 `session-c9a26890-1387-49cd-a06b-069440a89e02`，保持DSHM自有页面。生产Hub因Host退出发出的真实 `host_disconnected_outcome_unknown` 照常传给手机；外部门控保存每次退出时的原错误快照，独立审计核对同一桥接日志的对应前缀。

| 退出边界 | 实际恢复结果 |
| --- | --- |
| Host已消费首块65536字节，尚未完成上传 | 原完整Blob/草稿保留，原上传没有receipt；恢复不自动上传，用户显式准备后完整上传194000字节并取得真实官方receipt。 |
| 单TXT+文字queue消息尚未转发 | 旧请求不在电脑历史，原件/文字保留；恢复先核对记录，手动移除未知附件、实际Android SAF重选同一原件再明确新发。只产生新请求的一条用户事件和一次真实回复。 |
| 电脑已接受原消息，手机尚未确认 | 停机前原轮确实运行；正常启动后原请求只有一条用户事件、一次官方interrupted结算。手机清理已送达草稿/附件并显示“已中断”，没有旧任务重传/重发或自动续跑。用户随后明确发送新消息，读取原历史附件，得到唯一真实首行回复。 |

两份194000/193999字节原件的SHA分别为 `4213deb3b78b91ed964cf2ae4508092d4aa3d2a5360aa9fd46c1abf2ad4df59a`、`57b5240ac6df5131ad4c405317f5c941da77393cd59e77d95d1ed8805fa69ef2`。原件在工作区外，通过真实系统选取上传；首行标志不在提示词。手机Blob全文、所有实际上传块、官方receipt、原FileRef与独立完整附件流严格匹配，错误会话读取拒绝。公开77条原记录证实新请求的真实read各limit=1，从官方attachments/SHA目录读取原件后DeepSeek V4 Pro唯一回复对应首行。完整历史前缀、profile、模型和权限保持。

[手机原报告](../../../dsh-mobile/artifacts/official-plugin-only/35d98ba2-c5fa-4038-af39-663c62d89630/android.json)和[附件逐项报告](../../../dsh-mobile/artifacts/official-plugin-only/35d98ba2-c5fa-4038-af39-663c62d89630/attachment-sending.json)独立保存；实际[显式准备结果](../../../dsh-mobile/artifacts/official-plugin-only/35d98ba2-c5fa-4038-af39-663c62d89630/attachment-partial-upload-prepared.png)、[原消息中断恢复](../../../dsh-mobile/artifacts/official-plugin-only/35d98ba2-c5fa-4038-af39-663c62d89630/attachment-after-receipt-host-recovered.png)和[显式新请求首行回复](../../../dsh-mobile/artifacts/official-plugin-only/35d98ba2-c5fa-4038-af39-663c62d89630/attachment-after-receipt-settled.png)均已查看。69轮/980阶段独立恢复审计通过，原App4249/Key公开状态/绑定/历史及两版官方原文件、只读源码保持，正常Host31080运行且远程关闭，测试环境清理。

只覆盖已有普通会话、单TXT+文字queue的三种实际Host退出；图片、其他格式/多附件、steer、连续或多端竞争及其他生命周期不由本轮结果推导。接下来对照完整目标继续审查功能矩阵与历史补丁依赖，KKC-24保持进行中。

## 最终环境核对

2026-10-10 08:41的[完整恢复核对](../../../dsh-mobile/artifacts/official-plugin-only/turn61-restoration-audit.json)再次通过69轮/980个实际Android阶段：原App PID4249/安装路径/摘要/正常前台保持，测试UID停止，测试网关/映射/授权和文件暂存清理；当前16958正常Host PID31080、远程关闭，两版官方文件摘要及只读源码未变。原App当前前台截图已实际查看。本轮没有模型请求、产品构建或安装；以下综合段落保留各次核对时刻的数量和进程，最新状态见下文0.1.80的70轮/990阶段复验。

 [恢复脚本](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)核对上方67轮报告版本/正常入口/成功及清理、零页面与隔离渲染异常、原App前后身份，并实际确认测试UID停止、下载暂存空、保存待确认记录不存在、16956/16957反向映射及监听不存在，Key专项16960 Host已结束及两条测试引用未配置，地址专项16961及策略专项16962 Host已结束/普通配置恢复，断线专项16963/PID13076已结束/六次真实传输切断及原配置/历史恢复。竞争专项16964/PID47688已结束/六组十二次真实写入与单次版本变化、配置/历史恢复。16958正常官方Host launcher35892继续运行、插件远程连接关闭；两版原文件分别299包/6386与290包/6263摘要保持，只读源码固定d743267且Git干净。正常Launcher恢复原App前台，实际截图已查看，不读出原Key、不替换原绑定或历史。 进程专项16965/PID47884已结束；六次实际App退出、正常Launcher恢复、待核对提示和原配置/历史恢复另核验。 自有插件单独启用加载专项核对实际旧Host结束、正常启动已保存包、零重复归档下载与原脚本策略字节；14663临时服务已关闭。 自动启用安装的applying专项核对真实阶段事件、too-late取消/同编号完成、Host退出未知与目标归档不重放；三份自有包正常卸载，脚本策略保持。 后台专项另核对真实停止/生产连接关闭、显式恢复/真实缺口、四段UTF-8与双流/同共享坐标、最终终态和草稿；门控11066已关闭，八次失败的原终态及清理单独核对。 App进程后台专项另核对两次真实App结束/正常Launcher重开、原任务运行/已结束期间完成、原会话和草稿/显式重读、未新建结算通知及字节摘要匹配；门控10871已关闭，不推导内存读取位置跨进程保持。 后台Host专项另核对运行中及completed后真实进程树结束/正常启动、两次任务代次变化、旧读写拒绝与新目录空、历史/草稿/只读/profile保持及原命令不重放；门控9915关闭。 后台停止专项另核对真实转发前切断/回执丢失/两条生产连接同时停止、每种任务和请求次数、三个实际终态提示、原会话/草稿与无命令重放；门控10671/11506关闭。 会话导出另核对物理ZIP的原事件/附件与独立HTTP解包字节、真实系统取消和空暂存；保存结算目录允许不存在或实际空目录，待确认文件不能残留。 反馈另核对六条原事件和实际OTLP元数据、旧版本拒绝、原消息/profile/模型与权限保持、两次正常CLI启动及原环境恢复；10508收集端口关闭，不保存正文或向外转发。 历史反馈另核对真实冷写无Agent/归档显示与撤回、实际继承事件的归属隔离、父/子各自草稿与两次正常重启后的同版本评价、准确八条反馈及实际OTLP，18879关闭；原失败/摘要及清理另审。 普通文字发送专项另核对两个原请求边界、未送达草稿/显式重试与已送达草稿自动清理、单次原事件/实际回复及同进程保持；两次断言误判的原件/清理另审，仅改验收。 纯文字queue提交中App专项另核对门控仍连接时真正结束、实际原连接随后关闭、两次正常Launcher重开复用原绑定和会话、未送达只显式重试/已送达按原编号确认、原事件与真实回复唯一；共享工具的原同进程断线回归另核对，未替换历史原件。 纯文字queue的Host提交中退出专项另核对两次真实Host结束/正常启动、实际原错误、同一手机进程/原会话/模型、草稿按原请求编号核对、已中断原轮不重放与显式新请求真实回复唯一；页面截图复验、原断线及App退出回归均保持原产品/APK。四次原失败及13/15/14/14份原件字节摘要另审；旧测试PID若被复用，按实际创建时间核对身份，不按编号结束后来新进程。

 [汇总恢复报告](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-final-restoration.json)与[原App前台](../../../dsh-mobile/artifacts/official-plugin-only/alpha2-original-foreground.png)独立保存。69轮共980个真实手机阶段，报告仅代表各自场景，不合并为全功能兼容声明。目标和原生子会话复用原App；工作流导航修复只构建自己的Web/App，强化复验继续复用。定时适配只构建变化的自有协议/插件/App，随后核心回归复用同APK；正文换行修正只更新自有Web/App，强化专项及最终核心复用这一APK；Key与地址取消、DeepSeek目录、自定义提供方、独立测试Key与服务地址写入专项仅补充测试，继续复用全部产品。类型、相关JS语法、目录/导航回归、Android lint及两仓diff通过；Markdown本地链接另按当前校验结果记录。失败报告均保留，收尾逐轮核对，不用后续成功覆盖失败。 后续默认地址策略修复只构建自有协议/插件/Web/App，最终同新版App核心回归通过；仍未构建DSH/SDK。 地址断线提示修复只增量构建自有Web/App，最终同APK核心回归通过，外部断线测试和其他设备Playwright句柄收尾均退出0。 地址竞争专项只新增测试，复用所有产品，实际退出0/26阶段通过。 地址保存进程恢复修复只增量构建自己的Web/App，六场景和同APK真实核心均退出0；没有重建DSH或未变化的插件/后端。 本次后台停止终态提示修复只增量构建自己的Web/App并安装自己的测试UID，修正后专项及最终核心复用同一新APK；此前历史扩展保持原APK与原范围。 本轮会话导出专项只补充测试和审计修正，复用全部产品及当前APK，不重新安装。 本轮反馈只增加验收代码，全部产品/APK复用；正常CLI仅临时使用官方遥测环境变量并恢复，没有修改启动代码或注入。 历史反馈扩展仅新增测试，全部产品/APK继续复用；未送达异步队列跨强停没有送达保证。 本轮纯文字Host提交中退出及截图复验、原断线/App退出回归仅扩展验收，全部产品/APK复用；四次失败仍保留，环境核对的Windows编号复用修正只读进程身份。 本轮TXT上传/提交断线及共享普通文字回归只增加验收，所有产品/APK继续复用；失败原件与独立恢复快照保留，附件Host结束/图片/其他文件及竞争未被本次范围覆盖。 本轮三次App实际退出与正常Launcher恢复另验，仅扩展验收/审计，全部产品/APK复用。

## 公开声明差异

当前收尾：单个TXT上传/提交中真实Host退出与正常恢复专项107.202秒/14个实际Android阶段退出0，共享同进程附件断线回归58.871秒/14阶段退出0。三次实际结束隔离官方Host并正常pnpm dsh web启动，launcher35892→48420→40440→31080；测试App PID20686与原绑定/会话保持。Host消费65536字节后未完成上传的完整Blob/草稿保留，恢复仅显式准备；消息未转发时核对后手动移除、系统重选并明确新发；原消息已被接受但手机未确认时恢复原编号、清理文字/附件，显示原官方已中断，不重传/重发或续跑。随后显式新请求读取原已送达附件并获得唯一真实DeepSeek首行回复。两份194000/193999字节原件SHA、真实官方receipt、完整原历史、实际read、独立原件流及跨会话拒绝核对，profile/模型/权限保持。仅扩展验收和恢复审计，全部产品/APK复用，无产品修改、构建、安装或DSH/SDK变更。69个成功专项/980阶段独立恢复核对通过，原App PID4249/正常前台/摘要、Key公开状态/绑定/历史与两版官方原文件/只读源码保持；16958正常Host launcher31080运行且远程关闭，测试UID/中转/映射/授权/文件清理。实际附件准备、原中断、新回复截图已查看；既有失败原件/冻结恢复保留。后端类型、相关JS语法及两仓diff检查通过；167篇Markdown/10974个本地链接通过。本轮范围仅已有普通会话、单TXT+文字queue的三种Host退出；其他格式/多附件、steer/连续或多端竞争及其他生命周期未验。下一步对照完整目标审查功能矩阵和补丁依赖，任务未完成。

比较的是已安装官方发布包的完整 `.d.ts` 文件 SHA-256，不执行包内代码。16组中12组声明逐字一致，4组有变化；仅能说明声明差异范围，不能证明实现或运行行为相同。

| 范围 | 已核对的差异与后续重点 |
| --- | --- |
| Gateway、客户端模块和 Slots、审批、提问、计划、附件、凭据、工作区及文件/Job控制 | 对应12组声明文件集合与摘要一致；加载、模型回复、write审批、提问及重连已分别实测。计划、附件等其他扩展仍按新版专项核验，声明相同不替代运行证据。 |
| SessionController | 7个声明文件改变。新增迁移状态与错误、fork的迁移选项；`projections` 结果变为 `sequenced` 或 `migration-required` 联合类型，后者没有事件序号。不能把旧客户端的有序快照假设直接套到新返回值。 |
| Connection | 5个声明文件改变。`HostConnectionHandle`新增 `allowsRemoteAuthorities`，浏览器信任与 TLS cookie说明也变化；须按官方真实信任契约接入，不绕过认证。 |
| Jobs | 2个声明文件改变；新版只读后台运行、双流显示及完成后重新读取已实测；普通pwsh停止、已知UTF-8大输出与本页限定App恢复与Host退出后的目录/缓存失效及无重放另验通过，普通pwsh停止的转发前断线/回执丢失/两条连接同时停止及真实终态提示另验通过；其他来源、停止与完成竞态及生命周期仍另验。 |
| 工具展示 | 1个声明文件改变；官方说明删除 `both` 混合模式，仅保留 `native/ptc`。设置入口与默认值必须按新版实际声明检查。 |

完整新旧相对路径、所有声明摘要与增删/改变列表见[报告](../../artifacts/official-dsh-alpha2/public-contract-comparison.json)。此前 alpha.1 的[真实手机发送断线证据](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问与计划答复发送断线及确认丢失)继续只对该固定版本有效。

## PTC程序结果与手机停止（2026-10-10）

状态：已核验限定场景；维护：DSHM兼容验收；最近核验：2026-10-10。官方版本、插件候选、App摘要及正常启动入口沿用本页基线，所有产品与安装环境复用，没有重建或修改DSH/SDK。

[实际报告](../../../backend/artifacts/official-plugin-only/official-android-1e4c975a-c3db-4104-91c1-ef3ca013596a.json)、[退出结果](../../../backend/artifacts/official-plugin-only/official-android-1e4c975a-c3db-4104-91c1-ef3ca013596a.outcome.json)和[手机专项证据](../../../dsh-mobile/artifacts/official-plugin-only/1e4c975a-c3db-4104-91c1-ef3ca013596a/ptc.json)：真实事务51.576秒、11个Android阶段、退出0、无运行时或渲染异常；测试授权及临时中转均已清理。测试实现：[官方记录核对](../../../backend/tests/support/official-ptc.ts)、[手机实际入口](../../../dsh-mobile/tests/support/official-ptc.mjs)。

| 入口 | 实际结果与边界 |
| --- | --- |
| 已有工作区新建聊天、Agent模式、会话权限 | 手机选择官方PTC并设置仅可查看；公开投影为ptc/read-only，原配置摘要保持。 |
| 发送程序并查看工具详情 | 真实模型单次run_code调用单次pwsh；根程序输出/返回值、内层stdout及唯一模型回复与官方原记录对应，结果正文核对排除了参数源码。手机显示根及内层调用。 |
| 内层命令等待时停止生成 | 空输入时点击真实停止键；官方根结果与内层dispatch各一次错误结算，turn/end为aborted/user，无结束标记或测试最终回复，无自动补做。确认的是公开执行终态，未另行声称逐个OS子进程都被独立核验。 |
| 草稿、历史与权限 | 父聊天草稿返回后保持，原历史前缀与全局配置相同；本次程序仅输出文字和短暂等待，不读写文件、联网或提权。现有有草稿发送键用于排队，停止入口使用空输入。 |

官方PowerShell在read-only环境仍输出受限模式的乱码警告，并声明文件沙箱执行为partial；保留真实输出，没有修补本体，不将其描述为完整系统隔离。任意嵌套深度、其他内层工具、其他权限/语言和PTC生命周期不由本次结果推断通过。

三轮测试辅助脚本失败报告保留：[参数对象解析](../../../backend/artifacts/official-plugin-only/official-android-ea660d13-bd5a-40f4-a333-1fa5080c684b.outcome.json)、[测试命令缺少description](../../../backend/artifacts/official-plugin-only/official-android-9b95bfa0-ce73-4651-b0cf-8b3103d29de1.outcome.json)、[有草稿时错误查找停止键](../../../backend/artifacts/official-plugin-only/official-android-1e7178b7-9fbc-490e-8aa5-9d9a3cfe472b.outcome.json)。三次均完成受控清理，不计成功。只修正自有验收脚本，没有变更产品逻辑。

11:06的[80轮/1115阶段恢复核对](../../../dsh-mobile/artifacts/official-plugin-only/turn69-restoration-audit.json)通过：原App PID4249/安装身份/正常前台、Key公开状态/绑定/历史保持；独立UID、测试设备授权、网关及反向映射清理；官方39256/16958正常运行且远程关闭，两版官方原文件及只读源码保持。

## 可继续子会话的手机停止与再次续聊（2026-10-10）

[真实报告](../../../backend/artifacts/official-plugin-only/official-android-6021ae57-8cbf-4deb-b177-c1a47068a6ef.json)、[执行结果](../../../backend/artifacts/official-plugin-only/official-android-6021ae57-8cbf-4deb-b177-c1a47068a6ef.outcome.json)和[手机子会话证据](../../../dsh-mobile/artifacts/official-plugin-only/6021ae57-8cbf-4deb-b177-c1a47068a6ef/subagents.json)50.097秒通过12个真实Android阶段，外层53.838秒、退出0。父模型实际创建一层可继续子会话，手机自有页面打开、续聊及重连后，在该子会话发送唯一只读pwsh等待命令，再点击空输入时的“停止生成”。官方子记录只有一份工具调用/错误结果，resultSeq=47，turn/end明确为aborted/user，没有结束标记、完成回复或重试。随后从同一手机页面再次发送，userSeq=55、真实回复及completed结算；停止前的37条原事件及中断后的完整前缀保持，父子草稿隔离保留。

官方委派实际记录sandbox/mode=read-only、approval/policy=never且source=delegation，这个组合显示custom，不能只按read-only预设名称断言。依据只读[官方委派实现](../../../dsh-mobile/artifacts/official-alpha2-source/packages/subagent/subagent/src/child-agent.ts)和实际公开session/page记录修正[停止核对](../../../backend/tests/support/official-child-stop.ts)。[首轮失败](../../../backend/artifacts/official-plugin-only/official-android-7f76fce0-e701-4486-8e64-48832e860d05.json)发生在停止请求发送前，错误是测试工具将custom当成权限扩大；失败清理完成，保留且不计通过。没有修改产品、官方源码、SDK、启动方式或构建/安装包。

两个实际手机截图已查看：[停止后截图](../../../dsh-mobile/artifacts/official-plugin-only/6021ae57-8cbf-4deb-b177-c1a47068a6ef/child-stopped.png)的视窗仍主要显示较早回复；[再次续聊截图](../../../dsh-mobile/artifacts/official-plugin-only/6021ae57-8cbf-4deb-b177-c1a47068a6ef/child-after-stop.png)实际显示“工具调用已停止”、新的真实回复及子会话草稿。停止轮的“已停止”文本也由实际DOM等待核验，不能把截图中未显示的内容说成已目视。

11:27的[82轮/1137阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn71-restoration-audit.json)确认原App PID4249/安装摘要/正常前台保持，临时授权撤销、测试UID停止、缓存/保存记录及网关/映射清理；官方39256/16958继续正常运行且Remote关闭，两版官方文件及只读源码保持。本次只证明一层可继续子会话的这个只读工具轮停止与随后续聊，不宣称OS子进程的所有取消策略、停止竞态、多层/一次性、父Agent释放、冷Host恢复或其他生命周期已通过。

一次性本地子会话仍未实测：官方默认spawn/fork注册prepareContinuable，tool-subagent参数不能选择one-shot。最新版subagent-acp登记为external，没有可打开的本地子会话，不能当作one-shot读取的验收入口；实际外部任务整轮复验及此前余额不足失败见下节。没有把错误地址拒绝或mock结果当作通过，也不修改DSH或注册假提供方替代真实路径。

## 实际归档安装、二维码图片与自然过期（2026-10-10）

本次以当前同一APK和独立插件0.1.80-latest.0核对交付入口，不构建任何产品、官方DSH或SDK。通过官方 `pnpm dsh plugin --profile web add <owned-tgz>` 将[234144字节归档](../../artifacts/official-alpha2-sdk/candidate-package-check-Alpha2PublicOnly02/dsh-mobile-plugin-0.1.80-latest.0.tgz)安装到隔离官方profile；[真实安装记录](../../artifacts/official-plugin-only/archive-install-61435351-e4be-4e0f-9e2e-b62ee2517789.json)退出0，63文件与归档相同，已不再链接开发目录。官方profile使用`nodeLinker: hoisted`，真实文件位于其`node_modules/@dsh-mobile/plugin`，并非要求`.pnpm`目录布局。正常重启后的官方Host31408/16958加载成功，原cordis配置字节保持。

[安装后源码/归档复核](../../artifacts/official-plugin-only/delivery-audit-1f1bd91c-9c5c-4e70-a956-f4d5b3f961e0.json)继续核对51项插件、16项协议、28项依赖源码；[公开接口映射](../../artifacts/official-plugin-only/interface-audit-59a2f5a1-ced2-44e5-9c4a-d04cf8607f49.json)的62调用/7条订阅全部有官方契约，不公布已移除的预设管理接口。

随后[实际Android整轮](../../../backend/artifacts/official-plugin-only/official-android-2ea87817-42c7-4a2e-b1ac-a72062be41ca.json)在同一实际归档安装Host上运行，外层357.12秒/14阶段，[独立退出记录](../../../backend/artifacts/official-plugin-only/official-android-2ea87817-42c7-4a2e-b1ac-a72062be41ca.outcome.json)为0，无未捕获、页面或隔离渲染异常，`passed/pairingVerified/coreInferenceVerified/cleanupCompleted=true`。手机实际模型回复、选模、write允许一次/拒绝、重连保留会话/草稿、已有工作区新建与撤销拒绝全部通过。

| 配对入口 | 实际结果 |
| --- | --- |
| 真实Android系统选图取消 | 原链接保留，不增加设备或授权 |
| 普通网页二维码 | 原生实际解码后提示无效，不覆盖原链接、不领取 |
| 相机扫码页面 | 实际原生扫描器、权限与返回核对；取消保留输入；没有验证物理相机拍摄识别 |
| 五分钟自然过期 | 从真实配对生成开始等待300092毫秒；数据库到期时间始终不改。实际到期06:06:53.620Z，观察06:06:53.720Z；手机显式继续后显示过期/已领取提示并清空链接，不进入绑定/会话，旧key未消费且无新设备 |
| 新的有效二维码图片 | 实际系统选图和原生解码回填真实服务/链接并显示HTTP提示，尚无设备或授权；显式继续后只有一个待批准设备、新key单次消费，旧key仍未消费且无管理权 |

[手机配对证据](../../../dsh-mobile/artifacts/official-plugin-only/2ea87817-42c7-4a2e-b1ac-a72062be41ca/pairing.json)、[实际过期界面](../../../dsh-mobile/artifacts/official-plugin-only/2ea87817-42c7-4a2e-b1ac-a72062be41ca/pairing-expired.png)已核对。五分钟等待后通过同一真实系统链接入口返回原App页面；没有锁定模拟器或结束其他应用。测试二维码图像均在本项目生成，仅用于原生识别验收，清理后不存在；电脑产品页面当前提供配对链接，不宣称已有二维码展示按钮。

失败原件保留而不计成功：[b452bea1](../../../backend/artifacts/official-plugin-only/official-android-b452bea1-2044-4b7d-b9f8-48592fe49bab.outcome.json)已完成配对步骤但模型实际write参数少一位，原严格断言未放宽；[3d73233c](../../../backend/artifacts/official-plugin-only/official-android-3d73233c-a581-4456-a656-c5a23528e03f.outcome.json)在等待中被切到其他应用，Android前台点击超时。首次[归档验收9c267b5a](../../artifacts/official-plugin-only/archive-install-9c267b5a-0758-43ae-958a-eea9fba284e0.json)真实安装成功，但测试错误要求`.pnpm`布局而失败；已由同一官方安装器恢复原链接并正常重启，仅修验收布局断言后完整重新安装。不能把这些失败报告改写为通过。

[最终恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn77-restoration-audit.json)核对86个成功专项/1185实际阶段，并关联归档安装Host与本轮手机核心。原App路径/摘要/PID4249/正常前台、Key公开配置状态/绑定/历史保持；测试授权、原件、独立UID、网关、映射清理，官方Host31408保持正常且Remote停用。两版官方原文件与只读源码不变。本地固定组合的结论及剩余限制见[当前支持清单](./official-support.md)，安装使用从[安装说明](./official-installation.md)进入。

## 文件与聊天引用的实际入口（2026-10-10）

[真实中转与官方记录](../../../backend/artifacts/official-plugin-only/official-android-0873ee09-0217-420e-aa33-1937fd946b6f.json)、[退出0结算](../../../backend/artifacts/official-plugin-only/official-android-0873ee09-0217-420e-aa33-1937fd946b6f.outcome.json)和[手机引用证据](../../../dsh-mobile/artifacts/official-plugin-only/0873ee09-0217-420e-aa33-1937fd946b6f/references.json)证明两个真实入口：在输入框输入 `@` 后选择候选，以及通过“添加附件 → 引用文件或聊天”搜索选择。每个入口分别引用同一工作区的中文目录、含空格文件名及一个已有聊天；选择只更新草稿，不隐式发送消息或调用工具。

`@` 引用选完后实际停用/恢复远程服务，手机恢复两个引用标签，草稿正文和完整编辑器结构逐项保持。显式发送后，官方将聊天引用转换为带来源身份及快照序号的 `session-reference/recall`，模型只调用一次公开 `read` 工具读取正确文件，再唯一回复文件和来源聊天中各自的标记。目标提示未预填答案；两次来源聊天的完整历史、文件内容、原目标历史前缀和profile配置均保持。`@` 入口的用户/召回/读取结果/回复序号为39/40/44/48，菜单入口为55/56/60/64。[实际回复截图](../../../dsh-mobile/artifacts/official-plugin-only/0873ee09-0217-420e-aa33-1937fd946b6f/reference-menu-reply.png)已目视核对，零iframe、页面和隔离渲染异常。

整轮外层74.5秒、十二个Android阶段，`passed/referencesVerified/coreInferenceVerified/cleanupCompleted=true`；随后真实write允许一次/拒绝、新建、重连和撤销均通过。复用插件0.1.80-latest.0、官方0.2.1-alpha.2正常 `pnpm dsh web` 和SHA256 `41a15686de80c4c431f3b50e551d40a4de3345d1ae0afe399a1a0135ec85e773`的同一APK，没有构建或安装产品。[85轮/1171阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn76-restoration-audit.json)确认原App路径/摘要/PID4249/前台、Key/绑定/历史与两版官方文件和只读源码保持；本轮测试授权、原件、独立UID、网关与映射清理，正常16958Host保持且Remote已停用。

首轮[157b1fa4失败](../../../backend/artifacts/official-plugin-only/official-android-157b1fa4-4409-46f0-ba62-714434d5d29b.json)及退出1结算保留，不计通过。失败发生在Android前的文件候选准备：官方裸文件名搜索使用已有索引，刚创建的夹具尚未进入候选。按公开目录查询语义改为 `引用资料/文件名`，不改官方缓存或生产代码。当前范围只验证同一工作区的上述文件和聊天引用，不据此声称跨工作区、来源消失/变化、其他引用类型或发送中进程结束已验。[真实检查实现](../../../backend/tests/support/official-references.ts)与[手机实际操作](../../../dsh-mobile/tests/support/official-references.mjs)为事实来源。

## 充值后的同APK核心与外部任务整轮复验（2026-10-10）

用户确认充值后，复用当前自有APK（SHA256 `41a15686de80c4c431f3b50e551d40a4de3345d1ae0afe399a1a0135ec85e773`）、独立插件`0.1.80-latest.0`、生产鉴权/转发代码与未修改的官方`0.2.1-alpha.2`正常`pnpm dsh web`。两轮均没有产品构建、重新安装或官方DSH/SDK改动。

| 实际入口 | 真实核验结果 |
| --- | --- |
| [核心回归](../../../backend/artifacts/official-plugin-only/official-android-4b97caa7-6659-4c8a-ab89-ec059f0c116e.json)／[退出0结算](../../../backend/artifacts/official-plugin-only/official-android-4b97caa7-6659-4c8a-ab89-ec059f0c116e.outcome.json) | 十个Android阶段、外层79.825秒。手机读已有工作区/历史、选模实际影响回复、唯一消息与真实回复、write批准实际写入一次/拒绝不写、断线保留聊天/草稿、已有工作区新建及撤销拒绝重连全部通过。 |
| [外部任务整轮](../../../backend/artifacts/official-plugin-only/official-android-4c424859-f41e-4842-9269-10fd82cfbb3d.json)／[退出0结算](../../../backend/artifacts/official-plugin-only/official-android-4c424859-f41e-4842-9269-10fd82cfbb3d.outcome.json) | 十二个Android阶段、外层86.442秒。真实官方ACP后端完成唯一外部任务，父会话实际seq53结算与手机展开正文一致；无本地子Session，主聊天/旁栏无效入口拒绝，父草稿保持。随后同一轮的write允许/拒绝、重连、新建、撤销全部通过。 |

[实际手机正文截图](../../../dsh-mobile/artifacts/official-plugin-only/4c424859-f41e-4842-9269-10fd82cfbb3d/external-parent-result.png)已目视核对，展示官方实际结算正文及唯一回复标记；[手机结构化证据](../../../dsh-mobile/artifacts/official-plugin-only/4c424859-f41e-4842-9269-10fd82cfbb3d/external-child.json)明确来源为结算记录，不能用提示词或工具参数冒充。两轮零页面和隔离渲染异常，`passed/cleanupCompleted=true`，外部轮`externalChildVerified=true`。

正常卸载临时ACP提供方及测试预设后，标准预设保持、两条本次包管理版本例外自动撤回且原字节恢复；自有ACP profile恢复初始空配置，所属ACP进程退出。[84轮/1159阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn75-restoration-audit.json)加入这两轮真正成功结果，未计入历史失败或无模型安装清理。原App PID4249/安装摘要/前台、Key/绑定/历史保持；测试设备撤销，独立UID、网关、映射及暂存清理，官方Host39256/16958正常且Remote停用。两版官方原文件、只读源码保持；[审计脚本](../../../dsh-mobile/scripts/check-official-alpha2-restoration.mjs)同时核对外部结果来源、无效入口及包管理配置原字节。

此前余额不足的阻塞已解除。此结果不扩大为旧one-shot本地子会话、外部内层过程历史/续聊或任意插件与生命周期，完整兼容任务仍按功能矩阵继续。

## 外部任务结果与当前验收限制（2026-10-10）

以下保留充值前的失败与[当时阻塞审计](../../../dsh-mobile/artifacts/official-plugin-only/goal-balance-blocker-audit.json)，不代表当前仍需等待。充值后同APK核心及外部任务整轮已在[上节](#充值后的同apk核心与外部任务整轮复验2026-10-10)通过，历史失败不改写为成功，其他未验范围保持。

最新官方 ACP 提供方登记为 `external`，不创建可打开的本地子会话；它与旧记录的 `one-shot` 不是同一种能力。DSHM 现在在父会话的子任务列表显示“外部任务”，提供“查看任务结果”，移除这个条目的主聊天和旁栏打开入口。正文仅来自电脑实际返回的 `subagent-settled` 记录，不使用提示词或工具参数中的同名标记。[结果提取与入口守卫](../../../dsh-mobile/src/remote-subagents.mjs)、[手机列表](../../../dsh-mobile/src/ui/RemoteSubagents.jsx)及主聊天/旁栏调用点均已调整，111项相关 Node 回归、自有Web构建、Android增量构建和lint通过。

[本轮手机证据](../../../dsh-mobile/artifacts/official-plugin-only/c3e81b68-7c1b-49ad-bfc3-2e07155a8665/android.json)实际证明：正常插件安装的官方 ACP 后端执行真实模型请求，父会话收到唯一任务 `2f1fdd85-523f-4c84-9e9e-a3fb2a8d12db` 的结算seq53；手机展开[实际结果正文](../../../dsh-mobile/artifacts/official-plugin-only/c3e81b68-7c1b-49ad-bfc3-2e07155a8665/external-parent-result.png)，保留父草稿，并拒绝两种无效打开。没有本地子Session、整页DSH内嵌或模拟模型事件。独立[ACP预检](../../artifacts/official-plugin-only/acp-preflight-1357b487-44f8-41d2-a1e4-4343951554f6.json)仅证明真实ACP通信，不计Android通过。

**此前整轮未通过。** 后续普通write审批回归等待180秒超时，[官方记录诊断](../../../dsh-mobile/artifacts/official-plugin-only/c3e81b68-7c1b-49ad-bfc3-2e07155a8665/balance-failure-diagnosis.json)确认seq68/70为 `Insufficient Balance`，写入工具尚未调用；[原始失败与清理](../../../backend/artifacts/official-plugin-only/official-android-c3e81b68-7c1b-49ad-bfc3-2e07155a8665.json)和[退出1结算](../../../backend/artifacts/official-plugin-only/official-android-c3e81b68-7c1b-49ad-bfc3-2e07155a8665.outcome.json)保持。当前新APK13,360,612字节，SHA256 `41a15686de80c4c431f3b50e551d40a4de3345d1ae0afe399a1a0135ec85e773`，[构建凭据](../../../dsh-mobile/artifacts/official-alpha2-android-build/official-app.json)对应自己的增量构建；本轮两次自有App构建分别加入入口守卫和真实结果披露，没有构建DSH、SDK、未变化的插件或网关。当时不能将历史APK的核心通过沿用为这份APK的完整回归通过；充值后的同APK实测见上节，两轮仍复用它而未重建产品。

此前四个失败保留：`ddc07ab7`为ADB连接中断；`97fb836e`是测试错误寻找“关闭”而非“关闭窗口”；`a41cffe0`已完成外部任务但随后模拟器前台被切到其他应用；`f1f89564`暴露普通聊天隐藏官方上下文结算、用户无法看到结果，随后才补上DSHM结果入口。失败均不计成功，不隐藏真实余额错误或削减审批检查。

[本轮恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn72-restoration-audit.json)复核此前82个成功专项/1137阶段；没有把本轮失败加入计数。测试设备已撤销、独立UID停止、测试网关和映射清理，原App PID4249、安装摘要和前台保持；正常Host39256/16958保持且Remote关闭，两版官方安装与只读源码逐项不变。正常卸载临时ACP提供方/预设后，恢复自有ACP profile为初始空配置，并撤回普通安装器为本次依赖追加的两条版本年龄例外，旧包管理配置原字节核对通过；实际Node进程清单没有此隔离home的ACP进程。未读取Key内容或替换绑定。

边界保持：此结果只覆盖一个真实外部任务的最终正文回传与手机查看，不包含外部任务内层工具实时历史、继续聊天、多层、错误/取消/重连及其他提供方生命周期。官方ACP目前消费内层通知但只向父会话发布最终助手正文，DSHM不伪造缺失过程。旧一次性本地子会话仍未实测，不能用external结果替代。

## ACP测试安装的配置恢复（2026-10-10）

[安装清理专项](../../../backend/artifacts/official-plugin-only/external-install-6b3a59df-b3cb-4c22-98fa-e6483cfee6dd.json)与[固定测试结果](../../../backend/artifacts/official-plugin-only/external-install-vitest-6b3a59df-b3cb-4c22-98fa-e6483cfee6dd.json)在正常官方Host39256/16958通过：普通插件安装器实际安装官方ACP提供方及独立验收预设，实际追加两条 `minimumReleaseAgeExclude`；正常卸载后，[自有验收清理](../../../backend/tests/support/official-external-subagent.ts)识别这两条已核验的版本例外，恢复安装前的包管理配置原字节。标准预设内容、其他预设清单均保持。只恢复本次已知追加内容，出现无关字段、重复或额外策略时保留现场并拒绝覆盖，三类负例实际文件核对通过。

[可运行测试](../../../backend/tests/official-external-install.test.ts)需明确设置 `DSHM_OFFICIAL_EXTERNAL_INSTALL_CHECK=1`，只允许五个公开安装/预设接口；不能发送模型消息、读取凭据或操作手机。五项测试与后端类型检查通过。它证明安装/卸载的环境恢复，`inferenceVerified/androidVerified=false`，不计入82个成功Android专项/1137阶段，不能替代真实推理及Android验收；充值后的真实整轮结果见上节。本轮未构建或安装任何产品组件，ACP profile继续保持初始空配置。

[安装后恢复核对](../../../dsh-mobile/artifacts/official-plugin-only/turn73-restoration-audit.json)确认原App PID4249/安装摘要/前台、绑定和历史保持；独立UID及网关停止，Remote关闭，两版官方安装和只读源码未变。该报告再次核对既有82轮原成功证据，不把本次安装清理当作额外Android成功。

## 手机技能目录、说明与实际调用（2026-10-10）

状态：已核验限定场景；维护：DSHM兼容验收；最近核验：2026-10-10。未修改官方alpha.2、候选插件0.1.80-latest.0、正常pnpm dsh web及当前APKc5da7627全部复用，无产品/DSH/SDK构建或重新安装。

[实际报告](../../../backend/artifacts/official-plugin-only/official-android-e54bdc09-2b59-45a1-b19a-8e3f2b130f87.json)、[退出结果](../../../backend/artifacts/official-plugin-only/official-android-e54bdc09-2b59-45a1-b19a-8e3f2b130f87.outcome.json)、[手机专项](../../../dsh-mobile/artifacts/official-plugin-only/e54bdc09-2b59-45a1-b19a-8e3f2b130f87/skills.json)：30.010秒、10个真实Android阶段、退出0、零页面/Slots错误、受控清理完成。来源：[普通文件与公开记录核对](../../../backend/tests/support/official-skills.ts)、[手机实际入口](../../../dsh-mobile/tests/support/official-skills.mjs)。

| 入口 | 实际核验 |
| --- | --- |
| 添加附件→选择技能 | 官方skills/list目录与手机一致，手动技能显示“仅手动调用”，user-invocable:false技能不出现，与真实permission命令同名的技能不可选。 |
| 搜索与查看说明 | 输入即时筛选、无匹配提示、恢复搜索均通过；查看说明打开真实工作区SKILL.md，选择与预览没有增加消息/轮次，原草稿保持。 |
| 选择及发送 | 选择只将/name加入已有草稿，重复选择不重复添加；用户明确发送才调用。真实用户seq38、官方skill-invocation正文seq39、真实模型回复seq41；答案只存在技能正文，未写入测试用户消息，没有工具或命令执行。 |
| 恢复 | 原历史前缀与全局配置摘要相同，三份技能文件核对后删除，公开目录已移除，设备权限/测试UID/网关清理。测试工作区及目录结构保留为证据。 |

本轮在专用测试工作区的.dsh/skills创建普通Markdown技能，.git空目录仅作为该测试项目的根标记。官方findProjectRoot以最近.git存在决定技能根；没有修改原项目/global技能目录、插件注册或DSH。首轮因测试目录处在插件仓库中而漏设独立根标记，目录查到父仓库，未得到目标技能；[失败报告](../../../backend/artifacts/official-plugin-only/official-android-9b34d4c5-56e5-4728-94df-602b232cd49b.outcome.json)清理完成并保留，不计成功。修正仅为测试输入环境。

两张实际手机[搜索列表](../../../dsh-mobile/artifacts/official-plugin-only/e54bdc09-2b59-45a1-b19a-8e3f2b130f87/skill-picker.png)和[真实回复](../../../dsh-mobile/artifacts/official-plugin-only/e54bdc09-2b59-45a1-b19a-8e3f2b130f87/skill-real-reply.png)已查看。11:16的[81轮/1125阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn70-restoration-audit.json)确认原App PID4249/安装身份/正常前台、Key公开状态/绑定/历史保持；官方39256/16958正常运行且远程关闭，临时授权/UID/网关/映射清理，两版官方文件和只读源码保持。

范围为标准模式下的普通项目技能。其他提供方/技能动态变更、跨会话切换或在途异常、其他预设/子会话/后台生命周期未据此宣称通过。

## 当前完成范围与剩余验证

2026-10-10初轮[接口/源码/交付入口审查](./official-interface-audit.md)发现两个旧预设管理声明；随后候选0.1.80已清理并完成下节真实复验。历史0.1.79映射与归档报告保留，不用新结果覆盖旧证据。

## 旧预设管理协议清理与核心复验

候选0.1.80-latest.0通过官方安装器从0.1.79升级，返回restart-required后正常pnpm重启隔离Host至39256。共享协议针对alpha.1/alpha.2清理复制/删除声明并拒绝转发，旧0.1.6契约保留。仅构建变化的自有协议/插件，未构建DSH/SDK/App/网关，旧归档保留。

[真实核心报告](../../../backend/artifacts/official-plugin-only/official-android-fede1775-d491-4a3f-988c-8bd2d3a34e73.json)及[退出记录](../../../backend/artifacts/official-plugin-only/official-android-fede1775-d491-4a3f-988c-8bd2d3a34e73.outcome.json)41.471秒/十Android阶段通过：当前模型同步、唯一真实回复、write允许与拒绝、新建会话、重连和撤销。临时管理连接重新领取生产票据，两条入口均未公布且被插件明确拒绝；收回权限后继续普通核心验证。零页面/局部渲染/未捕获异常、清理通过。

当前[接口清单](../../artifacts/official-plugin-only/interface-audit-87135ad8-8455-4f76-b97b-a6a66bfcac9d.json)为62调用/7流，过期声明为零；[交付审查](../../artifacts/official-plugin-only/delivery-audit-01a0db6d-7483-4a0a-89b8-c8844434c639.json)的63文件及source map与当前源码/实际link安装一致。79项协议/插件回归与类型检查通过。真实驱动两次失败的原报告5b70ac10/f1521d11保留，不计入成功；仅调整权限变更后的票据重连和会话初始化时序。

最新08:52的[70轮/990阶段恢复核对](../../../dsh-mobile/artifacts/official-plugin-only/turn62-restoration-audit.json)确认原App4249/Key公开状态/绑定/历史/实际前台保持，正常16958Host39256运行且远程关闭；测试状态清理，两版官方文件及只读源码未变。该结果只覆盖相应版本与专项，不发布全扩展兼容声明。

1. 已审查公开变化及精确版本分支，使用配套官方SDK；没有开放未经审阅的新远程写入口。
2. 已通过正常官方CLI/插件安装入口启动，独立profile通过正常凭据提供方读取已保存的Key；未读出凭据、覆盖原App或修改官方文件。
3. 核心工作区/会话、选模、真实消息及回复、write允许/拒绝、重连已通过；提问/计划、队列/停止、会话搜索/分支/归档、命令详情、普通后台输出、Host重启、文件及Office预览、附件上传/原件保存、普通局部插件及指定工作区/设置管理都有上方新版独立证据。
4. 完成通知/进程恢复、原生一层子会话创建/手机续聊、手机目标控制及真实自动续轮、双成员工作流/手机导航/真实结果、定时六类创建/目录/单次实际触发、电脑Key状态/原生密码窗口取消、服务地址确认/取消、DeepSeek目录设置/实时选模名称/完整行及默认继承恢复，以及无Key自定义提供方新增/改名/已有地址目录/模型及兼容设置/协议切换/移除、独立测试Key管理、聊天/搜索地址写入及恢复默认、自定义地址写入/目录读取/拒绝删除必需地址、三类旧确认拒绝与最终环境审计已通过。其他子会话/目标/工作流/周期提醒类型和生命周期、已有Key更换/只读凭据、地址写入生命周期、带Key或内置提供方设置、更多协议、任意插件/升级、全部生命周期、官方Electron和公网性能不在这些通过结论内。alpha.1边界报告保留原版本，不批量改名为alpha.2结果。

上述阶段的 Linear [KKC-24](https://linear.app/kkcodes/issue/KKC-24)当时保持进行中；当前固定组合的验收结论见[支持清单](./official-support.md)。新版本预发布状态、公开声明比较、CLI运行、Host加载与完整 Android 验证分别记录，不互相替代。

最初只读调查阶段的检查保留：新脚本语法、两版原摘要、两仓diff及166篇Markdown/10287本地链接通过，当时没有启动新版Host/模型或替换App。后续真实核心复验已正常启动独立16958官方Host，使用正常凭据提供方与独立测试App；原Key内容、原App/绑定/历史保持。最终环境与专项结果按本页后续记录更新，不把最初阶段的端口状态当作当前状态。

## 完整文件分享的实际接收（2026-10-10）

官方alpha.2正常 `pnpm dsh web`、独立插件 `0.1.80-latest.0` 和现有Android验收APK，经生产鉴权/中转完成[整轮真实验收](../../../backend/artifacts/official-plugin-only/official-android-1ad3d60f-2a8b-42b5-824e-54617593ccf1.json)与[52.422秒测试结果](../../../backend/artifacts/official-plugin-only/file-share-vitest-1ad3d60f-2a8b-42b5-824e-54617593ccf1.json)，13个Android阶段通过，无未处理错误。复用App与DSH；本轮仅增加测试驱动，未构建或安装任何产品组件。

手机从电脑完整下载168961字节TXT后，实际选择系统分享面板中的独立接收器。不同UID接收者读取的文件名、字节数、SHA-256与电脑原件及独立三块中转读取一致；只授予content URI读取权限，写入和无关URI访问均被系统拒绝。手机仍显示“已打开系统分享面板”，不宣称接收方已发送。接收器、下载原件及本轮完整分享副本已清理，其他接收应用、其他格式和分享途中生命周期不在此专项结论内。

测试接收器以SDK工具仅编译两份Java测试类，未调用Gradle或重建App，[构建报告](../../../dsh-mobile/artifacts/official-alpha2-share-receiver/0693b200-212f-460a-83d8-4f5a56780c9f/build-report.json)记录输入与独立APK摘要；原App构建产物字节保持。可用 `node scripts/run-official-background-host-check.mjs files-share` 从后端复验，[分享接收驱动](../../../dsh-mobile/tests/support/official-share-recipient.mjs)验证实际系统控件和权限，不能以直接调用测试Activity代替用户分享入口。

首轮[失败结果](../../../backend/artifacts/official-plugin-only/official-android-aaee32ce-e8e6-463b-916d-9ed6194d748e.outcome.json)保留：已有应用占满折叠面板首行，新接收器在屏幕外，测试驱动未展开系统面板。修正为根据实际观测的系统边界上滑展开后，整轮真实入口复验通过；该失败不是产品分享传输失败，也不计入成功数量。

09:06的[独立恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn63-restoration-audit.json)核对71轮/1003个实际Android阶段。原App PID4249、安装路径/摘要、Key公开配置状态、绑定/历史及实际正常Launcher前台保持；验收App已停、分享副本/下载/保存记录为空、独立接收器不存在、测试授权撤销且网关和映射关闭。正常官方Host39256仍在16958运行，远程连接关闭，两版官方原文件及只读源码均未改变。完整功能兼容声明仍未完成，数量不代表覆盖所有组合状态。

## 交付卡片与电脑原生打开（2026-10-10）

官方版本仍为未修改的 `0.2.1-alpha.2`，正常 `pnpm dsh web` /16958，插件 `0.1.80-latest.0`。真实模型已写入唯一的 `deliverables/presented` 记录，但此前手机卡片缺失：[失败证据](../../../dsh-mobile/artifacts/official-plugin-only/63d5f9ad-ae0c-49a6-b107-12ff956ce774/presented-desktop.json)显示原轮数据已有文件、预览服务最终存在，却没有注册交付插槽。原因是文档服务异步加载，启动时一次性检查提前退出。

[DSHM卡片注册](../../../dsh-mobile/src/remote-deliverables.jsx)改为等待公开 `documentPreviews` 服务；新版同时等待 `configForms`，接入真实代码视图偏好、差异读取及文件动作子插槽。[变更预览](../../../dsh-mobile/src/remote-review-preview.jsx)补齐新版局部动作插槽。保留旧版本分支，不修改官方组件或源码。实际卡片沿正式侧栏预览入口打开，工作区相对路径和交付绝对路径标签按各自地址保留。

| 真实入口 | 独立核对 |
| --- | --- |
| 工作区文件→在电脑打开 | 手机确认后实际记事本展示完整5,002行；取消、原件变化及文件缺失不触发原生打开，原件摘要恢复。 |
| 聊天交付卡片→侧栏预览 | 真实present工具、唯一原事件及真实DeepSeek回复核对；手机卡片与当前文件标签可见，不注入会话事件。 |
| 交付文件→在电脑打开 | 记事本实际文档全文匹配；仅关闭本轮专用文件窗口。 |
| 交付文件→在电脑文件夹中显示 | 实际Explorer新窗口唯一选中原文件；取消无副作用，本轮窗口关闭，原Explorer窗口3411566保持。 |

[工作区专项](../../../backend/artifacts/official-plugin-only/official-android-b846ba30-cf2a-4f3f-81f8-f2b5a71c587e.json)63.981秒/14个Android阶段通过；[修复后的完整交付专项](../../../backend/artifacts/official-plugin-only/official-android-5937343e-6f01-4888-aea0-24fefe4e4a7f.json)120.830秒/16阶段通过，[实际原生窗口结果](../../../dsh-mobile/artifacts/official-plugin-only/5937343e-6f01-4888-aea0-24fefe4e4a7f/presented-desktop.json)记录原文件选中、完整文档匹配及清理。[同APK核心回归](../../../backend/artifacts/official-plugin-only/official-android-f015fd19-b826-462f-a213-bb05e61eb2be.json)44.783秒/10阶段通过真实回复、模型同步、write允许/拒绝、新建、重连及撤销，均无未处理或页面/插槽渲染异常。

只构建变化的DSHM Web/App，Android构建与lint91秒通过，19项相关回归及后端类型检查通过。[新APK与源码摘要](../../../dsh-mobile/artifacts/official-alpha2-android-build/deliverables-build.json)：13,360,171字节，SHA256 `c5da762758b7aae1fed2a03c1fdeac78c3c53a00c0d0313ac8523c685e206e15`，仅安装独立officialtest UID。DSH、SDK、插件和网关未重建。Windows UIAutomation全文比较规范化原生CR行分隔，不修改原件。诊断读取私有字段失败65fae80e、旧弹窗选择器7e0e8d77、同名标签选择78cb42bd与收尾标签选择e3738120的失败报告均保留，不计成功；最后三项不是文件传输或原生打开失败。

09:50的[独立恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn64-restoration-audit.json)核对74轮/1,043个实际Android阶段：原App PID4249、安装身份、正常前台、Key公开配置状态、绑定与历史保持；测试App停止、授权/中转/映射/文件和原生测试窗口清理，原Explorer保留。正常官方Host39256仍运行且远程关闭，两版官方原文件及只读源码未变。其他来源、文件关联应用、Electron和全部扩展组合未被本节覆盖。

## 计划修改与实际整轮差异（2026-10-10）

复用插件 `0.1.80-latest.0`、正常官方 `0.2.1-alpha.2` Host39256/16958及现有DSHM测试APK `c5da7627…`，没有修改、注入或重建DSH/SDK，也没有重建/安装App、插件或网关。本次只补实际入口验收和测试文件的受控清理。

| 实际入口 | 核对结果 |
| --- | --- |
| 待审批工具详情 → 查看本次修改 | 允许与拒绝两次请求均打开DSHM自己的侧栏；拟写入内容与真实write参数一致，切到最新完整文件仍是未修改的原件，返回后仍是同一待审批 |
| 批准后完成卡片 → 整轮差异 | 官方真实workspace/changes事件与公开summary/diff两条HTTP接口互证，唯一原文件、旧/新内容、轮次和记录坐标一致；不从模型回复猜路径 |
| 单栏/双栏及换行 | 原ReviewTab可双向切换、开启换行；关闭重开保留文件选择和显示状态 |
| 差异 → 当前文件、返回聊天 | 手机显示电脑实际写入后的完整原件；返回后原草稿保持；拒绝请求未改文件、没有工具重试 |
| 环境收尾 | 最终验收的两个专用文件由注册清单核对原字节后删除；授权撤销、中转/映射清理、独立UID停止，原App正常前台和官方Host保持 |

最终[真实Android报告](../../../backend/artifacts/official-plugin-only/official-android-3860c413-7aef-44cf-817e-cda4fbcbf7c4.json)50.668秒，11阶段；[外层结果](../../../backend/artifacts/official-plugin-only/official-android-3860c413-7aef-44cf-817e-cda4fbcbf7c4.outcome.json)55.558秒、无未处理错误、cleanupCompleted/testFilesRemoved=true，截图[双栏差异](../../../dsh-mobile/artifacts/official-plugin-only/3860c413-7aef-44cf-817e-cda4fbcbf7c4/review-turn-split.png)和[实际当前文件](../../../dsh-mobile/artifacts/official-plugin-only/3860c413-7aef-44cf-817e-cda4fbcbf7c4/review-current-file.png)已查看。前一轮762b2d95也通过同一11阶段；只核对恢复时累计76轮/1065阶段，不把计数等同全功能覆盖。

两次测试假设错误保留：[6e42a955](../../../backend/artifacts/official-plugin-only/official-android-6e42a955-d73c-4d7e-a49f-650f6328c242.outcome.json)误要求write计划预览含旧内容，官方diff-card-model明确oldText:null；[8cb868e0](../../../backend/artifacts/official-plugin-only/official-android-8cb868e0-4e5c-4318-b0bd-611b9a00fcbb.outcome.json)误认为原ReviewTab初始单栏，官方review-store实际默认双栏。修正测试规则，未修改产品行为；失败不计通过。早期三轮留下的四个测试文件在核对专用路径及原字节后[单独清理](../../../dsh-mobile/artifacts/official-plugin-only/turn65-review-fixture-cleanup.json)，会话历史保留。

10:08的[恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn65-restoration-audit.json)确认原App PID4249/安装身份/Key公开状态/绑定/历史保持，正常前台已查看；测试授权、UID、网关和映射已收尾，官方Host39256远程关闭，两版官方原文件与只读源码未变。多文件选择、二进制/超大改动、差异记录过期、读取在途断线及其他生命周期不由本节替代。

## 长聊天分页与重连（2026-10-10）

未修改的官方alpha.2、正常16958 Host、插件0.1.80与同一现有APK下，[真实Android报告c0956c21](../../../backend/artifacts/official-plugin-only/official-android-c0956c21-99f1-4838-b726-6bdd9a02c439.json)150.737秒/12阶段通过；[执行结果](../../../backend/artifacts/official-plugin-only/official-android-c0956c21-99f1-4838-b726-6bdd9a02c439.outcome.json)确认没有构建产品、重新安装App或未处理异常。

[电脑验证器](../../../backend/tests/support/official-long-history.ts)通过公开session/prompt生成52轮唯一短文本请求和真实DeepSeek回复，逐轮核对来源、唯一事件与正常完成，不注入历史。官方客户端普通窗口按至少50条消息/两轮对齐；验证器以固定throughSeq读取三页，另用完整公开历史核对相邻序号和原事件。手机保持自己的页面，实际点击“加载更早的消息”，不是直接调用加载函数。

| 实际手机入口 | 独立结果 |
| --- | --- |
| 返回列表后重开长会话 | 初始只包含最新窗口；两次按钮加载补齐三页503条原事件，逐条与官方历史一致，52轮消息/回复各显示一次，末页移除加载按钮。 |
| 加载时继续阅读 | 两次前插保持原实体消息的位置，最大偏移0.467px；原会话与未发送草稿保持。 |
| 后续写入审批 | 当前手机仍可发起真实write请求，允许一次实际执行、拒绝保持原件且不重试；公开记录与文件核对。 |
| 正常中转断线/重连 | 原会话与OFFICIAL_RECONNECT_DRAFT保持，实际再次加载三页559条完整事件，包含后续工具结果；阅读位置最大偏移0.467px，无遗漏/重复。 |
| 其他核心回归 | 模型同步、初始手机真实回复、已有工作区新建聊天与撤销拒绝通过；页面/Slots渲染错误均为空。 |

[首次分页记录](../../../dsh-mobile/artifacts/official-plugin-only/c0956c21-99f1-4838-b726-6bdd9a02c439/long-history.json)、[重连分页记录](../../../dsh-mobile/artifacts/official-plugin-only/c0956c21-99f1-4838-b726-6bdd9a02c439/long-history-reconnect.json)及两张手机截图已核对。记录中的“最早”截图保持原阅读锚点，不要求自动滚到会话起点；序号和实际消息显示证明已完整加载。[手机验证器](../../../dsh-mobile/tests/support/official-long-history.mjs)只读取公开Session事件窗口，对照原消息实体坐标，不修改Client状态。

两个本轮测试文件由原工具验证器恢复原字节后[精确删除](../../../backend/artifacts/official-plugin-only/turn66-history-fixture-cleanup.json)，会话历史保留。后续复验已接入相同受控文件登记与清理；该登记只经类型/语法检查，当前真实报告的清理证据是上面的独立文件核对。10:23的[77轮/1077阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn66-restoration-audit.json)确认原App PID4249、安装身份/Key公开状态/绑定/历史与正常前台保持；测试授权/UID/网关/映射已清理，正常官方Host39256远程关闭，两版官方文件及只读源码保持。

本节只覆盖普通文本长会话的顺序、无重复、阅读锚点、草稿和同进程重连；加载请求在途切换会话/撤权/进程结束、超大窗口与全部嵌套工具仍待专项，不由累计数量替代。

## 历史分页回执在途切换与断线（2026-10-10）

[真实Android报告a663b3c6](../../../backend/artifacts/official-plugin-only/official-android-a663b3c6-7d7c-4965-a564-eae6cc12eabd.json)61.414秒/13阶段通过：[结果](../../../backend/artifacts/official-plugin-only/official-android-a663b3c6-7d7c-4965-a564-eae6cc12eabd.outcome.json)确认没有未处理异常，现有App/插件/网关/正常官方Host复用，未构建任何产品。此节补齐前节的两个具体在途场景；撤权、进程结束、其他记录类型和超大窗口仍未被替代。

[透明传输验证器](../../../backend/tests/support/official-history-transport.ts)把本机16956转给生产网关16957，正常生产鉴权与设备票据保持；只扣住两条beforeSeq=315的真实session/page回执，各含225条官方事件。请求已由原Host执行，其他报文照常转发；不生成分页、错误或成功响应。释放时仍发送同一原始报文。

| 实际用户入口与时点 | 核对结果 |
| --- | --- |
| 历史加载中返回列表，打开另一聊天，然后送达旧回执 | 原手机发出真实cancel，旧回执仍实际送达。另一聊天的选中身份和完整原事件未变，草稿保留，无源聊天消息或迟到错误提示污染。 |
| 再回原长聊天，加载中关闭远程连接，再送达旧回执 | 正常离线/重连入口恢复同一聊天和原草稿；没有自动重发更早分页。 |
| 用户显式加载重试 | 原历史按钮补齐完整三页561条事件，逐条匹配独立官方基线；52轮原用户消息/真实回复各显示一次，阅读锚点保持。 |
| 返回另一个聊天及核心回归 | 另一聊天原事件/草稿保持；本轮实际模型切换、手机真实回复、write允许/拒绝、已有工作区新建及撤销拒绝通过，零页面/Slots渲染错误。 |

[手机驱动与具体原回执](../../../dsh-mobile/tests/support/official-history-inflight.mjs)、[在途结果](../../../dsh-mobile/artifacts/official-plugin-only/a663b3c6-7d7c-4965-a564-eae6cc12eabd/history-inflight.json)及[重试截图](../../../dsh-mobile/artifacts/official-plugin-only/a663b3c6-7d7c-4965-a564-eae6cc12eabd/history-inflight-restored.png)可核对，截图已实际查看。源聊天来自前节已通过的本项目专用会话，本轮以开始时的完整561条原事件为只读基线，结束逐条相同、标题/停止状态保持，没有在源聊天启动模型任务；[电脑核对器](../../../backend/tests/support/official-history-inflight.ts)检查实际官方投影与历史。

两次验证器错误保留、不计通过：[b3d68eae](../../../backend/artifacts/official-plugin-only/official-android-b3d68eae-e47f-4fb6-9bf1-864e3501919c.outcome.json)误要求官方session/list提供手机派生的displayTitle，改为读取公开title投影；[e49cc445](../../../backend/artifacts/official-plugin-only/official-android-e49cc445-e12e-4cbb-8199-386276f26c3d.outcome.json)误把草稿中的测试前缀计作历史泄漏，改为只核对消息区中的真实轮次前缀，完整原事件断言保留。没有改产品以迎合验证器。首轮类型检查另补充可空记录的显式断言，最终后端类型通过。

两个本轮审批文件已登记、核对恢复字节并删除，测试授权、独立UID、透明代理/网关和ADB映射收尾。10:34的[78轮/1090阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn67-restoration-audit.json)核对原App PID4249/安装身份/正常前台、Key公开状态/绑定/历史保持，官方39256/16958正常运行且远程关闭；两版官方原文件及只读源码保持，全部旧失败不计作当前兼容通过。

## 插件作者自适应声明与用户选择（2026-10-10）

- 状态：固定官方alpha.2、插件0.1.80-latest.0和当前c5da7627 APK的实际入口通过；维护角色：DSHM协作Agent。
- 来源：[真实运行](../../../backend/artifacts/official-plugin-only/official-android-4ef746ce-cab4-4fe2-be74-3dbbd9a54784.json)、[独立退出](../../../backend/artifacts/official-plugin-only/official-android-4ef746ce-cab4-4fe2-be74-3dbbd9a54784.outcome.json)、[手机阶段证据](../../../dsh-mobile/artifacts/official-plugin-only/4ef746ce-cab4-4fe2-be74-3dbbd9a54784/plugin-layout.json)、[正常五文件测试包生成器](../../../backend/tests/support/official-plugin-layout.ts)、[真实手机操作](../../../dsh-mobile/tests/support/official-plugin-layout.mjs)。

手机通过正常官方安装器安装自有无脚本插件0.0.12，作者调用手机服务`ctx.dshmLayout.configure({autoFit:false})`。电脑没有该手机服务时，插件仍正常加载。插件原始720px宽度及内部style保持；关闭自适应时实测宽720px，外层允许横向滚动，开启后显示宽388px、手机视口420px，仅外层等比例缩放，零iframe。

| 实际入口 | 结果 |
| --- | --- |
| 作者默认关闭 | 初次加载开关关闭，未写入用户覆盖；原始尺寸保留 |
| 用户开启/关闭 | “Remote选项→电脑插件”内真实开关覆盖作者声明，插件计数在开关中保持 |
| 恢复插件默认 | 删除用户覆盖，重新使用作者的关闭声明，恢复默认按钮退出 |
| 正常断线重连 | 用户开启值及实际缩放保持，无需再次选择 |
| 重载手机页面 | 新布局服务读取本地偏好，重新从“打开面板”进入仍开启；恢复默认后正确关闭，原聊天草稿保持 |
| 原插件交互 | 按钮、原弹窗与菜单、关闭重开后的状态保持，内部style未改 |
| 卸载与权限收回 | 用户偏好恢复测试前值，作者声明随插件释放，缺省回到开启；官方目录确认删除，临时管理权限收回后聊天保留 |

整轮81.875秒、14个实际Android阶段、实际退出0、零页面/Slots错误。正常profile、其他插件和原会话事件前缀均保持。只有自有验收代码和五文件测试包变化，没有产品构建/安装、DSH/SDK修改或构建。[首轮失败](../../../backend/artifacts/official-plugin-only/official-android-0bf94852-8ec8-4777-ba7d-e2573f33b525.json)保留：页面重载后测试错误寻找旧内存标签，改为真实指南入口后通过，不计入成功。

10:47的[79轮/1104阶段恢复核对](../../../dsh-mobile/artifacts/official-plugin-only/turn68-restoration-audit.json)通过：原App PID4249/安装身份/正常前台、Key公开状态/绑定/历史保持；临时插件、设备授权、独立UID、网关和映射清理；官方39256/16958保持正常运行且远程关闭，两版官方原文件及只读源码保持。以上“页面重载”不冒充App进程结束，任意插件、自定义弹层和其他生命周期仍按具体范围验收。
