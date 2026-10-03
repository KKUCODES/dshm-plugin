# 插件知识总目录

版本管理：[独立仓库边界与相邻构建依赖](../../README.md#git-仓库边界)。源码与兼容补丁脚本纳入本地 Git；生成产物、环境配置及联调证据留在本机，远端后续单独关联。

补丁交付：[当前组合及只读安装核对](../../compatibility/README.md)。112个修改文件、源码启动及scope依赖匹配；检查叠加后的最终值，不能用任意历史版本匹配冒充全部已安装。文件核对不替代功能验收。

插件升级提示：[固定基线补丁、安装恢复与真实Host重启验证](../../compatibility/plugin-restart-notice/README.md)。三文件已安装，四项回归与MuMu首次启用/升级/重启后执行新版本通过，测试插件及临时管理已清理。

通知作用域：[0.1.75待办通知修复](../../../dsh-mobile/docs/integration/notifications-current.md#待审批与提问通知标题修复2026-10-03)。真实插件fiber回归及Android标题/取消清理通过；直接读取未注入sessions曾中断通知流，使用公开可选服务读取修复。

草稿模型发现：[独立受限命名空间与HTTP验证](../../compatibility/model-discovery/README.md)，拒绝重定向；补丁及0.1.73已安装，配套手机实际无认证/临时Key/已有认证与取消路径已接入，具体边界见[手机验收](../../../dsh-mobile/docs/integration/model-settings-compatibility.md)。

PTC取消：[结构化分类、固定基线安装与真实手机验证](../../compatibility/ptc-cancel/README.md)。电脑运行时abort保留为ABORTED，部分输出保留；实际安装与专项验证通过。

自动审核取消：[权威结果、固定基线安装恢复与真实手机验证](../../compatibility/auto-review-cancel/README.md)。实际电脑已安装，停止不再记作模型拒绝，原拒绝规则保留。

模型卡片：[只读目录投影、凭据状态和异步一致性边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#模型卡片只读投影2026-09-27)，0.1.67配套网关/App已安装，官方/内置草稿MuMu通过。

Windows命令编码：[根因、安装恢复与正式入口验收](../../compatibility/pwsh-output-encoding/README.md)。补丁已安装；真实电脑和Android新命令中文输出通过，5.1/7只读沙箱与普通执行器通过，历史乱码不恢复。

服务协议：[原运行时声明、schema选项与原配置校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#自定义服务协议切换2026-09-27)，0.1.66已安装，通过MuMu保存与电脑请求切换；不开放任意设置路径。

动态清单同步：[补丁安装恢复与真实双端验收](../../compatibility/cordis-inventory-sync/README.md)。23文件补丁已安装，双端审批竞争及移除旧行清理通过；重启时连接未就绪的读取报错仍待修复。

动态审批并发：[阶段校验增量补丁](../../compatibility/cordis-approval-race/README.md)。固定inspect基线上四文件预检、三文件改变；原Host/生成RPC回归通过，真实手机两种竞争已保住请求，移除后清单残留仍待修复。

提供方真实写入：[专用自定义路由的MuMu保存与清理](../../../dsh-mobile/docs/integration/remote-current.md#专用提供方的真实手机管理2026-09-27)。新增/移除、部分标量/模型能力/兼容/地址及独立Key引用启用通过；本机原认证管理接口完成临时授权并收回，真实Key填写和其他范围仍待验。

客户端生命周期：[旧目录同步与迟到错误清理](../../compatibility/cordis-client-lifetime/README.md)。16文件补丁已安装；MuMu普通重启及有实际动态包的审批、重启恢复、手动运行/Host调用/移除通过，无控制台或资源错误；双端与实际撤销等专项仍待验。

官方模型：[固定llm-deepseek清单与原字段保留](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#官方deepseek模型清单2026-09-27)，0.1.65已安装；[实际名称保存、目录同步与恢复](../../../dsh-mobile/docs/integration/remote-current.md#官方模型清单的真实手机保存2026-09-27)通过，其他字段继续待验。

既有提供方Key：[仅无引用路由、版本确认与原生衔接](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#既有提供方启用key2026-09-27)，0.1.64已安装，真实授权启用待验。

提供方新增：[原目录/schema、唯一引用及一次性确认](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#新增提供方2026-09-27)，0.1.63已安装，实际手机授权新增待验。

提供方移除：[单路由删除、基础层与凭据保护](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#移除已有提供方2026-09-27)，0.1.62已安装，真实手机授权删除待验。

模型发现：[原服务、固定路由与权限边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方模型发现2026-09-27)，0.1.61已安装，实际手机管理发现待验。

内置模型覆盖：[用户层、scope隔离与目录校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#内置模型逐项覆盖2026-09-27)，配套0.1.60，实际手机保存待验。

提供方默认兼容：[固定字段与原设置继承](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#提供方默认兼容设置2026-09-27)，配套0.1.59，实际手机保存待验。

模型兼容配置：[固定字段与原pi-ai协议校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#模型协议兼容配置2026-09-27)，0.1.58已安装加载，实际手机保存待验。

模型能力：[输入与思考声明的投影和原服务校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#模型输入与思考能力2026-09-27)，0.1.57已安装加载，实际手机保存待验。

模型清单：[行身份保留隐藏字段与原设置校验](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方模型清单2026-09-27)，0.1.56已安装并加载，真实手机管理保存待验。

提供方Key：[已有显式引用与原生入口边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方key引用2026-09-27)，0.1.55已安装，真实手机保存待验。

其他提供方地址：[固定目标、原继承和版本写入](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有提供方的服务地址2026-09-27)，0.1.54已安装，真实手机保存待验。

其他模型提供方：[固定字段与原设置服务边界](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已有其他模型提供方的标量设置2026-09-27)，0.1.53已安装，手机实际保存待验。

自定义Key：[电脑已有模型/搜索引用的仅写边界与验证](../../../docs/project-knowledge/knowledge/domains/remote-access/settings-boundary.md#已配置的自定义key引用2026-09-27)，0.1.52支持已有引用，保留注册名与Remote信任记录隔离。

动态 Cordis 插件：[连接目录、12个原接口、安装与实际验证](../../compatibility/cordis-inspect/README.md)。0.1.51及七文件补丁已安装，MuMu原清单、手动运行/Host调用/停止/移除通过；审批、版本切换及完整异常继续验收。

应用图标：[内部服务扩展与四文件安装包](../../compatibility/desktop-app-icons/README.md)已安装，0.1.49 接入固定图标传输；MuMu 主聊天、旁栏及应用列表的实际 Windows 图标通过。

指定应用打开工作区：[服务兼容补丁与接入证据](../../compatibility/desktop-apps/README.md)，0.1.48 已接固定 Remote 协议和手机确认页；MuMu 读取/取消/资源管理器打开通过，其他应用与在途撤权继续验收。

文件元数据：[刷新兼容补丁](../../compatibility/file-metadata/README.md)，原文件变更后刷新完整 stat，含固定基线安装恢复与 MuMu 证据。

长安装结果：[回执边界与手机验收](../../../dsh-mobile/docs/integration/plugin-management-current.md)，含0.1.40的内存记录、去重、换代和权限规则。

插件安装取消：[进程树兼容补丁](../../compatibility/plugin-install-cancel/README.md)，含固定基线安装恢复、进程检查和MuMu原路径验证。

手机模块增量更新：[兼容补丁与安装恢复](../../compatibility/client-entries/README.md)，保留未变化插件页面实例及手机apply名单。

开发中：[待审批/提问的只读通知补丁](../../compatibility/pending-notifications/README.md)，含原Gateway运行验证；已在本机安装，并与插件0.1.35通过主要MuMu通知链路验证。

| 分类 | 入口 |
| --- | --- |
| 系统蓝图 | [整体模块地图](../../../docs/project-knowledge/blueprint/module-map.md)，插件包含 Host 和电脑配置页 |
| 业务域 | [远程访问](../../../docs/project-knowledge/knowledge/domains/remote-access/INDEX.md) |
| 开发规则 | [插件工作入口](../../AGENTS.md) |
| 共享知识 | [跨端协议](../../../docs/protocol.md) |
| 长期决策 | [插件与配对接入](../../../docs/project-knowledge/knowledge/decisions/2026-09-22-pairing-and-plugin.md)、[电脑端兼容补丁](../../../docs/project-knowledge/knowledge/decisions/2026-09-25-desktop-compatibility-patches.md) |
| 候选知识 | [上游源码核验与待实测项](../../../docs/project-knowledge/knowledge/candidate/desktop-plugin-review.md) |
| 校验方式 | [验证矩阵](../../../docs/project-knowledge/validation/README.md)、[插件使用说明](../../README.md)、[后台输出补丁构建与隔离验证](../../compatibility/background-output/README.md)、[源码启动安装与真实验证](../../compatibility/source-start/README.md)、[前台命令输出接入与补丁安装（待实测）](../../compatibility/foreground-output/README.md) |
