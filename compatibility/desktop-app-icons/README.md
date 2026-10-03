# 电脑应用图标：内部服务扩展

- 状态：四文件扩展已安装，插件0.1.49及配套网关/APK已接入；MuMu主聊天、旁栏和自有列表的实际Windows图标通过。完整Remote仍未完成。
- 维护角色：DSH Mobile项目协作Agent；最近核验：2026-09-27。
- 基线：原DSH `0.1.6-alpha.2` / `ddefc45fbc7f8e46dd73185e68295696d1297887`，先安装[desktop-apps-v1](../desktop-apps/README.md)。参考检出只读。
- 来源：[原图标读取](../../../deepseek-harness/packages/host/open-in-app/src/icons.ts)、[原图标缓存及网页边界](../../../deepseek-harness/packages/host/open-in-app/src/index.ts)、[扩展变换](./changes.mjs)。

## 行为和取舍

`dshmDesktopApps.icon(appId, signal?)`只在电脑内部提供，按原目录解析应用并复用原iconOf缓存，返回PNG/SVG字节或null。0.1.49通过固定Remote应用ID操作传输，另有可见会话/工作区及原连接核验；不直接开放内部服务。未知/不可用应用、空或超过256 KiB的图标返回null，返回Buffer副本避免调用者修改原网页缓存。没有新增文件路径入口、HTTP路由或应用启动。

原网页登录验证、图标路径解析及平台提取保持不变。取消/卸载后拒绝交付；原提取器已开始的系统调用仍按原超时结束，并非强行终止。与代理原网页登录路由相比，内部服务不需要传播网页登录凭据；与复制平台图标代码相比，它继续使用原应用目录及缓存。

## 安装包与还原

[prepare.mjs](./prepare.mjs)在项目artifacts内从只读参考派生源码，叠加原应用补丁。[package.mjs](./package.mjs)只接受完整desktop-apps-v1的固定七文件前置状态及原依赖，重新严格编译后生成四文件图标扩展包。逐文件预检后原子替换，部分失败仅回滚本次写入，遇到外部修改不覆盖。

在插件目录运行：

```text
node compatibility/desktop-app-icons/prepare.mjs
node compatibility/desktop-apps/typecheck.mjs "F:/Program Files/deepseek-harness" --icons --emit
node compatibility/desktop-app-icons/package.mjs prepare "F:/Program Files/deepseek-harness"
node compatibility/desktop-app-icons/package.mjs plan "F:/Program Files/deepseek-harness"
```

实际DSH停止后才可执行`apply <root> --stopped`或`restore <root> --stopped`。本扩展restore退回应用服务v1；如需还原更早基线，应先还原本图标扩展，再用desktop-apps原安装器还原。图标扩展安装期间，旧安装器会将这四文件识别为外部变化并拒绝覆盖，这是预期保护。

## 证据与下一步

- [五项核心测试](../../artifacts/desktop-app-icons-core.log)使用真实Cordis、原提取器和临时Linux桌面项/PNG文件；平台及启动为显式替身，不代表Windows实际图标已验证。覆盖共用缓存/副本隔离、未知/超限、原401/403、取消/卸载和在途取消。初版夹具选择无Linux图标声明的Cursor，后改为原目录声明的VS Code；未改变生产目录。
- [四项安装测试](../../artifacts/desktop-app-icons-install.log)通过副本安装/重复安装/恢复、未知目标/依赖/只读参考拒绝、部分失败回滚及外部修改保留。
- [严格编译](../../artifacts/desktop-app-icons-typecheck.log)、[原九项应用服务回归](../../artifacts/desktop-app-icons-base-regression.log)通过。实际安装根plan为图标0/4、原应用7/7，DSH18868与网关77392继续运行。
- 后续实际安装：经原CLI安装0.1.49后停止已核验DSH，apply写入4文件、plan复核4/4，DSH50364与新版网关21480恢复；新版APK保留数据安装。MuMu原日常入口解码explorer/cursor/vscode/intellij四种32×32 PNG，主聊天/旁栏选择取消、会话身份/草稿保留且无页面错误。详细报告及字节哈希见[手机实际记录](../../../dsh-mobile/docs/integration/remote-current.md#电脑应用图标接入2026-09-27)。没有模型请求/应用启动/Key或权限修改；本机还原操作未执行，恢复仍由副本测试证明。完整R16及其他应用实际启动/撤权等继续。
