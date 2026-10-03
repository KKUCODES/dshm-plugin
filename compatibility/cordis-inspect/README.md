# 动态 Cordis 插件：多页面能力目录

- 状态：连接目录、12 个原调用和七文件兼容包已实现；补丁、插件 **0.1.51**、网关及 APK 已在本机安装。MuMu原动态清单、固定测试包手动运行、Host调用、停止、移除及草稿保留已通过；审批、版本切换、双端与完整异常继续验收，见[手机实际记录](../../../dsh-mobile/docs/integration/remote-current.md#动态插件手机入口与真实运行2026-09-27)。
- 维护角色：DSH Mobile 项目协作 Agent。
- 最近核验：2026-09-27（香港时间）。
- 基线：DSH `0.1.6-alpha.2`，参考提交 `ddefc45fbc7f8e46dd73185e68295696d1297887`；源文件 SHA256 由[核验报告](../../artifacts/cordis-inspect-audit/report.json)记录，[转换器](./changes.mjs)严格校验 Host 文件。

## 为什么必须先处理

模型通过动态 Cordis 插件查询客户端能力、加载局部界面及调用对应 Host 半部。[协议白名单](../../../backend/packages/protocol/src/remote-cordis.ts)现已逐一接入 12 个原调用。手机[启动策略](../../../dsh-mobile/src/remote-plugin-policy.mjs)要求完整接口集合，不能只因目录读取可用就启动整个运行器。既有第三方包/局部插槽验收不能证明动态 Cordis 功能已完整接入。

原 [Host 注册表](../../../deepseek-harness/packages/extensions/cordis-host-runner/src/inspect-registry.ts)只有一份 `clientManifest`。原 [Client 注册表](../../../deepseek-harness/packages/extensions/cordis-client-runner/src/client/inspect-registry.ts)在注册/移除提供者时上报整个目录，包括空数组。

[隔离核验脚本](../../scripts/audit-cordis-inspect.mjs)直接编译、运行未修改的两端源码及真实 Cordis/JSON Schema 校验依赖。7 个检查证明：

- 第二个页面上报会覆盖第一个页面独有的能力；移除最后一个提供者会上报空数组、清掉另一个页面的目录，重新上报才能恢复。
- 同名提供者的不同输出契约按最后一次上报替换，可能拒绝另一个页面的结果。
- 原有无效/重复定义拒绝、错会话拒绝、输入/输出校验、首次有效答复生效、工具取消及迟到结果拒绝均正常。
- 两个原 Client 注册表接收同一查询时，首个有效结果结束另一页面的工作。此行为没有电脑/手机主从关系，应保留。

这些是原服务的进程内隔离实验，传输回调与 Agent 身份为明确夹具；没有使用模型、用户会话或真实 Android。报告中的 `passed` 表示复现断言通过，不表示原缺陷已经修复部署。

## 实现选择与边界

直接放开原 `syncInspectManifest` 成本最低，但会把已复现的覆盖问题带到手机。另行重做每个页面的查询协议、模型工具名称与客户端选择则涉及更多兼容和测试范围。当前选择在原注册表内部增加连接目录，保留原查询与答复规则。

[转换器](./changes.mjs)仅修改参考源码派生副本：

- 原 `syncClientManifest` 更新传统电脑页面目录；新增 Host 内部 `createClientManifestScope()` 返回独立的 `sync/run/dispose` 闭包。它不是 `@Remote` 方法，不接收页面自报连接身份，也不授予新权限。
- 每个连接保留自己的快照；释放、重复释放、空上报不清除其他连接或传统目录。关闭后的句柄不能重新上报。
- 相同能力合并为一项；JSON 对象键和方法目录顺序不构成差异。同名但定义不同则拒绝整次更新，旧目录全部保留；未新增版本优先级或电脑优先级。
- 更新先走原 JSON Schema 校验，独立复制并深度冻结快照。后续调用方写入或目录读取不能修改查询校验契约。
- 原查询、会话归属、输出校验和首个有效结果逻辑保留。删除目录不会擅自结算已经发出的查询；原工具的取消机制继续负责清理，传输接入时还需验证断线与超时。

[连接适配](../../src/cordis-connections.ts)以网关提供的设备/连接身份持有目录；原 `$events` 的 ready 建立代次，结束释放，同连接重订阅不让旧清理删除新代。原生成 Gateway 解码与异步 Agent 查找之后，12 个原方法入口再次检查目录代次；目录上报保留 AsyncLocalStorage，其他方法进入原业务前退出该上下文，避免已接纳的电脑后台任务继承手机连接寿命。服务卸载后的旧异步代码不能退回传统目录。

协商必须同时检测原 registry 与 runner 的兼容标记。仅安装注册表不算就绪。`invoke` 沿原精确 plugin/run/已登记 handler 查找；`resolveRequestRun` 保留原待批准请求及首次有效结算。沿既有整台电脑聊天授权，不新增按工作区授权，也不提供定义代码、任意执行或客户端指定连接身份的入口。

## 执行与证据

在插件项目目录依次执行：

```text
node scripts/audit-cordis-inspect.mjs
node compatibility/cordis-inspect/prepare.mjs
node --test compatibility/cordis-inspect/core.test.mjs
node compatibility/cordis-inspect/typecheck.mjs
node node_modules/typescript/bin/tsc -p compatibility/cordis-inspect/tsconfig.json
node node_modules/vitest/vitest.mjs run --config compatibility/cordis-inspect/vitest.config.mjs
node compatibility/cordis-inspect/package.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/cordis-inspect/install.test.mjs
node compatibility/cordis-inspect/install.mjs plan "F:/Program Files/deepseek-harness"
```

原问题7项核验、兼容核心9项回归及严格编译通过。核心回归含两个连接、原 Host 目录、原 Client 移除、冲突原子性、快照不可改写、未知基线拒绝、查询校验、异步目录隔离及服务卸载后旧句柄拒绝。见[核心测试](./core.test.mjs)和[日志](../../artifacts/cordis-inspect-core-tests.log)。

[原接口测试](./remote.test.ts)9项使用真实 Connection/Gateway、原生成 codec、完整 runner 与真实沙箱 handler；Agent、凭据存储和事件源明确为隔离夹具。覆盖全部调用、跨连接、错误会话、原审批、迟到结果、解码期间断线及电脑后台续行。最终安装包也通过相同测试，见[安装包运行日志](../../artifacts/cordis-package-remote-tests.log)。测试单独运行，避免默认插件测试依赖本机已安装 DSH 的生成文件。

`prepare` 只写项目 artifacts，并从参数指定（默认本机）的 DSH 读取原生成接口、记录来源哈希。先构建后端协议，再准备/检查/打包。[安装包构建](./package.mjs)重编译完整 runner，保留原生成接口，固定覆盖2份源码、1个编译入口及4份编译模块/声明。安装器预检固定版本、源码、生成接口、目录链接和未知改动；失败只回滚本轮写入，外部并发改动保留。**DSH停止后**执行 `install.mjs apply <root> --stopped`；还原执行 `restore <root> --stopped`。原字节保存在包内，不覆盖既有备份。7项[安装测试](./install.test.mjs)及[日志](../../artifacts/cordis-install-tests.log)通过，含重新构建一致性。

## 实际安装发现的问题与修复

初装0.1.50的MuMu上报目录返回 `remote_cordis_connection_expired`。原测试缓存一次 `ctx.get` 结果，遗漏了真实入口每次读取服务的行为；改为原 `ctx.get` 后9项中6项失败，[失败证据](../../artifacts/cordis-proxy-failure.log)。Cordis 每次读取可能创建不同代理，误触发服务换代判断。0.1.51使用框架公开 `symbols.original` 比较服务身份，调用仍经过上下文代理；修复后9项通过，[回归证据](../../artifacts/cordis-proxy-fixed.log)。连接关闭、重订阅和服务失效检查保留。

实际兼容包7/7已安装，0.1.51经原CLI更新。DSH使用原源码启动入口，当前PID40000；网关PID25976。新版APK保留数据安装。03:26香港时间，MuMu从普通聊天抽屉进入Remote，两个动态插件均为active，工作区文件旁栏开关、原聊天和草稿保留，页面错误/资源失败为空，见[实际报告](../../../dsh-mobile/artifacts/cordis-panels-android.json)与[验证脚本](../../../dsh-mobile/scripts/verify-cordis-android.mjs)。03:20初轮旁栏“no session surface”未在修复后再次出现；03:22启动尚未恢复时的一轮返回host_offline，服务恢复后冷启动通过，均不冒充完整竞态验收。

插件默认125项、后端65项（独立PostgreSQL1项按配置跳过）、手机374项通过，APK构建/lint通过。初次并行插件全测有旧Office测试超时，单项与完整重跑均通过，原因未确认。没有发送模型请求、修改Key、原绑定或设备权限；本机还原未实际执行，恢复能力目前由安装副本测试证明。

## 继续接入的明确步骤

手机已在「插件面板」底部提供原页脚清单，并修复内存动态工厂被代次script筛选丢弃的问题；原模块系统回归先失败后通过，旧脚本隔离保留。03:49及03:50香港时间两次MuMu真实运行/Host回声/停止/移除通过，后者含冷启动；临时包已卸载，DSH恢复19340、网关25976。378项手机测试、完整页面回归、构建/lint通过。详细证据与注册顺序约束见[手机记录](../../../dsh-mobile/docs/integration/remote-current.md#动态插件手机入口与真实运行2026-09-27)。上节PID与测试数属于此前安装阶段。

1. 验收原审批、工具卡片及面板隐藏时新审批的提醒/定位，避免只验证手动运行。
2. 用专用测试动态包验证版本切换、双端目录与断线/撤销；当前余额不足，不新发模型请求，不把明确测试包称为模型生成。
3. 验证新局部面板与原工具卡片、主/旁栏、用户自适应覆盖和通知相互配合；实际源入口已安装，编译入口虽经隔离测试仍须按需做真实启动验证。

本项对应 [KKC-17](https://linear.app/kkcodes/issue/KKC-17) 的 R13，仍进行中。localhost 网页转发另属 R12，目前暂不实施、范围待定，与动态插件局部界面不是同一能力。
