# 官方接口与交付入口审查

- 状态：两条过期管理声明及目标Host放行路径已清理，当前源码/归档/实际安装和真实Android核心复验通过；不发布完整扩展兼容声明。
- 维护角色：DSHM 项目协作 Agent。
- 最近核验：2026-10-10；官方 `0.2.1-alpha.2` / `d743267388641bc76f17c45ce8b4c231aed1d32c`，独立插件 `0.1.80-latest.0`。
- 依据：[功能矩阵](./official-feature-matrix.md)、[19项历史依赖审查](./official-plugin-only.md)、[接口审查脚本](../../scripts/audit-official-interfaces.mjs)、[交付审查脚本](../../scripts/audit-official-plugin-only-delivery.mjs)、[真实 Android 分项记录](./official-alpha2.md)。本页不以静态声明代替真实手机验证。

## 接口清单与发现

[当前接口清单](../../artifacts/official-plugin-only/interface-audit-87135ad8-8455-4f76-b97b-a6a66bfcac9d.json)检查288个固定官方包，当前管理目录为62个调用、7个流入口；66个对应生成声明、2个属于公开Gateway协议、1个是DSHM公开profile适配，过期声明为零。共享协议对alpha.1/alpha.2排除复制/删除，Host请求策略也明确拒绝；中转保留旧版兼容，由实际Host决定版本契约。

初轮0.1.79的[历史接口清单](../../artifacts/official-plugin-only/interface-audit-86b8c2bb-00cf-42ac-a3e3-935f93e19dd0.json)曾列出64个调用、7个流入口，发现其中两条不属于新版官方；该报告原样保留，不能当作当前目录。

普通聊天授权仍为45个调用、7个流入口，与[旧候选真实协商报告](../../../backend/artifacts/official-plugin-only/official-android-54489ba0-4cb6-4b9f-9483-1da9be208f77.json)一致。本轮临时管理授权验证两条拒绝并收回，管理目录仍来自协议枚举；不把全部枚举接口记为实际调用通过。

| 分类 | 对应来源 | 判断 |
| --- | --- | --- |
| 普通与管理 RPC/流 | 各官方包的 `lib/typert.remote-client.d.ts`；每个具体路径记在接口清单的 `rows[].paths` | 公开契约存在，实际使用范围仍按功能矩阵和 Android 报告判断。 |
| `$events`、`$events/result` | [官方 Gateway 协议](../../../dsh-mobile/artifacts/official-alpha2-source/packages/api/gateway/src/stream-protocol.ts) | 不在生成 RPC 声明中，但属于公开事件协议；插件仍检查设备和连接归属。 |
| `settings/openAgentPresetDirectory` | [插件转接入口](../../src/remote-adapter.ts)、[公开 profile 适配](../../src/profile-preset-directory.ts) | DSHM 自己的接口名；新版返回已登记配置的目录和文件位置，不声称电脑已打开窗口。 |
| `agentPresets/copy`、`agentPresets/deletePreset` | [共享协议](../../../backend/packages/protocol/src/remote-policy.ts)按目标版本排除声明及拒绝请求 | 官方alpha.1/alpha.2不提供这两条接口。页面保持隐藏，真实管理连接收到`remote_operation_denied`；旧0.1.6契约保留。这个缺口不属于核心聊天目标，不通过补丁恢复。 |

`remote.upload`、`remote.attachment`、`remote.office`、`remote.jobOutput` 等是 DSHM 有界传输适配，不是声称官方存在同名 HTTP 路由。它们使用插件注入的公开附件、Office、JobRegistry 等服务；具体权限、资源身份、窗口和代次校验由现有实现及专项测试分别证明。

## 19项历史补丁依赖的当前去向

下表对应[历史依赖清单](./patch-matrix.md)，不执行任何旧安装器，也不沿用修改版 DSH 的通过结果。

