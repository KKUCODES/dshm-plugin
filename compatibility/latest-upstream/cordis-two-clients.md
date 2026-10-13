# 新版动态插件双客户端并发与重连

- 状态：固定 npm 发布与实际源码 `pnpm dsh web` 两种 Host 入口、真实中转的双浏览器、Android＋浏览器及同一 MuMu 内两个独立 Android 客户端专项通过；完整新版兼容未交付。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-10-07。
- 固定目标：DSH `0.2.1-alpha.1`，commit `5badb15009ae1756c3afe0ae0cef1faafc290ccc`；候选 `0.1.76-latest.0`。
- 来源：[实际测试](../../../backend/tests/latest-cordis-two-pages.test.ts)、[测试 Host 控制器](../../../backend/tests/support/latest-cordis-race-fixture.mjs)、[DSHM 页面载体](../../../backend/tests/support/latest-cordis-race-page.mjs)、下方实际报告及 [KKC-24](https://linear.app/kkcodes/issue/KKC-24)。

## 实际调用路径

本专项使用[真实归档第二轮](./candidate-package.md#安装包到中转的实际协议链路)的解包 Host 入口，归档 SHA-256 为 `3823bc99e1b31e35a966e32e0ffe776a027d7c1686ef026b6f8a600bcc4097cc`。测试核对归档摘要，并由系统 tar 读取归档内 `dist/index.js`，逐字节比较实际加载入口；不覆盖持续模型环境的候选。

原 `dsh web --patch` 在全新独立 home 启动，仅额外加载测试控制器。控制器调用原动态 Runner 定义三个版本，并由原 `run` 产生待审批记录；Host、生产网关/Store、现有 ES256/DPoP、票据和 WebSocket 全部真实。PGlite 是隔离数据库载体。两个页面各持独立身份及批准记录，加载 DSHM 自己的 `remote.html` 和原局部插件组件，375×667 Headless Edge 只替代 Android 原生桥。

隔离 home 没有用户 Key。为进入原手机会话列表，通过原 prompt 产生真实缺凭据历史，未制造模型回复；双浏览器报告保持 `inferenceVerified:false`、`androidVerified:false`，Android专项见下方。测试审批来自控制器调用原 Runner，不代表模型生成插件代码。

## 已核验场景

| 场景 | 真实断言 |
| --- | --- |
| 第一端旧拒绝，第二端正在批准版本 1 | 暂缓第二端原 `getClientCode` 字节，使 Host 保持 `client-pending`；第一端真实按钮发送的结算返回 `accepted:false`，原审批/运行编号及阶段保持。释放原字节后正常运行。 |
| 第一端重复批准，第二端正在批准版本 2 | 暂缓实际响应并保留第一端旧审批按钮；真实 `runHostHalf` 拒绝迟到操作，原审批/运行编号保持，版本 2 正常完成。 |
| 两端共享版本 2 | 第一端显式加载局部界面时复用同一 Host activation，运行编号不变。 |
| 同一设备断线后重新进入 | 结束第一端实际 socket 和页面，使用该设备新票据重新连接；原面板先显示 Client 待激活，用户加载后运行编号保持，无重新配对或批准。不是 Android 后台自动重连验收。 |
| 第二端拒绝版本 3，第一端迟到批准 | 原 Host 拒绝旧批准，版本 3 未加载；两端仍显示版本 2，点击各自局部按钮均由原 Host 返回 `LATEST_RACE_HOST_V2`。 |
| 一端停止与重新运行 | 停止后 Host activeRun 清除、两端局部界面卸载；显式重新运行创建新 activation，另一端显式加载后共享新编号。 |
| 一端移除 | 原 inventory 清空，两端旧行和局部界面均消失。 |
| 撤销与清理 | 两个测试设备撤销后票据均 401；测试页面、socket、网关、数据库和拥有的 Host 清理，系统 ESRCH 核对启动 PID 已退出。 |

延迟发生在测试载体接收边界：捕获并重放原响应字节，不生成替代结果。队列限制 256 帧及 8 MiB，保留每帧长度和 SHA-256。审批结果、调用编号和原 inventory 分别核对；面板收起不作为操作成功依据。

## 实际证据与失败保留

[基础通过报告](../../../backend/.test-data/latest-cordis-two-pages-97nune/report.json)用时18.106秒，覆盖三种审批竞争、共享/版本保留/调用/移除/撤销。[重连追加报告](../../../backend/.test-data/latest-cordis-two-pages-O15lEi/report.json)用时21.926秒，增加同设备新票据重入与原运行保持。[停止及清理追加报告](../../../backend/.test-data/latest-cordis-two-pages-8QJOmr/report.json)用时22.164秒，增加两端停止、显式重新运行后共享新 activation，以及清理完成标记；页面/控制台错误均为空。

[最终归档字节核对轮次](../../../backend/.test-data/latest-cordis-two-pages-NpF8bq/report.json)用时22.810秒（Vitest整体24.24秒），在上述完整范围上实际由 tar 核对加载入口与归档字节相同，并保留256帧/8MiB延迟上限。两设备撤销、全部页面/连接/网关/数据库清理和启动PID系统退出核对通过；持续模型Host及App原PID保持，未改动用户会话或绑定。

三个早期失败保留，不算产品修复或通过：

- [空会话导航断言](../../../backend/.test-data/latest-cordis-two-pages-SNUBZz/report.json)：原列表隐藏空会话，未找到测试标题；改为原 prompt 形成真实缺凭据记录。
- [面板自动收起断言](../../../backend/.test-data/latest-cordis-two-pages-t12G4P/report.json)：实际迟到拒绝已被拒绝、原运行保持，但清单被在途目录重新展开。改为核验旧审批按钮消失，再用原按钮关闭清单。
- [拒绝新版本后重跑旧版的编号断言](../../../backend/.test-data/latest-cordis-two-pages-jqHRtR/report.json)：原 Host 在最新尝试已拒绝后显式重跑旧版会创建新 activation。共享原 activation 的核验放在版本 2 正常运行时；拒绝版本 3 后核验两端版本 2 仍可调用。未修改生产 Runner 来满足测试假设。

## Android＋浏览器实际验收（2026-10-07）

同一真实归档 Host 增加独立 Android UID `dev.dshmobile.validation.latestofficetest`，使用原生配对、ES256/DPoP、票据、WebSocket 和资源桥，加载 DSHM 自有页面。另一个客户端仍为375×667浏览器。主模型 App `latesttest` 不重装、不清除，原 Key/绑定保持；独立测试包用现有缓存离线构建，Gradle 成功并实际安装。

[Android 载体](../../../backend/tests/support/latest-cordis-race-android.mjs)在操作前核对安装 APK、构建 APK 的 SHA-256 相同，165个页面资源路径/字节与当前实际构建完全一致。APK SHA-256：`bb735ce32893c29f4a57d9a5074d971c5850ccc9a165437ff513818e0d0d3bb9`。实际配对后由电脑按唯一指纹批准，只保留聊天权限；手机显示真实缺凭据历史，没有注入模型输出。

Android 的代码响应在[测试专用中转门](../../../backend/tests/support/latest-cordis-native-gate.mjs)暂缓，保留原响应字节、文本/二进制类型、选项与发送回调；鉴权和协议均保持生产实现。门安装在首个浏览器已连接之后，观察随后接入的连接；后续浏览器重新进入也会被观察，因此最终 `resources/pageConnections` 总数不是纯 Android 计数。`nativeResourceReadsBeforeBrowserReentry` 单独证明浏览器重新进入前的原生资源读取。队列同样限制256帧/8MiB。

[首轮失败](../../../backend/.test-data/latest-cordis-android-browser-02TCOh/report.json)保留：测试工具将原文本载荷改成 Buffer，ws 将其发成二进制帧，原生文本监听未收到代码，Host 停在 client-pending。原配对/历史正常，页面无错误；只修正测试工具保持原发送类型，未修改生产桥、协议或 Runner。[真实网络回归](../../../backend/tests/latest-cordis-native-gate.test.ts)分别核对文本、二进制、中文/emoji内容和回调，两个场景通过；最初回调错误误断言为 undefined 而实际 null 的测试失败亦仅修正验证器。

[Android基础通过](../../../backend/.test-data/latest-cordis-android-browser-aNvd26/report.json)28.315秒；[自动重连追加](../../../backend/.test-data/latest-cordis-android-browser-N1BgsS/report.json)31.030秒；[最终资源/错误范围核对](../../../backend/.test-data/latest-cordis-android-browser-5Fwu09/report.json)30.797秒（整体32.84秒，含两项测试门回归）。全部覆盖上表三种迟到审批、原运行保留、版本2的局部UI和原Host调用、停止/显式重跑/同步移除。新增实际关闭 Android 页面 socket 后自动建立新连接/订阅，同页面局部UI继续调用版本2；原绑定、聊天权限和 Host activation 保持。浏览器另核对同设备新票据重入。

撤销前两端页面/控制台错误为空；撤销后的 Android 原连接页显示“连接授权已失效”，仅出现预期 `[Remote] http_401`，不能声称全程控制台无错误。两设备原状态均 revoked，浏览器新票据401，手机原重连失败。独立 App、adb reverse、所有测试页面/socket/网关/数据库和拥有的Host均清理，系统 ESRCH 核对启动PID。主模型Host/监督进程和App原PID保持；`androidVerified:true` 只代表本专项，`inferenceVerified:false` 保持。

[主环境恢复核对](../../../backend/.test-data/latest-cordis-android-browser-5Fwu09/main-restored.json)另核对主App的原APK摘要及PID12296保持、四轮测试启动PID不存在、独立测试App停止、只保留原16901端口映射；通过正常Launcher及Remote入口恢复原模型会话，未发送消息。[双浏览器入口回归](../../../backend/.test-data/latest-cordis-two-pages-i0731U/report.json)24.149秒完整通过，确保新增Android分支未破坏原入口。后端类型与两个helper语法检查通过。

Android专项在同一后端目录执行：

```powershell
$env:DSHM_LATEST_CORDIS_TWO_PAGES='1'
$env:DSHM_LATEST_CORDIS_ANDROID='1'
$env:DSHM_ANDROID_SERIAL='emulator-5554'
$env:DSHM_ADB_PATH='C:/Users/KKirin/AppData/Local/Android/Sdk/platform-tools/adb.exe'
node node_modules/vitest/vitest.mjs run tests/latest-cordis-two-pages.test.ts tests/latest-cordis-native-gate.test.ts
```

环境变量仅在执行测试的进程设置，普通运行不启用。须先按手机现有构建入口生成并安装 `latestCompatibilityTest=true/latestOfficeLifetimeTest=true` 的独立测试包；测试核验真实载荷后只清理该 UID，不能将包名改为主模型 App。

## 实际源码入口（2026-10-07）

同一测试增加 `DSHM_LATEST_SOURCE_CHECK=1` 分支。启动前由原源码验证器核对固定 commit、13项/36文件载荷及实际355个客户端资源，再在源码目录执行原 `pnpm dsh web`；Host控制器、生产中转、两端身份、审批和原响应延迟保持上述真实路径，不用发布 CLI 代替源码入口。

[源码 Android＋浏览器报告](../../../backend/.test-data/latest-cordis-source-Ma49Rs/report.json)57.309秒通过，`androidVerified:true/inferenceVerified:false`；浏览器重新进入前实际原生代码资源读取3次，三种迟到审批、原运行/版本保留、手机真实 socket 断开后的自动重连、停止/重跑/移除与撤销清理全部通过。[源码双浏览器报告](../../../backend/.test-data/latest-cordis-source-RV2HrG/report.json)33.409秒通过同范围，`androidVerified:false`。两轮均在撤销前没有页面/控制台错误，拥有的启动进程及全部传输已清理。

源码环境通过[独立归属记录管理器](../../scripts/manage-latest-live-source.mjs)的 `--scope=cordis-race` 准备与恢复，不覆盖其他轮次证据。实际完整载荷构建343.598秒成功，355资源摘要为 `6da3b3f27472e66fdfad2b507adcfe2cedbf64ea685883cee2ef33b40866d8af`。原源码/启动字节已恢复；首次原完整构建184.233秒因 DevTools 目录 rename 的 EPERM 退出1，无超时，[失败日志](../../artifacts/latest-runtime-check/latest-live-source-cordis-race-restored-build.log)和[排他失败快照](../../artifacts/latest-runtime-check/latest-live-source-cordis-race-restore-failed-lease.json)保留。管理器的本轮 `retry-restore` 仅接受该实际错误且原字节已经恢复的记录；[同一原完整构建重试](../../artifacts/latest-runtime-check/latest-live-source-cordis-race-restored-build-retry-2.log)221.746秒退出0，无超时，不改原 DevTools 源码或构建命令。36原源码/启动字节、Git干净及355原资源摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 精确核对后，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-cordis-race-final.json)。Windows rename 故障本身未修复。

执行源码 Android 分支时，先在插件目录运行 `node scripts/manage-latest-live-source.mjs prepare --scope=cordis-race`，再在后端目录运行上方 Android 命令并额外设置 `DSHM_LATEST_SOURCE_CHECK=1`；双浏览器分支不设置 Android 标志。所有测试 Host 退出后，在插件目录运行 `node scripts/manage-latest-live-source.mjs restore --scope=cordis-race`，核对原完整构建，再用 `node scripts/archive-latest-live-source-lease.mjs cordis-race-final` 归档。存在未恢复的归属记录时，禁止重新准备或覆盖记录；上述明确的恢复构建 EPERM 可用 `retry-restore --scope=cordis-race` 留存首轮失败后重试，其他错误不由此入口放行。

[主 App 恢复核对](../../../backend/.test-data/latest-cordis-source-Ma49Rs/main-restored.json)确认原安装包摘要和 Android PID12296保持、只保留原16901映射；MuMu 前台实际显示原「DSHM 新版手机真实模型验收」会话及空输入框，没有重装或清除主 App 数据。

## Android 旧代码跨连接迟到（2026-10-07）

[原生接收队列](../../../backend/tests/support/latest-cordis-native-queue.mjs)保留已经经过生产鉴权、中转、实际 WebSocket 和原生桥的 `event.data` 原字符串；只暂缓原 `getClientCode` 响应，其余断线/就绪通知原样交付。新连接建立后通过原面板显式加载，再把旧请求编号和完全相同的原字节交还原监听器。队列仍限制256帧/8MiB，逐帧记录摘要，不替换代码、协议或审批结果。

原 DSH 在代码尚未加载完成时不会自动重放用户运行。测试核验：断线前新 Host activation 保持 `client-pending`；重连后的显式加载使用新的请求编号并保持同一 Host activation；释放旧响应后没有额外 `runHostHalf/settleUserRun/resolveRequestRun`，当前局部界面仍为版本2且能真实调用 Host。随后继续三种迟到审批、拒绝版本3后版本2保留、两端停止/重跑/移除和两设备撤销。

专项发现操作收尾在离线期间仍发起新的 inventory 读取。固定新版的[共享源码变换](./cordis-inventory-ready.mjs)在所有刷新入口检查原 `connection.generation`；断线不发请求，就绪后的原 reset 仍读取真实清单。旧读取失效、当前真正的读取错误继续展示，不按错误文案忽略失败。[两项原 UI 入口回归](../../tests/latest-cordis-inventory-ready.test.mjs)和实际源码七项原生命周期/清单/转发回归通过。旧版变换及其固定哈希未改动，旧版[生命周期七项](../cordis-client-lifetime/core.test.mjs)及[清单六项](../cordis-inventory-sync/core.test.mjs)回归也通过。

[发布入口报告](../../../backend/.test-data/latest-cordis-late-code-Dlz6dA/report.json)38.119秒通过。原 CLI 在独立 home 用标准 patch 禁用原 `ui-cordis` 行，挂载由固定原 bundle 派生的同名独立兼容包；主模型 Host 的安装文件没有被覆盖。手机实际资源字节包含就绪检查，兼容客户端 SHA-256 为 `f1a15ed98063fb01c6cbe8387fdc665836e80a87debcb3b3fabc18e99c5de66d`；清理时再次核对原安装文件摘要保持。旧913字节响应以相同摘要重放；`oldResponseIgnored/originalBytesReplayed/noExtraSettlement` 均为真。

[实际源码报告](../../../backend/.test-data/latest-cordis-late-code-Zmozjc/report.json)48.618秒通过同一真实 Android＋浏览器路径，启动命令为原 `pnpm dsh web`，不用发布载体代替源码运行。13项/36文件完整构建378.060秒成功，355个候选资源摘要 `eb7f58c2aab58bdb634ac36b6838e5a125ff21ab3321ccbb5f5617cc2c699aef`。两轮均 `androidVerified:true/inferenceVerified:false`，撤销前仅保留原 getClientCode 因连接中断的单条加载诊断，没有额外 inventory/页面错误；撤销后只允许新增预期401。测试身份、传输、数据库和拥有的启动进程均清理。

本轮源码归属为 `--scope=cordis-late-code`，[原完整恢复构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-late-code-restored-build.log)383.106秒退出0，无超时；36原源码/启动字节、Git干净与355原资源摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 精确核对后，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-cordis-late-code-final.json)。[主 App 恢复核对](../../../backend/.test-data/latest-cordis-late-code-Zmozjc/main-restored.json)确认原APK/PID12296保持、原Remote聊天和空输入框恢复、测试UID停止及只保留原16901映射；主Host14292/监督48088保持。没有重装或清除主App，也没有提交、推送或发布新版支持声明。

