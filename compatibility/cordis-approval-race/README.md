# 动态插件并发审批补丁

- 状态：本机已安装；7项原Host回归、2项安装/恢复回归、原DSH运行器91项测试和严格类型检查通过。实际Android验证见[当前记录](../../../dsh-mobile/docs/integration/remote-current.md)。
- 维护角色：DSH Mobile项目协作Agent；最近核验2026-09-27。
- 基线：DSH `0.1.6-alpha.2` / `ddefc45fbc7f8e46dd73185e68295696d1297887`，必须先安装[cordis-inspect-v1](../cordis-inspect/README.md)。上游参考检出保持只读。
- 来源：[原Host回归](./core.test.mjs)、[固定源码变换](./changes.mjs)、[已安装旧版失败证据](../../artifacts/cordis-approval-overlap-installed-before.log)、[最终回归](../../artifacts/cordis-approval-overlap-final-unit.log)、[原91项测试](../../artifacts/cordis-approval-overlap-original-tests-final.log)。

## 原因与行为

第一端批准后，原Host先进入starting-host/client-pending，直到客户端加载完成才结算请求。此时第二端仍能提交rejected或host-half-failed，原resolveRequestRun会立即消费请求，令第一端完成回执失效。

另一个条件错误是runHostHalf使用`!requiresApproval && ...`过滤非预期状态：requiresApproval为true时反而不限制当前阶段。真实Android复验暴露第二端在client-pending重复启动仍被放行，随后补齐对应失败回归。

现在一次人工审批只允许从awaiting-approval进入启动；第二端旧拒绝不再消费已开始的请求，重复启动被拒后产生的host-half-failed也不消费正常启动。真实Host启动失败须已有failed状态，正常首次拒绝、真实Host/Client失败、已授权自动启动的多端行为保持。

取舍：在原Host按阶段校验，保持12个公开接口、认证及生成codec不变；相比增加客户端所有权票据，变更和升级范围更小。此补丁解决已复现的合法客户端竞争，不声称回滚已发生的插件外部副作用或处理所有任意恶意回执。

## 构建、安装与恢复

在plugin目录运行，目标参数为实际DSH目录：

```text
node compatibility/cordis-approval-race/package.mjs "F:/Program Files/deepseek-harness"
node compatibility/cordis-approval-race/install.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/cordis-approval-race/install.mjs apply "F:/Program Files/deepseek-harness" --stopped
```

构建前目标必须为固定inspect基线；先停止已核对的DSH进程再安装。四文件预检，实际改变源码和两个JS入口共三文件，声明保持原字节。生成接口、所有源依赖及安装目标逐一核验；未知内容拒绝，部分写入失败回滚且不覆盖外部修改。

恢复使用`restore`替代`apply`，回到inspect补丁状态。若要继续恢复inspect补丁，必须先恢复本补丁；直接覆盖或绕过基线校验不受支持。打包产物放在项目artifacts中，不承诺其他DSH版本兼容。

新增回归通过`DSHM_APPROVAL_RUNNER`选择原安装入口或候选`artifacts/compatibility/cordis-approval-race/production/lib/index.js`，执行`node --test compatibility/cordis-approval-race/core.test.mjs compatibility/cordis-approval-race/install.test.mjs`。原测试原样复制至artifacts对应tests，使用[专用配置](./vitest.config.mjs)运行；仅Timer从真实DSH安装解析，没有替换运行器或沙箱为测试逻辑。
