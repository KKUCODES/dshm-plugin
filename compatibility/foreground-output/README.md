# 前台命令输出兼容补丁

- 状态：八文件源码增量、五包十一文件编译增量、插件0.1.32及配套网关/App已安装；实际源码启动DSH与MuMu已验证运行中读取、最终非零退出结果、重入和真实短输出ANSI红色。跨页及128K裁剪颜色已在新版MuMu通过；完整异常仍待验收。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-09-25。
- 基线：DSH `0.1.6-alpha.2` / `ddefc45fbc7f8e46dd73185e68295696d1297887`；组合已验证的 [background-output-v1](../background-output/README.md)，不改写该版本的安装产物。
- 授权及交付边界：[电脑端兼容补丁决策](../../../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md)。

## 接口选择

原 `tool-pwsh/tool-bash` 的前台分支等待 `shell.run()` 返回最终结果，没有在执行过程中发布输出。将其改为后台任务会改变超时和任务语义；`terminal/follow` 又包含交互控制，不适合手机的只读详情。因此先给原 `run()` 补充可选的 `observeOutput` 回调，在准确的原进程句柄建立后发布独立字节读者。

[八文件变更](./changes.mjs)扩展 Shell 请求/规格/导出、Bash/Pwsh executor，以及两个原工具及其依赖声明：

- 只发布冻结的 stdout/stderr 独立读取包装，不暴露原 collector 对象、stdin、终止进程或控制方法。原输出字节预算、64 KiB 单片上限、spill 和缺口语义来自前置补丁。
- 保留原 argv、环境、sandbox 准备、前台 deadline、取消、等待 `done` 和最终结果。观察器同步抛错、异步拒绝或不结束，均不改变原命令生命周期；后台 `start()` 不触发此回调。
- 原工具在批准并建立进程后，使用原 `ToolExecution` 和 `scopeTarget` 发布只读事件；依赖原会话隔离模块，不内联第二份 scope/Cordis。旧 provider 不回退为消费读取，内部读者不直接序列化给手机。
- 不修改 DSH 的 `NO_COLOR=1` 默认值。隔离测试证明已有 ANSI 字节可保留，不代表具体命令会生成颜色，也不替代真实 PowerShell → 手机颜色验收。

## 生成与验证

在插件目录执行：

```text
node compatibility/foreground-output/build-test-runtime.mjs
node compatibility/foreground-output/typecheck.mjs
node --test compatibility/foreground-output/core.test.mjs
node compatibility/foreground-output/build-runtime.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/foreground-output/install-source.test.mjs compatibility/foreground-output/install-runtime.test.mjs
```

构建器验证原基线和前置补丁，将副本、hash 清单、增量 patch、隔离运行包输出到插件的 `artifacts/compatibility/foreground-output/`；执行正向及反向 `git apply --check`。没有修改安装目录或上游参考的命令。增量 patch 的原文是已应用后台补丁的源码，不能直接用于干净上游。

14 项隔离测试和严格类型检查通过。覆盖 Bash/Pwsh 及两种 sandbox 派生执行器的运行中读取、中文/emoji/ANSI 跨字节分片、原结果不变、只读包装、观察器故障、前台超时/取消、准备超时无进程、旧 provider、后台隔离和 provider 启动/运行拒绝。进程和 sandbox provider 是明确的测试替身；不是原生 Bash、PowerShell 或操作系统沙箱验收。首次类型检查因脚本将 Windows 根文件名小写导致重复路径失败，恢复实际路径后通过，没有因此放松类型约束。

## Host 与手机接入

[CommandOutput](../../src/command-output.ts)围绕真实工具执行记录 session/rootCall/call、原调用时间、执行 token 和代次。仅接受同一存活 Agent 的输出；最多保留128条、结束后30分钟回收，会话/Agent/服务销毁即失效。固定 `remote.commandOutput` 复用既有设备鉴权和64 KiB字节读取，磁盘补读后重验身份，与后台读取共用4请求并发上限。不接受任意路径、命令、PID或stdin。

手机 [RemoteCommand](../../../dsh-mobile/src/ui/RemoteCommand.jsx)在原命令窗口提供实时输出/执行结果，stdout/stderr与从头补读复用已有有界输出组件；连接代次、调用记录变化和关闭会话会取消并丢弃旧响应。原最终结果保留，未提供能力的电脑仍显示原结果。窗口重建已交接视图、流、模式、全屏和含outputId/解码器的检查点，通过正式组件回放；MuMu真实中继重启后从65536字节续读至100058字节、全文一致。核心模块文件时间戳变化及恢复触发的两次真实客户端重建已在MuMu通过，输出续读、草稿及280像素滚动位置保持，文件内容未改。