失败记录均保留：[U86rrG](../../../backend/.test-data/latest-cordis-late-code-U86rrG/report.json)误以为未完成激活会自动恢复；[moRun3](../../../backend/.test-data/latest-cordis-late-code-moRun3/report.json)在新目录尚未呈现时点击旧面板；[RXBT2q](../../../backend/.test-data/latest-cordis-late-code-RXBT2q/report.json)暴露真实离线 inventory 读取；[t2xYc8](../../../backend/.test-data/latest-cordis-late-code-t2xYc8/report.json)使用错误的 patch name 替换方式，实际仍加载旧包；[cDdCGo](../../../backend/.test-data/latest-cordis-late-code-cDdCGo/report.json)被新增的实际资源字节检查拒绝。原 patch 的 name 是身份校验而不是名称改写，后两轮测试驱动失败不算补丁生效或产品回归通过。

执行前先在插件目录用新独立 scope 准备源码，再在后端运行既有 Android 命令，额外设置 `DSHM_LATEST_CORDIS_LATE_CODE=1`；源码模式同时设置 `DSHM_LATEST_SOURCE_CHECK=1`。所有拥有的 Host 停止后，以同一 scope 恢复并核对原完整构建，再归档 `cordis-late-code-final`。已经归档的旧 scope 不重复使用。

