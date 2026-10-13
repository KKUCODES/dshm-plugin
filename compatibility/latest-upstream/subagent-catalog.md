# 新版子会话目录迁移

- 状态：目录与共享手机导航已适配；发布CLI186.56秒、实际源码pnpm入口243.16秒的本轮Remote/独立Android/原Host重启链路通过，包含原子会话历史、旁栏应用确认/取消/实际启动与关闭测试标签。源码/原构建产物精确恢复及清理通过，完整新版兼容继续验收。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-10-07。
- 固定目标：`0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。日常旧版交付不升级。
- 来源：[参数策略](../../../backend/packages/protocol/src/remote-policy.ts)、[电脑协商](../../src/remote-adapter.ts)、[手机目录投影](../../../dsh-mobile/src/remote-session-catalogs.mjs)、[共享聊天模型](../../../dsh-mobile/src/remote-model.mjs)、[原标题导航注入](../../../dsh-mobile/src/remote-subagent-lineage.jsx)、[真实Host联调](../../../backend/tests/latest-host.test.ts)。

## 恢复父任务后的第二层续聊（2026-10-07）

[发布与实际源码手机专项](../../../dsh-mobile/docs/integration/latest-child-model.md#恢复父任务后的第二层手机续聊2026-10-07)通过原send_message显式恢复直接父任务、原等待进程输出/PID、同一第二层手机唯一提交与真实回复、父草稿保留、实际停止、明确收尾后释放和历史重入。复用原两棵持久树，正常maxDepth配置下不新建任务；手机读取历史不会自动唤醒父模型，已释放时仍禁止发送。两个原只读子任务各158事件、第二层各41事件；原26会话全部前缀/投影/身份及APK/配对保持。原37文件/启动字节、完整恢复构建和355资源已精确核验归档。

原用户停止保留Inbox，不等于释放父Agent：两种入口实际命令已退出且ABORTED/aborted-user，但第二层两条回报仍待处理。首次发布验证器等待父释放超时保持；同一原请求核对后，手机各发送一条明确收尾请求，原待办消费/真实收尾回复/空Inbox/父释放均核验，不重发命令或改变原生命周期。更广控制、SDK/Electron及完整新版交付继续，未修改生产控制/鉴权或日常App。

## 两层任务与父任务可用性（2026-10-07）

[实际两层手机专项](../../../dsh-mobile/docs/integration/latest-child-model.md#两层子任务导航与祖先停止2026-10-07)在发布及真实pnpm入口通过原模型创建、深度2发现、逐层打开/返回与草稿保留、原输出和真实进程、祖先interrupt_agent停止。只在隔离home用官方maxDepth=2配置，结束后精确移除；正常配置/权限/原App保持，全部26会话历史及设备身份恢复审计通过。父任务已释放时第二层发送禁用、原记录无新消息，在两种入口核验；该轮未通过的正向续聊在后续显式恢复专项补验，不覆盖原失败或将拒绝当作成功。该轮原37文件/启动字节、完整原构建和355资源已精确恢复归档，最终新版兼容仍待验。

原subagents.prompt要求直接父Agent仍存活，手机读取原历史不会激活它；原Controller从session/list.agentAvailable确定parentAvailable。本轮没有放宽生产检查、自动给父模型发送消息或伪造可用性。保留发布发送失败、源码列表计数及边界验证器失败，修正后只读同一请求；更广控制/恢复能力继续按原标准推进。

## 父模型发送与停止已有子会话（2026-10-07）

[手机实际控制专项](../../../dsh-mobile/docs/integration/latest-child-model.md#父模型发送消息与停止子任务2026-10-07)已在发布及实际源码`pnpm dsh web`入口通过：父模型原send_message回执后核对唯一relay和子模型实际回复；原interrupt_agent回执后核对真实pwsh进程退出、唯一ABORTED及aborted/parent、手机停止卡片。停止后再经原父模型发送消息，同一子会话真实回复、重入历史一致。原两子read-only/never、父workspace-write/空草稿和原App/绑定保持，不以回执代替结果。本轮只修改验证器/记录，没有新增生产插件/认证补丁；原37文件/启动字节、完整原构建/355资源精确恢复归档，全24会话原前缀/投影/身份保持，仅追加官方空标记。其他控制边界和完整新版兼容继续。

## 一次性前台子任务与原发现工具（2026-10-07）

[一次性前台子任务专项](../../../dsh-mobile/docs/integration/latest-child-model.md#一次性子任务与原列表工具2026-10-07)在固定发布与实际源码入口通过：原父模型只委派一次，子descriptor和父目录为one-shot；手机主页面/旁栏沿共享聊天页面显示原结果、隐藏输入/发送/附件。原list_agents两种范围返回均与12个continuable直接子项逐一一致，并排除一次性对象；descendants仅核验depth1，不代表多层控制工具已经通过。本轮无生产插件/认证修改；原37文件/根启动字节、完整原构建/355资源精确恢复归档，24个原会话前缀/投影/设备身份与原APK保持，恢复只追加一个官方空标记。

## 服务卸载在途与重新读取（2026-10-07）

[手机专项](../../../dsh-mobile/docs/integration/latest-child-model.md#服务卸载在途与重新读取2026-10-07)在固定 npm 发布及实际源码 pnpm 入口均通过原服务卸载/恢复期间的主聊天/旁栏、读取/续聊提交四分支。原客户端 namespace 在 Host 服务卸载后仍存在，实际试验否定以 namespace 判断可用的方案。插件新增 [Host 服务生命周期](../../src/subagent-service-state.ts)只读流，协商 `subagentState: true` 后手机订阅 `remote.subagentStateFollow`；仅返回 `{available:boolean}`，不读取用户内容，不代替原服务方法或 Session 事件。原权限、配额、取消与撤销边界沿用既有传输；每 Host 最多64订阅，状态可以合并为最新值。

手机按连接代次隔离旧订阅；主聊天与旁栏同时禁用不可用子会话的发送/停止，失败草稿保持。服务恢复后可显式重试原读取，没有自动重发。原父子历史/投影保持，撤销前零页面/控制台错误，撤销与独立测试清理通过。未新增上游子会话生产补丁；37原文件/启动值、原完整构建389.697秒与355原资源已精确恢复归档，完整新版兼容仍待验。

## 原因与实现边界

新版原`subagents`服务已移除`list`，保留`prompt`和`interruptByParent`。父会话通过`subagentCatalog`投影提供子会话身份、创建时间、标签与模式；原ClientSessions公开`projectionsBySession`、`refreshProjections`，原子会话标题组件改用`refreshProjection`。固定源码依据：[服务](../../artifacts/latest-source-check/packages/subagent/subagent/src/index.ts)、[目录类型](../../artifacts/latest-source-check/packages/subagent/subagent/src/projection-types.ts)、[客户端目录](../../artifacts/latest-source-check/packages/api/session-controller/src/client/sessions/service.ts)、[原标题组件](../../artifacts/latest-source-check/packages/client/ui-subagent/src/client/SubagentHeaderLineage.tsx)。

继续使用原新版投影，不重建旧服务：网关允许严格`{args:{request:{sessionId}}}`只读调用，Host仅在固定新版候选接受并协商`session/projections`，不再宣告不存在的`subagents/list`。旧版仍协商原目录、拒绝新版投影调用；不开放投影写入或额外路径参数。

手机原ClientSessions及插件读取的原store保持不变，仅在共享聊天模型发布时，为自身导航生成兼容目录。主聊天、旁栏、祖先导航共用此结果；保留原读入/错误状态，不将inactive解释为成功。按原不可变快照身份复用，目录/运行状态变化生成新结果。新版unknown模式允许先读取历史，由原子会话身份投影确认真实模式；确认前手机不能发送或停止。原标题组件的新刷新回调与旧回调同时保留。

## 验收与限制

[目录回归](../../../dsh-mobile/tests/remote-session-catalogs.test.mjs)核对原store不变、快照身份、错误/空目录/更新、未知模式及原身份确认后续聊；[共享聊天](../../../dsh-mobile/tests/remote-model.test.mjs)96项通过。手机全量435项、插件全量215项通过。[策略回归](../../../backend/tests/session-projections-policy.test.ts)核对两版协商、旧版拒绝及额外路径/字段/非法ID拒绝；[旧Host回归](../../tests/remote-adapter.test.ts)确认新版调用不会进入原连接。

真实子会话由[隔离Host夹具](../../../backend/tests/support/latest-cordis-host-fixture.mjs)调用原spawn provider创建，原服务建立descriptor/catalog并保存历史，再dispose实际子Agent。父子工作区按原DSH继承，核对原列表的parent/origin/cwd及非活动状态；没有手机目录注入或伪造子会话协议。隔离profile没有真实模型Key，缺凭据结果只证明目录和历史，不代表推理成功或模型生成子任务。

原`remote_http_404`保留在[发布Host](../../artifacts/latest-runtime-check/latest-sidebar-npm-failed.json)与[手机报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-sidebar-npm-failed.json)。适配后测试器两次旧名称查找失败分别因新版“更多打开方式”和默认项后缀。旁栏实际步骤通过后，仅收起而未关闭测试标签造成原动态组件的全页唯一定位失败，见[保留标签失败](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-sidebar-npm-retained-test-failed.json)；随后新增子记录影响原新建预设基线计数，见[计数失败](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-sidebar-npm-fixture-count-failed.json)。已通过真实菜单关闭本次标签、等待卸载，并将该明确子ID加入后续夹具基线；不忽略其他新会话，也不改保留标签的产品行为。

发布入口证据：[真实Host报告](../../artifacts/latest-runtime-check/latest-sidebar-npm-passed.json)、[清理](../../artifacts/latest-runtime-check/latest-sidebar-npm-passed-cleanup.json)、[独立Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-sidebar-npm-passed.json)。手机原桥确认主/子会话分别使用自己的sessionId，原Windows观察器核对工作区及实际新窗口，仅关闭本次测试窗口。主聊天保持、旁栏标签释放；其余既有模式、动态插件、提供方/模型、文件监听和原Host重启同时通过。撤销前无页面错误，撤销后仅预期401，测试授权及拥有的Host已清理；不包含本轮未开启的Office/传输专项。

源码首轮的Android全部页面、真实旁栏/主会话Windows启动与连接归属/重连检查通过，但重启Host后的树清理返回非零，整轮未通过。原记录：[Host失败](../../artifacts/latest-runtime-check/latest-sidebar-source-cleanup-failed-relay.json)、[原日志](../../artifacts/latest-runtime-check/latest-sidebar-source-cleanup-failed.log)、[Android页面步骤](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-sidebar-source-cleanup-failed.json)。测试清理器仅在系统明确ESRCH且等待原close时接受此边界；仍存活/权限错误保持失败，真实Windows父子进程、失败和重复清理三项通过，后端类型通过。待源码/原构建恢复后再完整重跑，不以手机页面步骤替代整轮。

修正后相同`--android --desktop-open`完整重跑的实际源码Remote步骤243.16秒通过，外层relay阶段245.99秒：[源码Host](../../artifacts/latest-runtime-check/latest-source-eleven-sidebar-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-source-eleven-sidebar-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-source-eleven-sidebar-android.json)、[旁栏确认](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-source-eleven-sidebar-confirm.png)、[实际打开](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-source-eleven-sidebar-opened.png)。含同设备多连接/重连旧确认拒绝、主与子会话实际Windows新窗口、旁栏释放、其余既有手机功能及原Host重启后恢复历史；撤销前零页面错误，撤销后仅预期401。未开启本轮Office/传输专项。

源码外层全部阶段与恢复通过：[完整组合](../../artifacts/latest-runtime-check/latest-source-eleven-sidebar-combined.json)、[固定载荷](../../artifacts/latest-runtime-check/latest-source-eleven-sidebar-manifest.json)。默认堆完整构建332.57秒；41项源码函数、159项取消、188项原客户端、五项真实pnpm进程、72项operations、模块身份及八项应用服务通过。28源码/根脚本/启动载荷逐字节恢复；原完整构建324.77秒、355资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`一致，Git干净。两次拥有的源码Host PID均已不存在；测试授权收回，独立App已结束。

