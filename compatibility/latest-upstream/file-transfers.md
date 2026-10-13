# 新版手机完整文件保存与分享

- 状态：完整保存/分享、保存窗口断线/下载中进程结束、实际目标写入中进程结束、分享副本准备中进程结束四个专项，以及当前归档六种Office格式的原件保存/只读分享，均在发布与源码入口通过。六格式原37源码/启动配置、完整恢复构建与355客户端资源精确核验；原App和电脑原件保持，临时接收器/进程/授权清理。完整新版兼容未验收。
- 维护角色：DSH Mobile项目协作Agent；最近核验：2026-10-07。
- 固定目标：DSH `0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，候选插件 `0.1.76-latest.0`。
- 来源：[真实Host专项](../../../backend/tests/latest-host.test.ts)、[原请求关联与设备socket中断](../../../backend/tests/support/latest-file-transfer.ts)、[实际Android操作与字节核验](../../../dsh-mobile/tests/support/latest-file-transfer-page.mjs)、[正式操作入口](../../../dsh-mobile/src/ui/RemoteDocumentActions.jsx)、[正式下载生命周期](../../../dsh-mobile/src/remote-download.mjs)。

## 实际验证范围

### 六格式原件保存与分享补验（2026-10-07）

状态：当前归档的发布及实际源码 `pnpm dsh web` 两种入口、各两组原件保存与只读分享，以及本轮最终恢复均完整通过。发布 `word-and-xlsx` 278.34秒、`xls-and-slides` 281.40秒；源码分别302.71/307.78秒测试、305.80/310.72秒外层。每种入口工作区与历史附件的12份原件均实际保存并跨UID只读分享；原37源码/启动字节、381.66秒完整恢复构建和355资源核对通过。前两轮失败保留；每组独立配对，加载当前62文件归档/55源码核对的插件。已有四项通过范围保持，完整新版支持仍未交付。

首轮在原300秒上限失败，不计完整通过：[外层失败记录](../../artifacts/latest-runtime-check/latest-file-formats-e0234a40-a1a3-41a7-a48b-337dfbbd52c7-timeout.json)、[阶段](../../artifacts/latest-runtime-check/latest-file-formats-e0234a40-a1a3-41a7-a48b-337dfbbd52c7-progress.json)和[拥有的Host清理](../../artifacts/latest-runtime-check/latest-file-formats-e0234a40-a1a3-41a7-a48b-337dfbbd52c7-cleanup.json)保留。只有docx/doc/xlsx完成两类来源的原系统操作，不能用它们代替另外三种格式。超时提前停止进程，正常Host/Android finally报告未写入，不伪造完整报告。8份拥有的系统保存副本经原证据唯一名称、同home原件及摘要全部核对后单独清理，见[独立清理](../../../dsh-mobile/artifacts/latest-mobile-runtime/file-formats-2dfd8cca-19cc-4042-a46c-93846f2a921e/owned-saved-copy-cleanup.json)；这是测试清理，不是产品自动恢复证明。

第二轮342.85秒在第9次系统分享面板检查失败：[原Host结果](../../artifacts/latest-runtime-check/latest-file-formats-e3f3c81c-0de9-4bbe-be16-dc6708855a10-test.json)、[清理](../../artifacts/latest-runtime-check/latest-file-formats-e3f3c81c-0de9-4bbe-be16-dc6708855a10-cleanup.json)和[Android失败](../../../dsh-mobile/artifacts/latest-mobile-runtime/file-formats-29ac0822-5e19-4316-9f1d-5a5ce3b1a810/latest-remote-android.json)保留。docx/doc/xlsx/xls的8次分享已完成，实际独立UID中恰有8份已发布快照；[原生分享服务](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteShareFiles.kt)的 `prepare` 在已有8份时明确拒绝新增，快照原生命周期为一小时。这里只根据实际缓存和现行原代码定位容量边界，没有把第9次的用户提示当作已实测。保留原缓存/权限/时钟，不手动删已分享快照以继续测试。先前两轮还使用较早candidate编译输出，与当前归档内容不同，不能冒充当前交付组合。

本轮通过原手机文件树、历史附件按钮、系统保存窗口和独立只读分享接收器，分别核对 `docx/doc/xlsx/xls/pptx/ppt` 的12份原件。每份都要求实际保存和另一UID收到的文件大小、SHA-256与电脑原件一致；历史附件旁的同名工作区文件故意保留不同内容，不能误读同名文件或转换PDF。电脑原件和同名差异文件在结束时再次核验，只清理本轮唯一命名且摘要匹配的系统保存副本。

当前归档第一发布组：[真实Host结果](../../artifacts/latest-runtime-check/latest-file-formats-1f6c35af-152b-4281-bde4-9822d3a3276d-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-file-formats-1f6c35af-152b-4281-bde4-9822d3a3276d-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-file-formats-1f6c35af-152b-4281-bde4-9822d3a3276d-cleanup.json)与[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/file-formats-1949bf24-b6a2-45e2-880b-99addbb064ae/latest-remote-android.json)通过；Vitest整轮278.34秒、整体280.35秒。TGZ为当前62文件候选，SHA-256 `16835594509559deb424e7d747ee7c64dfdabcf2d4f82bb7323a30f30daba0aa`，全部55源码及归档消费入口重新核对。docx/doc/xlsx各两类来源的6份系统保存、6次实际跨UID只读分享都与原件大小/摘要一致，写入和无关URI被拒绝，用户页面没有误报已发送；6份保存副本核验后删除、原电脑文件保持。六格式预览、缓存/服务重建、配对/历史/选模、实际撤销和原Host重启同时通过；页面错误为空，最终预期撤销401单列，无真实模型推理。这只证明本组三种格式，不借用先前旧candidate的其余通过记录。

当前归档第二发布组：[真实Host结果](../../artifacts/latest-runtime-check/latest-file-formats-57367044-11d7-4c23-b8ac-b3db6e284908-test.json)、[阶段](../../artifacts/latest-runtime-check/latest-file-formats-57367044-11d7-4c23-b8ac-b3db6e284908-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-file-formats-57367044-11d7-4c23-b8ac-b3db6e284908-cleanup.json)与[Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/file-formats-b66c3197-991a-4071-9888-2b21c01d6cb8/latest-remote-android.json)通过；Vitest整轮281.40秒、整体283.37秒。xls/pptx/ppt各两类来源的6份保存、6次跨UID分享均与原件大小/摘要一致，实际写入拒绝、没有已发送误报，6份保存副本核验后清除，电脑原件保持。原配对/历史/选模、六格式预览、服务重建、撤销和Host重启均通过；最终只有预期撤销401、无页面错误、不进行模型推理。pptx在原缓存容量内实际分享成功，不能把第二轮第9次分享失败当作pptx MIME错误。

两组发布测试后已通过原Launcher和实际MuMu侧栏恢复[原App前台Remote会话](../../artifacts/latest-runtime-check/latest-file-formats-main-restored-release-5527d919-23b6-4395-ab51-b4d430b9ab5d.json)：原PID32632、Host17620和会话 `session-d75f90e0-c89e-41f4-aca2-f09c1bf01415` 保持，页面没有iframe，没有重新填写或读取Key。另作[原件最终只读审计](../../artifacts/latest-runtime-check/latest-file-formats-release-original-audit-43232f4b-d114-4e41-8509-eef21bd49d0e.json)：按原 `storedFilePath` 契约定位两个独立home的历史附件，实际重新读取12份原件，大小/摘要仍与各自系统保存和只读接收结果一致；全部同名工作区差异内容保持，四个发布Host PID均不存在。该审计不执行新的传输或清理。

源码组合[完整终态记录](../../artifacts/latest-runtime-check/latest-source-file-formats-run-4d583675-f74d-48c1-b667-99f5f7ca4cad.json)和[37文件清单](../../artifacts/latest-runtime-check/latest-source-file-formats-run-4d583675-f74d-48c1-b667-99f5f7ca4cad-manifest.json)通过383.89秒完整候选构建、编码、源码单元、取消、插件重启、进程/包操作、模块身份及电脑应用回归。第一源码组 `word-and-xlsx` 完整通过，302.71秒测试、305.80秒外层：[原Host结果](../../artifacts/latest-runtime-check/latest-source-file-formats-a0db7893-5344-4732-ac27-90709185307a-test.json)、[清理](../../artifacts/latest-runtime-check/latest-source-file-formats-a0db7893-5344-4732-ac27-90709185307a-cleanup.json)、[实际Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/file-formats-92972164-3e62-41a5-97cf-3410b8e94991/latest-remote-android.json)。第二组 `xls-and-slides` 307.78秒测试、310.72秒外层通过：[原Host结果](../../artifacts/latest-runtime-check/latest-source-file-formats-83d487aa-c7ef-4d1a-85be-3e2d9e69309c-test.json)、[清理](../../artifacts/latest-runtime-check/latest-source-file-formats-83d487aa-c7ef-4d1a-85be-3e2d9e69309c-cleanup.json)、[实际Android](../../../dsh-mobile/artifacts/latest-mobile-runtime/file-formats-33d8ed9a-21b9-422d-9cbe-4d78a1eba9fc/latest-remote-android.json)。两组各自的原 `pnpm dsh web` 与当前62文件归档、6份原件保存/只读分享、6份副本清理、原件保持、撤销及Host重启全部核验。外层验证命令终态退出0；原37文件及根启动配置字节恢复，两个启动载入文件已移除，restore再次执行零写入、Git干净，原完整恢复构建381.66秒及原构建检查均成功。

四份真实链路结果另经[24份原件最终只读审计](../../artifacts/latest-runtime-check/latest-file-formats-all-original-audit-2c95bd35-c6e7-43c4-b250-79fdf8766147.json)逐项核验：重新读取当前TGZ与两个入口四个独立home的原件，确认原系统保存、分享接收的大小/SHA及原同名差异文件，八个拥有Host PID均不存在。审计明确 `fullSourceRestorationVerified:false`、`fullAcceptancePassed:false`，不借此跳过完整恢复。分享接收UID10166与Office App UID10162确实独立；临时接收器已单独卸载，原Office UID保留。[最终原App恢复](../../artifacts/latest-runtime-check/latest-file-formats-main-restored-both-0a008876-f766-429b-af93-dbff85279f20.json)核对原PID32632、Host17620、同一Remote聊天、无iframe和临时接收器缺失；MuMu实际显示原会话，未重新安装原App或读取Key。

终态后另作[完整恢复只读审计](../../artifacts/latest-runtime-check/latest-file-formats-restoration-audit-5ba53891-3701-40b2-b7c9-ed43f1481776.json)：再次按本轮清单读取37文件核对原SHA、读取Git和启动载荷状态；原官方 `readClientBuildRecord` 重新读取实际355资源，摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 与测试前一致，无活动源码租约。此前原件审计的恢复字段保持当时false，不倒写旧证据。[最新18目标/13组清单审计](../../artifacts/latest-runtime-check/patch-inventory-Yb9Ocv/report.json)也通过，仍明确 `fullAcceptancePassed:false`：六格式正常保存分享已通过，但不能关闭其他原标准、SDK/Electron及完整新版交付。当前Q盘仅约146MiB，原SDK空间失败与至少3GiB建议保持，不盲目重跑。

使用独立Office UID，原App/Key/绑定保持。测试接收器为现有已构建的独立 `.latestofficetest.test` APK；本轮临时安装并已在源码两组结束后单独卸载。测试只扩展验证器，不修改生产传输、鉴权或保存分享代码，不等同其他保存提供方、接收App故障或任意文件格式已通过。

发布入口设置 `DSHM_LATEST_FILE_FORMATS_CHECK=1`，同时保留 Android/Office/Office lifetime/file transfers 四个范围值，分别执行 `DSHM_LATEST_FILE_FORMATS_GROUP=word-and-xlsx` 和 `xls-and-slides`。每组独立Office测试配对只分享6份，明确核验该组3种格式、两类来源；两组合起来覆盖六格式，不声称同一个进程连续分享12份。源码命令为 `node scripts/verify-latest-source-remote.mjs --android --office --office-lifetime --file-transfers --file-formats`，同一原源码租约先后执行两组，严格消费本轮2份新报告后才记录成功，随后恢复原源码/资源。必须显式设置已核验的 ADB 路径与设备；与引擎取消、保存/写入/分享进程结束专项互斥。独立随机目录和发布/源码报告用于区分本轮，不复用旧报告。实测新增每种格式的系统保存/分享约45秒，两组共24次系统操作另加各自完整原回归；仅新增格式组的内层/外层时限为600/660秒，旧专项300/360秒和所有逐项字节/权限/UI断言保持。

专项使用原DSHM页面、原网关与Host请求、原Android系统保存窗口和分享面板。只操作独立 `dev.dshmobile.validation.latestofficetest`；测试接收器为其独立 `.test` UID。没有改动生产下载、页面、凭据、文件权限或缓存逻辑，也没有读取日常Key。

| 操作 | 发布与源码入口实测 |
| --- | --- |
| 保存工作区Word原件 | 点击「下载完整文件」，在实际系统窗口保存唯一测试副本；901字节及SHA256与电脑原件一致 |
| 保存历史Word附件 | 读取原附件身份，系统保存的901字节与原附件一致；不使用工作区内同名的不同内容 |
| 分享两类Word原件 | 实际系统面板选择「DSHM 新版分享验收」；另一UID通过ContentResolver读取完整字节，摘要匹配，写入与无关URI访问均被拒绝 |
| 分享状态 | 原页面仅提示已打开系统分享面板，没有把用户选择接收App误报为已发送 |
| 下载中断 | 原生下载已实际写入65536字节后，终止严格匹配原请求ID、会话和文件的设备socket；原页面提示下载未完成，临时文件清除，没有进入保存或分享 |
| 重新连接后重试 | 原连接自动恢复后，由用户重新点击下载；实际系统保存3145747字节完整文件，摘要与电脑源文件相同，不自动重放旧传输 |
| 清理 | 电脑源文件保持原字节；三份拥有的测试保存副本核验后删除，测试授权与Host按原清理路径释放 |

发布入口Word摘要为 `8c2071e6474c832aa46b107c7541a596d276e06ac22db0a7b1886e85308ac59e`；源码入口独立生成的Word摘要为 `263a0bc57aa69502b34e197f71c760efd38e5210103648303aa37892c18dae61`，两种入口各自核对电脑原件、系统保存和分享接收一致。大文件摘要均为 `81dd406c2b854c9afb5f427467296ef65befa14ada9dd5bbc2b634e044d5abaa`。

原生字节、保存与只读分享分别由 [RemoteDownloads.kt](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteDownloads.kt)、[RemoteDownloadStore.kt](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteDownloadStore.kt)、[RemoteShareFiles.kt](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteShareFiles.kt)及[RemoteFileProvider.kt](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteFileProvider.kt)处理。测试接收器 [RemoteShareReceiver.java](../../../dsh-mobile/android/app/src/androidTest/java/dev/dshmobile/validation/RemoteShareReceiver.java)按实际测试包派生并严格核对authority；[LatestRemoteShareReceiver.java](../../../dsh-mobile/android/app/src/androidTest/java/dev/dshmobile/validation/LatestRemoteShareReceiver.java)仅提供唯一接收入口，不含生产功能。

## 证据与复验

- [发布结果](../../artifacts/latest-runtime-check/latest-file-transfer-npm-relay.json)、[进度](../../artifacts/latest-runtime-check/latest-file-transfer-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-file-transfer-npm-cleanup.json)。
- [Android完整结果](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-npm-android.json)、[工作区系统分享](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-npm-share-workspace.png)、[附件系统分享](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-npm-share-attachment.png)、[断线失败页](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-npm-disconnected.png)。
- [源码联调结果](../../artifacts/latest-runtime-check/latest-file-transfer-source-relay.json)、[源码清理](../../artifacts/latest-runtime-check/latest-file-transfer-source-cleanup.json)、[源码Android结果](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-source-android.json)、[源码附件分享](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-source-share-attachment.png)、[源码断线页](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-transfer-source-disconnected.png)。源码联调外层208.41秒通过。
- [源码完整组合与恢复](../../artifacts/latest-runtime-check/latest-file-transfer-source-combined.json)、[固定清单](../../artifacts/latest-runtime-check/latest-file-transfer-source-manifest.json)：十一项/28文件候选完整构建287.69秒、原函数/取消/插件重启/进程与包操作/身份/应用回归通过；恢复构建287.18秒通过，28原文件、根启动脚本、两个bootstrap载入文件、355资源摘要精确恢复，Git干净。客户端摘要为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`。
- 发布Host40852/63180、首次失败Host37504、源码Host59968/46156均核对已退出；Office测试App停止，反向端口与设备授权清理；本轮安装的 `.latestofficetest.test` 接收器已卸载，其他接收器保留。三份保存副本在两次成功运行中分别核验并删除。
- [模型验收环境恢复](../../artifacts/latest-runtime-check/latest-file-transfer-model-resume.json)、[原聊天截图](../../artifacts/latest-runtime-check/latest-file-transfer-model-resume.png)：原Launcher后依次执行 `--restore` 和 `--verify-open`，回到原记录会话；PID16457、原绑定/数据、16901反向端口和两个零轮次空会话保留，管理权限false。未读取Key或执行真实推理。