## 两个独立 Android 客户端（2026-10-07）

本专项使用同一台 MuMu 中两个独立 UID、凭据和 WebView，不代表两台实体手机或两个 Android 系统版本。新增 `dev.dshmobile.validation.latestcordispeer` 专用测试包，与既有 `latestofficetest` 配对同一独立 Host；不使用主模型 `latesttest` 的 Key 或绑定。[Gradle 配置](../../../dsh-mobile/android/app/build.gradle.kts)只增加独立验证构建选项，正式及既有验证包名保持。[完整构建日志](../../../dsh-mobile/artifacts/latest-cordis-peer-android-build.log)记录离线构建67秒成功。新 APK SHA-256 为 `ec71a35ed3d6c2a31c8a3c79528ef34efe8f93d77d4d3cbe82f93d191b95cd47`；两个实际安装 APK 的165个 Web 资源均与同一当前构建逐字节一致。

[原生载体](../../../backend/tests/support/latest-cordis-race-android.mjs)先核对明确归属的包名、APK 与页面字节，再走原配对、批准、票据、socket 和资源桥；每次页面输入前恢复对应的真实 Android task，等待 WebView 可见，不强制操作暂停页面。[测试门](../../../backend/tests/support/latest-cordis-native-gate.mjs)只接入明确启动的下一条测试连接，两个门分别延迟各自原始流或代码字节；需要断线验证时才重新接入该客户端的新连接。没有按名称伪造身份或修改生产鉴权。三个真实文本/二进制与双连接隔离回归、四项精确 PID 选择测试通过。

