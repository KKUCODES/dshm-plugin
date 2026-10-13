# 新版 Office 转换服务变化

- 状态：发布CLI及实际源码pnpm入口均通过转换完成后传输异常、Android服务变化后缓存、预览关闭、连接恢复、设备收权、普通会话归属和主聊天在途切换。Windows ReadData权限在途收回后的手机失败/重试、原DACL/字节恢复及Host容量释放也已通过；原28源码/355资源精确恢复核验。系统保存窗口断线、下载/目标写入/分享准备中进程结束的受控专项见[文件传输边界](./file-transfers.md)，两种入口已通过。[单读者转换引擎运行中取消与共享转换关闭一个读者](./office-engine.md)另在发布与源码真实Android通过，原37源码/355资源精确恢复。共享转换的其他取消顺序、更多并发、旁栏/并发在途切换、其他文件权限/操作系统与附件引用在途变化、更多格式保存分享及更广网络异常仍待验。
- 维护角色：DSH Mobile项目协作Agent；最近核验：2026-10-09。
- 固定目标：DSH `0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。
- 来源：[中继转换流](../../src/office-preview.ts)、[真实信用窗口与服务操作](../../../backend/tests/support/latest-office-transmission.ts)、[真实Host测试](../../../backend/tests/latest-host.test.ts)、[原转换器生命周期](../../artifacts/latest-source-check/packages/document/office-to-pdf/src/index.ts)。

## 大小与修改时间相同的内容变化和同版本缓存（2026-10-09）

状态：补充Windows文件监听修正后，npm发布与实际源码Host/生产网关/独立Android专项均完整通过。源码新14组38文件完整构建、47项源码回归、relay及finally原38文件/启动与355资源精确恢复均通过，事务退出0。原首轮npm成功及源码漏通知失败均保留，不把偶发通过当作问题不存在；具体根因、修正及两种入口新证据见[监听专项](./file-version-watch.md)。完整新版支持仍未发布。

[有效等长OOXML样例](../../../dsh-mobile/scripts/office-fixture.mjs)使用原测试文档结构和ZIP存储模式，两份原件均1281字节，正文分别为`DSHM_METADATA_CONTENT_A`、`DSHM_METADATA_CONTENT_B`。只在拥有的测试工作区就地改写同一文件，并通过真实`utimes`恢复修改时间至2020-01-01；Node原生`stat`核对dev/inode/大小/mtime纳秒相同，ctime确实变化。[原文件版本算法](../../artifacts/latest-source-check/packages/fs/fs-local/src/fsio.ts)包含ctime，版本必须不同；不能将大小和mtime相同误称为全部元数据或原版本相同。

[发布Host报告](../../artifacts/latest-runtime-check/latest-office-metadata-86e23518-4dcf-45a7-ae2b-75332fe2e8e9-test.json)、[清理](../../artifacts/latest-runtime-check/latest-office-metadata-86e23518-4dcf-45a7-ae2b-75332fe2e8e9-cleanup.json)和[Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/office-metadata-a89617bc-d405-45a5-adb6-13c50aca1761/latest-remote-android.json)证明：原文件树打开A、相同原版本重开复用缓存；真实内容改成B后新版本发起一条转换流，实际PDF文字层显示B且不存在A。保持预览打开恢复原件后，原目标监听自动刷新，旧画布移除，实际新画布/正文回到A且不存在B。第三个原版本再次打开仍不转换，同时重新查询权限和服务代际。三次转换对应三个不同原版本，大小1281及mtime `1577836800000000000`保持；正文与原文件SHA分别核验。六格式、历史附件、服务重建、撤销真实重连拒绝与原Host重启一并通过。

拥有Host664/4516已确认退出；[原App恢复](../../artifacts/latest-runtime-check/latest-office-metadata-86e23518-4dcf-45a7-ae2b-75332fe2e8e9-original-50bd59e7-15b3-4566-a7a7-1139f17f3952.json)保持原PID23468/Host29132、同APK/绑定、原1837条聊天摘要/空草稿/workspace-write、management=false和实际Android Remote前台。[开始前](../../artifacts/latest-runtime-check/latest-live-child-retention-office-metadata-20261009-before.json)与[恢复后全历史](../../artifacts/latest-runtime-check/latest-live-child-retention-office-metadata-npm-restored-before.json)identity逐项相同，26会话3799事件保持。未读取Key、重新配对、重装主App或向原聊天发消息。Windows可见前台尚未验证。

首轮实现只扩展[原Host测试](../../../backend/tests/latest-host.test.ts)与[原Android页面驱动](../../../dsh-mobile/tests/support/latest-file-page.mjs)，消费原stat/监听/资源桥。失败后增加[Windows文件监听兼容修正](./file-version-watch.md)，不修改版本算法、转换器、缓存、鉴权或APK。复验使用`DSHM_LATEST_OFFICE_METADATA_CHECK=1`和独立Office Android范围；源码入口增加`--office-metadata`，按新UUID消费本轮唯一报告。其他文件元数据组合、附件引用在途变化、并发预览及全部新版标准仍待验。

## 实际 Android 会话切换与同名文件归属

固定新版发布CLI→真实网关→独立Android→原Host重启专项143.45秒通过；实际源码`pnpm dsh web`外层relay161.35秒通过。范围为`office-session-lifetime`，只通过原列表切换三个实际电脑会话；每次先关闭原预览。不是预览传输在途切换或全量管理/动态插件回归。

| 操作 | 核验结果 |
| --- | --- |
| 同一会话A重复打开 | 只有一条转换流，但文件权限重新查询 |
| 同工作区会话B打开同一文件 | 按B身份重新授权，建立第二条转换流；原物理路径/版本与A相同 |
| 另一工作区会话C打开同名文件 | 第三条转换流对应C的原路径/版本；实际PDF文字层显示`DSHM_OTHER_WORKSPACE_ONLY_20261005`，而A/B为`Office preview 中文文档` |
| 返回A | 复用A自己的缓存，不新增第四条转换流；按A重新查询权限，实际正文恢复为A的内容 |
| 在B用原资源入口打开A的附件地址 | 真实`remote.attachmentOffice`返回`remote_attachment_not_referenced`，没有元数据或PDF画布 |
| 返回A并再次点击原附件卡片 | 用A的会话/附件ID/名称重新读取，原画布恢复；共两次真实附件转换调用 |

三个工作区预览地址各自包含会话身份；三条转换元数据精确对应原stat路径、版本及当前generation，五次原权限读取身份为A/A/B/C/A。两份同名原件使用不同正文，实际可见PDF文字层及[发布截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-npm-other.png)、[源码截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-source-other.png)一并核验，不能只用地址正确推出内容正确。测试结束核对两个原件完整字节、各会话stat及服务generation均未变化。

来源：[真实工作区/会话准备与最终核对](../../../backend/tests/support/latest-office-session.ts)、[有效OOXML不同正文样例](../../../dsh-mobile/scripts/office-fixture.mjs)、[原手机页面与实际PDF文字层](../../../dsh-mobile/tests/support/latest-office-session-page.mjs)、[原调用观察器](../../../dsh-mobile/tests/support/latest-office-observation.mjs)。工作区、会话和消息通过原电脑接口创建；独立无Key会话仅用于真实列表显示，不算模型推理。没有替换电脑响应、列表、鉴权、缓存或原转换器，也没有修改生产代码。

复验在连接恢复专项配置上加`DSHM_LATEST_OFFICE_SESSION_CHECK=1`；源码验证器加`--office-session`，必须同时包含`--android --office --office-lifetime --office-cancel --office-recovery`。固定Office UID、原300秒测试/360秒外层上限保持。六格式工作区/历史附件、服务变化、预览关闭、socket中断、显式重连、最后设备撤销和原Host重启同时回归；撤销前无页面/控制台错误，只有最后预期401。不将该组合记为包含`--office-authority`专项。

证据：[发布Host](../../artifacts/latest-runtime-check/latest-office-session-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-session-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-session-npm-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-npm-android.json)；[源码Host](../../artifacts/latest-runtime-check/latest-office-session-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-session-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-session-source-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-source-android.json)。八项归属标记均为true。首次发布仅验证不同文件版本和地址，未使用不同正文；这份范围较窄的通过报告另存为`latest-office-session-npm-address-only-*`，不能把后续正文断言归给它。

源码十一项/28文件完整构建289.22秒，原41函数、159取消、188客户端、五项实际pnpm进程、72operations、模块身份及八项应用服务通过。恢复原完整构建306.76秒；原28源码/根脚本/引导载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`相同、Git干净。见[组合](../../artifacts/latest-runtime-check/latest-office-session-source-combined.json)和[载荷](../../artifacts/latest-runtime-check/latest-office-session-source-manifest.json)。本轮四个拥有Host（5380/32600、29564/26372）通过系统核对已退出；专项UID/授权/端口清理。