首轮166.13秒失败于测试观察器：注册时手机已连接，只监听后续连接会遗漏原请求。失败报告 [首次结果](../../artifacts/latest-runtime-check/latest-file-transfer-npm-first-failed-relay.json)及[清理](../../artifacts/latest-runtime-check/latest-file-transfer-npm-first-failed-cleanup.json)保留，不计完整通过。观察器现同时挂接现有连接和后续设备连接，仍严格校验原clientFrame、指定会话/文件及手机原请求ID；没有伪造网络结果或修改产品协议。修正后发布入口182.94秒通过。

源码复验在插件目录执行以下命令，必须显式提供已核对的 `DSHM_ADB_PATH` 和 `DSHM_ANDROID_SERIAL`：

```text
node scripts/verify-latest-source-remote.mjs --android --office --office-lifetime --file-transfers
```

`--file-transfers`仅扩展测试范围，要求独立Office Android范围；原内层300秒、外层360秒时限保持。AndroidTest接收器已单独构建并核对安装UID，生产App未因该接收器重建。本轮保留基础配对、历史、选模、六格式预览、Office服务生命周期和原Host重启；不包括全量设置管理、动态插件、转换传输取消或设备权限专项。

## 系统保存窗口断线与下载进程结束

发布入口完整组合180.92秒通过，范围 `file-picker-and-process-lifetime`。实际完整3145747字节到达原系统保存窗口后，仅终止原请求所属设备socket：原窗口退出、暂存移除、无空目标文件，随后原页面自动重连，用户重新保存完整文件。提示为「已取消下载」，不把取消当作保存成功。

