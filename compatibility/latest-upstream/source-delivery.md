# 新版源码补丁的独立候选包

- 状态：新14组38文件独立候选的9项安装边界、实际安装/完整构建/Remote/精确恢复及84文件ZIP解包核对均通过。旧37文件记录保持历史范围；完整新版支持声明尚未发布。
- 维护角色：DSH Mobile 项目协作 Agent；核验日期：2026-10-09。
- 固定目标：DSH `0.2.1-alpha.1`，commit `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。
- 来源：[独立安装器](./source-delivery.mjs)、[构建脚本](../../scripts/build-latest-source-delivery.mjs)、[实际验证入口](../../scripts/verify-latest-source-remote.mjs)、[打包与解包检查](../../scripts/pack-latest-source-delivery.mjs)、[安装边界测试](../../tests/latest-source-delivery.test.mjs)。

## 解决的问题与适用范围

原开发安装器读取 `artifacts/latest-source-patches`，启动安装器又依赖开发目录中的启动载荷，不能只把一条命令复制到新电脑上使用。

独立候选 ZIP 包包含固定 14组／38文件的原始与修改副本、两个启动载荷、安装器、说明与许可证。变换定义与开发安装器共享；TypeScript 变换器及 Windows 包运行器的原 TS 文本已经随安装器打包，不需要 DSHM 开发依赖或调研目录。安装与启动修改组成一个事务，支持幂等应用、已知半安装状态修复和精确恢复；目标源码／启动文件的未知修改、载荷篡改、不同 commit／包版本及越界链接在写入前拒绝。其他文件保持，不承诺任意定制检出的整体兼容。并发外部修改保留，已写入的自有修改回滚。

目前只适用于固定 Git commit 的源码安装，要求 Node 24 和 Git；不能覆盖官方 Electron／SDK 可执行文件。它也不包含 DSHM 插件、手机 APK、网关或 DSH 依赖。安装后需使用官方命令安装依赖、完整构建，随后仍以 `pnpm dsh web` 启动。具体步骤见 ZIP 内 [README](../../artifacts/latest-source-delivery/pack-D0WeoL/dshm-source-compat/README.md)。

## 当前产物与逐项证据

2026-10-09新增[Windows文件版本监听修正](./file-version-watch.md)，当前载荷为14组38文件。新候选[`candidate-cW4Zao`](../../artifacts/latest-source-delivery/candidate-cW4Zao/build-report.json)含78原始/修改/启动载荷，manifest摘要`c2ef8781f796c0b083e9206cfd6642f54356e7e4cebf54ec368bb77a5e6aaa0b`，独立安装器摘要`65c69c841f844b46e2167f0dbb1b183fd96592d3a30e795aac62509fed9f586e`。[搬移后的9项安装边界](../../artifacts/latest-source-delivery/candidate-cW4Zao/install-boundaries-final.log)通过；[实际运行事务](../../artifacts/latest-runtime-check/latest-source-delivery-run-5dec3071-b95e-49cf-b089-dd9557876880.json)退出0：安装/恢复各41写入，修改后完整构建331.083秒、47项实际源码回归、Remote75.437秒、原完整恢复构建330.057秒，355资源原摘要精确保持。新[独立ZIP](../../artifacts/latest-source-delivery/pack-D0WeoL/dshm-source-compat-0.2.1-alpha.1-candidate.zip)为2,583,607字节，SHA-256 `335343c3e66af7c65103938f064dc4c9c5af820a3e39d7c22c9bf9e2944b7bdc`；[打包报告](../../artifacts/latest-source-delivery/pack-D0WeoL/report.json)证明84文件逐项解包相同、搬移后的CLI预检为original/38文件。以下旧37文件ZIP和成功记录保留历史范围。

原App23468/Host29132、APK/绑定/1837主历史摘要及management=false在[只读恢复核对](../../artifacts/latest-runtime-check/latest-source-office-metadata-33ccf7e8-8f1a-4021-a833-26aeca1777e6-original-29fea2ab-da44-43af-94f7-d9f3fc8d201f.json)中保持；[全部26会话3799事件](../../artifacts/latest-runtime-check/latest-live-child-retention-standalone-watch-restored-20261009-before.json)与前轮identity逐项相同，没有新消息或配对替换。旧版218项/类型、两项补丁链及新版候选严格消费类型于本日再次通过。本专项不操作Android或请求真实模型；新SDK/Electron完整载体继续复验。

2026-10-08 SDK模块身份问题另生成独立 `candidate-US0rUu`，清单摘要 `9f0edf9a14486f0cc379533b7510740ceda77eae1770c0e273770e02e06db662`。该新候选的9项实际安装/恢复边界通过；其新增SDK变换的完整运行验证进行中，不能套用下述旧ZIP或已通过源码Android组合的结论。故障与第十轮边界见[SDK专项](./sdk-native.md#配置重载失败与模块身份修正2026-10-08)，下述旧ZIP与报告原样保留。

候选：[独立 ZIP](../../artifacts/latest-source-delivery/pack-OnR1PU/dshm-source-compat-0.2.1-alpha.1-candidate.zip)，2,571,957 字节。SHA-256：`4db26a3f0518d317c026bb836e779185c31049f4debe50b4a679a4ef91931b62`。

| 验收项目 | 本轮证据 |
| --- | --- |
| 搬移到新目录、清空 Node 路径环境后，通过实际 CLI 安装与回滚 | [9 项边界测试](../../artifacts/latest-source-delivery/candidate-xcOnG3/install-boundaries-final.log)：LF／CRLF、40 文件实际写入／恢复、重复操作零写、部分状态补齐 |
| 未知源码／启动命令／启动载荷、用户修改、版本／commit、链接及篡改拒绝 | 同一 9 项边界测试；未知修改在首次写入前拒绝 |
| 真实并发修改的回滚 | 文件观察器确认首个源码已替换后，真实改动最后一个源码；安装器拒绝并回滚先前写入，外部修改保留 |
| 原开发安装与恢复行为保持 | 原背景／源码／启动安装器 14 项通过；共享固定变换、文件原子写入与启动契约，未改原运行语义 |
| 当前候选通过独立 CLI 安装到完整隔离检出 | [整轮报告](../../artifacts/latest-runtime-check/latest-source-delivery-run-75597293-039a-4ece-8940-242921e2e99f.json)：`--source-delivery`，37 源码＋启动命令＋两个载荷共 40 写入，幂等通过 |
| 官方完整构建与原源码函数 | 同一整轮报告：修改后构建 360.155 秒；[46 项原源码回归](../../artifacts/latest-runtime-check/latest-source-delivery-run-75597293-039a-4ece-8940-242921e2e99f-source-units.log)通过 |
| 实际 `pnpm dsh web`、生产网关和完整插件候选 | [本轮独立 Remote 报告](../../artifacts/latest-runtime-check/latest-source-delivery-75597293-039a-4ece-8940-242921e2e99f-test.json)：72.766 秒，消费实际核验的 62 文件插件安装包，真实配对、权限、会话／模型／设置／预设和撤销路径 |
| 原源码、启动值、完整原构建与客户端资源恢复 | 整轮报告：独立 CLI 恢复 40 项；原构建 338.491 秒、Git 干净；355 资源摘要恢复为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` |
| 自有 Host 清理 | [清理回执](../../artifacts/latest-runtime-check/latest-source-delivery-75597293-039a-4ece-8940-242921e2e99f-cleanup.json)：两个 Host 45676／62176 退出；独立系统进程检查亦不存在 |
| ZIP 与解包后的独立预检 | [打包报告](../../artifacts/latest-source-delivery/pack-OnR1PU/report.json)：82 文件逐项核对；解包到新目录后原 CLI 预检为 original／37 文件 |
| 旧版回归与类型 | 插件完整 Vitest：41 文件／218 项通过；插件与后端类型检查退出 0；编码边界 6 项通过 |