模型验收App原PID16457、数据/绑定与16901端口保留，原Launcher及受限`--restore`恢复同一空聊天，再经`--verify-open`核对原标题、输入框和无整站iframe，见[状态](../../artifacts/latest-runtime-check/latest-office-session-model-resume.json)和[截图](../../artifacts/latest-runtime-check/latest-office-session-model-resume.png)。原Host清单仍为手机/桌面两条空会话、零轮次，设备只有聊天权限。日常DSH及普通聊天Key未操作，`inferenceVerified=false`。



## 旁栏会话与在途文件预览并存

状态：发布入口141.38秒、实际源码pnpm外层165.22秒的真实Host/Android/原Host重启组合均通过，原源码与资源精确恢复核验完成。

复用下节原PDF信用窗口、页面导航、实际文字层和Host容量核对，另经原Host的spawn provider生成真实子会话，用手机原「子会话→在旁栏打开」进入。缺Key的子会话保留真实历史，不算模型推理。文件仍属于原主会话；旁栏与文件标签同时存在时，切换另一工作区主聊天，应取消原文件载入并卸载旧旁栏视图，保留两个标签的原生命周期。返回后核对原PDF正文和同一子会话历史，最后仅由原菜单关闭标签。生产页面、鉴权、缓存与传输未修改。

选择扩展既有在途驱动，避免复制同一PDF/导航检查；独立`DSHM_LATEST_OFFICE_SIDEBAR_INFLIGHT_CHECK=1`要求既有session-inflight范围。源码选项`--office-sidebar-inflight`须同时包含`--android --office --office-lifetime --office-cancel --office-recovery --office-session --office-session-inflight`，原300/360秒时限不变。来源：[实际UI驱动](../../../dsh-mobile/tests/support/latest-office-session-inflight-page.mjs)、[原Host子会话夹具](../../../backend/tests/support/latest-cordis-host-fixture.mjs)、[独立范围校验](../../../backend/tests/latest-host.test.ts)。

发布实测：1256492字节PDF停在原四块信用窗口262144字节，原读者pending且尚未结束，另一真实读者占第二名额，第三次读取被原Host拒绝busy。原子会话旁栏和文件标签同时保持，切换其他主会话后原文件只发送一次取消、移除pending并释放Host名额，旧子会话视图从DOM卸载；两个标签的ID、occurrence ID和未aborted生命周期保持。另一工作区显示自己的不同PDF正文；返回原主会话后原PDF正文和同一子会话ID/真实历史恢复，最后只有原关闭菜单移除标签。撤销前无页面/控制台错误，最后只有预期401，未执行真实推理。

证据：[发布Host](../../artifacts/latest-runtime-check/latest-office-sidebar-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-sidebar-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-sidebar-npm-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-npm-android.json)、[旁栏打开](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-npm-sidebar-open.png)、[真实PDF传输暂停且旁栏保留](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-npm-sidebar-file-held.png)、[原PDF恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-npm-returned.png)、[同一子历史恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-npm-sidebar-returned.png)。