第二阶段实际写入65536字节后结束独立Office App进程，核验旧PID18618消失、部分文件确实在进程结束时残留；通过原Launcher启动新PID19989，经普通聊天抽屉进入自有Remote。原绑定自动重连、同一会话历史读取、启动清理旧部分文件、无自动保存均通过；用户重新保存完整3145747字节，SHA-256为 `81dd406c2b854c9afb5f427467296ef65befa14ada9dd5bbc2b634e044d5abaa`。两份测试保存副本核验后删除，源文件保持。

此次包含原配对、选模、六格式预览、Office服务生命周期、设备撤销及原Host重启；页面无错误，控制台只有撤销后的预期401，未调用真实模型。测试Host22140/28016已核对消失，临时设备与反向端口清理。实际源码pnpm同范围203.34秒（外层206.20秒）通过，原Launcher的新PID20851→22254、同一会话、原绑定、启动清理及两份完整重试/删除均通过；源码测试Host39584/65036核对已退出。

源码十一项/28文件完整构建293.66秒、41项源码函数、159项取消、188项原客户端、五项真实pnpm进程、72项operations、模块身份及八项应用服务通过。原构建恢复289.60秒，28原源码/根脚本/两个bootstrap载入文件逐字节恢复、355资源原摘要一致，Git干净。

