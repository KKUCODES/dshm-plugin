# 当前纯插件组合的兼容验收结论

未发布的 `0.2.1-rc.2` 修复分支与类型/运行验证边界见[新版兼容专题](./dsh-rc21-compatibility.md)。下文保留已发布组合的完整功能验收，不自动沿用到rc.2。

当前 `0.1.84-latest.0` 已增加官方 `0.2.0-rc.2`，同时保留 `0.2.1-alpha.2`；共同安装包、真实模型/审批/重连和手机配套要求见[市场基线双版本验证](./market-baseline.md)。下方完整扩展矩阵仍对应原 `0.1.80` 的 alpha.2 组合，不将这次核心回归扩大为所有扩展重验。

- 状态：下列固定组合的本地兼容验收完成；这是未发布的本地候选。
- 维护角色：DSHM 插件与手机端维护者；核验日期：2026-10-10。
- 来源：[功能矩阵](./official-feature-matrix.md)、[实际归档安装](../../artifacts/official-plugin-only/archive-install-61435351-e4be-4e0f-9e2e-b62ee2517789.json)、[最终恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn77-restoration-audit.json)。

电脑使用未修改的官方 DSH，手机加载 DSHM 自己的页面，经本项目中转实现共同参与同一会话。已有工作区与会话、工作区内新建、消息与执行结果、模型切换、审批、断线恢复均通过真实 Android 验收；不需要 DSH 本体补丁、专用启动注入或 SDK 重打包。

后续地址修改候选 `0.1.81-latest.0` 的版本、归档与独立专项见[修改中转地址](./gateway-settings.md)。下方完整手机能力的证据仍对应原 `0.1.80-latest.0` 固定组合，不把一次设置页修改视为全量重验。

## 固定版本与安装

| 组成 | 本次核验的版本或环境 |
| --- | --- |
| 官方 DSH | `0.2.1-alpha.2`，官方预发布；正常 `pnpm dsh web`。只读源码固定 `d743267388641bc76f17c45ce8b4c231aed1d32c`。 |
| 独立插件 | `0.1.80-latest.0`，实际 `.tgz` 安装；234144 字节，SHA256 `781f92efff24ef4343f388e89615cd96ad3f5032d4510a01d6f5c91f6a382ed7`。 |
| DSHM App | 当前 Android APK，13360612 字节，SHA256 `41a15686de80c4c431f3b50e551d40a4de3345d1ae0afe399a1a0135ec85e773`；MuMu 中的独立验收 UID。 |
| 中转 | 复用生产网关、存储、配对、DPoP、票据与 WebSocket 实现，本地实际运行；不是公网网络性能测试。 |

[安装说明](./official-installation.md)包含四部分准备、正常安装命令、注册模式及配对步骤。实际归档已装入官方 profile 的 `node_modules`，63 个文件与包逐项一致，正常重启加载并保持原配置。[安装后源码审查](../../artifacts/official-plugin-only/delivery-audit-1f1bd91c-9c5c-4e70-a956-f4d5b3f961e0.json)进一步核对 51 个插件源码项、16 个协议项和 28 个依赖项；[接口审查](../../artifacts/official-plugin-only/interface-audit-59a2f5a1-ced2-44e5-9c4a-d04cf8607f49.json)将当前 62 调用、7 条订阅全部对应到官方契约。

## 功能与实际入口

下表对应 R01–R16 的主要用户入口，证据均来自官方 alpha.2。通过结论限于列出的实际行为，不将历史补丁或别的版本的结果沿用到本组合，也不推定所有工具、提供方、插件和生命周期组合都已验证。

