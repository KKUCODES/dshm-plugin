# DSH Mobile 桌面插件

## Git 仓库边界

本目录是独立 Git 仓库，默认分支为 `main`；手机端在相邻 `../dsh-mobile` 目录使用另一个仓库。初始化仅创建本地提交，远端由用户后续分别创建并关联。

仓库保存插件源码、测试、兼容补丁脚本、依赖锁文件及文档；`node_modules`、`dist`、`artifacts`、环境配置和安装包不纳入版本管理，已有本地文件保持原位。兼容补丁的生成产物需按各补丁说明重新构建，验收文档引用的本地证据也不会随仓库分发。

仓库独立不改变当前构建依赖：共享协议仍引用 `file:../backend/packages/protocol`，应先在相邻后端构建协议；部分兼容补丁与测试还依赖相邻的 DSH 参考源码。跨项目文档链接沿用现有目录布局，单独克隆本仓库不会带上这些依赖。远端接入前如需独立克隆构建，应另行处理依赖交付。

仓库初始化任务：[KKC-22](https://linear.app/kkcodes/issue/KKC-22)。

## 当前交付

配套电脑补丁的[交付清单与只读核对](./compatibility/README.md)覆盖当前维护组合；在插件目录执行 `node scripts/check-installed-compatibility.mjs "F:/Program Files/deepseek-harness"` 检查实际安装文件，不修改DSH或用户配置。

电脑原插件管理组件需配套[升级重启提示补丁](./compatibility/plugin-restart-notice/README.md)：已有包需重启时不再提供“立即启用”。补丁独立于tgz交付，已在本机及MuMu验证；不改变Host原重启要求。

当前版本0.1.75。通知支持会话标题和有限完成正文，修复待审批/提问时插件作用域读取导致通知流中断的问题；需配套网关/App，更新后重启DSH，无需重新配对。实际覆盖见[通知验收](../dsh-mobile/docs/integration/notifications-current.md#待审批与提问通知标题修复2026-10-03)。

0.1.73草稿模型探测已安装：Host检查管理权限、设备/连接归属和专用发现能力。配套网关与App已通过MuMu无认证、原生临时Key、已有认证、拒绝跳转及关闭页面取消的实际路径，见[接入边界](../dsh-mobile/docs/integration/model-settings-compatibility.md#草稿模型发现的认证与跳转基线2026-10-02)。

[草稿模型发现兼容补丁](./compatibility/model-discovery/README.md)已安装本机DSH，新增拒绝重定向的独立发现接口，保留原电脑行为。手机通过固定管理协议探测未保存的地址与协议，临时Key仅经原生窗口输入；候选加入草稿后仍需用户保存配置。

0.1.72支持创建提供方时一次保存模型名称、容量和输入类型，兼容旧模型ID数组，沿原配置版本及管理授权检查。已安装并通过真实Android创建与读回，见[范围](../dsh-mobile/docs/integration/model-settings-compatibility.md#创建前结构化模型行2026-10-020172)。需同步更新网关与App。

[PTC内部取消增量补丁](./compatibility/ptc-cancel/README.md#内部工具原样抛出取消原因2026-10-01)修复内部工具收到停止后被记为普通错误；已安装并通过真实手机内外停止、历史重入、续聊及非取消失败回归，无需新APK。

0.1.71支持手机管理默认Agent预设与模式选择开关，仅允许原agent-presets两个字段，需配套新网关。手机保存、电脑读回与原配置恢复已验证；新会话采用待验，见[设置范围](../dsh-mobile/docs/integration/model-settings-compatibility.md)。

0.1.70接入预设管理后的目录路径展示：按原Host预设ID解析，仅向获管理授权的手机返回用户预设位置，不自动打开电脑文件管理器。查看、复制、展示及删除已在Android验证，见[实际范围](../dsh-mobile/docs/integration/model-settings-compatibility.md)。

0.1.68提供手机首次模型配置所需的只读就绪状态，网关和Host均要求管理权限，不传递凭据或完整配置。已安装于本机，配套新版网关和App通过已有模型自动跳过、缺Key提示、原生窗口取消及恢复后完成的Android验证；引导内新Key保存仍待验，见[引导边界](../dsh-mobile/docs/integration/model-settings-compatibility.md)。

[PTC取消分类补丁](./compatibility/ptc-cancel/README.md)使手机停止程序后显示“已停止”，保留停止前输出。已在本机安装并实际验证；旧历史不重写，无需更新手机APK。

可选实验Auto审核的[取消状态补丁](./compatibility/auto-review-cancel/README.md)区分用户停止与模型拒绝，本机已安装并经真实手机验证。补丁独立于插件包，不自动启用Auto；配套新版手机提供[本地化取消提示](../dsh-mobile/docs/integration/auto-review-current.md#手机取消提示与共享入口2026-09-28)。

0.1.67 为手机模型卡片扩展提供原目录及配置/Key布尔状态，只读且要求管理权限；不传递 Key 或任意设置。需配套网关和App，见[已验证入口与限制](../dsh-mobile/docs/integration/provider-card-current.md)。

Windows隐藏控制台启动DSH时，受限PowerShell的中文输出可能乱码。[编码兼容补丁](./compatibility/pwsh-output-encoding/README.md)提供固定基线安装/恢复器，本机已安装并通过真实电脑与Android中文标准/错误输出检查，原只读权限保留。此补丁独立于插件安装包，不能恢复已损坏的历史文本。

0.1.66支持在手机切换已有自定义模型提供方的服务协议，选项沿用电脑原schema，保存继续校验原配置和管理权限；内置提供方不开放此入口。需配套网关与App，[真实手机保存与电脑请求切换](../dsh-mobile/docs/integration/remote-current.md#自定义服务协议切换2026-09-27)已通过，真实第三方认证及其他完整设置仍待验收。

本机DSH已安装[动态审批并发补丁](./compatibility/cordis-approval-race/README.md)与[清单同步补丁](./compatibility/cordis-inventory-sync/README.md)：启动中的旧拒绝/重复批准不再抢先结算，移除后两端旧条目同步清除。真实MuMu完整双端专项已通过；电脑刚重启、连接尚未就绪时的一次读取报错仍待修复，更广Remote验收继续，见[实际边界](../dsh-mobile/docs/integration/remote-current.md#动态清单同步安装与双端验收2026-09-27)。

配套0.1.65已在MuMu通过[专用自定义提供方真实管理](../dsh-mobile/docs/integration/remote-current.md#专用提供方的真实手机管理2026-09-27)：新增/移除、部分设置/模型能力/兼容保存重读、地址确认与取消、独立Key引用启用及原生窗口取消。仅操作测试路由，已清理并收回临时管理权限；官方清单名称保存与恢复另已通过下方专项；内置目录发现/覆盖通过，详见[实际范围](../dsh-mobile/docs/integration/remote-current.md#内置模型发现与覆盖的真实手机验收2026-09-27)；[自定义发现的本机HTTP专项](../dsh-mobile/docs/integration/remote-current.md#自定义模型发现的真实http链路2026-09-27)也通过；[已有用户覆盖保留与过期写入](../dsh-mobile/docs/integration/remote-current.md#模型覆盖保留与过期写入的手机验收2026-09-27)亦通过；基础层/隐藏字段手机实测、双设备竞争、真实第三方认证/TLS、其余字段与真实Key请求仍待验。下方旧版本中的“实际待验”以该专项的明确覆盖为准。

本机DSH已安装[客户端生命周期兼容补丁](./compatibility/cordis-client-lifetime/README.md)，处理重连时旧插件继续同步目录和旧读取迟到报错。补丁独立于插件安装包，固定基线安装/恢复方式及实际手机验证见链接；完整第三方兼容仍在验收。

当前0.1.65增加[官方DeepSeek模型清单](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#官方deepseek模型清单2026-09-27)固定管理通道，支持模型增删、名称、容量、输入类型及恢复默认；与pi-ai同名提供方隔离，原隐藏字段保留。需配套新版网关/App，当前已安装；[实际名称保存与恢复](../dsh-mobile/docs/integration/remote-current.md#官方模型清单的真实手机保存2026-09-27)已通过MuMu，其他字段继续待验。已有提供方新增、用户层移除和[启用独立API Key](../dsh-mobile/docs/integration/remote-current.md#既有提供方启用api-key2026-09-27)继续保留，Key通过原生窗口填写，真实授权写入仍待验。

0.1.61支持读取已有提供方的可用模型候选，复用电脑原模型发现服务；仅电脑解析保存的地址、协议和认证，手机选择后仍需保存。需配套新版网关/App，[真实手机内置目录发现与覆盖](../dsh-mobile/docs/integration/remote-current.md#内置模型发现与覆盖的真实手机验收2026-09-27)已通过；[受控本机HTTP发现](../dsh-mobile/docs/integration/remote-current.md#自定义模型发现的真实http链路2026-09-27)亦通过，真实第三方认证/TLS仍待验；见[设置边界](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方模型发现2026-09-27)。

0.1.60支持已有提供方的内置模型用户覆盖，复用模型通道并隔离清单/覆盖快照；原目录校验、基础继承和管理权限保留。需同步网关/App，真实手机管理保存待验，见[边界](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#内置模型逐项覆盖2026-09-27)。

0.1.59支持已有提供方共用的协议兼容默认值，沿原设置服务逐字段修改用户层，保留模型覆盖与未知字段。需同步网关与App；实际手机管理保存待验，见[边界](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#提供方默认兼容设置2026-09-27)。

0.1.58支持已有提供方模型的固定协议兼容选项和模板参数，沿原pi-ai协议适用性校验，可恢复模型层继承。需同步新网关与App；真实手机管理保存、路由级兼容设置和modelOverrides仍待完成。

0.1.57支持已有提供方模型的输入类型、思考能力继承/关闭/自定义档位。原模型兼容参数保持，原pi-ai校验继续生效；需同步新网关和App。实际手机管理保存尚待验证，完整兼容参数与目录覆盖管理仍未接入。

0.1.56支持电脑已有其他提供方的模型清单新增/移除、ID/名称/容量编辑与恢复用户层默认；需配套新网关和App。未展示的模型字段按一次性行标识在电脑端保留，保存仍由原设置服务校验。输入类型、思考及兼容选项编辑和实际手机保存仍待接入或验证。

0.1.55支持管理电脑已有其他模型提供方明确配置的Key引用，需配套新网关与App。原生窗口仅写入/移除对应凭据，旧值与引用名称不回传；没有明确引用时保留提供方自身认证方式，不猜测默认Key。实际手机保存仍待验证。

0.1.54支持修改电脑已有其他模型提供方的服务地址，需配套新网关与App。只修改所选提供方的baseURL，沿用原版本检查和默认继承；未单独配置时由原提供方模型目录决定目的地址。真实手机保存仍待验证。

0.1.53增加电脑已有llm-pi-ai提供方的七项基本设置通道，复用原设置服务与版本检查。需同步更新网关和App，管理权限要求不变；完整模型配置及手机实际保存仍待接入或验证，见[设置边界](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有其他模型提供方的标量设置2026-09-27)。

0.1.52 支持管理电脑已配置的 DeepSeek／网页搜索自定义 Key 引用。仍只返回配置状态，密码由手机原生窗口输入；注册凭据与 Remote 信任记录不可通过此入口修改。见[凭据边界与验证](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已配置的自定义key引用2026-09-27)。

0.1.49 配套新版网关、App 和[图标服务扩展](./compatibility/desktop-app-icons/README.md)，可在手机应用列表及原主聊天/旁栏按钮显示电脑的实际应用图标；未提供图标时保留通用图形。本机已安装并通过 MuMu 四种 Windows 应用图标验证，完整 Remote 仍在实施。

0.1.48 配套新版网关、App 和[服务兼容补丁](./compatibility/desktop-apps/README.md)，支持手机选择电脑应用并确认打开已有会话的工作区；路径由电脑解析，不接受手机传入目录或命令。MuMu 已验证读取、取消和资源管理器实际打开；其他应用启动与在途撤权仍待验证。

为单台电脑的 dsh Desktop 增加公网远程会话通道，包含 Host 插件和电脑端设备管理页。**不包含手机应用**。

0.1.47配套新版网关与手机支持Office预览缓存复验：只读转换器代次、固定分片流的前台/后台优先级，后台为前台保留传输容量。原文件权限与附件引用核验不变，详见[协议](../docs/protocol.md#office-转换预览)和[实测边界](../dsh-mobile/docs/integration/remote-current.md#office缓存与调度2026-09-26)。

兼容基线：dsh `0.1.6-alpha.2`、Cordis `4.0.2`。已验证 0.1.3 在 dsh Web 下注册、配对、读取任务与历史、续聊和接收真实模型实时输出；内置浏览器已验证远程开关、重启后的自动连接及在线设备撤销。本机客户端断线可重新取票订阅，手机端、公网环境、真实弱网和长期稳定性仍待验证。

## 安装与启用

**0.1.46**补充交付文件的“在电脑文件夹中显示”，仅接受聊天原交付记录和明确确认，复用原DSH文件权限与路径核验。需配套新版网关/App；本机已通过官方CLI安装并重启，MuMu真实确认后Windows资源管理器选中目标文件通过，见[协议与边界](../docs/protocol.md#在电脑打开文件插件-0134)。原交付卡片整体组合仍待完成。

**0.1.45**开放原文件预览的按行分页API，复用电脑会话和文件系统权限。文本页JSON转义后超过中继限制时返回明确的文件大小错误，保留连接；不截断或开放readAll/文件写入。需同步新版网关并重启DSH，完整手机documentPreviews渲染仍在接入，见[分页契约](../docs/protocol.md#原文件预览按行分页)。

**0.1.43**开放原聊天引用候选服务，并收紧文件/聊天候选为 `agentId/query` 两个参数。配套新网关和App可从「＋ → 引用文件或聊天」选择引用加入草稿；MuMu选择入口已通过，发送后的专项验证待完成，见[当前范围](../dsh-mobile/docs/integration/remote-current.md#文件与聊天引用选择2026-09-26)。

**0.1.42**开放原 `workspaceFiles/list`，只读取当前会话工作区内某个目录的直接子项，使用原 Host 规范路径边界和条目上限。手机从「Remote 选项 → 插件面板 → 工作区文件」使用原 DSH 文件树，文件进入 DSHM 预览；不扫描整台电脑或创建工作区。需配套新版网关，MuMu展开/刷新/预览/清理已通过，见[当前验收](../dsh-mobile/docs/integration/remote-current.md#工作区文件按需浏览2026-09-26)。

原文件资源插件在工具修改文件后更新版本但保留旧大小，需要配套[文件元数据兼容补丁](./compatibility/file-metadata/README.md)。本机已安装并通过 MuMu 原订阅更新、最新预览和权限保留验收。

**0.1.41**允许原文件资源插件订阅会话所属工作区的文件观察，配套新版网关。仅通知 DSH 工具已观察到的文件版本或消失事件，不监视操作系统的任意改动；不会开放目录树、文件写入或通用 HTTP。客户端只能提供会话身份，关闭/断线沿用原流取消。实际验收见[Remote 当前记录](../dsh-mobile/docs/integration/remote-current.md)。

**0.1.40**提供插件安装/卸载/开关的短提交及结果查询，配套新网关/App可跨网关断线查询，重开页面后可查看并取消进行中的安装。更新后须重启DSH加载代码，不能仅根据页面版本号判断。回执仅在当前插件运行期间保存，完成后保留1小时；手机不自动重试写入。MuMu45秒下载、网关重启、页面重建取消、脚本明确批准与运行中取消、下载阶段撤权已通过；applying竞态和电脑重启未知结果仍待验收，详见[当前记录](../dsh-mobile/docs/integration/plugin-management-current.md)。

Windows上的安装取消和包查询超时需配套[进程树取消补丁](./compatibility/plugin-install-cancel/README.md)，避免pnpm子进程继续运行。固定基线已安装并通过MuMu两种取消；断线不等于安装已取消，完整异常仍待验收。

手机启停组件时保留原详情页，需要配套[插件增量兼容补丁](./compatibility/client-entries/README.md)和新版App。本机固定基线已安装并通过MuMu；旧电脑保留原重建路径，未变化插件的页面状态不能保证保留。

0.1.37增加命令超时、输出上限与工具并发数量的数值配置通道，保留原电脑校验与版本控制。需要新版网关和App、设备管理权限；仅传递已核验字段，通用配置与凭据接口仍不开放。实际验收状态见[配置边界](../dsh-mobile/docs/integration/plugin-management-current.md)。

0.1.39增加网页搜索配置：固定maxUses投影、Key状态/原生写入和独立服务地址确认。需基线搜索插件0.1.6-alpha.2、新网关/App及管理权限；不开放通用配置/凭据RPC。MuMu次数保存/恢复、电脑同步及Key/地址取消通过；真实Key/地址更换和Subagent模型授权保存仍待专项，详见[验收与配置边界](../dsh-mobile/docs/integration/plugin-management-current.md)。下面的通知及兼容补丁要求继续适用。

0.1.35增加只读实时完成/失败通知流；安装[待办兼容补丁](./compatibility/pending-notifications/README.md)后同时提供待审批/提问的初始集合与新增/清除。本机已安装，配套App的主要通知链路已在MuMu验证，完整范围见[通知记录](../dsh-mobile/docs/integration/notifications-current.md)。历史附件的「在电脑打开」继续沿用0.1.34能力；前台输出仍需[前台兼容增量](./compatibility/foreground-output/README.md)，后台使用[基础补丁](./compatibility/background-output/README.md)，完整状态见[当前矩阵](../dsh-mobile/docs/integration/remote-current.md)。

历史附件确认后由原服务生成独立临时副本，不修改聊天原件；MuMu文本/图片打开、取消及原件保留已通过，完整Office默认应用打开仍待验收。每进程最多8份副本，各256 MiB以内，超过一小时按需清理；需保留的编辑请另存。

0.1.30 增加电脑原聊天页的评价同步。通过公开插槽读取原评价 controller，收到活动会话或冷存档通知后调用原串行重读；不替换评价控件、不轮询、不扩大设备权限。电脑通知使用原浏览器鉴权，手机继续使用已有中继通道。原服务和同步回归已通过，真实双端写入验收状态见[当前记录](../dsh-mobile/docs/integration/remote-current.md)。

0.1.27 开放原消息反馈读取、评价/撤回与会话反馈接口。沿用原会话日志和消息版本，需新版网关及手机输入层插槽。反馈可能按电脑遥测配置上报会话日志；读取或关闭反馈弹窗不会提交。本版真实手机入口验收见[当前记录](../dsh-mobile/docs/integration/remote-current.md)。

0.1.26 增加交付文件、整轮改动文件的「在电脑打开」。只接受原会话记录坐标，复用电脑原核验与默认应用，不接受任意路径或命令；沿用聊天授权。需新版网关与 App，MuMu 基础路径已通过，详见[当前验收](../dsh-mobile/docs/integration/remote-current.md)。

0.1.25 提供官方 DeepSeek 模型服务地址的站点读取、确认写入与恢复默认。复用原地址解析器及启动环境、原设置服务版本规则；旧完整路径不回传，HTTP明确提醒。MuMu真实读取/核对后取消及收回权限已通过，真实用户地址保存未验收。模型地址不同于中继服务器地址。

0.1.24 提供官方 DeepSeek 默认Key的状态及仅写接口，需设备管理权限；手机原生密码窗口更换/移除，不回传原Key或任意凭据。自定义引用暂不支持，来源只读时禁止写入。MuMu已验证状态、打开取消和收回管理权限，真实Key写入未验收。详见[设置边界](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md)。

1. 部署 DSH Mobile 网关，设置 `REGISTRATION_MODE=open`（开放使用）或 `private`（个人使用，默认）。个人模式还需配置 `ENROLLMENT_TOKEN`。
2. 正常启动 dsh，例如 `pnpm dsh web`，无需设置额外环境变量。
3. 在 dsh 插件管理页面安装本插件的 `.tgz` 文件路径，当前版本为 `artifacts/dsh-mobile-plugin-0.1.49.tgz`。**覆盖升级后必须重启 dsh**，用新启动输出的链接打开页面。仅刷新浏览器或重启网关不会更新 dsh 内存中的 Host 插件。本机构建的源码启动需安装[启动兼容修复](./compatibility/source-start/README.md)以解决工具 Symbol 双实例；当前已安装，可正常使用 `pnpm dsh web`。该修复按固定基线核验，不适用于未经验证的任意版本。
4. 打开 **DSH Mobile 插件包的配置页**，输入 HTTP 或 HTTPS 网关根地址、电脑名称。插件自动检测后端模式：开放模式直接注册，个人模式填写后端 `ENROLLMENT_TOKEN` 对应的注册密钥。注册后开启连接。HTTP 会显示未加密提示，但可直接注册与连接；本机可填 `http://127.0.0.1:8787`。
5. 生成配对链接；0.1.19 同时显示 App 配对链接和本地生成的二维码。使用支持 App 链接的扫码工具，或将普通配对链接粘贴到 DSHM；手机确认领取后，在电脑端核对公钥指纹并批准。链接与二维码使用同一个 key，5 分钟后自动隐藏。可随时关闭连接、拒绝或撤销设备。
6. 安装、移除或启停电脑插件，以及重命名、排序和移除已有工作区注册，需要为该设备另行授予管理权限。已有设备不会自动获得管理权限；授予或收回权限后，客户端需重新连接。工作区管理需要插件 0.1.20、新版网关和 App；移除注册保留电脑目录、文件和聊天记录，不允许手机创建工作区。

电脑凭据保存在 dsh credential provider 的 `dsh-mobile/host` grant 记录中；插件配置和状态接口不返回此凭据。dsh 默认本地 provider 是文件存储，并非系统钥匙串。

注册密钥使用密码输入框，仅随首次注册请求传给本机插件，再用于网关认证。注册成功立即清空，不写入浏览器存储或保存的 Host 记录；注册失败保留输入以便重试。已配置环境变量或本机凭据 `DSH_MOBILE_ENROLLMENT_TOKEN` 时可留空，显式填写的值优先。不要把密钥写入插件 YAML 或聊天。

开放模式隐藏密钥框，不读取也不发送注册密钥。修改服务地址会清空旧输入并重新检测；检测失败可以重试，不会默认为开放。注册时由 Host 重新查询模式，最终校验由后端决定。旧版后端没有模式接口时按个人模式处理；开放模式需同时升级后端。

## 当前边界

- 0.1.51、配套网关/APK及[动态插件兼容补丁](./compatibility/cordis-inspect/README.md)已在本机安装，提供独立连接目录与12个原运行接口。MuMu原清单入口及测试包手动运行、Host调用、停止/移除通过；审批、版本切换和完整异常仍待验收，不能仅安装插件便视为完整可用。

- 开发中的通知数据通道 `remote.taskFollow` 已实现，转发新会话结算及原待办的只读标识，排除取消及历史修复。待办需尚未安装的[Gateway兼容补丁](./compatibility/pending-notifications/README.md)。手机订阅数据层和模式切换时保留页面已安装，原生通知尚未完成；电脑通知插件增量尚未发布安装，见[通知接入状态](../dsh-mobile/docs/integration/notifications-current.md)。

- 前台命令实时输出已接通原工具、Host和手机命令详情，另有[前台兼容增量及安装说明](./compatibility/foreground-output/README.md)。当前0.1.32、配套网关/App及补丁均已安装，本机源码启动和MuMu实际联调通过；完整异常仍未完成，不能仅更新插件或只刷新页面。

- 用户已确认电脑端可交付维护中的 DSH 兼容补丁。[核心补丁](./compatibility/background-output/README.md)包含独立输出读取，已安装到本机编译与源码入口；插件0.1.31、新网关和App提供完整读取通道，MuMu已验证运行中输出、历史与模型后续读取互不消费。源码启动还需上述启动修复；其他版本和安装形态不能直接套用，上游参考检出保持只读。背景见[决策](../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md)。

- 0.1.23 提供 `remote.settingsRead/settingsWrite`：需管理权限，仅投影五个 DeepSeek 非敏感选项，复用原 SettingsProvider/mutate、版本与默认继承；不回传完整配置、秘密或原始错误，通用 settings/credentials 仍关闭。需同步更新网关与手机，完整设置边界见[说明](../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md)。
- 0.1.21 增加 `remote.sessionExport`，只允许指定会话和是否包含子会话，固定调用电脑原日志 ZIP 导出；64 KiB / 四块窗口、256 MiB 上限、Host 并发最多两份。使用已有聊天授权，需同步更新网关与手机，不开放任意 URL 或磁盘路径。

- 0.1.17 增加当前会话计划模式开关，协商提供 `planModeControl`；仅允许原 `/plan` 与 `/plan off`，拒绝附带消息和附件。手机读取电脑目录中的原计划命令及 plan 投影，不把第三方同名命令当作开关，需同步更新网关与 App。

- 0.1.16 增加 `remote.jobStop`：只停止同一会话可访问的既有后台任务，核对启动时间和控制器代次，等待原注册表回传结束状态。手机需要新版网关与 App；此接口不创建进程，也不读取有消费副作用的任务输出。

- Android 已有系统分享、App 链接、粘贴及内置相机/图片识别配对入口，完整 Remote 客户端正在接入；公网服务当前没有 `/pair` 配对落地网页。二维码承载 `dshm://pair` App 链接，外部扫码工具需支持打开此协议；DSHM 图片识别已在 MuMu 验证，相机实际识别仍未验证。二维码不调用外部服务，不会自动领取或批准设备。
- 支持任务列表、历史分页、实时输出、任务控制状态、文本续聊和取消当前轮次。
- 0.1.4 新增 transport 2：经逐接口审阅的原 RPC/流、插件图及插件资源分片。审批回复校验设备与连接归属；插件管理需要独立权限。实际验收范围见[当前接入记录](../dsh-mobile/docs/integration/remote-current.md)。
- 0.1.6 包含有界流式上传及原输入菜单的只读目录；MuMu 已通过真实插件加载、提问、单次写文件审批和文本文件上传。完整附件预览与全部 Remote 功能仍未通过验收。
- 0.1.7 增加原文件 stat/readBytes 读取，逐请求上限 64 KiB，保留 Host 文件权限；新版手机工具/Markdown 链接已接入文本、图片、PDF、HTML 预览及完整下载、分享，实际范围见当前接入记录。
- 0.1.8 新增 `remote.office`：电脑原 Office 服务转换后按 64 KiB 分片发送，PDF 上限 32 MiB、并发 2 个，结束前重验源文件权限/版本及转换服务代次。doc/docx、xls/xlsx、ppt/pptx 已在 MuMu 实测；需同步更新网关，旧 Host 按协商结果提示不可用。
- 0.1.9 新增 `remote.attachment`：先核验原会话引用，再经原附件 provider 读取，使用 64 KiB / 4 块窗口；不把附件 ID 或显示名解释为文件路径。MuMu 已验证历史文本附件的预览、下载及约 2.3 MB 工具图片的全屏；HTML/Office 附件预览和图片语义上传仍待完成，需同步更新网关及手机 App。
- 0.1.10 新增 `remote.prompt`：固定原消息入口接收大图片 JSON，沿用 64 KiB / 4 块上传窗，正文上限 256 MiB、并发 2 个；不开放任意 HTTP/RPC。原 Host 继续验证图片、模型和会话。MuMu 已验证相册 PNG 真实识别、历史预览及 Pro 拒绝图片后保留草稿，替代上一版“图片语义上传待完成”的状态；手机 HTML 附件内嵌内容已支持隔离预览；Office 附件在 0.1.11 接入。
- 0.1.11 新增 `remote.attachmentOffice`：先核验原会话附件引用，再经电脑已有 Office 队列转换；准入后才有界读取原字节，缓存命中也复查引用与服务代次。与电脑文件 Office 预览共用并发和分片限制；下载保留原始附件。需新版网关及 App，实测见[接入记录](../dsh-mobile/docs/integration/remote-current.md#office-原始附件预览2026-09-24)。
- 0.1.12 新增 `remote.changes`：仅以会话、记录序号和文件索引读取原整轮差异，32 MiB JSON、64 KiB/4 块窗口、并发 2 个；重启后的失效提示和真实两文件差异已在 MuMu 验证。需新版网关与 App，不放行任意 HTTP/文件路径。
- 0.1.13 增加当前会话权限选择：仅放行原 `commands/execute` 的 `/permission` 参数，拒绝其他命令、附件、多行和额外字段，保留原业务拒绝；与设备管理授权独立。手机/电脑双向收紧权限已实测，需同步更新网关及 App。
- 0.1.14 增加 Agent 模式目录和当前空白会话选择，仅开放原 `agentPresets/list` 与 `agentPresets/select`，遵守电脑开关及第一轮后锁定规则；不开放预设文件、默认设置或工具配置修改。MuMu 手机选择与电脑选择后手机读取已实测，需同步更新网关及 App。
- 本插件不包含手机 UI；完整附件收发、资源 Range/Worker、推送通知和后台唤醒电脑尚未实现。
- 0.1.15 增加当前会话目标的读取、创建、编辑、暂停、继续、完成及清除。网关/Host 双侧仅允许审阅过的字段，保留电脑版本冲突与状态校验；MuMu 与电脑基本生命周期同步已实测，需新版网关和 App，完整目标异常及其余任务能力仍待验收。
- HTTP/HTTPS 均允许，包括本机、局域网和公网根地址；不再需要 `allowInsecureLocalhost`。HTTP 提示在输入地址时及注册后持续显示，建议使用 HTTPS。
- 首版每个 dsh Host 只保存一个网关注册；迁移网关和凭据轮换需后续运维支持。
- 网关能读取转发内容；HTTPS/TLS 提供传输加密，HTTP 不加密，当前没有端到端加密。

关闭远程连接或卸载插件不会停止 dsh 中正在运行的任务。

## 开发、测试与打包

本插件具有独立的 package.json、锁文件与 node_modules。先在 `../backend` 安装依赖并执行 `npm run build`，生成共享协议；再在本目录执行：

```text
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test
```

本目录创建 `artifacts/` 后执行 `npm run pack:local`，安装包位于 `artifacts/dsh-mobile-plugin-0.1.34.tgz`。共享协议通过本地开发依赖 `file:../backend/packages/protocol` 引用，运行时已打包，不依赖 npm 上的私有协议包。Office 与聊天界面包仅作开发期类型依赖，转换引擎和原评价控件使用电脑原服务，不打入插件或 APK。

跨端联调位于 `../backend/tests/plugin-integration.test.ts`，在后端目录执行 `npm test`。本目录的 `tests/` 覆盖会话适配和浏览器包入口。

`tests/feedback-host.test.ts` 穿过本插件 RemoteAdapter、原 Connection/Gateway、原反馈服务和 JSONL 持久化，覆盖评价写入、另一设备读取、版本冲突、撤回及 Host 重建后冷存档读取。使用固定测试消息，日志只发往测试创建的 loopback 收集端；临时 DSH_HOME、凭据和会话都位于本项目 artifacts 并在结束清理。该测试不代表 Android 页面、真实模型或公网鉴权验收，也不修改正在运行的 DSH 遥测配置。

凭据测试使用发布版 `dsh-credentials-local`，仅在项目临时目录写入无价值哨兵。开发依赖固定 include 1.0.7、loader 1.0.3，以匹配基线 Cordis 4.0.2；不升级上游运行时，也不将测试凭据 provider 打包进产品。正常 `npm ci --ignore-scripts` 即可安装。

入口：[插件知识库](./docs/project-knowledge/catalog.md) · [项目集合目录](../目录.md)。