- [发布结果](../../artifacts/latest-runtime-check/latest-file-picker-npm-relay.json)、[阶段](../../artifacts/latest-runtime-check/latest-file-picker-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-file-picker-npm-cleanup.json)。
- [实际Android结果](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-android.json)、[原保存窗口](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-picker-ready.png)、[断线清理](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-picker-canceled.png)、[结束进程前](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-before-process-stop.png)、[原Launcher重开后的同一会话](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-after-process-reopen.png)。
- [源码结果](../../artifacts/latest-runtime-check/latest-file-picker-source-relay.json)、[完整组合](../../artifacts/latest-runtime-check/latest-file-picker-source-combined.json)、[固定清单](../../artifacts/latest-runtime-check/latest-file-picker-source-manifest.json)、[源码清理](../../artifacts/latest-runtime-check/latest-file-picker-source-cleanup.json)、[源码Android结果](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-source-android.json)、[原Launcher重开截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-source-after-process-reopen.png)。
- [APK165资源逐字节核对](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-apk.json)；[模型环境恢复](../../artifacts/latest-runtime-check/latest-file-picker-model-resume.json)及[原会话截图](../../artifacts/latest-runtime-check/latest-file-picker-model-resume.png)：PID16457、原绑定/数据/16901和两条零轮次空会话保留，管理false，未执行真实推理。日常旧DSH112文件/17清单只读检查通过。

