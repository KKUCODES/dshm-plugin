# 插件知识总目录

Remote 缓存：[原模块资源指纹、只读基线差量及手机配套范围](../../compatibility/latest-upstream/remote-cache.md)。`0.1.85` 已公开预发布，配套 DSHM preview.4；原中转无需部署升级。

[市场基线双版本验证](../../compatibility/latest-upstream/market-baseline.md)：官方 rc.2 与 alpha.2 共用 `0.1.84` Git 包，三版独立归档，真实协议/模型/审批与配套手机版本边界。只修改插件和 DSHM，不修改 DSH。

GitHub 安装与投稿：[官方一条命令、默认分支预编译产物与固定提交](../github-install.md)；[独立 Git 与官方 alpha.2 安装记录](../../compatibility/latest-upstream/github-install.md)。安装专项不代替完整 Remote 兼容验收。

开源许可：[MIT LICENSE](../../LICENSE)，版权署名 `2026 KKUCODES`；项目原创代码使用 MIT，第三方内容保留原许可。包声明及后续归档的许可证纳入[安装与投稿规则](../github-install.md#投稿)。

自动构建与下载：[三个 DSH 版本的公开发行包、固定 SDK 和草稿发布流程](../releases.md)。`0.1.85` 已公开发布并完成九个附件的匿名下载校验；原本地与历史候选入口保持，CI 归档不代替真实 DSH 与 Android 兼容验收。

公开阅读入口：[项目首页](../../README.md)、[English](../../README.en.md)、[安装与使用](../usage.md)、[开发指南](../development.md)、[README 图片来源](../images/README.md)。首页只介绍产品和使用入口，构建与版本细节从独立指南进入；下方保留各阶段的技术依据。

公开仓库：[手机端](https://github.com/KKUCODES/deepseek-harness-mobile) · [电脑插件](https://github.com/KKUCODES/dshm-plugin) · [中转服务](https://github.com/KKUCODES/dshm-relay)。首页和公开使用、开发指南按独立仓库链接；本总目录的历史资料仍按本地项目集合组织。

中转服务选择：[自建推荐与公共服务地址](../usage.md#选择中转服务)。公共服务为可选入口，开放注册仍需手机配对与电脑批准；当前为 HTTP，不替代完整公网使用链路验收。

中转地址修改：[同后端保留身份、新后端重新注册与失败保持](../../compatibility/latest-upstream/gateway-settings.md)，插件 `0.1.81-latest.0`。电脑设置页新增编辑、取消与两类确认；手机仍需使用新链接重新配对。独立专项不扩大此前完整手机能力的版本结论。

当前交付入口与源码审查：[19项历史依赖、69个公开接口及源码/安装包对应关系](../../compatibility/latest-upstream/official-interface-audit.md)。两条已移除的预设管理协议声明已清理；默认构建仍为旧版基线，不能作为alpha.2交付。 交付卡片缺失已修复，计划/实际差异及电脑原生打开与定位已验。

版本边界：独立插件候选 `0.1.80-latest.0` 已在未修改的官方预发布 `0.2.1-alpha.2`、正常 `pnpm dsh web` 和真实 Android 下通过核心聊天、模型同步、审批、新建及重连；完整文件分享接收、原生文件动作、历史分页与插件自适应设置也已验。已清理新版预设复制/删除的协议入口；其他专项按各自版本记录，86轮恢复核对的具体范围见[新版复验入口](../../compatibility/latest-upstream/official-alpha2.md)；版本、安装包、已取消能力及未验边界见[当前交付审查](../../compatibility/latest-upstream/official-delivery-audit.md)。不交付修改版DSH，历史补丁结果不作为当前兼容证据，当前固定组合的本地兼容验收结论见[当前支持清单](../../compatibility/latest-upstream/official-support.md)。 PTC程序及内层命令结果和手机停止已按专用范围验证。 手机技能搜索、说明预览和官方正文实际加载/真实回复已验。 一层可继续子会话的手机停止、单次中断结算及停止后续聊已验。 外部任务最终正文查看、无效子会话入口拒绝及当前APK真实核心整轮已验。 文件与聊天的双引用入口、实际读取和结构化草稿重连已验。

[默认提问](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问等待时app结束与恢复)与[计划审批](../../../dsh-mobile/docs/integration/official-plugin-only.md#计划审批等待时app结束与恢复)的App结束恢复已通过：重新打开可继续决定；另一连接已处理时撤下旧卡片。草稿和完整历史保持，答复只结算一次。[带超时提问](../../../dsh-mobile/docs/integration/official-plugin-only.md#带超时提问的app恢复与补答)的等待恢复和超时后补答也已通过；[带超时提问中的电脑退出与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#带超时提问中的电脑退出与恢复)已通过，手机可补答原问题，结算后重启不重放；[默认提问与计划的电脑退出恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问与计划中的电脑退出与恢复)也已通过：旧卡片失效，显式新请求单次回答/批准/要求修改，结算后重启不重放；[默认提问、计划与超时补答的同时竞争](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问计划与超时补答的同时竞争)也已通过：两条真实连接相反答复只结算一次，手机撤下旧卡片；[默认提问与计划答复发送断线](../../../dsh-mobile/docs/integration/official-plugin-only.md#默认提问与计划答复发送断线及确认丢失)也已通过：未送达保持等待，确认丢失恢复单次结果，无旧答案重放；continued/其他类型答复在途及其他计时策略另验。

纯官方电脑退出：[普通write等待/结算后Host重启、手机恢复与旧审批失效](../../../dsh-mobile/docs/integration/official-plugin-only.md#普通write审批中的电脑端结束与恢复)通过；同一安装/profile与原记录保持，不修改或构建DSH，普通write[答复发送断线与确认丢失](../../../dsh-mobile/docs/integration/official-plugin-only.md#普通write审批答复断线与确认丢失)也已通过：未送达不自动重发，确认丢失后恢复单次结果；手机已修复能力确认前的重连时序。其他工具的Host结束和其他审批类型的答复在途异常仍待验。

纯官方文件与附件：[下载中断/最新原件重试](../../../dsh-mobile/docs/integration/official-plugin-only.md#文件下载中断与最新完整原件重试)、[系统保存窗口取消/断线清理](../../../dsh-mobile/docs/integration/official-plugin-only.md#系统保存窗口取消断线与显式重试)、[手机上传、历史附件与原件保存](../../../dsh-mobile/docs/integration/official-plugin-only.md#手机上传与历史附件预览下载)、[系统目标写入时App结束与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#系统目标写入时app结束与恢复)通过；跨会话拒绝、未确认提示/确认语义、外部半成品保留与完整原件显式重试有证据。其他附件、其他保存提供方/失败清理/成功回执竞争仍待验；alpha.2完整TXT的实际分享接收、只读授权及清理已验；模拟器重启与原App正常恢复分别记录。 [目标写入中取消/断线/撤权](../../../dsh-mobile/docs/integration/official-plugin-only.md#系统目标写入时取消断线与撤权)实际三类文件清理、断线无自动重存和完整原件手动重试已验。

纯插件实际审查：[官方接口、19项历史依赖与核心真实验收](../../compatibility/latest-upstream/official-plugin-only.md)。正常官方 Web 安装/加载/重启＋真实 Android 的会话/选模/真实回复/允许拒绝审批/重连通过，新手机菜单清理复验通过；其他扩展继续逐项检查。

纯插件功能清单：[R01–R16及协商字段、取消项与上游接口需求](../../compatibility/latest-upstream/official-feature-matrix.md)；审批/提问/计划及write等待时断线/相反答复竞争、[普通write审批等待时App结束与恢复](../../../dsh-mobile/docs/integration/official-plugin-only.md#审批等待时app结束与原会话恢复)、完成通知与App进程恢复、输出、文件/Office、局部插件与部分管理、队列/停止/重连、普通会话导航有实际证据；内容搜索需电脑开启，其他待验不由协商true推导通过。

当前范围：[官方 DSH 与纯插件交付边界](../../../docs/project-knowledge/knowledge/decisions/2026-10-09-official-dsh-plugin-only.md)。只维护 DSHM 插件；本体补丁/SDK重打包验收已取消。初始化中的预设归档硬依赖已移除，真实官方核心链路通过；下方旧补丁验证不代表其他扩展的纯插件通过。

新版文件监听：[同大小/mtime内容变化](../../compatibility/latest-upstream/file-version-watch.md)已在原FsLocal回归中复现漏通知并验证窄范围Windows修正，修正后的发布/实际源码/网关/Android专项均完整通过。原源码失败保留；新14组38文件及355资源精确恢复，新38文件独立ZIP已通过实际运行与解包核对，SDK/Electron待复验，完整新版支持未发布。

Electron管理组合：[官方桌面与独立Android完整组合](../../compatibility/latest-upstream/electron-runtime.md#完整-Android-管理组合2026-10-09)193.477秒通过实际管理、撤销和原profile重启恢复，首轮测试`!!js`解析失败保留。37原源码/启动、322.633秒完整恢复构建及355资源精确恢复；原App16722/Host29132、绑定及全部26会话3799事件保持，四个拥有进程退出。锁屏只影响Windows可见窗口，完整新版七条总标准继续。

转换生命周期：[原服务停用和设备撤销](../../compatibility/latest-upstream/office-engine.md#转换中停用服务与撤销设备)npm与实际源码Android整轮通过；旧进程/队列释放、服务重启显式重试与撤销拒绝重连核验。两轮测试驱动失败保留，原App/Key/绑定及26会话3799事件保持；37原源码/启动、完整恢复构建和355资源精确核验，完整新版支持继续。

转换中断线：[实际socket中断、原生自动重连与原预览重试](../../compatibility/latest-upstream/office-engine.md#转换进程运行中断线与原预览重试)发布与实际源码入口通过。原helper退出、队列/临时目录清理且旧请求不重发，新转换显示真实PDF正文；37原源码/启动、334.635秒恢复构建及355资源精确保持。原App/Key/配对与26会话3799事件逐项相同，Windows前台仍待核对；其他并发/撤权/服务卸载及完整新版继续。

Android 组合：[完整62文件插件、独立UID管理入口及原环境保持](../../compatibility/latest-upstream/final-android-management.md)。npm发布与实际源码启动均通过配对/选模、动态局部界面、预设/提供方/目录、文件刷新/撤销及重启；原源码/355资源与原App/26会话历史精确保持，七条总标准继续。

源码交付：[独立候选 ZIP、安装边界与完整运行／恢复](../../compatibility/latest-upstream/source-delivery.md)。搬移后的 9 项安装边界、37 文件实际源码／完整构建／62 文件插件／网关及 355 原资源恢复通过；82 文件 ZIP 解包预检通过。原 App 与绑定保持；临时夹具清理被自动审批拒绝，目录保留。该专项没有 Android／真实模型，完整新版支持仍未发布。

Electron：[完整桌面、原 Android 消息与命令编码修正](../../compatibility/latest-upstream/electron-runtime.md)。独立候选已通过原执行器三环境 12 组合、实际桌面与手机同一回复、原只读命令实时双流及历史重入。原发布/App/配对/26 会话及 37 原源码/366.888 秒完整恢复构建/355 资源精确恢复归档；74 份载荷和清单独立封存，旧失败及 SDK9 保留。七条总标准和完整交付仍未完成。

Windows SDK：[配置重载失败与模块身份修正](../../compatibility/latest-upstream/sdk-native.md#配置重载失败与模块身份修正2026-10-08)。第十轮完整官方打包435.436秒、原Python资源检查和实际SDK/Android管理组合164.802秒通过；原SDK9配置重载失败已在完整新载体复验解除，旧失败保持。62文件插件/55源码及165手机资源核对，模型/预设/局部插件/提供方/文件刷新/撤权/Host重启通过；本轮不进行真实模型推理。原App3722/Key/绑定及26会话3799事件保持。37原源码/启动字节、333.909秒原完整恢复构建及355资源精确恢复归档；Windows处于锁屏画面，电脑前台仍待用户解锁后核对。七条总标准及完整新版支持未全部完成。

产物维护：[废弃构建清理与历史记录](./validation/storage-maintenance.md)。2026-10-12 用户授权清理 SDK7–11 的重复生成物、旧隔离检出依赖及 68 份安装器夹具 Git 元数据，实际释放约 7.85 GiB，Q 盘余量约 9.32 GiB。源码、恢复备份、日志、当前包与用户数据保留，29,807 个保留文件摘要及两个正式仓库状态保持；不再重建 DSH/SDK/Electron，旧二进制复验入口不再可用。此前失败与压缩结果仅保留历史范围。

共享转换反向取消：[第二读取者取消、手机继续预览](../../compatibility/latest-upstream/office-engine.md#后加入的读取者取消手机继续预览)空间解除后发布144.70秒、实际源码173.36秒完整通过。同一原引擎双读者变单读者，手机收到完整PDF/实际正文，重开复用完成缓存；原件及全部拥有进程退出独立核对。37原源码/启动字节、378.75秒原完整恢复构建和355资源精确恢复，18目标/13组审计通过；原App/Key/绑定及MuMu前台同一聊天保持。三个失败、ENOSPC和715重复诊断记录保留，临时钩子已移除；原七项标准及SDK/Electron仍未全部完成。

六格式原件：[实际系统保存与跨UID只读分享补验](../../compatibility/latest-upstream/file-transfers.md#六格式原件保存与分享补验2026-10-07)发布与实际源码两组均完整通过。当前62文件归档/55源码核对，24份实际原件保存/只读分享与最终原件大小/摘要一致；八个Host退出、接收器卸载、原App前台聊天/PID/Key/绑定保持。源码37原文件/启动字节、381.66秒原完整恢复构建及355资源精确恢复；18目标/13组只读审计通过。两次旧candidate失败及原8份分享快照/一小时规则保留，其他保存提供方、其余总标准和完整新版仍待验。

共享 Office 转换：[手机关闭一个读者后，另一批准连接完成同一原引擎，手机重开显示正文](../../compatibility/latest-upstream/office-engine.md#共享转换时关闭一个读取者)在发布140.37秒和实际源码167.71秒通过；单helper/双读者→单读者、完整PDF、缓存与队列释放核验。37原源码/独立启动/根脚本、355资源及完整恢复构建精确核对，原App/Key/绑定保持，其他总标准不缩减。

新版 Office 引擎：[手机关闭预览后的原生转换进程取消、队列/临时目录释放与重新打开](../../compatibility/latest-upstream/office-engine.md)在发布 CLI 和实际源码pnpm入口的真实 Android 专项通过。当前62文件候选、55源码摘要、六格式/缓存/服务重建/撤销/Host重启同时核验；源码原37文件/独立启动/根脚本及355资源精确恢复，原App/会话保持并实际置前。此前观察器依赖和Windows快照覆盖失败保留，共享读者及其他总标准不缩减。

新版第二层续聊：[显式恢复父任务、手机唯一提交/真实回复、停止保留待办及收尾释放](../../../dsh-mobile/docs/integration/latest-child-model.md#恢复父任务后的第二层手机续聊2026-10-07)在发布/实际源码入口通过。26会话全部原历史、身份与原App保持；此前父已释放时的拒绝及验证器失败另存，原37文件/完整构建/355资源已精确恢复归档，完整新版兼容继续。

新版父模型控制：[原send_message/interrupt_agent、实际回复/进程退出和再续聊](../../../dsh-mobile/docs/integration/latest-child-model.md#父模型发送消息与停止子任务2026-10-07)在发布及实际源码入口通过。原24会话完整前缀/投影/身份、两子各82事件及原APK保持；原37文件/完整构建/355资源恢复归档，本轮无生产插件修改，其他控制边界继续。

新版一次性子任务：[原前台委派、主页面/旁栏只读与原list_agents两种返回](../../../dsh-mobile/docs/integration/latest-child-model.md#一次性子任务与原列表工具2026-10-07)。发布/实际源码入口通过，原37文件/完整构建/355资源精确归档、24会话原历史/身份与原APK保持；多层发现及其他控制工具继续验收。

新版子任务通知：[手机原生修复与发布/实际源码链路复验](../../../dsh-mobile/docs/integration/latest-child-model.md#后台子任务通知与点击隔离2026-10-07)通过；源码37文件/完整构建/355资源及原APK精确恢复归档，原失败保留，本轮无生产插件改动。完整新版兼容继续。

新版子任务输出：[原持久身份核验、有界保留与两种入口实际手机复验](../../../dsh-mobile/docs/integration/latest-child-model.md#停止后输出保留修复与发布入口复验2026-10-07)。13新版原工具/冷历史、旧版完整218项和类型检查通过；独立62文件候选在发布/实际源码pnpm均通过手机停止/输出重读/重入/续聊。原运行包/App、17父子历史及37文件/完整原构建/355资源恢复核验；完整范围继续。

新版子会话服务：[实际Host生命周期流与两种入口MuMu在途卸载/恢复](../../compatibility/latest-upstream/subagent-catalog.md#服务卸载在途与重新读取2026-10-07)通过；不再用Client namespace判断Host服务存活。独立62文件候选归档通过类型/原版本检查及四分支，主运行包保持；37原文件/启动值及原完整构建/355资源已精确恢复归档，完整范围继续。

新版子会话故障：[固定发布及实际源码入口的身份资料缺失、损坏和不支持版本](../../compatibility/latest-upstream/subagent-catalog.md#身份资料故障与持续未知模式2026-10-07)通过实际 Android 主聊天/旁栏六分支和原 Host 拒绝，全部原历史保持；插件生产逻辑未改，37原文件/启动值及原完整构建/355资源已精确恢复归档，其他完整标准继续。

新版编辑器：[两种入口的手机实际确认、Cursor/VS Code工作区窗口及正常关闭](../../compatibility/latest-upstream/desktop-apps.md#手机实际启动电脑编辑器2026-10-07)通过；原生撤销拒绝、独立测试清理及原载荷核验保持。IntelliJ停在原信任提示、工作区未打开；失败记录和两项子范围明确保留，完整新版兼容继续。

新版应用手机在途：[发布及实际源码pnpm的原服务停用、迟到准备/确认失效与重新启用恢复](../../compatibility/latest-upstream/desktop-apps.md#手机确认期间停用服务2026-10-07)通过。原管理器和真实Android桥、零次启动、撤销拒绝/测试清理核验；验证器失败报告保留，不修改生产组件或APK，完整新版兼容继续。

新版动态插件：[发布与实际源码Host/中转的双浏览器、Android＋浏览器及同一MuMu的两个独立Android客户端](../../compatibility/latest-upstream/cordis-two-clients.md)通过。独立UID/凭据、并发审批、版本保留、各自原生重连、913字节旧代码迟到、三种加载/运行异常及局部Slot/Factory渲染异常的跨端显示/显式恢复、Factory兄弟实例保持、停止/重跑/移除与撤销核验。旧版本错误遮挡和渲染失败缺少跨端通知已修正；主App/安装文件保持，当前37原文件/启动值、原完整构建及355资源已精确恢复归档。延迟原响应并保留原帧类型，不替代结果；原双客户端标准的逐项证据已核对，其余七条总标准仍未完成。

候选交付：[当前62文件归档、全部55源码/安装字节、官方版本检查及原安装/正常启动/中转](../../compatibility/latest-upstream/candidate-package.md#当前完整插件源码对应的安装包2026-10-07)通过；首轮报告字段断言失败与受限只读复核分别保留。18 项旧目标逐项去留和当前13组/37文件载荷见[补丁矩阵](../../compatibility/latest-upstream/patch-matrix.md#当前载荷核对2026-10-06)；只读核对不等于完整功能验收，SDK/Electron与当前七条总标准仍未完成。

原CLI终端：[发布与实际源码的真实输入、双流输出、退出码、Ctrl+C及原命令接管](../../compatibility/latest-upstream/package-repair.md#真实终端与原命令接管2026-10-06)通过；第一轮夹具、第三轮输入超时及原立即清记录断言失败保留。36文件完整候选/原恢复构建均通过，原文件/启动字节、Git干净及355资源精确恢复归档。SDK/Electron和完整新版标准仍待验。

应用阶段冷恢复：[两种入口原管理页、实际手机/核心退出与全历史审计](../../../dsh-mobile/docs/integration/latest-install-recovery.md#发布入口-applying-阶段的手机冷恢复)。发布第二轮、SOURCE第三轮完整通过；本轮36原源码/启动字节、原完整构建与355资源恢复归档，三个目录原属性恢复。SDK第四/第六轮明确磁盘不足、第五轮依赖状态失败保留，需增加Q盘空间；实际载体及完整新版仍待验。归档逐文件校验与失败分别保留，见[SDK打包与源码恢复](../../compatibility/latest-upstream/source-runner-profile-resolution.md#sdk-打包与源码恢复)。

源码安装路径：[真实失败、正式显式tsconfig、新独立载荷及两种实际MuMu修复冷恢复](../../compatibility/latest-upstream/source-runner-profile-resolution.md)。341.758秒完整构建、86原回归、源码/发布九场景和退出/取消/超时均通过，12会话/2106事件及权限恢复；旧失败与载荷保留，新36租约原构建364.712秒、原文件/启动配置/Git干净及355资源精确恢复归档。SDK完整打包/运行及完整新版兼容仍未通过。

Windows安装残留：[原保护缺口与原型](../../compatibility/latest-upstream/package-repair.md#原写入前保护的实际缺口及原生进程范围原型)、[正式36文件构建/源码回归](../../compatibility/latest-upstream/package-repair.md#正式源码原生范围候选与构建诊断)、[发布五文件与手机核心Host单独退出](../../compatibility/latest-upstream/package-repair.md#发布运行器与真实手机核心host退出)。发布九场景、五项进程及退出/取消/超时通过；MuMu发布第三轮、源码第二轮含重新安装/卸载和恢复完整通过，12会话/2106原事件保持。发布手机修复取消及[两种入口下载/脚本阶段手机冷恢复](../../../dsh-mobile/docs/integration/latest-install-recovery.md#手机与电脑都结束后的安装摘要)通过，原失败及独立清理保留。本轮36原源码/启动配置及355资源已完整恢复并排他归档；修复/applying阶段冷恢复、实际打包载体及最终交付仍待验。

新版修复安装：[真实超时孤儿进程、整树终止补丁及两种入口的手机修复取消/完整DSH树退出恢复](../../compatibility/latest-upstream/package-repair.md)通过；手机修复超时的原分类、失败详情和进程停止另已通过。原取消等待旧版恢复的语义保留，未知结果不自动重试，配置/历史及测试清理核验；超时后旧版本文件保留不等于完整重装成功。原81项、各五项进程及安装边界通过，旧31文件/355资源完整恢复归档，新31组合完整构建ready、最终恢复待完成。原手机卸载EPERM及测试驱动失败保留，普通安装脚本的手机超时主文案、原分类、失败回执及进程退出在两种入口另已通过。仅Host退出、手机安装摘要冷恢复和完整范围继续。

新版可继续子会话：[两种入口真实父模型创建、子模型回复、手机续聊、Host重启后完整历史/再次续聊及unknown地址经手机原SDK中转读取](../../../dsh-mobile/docs/integration/latest-child-model.md)通过，原Host拒绝错误类型、历史不变；31文件实际源码保持ready，最终原字节/355资源恢复未完成。损坏目录/descriptor与服务卸载在途等其余完整范围继续。

新版自动审核：[明确取消的窄补丁、两种入口Android取消、低风险放行、ask手机拒绝与never最终自动拒绝](../../../dsh-mobile/docs/integration/latest-auto-review.md)通过；原pwsh未执行、文件未变，历史/卡片/权限和正常命令目录恢复。源码Host意外退出原因未知，原审核归档与恢复证据保留。13项/31文件完整构建、33/159项回归和模块身份通过；最终精确恢复与补丁去留继续，不能直接套旧取消信号补丁。

新版待办通知：[发布提问/审批和两种入口受阻通知及手机渲染修复](../../../dsh-mobile/docs/integration/notifications-current.md#新版待办通知与受阻显示2026-10-06)通过实际 MuMu 送达、点击、原结果/历史；固定源码提问/审批证据保持。原权限/测试文件恢复，诊断配置移除；其他失败原因、自动审核及完整范围仍待验。

新版程序写入：[原失败工作区的实际手机修复与精确恢复](../../../dsh-mobile/docs/integration/latest-ptc-files.md#原失败工作区的两个实际手机入口2026-10-06)在SOURCE/RELEASE通过同一旧文件修改/回读、只读拒绝、详情/历史；全部8对象原权限与字节恢复。[原生负例及独立操作入口](../../../dsh-mobile/docs/integration/latest-ptc-files.md#原生拒绝边界与独立操作入口2026-10-06)补齐缺WRITE_DAC、非本人所有和junction拒绝，28操作、越界/重复/明确拒绝回滚保持。[人工工具](../../compatibility/latest-upstream/acl-repair.md)有CLI/备份恢复说明，含新克隆布局的10项入口测试通过；文件符号链接输出1项未实测。完整交付、31源码租约和日常旧版保持原边界。

新版PTC内部取消：[两种入口的真实模型、pwsh进程退出、原父子结果与手机历史](../../compatibility/latest-upstream/tool-cancellation.md)通过；权限恢复、管理false。[后台完成通知/原生点击](../../../dsh-mobile/docs/integration/notifications-current.md#固定新版的后台完成通知2026-10-06)两种入口也通过。固定源码[五会话880原事件的重启保持](../../../dsh-mobile/docs/integration/latest-live-recovery.md#固定源码的完整历史恢复核对2026-10-06)另通过。其他内层工具、自动审核、其他通知类型与程序内文件写入仍待验。

新版后台任务：[原 job/list 只读契约、手机服务迁移及实际输出](../../../dsh-mobile/docs/integration/latest-background-jobs.md)。发布 Host/网关/Android 两类实时输出、模型消费后的历史重读和显式重连通过；手机真实停止、输出保留及另一任务继续完成也已通过。约421KB中文/emoji实时窗口、四段手动历史及真实淘汰提示通过；新版公布/旧版拒绝，原停止/输出身份边界保持。固定源码前后台输出、停止与任务隔离、约421KB窗口/四段历史/结算重入也已通过，首轮额外模型调用失败保留；更多异常/生产者仍待专项。

新版Windows命令编码：[原7/5.1执行与独立中文代码页对照](../../compatibility/latest-upstream/pwsh-encoding.md)确认官方前缀仍有只读初始化错误和乱码。三个固定文件已迁移，发布及实际源码构建四组合、八前台回归与六安装边界通过，原写入/类型限制保持。十二项/30文件完整源码构建、原回归、真实pnpm/网关及原Host重启通过，原源码/启动字节、355资源摘要及Git干净恢复；失败报告保留。发布入口随后通过Android实际模型调用的中文/emoji、实时输出及历史重入，固定源码Android实际前后台命令、审批/提问及只读/可写PTC外层停止亦通过，详细边界见手机兼容文档；完整新版交付、当前源码租约恢复及其余有效范围仍待验。

新版文件保存与分享：[完整原件、跨UID只读分享和下载中断重试](../../compatibility/latest-upstream/file-transfers.md)。发布182.94秒、源码外层208.41秒的独立Android专项通过，十一项/28原文件/355资源精确恢复与清理通过；系统保存窗口断线和下载中进程结束另已在发布180.92秒、源码外层206.20秒通过；受控保存位置实际目标写入中结束另已在发布173.72秒、源码外层195.91秒通过，原绑定/会话与提示跨重启、部分目标保留及完整重试均核验；分享副本准备中结束另在发布149.60秒、源码外层167.72秒通过，原源码/资源恢复通过；六种Office格式的正常原件保存/分享另已在当前归档发布与源码通过，见上方；其他保存提供方、格式及异常范围仍待验。

Windows文件读取权限：[原协议专项](../../compatibility/latest-upstream/office-lifetime.md#实际-windows-文件读取权限在途收回)在发布100.14秒、源码外层117.89秒通过，原构建/字节/355资源精确恢复已核验。另在[实际Android失败页与重试专项](../../compatibility/latest-upstream/office-lifetime.md#实际-android-文件读取权限在途收回与重试)通过发布133.99秒、源码外层159.71秒：完整PDF被原末尾权限检查拒绝、无旧画布，恢复原DACL/字节后点击原重试显示实际PDF正文；Host容量释放与缓存重新授权核验。源码完整恢复288.95秒、原28源码/355资源摘要/Git干净及清理核验通过；附件引用变化、其他ACL/操作系统仍待验，不记为全部权限范围通过；单读者引擎运行中取消另见上方专项。

新版Office：[真实传输、缓存、预览关闭、连接恢复、设备收权及会话归属](../../compatibility/latest-upstream/office-lifetime.md)在发布和实际源码pnpm入口通过。收回管理权限后可只读重连，撤销设备后拒绝重连；旧请求/画布清理与Host名额释放核验，原28源码/355资源精确恢复及测试授权/进程清理。主聊天的真实PDF在途切换另在发布与源码Android通过：原载入取消并释放容量，标签身份保留，返回原标签重新读取并显示实际正文。实际Windows ReadData权限收回后的Android失败/重试、原DACL与字节恢复、实际PDF正文和容量释放已在发布与源码入口通过。普通会话切换的缓存按所属会话重新授权，同名文件实际PDF正文与错误会话附件拒绝通过；模型验收App/绑定保留并恢复同一空聊天。单读者取消及共享转换关闭一个读者另见上方专项；共享转换的其他取消顺序、更多并发、旁栏/并发预览在途切换会话、其他文件权限/操作系统及附件引用在途变化、更多格式原件保存/分享、其他保存提供方及更广网络时序仍待验；受控分享副本准备中进程结束在发布与源码入口通过，范围见文件传输边界。

新版真实模型：[真实回复与文件审批](../../../dsh-mobile/docs/integration/latest-compatibility.md#真实模型回复与文件审批2026-10-06)在独立发布Host/Android自有页面通过。原Key仅核对配置状态；电脑同一会话实际回复、文件读取、只读拒绝后单次批准/真实写入及原权限恢复已核验，设备管理false。发布环境的真实拒绝、提问回答及只读与可写PTC停止/历史重入/继续回复另已通过；测试目录权限前提已定位、验证并恢复；源码实际推理、其他模式及后台通知仍待验；原持久环境继续保留，最终撤销授权并清理服务。

新版应用在途：[取消、断线、撤权及服务/工作区实际故障](../../compatibility/latest-upstream/desktop-apps.md#应用查询在途异常)在发布与源码协议通过；原查询值延迟而非替代响应。发布206.01秒、源码pnpm250.26秒独立Android/原Host重启组合核验实际确认撤权、授权失效页及Windows无测试路径窗口，28源码/355原资源恢复及清理通过；完整支持未发布。

新版子会话：[原Session投影迁移与真实404依据](../../compatibility/latest-upstream/subagent-catalog.md)，两版协商及手机共享导航已适配；发布186.56秒与源码pnpm243.16秒的本轮Remote/独立Android/原Host重启链路、28源码/355原资源精确恢复及清理通过。

新版电脑应用与图标迁移：[固定两文件及五个发布入口](../../compatibility/latest-upstream/desktop-apps.md)的严格类型、八项服务及安装边界通过，已加入十一项/28文件源码候选；发布与源码CLI/网关目录与图标、独立Android主聊天及子会话旁栏选择/取消/实际资源管理器启动及关闭测试窗口通过。十一项源码Android/Office/传输/重启组合和原28文件/355资源恢复通过，两种入口多连接/重连的旧确认拒绝通过；其他应用和在途异常仍待验。

上游升级：[0.2.1-alpha.1 适配与实际验收](../../compatibility/latest-upstream/README.md)。隔离候选通过新版Host、手机自有页面及独立Android基础同步；前台输出、插件增量、动态目录/并发审批/客户端寿命已有专项验证，真实Web/Android另通过目录推送、原动态审批、局部UI与Host调用及清理。真实模型、完整管理与补丁交付继续迁移。普通0.1.75仍限定旧版，日常环境保持原位。

版本管理：[独立仓库边界与相邻构建依赖](../development.md#git-仓库边界)。源码纳入本地 Git；历史兼容脚本仅保留为当时的证据，生成产物、环境配置及联调证据留在本机，远端后续单独关联。

补丁交付：[当前组合及只读安装核对](../../compatibility/README.md)。112个修改文件、源码启动及scope依赖匹配；检查叠加后的最终值，不能用任意历史版本匹配冒充全部已安装。文件核对不替代功能验收。

插件升级提示：[固定基线补丁、安装恢复与真实Host重启验证](../../compatibility/plugin-restart-notice/README.md)。三文件已安装，四项回归与MuMu首次启用/升级/重启后执行新版本通过，测试插件及临时管理已清理。

通知作用域：[0.1.75待办通知修复](../../../dsh-mobile/docs/integration/notifications-current.md#待审批与提问通知标题修复2026-10-03)。真实插件fiber回归及Android标题/取消清理通过；直接读取未注入sessions曾中断通知流，使用公开可选服务读取修复。

草稿模型发现：[独立受限命名空间与HTTP验证](../../compatibility/model-discovery/README.md)，拒绝重定向；补丁及0.1.73已安装，配套手机实际无认证/临时Key/已有认证与取消路径已接入，具体边界见[手机验收](../../../dsh-mobile/docs/integration/model-settings-compatibility.md)。

PTC取消：[结构化分类、固定基线安装与真实手机验证](../../compatibility/ptc-cancel/README.md)。电脑运行时abort保留为ABORTED，部分输出保留；实际安装与专项验证通过。

新版PTC：[原源码复现、两处取消迁移与自动审核保留判断](../../compatibility/latest-upstream/tool-cancellation.md)。159项原套件、真实Node进程和八项源码Android/恢复组合通过，41项函数另验；发布环境真实模型及Android只读/可写停止、ABORTED、输出保留、历史重入和继续回复另通过。测试目录WRITE_OWNER前提已定位、官方修复和原规则恢复；源码实际推理、内部工具取消与自动审核仍待验。

新版插件管理：[查询进程取消与升级重启提示](../../compatibility/latest-upstream/package-management.md)。真实Windows pnpm查询失败已复现，修复进程五项与原客户端188项通过；十项源码构建/Android/精确恢复及发布包Web通过，发布/源码入口手机安装、升级后重启执行新版及卸载另通过，原拒绝后的实际修复安装通过，完整异常继续验收。

自动审核取消：[权威结果、固定基线安装恢复与真实手机验证](../../compatibility/auto-review-cancel/README.md)。实际电脑已安装，停止不再记作模型拒绝，原拒绝规则保留。

模型卡片：[只读目录投影、凭据状态和异步一致性边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#模型卡片只读投影2026-09-27)，0.1.67配套网关/App已安装，官方/内置草稿MuMu通过。

Windows命令编码：[根因、安装恢复与正式入口验收](../../compatibility/pwsh-output-encoding/README.md)。补丁已安装；真实电脑和Android新命令中文输出通过，5.1/7只读沙箱与普通执行器通过，历史乱码不恢复。

服务协议：[原运行时声明、schema选项与原配置校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#自定义服务协议切换2026-09-27)，0.1.66已安装，通过MuMu保存与电脑请求切换；不开放任意设置路径。

动态清单同步：[补丁安装恢复与真实双端验收](../../compatibility/cordis-inventory-sync/README.md)。23文件补丁已安装，双端审批竞争及移除旧行清理通过；重启时连接未就绪的读取报错仍待修复。

动态审批并发：[阶段校验增量补丁](../../compatibility/cordis-approval-race/README.md)。固定inspect基线上四文件预检、三文件改变；原Host/生成RPC回归通过，真实手机两种竞争已保住请求，移除后清单残留仍待修复。

提供方真实写入：[专用自定义路由的MuMu保存与清理](../../../dsh-mobile/docs/integration/remote-current.md#专用提供方的真实手机管理2026-09-27)。新增/移除、部分标量/模型能力/兼容/地址及独立Key引用启用通过；本机原认证管理接口完成临时授权并收回，真实Key填写和其他范围仍待验。

客户端生命周期：[旧目录同步与迟到错误清理](../../compatibility/cordis-client-lifetime/README.md)。16文件补丁已安装；MuMu普通重启及有实际动态包的审批、重启恢复、手动运行/Host调用/移除通过，无控制台或资源错误；双端与实际撤销等专项仍待验。

官方模型：[固定llm-deepseek清单与原字段保留](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#官方deepseek模型清单2026-09-27)，0.1.65已安装；[实际名称保存、目录同步与恢复](../../../dsh-mobile/docs/integration/remote-current.md#官方模型清单的真实手机保存2026-09-27)通过，其他字段继续待验。

既有提供方Key：[仅无引用路由、版本确认与原生衔接](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#既有提供方启用key2026-09-27)，0.1.64已安装，真实授权启用待验。

提供方新增：[原目录/schema、唯一引用及一次性确认](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#新增提供方2026-09-27)，0.1.63已安装，实际手机授权新增待验。

提供方移除：[单路由删除、基础层与凭据保护](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#移除已有提供方2026-09-27)，0.1.62已安装，真实手机授权删除待验。

模型发现：[原服务、固定路由与权限边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方模型发现2026-09-27)，0.1.61已安装，实际手机管理发现待验。

内置模型覆盖：[用户层、scope隔离与目录校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#内置模型逐项覆盖2026-09-27)，配套0.1.60，实际手机保存待验。

提供方默认兼容：[固定字段与原设置继承](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#提供方默认兼容设置2026-09-27)，配套0.1.59，实际手机保存待验。

模型兼容配置：[固定字段与原pi-ai协议校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#模型协议兼容配置2026-09-27)，0.1.58已安装加载，实际手机保存待验。

模型能力：[输入与思考声明的投影和原服务校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#模型输入与思考能力2026-09-27)，0.1.57已安装加载，实际手机保存待验。

模型清单：[行身份保留隐藏字段与原设置校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方模型清单2026-09-27)，0.1.56已安装并加载，真实手机管理保存待验。

提供方Key：[已有显式引用与原生入口边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方key引用2026-09-27)，0.1.55已安装，真实手机保存待验。

其他提供方地址：[固定目标、原继承和版本写入](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方的服务地址2026-09-27)，0.1.54已安装，真实手机保存待验。

其他模型提供方：[固定字段与原设置服务边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有其他模型提供方的标量设置2026-09-27)，0.1.53已安装，手机实际保存待验。

自定义Key：[电脑已有模型/搜索引用的仅写边界与验证](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已配置的自定义key引用2026-09-27)，0.1.52支持已有引用，保留注册名与Remote信任记录隔离。

动态 Cordis 插件：[连接目录、12个原接口、安装与实际验证](../../compatibility/cordis-inspect/README.md)。0.1.51及七文件补丁已安装，MuMu原清单、手动运行/Host调用/停止/移除通过；审批、版本切换及完整异常继续验收。

应用图标：[内部服务扩展与四文件安装包](../../compatibility/desktop-app-icons/README.md)已安装，0.1.49 接入固定图标传输；MuMu 主聊天、旁栏及应用列表的实际 Windows 图标通过。

指定应用打开工作区：[服务兼容补丁与接入证据](../../compatibility/desktop-apps/README.md)，0.1.48 已接固定 Remote 协议和手机确认页；MuMu 读取/取消/资源管理器打开通过，其他应用与在途撤权继续验收。

文件元数据：[刷新兼容补丁](../../compatibility/file-metadata/README.md)，原文件变更后刷新完整 stat，含固定基线安装恢复与 MuMu 证据。

长安装结果：[回执边界与手机验收](../../../dsh-mobile/docs/integration/plugin-management-current.md)，含0.1.40的内存记录、去重、换代和权限规则。

插件安装取消：[进程树兼容补丁](../../compatibility/plugin-install-cancel/README.md)，含固定基线安装恢复、进程检查和MuMu原路径验证。

手机模块增量更新：[兼容补丁与安装恢复](../../compatibility/client-entries/README.md)，保留未变化插件页面实例及手机apply名单。

开发中：[待审批/提问的只读通知补丁](../../compatibility/pending-notifications/README.md)，含原Gateway运行验证；已在本机安装，并与插件0.1.35通过主要MuMu通知链路验证。

| 分类 | 入口 |
| --- | --- |
| 系统蓝图 | [整体模块地图](../../../docs/project-knowledge/blueprint/module-map.md)，插件包含 Host 和电脑配置页 |
| 业务域 | [远程访问](../../../docs/project-knowledge/knowledge/domains/remote-access/INDEX.md) |
| 开发规则 | [集合中的插件规则](../../../AGENTS.md#桌面插件) |
| 内部迭代 | [插件变化记录](../../../docs/iteration-history/plugin.md)，由项目集合保存，不纳入本仓库 |
| 共享知识 | [跨端协议](../../../docs/protocol.md) |
| 长期决策 | [插件与配对接入](../../../docs/project-knowledge/knowledge/decisions/2026-09-22-pairing-and-plugin.md)、[电脑端兼容补丁](../../../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md) |
| 候选知识 | [上游源码核验与待实测项](../../../docs/project-knowledge/knowledge/candidate/desktop-plugin-review.md) |
| 校验方式 | [验证矩阵](../../../docs/project-knowledge/validation/README.md)、[插件使用说明](../../README.md)、[后台输出补丁构建与隔离验证](../../compatibility/background-output/README.md)、[源码启动安装与真实验证](../../compatibility/source-start/README.md)、[前台命令输出接入与补丁安装（待实测）](../../compatibility/foreground-output/README.md) |
