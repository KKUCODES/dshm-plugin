# Remote 只读缓存适配

状态：本地候选完成，尚未公开发布。维护：DSHM 插件；核验：2026-10-15；任务：KKC-60。

插件公布 `syncCacheVersion: 1`。仅对会话列表、历史分页和工作区/会话/控制流的首个基线提供差量编码；编码前仍通过原 DSH 接口读取当前结果。后续实时帧原样转发，任何写操作均不使用缓存。

现行中转允许的 RPC payload 增加可选 `_dshmSync` 提示；[插件入口](../../src/remote-adapter.ts)验证并剥离该字段，不把它传给 DSH。没有提示的旧 App 保持原始结果。基线缓存按电脑、设备、授权范围、DSH 版本和原请求隔离，128 项 / 32 MiB、单项 2 MiB、七天；失配或插件重启回退完整结果。

[资源校验器](../../src/resource-validator.ts)继续通过原 `clientModules.fetchBundle` 校验存在性，再提供 SHA-256 ETag。HEAD 确认不发送正文，图版本变化时重新计算内容指纹；删除和拒绝不返回旧结果。该行为不修改 DSH 或 SDK。

[新增 4 项回归](../../tests/sync-cache.test.ts)和官方 rc.2 / alpha.2 两版隔离构建通过；真实 alpha.2＋生产网关＋MuMu 已验证资源正文 12,299,991 B → 0 B，首批基线 157,550 B → 7,937 B，电脑改名实时同步、进程重开及损坏回退。完整规则、失败边界、限制和证据见[手机端专项](../../../dsh-mobile/docs/integration/remote-cache-current.md)。rc.2 本轮未重跑 Android，公网与任意第三方插件热更新未据此通过。

这次源码不属于已发布的 `0.1.84-latest.0`。本机 `0.1.85-latest.0` 仅用于隔离验收，不表示已公开发布；中转服务器无需部署升级，普通聊天不受影响。

发布时先提交共享协议，把两端 `ci/release.json` 的 `backendCommit` 更新为实际协议提交，再升级版本、重建 `lib/` 并运行 Actions；当前旧发行固定值没有被改成尚不存在的远端提交。