## 首轮失败与修复边界

第二轮发布170.80秒在保存窗口断线清理、无空目标和完整重新保存后，通过原Launcher重开App时实际报普通聊天 `inactive_plugins`，整体仍失败。[失败结果](../../artifacts/latest-runtime-check/latest-file-picker-npm-second-failed-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-file-picker-npm-second-failed-cleanup.json)、[Android截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-second-failed-android.png)保留；Host73988退出已核验。新版本地设置接口及隔离输入provider已修复，新旧页面/输入生命周期浏览器回归通过，见[实际冷启动诊断](../../../dsh-mobile/docs/integration/latest-ordinary-boot.md)；原Android完整组合现已在发布与源码入口通过，不绕过原Launcher或禁用输入插件。

专项使用 `--file-transfers --file-picker`，不要求安装分享接收器，不重复上一项系统分享，原300/360秒时限不变。发布与源码同范围及完整恢复均通过。

首轮139.29秒失败于测试只接受一般下载失败提示，实际原生关闭系统窗口后先返回「已取消下载」。失败结果[联调报告](../../artifacts/latest-runtime-check/latest-file-picker-npm-first-failed-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-file-picker-npm-first-failed-cleanup.json)、[Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-picker-npm-first-failed-android.json)保留，Host26884已核对退出，不计专项通过。测试现接受两种明确未保存的原有结果，仍必须核验真实socket closed/ready、原生文件清除、系统窗口关闭及无目标文件；不把手动断开或成功保存当作通过，也不修改产品文案。