本轮完整检出验证仍在项目内的隔离源码进行；不是另一台电脑安装或任意源码发行包验证。边界测试使用真实基线文件与 Git HEAD 的安装夹具，不冒充完整 DSH 运行。Remote 专项没有真实 Key、模型推理或 Android 操作，不能把前述协议结果写成新的手机真实模型验收；此前 [Electron／原 Android 实测](./electron-runtime.md)保持其独立范围。

原 Android App 进程 3250、RemoteActivity 前台和 16901 反向连接在专项结束后实际核对保持；原发布 Host 73900 在线。本轮没有安装、清除或重新配对手机 App。

## 原失败与维护限制

三个前期候选保留原字节。先后定位了打包的 TypeScript 缺少 ESM 中的 `require`、`__filename`／`__dirname`，以及 Auto review 变换间接导入开发脚本导致 CLI 执行准备流程。修正为共用无 CLI 副作用的文件工具并提供 Node 内置 CJS 兼容绑定。原 [失败日志](../../artifacts/latest-source-delivery/candidate-EixpCK/install-boundaries.log)及 [8 项修正后日志](../../artifacts/latest-source-delivery/candidate-xcOnG3/install-boundaries.log)保留，最终 9 项与原完整构建／协议验收独立记录。

临时安装夹具目录占用约 1.5 GiB。变量路径和已核对的绝对路径清理命令均被自动审批以 `blocked by policy` 拒绝，未执行删除、未改用其他工具绕过。失败候选、日志、当前产物和测试目录均保留；进行其他大型构建前需先解决空间。此限制不影响本轮已完成的源码／构建恢复，但不是已完成清理的声明。

## 仍未关闭的总验收

本专项补齐独立源码候选交付路径，没有替代 KKC-24 其余有效标准：剩余工具／审核故障与后台策略、更多文件并发／引用变化／提供方／网络时序、其余完整模型／管理入口、IntelliJ 原项目信任后的实际打开等仍需逐项证据。文件符号链接负例仍受本机令牌限制未实测；不改变系统安全设置。不得仅凭本包或已有 Electron／SDK 局部结果宣布完整新版兼容。