[npm 发布报告](../../../backend/.test-data/latest-cordis-two-android-47vjEd/report.json)80.694秒通过，整体含三项测试门回归为83.06秒。两端不同指纹/设备编号、两种并发批准和拒绝后的迟到批准、原审批与运行保持、版本2局部界面及真实 Host 调用、两个原生客户端各自断线后的自动连接、913字节旧代码跨连接迟到、停止/重跑/移除和两设备撤销后拒绝重连全部核验。两门分别捕获2与3次原页面连接，证明重连没有接管另一设备。`androidVerified:true/inferenceVerified:false`：本专项使用真实缺凭据历史，不冒充模型推理。

撤销前第一端没有页面/控制台错误，第二端仅有原 getClientCode 在被刻意关闭的连接上的一条未知结果诊断；撤销后只允许原401，列表/页面错误保持空。所有测试身份实际 revoked；拥有的 Host/传输/数据库与两个测试 UID 已停止，主运行包摘要保持。失败[fzUIzN](../../../backend/.test-data/latest-cordis-two-android-fzUIzN/report.json)保留：第一端尚未加载第二端新创建的 Host activation，测试误以为重连后会自动加载。只修正为等待新目录、点击原加载按钮，没有修改生产运行语义；失败轮清理与通过轮撤销分别记录。

