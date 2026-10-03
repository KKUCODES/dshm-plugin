# Cordis 客户端生命周期补丁

- 状态：7项源码回归及1项安装/恢复测试、完整入口严格类型检查、原预设浏览器构建已通过；16文件补丁已安装到本机DSH。MuMu普通重启及有实际动态包时的审批、版本更新、重启后目录/手动运行/电脑调用/停止移除通过，草稿保持、控制台与资源错误为空。双端与实际撤销等完整兼容仍待验收。
- 维护角色：DSH Mobile 项目协作Agent。
- 最近核验：2026-09-27。
- 固定基线：dsh 0.1.6-alpha.2，commit `ddefc45fbc7f8e46dd73185e68295696d1297887`；[变更定义](./changes.mjs)逐文件SHA256校验，上游参考检出只读。
- 来源：[原源码诊断](../../../dsh-mobile/scripts/diagnose-cordis-lifetime.mjs)、[诊断结果](../../../dsh-mobile/artifacts/cordis-lifetime-diagnosis.json)、[候选测试](./core.test.mjs)与[7项结果](../../artifacts/cordis-client-lifetime-tests.log)。实际Android症状另见[超时验收中捕获的重启日志](../../../dsh-mobile/artifacts/interaction-timeout-cleanup-reconnecting.json)。

## 已核实原因

原ClientCordisInspectRegistry在提供方移除时排队发布整个目录。真实Cordis上下文销毁会触发这些移除回调，微任务随后仍尝试同步；连接此时已撤销，产生`syncInspectManifest has no active Connection`。原源码隔离执行已复现该调用和相同错误；候选加入注册表销毁与连接代次后，旧任务不再执行。

原ui-cordis的inventory仅在新连接reset时失效，没有插件销毁清理。断开的旧读取若先拒绝，仍发布错误；原源码对照证明显式失效后同一迟到拒绝不会上报。候选在连接丢失时失效，在插件卸载时永久停止发布，保留正常连接的失败提示与显式重新读取。

“7项通过”是源码与受控端点的生命周期回归；安装测试另验证16文件应用、重复应用、恢复、未知目标无部分写入与参考检出拒绝。此前实际手机已证明连接稳定后目录和聊天可恢复；没有证据支持将旧日志描述为永久重连失败。

## 取舍与边界

不采用全局过滤console.error：那会隐藏当前连接的真实失败。也不让旧插件等新连接再提交目录，因为它可能覆盖新实例的完整目录。采用原客户端模块的固定基线派生，按连接和插件寿命丢弃旧工作，保留原调用协议、模块身份、鉴权与插件界面。

四个候选文件：ui-cordis的inventory/index，以及cordis-client-runner的inspect-registry/index。旧查询结束时只移除同一controller，防止电脑重启后复用requestId误删新查询。没有开放新远程接口或自动重放用户操作。

## 构建与安装

1. 在实际DSH安装目录执行 `node --import tsx <本目录绝对路径>/build.mjs <DSH目录>`：[构建脚本](./build.mjs)对完整两个客户端入口严格类型检查，沿原`packages/client/tsdown.client.ts`预设构建，保留CSS和外部模块身份；[构建日志](../../artifacts/cordis-client-lifetime-build.log)。
2. 在plugin目录执行 `node compatibility/cordis-client-lifetime/package.mjs <DSH目录>`：[打包脚本](./package.mjs)校验固定基线，生成原文件、新文件与16文件哈希清单；含四份源码、对应JS/声明、两个浏览器bundle及其source map。
3. 停止经核对的DSH进程后执行 `node compatibility/cordis-client-lifetime/install.mjs apply <DSH目录> --stopped`；恢复使用 `restore` 替代 `apply`，只读核对用 `plan`（不需停止）。[安装器](./install.mjs)拒绝未知内容和参考检出；[隔离测试](./install.test.mjs)不操作真实安装。
4. 启动原DSH命令；现有APK从电脑取得更新，无需新APK。其他安装基线不适用；不得绕过哈希校验强行覆盖。

## 实际Android验证（2026-09-27）

