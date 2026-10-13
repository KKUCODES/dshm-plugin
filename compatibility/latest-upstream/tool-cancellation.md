# 新版工具取消边界

原Auto review明确取消仍显示失败的问题已在真实发布Host复现，并通过[窄范围补丁、33项回归及发布/实际源码Android取消、历史和续聊](../../../dsh-mobile/docs/integration/latest-auto-review.md)修复。独立UNKNOWN和真正error保持；新源码组合最终恢复、真实拒绝/放行及完整范围仍待验，不以此前原套件通过认定旧补丁可全部移除。

- 状态：固定新版两处PTC取消问题已修复；159项原源码、5项调度专项、3项真实Node进程及八项源码Android/恢复组合通过。发布与固定源码的真实模型/Android只读和可写PTC外层停止通过；两种入口内部真实pwsh的取消、进程退出、两层停止显示、历史重入与继续回复也通过。其他内部工具、自动审核及程序内文件写入仍待验。
- 维护角色：DSH Mobile项目协作Agent；核验日期：2026-10-06。
- 基线：`0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，仅隔离副本，不升级日常DSH。
- 来源：[源码变换](./source-tool-cancellation.mjs)、[源码组合](./source-changes.mjs)、[发布包变换](./tool-cancellation.mjs)、[原源码验证器](../../scripts/verify-latest-tool-cancellation.mjs)、[原调度器专项](../../tests/latest-tool-cancellation.test.mjs)。

## 当前行为与修复范围

原官方PTC与自动审核两个测试文件共157项通过，但一个PTC停止测试只核对提示文字，没有核对结构化错误码。验证器在该原用例增加错误码断言，并追加已有的内部取消原因身份用例，总计159项。原版失败两项：运行时返回`kind: abort`仍生成`CODE_RUN_FAILED`；内部工具原样抛出同一个`signal.reason`仍被记作普通错误。独立错误及全部原自动审核测试通过，见[原版失败证据](../../artifacts/latest-runtime-check/tool-cancellation/original-report.json)。

外层修复只使用运行时的结构化`kind: abort`，投影为`AbortError/ABORTED`，保留Captured output及沙箱诊断；`timeout/exception`继续是执行失败。内部修复只在当前信号已停止且抛出的值与`signal.reason`严格同一时，生成原`toolAbortedResult`。停止后独立抛出的错误保持失败，不能根据点击时序或错误文字归类。

源码组合中的`tools/index.ts`同时包含前台观察类型与内部取消变换，生成一个载荷，避免两个补丁在安装时互相覆盖；`ptc.ts`是新增文件，累计八项/二十三文件。公开构造参数显式声明`boolean`，遵守新版原Typert反射约束。发布包的两个变换合成一个固定`dsh-tools/lib/index.js`原子载荷；原字节、包身份和版本完整核验，未知输入拒绝，不开放任意安装目录。

## 自动审核的适配判断

新版原ToolRuntime已在调用者取消后阻止迟到的允许或拒绝。原自动审核测试同时要求：取消后发生的独立提供方故障仍显示真实故障。新版LLM可能将这类故障的terminal kind标为`aborted`，但failure code仍为`UNKNOWN`；仅看到`aborted`不能证明它是用户取消。

因此本轮不套用旧自动审核的全部信号检查变换。保持新版已验证的错误优先级；最终是否需要其他改动，应由真实模型停止、拒绝和故障验收决定，当前不声明旧补丁已可移除。

## 验证入口与限制

在插件目录执行：

```text
node scripts/verify-latest-tool-cancellation.mjs
node scripts/verify-latest-tool-cancellation.mjs --candidate
node --test tests/latest-tool-cancellation.test.mjs
node --test tests/latest-ptc-process.test.mjs
```

第一条用于复现原版，预期退出1且仅上述两项失败；第二条临时应用当前维护的源码组合，159项通过并逐字节恢复，见[修复报告](../../artifacts/latest-runtime-check/tool-cancellation/candidate-report.json)。不要在完整源码验证器运行时同时执行这两个入口。

完整源码Remote验证器在实际安装全部载荷后执行`--installed`，核验当前安装身份、执行同一159项测试并保留安装字节，见[实际安装报告](../../artifacts/latest-runtime-check/tool-cancellation/installed-report.json)。发布包5项另覆盖abort、timeout、exception、内部原始reason与独立故障；同一5项在实际安装的源码入口也通过。

159项及5项专项使用官方原测试的可控PTC provider，只驱动取消时序，未替代生产运行时。它们证明原工具调度器的分类边界，不证明真实模型或手机点击停止。

另以[真实进程测试](../../tests/latest-ptc-process.test.mjs)挂载原NodePtcRuntime、原subprocess及Windows只读沙箱。实际执行打印中文/emoji后等待的程序，分别用户停止、真实1500ms超时及程序抛错；穿过原ToolRuntime，核对结构化错误、Captured output、原File sandbox诊断和本次子进程PID消失。源码3项及发布包3项均通过，见[源码实际进程](../../artifacts/latest-runtime-check/tool-cancellation/source-process-report.json)和[发布包实际进程](../../artifacts/latest-runtime-check/tool-cancellation/process-report.json)。不调用模型，不根据这些结果宣称Android点击停止或Auto推理已验收。

八项完整组合及单独41项源码回归均通过；完整组合的159项直接运行实际安装引导，41项另用已有源码函数验证入口，二者范围分开。完整构建、Android和精确恢复由[源码组合记录](./source-runtime.md)登记。本地产物不随Git分发。

## 真实Android停止与工作区权限

当前固定源码实测范围另见下文“固定源码的内部真实命令停止”；以下发布入口记录保留其当时范围。

发布Host/真实DeepSeek/独立Android自有页面在只读和工作区可写PTC分别通过原手机停止、ABORTED、停止前输出、无重试、历史重入及停止后继续回复。最初可写程序未启动，官方诊断证实隔离测试目录缺WRITE_OWNER；限定该目录临时满足原沙箱前提后，原操作通过。测试结束撤销原grant并用官方备份恢复DACL规则/保护状态，原Key及日常环境未改。原运行器注明partial，不声明完整Windows隔离；持久Host旧grant缓存不可再用于可写测试，需重启后重新满足前提。报告、原失败、官方诊断、恢复差异与实际手机步骤见[完整范围](../../../dsh-mobile/docs/integration/latest-compatibility.md#可写ptc与windows目录权限)。这不代替源码实际推理、PTC内部工具取消或自动审核。

## 固定源码的内部真实命令停止（2026-10-06）

使用固定30文件源码候选的实际`pnpm dsh web`、Host68820及已安装MuMu自有Remote页面，在既有PTC测试会话设置仅可查看。真实模型仅执行一次`run_code`，程序内部仅一次`await tools.pwsh(...)`，原命令输出唯一标记和PID后等待90秒，不读写文件、不联网、不提权。该调用方式及父子事件形状来自固定原`tools/ts-types.ts`、`tools/types.ts`和`tool-pwsh/src/index.ts`，不使用模拟工具或注入事件。

原父调用`call_00_yNpGIl1ZWPhu19KENZBG6426`及子调用`:ptc:1`的code/参数/原事件分别核验。停止前系统核对唯一标记对应pwsh进程3256确实存活；只点击手机“停止生成”，随后原父`tool/result`和子`tool/ptc-dispatch`均为`AbortError/ABORTED`，该进程不存在。原程序Captured output保留`DSHM_PTC_INNER_eaf623201918`、不含结束标记，手机父程序和内部命令都显示“工具调用已停止”。退出聊天后重入仍显示两层停止；同会话真实模型继续回复通过。最后恢复workspace-write并返回主聊天，设备管理始终false，没有更改目录ACL。

[验证器](../../../dsh-mobile/scripts/verify-latest-live-ptc-inner-android.mjs)的start/stop/resume/return是操作记录；完整通过证据为[原结果与进程](../../artifacts/latest-runtime-check/latest-live-source-ptc-inner-android-observe.json)、[手机历史两层显示](../../artifacts/latest-runtime-check/latest-live-source-ptc-inner-android-replay.json)、[继续回复](../../artifacts/latest-runtime-check/latest-live-source-ptc-inner-android-resume-observe.json)和[权限恢复](../../artifacts/latest-runtime-check/latest-live-source-ptc-inner-android-return.json)。[进程证据](../../artifacts/latest-runtime-check/latest-live-source-ptc-inner-process.json)只读取本测试唯一标记的系统元数据。该结果限定固定源码、只读pwsh内部调用；不代替发布入口内部调用、其他内层工具、可写程序文件写入或自动审核取消。

## 发布入口的内部真实命令停止（2026-10-06）

原源码Host44756及控制器55768正常停止，cleanup/实际进程消失核验后，使用同home/16901/配对恢复隔离发布Host24584（控制器15444、TTY30623）。验证器增加显式`release`参数及独立seed/报告前缀；执行前核对发布DSH名称/固定版本和原工具文件SHA256，实际取消载荷必须等于已知原字节应用当前变换的结果（`53c99d529bc4931f58df2f02010ddae4f11e04bcbdf68309a74006f01e5c54cb`），不以报告文件存在冒充安装。

同一PTC测试聊天的一次`run_code`及内部一次pwsh通过：原父`call_00_lFpnR0D9kOTWGdVo07583487`、子`:ptc:1`、唯一标记`DSHM_PTC_INNER_7233d0dd3903`、真实进程16132。手机停止后原父子ABORTED且PID消失；当前原callId下的父子卡片均stopped，避免同一历史里的旧卡片被误选。程序首段保留、无结束标记/重试；退出重入与真实续聊通过，workspace-write恢复、管理false。[原结果](../../artifacts/latest-runtime-check/latest-live-release-ptc-inner-android-observe.json)、[历史](../../artifacts/latest-runtime-check/latest-live-release-ptc-inner-android-replay.json)、[续聊](../../artifacts/latest-runtime-check/latest-live-release-ptc-inner-android-resume-observe.json)、[恢复](../../artifacts/latest-runtime-check/latest-live-release-ptc-inner-android-return.json)均来自原App，阶段命令正常退出0。测试未改变生产代码、APK或ACL。

后续已正常停止此发布Host，回到SOURCE Host69680/控制器13940（TTY80297）继续验收。上述两种入口只证明只读pwsh内部取消；程序内文件写入、其他内层工具及自动审核仍待完成。