[实际源码报告](../../../backend/.test-data/latest-cordis-two-android-Kd7uv7/report.json)91.706秒通过同一双原生范围，整体含三项测试门回归为94.06秒。原 `pnpm dsh web` 启动、13项/36文件与355资源已实际核对；独立 `--scope=cordis-two-android` 的[完整候选构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-two-android-patched-build.log)395.224秒成功，355资源摘要为 `eb7f58c2aab58bdb634ac36b6838e5a125ff21ab3321ccbb5f5617cc2c699aef`，与上一轮同一载荷一致。两端独立身份、各自真实重连、913字节原响应迟到、原UI/Host调用、审批、停止/重跑/移除和撤销均通过；错误范围与npm专项相同。该范围不新增电脑补丁，也没有冒充真实模型推理。

[主环境恢复记录](../../../backend/.test-data/latest-cordis-two-android-Kd7uv7/main-restored.json)核对主APK摘要与PID12296保持、两个测试UID均停止、只保留原16901映射；经正常Launcher/侧边栏Remote入口重新显示原「DSHM 新版手机真实模型验收」与空输入框，实际MuMu截图已核验。原Host14292/监督48088保持，没有重装或清除主App。[原完整恢复构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-two-android-restored-build.log)382.446秒退出0，没有超时；36原源码/启动字节、Git干净与355原资源摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 精确核对后，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-cordis-two-android-final.json)。没有活动源码归属记录，本轮测试未提交、推送或发布新版支持声明。

执行双原生分支需先以 `latestCompatibilityTest=true/latestCordisPeerTest=true` 离线构建并安装新增专用包，保留既有 Office 专用包。后端在既有 Android＋迟到代码命令中额外设置 `DSHM_LATEST_CORDIS_TWO_ANDROID=1`。实际源码入口再设置 `DSHM_LATEST_SOURCE_CHECK=1`。明确区分源码准备/验证/原恢复三个阶段，已归档旧 scope 不复用。

## 插件自身异常与恢复（2026-10-07）

本专项继续使用同一 MuMu 的两个独立 Android UID、原鉴权/中转/资源桥和原动态插件运行器。专用夹具在原 `apply` 或已登记的 Host 处理函数中实际抛出三个固定错误；不替换生产 RPC、审批结果或模型输出。主 App、Key、绑定与持续模型 Host 保持。

[首轮失败](../../../backend/.test-data/latest-cordis-failures-tFNtWD/report.json)88.401秒保留：电脑端加载失败后，两个客户端实际收到新失败清单；另一端的原面板却优先显示此前迟到版本3审批的错误，盖住版本4的真实原因。[实际截图](../../../backend/.test-data/latest-cordis-failures-tFNtWD/final-1.png)明确显示版本4行配上版本3错误。不是新错误未被中转，也不是测试超时证明产品正常。

[窄范围变换](./cordis-panel-error.mjs)将页面本地错误限定为当前选中的 package，其他版本的旧错误不再遮住当前原 Host 诊断。[发布载荷](./cordis-client-lifetime.mjs)按原固定 bundle 摘要及唯一组件绑定定位，只替换该表达式、保留原 JSX/包壳；[源码载荷](./source-changes.mjs)核对固定原 TSX 摘要 `e0b4abe5939d4efa18ce9f768e977342c4501776692051f5af4978a61f8ed0d3` 后加入同一变换。旧版变换和鉴权/协议未改。当前源码候选为13组/37文件，新增文件属于原客户端寿命组，不新增第14组；之前36文件归档保持各自历史证据。

[npm 发布通过报告](../../../backend/.test-data/latest-cordis-failures-8lP9Bt/report.json)93.690秒通过，整体95.22秒，`androidVerified:true/inferenceVerified:false`。独立同名 UI 候选摘要为 `35923af4171a7c8caed3fbb018775efccb308b1fafa795b66de0277f4be9b0ae`，主发布安装文件保持原摘要。