| 功能 | 已实际验证 | 证据 |
| --- | --- | --- |
| R01 配对与授权 | 链接进入 App、待批准隔离、批准及撤销；真实选图识别、无效二维码拒绝、取消保留输入、五分钟自然过期拒绝、新链接只生成一个待批准设备 | [当前整轮](../../../backend/artifacts/official-plugin-only/official-android-2ea87817-42c7-4a2e-b1ac-a72062be41ca.json) |
| R02 电脑连接 | 停用/恢复、实际 Host 或 App 退出后的重连、原会话/历史/草稿保留；中断任务和旧审批不自动重放 | [Host 恢复](../../../backend/artifacts/official-plugin-only/official-android-3e1be7c6-ce40-4256-ad1f-8a82258e8a17.json)及[消息生命周期](./official-alpha2.md#普通消息发送中的电脑退出与恢复2026-10-10) |
| R03 会话导航 | 工作区与已有会话、标题/开启后的内容搜索、分支、归档/恢复、父子独立草稿 | [导航](../../../backend/artifacts/official-plugin-only/official-android-8df39da6-4e08-4ddd-bbe5-e0486e35e111.json) |
| R04 新建与续聊 | 已有工作区内新建、真实远程发送与继续聊天，手机和电脑记录一致 | [当前整轮](../../../backend/artifacts/official-plugin-only/official-android-2ea87817-42c7-4a2e-b1ac-a72062be41ca.json) |
| R05 消息与结果 | 真实模型/工具结果、长历史分页与会话隔离、外部任务实际最终正文、日志导出 | [历史](./official-alpha2.md#长聊天分页与重连2026-10-10)、[外部结果](./official-alpha2.md#充值后的同apk核心与外部任务整轮复验2026-10-10) |
| R06 停止与队列 | 排队、编辑/移除、引导、手机停止及真实终态；PTC 内层命令停止 | [队列](../../../backend/artifacts/official-plugin-only/official-android-89ba278c-6b65-4441-8cfc-6988638d79d0.json)、[PTC](./official-alpha2.md#ptc程序结果与手机停止2026-10-10) |
| R07 审批与提问 | write 允许一次/拒绝与实际文件核对、提问答案、计划批准/要求修改；原权限边界保持 | [当前审批](../../../backend/artifacts/official-plugin-only/official-android-2ea87817-42c7-4a2e-b1ac-a72062be41ca.json)、[提问](../../../backend/artifacts/official-plugin-only/official-android-7568d6bc-f9e1-45aa-a2c7-7b9aab6d7f1c.json)、[计划](../../../backend/artifacts/official-plugin-only/official-android-26bfce61-7fbd-46da-aef1-3602130a99bb.json) |
| R08 模型与会话选项 | 当前模型实时显示、手机切换影响电脑实际回复；预设、权限、计划、技能与 PTC 的相应入口 | [模型目录](./official-alpha2.md#deepseek-模型清单实时选模目录与恢复默认)、[预设](./official-alpha2.md#预设公开入口复验2026-10-10)、[技能](./official-alpha2.md#手机技能目录说明与实际调用2026-10-10) |
| R09 目标与后台工作 | 目标控制/真实自动续轮、一层可继续子会话、双成员工作流、定时目录/创建/单次实际触发、后台结果/停止/明确读取 | [目标](./official-alpha2.md#手机目标控制与真实自动续轮)、[工作流](./official-alpha2.md#真实工作流与成员会话导航)、[定时](./official-alpha2.md#定时任务的新版接入差异)、[后台](./official-alpha2.md#后台任务停止大输出与断线读取2026-10-10) |
| R10 附件与引用 | 实际 TXT/PDF/DOCX 上传、历史原件与预览；`@` 和附件菜单引用文件/聊天，官方快照/读取与草稿重连保持 | [附件](../../../backend/artifacts/official-plugin-only/official-android-663dd170-9dcc-43d6-aa8c-e5c23a56a2ad.json)、[引用](./official-alpha2.md#文件与聊天引用的实际入口2026-10-10) |
| R11 文件预览 | 文本/Markdown/图片/隔离 HTML/PDF、六种 Office 格式；审批前计划预览和完成后的实际差异 | [文件](../../../backend/artifacts/official-plugin-only/official-android-63a44338-e1aa-43bf-bf44-c55c24cf1adc.json)、[Office](../../../backend/artifacts/official-plugin-only/official-android-1dba214a-4deb-4ed8-add7-2acf5e17adc6.json)、[差异](./official-alpha2.md#计划修改与实际整轮差异2026-10-10) |
| R12 命令详情 | 已完成 stdout/stderr 正文、后台双流与大输出读取；手机查看实际结果 | [命令结果](../../../backend/artifacts/official-plugin-only/official-android-7568d6bc-f9e1-45aa-a2c7-7b9aab6d7f1c.json)、[后台](./official-alpha2.md#后台任务停止大输出与断线读取2026-10-10) |
| R13 插件与局部界面 | 普通测试插件安装/启用/升级/卸载、实际局部按钮/弹窗/菜单、外层缩放、作者声明与用户覆盖；无需内嵌电脑整页 | [升级](./official-alpha2.md#普通插件升级与正常重启2026-10-10)、[自适应](./official-alpha2.md#插件作者自适应声明与用户选择2026-10-10) |
| R14 设置与反馈 | 五项电脑设置读取/写入/继承恢复；Key 状态/原生取消；模型/提供方/地址的指定管理入口；评价和日志出口 | [设置](../../../backend/artifacts/official-plugin-only/official-android-c0933adb-927d-4be6-9791-82c29b83417b.json)、[凭据边界](./official-alpha2.md#电脑-key-状态原生取消与服务地址确认)、[反馈](./official-alpha2.md#消息与会话反馈及本机日志出口2026-10-10) |
| R15 已有工作区管理 | 改名、排序、确认后移除注册；原文件、会话与其他工作区保持，收回管理权限后聊天继续 | [工作区](../../../backend/artifacts/official-plugin-only/official-android-28229b5a-685c-4664-a7cf-04c18ed31694.json) |
| R16 打开/保存/分享 | 默认电脑打开与 Explorer 定位；完整原件系统保存、明确重试与清理；TXT 实际只读分享接收 | [原生打开](./official-alpha2.md#交付卡片与电脑原生打开2026-10-10)、[分享](./official-alpha2.md#完整文件分享的实际接收2026-10-10) |

## 保留的限制

- 手机不创建新的电脑工作区，不输入命令，不转发电脑 localhost 网站；这是已确认的首版范围。
- 缺少官方公开接口的预设归档复制/删除、指定应用与图标、汇总待审批/提问通知、未保存地址强制模型探测、精确前台运行中字节输出和旧动态运行器不提供。[缺口及上游接口需求](./official-delivery-audit.md#已取消能力与上游缺口)保留，不能通过修改 DSH 来补齐；核心目标没有取消。
- 相机实际打开、授权和取消已验；二维码图片真实解码已验。MuMu 没有证明物理相机拍摄识别。电脑插件页目前生成配对链接，不声明已有电脑二维码展示按钮。
- 内容搜索需要电脑开启相应功能；任务仍依赖电脑和 DSH 运行。App 进程结束后不继续推送，重开尝试重连；电脑退出后的中断任务不保证续跑或缓存持久化。
- 本结论不覆盖任意第三方插件、任意模型提供方、所有竞态/回收策略或所有文件格式。具体专项限制保留在[完整矩阵](./official-feature-matrix.md)和[原始记录](./official-alpha2.md)；不把一次入口成功扩大为所有组合。
- 官方 Electron 安装包、物理手机、iPhone 和公网网络性能未据此通过。当前完成的是用户要求优先验证的官方 Web＋Android 本地链路，没有公网部署或正式发布。

## 最终核对

实际 `.tgz` 安装后的[手机整轮](../../../backend/artifacts/official-plugin-only/official-android-2ea87817-42c7-4a2e-b1ac-a72062be41ca.outcome.json)退出 0，357.12 秒、14 个真实 Android 阶段，配对与核心均通过，无页面/隔离渲染/未捕获异常。五分钟等待没有改数据库时间；识别和取消不领取、不授权，新链接需显式继续并由电脑批准。

[最终恢复审计](../../../dsh-mobile/artifacts/official-plugin-only/turn77-restoration-audit.json)核对 86 个成功专项、1185 个实际阶段及安装/运行的同一 Host；原 App 路径/摘要/PID4249/正常前台、Key 配置、绑定和历史保持，测试授权/文件/独立 UID/网关/映射清理。两版官方原文件及只读源码未变，本轮没有产品构建或 App 重装。失败报告原样保留，不计成功。
