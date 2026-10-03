# Windows PowerShell 输出编码兼容补丁

- 状态：固定基线补丁及安装/恢复器已交付，本机 DSH 源码启动入口已安装。实际 Android 发送一次测试请求，电脑原工具记录、手机标准/错误输出及最终结果均正确显示中文，标准输出 emoji 正确；会话仍仅可查看。其他安装形态与控制台组合未由此证明。
- 维护角色：项目协作 Agent；最近核验：2026-09-27。
- 基线：DSH `0.1.6-alpha.2`；pwsh-local 含已安装的[前台输出补丁](../foreground-output/README.md)。[changes.mjs](./changes.mjs)固定三个文件的 SHA256，拒绝未知输入。

## 已核实的原因

[同一调用双端报告](../../../dsh-mobile/artifacts/command-encoding-ui.json)显示，电脑原页面与手机文本完全相同，各含172个替换字符。不是手机特有的渲染损坏。

[实际诊断驱动](../../scripts/diagnose-pwsh-encoding.mjs)加载当前安装的原 Context、Subprocess、SandboxPolicy、LocalSandboxProvider 与 SandboxPwshExecutor，不连接模型、不读用户配置。固定中文样例走真实 Windows 只读沙箱，各执行两次：

| 对照 | 结果 |
| --- | --- |
| [直接启动](../../artifacts/pwsh-encoding-direct.json) | PowerShell7.6.6继承65001，原输出字节是UTF-8，中文正确；原编码初始化仍产生两条受限类型错误 |
| [隐藏窗口启动](../../artifacts/pwsh-encoding-hidden.json) | 同一PowerShell继承936，原字节按GB18030可恢复准确中文，按UTF-8解码损坏；复现实际电脑/手机症状 |
| [命令内运行chcp](../../artifacts/pwsh-encoding-native-codepage.json) | 首次仍936乱码，第二次65001正常；PowerShell在启动时已经缓存编码，执行用户脚本后再改太晚，不能采用 |
| [启动前UTF-8的隔离实验](../../artifacts/pwsh-encoding-prelaunch-utf8.json) | 独立隐藏控制台中先设置65001，跳过受限模式不能执行的初始化，两次中文正确；不修改现有DSH或用户终端 |
| [补丁生成的真实runner](../../artifacts/pwsh-encoding-patched-runner.json) | 两次标准/错误输出正确，无替换字符和初始化错误；read-only及ConstrainedLanguage保持。额外真实文件写入被拒绝，唯一测试文件保持原内容并已清理；非核心类型调用仍被拒绝且中文错误准确 |

原前缀调用 UTF8Encoding 构造器，在 ConstrainedLanguage 下失败。原字节收集器与 Remote 都按UTF-8处理，不能等文字已损坏后在手机猜编码。已有历史事件中的替换字符不能凭本补丁恢复。

## 实现与取舍

- pwsh-local：保留原 FullLanguage 编码前缀；其他语言模式跳过不允许的构造操作。
- 原Windows runner：只识别 `pwsh`/`powershell` 的标准可执行文件名，在创建受限子进程前调用 `SetConsoleOutputCP(65001)`；失败沿原runner失败路径退出，不运行未限制的替代进程。自定义重命名的PowerShell程序尚未覆盖。
- FFI：按现有kernel32绑定方式加入该输出代码页函数，不修改token、ACL、环境授权、stdio、取消或退出码逻辑。
- 这会像原FullLanguage前缀一样设置共享控制台的输出代码页；不会恢复旧代码页，以免在另一个并发任务仍输出时改回。其他非PowerShell子进程共用控制台时的影响仍需检查。相比在手机猜编码或解码错误后补救，源头统一编码能同时覆盖电脑原记录与独立输出；代价是维护电脑兼容补丁与控制台兼容检查。

## 构建与验证入口

在插件目录运行 `node compatibility/pwsh-output-encoding/build.mjs "F:/Program Files/deepseek-harness"`。源码副本和三个编译入口写入 `artifacts/compatibility/pwsh-output-encoding/`，不改上游参考或安装目录；[构建报告](../../artifacts/compatibility/pwsh-output-encoding/build.json)记录两包12个源码文件的严格类型检查。

诊断驱动使用实际安装的tsx与源码身份引导。`DSHM_RUN_LIVE=1`，`DSHM_ENCODING_CASE`选择 `direct`、`hidden`、`native-codepage`、`prelaunch-utf8`、`patched-runner`；后四类需在**独立隐藏控制台**启动，不能用普通现有终端代替。`prelaunch-utf8`还要求 `DSHM_PROBE_PRIVATE_CONSOLE=1`，仅用于隔离根因实验。`patched-runner`通过原provider的runner-entry测试钩子选择实际编译补丁，使用补丁编码前缀及原沙箱执行器；没有替换进程、字节流或权限检查。另已通过 [PowerShell5.1](../../artifacts/pwsh-encoding-patched-runner-win51.json) 真实只读沙箱及 [FullLanguage普通执行器](../../artifacts/pwsh-encoding-patched-local.json) 各两次输出检查。

最初驱动先后修正了Windows import URL、包级依赖解析和缺失sessionProjections初始化；补丁构建曾因生成字符串引号失败，修正后严格编译通过。这些准备失败不计为产品验证。

## 安装、恢复与正式入口验收

[安装器](./install.mjs)核验23项输入和12项源码/编译/声明文件，拒绝未知版本、内容变更或目录链接；保留原件、串行加锁、逐文件重检，写入失败回滚已写文件。[五项安装测试](./install.test.mjs)覆盖重复安装/恢复、逐字节恢复、途中失败回滚、未知输入、链接目录及只读参考检出。

首次打包仅针对未安装本编码补丁的固定基线：先执行上述 build，再执行 `node compatibility/pwsh-output-encoding/package.mjs "F:/Program Files/deepseek-harness"`。已安装后不重新构建或覆盖原件包，使用原 manifest 与 before/after 内容。

在插件目录执行：

```powershell
node compatibility/pwsh-output-encoding/install.mjs plan "F:/Program Files/deepseek-harness"
# 核实目标 DSH 已停止后才使用 --stopped。
node compatibility/pwsh-output-encoding/install.mjs apply "F:/Program Files/deepseek-harness" --stopped
# 如需恢复，先停止 DSH，再执行：
node compatibility/pwsh-output-encoding/install.mjs restore "F:/Program Files/deepseek-harness" --stopped
node --test compatibility/pwsh-output-encoding/install.test.mjs
```

本机14:03 UTC安装12项后已重启DSH；14:09 UTC [手机报告](../../../dsh-mobile/artifacts/command-encoding-live-observe.json)和[电脑报告](../../../dsh-mobile/artifacts/command-encoding-live-desktop.json)通过。测试由[实际手机驱动](../../../dsh-mobile/scripts/verify-command-encoding-live.mjs)仅发送一次模型请求，调用一次pwsh，固定中文标准/错误输出均无替换字符和初始化错误；错误退出码1是 Write-Error 样例的预期结果。手机原卡片、独立stdout/stderr和最终结果、电脑同一callId均核验，实际截图已查看。无文件/网络操作；原空草稿、只读权限和日常聊天授权保留，管理权限false。

未覆盖自定义重命名PowerShell、所有共享/无控制台组合和并发取消；已有历史损坏文字无法恢复。完整Remote及网站转发的待确认范围不因本补丁而改变。