| 实际异常 | 原 Host 与手机结果 | 恢复 |
| --- | --- | --- |
| Host `apply` 抛错 | 原 `host-apply` 失败，两端实际显示版本4原因；没有 activeRun，旧版本2定义与 currentPackageId 保留。 | 两端显式运行版本2并调用原 Host，当前行不再显示其他版本旧错误。 |
| Client `apply` 抛错 | 原 `client-apply` 失败，两端实际显示版本5原因；原 Host 回收新运行，两端旧局部界面卸载。 | 两端显式运行版本2，局部按钮再次返回原 Host 的 `LATEST_RACE_HOST_V2`。 |
| 运行中的 Host handler 抛错 | 原 `invoke` 返回 `handler-error` 和实际版本6原因，手机局部按钮显示原错误；Host activation 保持 running，不能误称整个插件启动失败。 | 两端显式切回版本2，原调用再次正常。 |

三种异常后继续停止/重跑/移除与两设备撤销、授权失效核对，测试 UID、拥有的 Host/连接/数据库均清理。第一端没有页面/控制台错误；第二端仅有被明确触发的版本5 Client 加载原诊断一条，撤销后只允许原401。真实页面错误均为空。测试不代表真实模型推理、两台实体手机或渲染阶段异常通过。

[实际源码通过报告](../../../backend/.test-data/latest-cordis-failures-lwtGdS/report.json)102.349秒通过，整体103.91秒，启动命令为原 `pnpm dsh web`。原37文件/13组与实际355资源已核验；[完整候选构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-failures-patched-build.log)387.307秒退出0，资源摘要为 `321c78a577b98eed3b8955edfe447bfcf5f9dcbd1c51ed881b57bf4080c0eb91`。同样核验两端真实错误/卸载、旧定义保留、显式恢复与原 Host 回答；独立身份、审批、各自原生重连、停止/重跑/移除及两设备撤销均通过。错误范围与发布入口相同。源码生命周期/清单/转发七项、发布清单入口两项及旧版十三项回归通过；一次源码回归预加载缺少 `DSHM_SOURCE_ROOT` 未执行测试，补齐原要求后才计通过。

源码归属为 `--scope=cordis-failures`，[原完整恢复构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-failures-restored-build.log)381.910秒退出0、无超时。37原文件/启动字节、Git干净与355原资源摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 精确核对后，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-cordis-failures-final.json)。[新载荷只读审计](../../artifacts/latest-runtime-check/patch-inventory-Jmtjsy/report.json)确认18旧目标与13组/37文件映射、实际原字节/版本/变换及无活动源码租约，`fullAcceptancePassed:false`，不能将覆盖审计当作完整功能通过。[主环境恢复记录](../../../backend/.test-data/latest-cordis-failures-lwtGdS/main-restored.json)确认原APK/PID12296、Host14292/监督48088保持，两个测试UID停止，仅保留原16901映射；新鲜MuMu截图显示原Remote会话及空输入框，没有重装、清除或发送消息。实际源码回归首次命令遗漏预加载环境变量、最后只读进程检查遇到已正常退出的构建PID，均不算产品失败或新增通过项。

后端在双 Android 命令中额外设置 `DSHM_LATEST_CORDIS_FAILURES=1`；源码另设置 `DSHM_LATEST_SOURCE_CHECK=1`。源码须使用新scope准备，所有本轮Host退出后以同scope恢复并归档，已归档的旧scope不复用。两次运行都保留既有并发审批、原生重连和同步移除基线；本专项未同时启用旧代码接收队列，旧代码迟到证据以上节独立报告为准。

## 渲染阶段异常与跨端恢复（2026-10-07）

专用插件在正常加载后，由手机点击局部按钮触发 React 组件真正抛错。测试仍使用同一 MuMu 的两个独立 Android UID、原配对/鉴权/中转及原 Slot renderer，不通过伪造 RPC 或错误通知替代插件执行；没有真实模型推理，也不代表两台实体手机。

[原首轮失败](../../../backend/.test-data/latest-cordis-render-z0QFzl/report.json)89.507秒保留：出错端显示原 `client-render` 原因，Host 也已记录，但另一端仍显示 Client 待激活，[实际截图](../../../backend/.test-data/latest-cordis-render-z0QFzl/final-1.png)没有错误行。原因是原 `reportRenderFailure` 提交诊断后未发送清单变化通知。不能把原 Host 有记录等同于手机同步完成。

[发布变换](./cordis-scopes.mjs)和[源码变换](./source-cordis-scopes.mjs)只在原有效运行分支提交诊断后发出既有 `cordis/inventory-changed`；原运行身份检查、审批、Host activation、原错误内容和模型诊断路径保持。旧运行的迟到报告继续被忽略，不发通知。[三项真实方法回归](../../tests/latest-cordis-render-sync.test.mjs)执行固定 npm bundle、npm types 和原源码的方法体，确认原缺少通知、候选通知时已提交失败状态且 Host 运行保持、旧运行报告不改变当前状态。

[npm 实际通过报告](../../../backend/.test-data/latest-cordis-render-PE6i1W/report.json)79.450秒通过，整体80.99秒，`androidVerified:true/inferenceVerified:false`。测试通过原加载器挂载同名独立 Host 候选，SHA-256 为 `74cd58c59ae5380bba9b8bfb353a8de39a2e2a0efc3baf1c9812ba2641956ed5`；主模型 Host 的已安装文件保持原摘要 `0b3da943f6eb4dd74b6ddb273b27ac34c4848e6665431b546ea225f32eb2aba7`，没有覆盖主运行器或重新安装主 App。

