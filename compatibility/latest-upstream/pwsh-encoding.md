# 新版 PowerShell 输出编码

- 状态：固定新版三个文件的迁移已实现；附着/无控制台 Node 与 Electron 的原执行器 12 组合，以及完整 Electron/原 Android 实时命令和历史重入通过。当前完整载荷为 13 组/37 文件，原源码/完整构建/355 资源精确恢复并独立归档；完整新版交付仍待验。下方十二项/30 文件段落保留当时证据。
- 维护角色：DSH Mobile 项目协作 Agent；核验日期：2026-10-08。
- 固定目标：DSH `0.2.1-alpha.1`，源码 commit `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。
- 来源：[原 pwsh-local](../../artifacts/latest-source-check/packages/shell/pwsh-local/src/index.ts)、[原 ACL runner](../../artifacts/latest-source-check/packages/sandbox/sandbox-windows-acl/src/runner.ts)、[实际执行验证器](../../scripts/verify-latest-pwsh-encoding.mjs)、[旧版已交付方案](../pwsh-output-encoding/README.md)。

## 原版复现与方案比较

最新无控制台边界见 [Electron 修正与实际手机命令](./electron-runtime.md#无控制台修正与实际边界)：只跳过设置代码页会让 Electron 只读输出继续损坏，因此候选仅为没有控制台且错误为 6 的原沙箱执行器创建自己拥有的隐藏控制台，恢复原标准句柄后设 65001，并在退出时释放。其他错误仍拒绝执行；原沙箱、命令参数和双流保持。旧候选及 SDK9 清单不被重写。

新版虽然增加了无 BOM UTF-8 前缀，但前缀在 `ConstrainedLanguage` 中尝试创建 `System.Text.UTF8Encoding`，产生额外初始化错误。PowerShell 7 和 5.1 的普通执行均通过；两者的原 Windows 只读沙箱均复现错误。原结果与独立观察结果相同，因此不是手机输出旁路制造的错误。

| 实际对照 | 普通执行 | 原只读沙箱 | 结论 |
| --- | --- | --- | --- |
| 原前缀、继承 UTF-8 控制台 | 7 / 5.1 通过 | 中文可读，但均有初始化错误 | 只检查中文包含关系会漏报 |
| 仅在 FullLanguage 初始化、继承 UTF-8 控制台 | 7 / 5.1 通过 | 均通过 | 不能据此覆盖中文系统代码页 |
| 原前缀、每次启动前独立控制台恢复 936 | 7 / 5.1 通过 | 中文/emoji 损坏且有初始化错误 | 官方处理不能完全替代旧补丁 |
| 仅在 FullLanguage 初始化、每次启动前恢复 936 | 7 / 5.1 通过 | 初始化错误消失，中文/emoji 仍损坏 | 只改前缀的成本较低，但功能不完整 |
| FullLanguage 初始化保护 + 子进程启动前设置 65001 | 7 / 5.1 通过 | 均通过，写入和类型调用仍拒绝 | 继续迁移两部分，保留原 token、ACL、语言和取消契约 |

表格最后一项是前期对照，仅在验证器自身的独占控制台里设置代码页，不是当时已安装的新版 runner。当前固定迁移及真实发布包证据见下一节；不能直接运行旧版安装器。

## 当前载荷与验收状态

[编码变换](./pwsh-encoding-changes.mjs)处理新版 FFI、runner 和 pwsh-local 三个固定原文件。pwsh-local 与[前台观察源码](./source-foreground.mjs)共用一个载荷，避免后装补丁覆盖另一部分。[完整源码清单](./source-changes.mjs)因此为十二项/30文件。原输入哈希、相邻版本、未知修改、路径链接、整体预检及逐字节安装/恢复的六项测试通过。

发布包使用[原生载荷预检](./pwsh-encoding.mjs)与[前台观察组合](./foreground-observer.mjs)：七个原运行文件整体预检、原子替换及失败回滚，未知哈希拒绝；连续执行的载荷一致。实际安装到隔离npm副本后，`installed`模式直接使用修改后的原执行器和runner，不替换argv，不在测试进程预设65001。每次原执行前仍从独占控制台的936启动，7/5.1普通与只读沙箱四组合通过，原写入/类型限制保持；八项前台输出回归通过。见[发布实际执行](../../artifacts/latest-runtime-check/encoding-check/private-console-installed.json)及[七文件清单](../../artifacts/latest-runtime-check/foreground-observer-patch.json)。该四组合当时未重启持久模型Host，仅证明独立执行器；后续实际Host证据见下段。

持久真实模型Host随后已按原home/网关/授权/会话重启，四会话全部原状态保持；发布入口Android真实模型调用原只读pwsh，实际命令标准流/错误流的中文与emoji正确，结算前实时显示和历史重入通过。新Host73768已加载当前模块，不再沿用旧Host42112的编码载荷结论。首次入口定位超时及一次过早结算观察保留；只修验证器，不重发未知命令。详见[实际手机与恢复边界](../../../dsh-mobile/docs/integration/latest-live-recovery.md)。十二项源码Android和模型推理仍未验。

源码首轮完整构建296.39秒通过，但新验证器错误地从仓库根解析非根依赖包，未执行命令即失败；原构建恢复294.76秒，30源码/启动字节、355资源原摘要及Git干净通过。见[首轮失败](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-first-failed.json)与[解析错误](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-first-failed.log)。改用原工作区包路径后，七个模块与原生加载器依赖预检通过。

第二轮完整构建292.01秒通过，四组合各一次实际输出正确，但验证器在下一次执行前的控制台断言失败，整轮不通过。新增有界等待和进程列表记录：发布实际复验观察到原结果结算后控制台短暂保留子PID，随后释放，仅恢复独占状态才修改代码页；四组合再次通过。第二轮原构建恢复299.00秒，30源码/启动字节及355资源原摘要一致，见[第二轮失败与恢复](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-second-failed.json)、[失败执行](../../artifacts/latest-runtime-check/encoding-check/source-second-failed.json)。前两轮源码测试都没有进入Remote协议阶段，不计为通过。

修正验证器后的同范围第三轮完整通过：默认堆完整构建293.53秒，实际源码构建的四组合编码14.78秒，41项源码函数、159项取消、188项客户端、五项pnpm进程、72项operations、安装身份和八项电脑应用服务通过；原`pnpm dsh web`/网关协议及原Host重启66.05秒通过。恢复原构建295.01秒，30源码/启动字节精确恢复，355资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`与原版一致，Git干净；拥有的两个测试Host已清理。固定证据：[整体](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-combined.json)、[载荷](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-manifest.json)、[实际执行](../../artifacts/latest-runtime-check/encoding-check/source-twelve-installed.json)、[原协议](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-source-twelve-encoding-cleanup.json)。本轮flags为空，无实际Web/Android页面或模型推理；十一项历史Android通过不能代替十二项Android命令卡片，旧版最终组合和完整新版交付仍待验。

