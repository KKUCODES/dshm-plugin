# 后台输出兼容补丁

- 状态：核心补丁已安装到本机编译版DSH，插件0.1.31、中继与手机自有输出页已接通；真实PowerShell运行中输出、模型读取互不消费、大输出补读与读取间重连已验证。完整异常和其他安装形态仍在实施。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-09-25。
- 决策：[电脑端兼容补丁](../../../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md)。
- 固定基线：DSH `0.1.6-alpha.2`，commit `ddefc45fbc7f8e46dd73185e68295696d1297887`。不能直接套用于其他版本。

## 当前实现

[changes.mjs](./changes.mjs)声明十个文件的规范化 SHA-256 和唯一替换片段。新增接口沿原来准确的进程归属传递：

1. `SubprocessOutputReader.readBytesFrom(fromByte, maxBytes)`：可选、无消费副作用、单次最多64 KiB的原始字节读取；返回实际开始位置、下次位置、总字节数、丢失标记和电脑内部 spill 路径。复制返回数据，读者不能改变 collector 缓存。保持原 `readFrom()` 原样。
2. `ShellProcess.collected`：可选的底层读者；Bash/Pwsh executor在原进程对象暴露自己创建的collector，两个sandbox派生类继续返回同一个对象。
3. `JobHooks.readOutputBytes()`：对应Bash/Pwsh生产者读取准确进程；准备中为pending，旧provider不支持时为unsupported，绝不回退调用模型的消费接口。
4. `LocalJobRegistry.readOutputBytes()`：每次复用原任务归属校验与范围检查；读取不修改reported，不触发完成通知。最终输出型任务可在完成后独立读取stdout；没有新接口的旧流式生产者明确不支持。生命周期结束后仍由原注册表删除记录并拒绝读取。

这是电脑内部接口，不能直接把返回对象转发手机。插件仍需核对会话、注册表代次与启动时间，内部补读spill、限制并发，并把字节经既有受限协议传输；手机按连续字节解码。超出保留范围的内容明确提示丢失。

## 重现验证

从插件项目目录运行，使用本项目现有依赖，参考检出只读：

```text
node compatibility/background-output/build-test-runtime.mjs
node compatibility/background-output/typecheck.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/background-output/core.test.mjs
npx vitest run tests/job-control.test.ts
```

运行产物构建和安装（先停止目标DSH；只读`plan`无需停止）：

```text
node compatibility/background-output/build-runtime.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/background-output/install.test.mjs
node compatibility/background-output/install-runtime.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/background-output/install-runtime.mjs apply "F:/Program Files/deepseek-harness"
node compatibility/background-output/verify-native.mjs "F:/Program Files/deepseek-harness"
node compatibility/background-output/verify-native-lifecycle.mjs "F:/Program Files/deepseek-harness"
```

恢复时先停止目标DSH，再将`apply`改成`restore`。构建产物自带22份原文件副本及hash；未知版本、用户修改、目录越界或文件链接会拒绝写入。逐文件替换使用同目录临时文件与rename，失败时恢复本次已写入文件；恢复遇到外部改动会明确报错，不能覆盖。重复应用同一版零写入。已安装补丁时构建器要求先恢复，防止把已修改文件误存为原始备份。

编译安装器针对本机构建的DSH目录：更新9个包的7个运行JS文件与相关声明，共22个文件，保留原包名/版本与原导出。构建核对71个实际打包输入与目标源码，声明按现有真实依赖生成。它不修改目标src；源码入口另需下方源码补丁与启动修复，两者已在本机安装并实测。参考检出保持只读，尚不是面向任意npm/Electron安装的通用交付器。

### 源码补丁交付

[源码安装器](./install-source.mjs)提供同一十文件补丁的 `plan/apply/restore`。先核对全部包名、版本、原始或已打补丁的精确内容，再逐文件替换；保留 LF/CRLF，未知修改、混合换行、非 UTF-8、文件/目录越界链接均拒绝。参考检出始终只读。恢复使用同一受核验的原文，不覆盖补丁后的用户改动。编译安装器只额外接受**同一版已知源码补丁**，因此两种补丁共存时仍可独立恢复编译产物。

```text
node --test compatibility/background-output/install-source.test.mjs compatibility/background-output/install.test.mjs
node compatibility/background-output/install-source.mjs plan "F:/Program Files/deepseek-harness"
```

