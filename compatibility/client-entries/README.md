# 手机插件增量更新兼容补丁

- 状态：client-entries-v1已安装到本机固定基线DSH；新版MuMu组件开关保持原详情页、电脑同步通过，完整插件生命周期仍继续验收。
- 维护角色：DSH Mobile 项目协作 Agent。
- 最近核验：2026-09-25。
- 基线：dsh 0.1.6-alpha.2，commit `ddefc45fbc7f8e46dd73185e68295696d1297887`。参考检出只读。
- 来源：[变更定义](./changes.mjs)、[手机调用](../../../dsh-mobile/src/remote-plugins.jsx)、[核心回归](./core.test.mjs)、[安装回归](./install.test.mjs)、[真实入口证据](../../../dsh-mobile/docs/integration/plugin-management-current.md)。

## 原因与选择

手机原来对每次非核心图变化执行release/bootstrap/activate，未变化的管理页也会卸载，组件开关因此返回插件列表。仅记录并恢复页面路径不能保留插件任意内部状态；另写一套手机模块加载器会重复维护原生命周期。因此扩展原ClientEntries，增加本地调用`syncSelected(graph, pluginIds)`，继续使用原Loader、导入、替换与清理。

完整模块图保留用于依赖解析，仅apply名单被筛选；名单必须来自本次图、不得重复。增量比较包括名单，关闭再开启无需改代码版本；HMR不能启动未选插件。原桌面`sync(graph)`仍全量运行。手机诊断清单独立保留完整图，显示被手机承担或等待接口的模块。模块bootstrap本身版本变化作为核心变化交给已有整套重建流程。旧电脑没有新方法时仍采用旧重建路径，不调用会启动桌面布局的全量sync。

## 构建与交付

在plugin目录执行：

```powershell
node compatibility/client-entries/build-runtime.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/client-entries/core.test.mjs compatibility/client-entries/install.test.mjs
node compatibility/client-entries/install.mjs plan "F:/Program Files/deepseek-harness"
# 先停止DSH，再执行安装或恢复
node compatibility/client-entries/install.mjs apply "F:/Program Files/deepseek-harness" --stopped
node compatibility/client-entries/install.mjs restore "F:/Program Files/deepseek-harness" --stopped
```

首次构建只接受核验过的原始浏览器产物和声明哈希；已安装时不要用其产物重新定义基线。交付输出位于`artifacts/compatibility/client-entries`，保留源码原文、补丁副本、浏览器产物、声明和原文件。安装器一次核对5个源码输入，写入3文件：entries.ts、lib/client.js、lib/types/client/entries.d.ts。完整包版本、原始/目标字节和路径均核验，未知编辑与目录链接拒绝，部分失败回滚本次写入；恢复保留原换行。声明之外的中间编译文件需在以后完整重建时由原构建链生成，本补丁不覆盖它们。

7项回归覆盖选择名单、未变化实例、关闭/恢复、桌面全量语义、销毁、非法名单、LF/CRLF安装恢复及未知修改/路径拒绝；严格类型检查通过。手机原组件回放先复现状态1→0，再验证修改/移除/重新加入/重连保持1、桌面布局未加载、样式和全局对象清理。手机253项、Web/APK构建与Android lint通过。真实MuMu关闭/开启组件均navigationReset=false；完整安装、包启停及卸载回归通过。实际F盘恢复未执行，仅安装副本证明字节恢复；任意第三方插件、Worker及在途撤销不由本批证明。
