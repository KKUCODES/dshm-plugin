# 文件元数据刷新兼容补丁

- 状态：固定基线补丁已安装，本机 MuMu 实际工具写入后的版本、字节数和预览验证通过。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-09-26。
- 基线：dsh 0.1.6-alpha.2，参考 commit `ddefc45fbc7f8e46dd73185e68295696d1297887`，参考检出只读。
- 来源：[补丁与安装器](./patch.mjs)、[回归](./patch.test.mjs)、[手机实际验收](../../../dsh-mobile/docs/integration/remote-current.md#文件实时更新与并发容量2026-09-26)。

原 file provider 收到 changed 时只替换 version，保留旧 bytes。真实文件34→33字节后手机仍显示34。补丁让新版本进入既有 stat 路径，取得完整元数据；相同版本仍去重，失败/消失/恢复/取消沿原流程。不新增协议或文件权限，也不提供操作系统文件监视。

选择修正原模块，避免另写手机私有 provider 导致两套语义。每次新版本会多一次原 stat 请求。安装器只接受三个已核验文件的完整哈希与唯一替换锚点：源码 provider、编译 provider 和浏览器 client.js。直接作最小产物修补，避免重新打包无关依赖；版本升级必须重新核验。声明和 Host 代码不变。源码模式和现有浏览器产物同时更新。

在 plugin 目录执行：

```powershell
node compatibility/file-metadata/patch.mjs prepare "F:/Program Files/deepseek-harness"
node --test compatibility/file-metadata/patch.test.mjs
node compatibility/file-metadata/patch.mjs plan "F:/Program Files/deepseek-harness"
# 停止 DSH 后安装；完成后按原命令重新启动
node compatibility/file-metadata/patch.mjs apply "F:/Program Files/deepseek-harness" --stopped
# 需要撤回时同样先停止 DSH
node compatibility/file-metadata/patch.mjs restore "F:/Program Files/deepseek-harness" --stopped
```

prepare 仅在原始安装上生成项目内 before/after 产物，已修补后不要重新定义原始基线。安装/恢复核对所有文件，保留 LF/CRLF，拒绝未知修改和路径链接，写入锁防并发，失败回滚本次写入。六项测试包括实际浏览器模块原问题复现/修复、原 ChangeFeed 去重/恢复/取消、源码和编译 provider 一致性、安装幂等/字节恢复及拒绝未知修改。实际安装恢复未执行，恢复由隔离副本验证；其他 DSH 版本未验证。