5项文件副本回归通过，覆盖LF/CRLF逐字节往返、重复操作零写、未知源码/版本/混合换行拒绝、参考/越界链接拒绝，以及源码与编译补丁共存恢复。当前现场plan确认源码10文件和编译22文件均为patched；源码补丁与启动修复已安装，实际F盘恢复仍未执行。

`pnpm dsh web` 的源码/编译混用已有[固定基线启动修复](../source-start/README.md)：原入口和仅指定tsconfig均失败，link模式仍破坏外部插件身份；保留原resolver并统一同安装源码入口的方案通过真实模块、原工具执行、Worker与DSHM模块加载回归。当前现场已用原profile源码启动，MuMu运行中独立输出、完整历史及模型后续读取通过，专用聊天已归档。安装/恢复器副本验证通过，任意第三方Worker/生命周期及其他安装形态仍待验收。重建编译补丁时先恢复补丁并核对基线，不把打过补丁的文件当成原始备份。

[prepare.mjs](./prepare.mjs)核对全部基线后，在插件自己的`artifacts/compatibility/background-output/`生成original/patched副本、manifest和`background-output-v1.patch`，同时执行正向/反向`git apply --check`。它不修改参考检出或电脑安装目录；[运行构建器](./build-runtime.mjs)与[安装/恢复脚本](./install-runtime.mjs)单独处理编译产物。生成器拒绝修改过的输入及重复应用，Git行尾选项仅对本次子进程生效。

[build-test-runtime.mjs](./build-test-runtime.mjs)将已核验副本接入只读上游模块，生成隔离测试包；该包不是正式DSH安装包。[typecheck.mjs](./typecheck.mjs)按strict、exactOptionalPropertyTypes、noImplicitOverride等上游规则检查十个源文件，未修改的依赖使用插件依赖或所指定DSH安装的声明文件。缺少声明时应报错，不生成替身声明。

## 实际结果与限制

- 十个文件的严格类型检查、隔离包构建、正反向patch检查通过。上游`git status --short --untracked-files=no`为空，参考检出未改。
- [核心测试](./core.test.mjs) **11项通过**：基线不符/重复应用、CRLF兼容、中文和emoji逐字节解码、独立读者与返回副本、spill和超限丢失、两个生产者、原注册表归属/销毁/完成通知、最终输出型任务、旧能力拒绝、准备失败/取消与结束后读取，以及Bash/Pwsh含sandbox四个executor分支。
- executor使用明确的进程/沙箱服务测试替身，仅验证原executor保留和传递独立读者及confinement调用；**不代表原生进程或操作系统沙箱已实测**。注册表、collector、生产者和executor均使用真实源码。
- 现有停止接口的原注册表回归1项通过，未修改其实现。未重跑插件全部83项，也未生成新插件包/APK。
- 首轮fixture把注销Agent误当作销毁Agent scope，且未通过Service注册subprocess，出现3项失败；按原生命周期和服务方式修正fixture后通过，没有因此修改生产授权或销毁逻辑。
- 日志：插件`artifacts/compatibility/background-output/{build,typecheck,core-tests}.log`。

## 实际安装与原生进程验证（2026-09-25）

- 已验证[真实文件副本安装回归](./install.test.mjs)：22个文件安装/恢复后逐项hash一致、重复安装零写、存在未知改动时预检拒绝且其他文件不变，参考检出拒绝写入。实际F盘安装的恢复动作尚未执行，不能把副本恢复称为现场回滚。
- 2026-09-24 18:36:45 UTC，停止已核对的DSH PID29056，安装22个编译/声明文件；原native Windows subprocess、Pwsh executor、任务注册表及同版生产者适配验证通过后，按原编译入口重启为PID7564。未改Key、地址、遥测配置或设备权限，插件版本仍0.1.30。
- [真实进程脚本](./verify-native.mjs)最新18:40:15 UTC报告 `native-verification.json` errors为空：运行中读取START中文/emoji、2字节连续解码、独立stdout/stderr、模型前后两次读取仍得到各自完整增量、终态回读、完成通知未提前标记、原停止路径终止第二个测试进程后仍可读取停止前输出。两次进程都只打印固定文字/等待，无模型请求或用户文件操作。
- 该脚本读取实际安装包，采用真实Windows进程provider；生产者适配由相同补丁源码另编验证入口。它创建独立内存Agent，**不是原Loader/模型工具调用或手机正式输出入口验收**。真实操作系统sandbox、Bash进程、并发/撤销等仍需对应环境或正式链路验证。
- MuMu正式Remote首页在18:36:44变灰进入重连，18:36:55恢复绿色并返回原联调聊天，页面错误为空。手机报告为`dsh-mobile/artifacts/home-connection-android.json`（覆盖上次同名报告）。这只证明安装后现有入口恢复，不代表手机新增输出通道已完成。
- 安装回执`install-receipt.json`及只读plan确认22文件全部为patched；参考仓库tracked状态仍为空。本轮没有发布新插件包或APK。

