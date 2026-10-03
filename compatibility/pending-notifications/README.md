# 待审批与提问的只读通知补丁

- 状态：源码补丁、正式编译产物及可恢复安装器已实现；本机停止DSH后完成apply→restore→apply，每次5文件核验通过。配合插件0.1.35，真实MuMu待提问列表/横幅、另一端处理后清除已通过；完整异常验收未完成。
- 维护角色：DSH Mobile 项目协作 Agent。
- 最近核验：2026-09-25。
- 基线：DSH `0.1.6-alpha.2` / `ddefc45fbc7f8e46dd73185e68295696d1297887`。
- 授权：[用户确认的兼容补丁交付](../../../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md)。上游参考检出保持只读，本机安装按固定哈希应用补丁。

## 取舍与接口

原 Gateway 的 `$events` 是审批参与者通道，不能为通知另加一个不回答的客户端，否则会影响所有客户端委托后的结算。手机 `PendingApproval/PendingQuestion.key` 是呈现计数，也不能替代原 `eventId`；固定延时无法可靠分开历史待办和新增请求。

[两文件补丁](./changes.mjs)在 Gateway 增加电脑内部 `pendingNotifications.observe(listener)`，同步返回冻结的当前集合及释放函数，然后只推后续新增/清除。每项只有原 `eventId`、原 `sessionId` 与 `kind:approval|question`；无审批正文、命令、参数、signal、resolve/reject 或代为批准接口。只支持原 `approval/request`、`user-questions/request`，其他扩展事件不猜测语义。

观察者不注册 Gateway 客户端，不进入 deliveries 集合，也不改变旧 `$events` 握手、结果及取消帧。同步异常、异步拒绝和永不完成的观察者不影响原审批决定。事件与列表冻结；最多64个观察者，初始集合最多256项，超限明确报错。后续队列由 [Host TaskNotifications](../../src/task-notifications.ts)有界管理。源移除、原取消及另一客户端结算都会通知清除；服务销毁后拒绝再订阅。

`TypertGateway.pendingNotifications` 为可选属性，插件通过能力检测兼容未打补丁的电脑；旧电脑仍可提供完成事件，但不能宣称具备完整审批通知。

## 生成与检查

在插件目录执行：

```text
node compatibility/pending-notifications/build-test-runtime.mjs
node compatibility/pending-notifications/typecheck.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/pending-notifications/core.test.mjs
```

构建器核验参考commit和两个源码文件hash，在插件 `artifacts/compatibility/pending-notifications/` 生成original/patched副本、manifest、`pending-notifications-v1.patch`，并检查正向及反向 `git apply --check`。`test-runtime.mjs` 含测试用导出，**不是生产安装文件**。严格类型检查使用原源码和现有安装中的webserver类型，不生成假的类型定义。

四项原 Gateway 运行测试通过：同步初始集合、稳定身份重连、原最后参与者委托及原答案不变、另一端结算清除；观察器抛错/拒绝/不结束；不可变数据、容量、预先取消与服务销毁；真实 TaskNotifications 合并基线及增量。Cordis、Gateway、Connection均运行真实代码，事件源为确定性测试源，没有模型请求或用户审批，也不是已安装DSH/手机验证。

## 正式编译与安装恢复

[生产构建器](./build-runtime.mjs)从核验后的原入口构建正式 `lib/index.js`，保留原三个运行时导出，不导出测试用 TaskNotifications，不内联第二份 Cordis。另由严格 TypeScript 检查生成 `index.d.ts`、`types.d.ts`。原客户端 JS 不变。编译基线固定为本机已核验的三个文件哈希，其他构建即使版本号相同也拒绝覆盖。

```text
node compatibility/pending-notifications/build-runtime.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/pending-notifications/install.test.mjs
node compatibility/pending-notifications/install.mjs plan "F:/Program Files/deepseek-harness"
```

[安装器](./install.mjs)将两份源码与三份编译文件作为同一事务预检、替换和核验。相邻源码、包名版本、产物哈希、未知改动、非普通文件、链接目录和只读参考检出均检查；目标目录使用项目内锁防止本安装器并发写入。失败时尝试恢复本次已经写入的文件，若期间存在外部修改则停止覆盖并报告需人工处理。`--stopped` 是操作者确认 DSH 已停止，工具不自行停止进程。

实际安装前须停止 DSH；以下命令已在本机固定基线执行并核验：

```text
node compatibility/pending-notifications/install.mjs apply "F:/Program Files/deepseek-harness" --stopped
```

恢复时同样先停止 DSH，再执行：

```text
node compatibility/pending-notifications/install.mjs restore "F:/Program Files/deepseek-harness" --stopped
```

已通过5项安装副本测试：LF/CRLF逐字节恢复、重复应用/恢复、已知部分安装收敛、未知源码/编译/包版本与用户后续编辑拒绝、混合换行拒绝、越界目录链接及只读参考拒绝；既有其他补丁和客户端文件保留。目录链接测试使用 Windows junction，未以需要额外系统权限的文件 symlink 替代成功结论。真实安装恢复及再次应用已通过，写入中断故障注入尚未验证。

正式编译 `lib/index.js` 另通过同一组4项原Gateway行为测试。在 PowerShell 中将 `DSHM_TEST_PRODUCTION_GATEWAY` 环境变量设为 `1` 后执行上述 `core.test.mjs` 即选择正式产物；此环境变量仅供测试使用。本机 `plan` 返回5文件、0已应用，不改变当前运行的DSH、插件版本、配置或设备授权。

完整进展、手机去重与尚待完成的原生生命周期见[通知接入状态](../../../dsh-mobile/docs/integration/notifications-current.md)。不要在运行中的安装目录手工套用此测试产物。
