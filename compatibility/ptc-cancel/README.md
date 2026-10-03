# PTC 取消分类补丁

- 状态：已安装，原125项PTC回归、3项安装/恢复检查、实际MuMu停止及续聊通过。
- 维护角色：DSH Mobile协作Agent；最近核验：2026-10-01。
- 来源：原[PTC实现](../../../deepseek-harness/packages/core/tools/src/ptc.ts)、[回归](../../../deepseek-harness/packages/core/tools/tests/ptc.spec.ts)、[手机验证](../../../dsh-mobile/docs/integration/ptc-runtime-current.md#ptc停止分类修复2026-10-01)。

原run_code将运行时abort统一转换为CODE_RUN_FAILED。补丁根据运行时结构化error.kind，取消返回ABORTED/AbortError，其余仍为CODE_RUN_FAILED；保留完整错误诊断和Captured output。手机已有取消渲染可直接使用，不需要新APK，旧历史不重写。相比手机识别正文或点击记录，该方案保留电脑权威状态，并覆盖其他接入同结果的客户端。

## 安装与恢复

### 内部工具原样抛出取消原因（2026-10-01）

增量补丁已安装并经真实Android验证。原registry捕获工具抛出的signal.reason时丢失取消语义；[增量转换](./prepare-inner.mjs)仅在signal已取消且异常与reason为同一值时返回ABORTED。取消期间独立抛出的错误仍保留，不能把所有catch改为取消。手机实际使用conversation-nodes/tool.ts，已保留结构化error，不需要修改APK；旧model/tool-call-tree.ts遗漏字段不在正式入口。

[新增回归](./inner-regression.ts)通过原PTC绑定及registry调用链覆盖上述两种结果。原版1失败/126通过，候选127通过；测试runtime是原套件替身，真实模型与手机证据另见[实际验收](../../../dsh-mobile/docs/integration/ptc-runtime-current.md#内部工具停止修复后实际验证2026-10-01)。

```text
node compatibility/ptc-cancel/prepare-inner.mjs "F:/Program Files/deepseek-harness"
node node_modules/vitest/vitest.mjs run --config compatibility/ptc-cancel/vitest-inner.config.mjs
node compatibility/ptc-cancel/patch-inner.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/ptc-cancel/patch-inner.mjs apply "F:/Program Files/deepseek-harness" --stopped
```

prepare要求已安装外层取消补丁的固定基线；apply前停止DSH。安装器复用双入口预检/回滚，用restore精确恢复增量。设置环境变量DSHM_PTC_INNER_TEST=1后运行install.test.mjs可检查增量安装：幂等恢复、未知修改拒绝和失败回滚3项通过；旧外层安装3项也通过。当前DSH PID9512正常运行，临时等待插件已卸载，管理权限false。

增量修改同一个编译入口，若要卸载外层补丁，须先restore内部增量，再restore外层；未知组合仍拒绝写入。prepare不是对已补丁源码重新取基线的命令。

在plugin目录执行；先prepare和测试，停止DSH后再apply，随后正常重启。

```text
node compatibility/ptc-cancel/prepare.mjs "F:/Program Files/deepseek-harness"
node node_modules/vitest/vitest.mjs run --config compatibility/ptc-cancel/vitest.config.mjs
node --test compatibility/ptc-cancel/install.test.mjs
node compatibility/ptc-cancel/patch.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/ptc-cancel/patch.mjs apply "F:/Program Files/deepseek-harness" --stopped
```

prepare只接受[固定基线](./prepare.mjs)；安装后再次运行测试不需prepare。restore替换apply可精确恢复。两个入口预检，未知修改拒绝，第二个写入失败回滚；参考源码禁止安装。补丁独立于插件包。当前正常DSH PID55988；无临时配置或权限提升。

- [原版回归](../../artifacts/ptc-cancel-before.log)：1失败/124通过，失败正是取消码仍为CODE_RUN_FAILED。
- [候选回归](../../artifacts/ptc-cancel-after.log)：125通过，原异常/超时/输出/内部工具等测试保留。
- [安装测试](./install.test.mjs)：幂等恢复、未知修改拒绝、写入失败回滚，3通过。
- [安装回执](../../artifacts/compatibility/ptc-cancel/receipt.json)：源码和编译入口均安装；真实手机验证见上述链接。不外推所有PTC内部工具取消竞争。
- 补丁后[真实文件缺失失败](../../../dsh-mobile/artifacts/ptc-missing-patched-observe-android.json)和[历史重入](../../../dsh-mobile/artifacts/ptc-missing-patched-replay-android.json)通过，内层read与外层run_code仍为error，无重试；[续聊](../../../dsh-mobile/artifacts/ptc-missing-patched-resume-observe-android.json)和[清理](../../../dsh-mobile/artifacts/ptc-missing-patched-cleanup-android.json)通过。证明真实异常没有误归为取消，不仅依赖隔离回归。
