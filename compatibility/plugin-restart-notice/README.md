# 插件升级的重启提示

- 状态：`plugin-restart-notice-v1` 已安装本机 DSH，真实 MuMu 新装、升级、重启生效及清理通过。
- 维护角色：项目协作 Agent；最近核验：2026-10-03。
- 基线：DSH `0.1.6-alpha.2`，`@deepseek-ai/dsh-client-ui-plugin-manager` 同版本；三文件固定哈希见 [changes.mjs](./changes.mjs)。
- 来源：上游[安装服务](../../../deepseek-harness/packages/boot/plugin-manager/src/index.ts)、[原控制器](../../../deepseek-harness/packages/client/ui-plugin-manager/src/client/manager-store.ts)、[原页面](../../../deepseek-harness/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx)。

## 修复范围

原服务对已有包安装返回 `restart-required`，原页面却仍提供“立即启用”，控制器还会提交启用请求。启用已加载的 Host 模块不能证明新版本执行。补丁让需重启结果只保留原“完成”关闭操作，控制器也拒绝此时再次启用；首次可立即应用的安装保持原路径。手机复用电脑插件管理局部界面，因此无需新 APK。

选择遵守原重启契约，维护两处条件和一个编译文件。另一方案是实现 Host 热替换，需要处理模块缓存、依赖图、服务销毁与在途任务，兼容和测试范围显著更大；本修复不改变这些生命周期。客户端局部组件换版与 Host 执行换版分别验收，不互相外推。

## 构建、安装与恢复

在插件项目目录执行，`<DSH目录>` 是实际运行副本，参考检出保持只读：

```text
node compatibility/plugin-restart-notice/build.mjs <DSH目录>
node --test compatibility/plugin-restart-notice/core.test.mjs compatibility/plugin-restart-notice/install.test.mjs
node compatibility/plugin-restart-notice/install.mjs plan <DSH目录>
node compatibility/plugin-restart-notice/install.mjs apply <DSH目录> --stopped
node compatibility/plugin-restart-notice/install.mjs restore <DSH目录> --stopped
```

构建仅读取匹配的原基线，严格类型检查并使用原 clientBundle 构建，产物在 [artifacts](../../artifacts/compatibility/plugin-restart-notice/manifest.json)。已安装机器保留本次产物，不再对修改后的源文件运行构建；未知内容拒绝处理。安装和恢复前必须停止实际 DSH，`--stopped` 是操作者确认，不是进程检测。三文件全量预检、重复安装识别、写入失败回滚及恢复由安装器处理；恢复后再启动 DSH。

## 验证

四项回归通过：旧控制器复现错误启用、补丁拒绝并允许关闭、正常首次启用、副本幂等/恢复/未知编辑拒绝/失败回滚。控制器前后版本读取构建时保存的固定文件，避免补丁安装后误把新代码当原基线。

[实际手机报告](../../../dsh-mobile/artifacts/plugin-restart-run-android.json)记录：首次 0.0.1 启用后 Host PID18788 写出版本；同名升级 0.0.2 后手机显示“下次启动后加载”、没有“立即启用”，Host 仍为旧版本。正常重启后 PID51668 写出 0.0.2，手机详情显示新版本与一个运行中组件。随后手机卸载、收回管理权限，原聊天和草稿恢复、页面错误为空。[截图](../../../dsh-mobile/artifacts/plugin-restart-required-android.png)已实际查看。

只证明当前固定基线、本地同名 Host 包的重启边界；不提供任意第三方热更新或升级副作用回滚保证。运行 `node scripts/check-plugin-restart-report.mjs`（手机项目目录）可重查保存的证据，不会重跑设备操作。