## 可核验边界

验证器使用原 `ctx.shell.execute`、原 `SandboxPwshExecutor`、原 Windows ACL confinement 和原结果收集器。前缀对照仅在测试子类的 `argv` 中替换编码前缀；`installed`模式不替换。每种版本/模式执行两次中文和 emoji 标准/错误输出；只读分支另检查原文件内容保持，以及受限类型方法仍被拒绝。Windows 原运行时报告 `enforcement: partial`，本次不扩张其安全保证。

隐藏控制台先 `FreeConsole` / `AllocConsole`，核对附着进程只有验证器自身 PID，才允许更改输出代码页；微软的[控制台生命周期说明](https://learn.microsoft.com/windows/console/allocconsole)是隔离方式的依据。普通 PowerShell 会改变共享控制台代码页，因此必须在每次执行前恢复 936。未复位的第一轮实验保留为 `confounded-original.json` / `confounded-guard.json`，不作为中文系统环境通过证据。验证不读取 Key、不调用模型，不改变日常 DSH、上游参考或现有模型 Host 的控制台。

证据：

- [原执行](../../artifacts/latest-runtime-check/encoding-check/original.json)、[UTF-8 控制台前缀保护对照](../../artifacts/latest-runtime-check/encoding-check/guard.json)。
- [每次恢复 936 的原执行](../../artifacts/latest-runtime-check/encoding-check/private-console-original.json)、[仅前缀保护](../../artifacts/latest-runtime-check/encoding-check/private-console-guard.json)。
- [启动前 UTF-8 对照](../../artifacts/latest-runtime-check/encoding-check/private-console-guard-prelaunch.json)：四个组合通过，测试目录已清理；原沙箱写入与类型限制保持。

验证器需 `DSHM_RUN_LIVE=1`。`DSHM_ENCODING_VARIANT` 可为 `original`、`guard`、`guard-prelaunch`、`installed`；前三项要求未安装编码补丁的原前缀，第三项要求 `DSHM_PRIVATE_CONSOLE=1`。实际载荷使用`installed`加独占控制台；`DSHM_ENCODING_SOURCE=1`切换为实际源码构建产物，已纳入[完整源码入口验证](../../scripts/verify-latest-source-remote.mjs)。独立控制台通过直接 Node 子进程隐藏启动，结论以落盘报告和该次 PID 为准，不用过期文件或外层启动返回值代替。
