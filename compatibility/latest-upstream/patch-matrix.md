# 新版兼容补丁逐项检查

> 当前边界已由[2026-10-09 纯插件决定](../../../docs/project-knowledge/knowledge/decisions/2026-10-09-official-dsh-plugin-only.md)替代。下方“迁移/交付”是历史补丁方案，不再要求实现或交付；用于识别依赖，纯插件不能实现的功能取消，不能把旧补丁通过外推为当前兼容。

- 状态：18项旧补丁目标已逐项确定当前交付方向；当前固定源码载荷为14组/38文件，包含窄范围Windows文件监听修正，启动补丁独立核对。源码与发布入口已有实际模型、审批、提问、输出、取消及安装恢复专项，当前范围以下方入口文档为准；SDK/Electron载体、最终交付组合、旧版回归和当前七条总标准未全部完成。旧版安装器不直接用于新版。
- 维护角色：DSH Mobile项目协作Agent；核验日期：2026-10-09。
- 固定目标：DSH `0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。
- 来源：[当前旧版交付清单](../README.md)、[原源码文件比较](../../artifacts/latest-runtime-check/audit.json)、[官方源码下载记录](../../artifacts/latest-runtime-check/source-download.json)、[真实新版Host启动](../../artifacts/latest-runtime-check/host-startup.json)、[动态目录覆盖实验](../../artifacts/latest-runtime-check/inspect-directory.json)。具体源码路径在比较报告中逐项登记；本地产物不随Git分发。

以下“官方已有”只说明存在相关契约，不代表与我们全部语义相等；“仍需迁移”保留的是功能目标，不是批准直接套用旧安装器。

## 当前载荷核对（2026-10-06）

2026-10-07的[六格式原件保存与只读分享](./file-transfers.md#六格式原件保存与分享补验2026-10-07)已在当前62文件归档的发布/实际源码两种入口、各两组完整通过；37原源码/启动、381.66秒原恢复构建及355原资源精确核验。24份原件最终只读审计、测试清理与原App恢复分别记录。[本轮18目标/13组清单审计](../../artifacts/latest-runtime-check/patch-inventory-Yb9Ocv/report.json)再次核对原状态及无活动源码租约，仍明确 `fullAcceptancePassed:false`；其他文件/转换故障、SDK/Electron和原七条总标准不因此关闭。

2026-10-07的[当前只读审计](../../artifacts/latest-runtime-check/patch-inventory-tS9ayO/report.json)再次逐项核对下表18目标、13组/37文件、变换和原SHA。固定提交仍为原字节、Git干净、无活动源码租约，独立启动入口为original。当前62文件插件[原安装/正常启动/生产中转及全部55源码完整性](./candidate-package.md#当前完整插件源码对应的安装包2026-10-07)亦通过；插件tgz不包含下表电脑补丁。两份审计均明确 `fullAcceptancePassed:false`，逐项去留不代替每项完整功能和实际载体验收。

2026-10-07的[子会话身份资料故障](./subagent-catalog.md#身份资料故障与持续未知模式2026-10-07)在发布及实际源码pnpm入口通过独立Android主聊天/旁栏六分支。13组/37文件完整候选构建386.831秒与原恢复构建373.178秒通过；37原文件/启动值、355原资源精确恢复并[归档](../../artifacts/latest-runtime-check/latest-live-source-lease-child-descriptor-final.json)，Git干净且无活动租约。[新只读审计](../../artifacts/latest-runtime-check/patch-inventory-CSdLnq/report.json)核对18目标映射和原状态，`fullAcceptancePassed:false`。共享手机显示修正只安装独立故障测试UID，主App/PID/摘要/绑定保持；子任务其他工具/取消/通知与卸载在途、其余完整标准仍待验。

2026-10-07的[手机实际启动电脑编辑器](./desktop-apps.md#手机实际启动电脑编辑器2026-10-07)在发布和实际源码pnpm入口通过Cursor/VS Code真实工作区窗口、正常关闭和撤销拒绝；IntelliJ停在原项目信任提示、工作区未打开，保留失败。385.035秒候选完整构建与385.861秒原完整恢复构建成功，37原文件/启动值及355原资源精确恢复归档，无活动租约。[本轮只读审计](../../artifacts/latest-runtime-check/patch-inventory-TEtqtI/report.json)核对18目标、13组/37文件及原状态通过，`fullAcceptancePassed:false`；七条总标准和完整新版交付不因两项子范围通过而关闭。

2026-10-07的[手机确认期间停用电脑应用服务](./desktop-apps.md#手机确认期间停用服务2026-10-07)在发布和实际源码pnpm入口通过，使用同一13组/37文件候选；382.818秒候选完整构建与381.669秒原完整恢复构建均成功，37原文件/启动值和355原资源精确恢复归档，无活动租约。[本轮只读审计](../../artifacts/latest-runtime-check/patch-inventory-JOxxre/report.json)重新核对18目标映射和原状态，`fullAcceptancePassed:false`。本轮没有生产组件或APK修改；其他应用实际启动、其余七条总标准及最终交付仍未完成，下方历史报告保持原范围。

2026-10-07的[Factory实例与双客户端条目核对](./cordis-two-clients.md#factory-单个实例异常与恢复2026-10-07)在发布及实际源码入口通过，复用同一13组/37文件候选；384.044秒候选完整构建及385.493秒原完整恢复构建成功，37原文件/启动字节和355原资源精确恢复归档。[当前只读审计](../../artifacts/latest-runtime-check/patch-inventory-pNxu0y/report.json)再次核对18目标映射、原状态及无活动归属记录，`fullAcceptancePassed:false`。双客户端原标准的逐项证据已核对，其余七条总标准与最终交付保持未完成，下方报告保留各自历史范围。

2026-10-07的[局部渲染异常专项](./cordis-two-clients.md#渲染阶段异常与跨端恢复2026-10-07)在原有效运行诊断提交后补发既有清单通知，保留旧运行忽略与Host运行语义。发布及实际源码双Android实测、当前13组/37文件完整候选/原恢复构建、原字节/启动值/355资源恢复归档均通过。[最新只读审计](../../artifacts/latest-runtime-check/patch-inventory-sA0E9O/report.json)重新核对同一18目标映射和无活动源码归属记录，仍不代表完整功能验收；下方旧审计保持历史范围。

2026-10-07的[插件自身异常与恢复专项](./cordis-two-clients.md#插件自身异常与恢复2026-10-07)补齐一个原 `CordisPanel.tsx` 文件，修正旧版本本地错误遮住当前失败原因；当前13组/37文件完整候选构建与发布/实际源码双Android专项通过。原37文件/启动字节、原完整构建及355资源已精确恢复归档。[新37文件只读审计](../../artifacts/latest-runtime-check/patch-inventory-Jmtjsy/report.json)再次核对18旧目标、13组映射、实际变换/摘要及无活动源码租约，仍不代表完整功能验收。下方36文件报告保留当时的原映射证据。

[只读审计脚本](../../scripts/audit-latest-patch-inventory.mjs)及[实际通过报告](../../artifacts/latest-runtime-check/patch-inventory-Dd1KEy/report.json)确认：18 个旧补丁目录没有遗漏；当前 Manifest 的 13 组/36 文件逐项匹配固定变换、包版本和前后 SHA；固定源码所有目标仍为原字节、Git 干净、无活动源码租约，启动入口为 original。首轮审计的错误源码路径已另存[失败报告](../../artifacts/latest-runtime-check/patch-inventory-QVXZxN/report.json)，不计通过。

| 原目标 | 当前适配方向 | 实际载荷组 |
| --- | --- | --- |
| 后台输出 | 使用官方独立 `readAt`，不安装旧输出补丁 | 无；手机/Host 改用新版契约 |
| 文件元数据 | 使用官方重新stat的provider；固定Windows单文件监听另作窄范围修正，传输保留原会话与权限校验 | file-version-watch |
| 前台输出 | 迁移；共享工具/PowerShell 文件合成载荷，避免相互覆盖 | foreground-observer、ptc-cancel、pwsh-output-encoding |
| 待办通知 | 迁移只读观察，保持原审批参与者与结算 | pending-observer |
| 客户端增量 | 迁移手机选择名单 | client-entries |
| 安装取消与恢复 | 保留原管理器，迁移查询取消、修复与 Windows 原生执行范围 | plugin-install-cancel |
| 电脑应用 | 迁移原内部服务；沿用原应用ID与会话工作区 | desktop-apps-icons |
| 应用图标 | 迁移内部图标入口；复用原缓存，与应用服务同组交付 | desktop-apps-icons |
| 动态目录 | 迁移Host范围句柄及传统目录并集 | cordis-scopes |
| 动态审批竞争 | 迁移原阶段保护，与目录服务同组交付 | cordis-scopes |
| 客户端生命周期 | 迁移连接代次与实例寿命清理 | cordis-client-lifetime |
| 目录同步 | 迁移Host清单事件与客户端刷新 | cordis-client-lifetime、cordis-scopes |
| PowerShell 编码 | 迁移固定编码初始化与原只读执行边界 | pwsh-output-encoding |
| PTC 取消 | 迁移外层分类与内部原 reason | ptc-cancel |
| 自动审核取消 | 迁移明确取消分类；真实错误/拒绝保留 | auto-review-cancel |
| 模型发现 | 迁移实例级实际地址探测、拒绝跳转 | model-discovery |
| 重启提示 | 迁移原管理页 restartRequired 判断 | plugin-restart-notice |
| 源码启动 | 固定六项输入校验，另交付两个preload与根启动值 | 独立source-start-v2，不在38文件中 |

表格与审计逐项保留完整18目标；共享载荷组只合并实现，不合并验收范围。16项目标继续迁移（含独立启动），2项改用官方契约；当前13组中的 `preset-archive` 是新增预设归档要求，不算旧18项。Windows安装范围属于既有安装恢复目标，人工权限工具则独立交付。映射核对只证明载荷没有漏项，不证明每项完整功能或载体通过。

当前原CLI真实终端、安装修复和36文件精确恢复见[安装运行边界](./package-repair.md)与[源码运行器/SDK限制](./source-runner-profile-resolution.md)；实际模型与手机操作分别见[完整手机入口](../../../dsh-mobile/docs/integration/latest-compatibility.md)、[自动审核](../../../dsh-mobile/docs/integration/latest-auto-review.md)、[安装冷恢复](../../../dsh-mobile/docs/integration/latest-install-recovery.md)。真实插件包入口见[归档验收](./candidate-package.md)。这些通过结果不能替代下方未覆盖的格式、并发、插件、载体和交付标准。

## 分项事实与历史验证范围

以下表格保留各次适配当时的依据；其中十一项/28文件、十三项/31文件等是对应历史轮次，不是当前载荷数量。较新的实际手机结果与恢复状态以上节指向的专项文档为准。

当前组合证据以[源码运行记录](./source-runtime.md)、[电脑应用在途](./desktop-apps.md#应用查询在途异常)及[手机验收](../../../dsh-mobile/docs/integration/latest-compatibility.md)为准：发布206.01秒、实际源码pnpm250.26秒的协议/独立Android/原Host重启组合已通过；原28文件、根启动脚本和355客户端资源精确恢复。旁栏与在途主聊天PDF组合另在发布141.38秒、源码外层165.22秒通过；发布环境[真实回复与单次文件写入审批](../../../dsh-mobile/docs/integration/latest-compatibility.md#真实模型回复与文件审批2026-10-06)已通过，源码推理和更多工具边界未验。不能将早期七项组合限制继续视为当前构建缺口。

| 原补丁 | 新版已核对的事实 | 适配方向与必要验证 |
| --- | --- | --- |
| [后台输出](../background-output/README.md) | jobs公开非消费式readAt；shell后台进程提供observed读者。旧readOutputBytes/readBytesFrom未出现在已核对的公开契约中，输出结构及owner改为SessionId。 | 优先使用官方接口；验证模型读取不消费手机输出、字节边界、截断、运行中/结束后读取、大输出及重连。不能把字符串offset或chunk边界直接当旧字节协议。 |
| [前台输出](../foreground-output/README.md) | 新shell公开observed，但没有专用前台观察。隔离候选已补充raw字节读者及原工具发布，覆盖直接前台与任务前台。 | [8项专项](../../tests/latest-command-output.test.mjs)通过，含真实PowerShell/原只读沙箱、UTF-8、取消、spill、原结果及身份；Bash进程及provider故障用受控provider。七个固定TS文件已迁移，十一项/28文件完整源码构建、41项函数、原回归及精确恢复通过，见[源码记录](./source-runtime.md)；仍需Android实际执行卡、超时转后台组合及最终交付验收。 |
| [待办通知](../pending-notifications/README.md) | 原观察契约缺失；候选已按新版Gateway提交/结算生命周期加入只读观察，原五参数流另已接入。固定源码迁移保留同一旁路，Host/Client全量类型、原源码函数及安装恢复通过。 | [双客户端/异常/取消/销毁专项](../../tests/latest-pending-notifications.test.mjs)通过，不增加审批参与者；[源码记录](./source-runtime.md)区分原函数单元与完整链路。十一项实际源码Remote已通过；模型触发的Android提醒仍待验。 |
| [客户端增量](../client-entries/README.md) | 原client/entries.ts与旧参考身份相同，syncSelected缺失；候选编译bootstrap及一个固定源码文件已迁移选择名单。 | [2项真实Loader专项](../../tests/latest-client-entries.test.mjs)在编译和原源码分别通过，保留不变实例、替换/移除/同版本重装、名单校验与清理；四项源码整体类型/安装恢复通过，见[源码记录](./source-runtime.md)。发布与源码入口的实际手机安装/同名升级/重启执行新版及卸载已通过；更广客户端交错与局部状态仍待验。 |
| [安装取消](../plugin-install-cancel/README.md) | 主安装service进程树取消已由官方提供，实际Windows pnpm测试通过；三个查询入口仍缺少该选项，四项取消/超时实际留下子进程。 | 仅迁移三处查询，保留官方service/cli及修复安装策略。源码变换、实际发布入口和安装后的源码产物各五项进程测试通过，原operations套件72项保持；手机安装/升级/卸载、HTTP下载中取消及真实兼容拒绝修复在发布与源码入口分别通过，脚本取消及修复中断仍待验，Windows锁文件EPERM未定位，见[证据](./package-management.md)。 |
| [文件元数据](../file-metadata/README.md) | 新provider收到目标变化后再次stat，原元数据状态机不安装旧补丁。新版目标监听/options字节读取/HTTP二进制已按原契约接入中继；固定Windows FsLocal另需[单文件监听修正](./file-version-watch.md)，避免ctime改变而mtime不变时漏通知。 | 真实Host、Web375×667与独立MuMu通过字节数/版本/原正文更新、删除失败/恢复、关闭最后一个holder和取消；候选组合225.96秒通过。真实Office六格式工作区/历史附件转换、原件字节保持及两端原PDF预览通过；同版本Word缓存复用仍查询权限及代次，源文件修改/恢复后再次打开均实际重新转换，见[源版本证据](../../../dsh-mobile/docs/integration/latest-compatibility.md#office源文件版本改变后的缓存2026-10-05)。发布与源码入口的Android服务变化后缓存、关闭传输中预览/Host容量释放、显式断开/重连重新授权和实际socket传输中断后的自动连接恢复均另通过；传输中收回管理权限可只读重连，撤销设备后拒绝重连，旧请求/画布和Host名额清理核验；主聊天的真实PDF在途切换另在发布与源码Android通过：原载入取消并释放容量，标签身份保留，返回原标签重新读取并显示实际正文。实际Windows ReadData权限收回后的Android失败/重试、原DACL与字节恢复、实际PDF正文和容量释放已在发布与源码入口通过。普通会话切换时缓存按会话重新授权，同名文件的实际PDF正文与错误会话附件拒绝另已通过；中断预览点击原重试后读取新PDF，见[具体边界](./office-lifetime.md)。工作区Word与历史附件的实际完整保存、跨UID只读分享及下载中socket断线后的清理/约3MiB重试已在两种入口通过，见[文件传输](./file-transfers.md)。系统窗口断线、下载进程结束、受控保存位置实际目标写入中结束亦已在两种入口通过；部分目标保留、提示跨重启及完整手动重试核验。工作区Word同大小/mtime内容变化及同原版本重开去重已在修正后的发布与实际源码Android整轮通过，原资源恢复/全部历史保持核验。其他文件元数据组合与引用版本去重、旁栏/并发预览在途切换会话、转换引擎运行中取消、其他文件权限/操作系统及附件引用在途变化、更多格式保存/分享、其他保存提供方及更广网络恢复仍待验；受控分享副本准备中进程结束在发布与源码入口通过，真实部分副本清理、完整快照保持及只读重试核验，不能据此宣布最终移除全部文件补丁。 |
| [电脑应用](../desktop-apps/README.md) | 原open-in-app源码改变；原网页仍提供目录及启动，但没有Remote内部服务。 | [固定迁移](./desktop-apps.md)已加入十一项/28文件源码候选和五个发布运行/声明文件；三种入口的八项服务及安装边界通过。发布与源码CLI/网关目录、独立Android选择/取消/实际资源管理器打开专用工作区及关闭测试窗口通过，十一项源码Android/Office/传输/重启与精确恢复通过。发布与源码主聊天/旁栏实际启动及图标、取消/断线/撤权迟到拒绝、工作区故障和原服务卸载恢复已通过；手机确认在途撤权失效页与零误启动通过。其他应用及手机服务卸载时的在途界面仍待验。沿用应用ID和会话工作区，不接受手机目录或任意命令。 |
| [应用图标](../desktop-app-icons/README.md) | 新open-in-app有原iconOf缓存，但没有内部icon服务。 | [固定迁移](./desktop-apps.md)复用原缓存，八项验证字节副本、类型/体积、未知应用与寿命；发布和源码真实Windows图标经网关与原网页字节一致，两种入口的独立Android成功解码并显示。两种入口旁栏图标已实际解码；其他应用图标、其他平台和手机服务卸载时的在途界面仍未验。 |
| [动态插件目录](../cordis-inspect/README.md) | 原新版仍覆盖目录；[候选迁移](./cordis-scopes.mjs)及[固定源码迁移](./source-cordis-scopes.mjs)已有独立Host句柄、传统电脑目录并集和12个原方法解码后保护。 | [真实新版注册表/Runner/生成RPC专项](../../tests/latest-cordis-scopes.test.mjs)在编译与原源码分别验证目录/契约原子性、不可变JSON、异步失效、查询首次有效结果与取消；实际网关验证事件连接归属。七项/二十二文件源码类型、三十三函数及安装恢复通过，见[源码记录](./source-runtime.md)。真实手机局部UI、目录推送、客户端寿命及十一项源码Remote组合通过；更广双客户端交错仍待验。 |
| [动态审批竞争](../cordis-approval-race/README.md) | 原新版阶段条件仍允许重复批准，失败回执缺少状态保护；已在固定候选及原TS Runner迁移两处边界，原签名及codec不变。 | [原VM/Runner专项](../../tests/latest-cordis-scopes.test.mjs)在编译与原源码分别通过starting-host/client-pending期间旧拒绝及重复批准失败拒绝、首次成功后重复拒绝、批准前拒绝与真实Host/Client失败回收；源码整体类型/安装恢复通过。十一项源码构建、Remote及精确恢复已通过；模型触发的手机/电脑实际并发及最终交付仍待验。 |
| [客户端生命周期](../cordis-client-lifetime/README.md) | 四个登记源码文件与原参考身份相同；固定新版编译候选及源码均复用原寿命逻辑，四份派生后源码字节一致；另补统一转发清单及目录事件声明。 | [7项专项](../../tests/latest-cordis-client-lifetime.test.mjs)在编译和原源码分别通过销毁后微任务、迟到拒绝、重连代次、相同queryId复用和旧读取清理；七项/二十二文件整体的完整源码类型/三十三函数/安装恢复通过，见[源码记录](./source-runtime.md)。实际Web/Android局部界面加载、Host调用与移除通过；十一项源码Remote及原Host重启组合已通过；更广客户端重连、局部状态及最终交付仍待验。 |
| [目录同步](../cordis-inventory-sync/README.md) | 原文件没有旧通知；候选与原TS Host在定义/版本/移除完成后emit，原转发清单加入同一无参数事件，客户端合并refresh。 | [Host通知与客户端时序专项](../../tests/latest-cordis-scopes.test.mjs)及[客户端专项](../../tests/latest-cordis-client-lifetime.test.mjs)在编译和原源码分别通过，源码整体类型/安装恢复通过；真实Web/Android在面板已打开后新增、更新、移除均同步，审批批准后局部UI/Host调用和清理通过。夹具调用原Host run产生审批，无模型推理；十一项源码Remote与原Host重启组合已通过；双客户端更多交错、实际模型停止仍待验。 |
| [PowerShell编码](../pwsh-output-encoding/README.md) | 原7/5.1普通执行通过；只读沙箱均复现UTF8Encoding初始化错误，每次恢复936的独立控制台另复现中文/emoji损坏。原结果与独立观察相同。 | 三个固定源码已迁移并合入十二项/30文件；发布及实际源码构建四组合、八项前台输出与六项安装边界通过。修正验证器后的完整源码构建、原回归、真实pnpm/网关及Host重启通过，原源码/启动字节和355资源精确恢复；该轮无Android或模型推理。发布入口随后通过Android真实模型调用的中文/emoji、实时输出与历史重入，源码Android/推理及最终交付继续验，见[实际编码依据](./pwsh-encoding.md)。 |
| [PTC取消](../ptc-cancel/README.md) | 原官方157项通过，但增强结构化断言及内部reason身份后159项失败2项，证明外层abort和内部原样reason仍错误分类。 | 两处固定源码及同一发布bundle已迁移；159项、5项分类及3项真实Node进程在源码/编译分别通过，输出与独立故障保留。十一项/28文件组合已通过；发布环境真实模型/Android只读与可写停止、ABORTED、输出保留、历史重入与继续回复另通过。源码实际推理和内部工具取消仍待验，见[证据与边界](./tool-cancellation.md)。 |
| [自动审核取消](../auto-review-cancel/README.md) | 新版ToolRuntime使取消优先于迟到允许/拒绝，独立UNKNOWN故障应保留；但真实模型审核流明确aborted/ABORTED时，原Auto插件仍生成无类型的失败。 | [新版窄范围迁移](./auto-review-cancel.mjs)只在原审核明确取消且调用者已停止时返回cancel，其他故障/拒绝保持。33项Auto套件及两种入口手机取消/历史/续聊/恢复、原工具/PTC内层低风险放行、ask手机拒绝和never结构化最终拒绝通过；已加入13项/31文件完整源码载荷。源码Host曾意外退出且原因未知；新组合最终精确恢复、其他审核故障/后台策略及最终交付仍待验，见[当前证据](../../../dsh-mobile/docs/integration/latest-auto-review.md)。不直接套用旧信号补丁。 |
| [模型发现](../model-discovery/README.md) | 新llm-pi-ai注册改用实际profile实例ID，原fetch仍跟随跳转且优先返回内置目录；现以[实例级受限入口](./model-discovery.mjs)迁移，不改变原电脑入口。两个固定源码文件另完成迁移及类型/安装恢复验证。 | [新版原服务专项](../../tests/latest-model-discovery.test.mjs)在编译和原源码分别通过三种认证、两类跨源跳转拒绝、真实在途取消、目录捷径/去重及卸载，见[源码记录](./source-runtime.md)；真实Host另核验Key固定写入/移除与快照拒绝，Web/独立Android实际取消、候选加入草稿不保存、跳转拒绝通过。原生临时Key和已有自定义路由、官方名称同步/完整字段保留、内置清单/两项覆盖/默认恢复在实际手机入口通过，配置/继承/凭据按操作范围核对。十一项源码Remote与原Host重启组合已通过；更多字段/协议、第三方登录与模型请求仍待验。 |
| [重启提示](../plugin-restart-notice/README.md) | 页面及控制器仍缺少restartRequired条件；原客户端增强回归188项失败3项。 | 两处固定源码及发布客户端已迁移，188项原组件/控制器回归在变换后及实际源码安装后通过。手机复用原管理局部组件；实际首次安装、同名升级、原Host重启执行新版及卸载在发布与源码入口分别通过，原26文件/355资源恢复通过。崩溃与安装未知结果仍待验，见[边界](./package-management.md)。 |
| [源码启动](../source-start/README.md) | 6个安装器输入中5个改变。完整源码/冻结依赖/原构建通过。原ESM身份已一致，但CJS/Worker仍分裂；按新版六个固定哈希迁移启动安装器，安装载荷的身份、实际工具调度和pnpm候选启动通过，恢复原字节/Git干净，新旧安装器七项通过。 | 启动身份补充仍需保留；这一项的隔离源码安装/恢复已有证据，十一项/28文件完整源码迁移、实际pnpm/Android/原Host重启及精确恢复另已通过；真实推理、最终交付和旧版组合回归仍待验，见[源码证据](../../../dsh-mobile/docs/integration/latest-compatibility.md#固定新版完整源码准备2026-10-05)。 |

## 与完整Remote验收的关系

后台输出已经在隔离候选中使用官方 readAt，真实新版 jobs 的字节分段、跨流过滤、模型独立消费、缺口/裁剪、停止归属与销毁拒绝通过，见[原注册表测试](../../tests/latest-jobs.test.mjs)。这不等于全部旧补丁可移除：大输出长期保留、真实手机和与前台输出的组合仍须验证。

候选已满足新版插件加载与协议协商，并通过会话列表、历史、新会话、消息持久同步与选模；[自有页面及独立Android链路](../../../dsh-mobile/docs/integration/latest-compatibility.md)已有发布及源码pnpm证据，无Key限制保留。待办观察的[原Gateway核心矩阵](../../tests/latest-pending-notifications.test.mjs)及固定源码安装器已经通过；真实模型触发的Android提醒尚未验证。Office、动态插件局部界面、主/旁栏应用已有对应实际组合，剩余异常、真实工具执行和最终交付仍须按各专项边界核对。

## 新版新增的预设恢复边界

新版移除了旧的预设复制、删除接口；原ConfigEditor只编辑已有声明。手机候选使用[受限profile管理](../../src/profile-preset-management.ts)，沿用原解析、文件锁、原子写入和Loader调和，只允许复制已有模式及删除用户层独立模式，不接受任意YAML、路径或插件配置。

真实重启验证发现，物理移除声明只能依赖原注册表的内存保留，电脑重启后旧会话无法保证恢复。因此新增[预设归档候选补丁](./preset-archive.mjs)：保留原声明，目录隐藏并拒绝新的选择lease，原旧会话恢复仍可读取其组成。异步诊断和排队切换结束后再次检查归档状态，防止删除期间获得新选择。删除当前默认模式同时恢复原默认继承。它是新版契约带来的新增边界，不作为旧18项补丁中任何一项已经完成的证据。

[原函数时序专项](../../tests/latest-preset-archive.test.mjs)2项与六项候选补丁组合34项通过；[真实Host全链路](../../../backend/tests/latest-host.test.ts)通过外部修改/重复ID/一次性连接快照拒绝、真实Loader激活失败回滚、Web和独立Android复制/取消/删除，以及不加载DSHM插件的原Host重启后恢复旧会话并接收消息。隔离环境无Key，不证明真实模型执行。此补丁另已迁移到三个固定新版源码文件，原异步诊断/选择队列、完整源码类型及四文件整体安装恢复通过；源码与编译候选同时补齐新版错误详情，编译记录为v3。预设归档已纳入十一项源码构建及实际Remote/原Host重启恢复组合，真实模式创作尚未完成，见[源码记录](./source-runtime.md)；模式创作继续迁移。

代码工作视图偏好已通过固定`ui-settings.enabled`投影接入原SettingsForms与手机原共享ConfigForms，无需第七个电脑补丁。基本聊天只读偏好，管理授权可修改；真实Web/独立Android验证双端修改推送、隐藏对应模式、原默认纠正和恢复继承。详细边界、来源和回归见[手机记录](../../../dsh-mobile/docs/integration/latest-compatibility.md#代码工作视图偏好2026-10-05)，不据此声明原18项全部完成。

官方/内置输入声明、自定义思考档位、两类模板、固定兼容参数与Completions/Responses协议切换的取消/确认/恢复已在实际Web及独立Android表单通过，电脑完整配置与继承、隔离凭据逐步核验；组合220.63秒通过，没有新增补丁。该结果只证明具体管理字段，不代表真实推理使用模板、Anthropic或任意第三方兼容，详见[高级模型验收](../../../dsh-mobile/docs/integration/latest-compatibility.md#模型输入思考模板与协议切换2026-10-05)。

检查结果不支持“只升级peerDependencies即可兼容”，也不支持“18个补丁全部照搬”或“全部删除”。目前尚未发布新版兼容声明。