实际故障上报一次，原清单为 `latestRun.status=failed / phase=client-render`，Host half 和 activeRun 保持。出错端原局部条目标记 `abdicated=true`，另一端收到原错误；聊天页没有 page error。出错端只出现 React 与原 Slot boundary 的两条指定版本错误，另一端没有控制台错误。两端显式运行保留的版本2，原局部错误清除、按钮再次调用 Host 并返回 `LATEST_RACE_HOST_V2`；随后停止/新运行/同步移除、两设备撤销和拒绝重连、测试 UID/Host/传输/数据库清理均通过。

一次发布候选准备被严格锚点检查拒绝：原 npm bundle 使用 `void 0`，原 npm types 使用 `undefined`。变换改为核对这两个已给定哈希的唯一原表达式后，才执行上面的实际通过轮；未启动的准备失败不计产品成功或新的 Runtime 故障。后端类型检查通过；最初引用不存在的 `tsconfig.json` 未执行检查，改用项目原 `tsconfig.check.json` 后退出0。

[实际源码报告](../../../backend/.test-data/latest-cordis-render-33HFbS/report.json)92.753秒通过，整体94.40秒，原命令为 `pnpm dsh web`，`androidVerified:true/inferenceVerified:false`。独立 `--scope=cordis-render` 的[13组/37文件完整候选构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-render-patched-build.log)379.232秒退出0，无超时；实际355资源摘要为 `9a5a097186c13fdcdcb84b34c9eda26bad16a0fe6dadd952c3f57584024e4ac1`。两端原错误同步、局部故障、显式恢复、Host 调用、停止/重跑/同步移除与撤销清理均通过。实际补丁源码的连接保护、目录/查询及并发审批等17项回归通过。

[主环境恢复核对](../../../backend/.test-data/latest-cordis-render-33HFbS/main-restored.json)确认原APK摘要与PID12296、Host14292/监督48088保持、两个测试UID停止、只保留原16901映射。Computer Use 的新鲜截图显示原Remote会话与空输入框，没有重装、清除或发送主会话消息。

[原完整恢复构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-render-restored-build.log)381.465秒退出0，无超时；37原源码/启动字节、Git干净与355原资源摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 精确核对，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-cordis-render-final.json)。[当前只读审计](../../artifacts/latest-runtime-check/patch-inventory-sA0E9O/report.json)重新确认18旧目标、13组/37文件与无活动源码归属记录，`fullAcceptancePassed:false`；不把单项通过或审计覆盖当作完整新版交付。

执行时在双 Android 命令额外设置 `DSHM_LATEST_CORDIS_RENDER=1`，源码另设置 `DSHM_LATEST_SOURCE_CHECK=1`。主运行文件保持，已归档的旧scope不复用；所有本轮 Host 退出后，以同scope完成原构建/字节/资源恢复再归档 `cordis-render-final`。本轮没有同时启用旧代码接收队列或前三类异常，相关证据分别以上节各自真实报告为准；Factory/其他Slot及更广插件异常不由本轮外推。

## Factory 单个实例异常与恢复（2026-10-07）

本专项在原 `registerFactory/renderFactorySlot` 路径创建两个局部实例，由实际 Android 点击让其中一个 React 组件抛错；另一个实例仍通过原 Host `invoke` 返回 `LATEST_RACE_FACTORY_SURVIVOR`。使用同一 MuMu 的两个独立 UID、凭据和 WebView，原配对、审批、中转与资源桥保持。此为实际插件执行，不是注入错误通知或模拟 RPC；不代表真实模型推理或两台实体手机。

[npm 发布入口报告](../../../backend/.test-data/latest-cordis-factory-PXfF7Z/report.json)80.264秒通过，整体81.85秒。故障组件卸载，原 Factory 边界生成 `data-factory-error`，同一定义的另一个实例仍能调用 Host；Host `activeRun` 与 Host half 保持，原清单记录 `failed/client-render`、`slot=factory:latest.race.factory`。原报告只发送一次，手机的 `abdicated` 属性为空，对应 Factory 实例错误不使整个定义退让的原语义。另一客户端收到同一原错误，两端显式运行版本2后错误清除、原 Host 调用恢复。

两端继续通过三种迟到审批、拒绝新版本后旧版本保留、各自原生断线重连、停止/新运行/同步移除及两设备撤销后拒绝访问。两端 page error 为0；仅出错端允许 React 与原 Factory boundary 的两条指定版本错误，撤销后仅允许新增预期401。主发布 UI/Host 安装文件保持，独立测试 Host、UID、连接与数据库已清理。候选复用上节已验证的渲染诊断通知补丁，没有再改鉴权、运行语义或生产 RPC。

[实际源码报告](../../../backend/.test-data/latest-cordis-factory-FRyr6l/report.json)89.502秒通过，整体91.12秒，原命令为 `pnpm dsh web`。独立 `--scope=cordis-factory` 的[完整候选构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-factory-patched-build.log)384.044秒退出0，无超时；同一13组/37文件的355资源摘要为 `9a5a097186c13fdcdcb84b34c9eda26bad16a0fe6dadd952c3f57584024e4ac1`。原 Factory 故障上报一次、兄弟实例真实调用 Host、两端错误与恢复、各自重连和撤销清理均通过，错误数量与 npm 入口相同。后端 `tsconfig.check.json` 类型检查及夹具/归属管理脚本语法检查通过。本轮没有新增生产补丁或更新 APK。