| 历史依赖 | 纯官方接入方式或当前处理 | 现行依据 |
| --- | --- | --- |
| 后台输出 | 使用官方 `JobRegistry.readAt/get/kill`；电脑退出后旧任务/内存缓存失效，不承诺续跑 | [JobControl](../../src/job-control.ts)、[后台专项](./official-alpha2.md#后台任务停止大输出与断线读取2026-10-10) |
| 文件元数据监听 | 使用官方文件 provider 与 changes 流；不修正同大小/mtime 的本体监听缺陷 | [文件契约适配](../../src/workspace-file-contract.ts)、[文件范围](./official-feature-matrix.md) |
| 前台实时输出 | 精确实时字节旁路取消；保留官方完成结果及后台输出 | [启动入口](../../src/index.ts)、[普通输出专项](./official-alpha2.md#提问与命令详情复验) |
| 汇总待办通知 | 补丁专属观察器不启动；聊天内审批与公开结算通知保留 | [TaskNotifications](../../src/task-notifications.ts)、[通知专项](./official-alpha2.md#通知与app进程恢复) |
| 客户端增量加载 | 手机使用自己的模块/entries 加载，不为电脑添加 `syncSelected` | [自有运行页](../../../dsh-mobile/src/remote-runtime.jsx)、[局部插件专项](./official-alpha2.md#普通插件与局部界面) |
| 插件安装取消/进程修正 | 使用官方 pluginManager 原始结果；断线/退出时允许显示未知，不伪造成功 | [操作回执](../../src/plugin-operations.ts)、[安装专项](./official-alpha2.md#插件下载取消与电脑退出2026-10-10) |
| 电脑应用目录 | 旧 `dshmDesktopApps` 注入取消，应用选择入口隐藏 | [启动入口](../../src/index.ts)、[取消清单](./official-feature-matrix.md#当前取消的扩展) |
| 电脑应用图标 | 随应用目录一起取消；不调用补丁内部缓存 | 同上 |
| 动态运行器连接目录 | 旧作用域目录能力不发布；普通官方插件图/资源加载保留 | [旧适配器](../../src/cordis-connections.ts)、[协商入口](../../src/remote-adapter.ts) |
| 动态运行器审批竞争 | 不向 DSH 运行器追加保护；聊天工具审批继续走公开事件协议 | [审批专项](./official-alpha2.md#审批答复在途断线) |
| 客户端组件生命周期 | 只管理 DSHM 自己的组件与连接；不替换电脑 CordisPanel | [手机运行页](../../../dsh-mobile/src/remote-runtime.jsx) |
| 动态目录同步事件 | 不补写电脑清单事件；只消费公开图/事件，普通插件已有实测 | [局部插件专项](./official-alpha2.md#普通插件与局部界面)；更广增量和异常仍待验 |
| PowerShell编码 | 展示官方原结果；不改 Shell/runner，不保证修复中文/emoji缺陷 | [输出边界](./official-feature-matrix.md) |
| PTC取消分类 | 使用原 `session/cancel`，不替换内部异常分类 | [PTC专项](./official-alpha2.md#ptc程序结果与手机停止2026-10-10)已验证单层run_code→pwsh真实运行中的手机停止、aborted/user和根/内层唯一结算；其他工具/嵌套层级及生命周期仍待验 |
| 自动审核取消 | 沿用官方审核/权限原结果，不为失败或拒绝制造成功 | [当前功能边界](./official-feature-matrix.md)；其他审核策略仍待验 |
| 模型发现旁路 | 公开 LLM目录/Settings适配保留，强制查询草稿地址的补丁探测取消 | [公开提供方适配](../../src/profile-providers.ts)、[提供方专项](./official-alpha2.md#自定义提供方已有地址目录与协议设置) |
| 插件升级重启提示 | DSHM显示官方返回的 restart-required 等结果，不改电脑管理页 | [升级专项](./official-alpha2.md#普通插件升级与正常重启2026-10-10) |
| 源码启动注入 | 不交付 preload、源路径重定向或根命令替换，正常官方 `pnpm dsh web` | [正常 CLI 外部验收启动](../../scripts/run-official-dsh-web.mjs) |
| 新增预设归档依赖 | 不实例化旧归档管理服务，复制/删除页面隐藏；目标版本声明及请求放行已清理 | [启动入口](../../src/index.ts)、[预设专项](./official-alpha2.md#预设公开入口复验2026-10-10) |

不能恢复的非核心扩展及各自所需上游契约集中在[取消清单](./official-feature-matrix.md#当前取消的扩展)。目前真实核心链路没有发现需要修改 DSH 本体才能补齐的接口缺口。保留的更广功能、异常和版本覆盖仍按矩阵继续验收，不推导为全部兼容。

## 源码、安装包与实际安装位置

当前0.1.80的[交付核对](../../artifacts/official-plugin-only/delivery-audit-01a0db6d-7483-4a0a-89b8-c8844434c639.json)确认234,144字节归档、63文件与当前源码及实际link安装一致，SHA256为`781f92efff24ef4343f388e89615cd96ad3f5032d4510a01d6f5c91f6a382ed7`；source map仍为51个插件项、16个协议项、28个依赖项。归档版本、正式安装版本和成功核心报告中的插件版本均为0.1.80。只构建自有协议与插件，官方正常安装器要求重启后正常pnpm入口恢复；未构建App/网关/DSH/SDK，旧0.1.79归档保留。

此前0.1.79的[历史交付核对](../../artifacts/official-plugin-only/delivery-audit-1d26cfb0-13ce-45fb-9e2d-52a44d0bbfb9.json)确认其234,003字节归档63文件与当时源码/安装相同。两份source map同一源码跨入口可重复计数，95项不代表95个独立文件。

通过正常官方只读插件目录核对当前版本已安装/启用。官方 profile 的 `node_modules/@dsh-mobile/plugin` 是安装器登记的 link，实际解析到候选目录，63个实际链接文件与tgz一致；这证明当前链接安装的一致性，不能冒充独立 pnpm 缓存副本的逐字节验收。归档没有 DSH 本体、凭据或安装脚本，`cordis.patch.yml` 只是官方插件组件声明。

交付核对曾错误地要求历史真实报告的 PID 等于当前 Host PID；正常重启后15844变为31080，旧审查因此失败。现已分别核对历史报告所属进程编号和当前存活的正常 Host，历史报告不改写。新审查结果排他写入新文件，不覆盖旧证据。

手机构建中的图标名称、主题字段和中断状态适配只用于 DSHM 自己派生的客户端产物，不写回官方源码、不注入电脑进程。具体入口见[手机SDK选择器](../../../dsh-mobile/scripts/latest-mobile-build.mjs)与[自有状态渲染适配](../../../dsh-mobile/scripts/latest-turn-process-sources.mjs)。

## 开发入口的版本边界

根 manifest 保留旧 `0.1.6-alpha.2` 开发基线；`npm run build`、`pack:local` 与手机普通 `build:web` 不生成已经验收的 alpha.2候选。不得把它们的输出安装为“最新版已验证版本”。

- 现有alpha.2插件使用[0.1.80已审查tgz](../../artifacts/official-alpha2-sdk/candidate-package-check-Alpha2PublicOnly02/dsh-mobile-plugin-0.1.80-latest.0.tgz)。本轮通过[自有构建入口](../../scripts/build-official-plugin-only.mjs)生成新版本/目录；后续变更继续分配新候选，保留历史归档及报告，源码未变不重建。
- 在插件目录运行 `npm run audit:official` 核对当前固定候选和正常官方安装；`npm run audit:interfaces`生成接口映射并明确列出未支持的声明。脚本检查通过只表示审查执行成功，不表示全部功能通过。
- 手机 alpha.2自有 Web 构建入口为 `npm run build:web:official`，等同三个显式候选参数；它使用独立SDK、只读官方源码和独立输出目录。仅在手机源码变化时执行。
- Android候选沿用 `:app:assembleDebug :app:lintDebug -PlatestCompatibilityTest=true -PofficialPluginOnlyTest=true -PofficialDshVersion=0.2.1-alpha.2`，由[Gradle已有规则](../../../dsh-mobile/android/app/build.gradle.kts)选择 `.officialtest` UID及alpha.2资源。不得覆盖原用户App。

## 旧接口清理后的实际复验

[真实核心报告](../../../backend/artifacts/official-plugin-only/official-android-fede1775-d491-4a3f-988c-8bd2d3a34e73.json)及[退出记录](../../../backend/artifacts/official-plugin-only/official-android-fede1775-d491-4a3f-988c-8bd2d3a34e73.outcome.json)在正常官方alpha.2/插件0.1.80/既有APK下通过十个Android阶段，41.471秒、退出0、真实推理及清理通过。普通授权不声明两条旧接口且被中转按管理边界拒绝；临时管理连接重新领票后不声明两条入口，插件返回明确拒绝，随后收回权限并重领普通票据。手机模型同步、唯一真实回复、write允许/拒绝、新建会话、重连保留草稿及撤销拒绝通过。

79项协议/插件回归与类型检查通过。最初测试fixture未按公开Connection的`createSharedFetchHandler().fetch`形状提供替身，修正的是测试工具；两次真实驱动失败分别为权限变更后的旧连接等待、提早读取未初始化的测试会话，报告`5b70ac10`/`f1521d11`均保留且清理通过，不改生产鉴权或官方行为，也不计为成功。

08:52的[70轮/990阶段恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn62-restoration-audit.json)确认原App PID4249/安装路径/摘要/正常前台、原Key公开状态/绑定和历史保持；原App截图已查看。正常Host39256运行且远程关闭，测试UID/授权/网关/反向映射/暂存已清理；两版官方文件与只读源码不变。接口映射和单次核心复验不扩展为全部扩展或生命周期通过。

此次只调整审查脚本、npm命令入口与文档，没有重建/安装插件、后端、App或DSH。下一项先清理两条无效的新版管理协议声明，再验证变更后的独立插件实际入口；其他范围仍记录在[KKC-24](https://linear.app/kkcodes/issue/KKC-24)。

新增npm审查命令已从实际入口执行成功，两个脚本语法、手机官方构建命令与已有隔离参数的对应关系及两仓diff检查通过；Markdown本地链接校验通过。08:41的[69轮恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn61-restoration-audit.json)重新核对原App、绑定/历史、官方文件与测试清理，原App前台截图已实际查看。两条过期接口继续明确列为未完成，不把审查命令退出0伪装成兼容通过。
