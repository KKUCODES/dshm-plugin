# 电脑兼容补丁交付核对

固定新版的[Windows已有文件权限人工修复工具](./latest-upstream/acl-repair.md)提供独立生成、修复和备份恢复说明。生成器不执行权限修改，原失败路径已通过两种实际手机入口；此工具不在当前tgz内，也不替代下述旧版补丁组合或完整新版支持验收。

上游升级检查见[DSH 0.2.1-alpha.1 兼容报告](./latest-upstream/README.md)。隔离候选已通过新版实际 Host 加载及基础会话协议同步；手机 UI、Android 与完整补丁组合仍未完成。下述交付组合只针对旧基线，不能直接套用新版。

- 状态：本机 DSH `0.1.6-alpha.2` 的已交付组合已做只读文件核对；不代表完整 Remote 功能验收完成。
- 维护角色：项目协作 Agent；最近核验：2026-10-03。
- 来源：[只读检查器](../scripts/check-installed-compatibility.mjs)、[当前文件报告](../artifacts/installed-compatibility-current.json)、[组合链回归](../tests/compatibility-chain.test.mjs)及下表各独立补丁。

## 本机检查

在 `plugin` 目录运行：

```text
node scripts/check-installed-compatibility.mjs "F:/Program Files/deepseek-harness"
node --test tests/compatibility-chain.test.mjs
```

检查器只读取明确的程序源文件、编译文件、包元数据与补丁产物，将报告写入本项目 `artifacts`。不安装/恢复补丁，不改运行配置或进程，不读取环境文件、凭据、用户聊天或遥测目的地。失败退出1。

2026-10-03 实际结果：**112个修改文件匹配最终补丁组合，17份manifest已登记哈希；源码启动命令、两个启动载入文件与两个scope依赖链接匹配**，errors为空。两个组合链回归通过：识别叠加后的最终版本，拒绝分叉、断链或循环。

检查同一个文件的全部before→after关系，要求单条完整变更链，才比较电脑当前最终哈希；不能因文件匹配任意历史版本就认为全部已安装。原补丁以LF规范化校验的源码仍沿用该规则，其他入口比较原字节，报告明确记录比较方式。没有manifest的补丁从固定基线和已有变换计算最终值，并核对已保存产物。

这证明磁盘文件一致，不证明进程已重新加载每个模块，也不是源码到二进制的可重现构建证明。各功能的实际手机验证仍看独立记录；当前DSH最近一次重启及新Host版本执行见[重启验收](./plugin-restart-notice/README.md)。整个产品仍看[收尾验收表](../../dsh-mobile/docs/integration/completion-audit.md)。

## 覆盖的交付组合

| 补丁 | 检查范围与顺序 |
| --- | --- |
| [后台输出](./background-output/README.md) → [前台输出](./foreground-output/README.md) | 源码/编译接口叠加，保留独立输出与原模型消费语义；额外核对Bash/Pwsh工具解析到同一个scope实例 |
| [源码启动](./source-start/README.md) | `pnpm dsh web`脚本值、原启动依赖基线、两份`.dshm-source`载入文件 |
| [待办通知](./pending-notifications/README.md) | Gateway通知观察接口的源码及编译入口 |
| [客户端增量](./client-entries/README.md) | 模块目录与原编译入口 |
| [安装取消](./plugin-install-cancel/README.md) | 原包安装操作源码及编译入口 |
| [文件元数据](./file-metadata/README.md) | 原stat刷新源码和两个编译入口 |
| [电脑应用](./desktop-apps/README.md) → [应用图标](./desktop-app-icons/README.md) | 后续图标补丁覆盖同文件时按完整链核对，旧结果不能当最新结果 |
| [动态插件](./cordis-inspect/README.md) → [审批竞争](./cordis-approval-race/README.md)、[客户端生命周期](./cordis-client-lifetime/README.md) → [目录同步](./cordis-inventory-sync/README.md) | 按实际同文件哈希关系确认组合，不靠文档行顺序猜测安装依赖 |
| [PowerShell编码](./pwsh-output-encoding/README.md) | 在前台输出基线上核对源码和运行入口 |
| [PTC取消](./ptc-cancel/README.md) | 外层取消与内部工具取消两个增量；同编译入口必须是叠加后的最终值 |
| [自动审核取消](./auto-review-cancel/README.md) | 原审核服务源码与编译入口 |
| [模型发现](./model-discovery/README.md) | 初始受限发现接口及endpoint后续增量，保留实际固定基线 |
| [升级重启提示](./plugin-restart-notice/README.md) | 页面/控制器及编译客户端三文件 |

本清单覆盖当前维护的18个补丁目录，其中PTC和模型发现各含后续增量。它不是一键安装器。安装/恢复仍须遵守每个补丁的基线、停止条件、载入依赖与恢复顺序；未知上游版本不能直接套用。参考检出保持只读。
