# 新版插件修复期间取消与超时

- 状态：两种入口的修复取消/超时/退出及下载、脚本、修复、applying阶段手机冷恢复通过。本轮36原源码/启动字节、原完整构建与355资源精确恢复归档，三个目录原属性恢复；SDK第四/第六轮明确磁盘不足、第五轮依赖状态失败均保留。SDK打包需增加Q盘空间，实际载体与完整新版交付仍待验，见[SDK当前状态](./source-runner-profile-resolution.md#sdk-打包与源码恢复)。
- 维护角色：DSH Mobile 项目协作 Agent；核验日期：2026-10-06。
- 基线：`0.2.1-alpha.1` / `5badb15009ae1756c3afe0ae0cef1faafc290ccc`，官方 Pre-release。
- 来源：[原修复分支](../../artifacts/latest-source-check/packages/boot/plugin-manager/src/operations.ts)、[源码补丁](./source-package-repair.mjs)、[发布补丁](./package-management.mjs)、[实际进程探针](../../scripts/verify-latest-package-repair-inflight.mjs)、[Android驱动](../../../dsh-mobile/scripts/verify-latest-live-repair-cancel-android.mjs)。

## 真实终端与原命令接管（2026-10-06）

状态：固定 npm 发布入口与实际源码 `pnpm dsh plugin` 的真实 Windows PTY 已通过输入、双流中文/emoji、退出码及 Ctrl+C 子树结束；下一次原插件命令接管死记录也通过。该项不代替 SDK/Electron 运行、其他操作系统或完整 Remote 验收。本轮原完整恢复构建 354.979 秒退出 0、无超时；36原文件、根启动字节、Git干净及355份前端资源精确核验并[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-tty-final.json)，正常发布Host与手机保持。

入口为[终端验证脚本](../../scripts/verify-latest-package-cli-tty.mjs)。它用原 `initProfile` 建立专用 profile，只在自有目录创建脚本；发布入口调用原 `dsh plugin --profile web run`，源码入口调用原 `pnpm dsh plugin --profile web run`。测试没有替换进程创建、信号转发或原终端描述符。输入通过实际 PTY 送入随机标记；目标记录三个 `isTTY` 均为 true、原 Node 路径和 profile 工作目录。脚本指定退出码 7，经原 pnpm/DSH 原样返回。

Ctrl+C 由终端实际发送。目标及持续写入子进程均停止、标记连续 300ms 不再变化，原 CLI 也已结束。中断可能先结束整个 CLI，因此 `run.json` 未立即删除；[原 `activeRecordedRun`](../../artifacts/latest-source-check/packages/boot/plugin-manager/src/operations.ts)约定下一次操作等待记录的进程结束再接管。验证先保留死记录、确认所有记录 PID 已退出，再运行原命令；没有手动删记录或锁，原管理器自行接管并移除记录。专用 profile 清单字节保持。

| 入口 | 三项终端行为和原命令接管 |
| --- | --- |
| npm 发布候选、五文件原生范围 | [第四轮通过](../../artifacts/latest-runtime-check/package-range-tty/original-cli-tty-recovery-report-attempt-4.json) |
| 固定源码、36文件完整候选构建 | [通过](../../artifacts/latest-runtime-check/package-range-tty/source/original-cli-tty-recovery-report.json) |

第一轮夹具对 Node 绝对路径的双引号写法在 Windows 脚本解析前失败；独立原 pnpm 执行同一脚本也失败，因此不能归为 DSH 终端缺陷。[原失败报告](../../artifacts/latest-runtime-check/package-range-tty/original-cli-tty-report.json)保留，修正为 PATH 中的 Node 后核对目标实际路径。[第二轮输入/退出码通过](../../artifacts/latest-runtime-check/package-range-tty/original-cli-tty-report-attempt-2.json)。第三轮输入等待超过自身 60s 时限而退出 92，[失败记录](../../artifacts/latest-runtime-check/package-range-tty/original-cli-input-attempt-3.json)保留，第四轮使用新目录/标记重验。

原验证器最初错误要求中断后立即删除记录，发布[严格断言失败](../../artifacts/latest-runtime-check/package-range-tty/original-cli-tty-report-attempt-4.json)和源码[严格断言失败](../../artifacts/latest-runtime-check/package-range-tty/source/original-cli-tty-report.json)保持为失败。后续独立 `recover` / `verify-recovery` 验证原接管路径，报告明确 `interruptRecordImmediateRemoval:false`，不覆盖或反称原失败为通过。报告排他创建，不能重复同一轮次。

命令顺序是 `prepare`、`input`、`exit`、`interrupt`、`verify`；中断后只有真实死记录存在且三个终端场景均核验时，才执行 `recover`、`verify-recovery`。各阶段使用同一 `--attempt-N`，源码使用同一 `--source`。`input` 就绪后在真实终端输入本轮随机标记，`interrupt` 就绪后发送真实 Ctrl+C，不能以直接调用信号处理函数代替。完整候选构建 348.675 秒退出 0，无超时。

## 原故障及行为取舍

当前新增证据：[两种入口真实 applying 阶段手机与核心Host同时结束后的冷恢复](../../../dsh-mobile/docs/integration/latest-install-recovery.md#发布入口-applying-阶段的手机冷恢复)。原pnpm已完成后中断，恢复保留未知结果提醒和目标文件；原管理页卸载、三配置字节、12会话/2106原事件及管理权限恢复通过。发布第二轮及SOURCE第三轮通过，原失败/独立清理均保留，未改生产或APK。当前正常Host14292/App12296，SDK第三轮SEA注入失败，本轮36原源码/启动字节、原完整构建及355资源已精确恢复归档，原完整标准待验。

[真实归档夹具](../../tests/support/latest-repair-fixture.mjs)的旧版脚本启动一个只向自身安装目录写标记的子进程；升级版包含要求`>=999.0.0`的不兼容组件。真实pnpm安装后，原管理器拒绝该组件、恢复配置，再真实重装旧版。服务器只暂停旧脚本的HTTP响应；第二次请求、TCP所属PID、原run.json及持续写入计数证明进入修复分支，没有替换安装器或伪造结果。

原修复在取消后仍恢复旧版。发布与源码入口都证明：取消请求后1.5秒仍未结算，实际脚本与子进程继续运行；释放HTTP响应后旧版、配置与进程退出均核验。补丁保留这个行为，避免因立即取消而留下尚未修复的node_modules。

原修复超时存在故障：[发布失败](../../artifacts/latest-runtime-check/package-repair-inflight/published-timeout.json)及[源码失败](../../artifacts/latest-runtime-check/package-repair-inflight/source-installed-timeout.json)均在3秒配置超时后超过20秒未结算。源码启动PID65704已退出，脚本73772和写入子进程45244仍存活，写入计数1→201。测试工具随后只清理自己记录的PID；不能将事后清理算作通过。

## 窄范围修复

修复捕获输出，使用原execa的`killDescendants`，同时记录与其一致的进程组；主安装的CLI策略保持。修复`timedOut`传入原`PackageResult.timedOut`，管理器沿已有分类显示失败。超时保持官方“node_modules未能重装，需要重新安装”诊断，不冒充恢复成功。取消仍等待旧版修复。

发布Host bundle与独立operations入口共同修改；仅允许代码中两个固定哈希的上一候选迁移，未知编辑仍拒绝。源码补丁仍为13项/31文件，没有扩大到日常安装。

| 实际验证 | npm发布入口 | 固定源码构建产物 |
| --- | --- | --- |
| 修复超时、全部记录的进程与写入先于清理结束、配置保持、原超时分类 | [通过](../../artifacts/latest-runtime-check/package-repair-inflight/published-timeout-attempt-2.json) | [通过](../../artifacts/latest-runtime-check/package-repair-inflight/source-installed-timeout-attempt-2.json) |
| 修复中取消继续等待，响应后旧版/配置恢复、进程退出 | [通过](../../artifacts/latest-runtime-check/package-repair-inflight/published-cancel-attempt-2.json) | [通过](../../artifacts/latest-runtime-check/package-repair-inflight/source-installed-cancel-attempt-2.json) |
| 原Android管理页批准旧脚本、修复中取消、取消回执、卸载与历史/权限恢复 | [完整通过](../../artifacts/latest-runtime-check/latest-live-release-repair-cancel-attempt-4.json) | [完整通过](../../artifacts/latest-runtime-check/latest-live-source-repair-cancel.json) |
| 实际修复中结束完整DSH树，原操作未知/无重试、旧版/配置/历史保持及卸载/权限恢复 | [完整通过](../../artifacts/latest-runtime-check/latest-live-release-repair-restart.json) | [第三轮完整通过](../../artifacts/latest-runtime-check/latest-live-source-repair-restart-attempt-3.json) |
| 手机原管理页修复超时分类/兼容说明/详情、失败回执、进程停止与配置/历史/权限恢复 | [第二轮完整通过](../../artifacts/latest-runtime-check/latest-live-release-repair-timeout-attempt-2.json) | [完整通过](../../artifacts/latest-runtime-check/latest-live-source-repair-timeout.json) |

独立operations探针不代替手机超时页面，手机修复超时的后续实际证据见下方专项。手机取消核对原run、脚本和写入子进程，写入停止后才能报告取消；包清单、锁文件、workspace原字节恢复，旧v0.0.1仍在，原操作编号回执为取消。同一WebView、原测试聊天分页历史/完整投影与空输入保持，临时管理收回；随后从原详情页卸载本测试包并核对全部原配置。脚本副作用仅为本测试包的标记，不证明任意插件副作用回滚。

## 构建、失败保留与剩余范围

原operations/run-tree两套81项通过；源码与发布产物各五项真实pnpm进程、三项发布边界及六项源码安装边界通过。旧31文件租约的原字节、根启动载荷、Git干净及355资源精确恢复，原完整构建343.23秒，见[归档](../../artifacts/latest-runtime-check/latest-live-source-lease-before-package-repair.json)。本轮13项/31文件组合完整构建348.74秒，随后停止拥有的SOURCE Host并切回同一home的RELEASE入口，再完整恢复源码与启动载荷；恢复构建332.28秒，31原文件、根package、引导文件移除、Git干净及355原资源摘要均核验，见[31文件已恢复归档](../../artifacts/latest-runtime-check/latest-live-source-lease-before-package-range.json)。后续36文件原生范围候选使用独立租约，不能以31文件恢复代替新组合或新版完整交付。

发布手机首轮验证器误把重连完成等同于聊天输入框可见；第二轮卸载入口定位错误，两次失败保留。第三轮修复取消通过，后续原卸载有`EPERM rename package.json`，见[失败报告](../../artifacts/latest-runtime-check/latest-live-release-repair-cancel-attempt-3.json)及[原pnpm日志](../../artifacts/latest-runtime-check/live-homes/c90847c6-a651-4bd7-8a96-eb680f8b8921/profiles/web/.plugin-manager/logs/operation-XqNqFW/pnpm.log)。[独立原卸载清理](../../artifacts/latest-runtime-check/latest-live-release-repair-cancel-cleanup-attempt-3.json)通过，第四轮完整通过；EPERM根因未确定，不宣布已修复。验证器随后改为等原UI结算再读文件，避免主动读句柄干扰Windows原子替换，但不据此断言原故障根因。

在插件项目执行`node scripts/verify-latest-package-repair-inflight.mjs --source-installed --timeout --attempt-2`；省略`--source-installed`验证发布operations，省略`--timeout`验证取消。报告排他创建，已有结果不能覆盖。手机命令为`node scripts/verify-latest-live-repair-cancel-android.mjs`，需要明确`DSHM_ANDROID_SERIAL=emulator-5554`及现有配对；`--attempt-4`保留独立轮次。清理入口只接受精确已记录测试来源，不是产品自动恢复。

## 修复中整棵DSH树退出

手机原管理页先明确批准旧版脚本，再升级带不兼容组件的归档；第二次真实HTTP请求、TCP所属脚本PID、原run.json及写入计数核验后，外部控制器用taskkill结束拥有的完整DSH树。SOURCE为Host63972、修复启动/脚本/写入76132/64760/61708，恢复Host9552；RELEASE为Host46476、45472/56836/28692，恢复Host47420。所有修复进程先于恢复退出，标记字节连续300ms不再变化，不以事后清理证明自然退出。

同一home、网关地址、App/配对和WebView恢复，原操作编号分别为b8571737-28f6-4851-ae95-3c19f2d9c9fe及a01414cd-b23d-496b-acfe-c655f03fb01b。两端原操作记录显示无法确认结果，无重试按钮；折叠后仍有提醒，整个过程仅两次脚本请求（旧版安装及旧版修复），没有自动重装。SOURCE保留的原安装弹窗沿waitForInstall(null)显示unknown；RELEASE组件重装配，不借用SOURCE弹窗证据。v0.0.1及安装旧版后的三个配置字节保持，原60条分页历史与完整投影保持。

随后由手机原详情页卸载专用包，原管理器接管已退出进程的运行记录；没有手动删锁或run.json。三个测试前配置字节、空输入和主聊天恢复，临时管理收回，页面错误为空。[SOURCE未知页](../../artifacts/latest-runtime-check/latest-live-source-repair-restart-attempt-3-unknown.png)和[RELEASE未知页](../../artifacts/latest-runtime-check/latest-live-release-repair-restart-unknown.png)保存实际画面。此场景证明整棵DSH进程树突然退出，不等同电脑OS重启、仅Host退出遗留子进程或任意脚本副作用回滚。

SOURCE[首轮失败](../../artifacts/latest-runtime-check/latest-live-source-repair-restart.json)是外部结束动作未发生，原控制等待超时；测试释放响应后修复自然完成，专用包保留。[独立原详情页清理](../../artifacts/latest-runtime-check/latest-live-source-repair-restart-cleanup.json)核对原配置恢复。第二轮尚未安装，原重连页在isVisible与isEnabled之间消失导致验证器超时；0次脚本请求、配置和管理恢复，[失败报告](../../artifacts/latest-runtime-check/latest-live-source-repair-restart-attempt-2.json)保持。验证器仅对瞬时TimeoutError作短等待并重查实际连接，第三轮完整通过；没有修改生产连接/认证代码。

## 仅结束Host的Windows残留保护待验

实际源码核心Host单独退出后，原run.json记录的安装启动器8724死亡，实际脚本17364和写入子进程12800仍存活；控制器尚未停止，使用的是不带`/T`的核心PID结束动作。两个手机验证器失败及直接进程证据保留，两次独立原手机管理器卸载/配置历史恢复/管理收回通过，正常SOURCE与实际前台聊天恢复；不把清理成功记作保护通过。详细事实、失败原因及证据见[手机安装恢复边界](../../../dsh-mobile/docs/integration/latest-install-recovery.md#仅结束host的windows残留进程观察)。

### 原写入前保护的实际缺口及原生进程范围原型

[独立探针](../../scripts/verify-latest-package-host-only.mjs)在新的空profile中使用固定实际operations、原runPluginCommand写锁和真实pnpm.cmd，明确批准专用归档并触发原不兼容修复。只结束探针自己创建的安装调用者，确认原记录PID死亡、实际脚本/写入子进程仍存活且计数连续增加，再通过同一原写锁及写入前保护执行`pnpm --version`。该命令不并发修改包文件，但证明保护实际放行了新的pnpm操作。

[SOURCE第二轮](../../artifacts/latest-runtime-check/package-host-only/source-installed-attempt-2.json)的调用者/记录26852/57316死亡、脚本39856/写入63052存活；[发布入口](../../artifacts/latest-runtime-check/package-host-only/published.json)为53768/57840死亡、22096/54236存活。两端新操作都返回退出0及11.7.0，实际旧写入仍继续，三个配置字节保持；两报告保持失败且defectConfirmed=true。原因是原Windows treeAlive只检查记录PID。未在手机原界面发起并发写入，不将此探针代作完整Android场景通过。

[原生范围原型](./package-runner-prototype.mjs)仅在本探针owned-profile可运行，尚未加入源码/发布补丁、交付包或当前31文件租约。它复用固定官方win32-process的挂起创建、加入KILL_ON_JOB_CLOSE后执行及进程/范围退出检查，目标pnpm.cmd继续由原execa解析；运行器只继承目标标准输入/输出，原调用者的独立IPC结束时关闭整个范围。原execa仍负责原输出、超时和取消分类，没有修改脚本审批或兼容拒绝。

| 原型场景 | 实际证据 | 核验范围 |
| --- | --- | --- |
| 单独结束安装调用者 | [第二轮通过](../../artifacts/latest-runtime-check/package-host-only/candidate-attempt-2.json) | 运行器/脚本/写入进程先于下一次操作退出，写入停止；原死记录自动接管与三个配置保持 |
| 修复中取消 | [第二轮通过](../../artifacts/latest-runtime-check/package-host-only/candidate-cancel-attempt-2.json) | 取消后1.5秒仍等待修复，释放响应后旧版恢复；原操作结算当时三个PID已死亡，timedOut=false/原不兼容结果保持 |
| 修复超时 | [第二轮通过](../../artifacts/latest-runtime-check/package-host-only/candidate-timeout-attempt-2.json) | 原三秒超时、timedOut=true/原修复失败说明保持；结算当时三个PID已死亡，配置保持 |

所有成功原型报告另由原安装器卸载测试包，核对进程退出、包及run.json移除；没有以事后结束进程证明原型通过。首轮探针finally给pnpm remove传了不支持的offline/ignore-scripts，导致报告未落盘；[原失败与独立清理记录](../../artifacts/latest-runtime-check/package-host-only/source-installed-first-driver-failed.json)保留，其运行保护结果不计通过，后续改为正常remove并保证失败报告写入。

运行：在插件目录执行`node scripts/verify-latest-package-host-only.mjs --source-installed`或不加旗标验证发布原保护；已占用报告需加`--attempt-2`。原型使用`--candidate`，取消/超时分别加`--cancel`/`--timeout`，三项严格结算复核另加`--attempt-2`。原型只验证当前Windows/pnpm.cmd/独立归档路径；正式依赖/打包、正常及CLI入口、缺失原生能力拒绝、新旧回归、实际手机Host退出及最终源码恢复仍待完成。不得据此声明已修复当前安装或完整新版兼容。

### 正式源码原生范围候选与构建诊断

[正式运行器](./package-runner-source.ts)与[源码变换](./source-package-range.mjs)将原生范围纳入13项/36文件候选：主安装及修复继续使用原execa，增加调用者IPC与官方Windows Job范围；同步声明原生依赖、TypeScript引用、锁文件及原单文件引导。当前源码候选没有owned-profile限制；独立原型的通过不证明这个新实现通过。实际发布包和手机运行组合尚未更新。

首轮完整构建在环境类型返回值处失败，保留[原失败租约](../../artifacts/latest-runtime-check/latest-package-range-build-first-failed-lease.json)、[日志](../../artifacts/latest-runtime-check/latest-package-range-build-first-failed.log)及[36文件载荷](../../artifacts/latest-runtime-check/latest-package-range-build-first-failed-manifest.json)。完整恢复240.11秒退出0，36原文件、根启动载荷、Git干净与355原资源摘要通过，见[归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-type-repair.json)。修正为只复制已定义的环境值后，第二轮TypeScript阶段通过，但默认堆完整打包315.14秒内存溢出；[第二轮租约](../../artifacts/latest-runtime-check/latest-package-range-build-second-failed-lease.json)、[日志](../../artifacts/latest-runtime-check/latest-package-range-build-second-failed.log)及[载荷](../../artifacts/latest-runtime-check/latest-package-range-build-second-failed-manifest.json)独立保留，不能记作构建通过。

[只读原生成器探针](../../scripts/diagnose-latest-source-build.mjs)同步投影CompilerHost及实际包registration：原字符串runner导出重现映射至不存在的src/run-tree.js；仅改为带types/default的导出，原27包/9060节点分析20.996秒通过，见[探针报告](../../artifacts/latest-source-patches/reflection-diagnosis-typed-package-runner.json)。生产生成器未改，未增加堆。第二轮失败组合的完整恢复230.714秒退出0，36原文件、根启动载荷、Git干净及355原资源摘要通过，见[恢复归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-export-repair.json)。采用类型导出后的第三轮默认堆完整构建343.323秒退出0，13项/36文件候选已ready；[固定ready租约](../../artifacts/latest-runtime-check/latest-package-range-source-ready-lease.json)及[载荷](../../artifacts/latest-runtime-check/latest-package-range-source-ready-manifest.json)排他保存，安装/恢复六项边界通过。新组合最终恢复仍未执行，当前手机仍使用原发布入口。

[实际源码运行器专项](../../scripts/verify-latest-package-range.mjs)的[第六轮](../../artifacts/latest-runtime-check/package-range-source/actual-report-attempt-6.json)九个场景通过：service/CLI各自正常输出、原缺失命令分类和已开始写入的遗留子进程清理，以及部署布局的Node引导、没有调用者IPC拒绝、原生模块加载故障拒绝。真实cwd、自有环境、含空格中文emoji参数、双通道与CLI原输出策略、profile字节/run.json、结算当时PID死亡及写入停止均核验。Node引导仅在自有closure通过原入口及固定包目录，不能代替实际SEA/Electron或TTY验收。

前五轮失败报告分别保留：初轮误要求Windows缺失命令固定为127，原发布execa实际返回1；第二轮夹具未等待写入启动；第三轮直接从未部署python目录启动而缺包；第四轮误用CLI直接依赖查找ACL包；第五轮Node --import没有使用Windows file URL。修正仅涉及验证器，原运行器未改；第六轮实际比较原发布缺失命令、先等真实写入、使用自有closure布局及file URL，不以弱化断言替代运行验证。

[原回归驱动](../../scripts/verify-latest-package-range-regressions.mjs)保留原operations业务断言，只让execa替身解开新增Node载体；原run-tree及单文件构建套件同时运行，[86项通过](../../artifacts/latest-runtime-check/package-range-source/original-regressions.json)，原测试文件字节保持。这些替身结果不作为原生Job运行证据。

正式已安装源码的[调用者单独退出](../../artifacts/latest-runtime-check/package-host-only/source-installed-native-installed.json)、[修复取消](../../artifacts/latest-runtime-check/package-host-only/source-installed-native-installed-cancel.json)与[修复超时](../../artifacts/latest-runtime-check/package-host-only/source-installed-native-installed-timeout.json)也通过实际原runPluginCommand/写锁/pnpm/归档路径：原安装器结算或下一次操作前，范围/脚本/写入进程已死亡；取消等待旧版修复、超时及兼容分类、配置字节、原死记录自动接管和原管理器卸载清理保持。当前SOURCE36租约保持ready、正常RELEASE Host44428及原手机聊天继续运行；npm发布补丁、实际手机仅Host退出、摘要冷恢复、打包载体、完整交付/旧版回归及36文件最终恢复仍待完成。旧手机验证器仍错误等待包装器死亡并要求残留存活，正式手机复验前需按新范围行为调整，不能沿用原失败断言。

本轮原只读before审计器错误要求所有历史会话cwd均为当前test-project，因保留的其他测试工作区历史而失败，未修改会话或产品。另一次只读连接核对已通过RELEASE在线/单一设备/management=false断言，但立即退出工具触发Node Windows UV_HANDLE_CLOSING异常，整体命令退出1；[断言记录](../../artifacts/latest-runtime-check/latest-package-range-export-live-audit.json)不能作为完整审计通过。正常拥有的Host仍运行，失败与产品运行分开记录。

## 发布运行器与真实手机核心Host退出

[发布安装器](./package-range-runtime.mjs)将通过完整源码构建的operations/runner及类型声明封存，窄范围转换Host bundle的主安装/修复调用并同步原生依赖与runner导出，共五文件。只允许artifacts内固定版本隔离运行目录，拒绝参考源码、相邻版本、未知字节与路径junction；全量预检、原子替换及失败恢复由[五项边界测试](../../tests/latest-package-range-runtime.test.mjs)核验。入口是[manage-latest-package-range](../../scripts/manage-latest-package-range.mjs)的prepare/plan/apply/restore，切换前核对拥有的Host和控制器已停止。恢复原两文件候选不是恢复官方原包；封存前后哈希见[载荷](../../artifacts/latest-package-range-payload/manifest.json)。常规启动只核验新组合，不降级覆盖。

发布[九个实际场景](../../artifacts/latest-runtime-check/package-range-published/actual-report.json)、[五项真实pnpm进程](../../artifacts/latest-runtime-check/package-process/published-native-installed-report.json)、[调用者退出](../../artifacts/latest-runtime-check/package-host-only/published-native-installed.json)、[修复取消](../../artifacts/latest-runtime-check/package-host-only/published-native-installed-cancel.json)与[修复超时](../../artifacts/latest-runtime-check/package-host-only/published-native-installed-timeout.json)均通过；源码九场景在共享基线改为封存原发布实现后[第七轮](../../artifacts/latest-runtime-check/package-range-source/actual-report-attempt-7.json)仍通过。正式源码组合驱动改用保留原业务断言的载体感知替身，新增[86项通过](../../artifacts/latest-runtime-check/package-range-source/original-regressions-combined-925a8806-83c8-4106-9c40-58408b7cf747.json)，不以替身证明原生范围执行。

[强只读重启审计](../../../backend/scripts/audit-latest-live-range-resume.mjs)按原SessionAddress及父目录读取子会话，保留已移除工作区的自有历史；发布安装后[前后审计](../../artifacts/latest-runtime-check/latest-live-package-range-published-3-after-report.json)证明12会话/2106原事件、完整消息前缀、投影和绑定保持。普通管道启动造成stdin EOF的50780短暂运行已真实停止并保存链路，随后TTY启动41704；不把测试载体的EOF记作产品崩溃。

真实手机经原管理组件明确批准专用脚本、安装旧版、触发不兼容后的实际修复。第三轮仅以`taskkill /PID 65680 /F`结束已核验的核心Host，不带/T、未先停止控制器或安装树；实际范围47044/脚本9000/写入44516在恢复之前全部退出，TCP关闭且300ms写入不变。恢复同home/App/绑定/端口后手机原编号为unknown、无重试，折叠提醒保留。原管理器安全接管死run记录，先卸载再明确安装旧版，新脚本/写入亦在完成前退出；随后原界面卸载，全部三配置原字节、60条分页历史/完整投影、同WebView、主聊天/空输入及管理false恢复，[第三轮完整通过](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed-attempt-3.json)。额外[前后全历史审计](../../artifacts/latest-runtime-check/latest-live-native-mobile-release-after-report.json)证明12会话/2106原事件准确保持、无新增恢复标记。

前两轮分别因验证器重复添加相同依赖后误等待done、重新安装后自动进入详情但清理仍找列表按钮而失败，均保留原失败报告与独立清理，不冒充整轮通过：[第一轮](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed.json)/[清理](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed-cleanup.json)、[第二轮](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed-attempt-2.json)/[清理](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed-cleanup-attempt-2.json)。发布plan没有逐文件state属性的两次前置断言失败发生在安装/授权前，只修验证器为核对实际patched计数。没有修改原产品识别、授权或安装语义。

固定源码`pnpm dsh web`的[第二轮手机复验](../../artifacts/latest-runtime-check/latest-live-source-repair-host-only-native-installed-attempt-2.json)完整通过同一范围：只结束实际核心60892，包装器8140及控制器尚未停止，安装范围40164/脚本56424/写入15432自行退出，恢复前TCP关闭/写入停止；原unknown、死记录接管、新安装、原卸载、三配置/同WebView/聊天投影/空草稿/管理false均恢复。[前后全历史审计](../../artifacts/latest-runtime-check/latest-live-native-mobile-source-2-after-report.json)再次核验12会话/2106原事件、投影及绑定保持，新增标记0。源码首轮收尾在详情异步导航时仍依据单次isVisible等待旧列表，失败与[独立清理](../../artifacts/latest-runtime-check/latest-live-source-repair-host-only-native-installed-cleanup.json)保留；驱动只改为循环重新观察列表/详情，没有改产品或放宽最终配置核对。

发布原生组合的[实际手机修复取消](../../artifacts/latest-runtime-check/latest-live-release-repair-cancel-native-installed.json)另已完整通过：手机取消后仍等待旧版修复，结算前脚本/写入进程退出、TCP关闭且写入停止；原取消回执、配置/聊天投影、同WebView及管理false恢复。未将旧两文件候选的手机结果替代新五文件运行组合。

源码36文件/根启动载荷按原租约恢复，原完整构建354.948秒退出0；355资源原摘要、Git干净及启动配置精确核验并[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-native-final.json)，正常RELEASE29884已恢复。首次restore命令从没有tsx依赖的插件根启动，在访问/修改源码前失败；改用固定源码自身tsx入口后完成恢复。真实SEA/Electron/TTY载体、安装摘要冷恢复、18项补丁最终决策、最终交付及原8条完整标准继续。现行支持声明与日常DSH/App/Key保持，不把本专项通过作为完整新版支持。

## 手机修复超时的分类与详情

手机操作摘要已改为同绑定严格持久保存，发布入口下载阶段App/Host都结束后的真实冷恢复通过；原编号unknown、无重试及12会话/2106原事件保持。具体代码、APK、失败及限制见[手机冷恢复](../../../dsh-mobile/docs/integration/latest-install-recovery.md#手机与电脑都结束后的安装摘要)，不借下载阶段通过扩展到脚本/修复/applying或源码入口。

隔离启动器新增`--resume --diagnose-install-timeout`（SOURCE加`--source`），只沿原Cordis patch把原plugin-manager的`idleTimeoutMs`从600000缩短到10000，其余配置走原默认值。只接受已有测试home，与其他诊断互斥，正常启动不加该旗标；未替换安装器/回执或模拟结果。来源为[原配置定义](../../artifacts/latest-source-check/packages/boot/plugin-manager/src/index.ts)、[原patch结构](../../artifacts/latest-source-check/packages/boot/app-boot/src/config-schema/document.ts)及[测试启动器](../../../backend/scripts/start-latest-live.mjs)。

同一手机通过明确批准旧脚本、旧版安装完成、不兼容组件升级和第二次旧版修复实际请求。十秒修复超时后，原安装弹窗的`failure.kind=timeout`、`code=incompatible-version`保持，原requestId与手机操作摘要的原requestId一致。手机按[官方failureText](../../artifacts/latest-source-check/packages/client/ui-plugin-manager/src/client/PluginManagerPage.tsx)优先显示兼容拒绝，不把“安装超时”作为该场景主文案；展开实际安装详情可见`node_modules could not be reinstalled; run 'dsh plugin install'`。不能因v0.0.1文件仍在就宣称node_modules完整重装成功。

RELEASE原启动/脚本/写入PID38976/21080/34680，原安装requestId b53cd9ac-50fd-4279-b1fe-62bf94ddfad4；SOURCE为5116/72208/47020、6570d1d2-2145-449d-9305-bfbeff54048f。失败显示时所有记录PID已退出，标记300ms不再写，run.json已清理；两个原脚本请求已关闭，没有自动重试，摘要为未完成。三个旧版安装后的配置字节保持；原详情页卸载专用包后，全部测试前配置、原60条分页历史/完整投影、同WebView、主聊天/空输入及management=false恢复，页面错误为空。

RELEASE[首轮失败](../../artifacts/latest-runtime-check/latest-live-release-repair-timeout.json)是验证器错误要求显示“安装超时”，[真实失败页](../../artifacts/latest-runtime-check/latest-live-release-repair-timeout-failure.png)已显示原兼容拒绝；没有据此改动生产分类/文案。[独立原卸载清理](../../artifacts/latest-runtime-check/latest-live-release-repair-timeout-cleanup.json)核对原字节后重跑完整通过。验证器亦区分中转operationId与原安装requestId，不混用两个真实编号。

实际详情页：[RELEASE](../../artifacts/latest-runtime-check/latest-live-release-repair-timeout-attempt-2-timeout.png)、[SOURCE](../../artifacts/latest-runtime-check/latest-live-source-repair-timeout-timeout.png)。完成配置/权限恢复并停止拥有的Host后，[专用移除器](../../../backend/scripts/remove-latest-install-timeout-overlay.mjs)逐项核对报告、原配置摘要、已退出PID和精确两行patch，再移除本测试overlay；[发布移除证据](../../artifacts/latest-runtime-check/latest-live-release-repair-timeout-attempt-2-overlay-removed.json)与[源码移除证据](../../artifacts/latest-runtime-check/latest-live-source-repair-timeout-overlay-removed.json)通过。恢复正常源码入口时`installTimeoutDiagnostic=false`。五项启动恢复边界测试通过，本轮没有重建APK或新增生产权限。

该场景仅证明不兼容拒绝后的修复超时及其原手机界面，不代替普通安装脚本超时主文案。[普通脚本专项](../../../dsh-mobile/docs/integration/latest-install-recovery.md#普通安装脚本的手机超时页)随后在两种入口实际通过：原kind=timeout/code=operation-error、手机“安装超时”、原请求编号、确认前进程退出及未完成回执一致；原配置/历史/权限保持，独立清理和诊断移除通过，源码首轮读取失败与清理保留。仅Host退出遗留子进程、手机进程结束后的安装摘要、其他系统/网络时序、原8项总标准及18项补丁最终去留仍未完成。日常DSH、Key和App保持原位，不发布完整新版支持声明。

## 手机安装摘要的两种入口冷恢复

发布入口首轮[修复阶段实际手机冷恢复](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed-cold-phone.json)完整通过：原操作209a27f4-b1ed-402f-9b36-047446a3850b、核心Host22000、范围11312/脚本72748/写入63776，App13059先结束后只单独结束核心Host；进程/TCP/写入均在恢复前停止。新Host4012、App19498与新WebView保留unknown/折叠提醒/无自动重试；原管理器接管死记录、明确新安装及卸载、原配置/历史/空草稿/管理false恢复。[单跳全历史审计](../../artifacts/latest-runtime-check/latest-live-release-repair-cold-after-report.json)通过12会话/2106原事件，新增标记0。源码同项首轮在审批前缺包失败，原失败保留。后续显式工程tsconfig正式修正后的[源码与新发布载荷复验](./source-runner-profile-resolution.md#正式修正与两个实际手机入口)均完整通过，两种入口全历史与权限恢复另核验。新36文件构建341.758秒、86原回归、九场景及退出/取消/超时通过，旧不可变载荷不覆盖；本轮原构建364.712秒、36原文件/启动配置/Git干净及355资源精确恢复并独立归档通过。SDK第二轮原GitHub配件下载失败仍未解除，不能记实际打包载体通过。

[手机侧专项](../../../dsh-mobile/docs/integration/latest-install-recovery.md#手机与电脑都结束后的安装摘要)现已通过发布与真实源码入口的下载/脚本阶段冷恢复。源码重新准备36文件完整候选、默认堆构建344.975秒通过；下载核心65384和脚本核心37020均在App先结束后只单独终止，包装器没有被当作核心Host。实际范围/下载或脚本进程在恢复前自行退出，同home/绑定/端口恢复后的新App进程/WebView保留原操作unknown、折叠提醒及无重试；未借原弹窗内存来冒充摘要持久化。

两种脚本场景实际留下测试锁条目，分别经原安装器独立离线清理，不算自动回滚。原单跳全历史审计及显式源码→发布载体切换审计均核对12会话/2106原事件、地址/消息/投影/原绑定保持和管理false；原同载体审计拒绝第一次载体切换的失败保留。SOURCE已停止、36原文件与启动配置恢复、原构建349.892秒通过，355原资源及Git干净精确核验并[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-cold-final.json)。正常发布Host22000及App13059保留；修复/applying阶段的手机冷恢复、实际SEA/Electron/TTY和全部新版标准仍待验，日常旧版不变。