## Host、中继与正式手机入口（2026-09-25）

### 原生进程的会话回收与任务服务重载

- [生命周期验证脚本](./verify-native-lifecycle.mjs)读取实际安装的编译包，在独立 Cordis 树中运行三个真实 PowerShell 进程；只打印固定标记并等待，不请求模型、不连接用户的 DSH，也不修改其配置。测试环境的 Agent 是内存注册对象，不是实际聊天会话。
- 2026-09-24 20:27:35–20:27:39 UTC（本地09-25）验证通过：销毁一个 owner 的原 scope 后，其真实进程被终止、任务记录清空、旧 JobControl 请求拒绝；另一个 owner 的进程仍运行且输出可读。
- 随后卸载原 Jobs 服务，第二个真实进程被终止，原 `ctx.inject(['jobs', 'agents'])` 销毁旧 JobControl；重新加载后产生新代次，新进程复用 `pwsh-1` 仍不会被旧请求访问，新请求读取正确且 `reported` 保持 false。最终清理全部独立进程和服务。
- 报告：[native-lifecycle-verification.json](../../artifacts/compatibility/background-output/native-lifecycle-verification.json)，`errors` 为空。该项覆盖实际安装包的原生进程与注入生命周期，不替代运行中 DSH Loader、网关和 MuMu 页面下的 owner 回收/服务热重载验收；后者仍待补充。

### 正式通道已有证据

本机源码入口补充停止后读取：真实MuMu通过正式确认按钮停止一个原pwsh任务，系统PID退出、独立stdout/stderr和从头历史仍可读；同会话第二个真实任务持续输出并正常完成，模型随后读取被停止任务的原job_output也完整。报告与边界见[手机验收记录](../../../dsh-mobile/docs/integration/remote-current.md#源码启动交付与真实手机输出--2026-09-25)。该项不代表owner销毁或核心Jobs热重载全链路，归档也只更新索引，不能当成进程回收。

插件0.1.31的[独立输出服务](../../src/job-output.ts)、[任务核验](../../src/job-control.ts)、[协议](../../../docs/protocol.md#独立后台输出)和手机原生桥/自有页面已接通。每次最多64KiB，只读取原收集器路径，文件读后重新检查会话/任务代次与scope存活；不暴露路径。保留原聊天输出记录入口，旧能力明确不可用。

- [Host真实补丁回归](./host.test.mjs)3项通过：原注册表/collector历史spill补读、2字节中文解码、不消费reported、文件丢失/超过cap、旧任务/会话/代次、取消和读中卸载。
- 插件原adapter/停止26项、后端协议/真实HTTP+WS+SQL4项、手机游标4项与原生方法表契约1项通过；类型检查、Web/APK构建、Android lint通过。原生表契约防止协议已更新而Android仍拦截新方法。
- 真实DSH通过原插件安装入口升级0.1.31并以编译入口重启7564→54652，网关12948→39392。MuMu正式入口在19:02:30 UTC运行专用`DSHM 独立输出联调 1790276550507`的pwsh-2：运行中先收到BEGIN中文，之后stderr可读、结束收到END中文，独立历史一致，全屏无横向溢出。19:03:49 UTC模型再调用原job_output，仍读到BEGIN/END及stderr，证明手机读取未消费模型游标。手机报告`independent-job-output-{run,model-read}-android.json`错误为空。
- 首次真实读取发现Android METHODS漏加新方法，已修复。第一次测试任务1790276373421已完成，修复后19:02:14只读重入通过并归档，未重发该任务。前两次测试脚本在首页等待错误，均未发送模型消息，已改按实际标题和异步导航等待。

Android新增400,036字节中文/emoji完整7页补读验证；中继重启后手机恢复同一聊天、输出页与65,536字节位置，显式继续读到131,072。主动断开保持断开，手动连接成功，专用聊天已归档。手机另通过本机字节代理控制的在途断线、超时和离开后迟到响应验证。本机源码启动的正式手机链路也已验证，仍需验收真实设备撤销、任务回收和连续弱网、操作系统sandbox/Bash原生及其他安装形态，不宣称完整R09或Remote完成。证据与最新现场见[手机当前记录](../../../dsh-mobile/docs/integration/remote-current.md)。
