# 新版 Office 转换运行中取消、断线与服务生命周期

- 状态：单读者取消、共享转换的两种读者取消顺序及运行中断线重试，在发布 CLI 和实际源码 `pnpm dsh web` 通过；各自源码原字节和355项客户端资源精确恢复。完整新版支持仍未完成。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-10-09。
- 固定目标：DSH `0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`；[官方发布列表](https://github.com/deepseek-ai/deepseek-harness/releases)当日重新核对。
- 来源：[原转换服务](../../artifacts/latest-source-check/packages/document/office-to-pdf/src/index.ts)、[原共享队列](../../artifacts/latest-source-check/packages/document/office-to-pdf/src/queue.ts)、[只读进程观察](../../../backend/tests/support/latest-office-engine-observer.mjs)、[原件与清理核验](../../../backend/tests/support/latest-office-engine.ts)、[实际 Android 页面驱动](../../../dsh-mobile/tests/support/latest-office-engine-page.mjs)。

## 双读者停用服务与撤销其中一个设备（2026-10-09）

状态：发布 CLI、生产网关与独立 Android 整轮179.202秒通过；实际源码入口同场景、完整构建与原资源恢复也通过。当前完整新版支持仍未发布。

发布[整轮报告](../../artifacts/latest-runtime-check/latest-office-engine-1c585d00-8850-4f3f-9438-c9e5597b519c-test.json)、[清理](../../artifacts/latest-runtime-check/latest-office-engine-1c585d00-8850-4f3f-9438-c9e5597b519c-cleanup.json)及[实际Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-2e0142eb-7ebb-4f4f-a3fd-026aa2b9fb46/latest-remote-android.json)证明：手机与另一条已批准的真实中转连接共享同一原native转换进程；通过原管理器停用服务后，两请求均失败且零PDF结果、进程/队列/临时资源释放。重新启用后，原按钮显式重试使用新服务代际，显示完整PDF画布与正文，不自动重发旧请求。

撤销阶段使用另一份2399页有效原件，保持前一份字节与版本。原观察器核对同一进程和两个读者仍在转换；手机的原Store授权被撤销后，其页面移除、零PDF元数据/分片且真实重连拒绝。另一条批准连接仍保持同一存活进程，收到4965753字节、76分片的完整PDF，摘要 `97e96a4510ee4f9a43aa11e720f2adaac6e0f4ce0e6017251d001ce637d19a92`；原helper正常退出，队列/源预算/临时目录释放、原件与版本保持。不冒充两台手机同时显示，也不由本轮推出全部网络/操作系统组合。

测试实现只扩展[原引擎控制](../../../backend/tests/support/latest-office-engine.ts)与[Android驱动](../../../dsh-mobile/tests/support/latest-office-engine-page.mjs)。两种原请求结束路径分别核验：页面关闭先调用原cancel时必须为一次取消/undefined结果；原连接reset先到时必须为明确连接错误。元数据在转换前后经原接口精确核对，在途窗口保留实际文件字节、存活进程和队列核验；未暂停引擎、延迟信用、替换PDF或修改生产鉴权。复验增加 `--office-engine-shared --office-engine-lifecycle`；发布入口设置对应两个范围环境值。

以下失败仍保留，不能作为通过证据：

- [首次](../../artifacts/latest-runtime-check/latest-office-engine-2f6ed62d-251a-4ca3-a692-1ef07fe593cb-test.json)错误地只接受连接reset，不接受原页面cancel结算；[第二轮](../../artifacts/latest-runtime-check/latest-office-engine-858e3171-3c4a-47fa-8404-f4ee6af8dd99-test.json)未在转换结束前完成撤销。
- [页数预检](../../artifacts/latest-runtime-check/latest-office-engine-6ad343e6-531f-446f-a2f2-552b5d1dd828-test.json)拒绝2401页，保留夹具2400页上限；后续使用2399页。[连接重置](../../artifacts/latest-runtime-check/latest-office-engine-e68b5835-df44-4cdb-a1ef-62f08faf17db-test.json)失败保留；[诊断轮](../../artifacts/latest-runtime-check/latest-office-engine-4f06b19b-be6c-4618-9150-661021efd736-test.json)记录两次ECONNRESET时Host仍活着、原只读stat新连接成功，不能声称Host崩溃。该专项的stat核验改用新连接；所有错误仍导致失败，无写入/管理/消息重试。
- [时间记录轮](../../artifacts/latest-runtime-check/latest-office-engine-ceef8831-3a76-437f-8c1f-de49d32d04f3-test.json)与[后续轮](../../artifacts/latest-runtime-check/latest-office-engine-597f615f-1288-41fd-b858-e119da665ca2-test.json)仍错过在途窗口；原生[撤销时间记录](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-31581a1b-2cdc-43bb-b8b1-1ffde0956a42/latest-remote-android.json)显示前置核验19.326秒、随后9.029秒，而原转换约26秒。最终合并重复在途核验，并在撤销后优先捕获剩余读者，保留零结果与同进程断言。

原App进程16722变为23468，Android事件记录原因为`remove task`，触发者未知。[PID守卫失败](../../artifacts/latest-runtime-check/latest-office-engine-1c585d00-8850-4f3f-9438-c9e5597b519c-original-pid-change.json)与[明确重开恢复](../../artifacts/latest-runtime-check/latest-office-engine-1c585d00-8850-4f3f-9438-c9e5597b519c-original-070bfb56-2937-45a7-a393-9a32dff97825.json)分开保留，`appPidPreserved:false`。同APK摘要、1837条原主聊天摘要、绑定/管理false及实际Android Remote前台核验通过；[全历史审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-shared-life-npm-restored-before.json)与[开始前](../../artifacts/latest-runtime-check/latest-live-child-retention-office-shared-life-20261009-before.json)的identity逐项相同，26会话3799事件保持。未重装主App、读取Key、替换配对或发送消息。拥有的两个Host及三个helper均确认不存在；撤销后的预期401单列，不记作撤销前页面错误。

实际源码[Host报告](../../artifacts/latest-runtime-check/latest-source-office-engine-db704158-2757-4f36-871a-228fca85706e-test.json)、[清理](../../artifacts/latest-runtime-check/latest-source-office-engine-db704158-2757-4f36-871a-228fca85706e-cleanup.json)及[Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-68fe95fe-def5-4b56-b2e5-d7e3eaceeee6/latest-remote-android.json)通过，外层relay206.146秒。服务停用释放共享helper39560、两请求零PDF；新代际helper14124显式重试显示实际PDF正文。撤销手机时helper46768仍由两个读者共享，撤销后另一批准连接保留同进程并收齐4965753字节/76片，摘要 `752ca3e6b1b352888f51eeccecbbb568e91f3062a195a45f9648d8426b82d4de`；最终正常退出、队列/源预算/临时目录释放，手机零结果且真实重连拒绝。页面错误为空，撤销后的预期401单列。

本轮[完整源码事务](../../artifacts/latest-runtime-check/latest-source-office-engine-run-d9c084e3-f862-42e5-907a-643972e25054.json)退出0，`passed`、`restoredOriginalBytes`为true。13组/37文件完整补丁构建331.068秒，原编码/源码回归/取消/插件重启/包管理/身份/桌面入口检查通过；37原文件、启动配置及根脚本原字节恢复。原完整恢复构建333.740秒及恢复检查通过，355资源摘要精确回到 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`，无活动引导、恢复幂等和Git干净核验通过。

恢复后的[原App核验](../../artifacts/latest-runtime-check/latest-source-office-engine-db704158-2757-4f36-871a-228fca85706e-original-85279e8c-25d1-4011-b1ae-0e40b0da9cb2.json)以发布轮恢复后的PID23468为冻结基线，`appPidPreserved:true`；Host29132、同APK/绑定、原1837条主聊天摘要、空草稿/workspace-write与management=false保持，实际Android Remote前台恢复。两个拥有的Host及三个helper已确认不存在。[全历史审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-shared-life-source-restored-before.json)与本节开始前identity逐项相同，26会话3799事件保持。Windows可见前台尚未验证，不由Android内部前台推定。

## 转换中停用服务与撤销设备

状态：npm 发布入口与实际源码 `pnpm dsh web` 的 Host、生产网关和独立 Android 整轮通过；本轮源码原字节、完整恢复构建和355项客户端资源精确核验通过。仅调整测试驱动和只读观察，不修改生产转换、鉴权或手机 APK。原七条完整验收标准仍未全部完成。

先完成六格式和历史附件回归，再打开1200页有效原件；确认原 native helper 存活、输入摘要一致且手机尚无PDF结果，才经原 `pluginManager/setPluginEnabled` 停用转换服务。服务重新启用后沿手机原按钮显式重试。撤销阶段使用另一份1201页有效原件，避免原 DSH 按内容摘要复用完成缓存；第一次文件的字节与版本保持，两份原件均核对。撤销前二次确认第三个 helper 正在转换，直接撤销设备，避免先收管理权限产生额外断线。

发布[Host报告](../../artifacts/latest-runtime-check/latest-office-engine-121f486c-8d62-4712-aecc-7c44b4f540eb-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-engine-121f486c-8d62-4712-aecc-7c44b4f540eb-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-engine-121f486c-8d62-4712-aecc-7c44b4f540eb-cleanup.json)、[Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-b50d0cdd-50c2-4aaa-b5a2-0c9fe8320011/latest-remote-android.json)通过：真实专项158.82秒、Vitest整体160.71秒。当前62文件/55源码候选、配对/历史/选模、文件刷新/六格式/历史附件、原Host重启同时检查；无模型推理或手机重装。

| 边界 | 实际结果 |
| --- | --- |
| 原服务停用时仍在转换 | helper24656存活；928797字节原件摘要 `c73c4a7a394311390320e17d69ae184831effb8eb580bf172f58cecf65beaf02`，零PDF元数据/分片/画布 |
| 旧服务清理 | helper以SIGKILL退出，原请求 `gateway/cancelled`；队列/源预算/槽位归零，缓存和临时目录清空 |
| 重新启用并显式重试 | 服务代际改变，旧请求不自动重发；新helper49716以code 0退出，2493629字节/39块真实PDF画布和正文通过 |
| 设备撤销时仍在转换 | helper564存活；929579字节第二原件摘要 `64449b1fb2d63f8d690efdf7891368b365f2417a38de4d2fdd6eca4966b2fa9e`，零PDF结果 |
| 撤销后的电脑和手机 | 原请求 `connection_closed_outcome_unknown`；helper以SIGKILL退出，队列/临时目录释放，取消结果不入缓存；旧聊天/预览移除，重新连接被拒绝，没有重发 |

原网关[Store](../../../backend/packages/gateway/src/store.ts)撤销只改变设备状态，保留管理标记；认证按 `revoked` 拒绝设备，不能将保留标记解释为有效授权。本专项保留原语义并验证真实重连拒绝，没有为了让断言通过更改生产字段。

测试Host50472/53140及三个helper均确认不存在，测试设备撤销、独立UID停止。[原App恢复](../../artifacts/latest-runtime-check/latest-office-engine-121f486c-8d62-4712-aecc-7c44b4f540eb-original-22373cbf-6764-43e9-8ef8-e482fd14229f.json)保持PID3722/Host29132、同APK/Key/绑定、原1837条聊天摘要、空草稿/workspace-write/唯一活跃设备management=false。全部26会话3799事件的[测试前](../../artifacts/latest-runtime-check/latest-live-child-retention-office-lifecycle-20261009-before.json)和[测试后](../../artifacts/latest-runtime-check/latest-live-child-retention-office-lifecycle-npm-20261009-before.json)identity逐项相同。Android内部Remote前台已恢复；Windows锁屏导致可见窗口仍待用户解锁核对。

两次失败独立保留：[首轮](../../artifacts/latest-runtime-check/latest-office-engine-a8e96063-e4d5-442e-b04a-922ce06ac8ea-test.json)在附件转换被观察器计入后无法准备撤销；原服务清空缓存会使后续附件重新转换，故将专项移到附件回归之后。[第二轮](../../artifacts/latest-runtime-check/latest-office-engine-69df408b-0a40-4c74-b712-65ee76c3bc83-test.json)误要求撤销后的管理标记为false，按原Store规则修正。两轮原错误、清理报告和实际证据不覆盖为成功；原26会话/3799事件保持。

实际源码[Host报告](../../artifacts/latest-runtime-check/latest-source-office-engine-59d229d1-7143-4679-b475-86310cc01df5-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-source-office-engine-59d229d1-7143-4679-b475-86310cc01df5-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-source-office-engine-59d229d1-7143-4679-b475-86310cc01df5-cleanup.json)及[独立Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-0029cf85-3ea7-40d4-b5fe-d3d58a059ae4/latest-remote-android.json)均通过。原服务停用时helper33048存活、零PDF结果，随后SIGKILL退出，旧请求返回 `gateway/cancelled`，缓存/队列/临时目录释放；原按钮重试后新代际helper36776以code 0退出，实际2493629字节/39块PDF画布和正文通过。第二原件转换时helper35480存活、零PDF结果，直接撤销后SIGKILL退出、原请求失败并清理预览，真实重连拒绝且没有重发。两份原件摘要分别为 `50d9731de2b96af67651b906810e0ded71de723b38bfa1f2691a96b8cd0a5fea` 和 `fc51182ee62ccc79025e971d72deaedd823ef2a4c3c362f160415ffd3d433f99`，原字节和版本保持。外层真实relay186.033秒，两个测试Host14300/13304及三个helper均确认不存在。

本轮[完整源码事务](../../artifacts/latest-runtime-check/latest-source-office-engine-run-6f8242bb-5f3f-42e7-a696-ffbb24e05346.json)退出0且 `passed`、`restoredOriginalBytes` 为true：13组/37文件完整补丁构建336.284秒，编码/源码回归/取消/插件重启/包管理/安装身份/桌面入口检查全部通过；37原源码、启动配置和根脚本原字节恢复，恢复幂等、无活动引导及Git干净核对通过。原完整恢复构建334.956秒、恢复检查退出0；355项客户端资源摘要精确回到 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`，只消费本轮新生成的源码报告。

完整恢复后的[原App核验](../../artifacts/latest-runtime-check/latest-source-office-engine-59d229d1-7143-4679-b475-86310cc01df5-original-a0a183bd-a58e-4b21-906b-c4b005386f3a.json)及[全历史审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-life-restored-20261009-before.json)通过：原PID3722/Host29132、同APK/Key/绑定、原1837条聊天摘要、空草稿/workspace-write/唯一活跃设备management=false保持，全部26会话3799事件与测试前identity逐项相同。[18目标/13组只读审计](../../artifacts/latest-runtime-check/patch-inventory-Uoc3Nd/report.json)通过，完整新版验收仍为false。Android内部Remote前台已恢复；Windows可见窗口仍待解锁核对。

复验入口为插件目录 `node scripts/verify-latest-source-remote.mjs --android --office --office-lifetime --office-engine --office-engine-lifecycle`，需显式设备环境。双读者撤销/停用、其他文件引用变化和完整新版支持继续验收。

## 转换进程运行中断线与原预览重试

状态：发布与实际源码入口真实 Android 专项、完整源码构建/恢复及原App/全部历史保持核验均通过。这与此前转换完成后的 PDF 分片传输中断分开验收。

手机沿原文件树打开1200页 Word 原件，确认原 LibreOffice helper 存活、输入摘要匹配、尚未发回PDF元数据/分片后，才切断发送该请求的实际设备 WebSocket。只切这条设备连接，不关闭 Host 或通知连接，不暂停转换/传输，也不更改生产认证、资源读取或转换器。来源：[原连接观察和切断](../../../backend/tests/support/latest-office-socket-drop.ts)、[实际运行状态二次核对](../../../backend/tests/latest-host.test.ts)、[原手机重连与重试](../../../dsh-mobile/tests/support/latest-office-engine-page.mjs)。

发布[Host报告](../../artifacts/latest-runtime-check/latest-office-engine-f473ed4c-522b-4c6d-b33f-b14d4dad8d67-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-engine-f473ed4c-522b-4c6d-b33f-b14d4dad8d67-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-engine-f473ed4c-522b-4c6d-b33f-b14d4dad8d67-cleanup.json)、[实际Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-307b02ff-e519-422f-b0b7-88e8cee47134/latest-remote-android.json)完整通过。真实专项135.50秒，Vitest整体137.41秒。消费当前62文件完整候选并核对55源码，六格式/历史附件、缓存/服务重建、配对/历史/选模、撤销拒绝重连及原Host重启同时回归；本轮没有模型推理、重建或安装手机APK。

| 实际边界 | 发布入口证据 |
| --- | --- |
| 切断时仍在原转换中 | helper PID48224实际存活，928797字节原件SHA `37616fd08f76bcc031823353531ae20fcaea2ba949db5cf31161b38e6b529289`；切断前再次核验同PID、running/readers/tasks/busySlots各1，手机零PDF元数据/分片/画布 |
| 原请求失败及电脑清理 | 原请求返回 `connection_closed_outcome_unknown`、pending移除，旧请求未接收结果；helper以SIGKILL退出，队列/源预算/槽位归零、两层临时目录移除，取消结果未入缓存 |
| 原生自动恢复 | 原连接观察为closed（未发送显式断开原因）后ready，原会话不变，没有点重新连接或注入ready；失败预览仍在，仅1次读取，没有自动重发 |
| 用户点击原重试 | 原按钮发起第二次读取，新helper PID50784以code 0退出；原版本/服务代际不变，实际2493629字节/39块PDF显示画布和正文 `DSHM transmission page 0` |
| 原文件及结果隔离 | 原文件全部字节/版本保持；旧读取始终零PDF分片，完成缓存增1、关闭后队列和临时目录释放 |

原App经[只读恢复入口](../../../dsh-mobile/scripts/check-latest-office-network-original.mjs)恢复同一Remote聊天，测试Host51528/47476及两个helper另由系统确认不存在。原App3722/Host29132、原1837条聊天摘要、空草稿、workspace-write、唯一设备/management=false及零iframe保持；[Android内部前台截图](../../artifacts/latest-runtime-check/latest-office-engine-f473ed4c-522b-4c6d-b33f-b14d4dad8d67-original-ac5b7b01-d1cb-4c72-baae-65fe037e8247.png)不代表Windows可见画面，电脑捕获仍为锁屏背景。完整26会话/3799事件的[测试前审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-engine-network-20261009-before.json)与[发布测试后审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-engine-network-npm-final-20261009-before.json)identity逐项完全相同，Host未重启。

本节只证明原转换运行时的非正常设备socket断开与原生自动重连、显式预览重试；不代替引擎转换阶段撤销设备/服务卸载、双读者断网、其他操作系统或全部新版支持。

同范围实际源码 `pnpm dsh web` 的[本轮Host报告](../../artifacts/latest-runtime-check/latest-source-office-engine-c983d787-6696-4f64-9e84-63393dc39751-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-source-office-engine-c983d787-6696-4f64-9e84-63393dc39751-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-source-office-engine-c983d787-6696-4f64-9e84-63393dc39751-cleanup.json)、[实际Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-fb3e19fb-7bec-48b0-8367-5f30e946734e/latest-remote-android.json)通过。真实流程约158秒、外层relay160.95秒；本轮原件928797字节、SHA `53326a7a3db60f868c2ca5fe2c39ea4edbe2605cd56ae492e6a81fa5e016af4f`。切断时helper52728存活且无PDF结果，旧请求零分片并返回原失败；原helper以SIGKILL退出、队列/临时目录清理。原连接自动closed→ready，同会话失败预览保持、没有重发；原重试创建新helper45476，code 0、2493629字节/39块实际PDF画布与正文通过，同版本/代际和原文件保持。

源码测试Host52880/48328及两个helper确认不存在。[源码测试后原App恢复](../../artifacts/latest-runtime-check/latest-source-office-engine-c983d787-6696-4f64-9e84-63393dc39751-original-f2ab5c3f-a977-4b94-9f0d-8552a539304b.json)保持原App3722/Host29132、1837条原聊天摘要、Key/配对与空草稿/权限。完整[26会话/3799事件审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-network-source-final-20261009-before.json)与测试前identity逐项一致。首个审计参数超过已有40字符范围限制，入口拒绝且未写报告；改用现有允许长度后审计通过，没有放宽检查。Windows前台仍未验证。

本轮[完整源码事务报告](../../artifacts/latest-runtime-check/latest-source-office-engine-run-4772b1c4-9b56-40fe-a77a-f5f606bdda2a.json)包含13组/37文件，完整补丁构建330.57秒、编码、46项源码回归及取消/重启/包管理/安装身份/桌面入口检查通过。原源码/3启动文件/根脚本原字节、无活动引导、恢复幂等和Git干净核验；完整恢复构建334.635秒及恢复检查退出0，355客户端资源摘要精确回到 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`。事务 `passed`、`restoredOriginalBytes` 均为true，外层命令退出0，只消费本轮新生成的源码报告。

完整恢复后再次通过[原App核验](../../artifacts/latest-runtime-check/latest-source-office-engine-c983d787-6696-4f64-9e84-63393dc39751-original-0e661c46-cf2b-4e50-ab58-fe01be35e499.json)及[全历史审计](../../artifacts/latest-runtime-check/latest-live-child-retention-office-network-restored-20261009-before.json)：原PID3722/Host29132、同APK/Key/配对、原1837条聊天/空草稿/权限，全部26会话3799事件与测试前identity完全相同。Android内部Remote前台通过，Windows可见画面仍未验证。恢复后的[18目标/13组只读审计](../../artifacts/latest-runtime-check/patch-inventory-AnFAEj/report.json)通过，完整新版七条总标准仍未全部完成。

## 本次证明什么

此前[预览关闭专项](./office-lifetime.md)暂停的是转换完成后的 PDF 分片传输。本次沿原手机文件树打开 1200 页有效 Word 原件，等待原生 LibreOffice helper 实际启动，再通过原「面板操作 → 关闭当前面板」关闭预览。没有延迟转换器、替换响应、伪造 PDF、增加远程接口或修改生产权限。

观察器仅在本项目 `relay-homes` 下加载；独立 Host 的 TMP/TEMP 指向自己的目录。原 `spawn` 立即执行且参数不变，观察其 PID、原输入摘要和退出。原服务队列、缓存与槽位只读。观察快照以独立文件发布，避免 Windows 读者与覆盖写入相互锁定；不会因此改变引擎执行或手机传输时序。服务按 Cordis 原 `ctx.get` 读取，不声明必需注入，以免观察器干扰 Office 服务的正常停用。

| 实际入口 | 发布 CLI 结果 |
| --- | --- |
| 手机打开文件，原引擎仍在运行 | PID 64896 存活，输入 SHA-256 与 928797 字节原件一致；队列 running/tasks/readers/busySlots 均为 1，尚无 PDF 元数据、分片或画布 |
| 原手机菜单关闭预览 | 原请求只发一次取消，pending 移除；未接纳 PDF 元数据或分片 |
| 电脑实际停止与清理 | 原 helper 收到 SIGKILL 后退出，系统确认 PID 不存在；队列、读者、源字节预算与槽位归零，两层转换临时目录移除 |
| 取消结果与原件 | 缓存仍为 6 项/126264 字节，没有保留取消结果；原件全部字节、路径和版本保持 |
| 重新打开同一文件 | 新 PID 23588 读取同一原件并以 code 0 退出；手机原画布与文字层显示 `DSHM transmission page 0` |
| 新结果和迟到隔离 | 实际 PDF 为 2493629 字节/39 块；缓存增加为 7 项，旧请求仍为零分片；再次关闭后队列和临时目录释放 |

这些观察证明原 native helper 在途取消，不表示已测到 LibreOffice 内部具体排版阶段。双读者共享转换的证据见下节，不能由本轮单读者结果推出；转换阶段断网范围见上节，撤销/服务卸载或其他操作系统仍未覆盖。

## 共享转换时关闭一个读取者

状态：发布与实际源码入口真实Android专项均通过，完整源码恢复与资源精确核对通过。本轮在同一原件、同一服务代际下，让原手机预览和另一条已经批准的真实中转WebSocket请求共享转换。第二个读取者沿现有生产网关、鉴权和分片确认协议，立即消费原结果；不暂停引擎、延迟信用或伪造PDF。来源为[原队列读者取消规则](../../artifacts/latest-source-check/packages/document/office-to-pdf/src/queue.ts)、[真实第二读者与队列核验](../../../backend/tests/support/latest-office-engine.ts)、[原手机关闭菜单](../../../dsh-mobile/tests/support/latest-office-engine-page.mjs)。

| 实际检查 | 发布入口结果 |
| --- | --- |
| 两个读取者进入同一转换 | 原helper PID38872存活且输入摘要匹配928797字节原件；readers=2，running/tasks/busySlots均为1，源预算只计一份 |
| 手机原菜单关闭 | 原手机请求取消一次、pending移除且零元数据/分片；readers=1，同一PID仍存活，另一请求尚未结算 |
| 另一真实连接继续 | 同一helper以code 0退出；完整2493629字节PDF/39块、连续偏移、每块确认、总长度及真实PDF头核验，摘要为 `f6ad2a1958ccc849a95f6a750b34d7f51935ceb82047aaf48818da10bd178684` |
| 手机重新打开 | 原画布和文字层显示实际正文；PDF版本/代际/总长度与另一连接相同，累计仍只有一个native helper，原已取消请求无迟到结果 |
| 原件与资源释放 | 原件全部字节/版本保持，队列/读者/源预算/槽位归零、两层临时目录移除；缓存从6项/126264字节增加为7项/2619893字节 |

[发布Host报告](../../artifacts/latest-runtime-check/latest-office-engine-936faee2-3d8a-4c6b-99be-848786943b63-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-engine-936faee2-3d8a-4c6b-99be-848786943b63-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-engine-936faee2-3d8a-4c6b-99be-848786943b63-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-dc484c11-f1bc-486a-afac-21946bdf71fc/latest-remote-android.json)。真实专项140.37秒，外层142.33秒通过；保留六格式/历史附件/缓存/服务停用重建、配对/历史/选模、最终撤销及原Host重启。撤销前错误为空，最终预期401单列。本轮没有修改生产转换、鉴权或手机APK；原App PID32632与Host17620、原Remote会话通过[恢复核验](../../artifacts/latest-runtime-check/latest-office-engine-shared-936faee2-main-restored.json)并实际在MuMu显示。

这里只证明一个真实Android读者与另一条已批准协议连接的共享转换，不冒充两台手机同时显示、另一个读者先取消或所有并发/断网组合。首个请求关闭后剩余读者继续，与上一轮最后一个读者关闭时终止引擎互为补充；完整新版支持仍未完成。

实际源码 `pnpm dsh web` 的[本轮新Host报告](../../artifacts/latest-runtime-check/latest-source-office-engine-560a8240-a890-4066-b7e1-5c2a67b262bb-test.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-7d193559-16ee-4b52-85d2-4ae8e8931f8f/latest-remote-android.json)同范围167.71秒通过，Vitest整体169.74秒、外层relay170.72秒。原helper PID9324读取928797字节原件，输入摘要与本轮原件 `196e21eca580abddcd0672adb8f18ac4877a0012b3c8b2b2f316f0ec52f4db28` 一致；readers=2和手机关闭后readers=1时均保持同一helper存活。另一连接取得2493629字节PDF/39块、摘要 `3590e62140eae8be1fabe3ab2475b9339ea17f4b4622737a93019c1f9304430b`，同helper以code 0退出。手机重开显示同版本/代际/总长度实际正文，累计仍只有一个native helper；队列/临时目录、原件字节/版本和缓存增量核验，旧请求无迟到结果。

[源码测试Host清理](../../artifacts/latest-runtime-check/latest-source-office-engine-560a8240-a890-4066-b7e1-5c2a67b262bb-cleanup.json)记录74068/43648；两轮四个Host与两个helper另由系统确认已不存在。原App PID32632、Host17620及同一Remote会话经[源码专项后恢复](../../artifacts/latest-runtime-check/latest-office-engine-shared-560a8240-main-restored.json)核验，并实际在MuMu显示。共享范围的[完整源码构建与恢复](../../artifacts/latest-runtime-check/latest-source-office-engine-run-3359ac7f-9bad-4364-ac53-74f81f765861.json)最终退出0，`passed`、`restoredOriginalBytes` 均为true；完整补丁构建376.94秒、46项源码回归及取消/重启/包管理/身份/桌面入口检查通过，原37源码/3启动文件/根脚本、无活动引导、Git干净和恢复幂等核验。完整恢复构建378.96秒、恢复检查通过，355资源摘要精确回到 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`。该报告只消费本轮共享范围新源码报告，不借用此前单读者或发布结果。

## 后加入的读取者取消，手机继续预览

状态：空间阻塞解除后，发布入口第四轮和实际源码入口完整通过；原源码/启动配置及355客户端资源完整恢复。本范围复用同一手机文件树、真实中转及原共享转换：手机先打开原件，另一批准连接后加入；第二连接沿原协议取消自己的请求，核对取消后零PDF数据且无迟到帧，原手机保持读取，并显示完整PDF画布和正文。随后关闭并重新打开，核对同一版本/代际和缓存总长度、仅一个原转换进程、原件保持及全部队列/临时资源释放。不能借用上节“手机先取消”的报告判定此范围通过。

发布第四轮[Host报告](../../artifacts/latest-runtime-check/latest-office-engine-31bcce00-0718-42d5-b150-a176682b4ad8-test.json)、[清理记录](../../artifacts/latest-runtime-check/latest-office-engine-31bcce00-0718-42d5-b150-a176682b4ad8-cleanup.json)及[实际Android证据](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-7e580364-ae5e-44a6-9d12-ae8732ad3ac0/latest-remote-android.json)完整通过，Vitest专项144.697秒、整体146.67秒。临时错误钩子已移除，原helper PID67600输入928797字节/摘要核对；两个读取者变为一个后同进程继续，并以code 0退出。第二读取者取消后保持零PDF字节/分片且无迟到帧，手机原请求收到完整2493629字节/39块并显示画布与正文。重开复用已完成手机缓存，累计只有一条原手机读取、零取消和一个native helper；缓存只增一项，原件与队列/临时资源释放核验。六格式/历史附件、服务代际重建、最终撤销和原Host重启同时通过；预期撤销后401单列，未执行模型推理。拥有的Host清理记录为75848/31104；此报告不替代源码构建与完整恢复。

实际源码本轮[Host报告](../../artifacts/latest-runtime-check/latest-source-office-engine-2ec7db85-dc5b-419f-be86-9e462be7654a-test.json)、[清理](../../artifacts/latest-runtime-check/latest-source-office-engine-2ec7db85-dc5b-419f-be86-9e462be7654a-cleanup.json)和[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-84527579-84eb-4fde-978f-ed0c8b58e2e6/latest-remote-android.json)同范围173.36秒通过，Vitest整体175.35秒、外层176.35秒。原helper PID24604读取928797字节，输入摘要 `5db0adde6ba575c38c625b17e9826f06a0b842680301386f4252399ad3f37e4b` 与实际原件相同；双读者变单读者后同进程继续且code 0退出。手机接收2493629字节/39块、零取消并显示实际画布和正文，重开使用唯一原请求的完成缓存，另一已取消连接仍零数据/无迟到帧。缓存增加一项、原件保持、队列与临时目录释放，六格式/历史附件/服务重建/撤销/Host重启同时通过；最终预期401单列，无模型推理。

[源码完整组合](../../artifacts/latest-runtime-check/latest-source-office-engine-run-8c08c773-7d2a-4c9c-b829-9037e061bfa2.json)终态退出0，`passed`、`restoredOriginalBytes` 为true；完整补丁构建346.51秒，46项原源码回归及编码/工具取消/插件重启/包管理/身份/桌面检查通过。37原源码、3启动文件、根脚本、引导移除、Git干净及恢复幂等核验，完整原恢复构建378.75秒通过。355资源摘要精确回到 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`；终态后的原构建检查再次通过，[18目标/13组清单](../../artifacts/latest-runtime-check/patch-inventory-WVgEC5/report.json)仍明确 `fullAcceptancePassed:false`。此组合只消费本轮新源码报告和反向取消专属范围。

[发布原件/进程独立核对](../../artifacts/latest-runtime-check/latest-office-engine-joined-release-audit-ef3ef336-1f1a-4ff6-a83a-fe35c1d78877.json)确认Host75848/31104及helper67600已退出；[源码原件/进程独立核对](../../artifacts/latest-runtime-check/latest-office-engine-joined-source-original-audit-20268e62-cb6d-4326-a29e-6e97245d38c5.json)确认Host51272/71260、实际源码子进程9592和helper24604已退出，保留该审计早于恢复构建的标记。原App通过原Launcher、实际MuMu侧边栏恢复同一Remote会话；[只读恢复核验](../../artifacts/latest-runtime-check/latest-office-engine-joined-both-main-restored-6ae19e37-35e1-4222-8036-584bfaee936c.json)确认PID32632/Host17620、原配对及会话保持、iframe为零，没有重装或读取更换Key。仅本范围通过，其他并发/断网、SDK/Electron及原七条完整标准仍未全部完成。

发布测试在原五个范围变量之外设置 `DSHM_LATEST_OFFICE_ENGINE_JOINED_CANCEL_CHECK=1`；源码命令另加 `--office-engine-joined-cancel`，且必须同时指定 `--office-engine-shared`。该分支独立记录 `office-native-engine-joined-reader-cancellation`，不修改生产转换器、传输、鉴权或APK。

首轮发布失败保留于 `latest-office-engine-1e7ffb16-2c82-4794-8c05-e01c868a6ed2-test.json`，129.67秒。原手机已显示实际完整PDF，但验证器误期待重开时再发一次转换请求，实际只有一次。源码核对[手机缓存入口](../../../dsh-mobile/src/remote-office-cache.mjs)确认原手机已完成结果会命中原OfficePreviewCache，仍核验权限、版本与转换代际；此前手机先取消的分支没有完整结果，所以重开才需新请求。仅修正该分支的验证预期为一条完成请求、重开显示缓存正文且不重复转换；原失败未计为整轮通过，生产缓存与传输未改。

修正后的第二轮发布在前置六格式转换中失败，未进入Android：`latest-office-engine-00af3cc2-1409-4103-bbb2-1b582349aeca-test.json`，35.02秒，原错误 `document-render/failed` / `reason:failed`，stderr为空。两轮拥有的Host11828/3688已清理。独立[原转换器对照脚本](../../scripts/diagnose-latest-office-conversion.mjs)对同一失败工作区六个原文件，使用相同原生包及原服务配置全部成功，原件字节/SHA保持；[实际诊断](../../artifacts/latest-runtime-check/relay-homes/1a81279c-5258-4175-b368-26043ccb0cf3/office-diagnosis-nAvdBy/report.json)明确 `fullAcceptancePassed:false`。它不经过Remote/Android，不能替代整轮通过，也未证实第二次失败根因。

第二轮诊断期间Q盘可用空间曾降至18.15MB，转换器销毁及临时清理后回升约139.19MB；不能把该轮低空间推断写成已确认的ENOSPC。当时尚未开始本范围完整源码构建，原固定源码Git干净，待用户腾出构建空间继续。后端类型与四个验证入口语法已通过；完整新版原七条标准保持未完成。后续空间解除与第四轮结果见本节状态和报告。

原App通过原Launcher及实际MuMu侧栏恢复同一Remote聊天，实际截图和[只读恢复证明](../../artifacts/latest-runtime-check/latest-office-engine-joined-main-restored-7d551333-af98-4091-8509-8c241bf01cf6.json)核对PID32632/Host17620及同一原会话，未重装或读取Key。恢复证明首次只读断言误用 `state.pid`（实际字段为 `state.hostPid`），未写报告；核对原状态字段后正确入口通过。原355资源重新计算摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 保持；本范围未应用源码补丁或执行完整构建。

### 原转换异常的空间原因已捕获

第三轮[发布失败](../../artifacts/latest-runtime-check/latest-office-engine-23a5a591-b4c9-419a-a39d-2cdf6fe76e0c-test.json)36.94秒，仍未进入Android。独立Host54704的临时测试钩子只透传原 `convertBytes`，捕获原包装异常链：`OfficeToPdfError(code:failed)` → `ConversionError(code:failed, message:"ENOSPC: no space left on device, write")`。来源是606720字节原 `.ppt`，摘要 `1f0eb633897433cbc7cf05e7ee99f43424205dddc180aff4c58c4b18964816ce`；[首个原异常记录](../../artifacts/latest-runtime-check/relay-homes/cbe7a3f7-58ee-4d20-a99d-5990dda68049/office-engine-observations/conversion-failure-ec772561-5d2a-4be7-a59b-0c6312358312.json)写入时可用空间19066880字节。该记录是在原转换已经抛错后生成，不以静态空闲空间反推错误。它证明第三轮原转换确实遇到空间不足；不能追溯声称第二轮也捕获了同一原异常。

临时钩子按 `ctx.get` 返回对象记录绑定，代理身份变化导致同一个异常被逐层重复记录715次，实际只存在一种原因；诊断可能影响时序，本轮不计功能验收通过。钩子和全部 `[DEBUG-office-cause]` 代码已移除，失败证据保留，无生产改动。[只读独立审计](../../artifacts/latest-runtime-check/latest-office-engine-space-cause-audit-b3380f30-ab58-469d-8f1c-28e0546039bc.json)核对原PPT大小/摘要、715记录的同一原原因、Host54704退出及Android未开始；`fullAcceptancePassed:false`。后续不继续叠加钩子或删除失败后重跑。

第三轮结束时重新核对原源码Git干净及355资源原摘要一致，主App PID32632/Host17620及MuMu原Remote聊天保持。Q盘当时临时清理后约137.40MB可用；此前建议用户腾出至少3GiB，属于构建空间建议，不保证所有打包阶段一定足够。随后恢复验收前实测可用7540617216字节，空间阻塞解除。七项原总标准保持未完成，当前发布与源码专项进度见本节开头，三个失败记录继续保留。

## 发布入口证据与测试边界

[完整 Host 报告](../../artifacts/latest-runtime-check/latest-office-engine-a5d0e9f8-f52b-45a1-be7d-2c045141b44d-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-engine-a5d0e9f8-f52b-45a1-be7d-2c045141b44d-progress.json)、[拥有的进程清理](../../artifacts/latest-runtime-check/latest-office-engine-a5d0e9f8-f52b-45a1-be7d-2c045141b44d-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-932ea257-a444-469c-aa16-0e4925a55556/latest-remote-android.json)。Vitest 145.80 秒通过，外层147.68秒；真实协议、手机配对/历史/选模、工作区文本变化、六格式 Office 与历史附件、缓存授权和服务停用/重建、设备撤销及原 Host 重启同时回归。撤销前页面/控制台错误为空，最终撤销后预期 `http_401` 单列；没有真实模型推理。

采用当前[62 文件完整候选](./candidate-package.md#当前完整插件源码对应的安装包2026-10-07)的消费入口，TGZ SHA-256 为 `16835594509559deb424e7d747ee7c64dfdabcf2d4f82bb7323a30f30daba0aa`；本轮重新核对归档摘要、原消费入口字节及当前55源码摘要。沿真实发布 Host、生产中转和原生 Android 桥，不覆盖日常插件或原模型 App。

原测试 Host 37292/57484、独立 Office UID、测试授权和对应反向端口按拥有范围清理。原模型 App PID32632、Host17620及原测试会话由[恢复核验](../../artifacts/latest-runtime-check/latest-office-engine-npm-main-restored.json)确认保持，实际 MuMu 窗口再次显示原 Remote 聊天；未安装 APK、读取或替换 Key。

前几轮失败报告保留在 `latest-office-engine-*-test.json`：先是观察器声明导致原管理器报告等待服务，随后是观察快照覆盖写入 EPERM。失败没有记为通过；修正只涉及测试夹具，完整新版的七项总标准保持未完成。

## 实际源码入口与恢复

[完整源码运行及恢复](../../artifacts/latest-runtime-check/latest-source-office-engine-run-5bff9fc8-e552-4471-a125-bb5f44876ba6.json)只消费本轮新生成的[Host报告](../../artifacts/latest-runtime-check/latest-source-office-engine-51847da3-8943-4834-ae7a-5cbbe2a0f9e0-test.json)，实际命令为 `pnpm dsh web`，没有借用发布入口或历史源码报告。真实源码 Host→生产中转→独立 Android 专项177.72秒通过，Vitest整体179.64秒，外层relay180.60秒。[Android证据](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-engine-4336890a-767b-4640-a328-9edfa865ccb9/latest-remote-android.json)保留同一手机菜单、实际PDF画布和文字层核验。

源码原helper PID71896读取928797字节原件，实际输入摘要为 `b8a42078a50f119361acf63131384f307f58d1494e2d31efa2a77da7d90c5c21`；关闭时以SIGKILL退出，缓存保持6项/126264字节、队列/预算/槽位归零且临时目录清理。重新打开的PID29300读取同一原件，以code 0退出，实际2493629字节PDF/39块显示正文；缓存增加为7项/2619893字节，旧请求没有迟到结果。两个阶段的只读观察错误均为空，原件字节和版本保持。六格式、历史附件、缓存与服务生命周期、设备撤销和原Host重启同时回归；最终撤销后的预期401单列，不宣称所有错误日志为空。

本轮完整补丁构建383.82秒通过，46项源码回归及工具取消、插件重启、原包管理进程/业务、安装身份和桌面入口检查通过。随后恢复37个原源码文件和3个独立启动文件；根脚本原字节、无活动引导、Git干净及恢复幂等核验。完整恢复构建382.62秒和恢复检查通过，355项客户端资源SHA-256精确回到 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`。最终报告 `passed`、`restoredOriginalBytes` 均为true，外层命令退出0。

[拥有的源码进程清理](../../artifacts/latest-runtime-check/latest-source-office-engine-51847da3-8943-4834-ae7a-5cbbe2a0f9e0-cleanup.json)记录Host13144/63008；发布与源码两轮拥有的四个Host、四个转换helper都另由系统确认不存在。测试UID、授权和端口清理后，原App PID32632、Host17620及同一Remote会话通过[恢复核验](../../artifacts/latest-runtime-check/latest-office-engine-source-main-restored.json)，MuMu实际窗口显示原DSHM聊天。未重装主App或读取、更换Key。

## 复验入口

在后端目录执行真实测试前，显式设置 `DSHM_ANDROID_SERIAL=emulator-5554` 与已核验 `DSHM_ADB_PATH`，再设置四个范围值为 `1`：`DSHM_LATEST_ANDROID_CHECK`、`DSHM_LATEST_OFFICE_CHECK`、`DSHM_LATEST_OFFICE_LIFETIME_CHECK`、`DSHM_LATEST_OFFICE_ENGINE_CHECK`。执行 `node node_modules/vitest/vitest.mjs run tests/latest-host.test.ts --maxWorkers=1 --no-file-parallelism`。

实际源码入口在插件目录执行 `node scripts/verify-latest-source-remote.mjs --android --office --office-lifetime --office-engine`。它执行完整补丁构建、相关原回归、实际源码 Host/Android 流程，再恢复原源码并完整构建；只有原字节、根脚本和全部客户端资源都核对一致才通过。该范围产生独立随机报告名，并且只消费本轮新报告，不能借用发布或历史源码结果。

转换运行中断线另加 `--office-engine-network`；发布入口另设 `DSHM_LATEST_OFFICE_ENGINE_NETWORK_CHECK=1`。该范围要求单个原native读者，与共享转换、转换后传输取消及原件保存专项互斥。独立Android管理授权由原测试流程批准并最终撤销；原App恢复入口只接受本轮已通过报告及真实进程清理证据。

共享读者范围另加 `--office-engine-shared`；发布入口另设置 `DSHM_LATEST_OFFICE_ENGINE_SHARED_CHECK=1`，其余四个范围值保持。该分支运行共享读者专项，不借用单读者取消的报告或宣称重复执行了该专项。