本批插件89项、手机223项、后端定向7项自动检查通过；其中[原工具到Host](../../tests/command-output.test.ts)使用真实 ToolsRuntime/Agent/Session 和两个原工具，只有进程 provider 是替身。[HTTP/WS生命周期](../../../backend/tests/remote-output-lifecycle.test.ts)使用真实网络、票据与撤销流程，数据库为PGlite；不是现场设备撤销。Web构建、插件/协议构建与类型检查、Android assembleDebug/lintDebug通过；新版APK已覆盖安装，日常绑定保持。

## 安装与恢复

[源码安装器](./install-source.mjs)要求已有后台源码补丁，验证8个原文/组合文、scope基线及包版本。当前安装缺少两个工具的scope依赖，安装器只在该安装内部建立明确的工作区链接；`.dshm-foreground/source-links.json`记录本次新增的链接，恢复保留原有正确链接。未知源码、版本、编码、悬空/错误链接或越界父目录均拒绝。源码不包含秘密，不修改用户配置。

[编译安装器](./install-runtime.mjs)验证11文件的前置hash及产物hash，保留原导出面；未升级的后台文件仍须匹配。先安装源码和依赖，再安装编译增量。恢复次序相反，恢复到background-output-v1；之后才能使用旧后台恢复器。两个安装器均为逐文件校验、失败逆序恢复，不是跨两个命令的事务，运行期间必须保持DSH停止。

在插件目录执行只读预检：

```text
node compatibility/foreground-output/install-source.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/foreground-output/install-runtime.mjs plan "F:/Program Files/deepseek-harness"
```

停止DSH后，依次将上述 `plan` 改为 `apply`；恢复时先编译后源码，改为 `restore`。需同步更新含新协议的网关、插件和手机。当前F盘安装已apply并经plan确认8/11文件全部patched、两个scope依赖链接齐全；实际安装目录的restore尚未执行。首次停止脚本未匹配带引号的启动参数，后续安装却继续；随后已停止旧DSH、完整核验并重新启动。今后串行安装必须检查前一步退出码，停止失败立即退出。

7项安装副本测试通过：LF/CRLF逐字节恢复、重复操作零写入、前置缺失/未知修改拒绝、链接归属保留、只读参考拒绝、源码/编译配套安装和恢复。首次恢复比较遇到undefined参数，修正Buffer比较后全通过。测试和构建全部在本插件artifacts内，未修改只读上游。

## 实际验收与剩余边界

2026-09-25本机源码启动入口、原模型pwsh工具、Windows进程及MuMu正式App通过[真实脚本](../../../dsh-mobile/scripts/verify-foreground-output-android.mjs)：命令等待35秒期间已显示BEGIN/中文且状态执行中；标准/错误输出切换、完成后END、历史回读、复制反馈、原执行结果退出码7、全屏无横向溢出及关闭后重入通过。报告为手机artifacts/foreground-command-run-android.json，页面错误为空；cleanup报告确认测试聊天归档并返回原聊天。设备权限、Key、服务地址及遥测未改。

最初Write-Output颜色探针为null，原因已由[实际执行器对照](./verify-native-ansi.mjs)确认：本机PowerShell7.6.6在默认环境下通过管道输出该样例时，收集器收到的字节已经没有ESC；同一执行器改用 `[Console]::Write` 明确生成ANSI时，原始22字节及原结果完全保留。两次独立实测一致，没有修改NO_COLOR或用户配置。手机脚本 `run --ansi` 随后在真实Loader/模型工具/MuMu入口得到 `rgb(236, 19, 19)`，运行中截图为红色；历史、最终退出7、全屏、重入及清理均通过。手机报告为`foreground-ansi-run-android.json`及`foreground-ansi-cleanup-android.json`。这证明短输出颜色端到端可用；后续新版MuMu的150,799字节样例已验证跨64KiB历史页及128K显示裁剪后保留颜色（见手机remote-current.md），不泛化为完整终端仿真。

前台窗口恢复代码及225项手机测试/正式组件回放通过，真实中继重启续读通过；后续核心模块变化触发的完整RemoteModel重建和滚动位置已真实通过；核心重建途中真实断网恢复已在新版MuMu通过；两版交错加载最新版本已通过，在途撤销及完整异常仍待实测。本机之外的Bash、系统sandbox、其他版本和安装形态均不能由隔离测试推定通过。

完整状态见[手机 Remote 验收记录](../../../dsh-mobile/docs/integration/remote-current.md)和 [KKC-19](https://linear.app/kkcodes/issue/KKC-19)。