## 实际目标写入期间的进程结束

发布入口专项173.72秒、实际源码pnpm192.95秒（外层195.91秒）通过，范围`file-target-write-process-lifetime`。生产保存、下载、认证和传输代码未变，本轮只扩展调试保存位置与实际Android测试驱动。

测试先通过原Remote将3145747字节完整下载并核对SHA-256，再在原Android系统保存窗口选择「DSHM 写入验收」。该保存位置仅存在于独立Office调试UID、有明确私有控制文件时，由[调试DocumentsProvider](../../../dsh-mobile/android/app/src/debug/java/dev/dshmobile/validation/RemoteSaveProbe.kt)注册；不是将保存结果替换为测试回复。目标实际收到4096字节后暂停，结束App PID23379，确认原进程不存在、目标部分文件与原件前4096字节摘要一致，原生产保存日志只有一字节的未确认标记。日志不记录目标URI或文件名。

通过原Launcher启动新PID24328，普通聊天与原抽屉进入的Remote均显示「上次文件保存结果未确认」。按返回关闭提示后，原绑定及同一会话恢复；再次结束/启动，提示仍保留。点击「知道了」后再重启不重复提示。各次重启和确认都不删除、自动续传或覆盖目标部分文件；启动仅清除原下载暂存。最后通过原系统下载目录手动保存完整原件，字节及SHA-256与源文件一致。原生产实现为[RemoteDownloads.kt](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteDownloads.kt)和[RemoteSaveRecovery.kt](../../../dsh-mobile/android/app/src/main/java/dev/dshmobile/validation/RemoteSaveRecovery.kt)。