[主 App 核对](../../../backend/.test-data/latest-cordis-factory-FRyr6l/main-restored.json)确认原 APK 摘要、PID12296、Host14292/监督48088保持，两个测试 UID 已停止，只有原16901端口映射。Computer Use 新鲜截图显示原 Remote 会话与空输入框；没有重装、清除或发送主聊天消息。两个实际测试启动 PID13160/38504已另外核对不存在。

[原完整恢复构建](../../artifacts/latest-runtime-check/latest-live-source-cordis-factory-restored-build.log)385.493秒退出0，无超时；37原源码/启动字节、Git干净与355原资源摘要 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107` 精确核对，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-cordis-factory-final.json)。[当前只读审计](../../artifacts/latest-runtime-check/patch-inventory-pNxu0y/report.json)重新核对18旧目标、13组/37文件、原源码/启动状态与无活动归属记录，`fullAcceptancePassed:false`；它只证明载荷映射及恢复，不代替功能标准。

后端在双 Android 命令中额外设置 `DSHM_LATEST_CORDIS_FACTORY=1`，不要同时设置 `DSHM_LATEST_CORDIS_RENDER=1`；两类渲染异常分别留存证据。源码运行需另设置 `DSHM_LATEST_SOURCE_CHECK=1`，使用新的 `--scope=cordis-factory` 完成准备、实际测试、原构建恢复，再归档 `cordis-factory-final`。

## 双客户端条目核对（2026-10-07）

KKC-24 的原条目为“动态插件更广双客户端并发、重连及局部 UI 版本交错”。本次按原条目核对下列实际证据，不以单个 Factory 测试代替整条要求，也不把其他 SDK、模型或文件验收并入此项。

| 原要求及相关边界 | npm 发布入口 | 实际源码入口 |
| --- | --- | --- |
| 两个独立 Android 身份、三种并发迟到审批、共享运行/版本保留、局部按钮实际调用 Host | [47vjEd](../../../backend/.test-data/latest-cordis-two-android-47vjEd/report.json) | [Kd7uv7](../../../backend/.test-data/latest-cordis-two-android-Kd7uv7/report.json) |
| 两端各自实际断线/新票据重连，同一运行保持，913字节原代码跨连接迟到且不重放结算 | [47vjEd](../../../backend/.test-data/latest-cordis-two-android-47vjEd/report.json) | [Kd7uv7](../../../backend/.test-data/latest-cordis-two-android-Kd7uv7/report.json) |
| Host/Client 加载失败、运行中 handler 错误、旧定义与两端显式恢复 | [8lP9Bt](../../../backend/.test-data/latest-cordis-failures-8lP9Bt/report.json) | [lwtGdS](../../../backend/.test-data/latest-cordis-failures-lwtGdS/report.json) |
| 原 Slot 组件真实渲染失败、两端原因同步和局部恢复 | [PE6i1W](../../../backend/.test-data/latest-cordis-render-PE6i1W/report.json) | [33HFbS](../../../backend/.test-data/latest-cordis-render-33HFbS/report.json) |
| 原 Factory 单实例真实渲染失败、兄弟实例保持、两端恢复 | [PXfF7Z](../../../backend/.test-data/latest-cordis-factory-PXfF7Z/report.json) | [FRyr6l](../../../backend/.test-data/latest-cordis-factory-FRyr6l/report.json) |
| 停止/新运行/同步移除、两设备实际撤销与拒绝重连、拥有进程和传输清理 | 上述四类通过轮各自核验 | 上述四类通过轮各自核验 |

这些报告已逐份复核 `passed/androidVerified`、独立身份、原生重连、移除/撤销及清理字段；不同故障和旧代码队列各自留存独立证据，不宣称同时启用所有故障。两个客户端仍在同一 MuMu 系统内，不外推两台实体设备、任意第三方插件或实际模型生成插件代码。Factory 源码原构建恢复与归档已完成，上述证据满足本条原标准；其余七条总标准和完整新版交付仍未完成。

## 执行与剩余边界

在后端目录的 PowerShell 执行：

```powershell
$env:DSHM_LATEST_CORDIS_TWO_PAGES='1'
node node_modules/vitest/vitest.mjs run tests/latest-cordis-two-pages.test.ts
Remove-Item Env:DSHM_LATEST_CORDIS_TWO_PAGES
```

专项使用当前既有归档及手机实际构建，不覆盖持续联调候选、日常版本、主模型 App 或 Key。每轮使用新 home/证据目录，失败报告原位保留。当前证明原 npm 发布与实际源码 Host 的双浏览器、Android＋浏览器和同一 MuMu 的双独立 Android 客户端路径，旧代码跨连接迟到、三种加载/运行异常及局部 Slot/Factory 渲染异常的跨端显示/显式恢复已补验；当前37原源码/启动值及355资源完整恢复归档。原双客户端标准的证据见上表，其余七条总标准、SDK/Electron载体与最终组合交付仍未完成，不发布完整新版兼容声明。2026-10-07重新读取[官方发布页](https://github.com/deepseek-ai/deepseek-harness/releases)确认最新发布仍为固定 `0.2.1-alpha.1`、原 commit `5badb15`，不按主分支未发布代码扩大兼容声明。