上述目录组合当时未新增子会话上游源码补丁，十一项/28文件数量保持不变。后续自动审核取消组合增加为13项/31文件，与本目录变换分开核验，最终精确恢复尚未完成。

## 可继续子会话的真实模型与冷恢复（2026-10-06）

[专项证据](../../../dsh-mobile/docs/integration/latest-child-model.md)补齐发布及实际源码入口：真实父模型通过原subagent创建continuable子项，子模型实际回复，手机从自有菜单进入并直接续聊；原父目录、子descriptor、用户rpcId/回复/结果序号核对一致，重入没有重发。两种入口的真实Host重启前后各37条完整原事件摘要逐项一致；只读冷历史不激活Agent，不要求追加恢复标记。再次手机续聊取得真实模型回复，重入身份一致。

测试标题定位、父回复措辞和冷历史断言失败均保留并按原契约修正，没有制造模型或目录结果。两种入口已回到专用父会话，workspace-write、空输入、无生成中；原授权管理false，测试真实历史保留。本轮没有新增子会话生产补丁或重建APK。

同一专项另通过unknown地址的实际手机原SDK/中转/Host读取：发布50条、源码49条原记录与电脑非激活读取完全一致，原Host拒绝将continuable误报为one-shot，原投影/历史没有变化。并非制造unknown目录或跳过原descriptor核验；损坏/缺失descriptor、其他子任务工具/取消/通知组合、服务卸载在途及其他有效全链路验收仍待完成。

## 身份资料故障与持续未知模式（2026-10-07）

[手机故障专项](../../../dsh-mobile/docs/integration/latest-child-model.md#子会话身份资料故障2026-10-07)补齐固定 npm 发布及实际源码pnpm入口的缺失、损坏、不支持版本 descriptor。刻意构造的独立 Session 经原服务持久化并登记 unknown，原投影保持 null；主聊天与旁栏六个真实 Android 分支均显示明确失败、禁止发送/停止并能返回父会话。原 Host 拒绝 SDK 强制读取和续聊，全部原事件/投影不变，健康兄弟仍可读取。

未修改插件生产逻辑或认证。手机共享显示修正仅安装于独立测试 UID；原错误保持，测试授权撤销并清理拥有的 Host/端口，主 App/PID/摘要/绑定保持。源码13组/37文件完整候选构建386.831秒及实际Android52.610秒通过，原源码/启动字节、原完整构建373.178秒与355原资源已精确恢复归档，Git干净且无活动租约。子任务工具/取消/通知与卸载在途仍待验，不作为完整新版兼容通过。