[首轮重启报告](../../../dsh-mobile/artifacts/cordis-lifetime-reconnect-first-android.json)：06:49:51Z开始，实际结束DSH58096并启动44380；离线到原会话恢复约14.86秒，同一WebView、不刷新、原草稿保持，插件面板可打开，pageerror/consoleErrors均为空。[随后正式入口检查](../../../dsh-mobile/artifacts/cordis-lifetime-module-entry-android.json)确认两个原模块均active，资源/控制台错误为空。

[第二轮增加目录检查的失败](../../../dsh-mobile/artifacts/cordis-lifetime-empty-inventory-attempt.json)保留：DSH44380→49108、原聊天恢复且无控制台错误，但按钮不存在导致专项超时。原`CordisPanel.tsx`在all.length为0时直接返回null；本机临时动态包已卸载，因此不能拿空目录验证按钮读取成功。脚本将`--inventory`明确为需要预先登记动态包的专项，不以隐藏按钮宣称目录通过。

实际重启脚本使用`--cordis-lifetime`时断言全部console错误为空，并检查两个模块active；默认旧模式继续保留原诊断日志。所有测试仅操作专用会话，无模型请求或Key、设备授权修改。完整第三方兼容与撤销/双端等边界仍未完成。

[最终重启报告](../../../dsh-mobile/artifacts/cordis-lifetime-reconnect-android.json)：06:55:26Z开始，DSH49108→48412，离线到恢复约13.41秒；原会话、草稿和同一WebView保持，面板可打开、两个模块active，pageerror/consoleErrors均为空。首轮与最终轮两份通过证据均保留；中间空目录专项未计入通过。失败后遗留的面板遮挡曾令入口脚本超时，[该结果](../../../dsh-mobile/artifacts/cordis-lifetime-open-panel-attempt.json)也保留，最终脚本从公开“返回聊天”按钮收起既有面板后开始，不强制穿透遮挡。

收尾DSH48412、网关3128；未修改Key、模型配置、设备权限，也未发送模型请求。进程号仅供定位，下次操作需重新核对。

## 动态包实际重启复验（2026-09-27）

[实际报告](../../../dsh-mobile/artifacts/cordis-lifetime-live-android.json)于07:00:41Z开始，沿原CLI安装已核对四份打包源码的0.0.8专用登记插件。MuMu实际拒绝、单次批准、后续版本授权及第三版自动授权通过；DSH31576结束后启动65508，旧局部界面被移除，新进程登记的包保留待激活。手机从原清单手动运行后Host回声成功、计数从1开始，随后停止与移除成功，原草稿保持。不是旧包自动持久化或自动运行。

[验收入口](../../../dsh-mobile/scripts/verify-cordis-android.mjs)的`--cordis-lifetime`不再应用旧的预期断线日志分类，全部console/pageerror与失败资源严格要求为空；本轮通过。原[测试插件](../../../dsh-mobile/tests/fixtures/live-cordis-plugin/index.js)使用真实Host服务和公开手机界面，维护门闩只阻止本次回执触发模型；两段审计newTurns=0、原待办保留，定向清理4+3条本轮回执。两张实际截图：[待激活](../../../dsh-mobile/artifacts/cordis-lifetime-live-idle.png)、[运行后回声](../../../dsh-mobile/artifacts/cordis-lifetime-live-running.png)。

原CLI已卸载临时插件并核对依赖不存在。07:02:48Z[日常入口收尾](../../../dsh-mobile/artifacts/cordis-lifetime-live-cleanup.json)通过，两个原模块active、原草稿保持、errors/resources为空。DSH29728/网关3128运行，Key和设备权限未改变，无模型请求。本轮只改验收工具，没有新APK或生产代码变更。

运行中首次安装因Windows拒绝替换pnpm-lock.yaml而失败；核对当时依赖未添加，停止已确认DSH后原CLI重试成功。卸载命令不支持`--ignore-scripts`，去掉该无效参数后正常完成。这些为实际安装操作结果，不将其写成通用Windows锁故障已修复。双端目录、实际设备撤销以及其他完整Remote缺口仍保留。

在plugin目录运行：`node --test compatibility/cordis-client-lifetime/core.test.mjs compatibility/cordis-client-lifetime/install.test.mjs`。
