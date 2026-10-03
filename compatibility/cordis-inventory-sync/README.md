# 动态插件清单同步补丁

状态：**已安装，真实 Android 双端审批、停止和移除验收通过。** 维护角色：项目协作 Agent；最近核验：2026-09-27。重启后连接尚未就绪时的读取报错仍有待修复，不代表完整 Remote 验收完成。

此补丁接续已安装的 `cordis-client-lifetime-v1` 与 `cordis-approval-race-v1`，针对 DSH `0.1.6-alpha.2` 的固定六份源码做 SHA-256 校验。安装清单核验23个文件，其中21个发生改变。不会修改上游参考检出，构建只输出本项目 artifacts。

## 已复现的问题与修复

- 原清单读取中收到 refresh 会被丢弃。候选将其合并为一次后续读取，不增加定时轮询。
- 本页移除后，先前的读取仍可把旧行发布回来。候选在明确移除时使旧读取失效，并允许调用方发起新的读取；重连后允许电脑复用相同标识。
- 原 Host 对定义、新版本和停止后移除没有完整清单通知；运行中撤回的通知又早于注册表删除。候选增加无参数的 `cordis/inventory-changed`，在注册表变更完成后发出，通过原 Remote 事件白名单转发，由原手机局部组件触发重读。不复用需要真实 runId 的 `dynamic-retract` 伪造移除事件。

来源：[固定源码变换](./changes.mjs)、[候选构建](./build.mjs)、[客户端回归](./core.test.mjs)、[真实 Host 回归](./host.test.mjs)、[原事件组装双订阅测试](./events.test.mjs)。

## 当前验证

在插件项目目录执行：

```powershell
node compatibility/cordis-inventory-sync/build.mjs 'F:/Program Files/deepseek-harness'
$env:DSHM_INVENTORY_SOURCE='artifacts/compatibility/cordis-inventory-sync/source/extensions/ui-cordis/src/client/inventory.ts'
$env:DSHM_INVENTORY_RUNNER='artifacts/compatibility/cordis-inventory-sync/runtime/runner.mjs'
$env:DSHM_APPROVAL_RUNNER=$env:DSHM_INVENTORY_RUNNER
node --test compatibility/cordis-inventory-sync/core.test.mjs compatibility/cordis-inventory-sync/host.test.mjs compatibility/cordis-inventory-sync/events.test.mjs compatibility/cordis-approval-race/core.test.mjs
node node_modules/vitest/vitest.mjs run --config compatibility/cordis-inventory-sync/vitest.config.mjs
$env:DSHM_CORDIS_RUNNER_TEST=$env:DSHM_INVENTORY_RUNNER
node node_modules/vitest/vitest.mjs run --config compatibility/cordis-inspect/vitest.config.mjs
```

候选的 Host/Client 完整入口严格类型检查通过，原浏览器构建预设成功产出模块；19 项专项（含7项既有审批竞争）、91 项原运行器及9项生成 RPC/RemoteAdapter 回归通过。事件测试使用原事件组装产生两个真实独立迭代器，捕获它交给 Gateway 的 source；**不是实际手机或网络认证验收**。

默认不设置候选环境变量时，清单和 Host 测试使用当前安装入口。修复前客户端原三项用例中两项失败、Host五项中四项失败；安装后实际入口18项（含审批竞争）通过。

## 安装与恢复

构建要求目标处于前述两个既有补丁的基线；已安装本补丁时不要直接重新构建。完整产物由[构建](./build.mjs)、[原生成器通知提取](./generate.mjs)和[打包](./package.mjs)产生；[安装器](./install.mjs)拒绝未知改动或参考检出，并预检所有文件，写入失败回滚。执行apply/restore前停止DSH。

```powershell
node compatibility/cordis-inventory-sync/build.mjs 'F:/Program Files/deepseek-harness'
node compatibility/cordis-inventory-sync/generate.mjs 'F:/Program Files/deepseek-harness'
node compatibility/cordis-inventory-sync/package.mjs 'F:/Program Files/deepseek-harness'
node --test compatibility/cordis-inventory-sync/install.test.mjs
node compatibility/cordis-inventory-sync/install.mjs plan 'F:/Program Files/deepseek-harness'
node compatibility/cordis-inventory-sync/install.mjs apply 'F:/Program Files/deepseek-harness' --stopped
# 恢复到原审批+生命周期基线；随后才能恢复更早的补丁。
node compatibility/cordis-inventory-sync/install.mjs restore 'F:/Program Files/deepseek-harness' --stopped
```

原生成器需要两个既有版本标识的显式字面量类型，候选仅补齐类型，不改变运行值。聚焦包生成会丢失其他插件全局类型扩展，因此只提取它生成的新增事件，合入现有反射表；完整旧反射和原RPC codec保持不变，没有安装范围外的生成文件。[安装测试](./install.test.mjs)覆盖重复安装、完整恢复、未知文件拒绝、注入写入失败回滚及反射仅新增事件；三项通过。新反射与真实RemoteAdapter的九项回归通过。

## 实际 Android 验收与剩余范围

同一MuMu两个独立UID/凭据/WebView，经真实网关和原Host：v2批准期间另一端拒绝、v3批准期间另一端重复批准，均收到原结算拒绝，Host保留client-pending并最终running；v3实际Host回声成功。随后停止并移除，两端原条目都消失，原inventory为空，草稿保留，无页面/资源错误。测试端撤销后界面清理，显式重连401拒绝。报告与边界见下方当前矩阵。

驱动改为观测固定测试端实际收到的原结算拒绝，避免把可能重新展开的审批弹层当成动作完成条件。首轮因日常App未停止不满足代理隔离条件而失败，证据保留；准备步骤现自动停止日常App，双端驱动再正常重新打开。

重启收尾首次进入记录过`remote_not_connected`，之后重入成功。这是尚待修复的连接就绪窗口；不将成功重入当作首轮失败不存在。更广插件兼容和完整Remote仍未完成。

实际范围见[手机当前矩阵](../../../dsh-mobile/docs/integration/remote-current.md#动态清单同步安装与双端验收2026-09-27)。完整 Remote 与 R13 保持未完成。