- [发布链路结果](../../artifacts/latest-runtime-check/latest-file-write-death-npm-relay.json)、[进度](../../artifacts/latest-runtime-check/latest-file-write-death-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-file-write-death-npm-cleanup.json)。
- [实际Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-npm-android.json)、[目标写入中](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-npm-target-writing.png)、[普通入口提示](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-npm-write-death-ordinary-warning.png)、[Remote入口提示](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-npm-write-death-remote-warning.png)、[原会话恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-npm-write-death-session-restored.png)、[未确认再次重启](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-npm-write-death-unacknowledged.png)。
- [独立APK165个资源摘要核对](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-apk.json)。独立APK构建及lint通过，后端类型检查通过。
- [源码链路](../../artifacts/latest-runtime-check/latest-file-write-death-source-relay.json)、[完整组合及原资源恢复](../../artifacts/latest-runtime-check/latest-file-write-death-source-combined.json)、[固定清单](../../artifacts/latest-runtime-check/latest-file-write-death-source-manifest.json)、[清理](../../artifacts/latest-runtime-check/latest-file-write-death-source-cleanup.json)、[源码Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-source-android.json)、[原普通入口提示](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-source-write-death-ordinary-warning.png)、[原Remote入口提示](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-source-write-death-remote-warning.png)、[原会话恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-write-death-source-write-death-session-restored.png)。源码进程PID25762→26727，目标实际4096字节、提示跨重启、确认、部分文件保持及完整手动保存/清理均通过。