源码Android的同一范围也通过：四项旁栏标记与原八项文件标记均true，撤销后只有预期401。见[源码Host](../../artifacts/latest-runtime-check/latest-office-sidebar-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-sidebar-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-sidebar-source-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-source-android.json)、[暂停与旁栏保留](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-source-sidebar-file-held.png)及[同一子历史恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-sidebar-source-sidebar-returned.png)。十一项/28文件完整构建287.26秒、原函数/取消/客户端/pnpm进程/包操作/模块身份/应用服务回归通过；恢复原构建288.26秒，28原文件/根脚本/引导载荷与355资源原摘要逐项恢复，独立`--built`核对Git干净。见[完整组合](../../artifacts/latest-runtime-check/latest-office-sidebar-source-combined.json)和[载荷](../../artifacts/latest-runtime-check/latest-office-sidebar-source-manifest.json)。拥有的四个Host68884/27376/75524/19088经系统核对均退出；Office授权、UID及反向端口清理，持久模型Host/App和原绑定保留。

这项范围是子会话旁栏与主会话文件预览并存时切换，不替代子会话自身文件/附件资源归属、多个预览同时在途或真实子会话推理的验收。不记为完整旁栏/并发范围完成。随后在保留的发布模型环境中通过真实回复与单次文件写入审批，另见[实际模型验收](../../../dsh-mobile/docs/integration/latest-compatibility.md#真实模型回复与文件审批2026-10-06)；不能把其结果归给本次缺Key的Office环境。

## 实际 Android 主聊天在途切换与标签恢复

发布CLI→真实网关→独立Android→原Host重启专项150.85秒通过；实际源码`pnpm dsh web`同范围外层relay167.04秒通过。范围为`office-session-inflight`：手机正在读取1,256,492字节PDF时，延迟原请求四次信用确认，实际停在262,144字节；通过原“返回聊天→返回列表→另一工作区聊天”切换，不发送测试取消或关闭标签指令。

| 时点 | 原读取与标签 |
| --- | --- |
| PDF停在真实传输窗口 | 四块、pending存在、promise未结束；另一真实读者占第二名额，第三条读取严格返回busy |
| 切到另一主聊天 | 原预览body卸载，原取消帧仅一次，promise以undefined结束，pending移除；没有完整或迟到PDF。原标签ID/occurrence ID保持且signal未aborted |
| 在另一工作区预览 | 重新核验该会话身份，实际PDF文字层为该工作区的不同正文；未显示原未完成文件 |
| 返回原会话并点保留标签 | 原标签ID/occurrence ID仍相同；第二条真实原会话读取完成，元数据精确对应原路径/版本/generation，实际PDF首段为`DSHM transmission page 0:` |
| 原菜单关闭标签 | 原标签记录消失；布局保留与真正关闭已区分 |

旧手机读取退出后，另一真实读者仍占用时新读取取得释放的Host名额。原件完整字节、另两份普通同名原件及其stat、转换服务generation保持。这里取消的是原LibreOffice已转换完成的PDF传输，不代表转换引擎运行中取消。返回标签重新读取可以使用原Host转换缓存，不宣称重新启动LibreOffice。

来源：[实际原UI/标签身份/原PDF文字层](../../../dsh-mobile/tests/support/latest-office-session-inflight-page.mjs)、[原信用窗口观察](../../../dsh-mobile/tests/support/latest-office-paused-reader.mjs)、[真实Host容量与同字节源版本刷新](../../../backend/tests/support/latest-office-mobile-cancellation.ts)、[原标签生命周期](../../artifacts/latest-source-check/packages/client/ui-sidebar-right/src/client/tab-domain.ts)、[原Office载入signal](../../artifacts/latest-source-check/packages/client/ui-sidebar-documentpreview/src/client/office/face.ts)。标签生命周期跨切换保持；预览body自己的载入signal在卸载时取消，两个概念不能合并为“切换关闭标签”。

复验增加`DSHM_LATEST_OFFICE_SESSION_INFLIGHT_CHECK=1`；源码增加`--office-session-inflight`，必须同时含`--android --office --office-lifetime --office-cancel --office-recovery --office-session`。只有测试步骤/只读观察新增，原页面、鉴权、缓存和原300秒测试/360秒外层时限保持。六格式工作区及附件、服务缓存、关闭预览、socket中断、显式重连、普通会话归属、最终撤销和Host重启一并回归；不重复全量管理/动态插件或`--office-authority`专项。

证据：[发布Host](../../artifacts/latest-runtime-check/latest-office-session-inflight-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-session-inflight-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-session-inflight-npm-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-inflight-npm-android.json)；[源码Host](../../artifacts/latest-runtime-check/latest-office-session-inflight-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-session-inflight-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-session-inflight-source-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-inflight-source-android.json)。八项在途标记均true；撤销前无页面/控制台错误，只有最终预期401。原画布实际可见，见[发布返回截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-inflight-npm-returned.png)和[源码返回截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-session-inflight-source-returned.png)。首次发布149.71秒仅检查原导航/容量等六项，未含后续原标签身份和返回文字层断言，较窄通过报告另存`latest-office-session-inflight-npm-navigation-only-*`。

源码十一项/28文件完整构建286.34秒，原41函数、159取消、188客户端、五项实际pnpm进程、72operations、模块身份及八项应用服务通过。恢复原完整构建307.74秒；原28源码/根脚本/引导载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`保持，Git干净。见[完整组合](../../artifacts/latest-runtime-check/latest-office-session-inflight-source-combined.json)和[固定载荷](../../artifacts/latest-runtime-check/latest-office-session-inflight-source-manifest.json)。

两个入口拥有的四个Host（57932/28456、73672/42120）及首轮较窄发布验证的两个Host（71308/37244）均经系统核对已退出，固定Office UID/授权/反向端口清理。等待Key的模型App原PID16457/数据/绑定/16901保留，经原Launcher及受限`--restore`恢复原空会话，`--verify-open`核对原标题/输入框/无整站iframe，见[状态](../../artifacts/latest-runtime-check/latest-office-session-inflight-model-resume.json)和[截图](../../artifacts/latest-runtime-check/latest-office-session-inflight-model-resume.png)。未发送模型消息或读取Key。最终Host清单仍为两条空会话、零轮次，设备只有聊天权限；日常DSH未修改。

本专项证明原主聊天UI在真实PDF传输中的一次跨工作区切换；旁栏/更多并发切换、在途文件权限/附件引用变化、引擎运行中取消及下载分享仍待验。

## 实际 Windows 文件读取权限在途收回

发布CLI、真实网关及原Host重启专项100.14秒通过真实Windows文件权限变化；范围是原件的`ReadData`权限和PDF传输协议，不含Android页面。原转换器已完成1,256,492字节PDF，信用窗口停在四块/262,144字节，两个读者实际占满，第三条读取返回`remote_office_busy`。只对本次UUID隔离工作区的专用原件，给当前用户增加一条读取数据的Deny，原Node读取实际返回`EPERM`。

继续原流后全部PDF字节已到达，但末尾原`workspaceFiles/readBytes`读取仍拒绝；中继保留`result / ok:false / gateway/internal`、`EPERM`原消息及空details，不能把全部字节收到当作成功end。失败请求无残留帧。恢复原DACL时核对原Access SDDL及其SHA-256完全相同，原件完整字节保持；另一读者仍占用时，新读取成功取得释放的名额并完成，原转换服务generation保持，随后取消另一读者。

来源：[真实信用窗口/原拒绝/双读者容量](../../../backend/tests/support/latest-office-transmission.ts)、[专用文件路径围栏/Node拒绝/超时恢复钩子](../../../backend/tests/support/latest-office-file-permission.ts)、[实际Windows ACL备份/修改/恢复](../../../backend/tests/support/latest-office-file-acl.ps1)、[独立真实文件与非专用路径拒绝测试](../../../backend/tests/latest-office-file-permission.test.ts)。该辅助程序不更改目录ACL、Owner、Group或SACL；原DACL备份留在专用原件旁的`.dshm-acl.json`，任何ACL写入前使用CreateNew保存，不覆盖旧备份。

恢复时首次只用Set-Acl，权限已恢复但增加了`AI`继承控制位，严格原SDDL断言失败；另一轮预期`EACCES`而实际为`EPERM`也失败。现按原FS代码接受这两个真实权限errno，使用原Windows文件安全接口补充恢复旧继承模型，最终逐字串核对。首次专用文件`0dffe602-fa84-4db5-92c4-e28eda645563/test-project/latest-office-transmission.docx`已用修正后的恢复入口核对成功，独立两项实际测试通过。原FS同类API见[上游Win32接口](../../artifacts/latest-source-check/packages/fs/fs-local/src/win32.ts)；外部函数签名与缓冲区释放按[微软SetFileSecurityW](https://learn.microsoft.com/en-us/windows/win32/api/securitybaseapi/nf-securitybaseapi-setfilesecurityw)及[SDDL转换接口](https://learn.microsoft.com/en-us/windows/win32/api/sddl/nf-sddl-convertstringsecuritydescriptortosecuritydescriptorw)核验，不以第三方猜测替代实际恢复检查。

最终发布证据：[Host](../../artifacts/latest-runtime-check/latest-office-file-permission-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-file-permission-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-file-permission-npm-cleanup.json)、[独立文件测试](../../artifacts/latest-runtime-check/latest-office-file-permission-fixture.json)。首次94.95秒只观察原拒绝与恢复，未包含后续严格错误契约和另一个读者保持占用的容量证明，保存在`latest-office-file-permission-npm-observation-*`，不能把后续断言归给它。两个发布入口的四个拥有Host为54392/68400、30256/39528；清理报告均完成。

实际源码pnpm同范围外层relay117.89秒通过，原错误契约/双读者释放/原DACL字节恢复字段与发布入口一致；十一项/28文件完整构建294.13秒及原回归/身份/八应用通过。原构建恢复288.72秒，原28源码/根脚本/引导载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`一致，Git干净，整个源码验证器通过。复验在后端使用`DSHM_LATEST_OFFICE_CHECK=1`、`DSHM_LATEST_OFFICE_TRANSMISSION_CHECK=1`、`DSHM_LATEST_OFFICE_FILE_PERMISSION_CHECK=1`和显式已核验`DSHM_PWSH_PATH`运行`tests/latest-host.test.ts`；源码入口使用`--office --transmission --office-file-permission`并传入同一PowerShell路径。不改生产权限、Gateway错误分类或缓存；同样不涵盖手机重试/画布、附件引用变化、其他操作系统或转换引擎运行中的取消。

源码协议证据：[Host](../../artifacts/latest-runtime-check/latest-office-file-permission-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-file-permission-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-file-permission-source-cleanup.json)。拥有Host为12276/61532，原清理完成；七份专用ACL备份的restored、原SDDL和当前可读性核对均通过。完整恢复见[源码组合](../../artifacts/latest-runtime-check/latest-office-file-permission-source-combined.json)和[固定载荷](../../artifacts/latest-runtime-check/latest-office-file-permission-source-manifest.json)。六个发布/源码拥有Host均经系统核对已退出；模型验收App原PID16457、16901与绑定保留，日常安装完整性112文件/17manifest核验通过。

## 实际 Android 文件读取权限在途收回与重试

固定发布CLI→真实网关→独立Android→原Host重启专项133.99秒通过；实际源码`pnpm dsh web`同范围测试156.61秒、外层relay159.71秒通过，范围均为`office-file-permission-lifetime`。原构建与资源精确恢复也已完成，整个源码组合通过。本专项操作原手机工作区文件入口及失败页，不加载电脑整站，也不替换原鉴权、转换器、缓存或UI响应。

| 时点 | 实际结果 |
| --- | --- |
| 原PDF传输停在四块信用窗口 | 已收到262,144字节，pending仍存在，promise未结束，没有PDF画布；另一真实读者占用第二名额，第三条读取返回busy |
| 原件ReadData权限被真实Windows DACL收回 | 原Node读取返回EPERM；恢复四次原信用确认后，共20块/1,256,492字节到达，原末尾校验仍拒绝结果 |
| 原手机处理失败 | 保持`gateway/internal`及空details，pending移除；没有旧PDF画布，原提示包含访问权限和“重试”按钮 |
| 恢复原DACL与字节 | 原Access SDDL及其摘要精确恢复；转换服务generation保持。ACL写入改变ctime，所以恢复后的源文件version是新版本，不能宣称源版本保持 |
| 点击原“重试” | 另一读者仍占用时已证明失败名额释放；新读取按恢复后的原stat版本完成，实际可见PDF文字层以`DSHM transmission page 0:`开头 |
| 关闭后再次打开 | 转换流保持2条，权限查询与generation查询各由2增至3；复用恢复后的缓存仍重新授权 |

八项标记全部true：原UI拒绝全部已收到的PDF字节、无旧画布、原错误契约保持、实际重试读取、实际PDF正文、Host容量释放、恢复缓存重新授权、原件字节与ACL恢复。六格式工作区/历史附件、服务缓存、预览关闭、实际socket中断、显式重连、最终撤销和原Host重启也回归；撤销前无页面/控制台错误，最后预期401单列。该组合不包含会话归属、设备收权或全量管理/动态插件专项，不代表附件引用变化、其他ACL/操作系统、转换引擎运行中取消或下载分享。

来源：[实际原手机失败与重试](../../../dsh-mobile/tests/support/latest-office-file-permission-page.mjs)、[原流信用窗口观察及恢复](../../../dsh-mobile/tests/support/latest-office-paused-reader.mjs)、[专用原件准备与容量检查](../../../backend/tests/support/latest-office-mobile-cancellation.ts)、[真实文件权限与精确恢复](../../../backend/tests/support/latest-office-file-permission.ts)、[Windows ACL辅助程序](../../../backend/tests/support/latest-office-file-acl.ps1)。辅助程序只允许本次UUID隔离工作区的专用原件，先保存CreateNew备份，再修改ReadData；不修改目录、Owner、Group或SACL。恢复后再次deny明确拒绝，防止测试误复用已结束的权限生命周期。独立两项实际Windows测试、后端类型与脚本语法检查通过。

发布证据：[Host](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-npm-cleanup.json)、[独立文件测试](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-fixture.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-file-permission-ui-npm-android.json)、[失败截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-file-permission-ui-npm-denied.png)、[恢复截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-file-permission-ui-npm-restored.png)。两个拥有的发布Host75408/74236经系统核对已退出。

源码证据：[Host](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-source-cleanup.json)、[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-file-permission-ui-source-android.json)、[失败截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-file-permission-ui-source-denied.png)、[恢复截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-file-permission-ui-source-restored.png)。八项标记及原件/错误契约/缓存计数与发布入口一致；拥有Host69224/10356的清理报告完成，两个源码Host经系统核对已退出。十一项/28文件源码完整构建288.66秒及原41函数、159取消、188客户端、五项pnpm进程、72operations、模块身份和八项应用服务通过；原构建恢复288.95秒，原28源码/根脚本/引导载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`保持、Git干净。见[完整组合](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-source-combined.json)和[固定载荷](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-source-manifest.json)。

十份专用ACL备份最终均标记restored，当前Access SDDL与备份原值精确相同且文件可读。固定Office UID已停止，其反向端口清理；模型验收App原PID16457、数据/绑定/16901保留，经原Launcher和受限`--restore`返回已记录的同一空会话，再经`--verify-open`核对原标题、输入框及无整站iframe，见[状态](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-model-resume.json)和[截图](../../artifacts/latest-runtime-check/latest-office-file-permission-ui-model-resume.png)。原Host清单仍为两条空会话、零轮次，设备只有聊天权限。日常DSH112文件/17manifest完整性检查通过；未读取Key或发送模型消息，`inferenceVerified=false`。

复验在连接恢复专项上增加`DSHM_LATEST_OFFICE_FILE_PERMISSION_UI_CHECK=1`和已核验`DSHM_PWSH_PATH`；源码入口使用`--android --office --office-lifetime --office-cancel --office-recovery --office-file-permission-ui`。原300秒测试/360秒外层上限保持。本轮没有`--transmission`或`--office-file-permission`，前一节协议专项证据保持独立范围，不能混用。

## 文件与服务规则

手机只能在完整转换流结束后使用结果。传输完字节仍须重新核验源文件权限、身份、版本，以及原转换服务的generation。服务已经卸载，或相同文件的转换服务重新建立，都不能把旧PDF当作成功结果。

固定新版的服务卸载不是HTTP 404：原Gateway保留严格定义的撤销状态，返回`ok:false`、`gateway/definition-unavailable`及`officeToPdf/generation`端点详情。中继保留该结构化拒绝；服务重新启用但代次不同则为`remote_file_changed`。不能为了兼容这两种情况放宽为任意失败、SRC回退或成功终态。

## 实际验证范围

发布CLI、真实网关和原Host重启组合93.01秒通过，见[报告](../../artifacts/latest-runtime-check/latest-office-service-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-service-npm-progress.json)和[清理](../../artifacts/latest-runtime-check/latest-office-service-npm-cleanup.json)。使用原LibreOffice转换真实DOCX，PDF为1,256,492字节；信用窗口为262,144字节，四块不确认时实际停止发送。服务启停使用原pluginManager，不替换协议响应、转换器或generation。

| 场景 | 实际结果 |
| --- | --- |
| PDF传输暂停后卸载原服务 | 已传输完整字节，末尾仍返回原严格定义拒绝，没有成功end |
| 重新启用后再次读取 | 新generation与旧值不同，完整PDF读取成功 |
| 传输暂停后卸载并重新启用，再继续旧流 | 原件版本保持，末尾因generation变化拒绝旧结果 |
| 按新代次重新读取 | 元数据与原服务当前generation一致，完整读取成功 |

两读者容量、取消回收、源文件修改/删除/恢复、六格式工作区及历史附件和原Host重启同时回归。测试原件字节保持，服务恢复启用，本轮拥有的两个Host均已退出。所有文件、配置和授权仅属于隔离测试环境，没有操作日常DSH。

实际源码`pnpm dsh web`同范围也通过，外层relay阶段118.01秒，内层清理结算115.32秒；本轮flags为`--office --transmission`，不含浏览器或Android页面。见[完整组合](../../artifacts/latest-runtime-check/latest-office-service-source-combined.json)、[实际Host](../../artifacts/latest-runtime-check/latest-office-service-source-relay.json)和[清理](../../artifacts/latest-runtime-check/latest-office-service-source-cleanup.json)。十一项/28文件完整构建331.51秒、原函数/取消/客户端/进程/包管理及模块身份回归通过；原构建恢复331.80秒，28源码、根脚本和启动载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`保持、Git干净。两个拥有的源码Host已不存在，发布与源码office结果字段全部为true。

最初测试器误把卸载定义预期为HTTP 404，两轮失败保留在[首次报告](../../artifacts/latest-runtime-check/latest-office-service-npm-first-failed.json)和[响应核对报告](../../artifacts/latest-runtime-check/latest-office-service-npm-receipt-failed.json)，对应清理报告同目录。只按实际原Gateway契约修正断言，未修改生产分类或权限。

以上传输专项只证明转换已经完成后的真实分片传输和服务生命周期检查，不代替下述手机缓存专项。

## 实际 Android 缓存与重试

发布CLI、真实网关、独立MuMu App及原Host重启组合260.33秒通过，见[Host](../../artifacts/latest-runtime-check/latest-office-cache-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-cache-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-cache-npm-cleanup.json)及[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-cache-npm-android.json)。

手机使用原工作区文件树、Office缓存与PDF画布。首次读取和源文件修改/恢复后已有三条实际转换流；服务关闭时再次打开显示原`gateway/definition-unavailable`，没有画布、没有第四条转换流。通过原pluginManager重新启用后，源文件完整元数据不变、服务generation改变；手机点击原“重试”按钮后读取第四条转换流，元数据精确对应新generation及原源版本，实际PDF画布出现。关闭再打开时仍为四条转换流，但重新查询授权与服务代次。

| 时点 | 实际转换流 | 文件权限核验 | 服务代次查询 |
| --- | --- | --- | --- |
| 服务卸载前 | 3 | 4 | 4 |
| 服务卸载后打开旧缓存 | 3 | 4 | 5 |
| 重建服务并重试 | 4 | 5 | 6 |
| 同一新代次再打开 | 4 | 6 | 7 |

范围与实现来源：[原页面步骤](../../../dsh-mobile/tests/support/latest-office-service-page.mjs)、[只记录原调用的观察器](../../../dsh-mobile/tests/support/latest-office-observation.mjs)和[实际Host服务操作](../../../backend/tests/latest-host.test.ts)。观察器不替换RPC、授权、转换结果或缓存。六格式工作区/历史附件及源版本变化回归保持，撤销前无页面/控制台异常；撤销后的预期401单列。拥有的两个Host退出、设备授权及本次反向端口撤销。

为保留等待用户配置真实Key的Android环境，此专项使用固定独立UID`dev.dshmobile.validation.latestofficetest`，仅它会被重置和停止；原模型验收UID`dev.dshmobile.validation.latesttest`及其16901端口保持。构建：在手机`android/`设置实际JAVA_HOME、ANDROID_HOME后执行`./gradlew.bat :app:assembleDebug -PlatestCompatibilityTest=true -PlatestOfficeLifetimeTest=true`。Host复验需`DSHM_LATEST_ANDROID_CHECK=1`、`DSHM_LATEST_OFFICE_CHECK=1`及`DSHM_LATEST_OFFICE_LIFETIME_CHECK=1`；源码外层对应`--android --office --office-lifetime`，不能将其他UID的旧报告作为本轮证据。

首轮在文件步骤之前被原生助手的固定包名断言拦住；只加入此专项固定UID后重新通过，没有放开任意App。原失败及清理见[Host失败](../../artifacts/latest-runtime-check/latest-office-cache-npm-first-failed.json)、[清理](../../artifacts/latest-runtime-check/latest-office-cache-npm-first-cleanup.json)和[Android失败](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-cache-npm-first-failed.json)。首次Gradle缺少SDK环境路径，指定本机已核验SDK后33秒构建通过；生产页面未修改。

同样的实际源码`pnpm dsh web`/网关/独立Android/原Host重启专项通过：外层relay268.03秒，清理阶段265.14秒，三项缓存标记均为true；转换/授权/代次查询计数与上表一致。六格式工作区和六种历史附件回归保持，只有撤销后的预期401。见[源码整体](../../artifacts/latest-runtime-check/latest-office-cache-source-combined.json)、[原载荷](../../artifacts/latest-runtime-check/latest-office-cache-source-manifest.json)、[Host](../../artifacts/latest-runtime-check/latest-office-cache-source-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-office-cache-source-cleanup.json)及[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-cache-source-android.json)。本轮参数为`--android --office --office-lifetime`，没有开启Web或大PDF信用窗口专项。

十一项/28文件的原完整源码构建441.91秒、原函数/取消/客户端/进程/包管理及模块身份回归通过；恢复后原完整构建291.44秒。28源码、根脚本和启动载荷字节恢复，355原客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`相同、Git干净；两个拥有的源码Host退出。模型验收App原进程/数据与16901端口保持，并从原Launcher恢复至原“DSHM 新版手机真实模型验收”聊天，`--verify-open`核对原标题/输入框/无iframe通过，仍未执行推理。

服务缓存专项本身不覆盖转换引擎运行中取消、预览关闭或连接变化；手机实际关闭与显式重连的后续范围见下节。其余缺口按[完整验收范围](../../../dsh-mobile/docs/integration/latest-compatibility.md)推进。

## 实际 Android 关闭预览与显式重连

发布CLI→真实网关→独立Android→原Host重启组合245.53秒通过，见[Host](../../artifacts/latest-runtime-check/latest-office-cancel-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-cancel-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-cancel-npm-cleanup.json)和[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-cancel-npm-android.json)。实际源码`pnpm dsh web`同范围293.01秒通过，外层relay295.62秒；两种入口的取消、容量释放、重新打开和显式重连四项标记及计数一致。

实际转换出的PDF为1,256,492字节。测试只延迟这条手机流四块信用确认，让原Host真实停在262,144字节窗口；原分片、授权、转换服务、原缓存和取消逻辑均保留。另一条真实读者占据第二个名额，此时额外读取严格返回`remote_office_busy`。从原面板菜单关闭预览后，手机原请求移除、promise结束，原生桥只发送一次取消；随后另一条真实读取获得空出的Host名额。没有迟到画布，重新点击同一原文件后建立第二条转换流并显示PDF，源文件完整字节保持。

显式重连使用App原“电脑连接→断开连接→重新连接”按钮。观察到真实原生`closed/user_disconnect`和`ready`，原页面卸载后按原列表重新打开同一测试聊天及文件。源文件完整元数据和服务generation保持，但手机转换流4→5、授权6→7、代次查询14→15；新画布使用相同原源版本/服务代次，证明手机旧缓存被丢弃且重新授权。

来源：[真实Host容量助手](../../../backend/tests/support/latest-office-mobile-cancellation.ts)、[原UI关闭与有界信用延迟](../../../dsh-mobile/tests/support/latest-office-cancel-page.mjs)、[原连接菜单与新预览](../../../dsh-mobile/tests/support/latest-office-reconnect-page.mjs)、[观察器](../../../dsh-mobile/tests/support/latest-office-observation.mjs)。复验在上一节Android/Office/lifetime配置上加`DSHM_LATEST_OFFICE_CANCEL_CHECK=1`；源码验证器另加`--office-cancel`，必须同时使用`--android --office --office-lifetime`，且只操作固定`latestofficetest`。原测试300秒/外层360秒上限保持，未放宽生产读取容量、消费超时或任何权限。发布245.53秒、源码293.01秒均在原时限内完成；首次发布代码曾临时设360秒/外层420秒，实际未触及原时限，源码运行前已恢复300/360秒，不据此增加产品超时。

六格式工作区及历史附件、服务缓存、源变化和原Host重启回归同时通过；撤销前无页面/控制台异常，仅撤销后的预期401单列。两个拥有Host退出，设备授权与测试反向端口清理；等待真实Key的`latesttest`进程16457、数据/绑定和16901端口仍保持。

源码证据：[整体](../../artifacts/latest-runtime-check/latest-office-cancel-source-combined.json)、[载荷](../../artifacts/latest-runtime-check/latest-office-cancel-source-manifest.json)、[Host](../../artifacts/latest-runtime-check/latest-office-cancel-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-cancel-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-cancel-source-cleanup.json)及[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-cancel-source-android.json)。原完整构建319.74秒；41函数、159取消、188客户端、五项实际pnpm进程、72operations、安装身份及八项应用服务通过；恢复原完整构建319.86秒。原28源码/根脚本/启动载荷字节恢复，355资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`一致，Git干净，拥有的两个源码Host退出。

恢复模型验收App时，原Launcher将既有RemoteActivity带回项目列表，直接`--verify-open`因没有输入框而超时；原Host仍显示原手机/桌面两个空会话、零轮次，未丢记录。失败观察保留在[恢复观察](../../artifacts/latest-runtime-check/latest-office-cancel-model-resume-first.json)。准备器新增严格`--restore`，核对同一home/记录ID/原列表标题/blank状态后仅调用原`workspaceNavigation.showMain`打开既有会话；实际恢复及后续`--verify-open`、截图核对原聊天标题/输入框/无iframe通过。没有清理App、新建会话、再次配对或发送消息；不将此测试导航助手宣称为产品自动恢复空会话已修复。

这里的取消发生在原转换已完成后的真实PDF传输中，不能宣称LibreOffice运行中的取消已通过。显式用户断开/重连本身不代表非主动断线，实际设备socket中断的后续验收见下节；会话切换、在途收权/附件身份变化或原件下载分享仍待验。

## 实际 Android 传输中断与自动重连

发布CLI→真实网关→独立Android→原Host重启专项122.44秒通过，见[Host](../../artifacts/latest-runtime-check/latest-office-network-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-network-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-network-npm-cleanup.json)和[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-network-npm-android.json)。实际源码`pnpm dsh web`同范围143.89秒通过，外层relay146.68秒；连接/旧请求/容量/缓存六项标记、重试行为和计数一致。

通过真实收到的原请求ID定位承载测试文件的设备socket，在真实1,256,492字节PDF的四块262,144字节窗口暂停后调用该socket的terminate。没有关闭Host、重启网关、操作通知连接或生成ready。实际收到无reason的closed，旧请求以`connection_closed_outcome_unknown`拒绝并从pending移除；另一条真实读者保持占用时，新的读取取得释放的Host名额。随后原生桥自行重连并收到ready，原会话保持。

中断的原预览保留失败状态，点击原“重试”后读取新的完整转换流并显示画布；`previewRecovery=original-retry-button`，不能声称PDF预览自动重试成功。连接恢复没有点击“重新连接”。同源版本、同转换服务代次的另一份已缓存Word重新打开时，转换流4→5、权限核验6→7、代次查询14→17；旧手机PDF缓存确已失效。随后原显式断开/重连回归使转换流5→6、权限7→8、代次查询17→18。旧分片未返回成功PDF，原件字节保持。

测试范围为`office-network-recovery`：真实配对/批准、原历史和选模同步、文件刷新、六格式工作区/附件、服务缓存、预览关闭、实际socket中断、显式重连、撤销失效页及原Host重启；未重复此前独立通过的完整电脑管理和动态插件页面步骤，不能把此范围冒充全量管理回归。原300秒测试/360秒外层限制保持，撤销前无页面或控制台异常，只有撤销后的预期401单列。拥有Host与固定`latestofficetest`、设备授权和本次反向端口清理，等待Key的模型验收环境保持。

来源：[限定真实设备socket的观察器](../../../backend/tests/support/latest-office-socket-drop.ts)、[真实Host容量检查](../../../backend/tests/support/latest-office-mobile-cancellation.ts)、[信用窗口控制](../../../dsh-mobile/tests/support/latest-office-paused-reader.mjs)、[原手机恢复与重试](../../../dsh-mobile/tests/support/latest-office-network-page.mjs)。原权限、协议、生产缓存和页面未修改；仅增加测试控制与原UI步骤。复验在上一节配置上加`DSHM_LATEST_OFFICE_RECOVERY_CHECK=1`；源码命令另加`--office-recovery`，必须同时有`--android --office --office-lifetime --office-cancel`。

首轮225.77秒失败发生在切断连接之前：上一项预览已填充同版本缓存，页面显示完整PDF，等待在途分片120秒超时。证据保留[Host失败](../../artifacts/latest-runtime-check/latest-office-network-npm-first-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-office-network-npm-first-cleanup.json)及[Android失败](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-network-npm-first-android.json)。测试准备改为通过真实同字节重写改变原源版本，并严格核对新stat版本不同，再建立真实在途读取；没有清空生产缓存或放宽断言。

本结果只覆盖一次真实设备socket中断及恢复，不代替转换引擎运行中取消、会话变化、在途撤权/附件身份变化、下载分享、长期弱网或全部自动恢复时序。

源码证据：[整体](../../artifacts/latest-runtime-check/latest-office-network-source-combined.json)、[载荷](../../artifacts/latest-runtime-check/latest-office-network-source-manifest.json)、[Host](../../artifacts/latest-runtime-check/latest-office-network-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-network-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-network-source-cleanup.json)及[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-network-source-android.json)。十一项/28文件原完整构建286.45秒；41函数、159取消、188客户端、五项实际pnpm进程、72operations、安装身份及八项应用服务通过；恢复原完整构建291.69秒。原28源码、根脚本和启动载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`相同，Git干净；两个拥有源码Host及发布两个Host均核对退出。

模型验收App原PID16457及16901端口保持；原Launcher后用受限`--restore`打开记录中的既有空会话，`--verify-open`及截图核对原标题、输入框和无iframe通过，见[状态](../../artifacts/latest-runtime-check/latest-office-network-model-resume.json)。原Host清单再次确认原手机/桌面两个空会话与工作区、标题、零轮次保持，设备只有聊天权限。未清理此UID、重配对、新建会话、读取Key或发送模型请求，`inferenceVerified=false`。

## 实际 Android 传输中收回设备权限

发布CLI→真实网关→独立Android→原Host重启专项133.62秒通过；实际源码`pnpm dsh web`同范围156.72秒通过，外层relay159.61秒。证据：[发布Host](../../artifacts/latest-runtime-check/latest-office-authority-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-authority-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-authority-npm-cleanup.json)及[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-authority-npm-android.json)；[源码Host](../../artifacts/latest-runtime-check/latest-office-authority-source-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-office-authority-source-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-office-authority-source-cleanup.json)及[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-office-authority-source-android.json)。两种入口的原生原因、拒绝、容量释放和只读重连计数一致。

两种操作均发生在原LibreOffice已完成转换、真实PDF传输收到四块262,144字节之后。只延迟对应原请求的信用确认，原鉴权、转换、缓存和原生桥保持；另一条真实读取占第二个名额，第三条严格返回`remote_office_busy`。实际收权后，旧请求以`connection_closed_outcome_unknown`拒绝并从pending移除，没有完整PDF或迟到画布；另一条真实请求取得释放的Host名额，源文件完整字节保持。

| 电脑操作 | 原生事件和手机行为 |
| --- | --- |
| 收回管理权限，保留聊天授权 | `closed/permissions_changed`，原工作区卸载，不自动重连；点击原“重新连接”后收到`ready/management:false`，重新打开同一聊天和文件可读取新PDF，转换流1→2、授权1→2、代次查询1→2 |
| 撤销整个设备 | 直接撤销，不先发送另一种收权事件；`closed/device_revoked`，原授权失效页出现。点击原“重新连接”后原HTTP拒绝，工作区/画布不恢复、没有ready或第二条转换流 |

两个断线事件可能由原桥的closing和closed分别通知；只检查实际原因，不将两条通知当作两次设备操作。管理权限降低后可以继续只读聊天及文件，不将它误写为整个设备永久失效。

来源：[原手机页面步骤](../../../dsh-mobile/tests/support/latest-office-authority-page.mjs)、[原调用观察器](../../../dsh-mobile/tests/support/latest-office-observation.mjs)、[真实Host容量助手](../../../backend/tests/support/latest-office-mobile-cancellation.ts)及[限定测试设备的原管理操作](../../../backend/tests/latest-host.test.ts)。复验在上一节配置上加`DSHM_LATEST_OFFICE_AUTHORITY_CHECK=1`；源码入口加`--office-authority`，必须同时包含`--android --office --office-lifetime --office-cancel --office-recovery`。仍使用原300秒测试/360秒外层时限与固定`latestofficetest`，未放宽生产限制或新增公网管理接口。

范围为`office-authorization-lifetime`，保留配对、历史/选模、六格式工作区与附件、服务缓存、预览关闭、实际socket中断和显式重连回归；不重复此前完整管理/动态插件页面，不等于全量回归。撤销前无页面/控制台异常，只有撤销后的预期401。两种入口拥有的四个Host（69052/60344、28200/29668）均通过系统进程核对已不存在，固定测试App/授权/反向端口清理。本节不证明文件自身权限/附件引用在途变化、会话切换、转换引擎运行中取消或原件下载分享。

本轮源码十一项/28文件完整构建291.06秒，41原函数、159取消、188客户端、五项实际pnpm进程、72operations、模块身份和八项应用服务通过。恢复原完整构建288.79秒；原28源码、根脚本及启动载荷逐字节恢复，355客户端资源摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`相同、Git干净。完整证据：[组合](../../artifacts/latest-runtime-check/latest-office-authority-source-combined.json)和[载荷](../../artifacts/latest-runtime-check/latest-office-authority-source-manifest.json)。

模型验收App原PID16457、数据/绑定和16901反向端口保持，固定Office测试UID已结束。从原Launcher经受限`--restore`恢复记录中的既有空会话，`--verify-open`与截图核对原标题、输入框和无整站iframe通过，见[状态](../../artifacts/latest-runtime-check/latest-office-authority-model-resume.json)和[截图](../../artifacts/latest-runtime-check/latest-office-authority-model-resume.png)。原Host仍为手机/桌面两条空会话、零轮次，设备仅聊天权限；未新建会话、重配对、读取Key或执行推理。
