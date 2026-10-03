# 插件安装与查询取消补丁

- 状态：固定基线已安装到本机，真实MuMu两种安装取消通过；完整安装异常尚未完成。
- 维护角色：DSH Mobile 项目协作 Agent。
- 最近核验：2026-09-25。
- 基线：DSH 0.1.6-alpha.2，commit `ddefc45fbc7f8e46dd73185e68295696d1297887`，本机execa 10.0.0。
- 来源：[变更](./changes.mjs)、[构建](./build.mjs)、[安装器](./install.mjs)、[进程检查](./cancellation.test.mjs)、[安装恢复检查](./install.test.mjs)、[手机实测](../../../dsh-mobile/docs/integration/plugin-management-current.md)。

## 行为与边界

真实手机点击取消安装后，Windows的启动父进程已退出，而pnpm Node子进程仍下载，手机最终出现结果未知超时。原包管理器未启用execa的killDescendants。补丁对安装/卸载及包信息查询启用此原有选项，由进程库处理Windows进程树和POSIX进程组；不新增自己的进程扫描器、不修改手机组件或审批语义。

采用库的现有能力，比自己维护taskkill、信号转发和退出竞争成本更低。安装取消仍等待原管理器完成退出及package.json/pnpm-lock.yaml恢复；原有已批准安装脚本不会因取消回滚。进入applying阶段仍可能返回too-late。断线或收回设备权限不等于取消已经提交的安装。

只读参考检出保持不动。交付覆盖一份operations.ts源码、包入口lib/index.js和独立operations运行入口lib/types/operations.js；七个构建源码输入及固定原产物哈希必须匹配。原有后台/前台/通知/加载器补丁不受影响。源码/编译产物在同一个事务中安装或恢复，拒绝未知编辑和目录链接。原类型/API未改变。

## 构建、检查及安装

在plugin项目目录执行；构建只接受未打本补丁的固定版本，已安装后不要重新取当前文件作为原始备份。

```powershell
node compatibility/plugin-install-cancel/build.mjs 'F:/Program Files/deepseek-harness'
node compatibility/plugin-install-cancel/typecheck.mjs
node --test compatibility/plugin-install-cancel/cancellation.test.mjs compatibility/plugin-install-cancel/install.test.mjs
node compatibility/plugin-install-cancel/install.mjs plan 'F:/Program Files/deepseek-harness'
# 确认DSH停止后执行，并按原方式启动DSH。
node compatibility/plugin-install-cancel/install.mjs apply 'F:/Program Files/deepseek-harness' --stopped
# 恢复也需先停止DSH。
node compatibility/plugin-install-cancel/install.mjs restore 'F:/Program Files/deepseek-harness' --stopped
```

本机7项回归及严格类型检查通过；进程测试覆盖取消安装、取消查询与查询超时，安装测试覆盖LF/CRLF、重复安装、恢复和未知修改拒绝。隔离的直接Node进程场景未复现真实pnpm.cmd的原故障，不能冒充原问题的RED证据；RED来自手机真实下载超时，GREEN来自同一手机入口的下载已开始/已退出及文件哈希核对。POSIX实际运行、下载后的脚本批准、applying竞态、断线/撤权及长安装超时仍待专项。

2026-09-25 07:50:25 UTC，MuMu「取消安装」「取消安装并关闭」均通过；测试服务不发送包字节，不执行插件脚本，包清单/锁文件/脚本批准配置哈希不变。电脑源码入口已重启为PID21580，网关60668、插件0.1.39及App未变。实际F盘恢复未执行，副本恢复通过。权限已收回，手机管理入口拒绝，基本聊天保留。