源码十一项/28文件完整构建289.85秒，41项源码函数、159项取消、188项原客户端、五项真实pnpm进程、72项operations、模块身份和八项应用服务通过；原构建恢复286.76秒，28原源码/根启动/两个bootstrap载入文件逐字节恢复，355资源原摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`一致，Git干净。新增调试provider的既有原生测试编译通过，手机文件读取/下载19项回归通过。本轮未安装或运行新的分享接收器。

发布Host71996/33656、源码Host72980/73124清理后均核对不存在，临时设备授权、Office UID和反向端口释放。两种入口各一份完整副本及私有部分目标由测试最终清理，电脑源文件保持。[模型环境恢复](../../artifacts/latest-runtime-check/latest-file-write-death-model-resume.json)与[原聊天截图](../../artifacts/latest-runtime-check/latest-file-write-death-model-resume.png)记录原Launcher/restore/verify-open恢复，原PID16457、绑定、16901端口及两条零轮次空会话保持，管理false。日常DSH112文件/17清单只读核对通过，没有替换日常App或读取Key。

测试控制根目录在进程结束后隐藏，实际部分文件保留到全部恢复检查结束；只在测试清理阶段删除本次UUID登记的私有目标和已核对摘要的完整副本，电脑原件保持。包含原配对/批准、历史、选模、六格式Office预览与服务生命周期、撤销及原Host重启；发布链路只有撤销后的预期401，`inferenceVerified=false`。没有安装新的分享接收器，也不将受控保存位置的结论扩展到任意云盘、所有系统崩溃或分享准备阶段。

源码复验使用独立选项，与`--file-picker`互斥，原300/360秒联调时限保持：

```text
node scripts/verify-latest-source-remote.mjs --android --office --office-lifetime --file-transfers --file-write-death
```

## 分享副本准备期间的进程结束

发布入口149.60秒、实际源码pnpm164.70秒（外层167.72秒）通过，范围`file-share-preparation-process-lifetime`；源码完整组合与原文件/资源恢复均通过。测试使用原Remote页面、真实Host下载与原生分享复制，生产保存/分享/认证代码保持原样。对比在生产复制逻辑增加暂停回调，本项选择独立调试UID的私有FIFO控制读取进度：原件实际完整下载并核对字节和摘要后，将这份私有原件移入唯一测试备份，由[调试供给器](../../../dsh-mobile/android/app/src/debug/java/dev/dshmobile/validation/RemoteShareFeedProbeActivity.kt)将实际前65536字节供给原复制线程，随后暂停。没有替换电脑源数据、分享结果或网络回复。FIFO仅是测试辅助物，其清理不计为生产启动清理。

发布实测：原分享未发布副本实际收到65536字节，摘要与真实原件前缀一致；FileProvider无法为该部分文件生成URI，系统分享面板尚未打开。App PID29543实际结束后部分副本仍存在；原Launcher启动新PID30383，经普通聊天抽屉进入Remote后，由原分享目录生命周期清除旧未发布副本及目录，先前完整快照仍保持原字节。原绑定/同一会话恢复，不自动分享；手动重新操作后，另一UID再次读取完整3145747字节，SHA-256均为`81dd406c2b854c9afb5f427467296ef65befa14ada9dd5bbc2b634e044d5abaa`，写入和无关URI访问均被拒绝。只操作`dev.dshmobile.validation.latestofficetest`及其独立`.test`分享接收器。

- [发布链路](../../artifacts/latest-runtime-check/latest-file-share-death-npm-relay.json)、[进度](../../artifacts/latest-runtime-check/latest-file-share-death-npm-progress.json)、[清理](../../artifacts/latest-runtime-check/latest-file-share-death-npm-cleanup.json)。
- [实际Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-android.json)、[复制中元数据](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-copying.json)、[第一次实际系统分享](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-share-before-death.png)、[复制中](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-share-copying.png)、[原会话恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-share-death-session-restored.png)、[完整手动重试](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-share-after-death.png)。

- [源码链路](../../artifacts/latest-runtime-check/latest-file-share-death-source-relay.json)、[完整组合与恢复](../../artifacts/latest-runtime-check/latest-file-share-death-source-combined.json)、[固定清单](../../artifacts/latest-runtime-check/latest-file-share-death-source-manifest.json)、[清理](../../artifacts/latest-runtime-check/latest-file-share-death-source-cleanup.json)。
- [源码Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-source-android.json)、[复制元数据](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-source-copying.json)、[实际复制中](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-source-share-copying.png)、[原会话恢复](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-source-share-death-session-restored.png)、[完整手动重试](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-source-share-after-death.png)。源码进程PID30968→31779，真实65536字节及前缀摘要、旧未发布副本/目录清除、已发布快照保持、同一绑定/会话恢复和完整只读重试均核验。

源码十一项/28文件完整构建290.20秒，41项源码函数、159项取消、188项原客户端、五项真实pnpm进程、72项operations、模块身份和八项应用服务通过；原构建恢复289.62秒、28原源码/根启动/两个bootstrap载入文件逐字节恢复，355资源原摘要`517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`一致，Git干净。

原电脑文件保持，测试FIFO/备份/控制文件已清理。已交付的完整分享快照保持原生产生命周期，不以清理测试辅助物证明生产未发布副本清理。发布Host40820/71756及源码Host35332/28488已核对退出，临时设备与端口清理；本轮安装的独立`.latestofficetest.test`接收器已卸载，其他接收器保留。[模型验收环境恢复](../../artifacts/latest-runtime-check/latest-file-share-death-model-resume.json)与[原会话截图](../../artifacts/latest-runtime-check/latest-file-share-death-model-resume.png)记录原Launcher/restore/verify-open：原PID16457、绑定、16901端口及两条零轮次空会话保持，管理false，未读取Key或执行真实推理。日常DSH112文件/17清单只读核对通过。其他保存/分享提供方、更大文件或任意断电/系统崩溃不在本项通过范围。

首轮发布117.04秒失败在App已实际结束之后：测试器把Android `stat -c %F` 的预期写成`fifo`，系统实际返回`FIFO (named pipe)`。失败[链路](../../artifacts/latest-runtime-check/latest-file-share-death-npm-first-failed-relay.json)、[清理](../../artifacts/latest-runtime-check/latest-file-share-death-npm-first-failed-cleanup.json)、[Android报告](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-first-failed-android.json)与[复制截图](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-npm-first-failed-copying.png)保留。Host42152已核对退出，此轮不记通过。严格类型识别现接受已确认的FIFO名称，仍要求原生`S_ISFIFO`、实际复制字节、部分文件摘要和真正进程结束；另在结束进程前记录复制阶段元数据，不以修正类型文字替代全部重跑。

独立APK与测试接收器构建、lint及后端类型通过，[APK165资源](../../../dsh-mobile/artifacts/latest-mobile-runtime/latest-file-share-death-apk.json)与已验证Web产物逐字节一致。源码同范围使用以下独立选项，与保存窗口/目标写入专项互斥，原300/360秒时限保持：

```text
node scripts/verify-latest-source-remote.mjs --android --office --office-lifetime --file-transfers --file-share-death
```

## 尚未覆盖

这轮Word原件和约3MiB二进制下载不代表所有格式、256MiB上限或任意第三方接收App通过。实际目标写入中进程结束及分享副本准备中进程结束，已在发布与源码入口的受控范围通过；其他保存/分享提供方、文件权限/操作系统、源版本或附件引用在途变化，以及更广网络时序仍须独立验证。真实模型尚未调用，`inferenceVerified`保持false；日常旧版DSH不升级。
