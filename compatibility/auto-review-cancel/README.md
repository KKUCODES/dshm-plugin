# 自动审核取消状态补丁

- 状态：已安装至本机实际DSH；25项审核回归、3项安装恢复及MuMu真实取消/续聊通过。
- 维护角色：DSH Mobile项目协作Agent；核验日期：2026-09-28。
- 基线：DSH 0.1.6-alpha.2，源码与编译入口SHA-256固定在[安装器](./patch.mjs)。上游参考保持只读。
- 来源：原[审核实现](../../../deepseek-harness/packages/experimental/auto-review/src/index.ts)、原[取消测试](../../../deepseek-harness/packages/experimental/auto-review/tests/auto-review.spec.ts)、[手机证据](../../../dsh-mobile/docs/integration/auto-review-current.md#审核途中取消与错误分类2026-09-28)。

用户停止后，原模型流已收到abort，但审核插件仅检查自身卸载信号，将被取消的审核归为AUTO_REVIEW_DENIED。原测试明确保留此旧行为。补丁在审核返回和下游guard返回后同时检查调用者信号，返回原cancel状态，由工具运行时生成ABORTED_BEFORE_DISPATCH。

选择修正电脑权威结果，而非手机根据点击记录覆盖错误。真实模型拒绝和未取消的审核故障仍拒绝，规则提示词和权限不变。旧历史不重写。配套新版手机已提供[取消中文提示](../../../dsh-mobile/docs/integration/auto-review-current.md#手机取消提示与共享入口2026-09-28)，电脑补丁本身不修改手机显示。

## 安装与恢复

在plugin目录运行：

```text
node compatibility/auto-review-cancel/prepare-tests.mjs "F:/Program Files/deepseek-harness"
node node_modules/vitest/vitest.mjs run --config compatibility/auto-review-cancel/vitest.config.mjs
node --test compatibility/auto-review-cancel/install.test.mjs
node compatibility/auto-review-cancel/patch.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/auto-review-cancel/patch.mjs apply "F:/Program Files/deepseek-harness" --unloaded
```

先将所有Auto会话恢复其他权限，再用原CLI卸载Auto插件；原包卸载会将仍处Auto的会话转为Full access，不可省略恢复步骤。固定修改src/index.ts和lib/index.js，原字节在artifacts保留；restore替换apply可精确恢复。未知修改在写入前拒绝，第二文件失败回滚已写文件。重启DSH清除模块缓存后再加载插件。

补丁独立于0.1.67插件包，无手机APK变化，不自动启用Auto。本机源码启动已恢复PID44312；测试后Auto和观察插件均移除。

## 验证

- [原版失败](../../artifacts/auto-review-cancel-before.log)：取消后迟到deny/failure仍为AUTO_REVIEW_DENIED，2失败/23通过。
- [候选回归](../../artifacts/auto-review-cancel-after.log)：25通过；保留原测试主体，只修订两个取消预期，不替换生产审核器。
- [安装测试](./install.test.mjs)：幂等恢复、未知修改拒绝、部分写入回滚三项通过。
- [真实Android记录](../../../dsh-mobile/docs/integration/auto-review-current.md#审核途中取消与错误分类2026-09-28)：原版和补丁各一次真实审核取消、工具未执行、后续聊天成功及精确清理。
