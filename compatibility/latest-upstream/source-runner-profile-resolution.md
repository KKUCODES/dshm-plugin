# 源码安装运行器的 profile 路径解析

- 状态：显式源码tsconfig已加入正式候选；完整构建、源码/发布运行场景和两种入口的实际MuMu修复冷恢复通过。36原文件/启动配置、原完整构建及355资源精确恢复归档；完整新版兼容仍未完成。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-10-06。
- 基线：DSH `0.2.1-alpha.1`，提交 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。
- 来源：[原运行器载荷](./package-runner-source.ts)、[源码转换](./source-package-range.mjs)、[实际进程对照](../../scripts/verify-latest-source-package-runner-profile.mjs)、[对照报告](../../artifacts/latest-runtime-check/latest-source-runner-profile-resolution.json)。

## 已确认的失败

SOURCE 修复阶段手机冷恢复的[首轮报告](../../artifacts/latest-runtime-check/latest-live-source-repair-host-only-native-installed-cold-phone.json)停在旧版脚本审批前，实际脚本请求为0。原安装日志 `profiles/web/.plugin-manager/logs/operation-Zi7s3o/pnpm.log` 显示 `Cannot find package '@deepseek-ai/dsh-win32-process'`，不是HTTP下载失败。失败截图显示手机返回Remote列表；页面为何切换尚未确定，不以路径错误解释未经证实的页面行为。

原源码运行器通过 `node --import tsx/esm <run-tree.ts>` 启动，工作目录仍是原安装profile。真实该目录下的运行器PID53352退出127，准确复现缺少原生包；同一目录、同一原运行器、相同IPC及自有输出命令，仅将导入钩子改为tsx的`register({tsconfig:源码工程tsconfig})`后，PID4284退出0，输出准确且stderr为空。该轮仅有对照证据；正式修正与手机复验见下节。

修改安装工作目录会改变原pnpm/profile行为；直接补包链接依赖当前安装布局，维护成本更高。采用运行器启动参数明确绑定源码tsconfig，通过Node的data URL加载tsx公开ESM注册API；已编译发布分支、原profile工作目录及传给pnpm的环境保持。既有源码/发布通过报告保留，不能替代新失败的实际入口验证。

首轮三个原profile配置字节与管理false已恢复，主聊天与空草稿也恢复；报告中的`true !== false`来自清理代码仍要求Host改变，而该轮从未执行Host退出，并非撤权失败。单独`history source-repair-cold`审计亦因Host未改变按原规则拒绝，失败保留，不放宽断言。停止拥有的源码服务并恢复正常发布Host20064后，[显式载体审计](../../artifacts/latest-runtime-check/latest-live-source-repair-cold-carrier-report.json)通过12会话/2106原事件、地址/消息前缀/投影与管理false，新增恢复标记0。

## 正式修正与两个实际手机入口

新13项/36文件组合完整构建341.758秒退出0、无超时。[固定ready租约](../../artifacts/latest-runtime-check/latest-package-range-profile-source-ready-lease.json)和[独立发布载荷](../../artifacts/latest-package-range-profile-payload/manifest.json)排他封存，旧载荷未覆盖。新生成器要求本轮ready、正式运行器启动参数、九场景、86原回归和退出/取消/超时三项报告通过，仍固定源码提交、规范运行器及编译产物SHA-256。

[实际profile核验](../../artifacts/latest-runtime-check/latest-source-runner-profile-resolution-fixed.json)严格核对正式启动参数等于源码根tsconfig的ESM注册参数，并执行正式未改写参数，PID26436退出0、stdout准确、stderr为空。首次验证器把`createRequire`取得的CJS API误当ESM入口，断言在执行前失败；修正为读取实际tsx导出的ESM分支。随后旧loader对照PID29892也退出0，与旧失败预期不符，[失败报告](../../artifacts/latest-runtime-check/latest-source-runner-profile-resolution-fixed-legacy-expectation-failed.json)保留；当前完整构建后已有workspace依赖链接，不能声称本轮仍复现缺包或把改善只归因于显式配置。旧PID53352/4284真实对照与本轮正式参数/手机证据分别记录，没有修改原失败报告。

源码[九场景](../../artifacts/latest-runtime-check/package-range-source/actual-report-attempt-8.json)、[86原回归](../../artifacts/latest-runtime-check/package-range-source/original-regressions-attempt-2.json)、[核心退出](../../artifacts/latest-runtime-check/package-host-only/source-installed-native-installed-attempt-2.json)、[修复取消](../../artifacts/latest-runtime-check/package-host-only/source-installed-native-installed-cancel-attempt-2.json)与[修复超时](../../artifacts/latest-runtime-check/package-host-only/source-installed-native-installed-timeout-attempt-2.json)均完整通过。发布新五文件载荷的[九场景](../../artifacts/latest-runtime-check/package-range-published/actual-report-attempt-2.json)、[核心退出](../../artifacts/latest-runtime-check/package-host-only/published-native-installed-attempt-2.json)、[取消](../../artifacts/latest-runtime-check/package-host-only/published-native-installed-cancel-attempt-2.json)与[超时](../../artifacts/latest-runtime-check/package-host-only/published-native-installed-timeout-attempt-2.json)另通过；五项安装边界亦通过。

| 实际MuMu修复冷恢复 | SOURCE `pnpm dsh web` | npm发布CLI |
| --- | --- | --- |
| 原操作 | `1c18e43d-e96b-4fbf-ae5e-1cf1febdb20d` | `1c3450b1-44f4-4e37-91b4-f768e3420bb7` |
| 单独结束的核心Host | 66992（包装器11300） | 21324 |
| 在恢复前已退出的范围/脚本/写入 | 20856/66928/14644 | 61132/27088/55740 |
| App真实冷启动 | 19498→12979 | 12979→16572 |
| 恢复Host | 45328 | 51112 |
| 原unknown/折叠提醒、无自动重试、旧版及配置保持 | 通过 | 通过 |
| 原管理器接管死记录、明确重新安装、卸载及权限收回 | 通过 | 通过 |

完整报告：[SOURCE](../../artifacts/latest-runtime-check/latest-live-source-repair-host-only-native-installed-cold-phone-attempt-2.json)、[RELEASE](../../artifacts/latest-runtime-check/latest-live-release-repair-host-only-native-installed-cold-phone-attempt-2.json)。两个单跳全历史审计：[SOURCE](../../artifacts/latest-runtime-check/latest-live-source-profile-fixed-cold-after-report.json)、[RELEASE](../../artifacts/latest-runtime-check/latest-live-release-profile-fixed-cold-after-report.json)，另有[源码→发布切换审计](../../artifacts/latest-runtime-check/latest-live-source-profile-fixed-carrier-carrier-report.json)，均保持12会话/2106原事件、完整投影和原绑定，新增恢复标记0、management=false。所有测试命令正常退出0，没有重建APK、改日常App或读取Key。

## SDK 打包与源码恢复

2026-10-07第七轮[SDK原生加载专项](./sdk-native.md)已完成原官方完整打包、生成/同步EXE与Python资源校验，并实际启动SDK读取原26会话/3665事件。MuMu唯一发送因Q盘虚拟native路径加载失败，原seq1782不变；最小SEA复现及候选规范化通过，修正已加入13组/37文件的维护变换，但修正后的完整SDK/实际续聊仍待验。原发布Host/App恢复、37原源码/启动配置及366.169秒完整恢复构建/355资源精确核验后，`sdk-attempt-7-final`已独立归档。以下六轮失败和旧36文件SDK范围保持各自原证据。

2026-10-07 用户授权[整理迭代产物](../../docs/project-knowledge/validation/storage-maintenance.md)：以下第2/3/4/6轮失败归档的 EXE 与重复运行时已清理，根目录留下说明，原失败报告、日志、摘要和压缩核验清单仍保留。此前“失败产物保留”的描述是当时状态；现在不能再直接读取或压缩旧归档二进制。完整固定源码、当前发布运行时和锁定下载缓存保持，后续仍可创建新租约打包。实际释放约779MiB，尚未重试SDK，不改变以下失败与未验证结论。

当前SDK写入排查独立36文件租约为 `sdk-write`：完整候选构建341.429秒退出0、无超时，第四轮资源准备、第六轮SEA数据生成均明确因磁盘不足失败，第五轮在打包前因pnpm非TTY依赖状态退出；完整SDK打包及实际载体尚未通过。三个目录压缩继承原属性恢复通过，原锁依赖恢复退出0；本轮原完整源码恢复构建350.017秒退出0、无超时，[原构建日志](../../artifacts/latest-runtime-check/latest-live-source-sdk-write-restored-build.log)保留。36原源码/根启动字节、Git干净及355原前端资源逐项精确核验后[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-sdk-final.json)，与原applying专项的恢复记录分别保留。下一轮SDK需要新增独立源码租约，不能把本轮恢复记录复用为未执行的新构建。

第六轮339.302秒退出1，[报告](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-6.json)及[日志](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-6.log)保留，原SEA工具返回 `sea-prep.blob:no space left on device`，尚未生成exe。严格核对原报告、进程已退出、失败类型及空dist-exe后，空产物目录与完整runtime-node已[在项目内改名归档](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-6-failed-products-archive.json)，没有删除旧closure。Q盘该轮后可用528,470,016字节，需要增加构建可用空间；建议预留至少3GB，不保证这个建议替代后续实际峰值验证。没有继续盲目重跑或把旧不完整exe记作实际SDK通过。

第四轮396.733秒退出1，[写入原始观察](../../artifacts/latest-runtime-check/sdk-write-diagnostic-attempt-4/write-result.json)显示326,914,560字节exe写入成功，写入前可用334,688,256字节；随后原官方打包器准备主运行时资源时明确返回 `ENOSPC: no space left on device, write`，见[失败报告](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-4.json)和[日志](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-4.log)。第四轮失败产物[归档](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-4-failed-products-archive.json)并[压缩逐文件核验](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-4-compression.json)28,021文件字节保持，exe SHA-256 `b01f8dfc456a3a14a0dc82532176618e415facd4d1c7853430e9444ac946e3e8` 不变；压缩后可用614,047,744字节。这确认第四轮资源准备的磁盘故障，不能反推旧第三轮的原始errno。

[目录压缩租约](../../scripts/manage-latest-sdk-compression.ps1)只给隔离源码根、SDK运行时目录及专属TEMP三个已核对目录设置NTFS压缩继承，没有递归改现有源码或删除历史产物。原属性与逐项核对记录在[恢复依据](../../artifacts/latest-runtime-check/latest-sdk-compression-directory-lease.json)，第六轮退出后三个原属性恢复通过、state=restored。失败归档仍保留NTFS压缩，文件内容校验与目录属性恢复分别记录。第五轮3257毫秒退出1，尚未生成dist-exe/runtime-node，[报告](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-5.json)和[日志](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-5.log)保留；准确错误为 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`。本检出pnpm11.7.0沿原锁offline/frozen-lockfile/ignore-scripts/prod=false/confirmModulesPurge=false恢复依赖退出0，第六轮不覆盖旧报告、日志或产物。

SDK实际启动提供[隔离载体核验](../../../backend/scripts/latest-sdk-carrier.mjs)及 `start-latest-live.mjs --resume --sdk-sea`：只认[官方完整打包](../../scripts/build-latest-sdk-sea.mjs)成功报告及排他产品记录，核对固定提交、生成/同步EXE同SHA-256并运行原Python资源验证器。前六轮无成功记录被拒绝；第七轮原Python校验、SDK实际启动与历史读取已通过，手机续聊在原生加载处失败，完整载体和记录现已独立归档。第八轮额外核对完整manifest和修正bootstrap摘要。仅允许原测试home在旧控制器/Host完全停止且cleanup核验后恢复，与SOURCE及所有诊断互斥；可组合已审阅候选并额外核对55源码字节，运行独立EXE正常web profile。7项恢复门槛通过，真实续聊及其他完整载体标准以[SDK专项](./sdk-native.md)为准。

第三轮失败后项目盘只余443,150,336字节，空间不足只是待核实假设；postject吞掉原writeFile错误，旧日志不能区分ENOSPC与占用等原因。[压缩脚本](../../scripts/compress-latest-sdk-failed-products.ps1)仅在本项目已核对、无reparse的失败归档上调用NTFS压缩，不删除旧证据。第二轮归档的首轮压缩退出0、释放空间，但[聚合校验失败](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-2-compression.json)保留，原因未确认；原exe SHA-256不变，不据此声称首轮全部字节保持。补充Ordinal排序与逐文件前/后记录后，[第二次压缩核验](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-2-compression-attempt-2.json)通过28,021文件原字节，两个逐文件记录同时保留。第三轮177,209,344字节失败exe和closure亦在[原目录归档](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-3-failed-products-archive.json)后[压缩核验](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-3-compression.json)通过26,350文件字节；原exe SHA-256 `093f51503fd6514d3475db897715a73f86c9d9a9cf4ca0e1d0fafe5552924a0e` 保持。第四轮前盘空间为930,107,392字节；这些措施不代表原打包故障已修复。

原GitHub下载限制已取得新的实际前提：[独立预取脚本](../../scripts/prefetch-latest-sdk-primary.ps1)按本提交原锁下载Windows目标的15个Node/Python/wheel资源，使用PowerShell默认TLS校验，不降低证书要求；[预取报告](../../artifacts/latest-runtime-check/latest-sdk-primary-prefetch.json)全部SHA-256与原锁一致，缓存路径正是原SDK脚本的专属TEMP下载缓存。原curl HEAD在GitHub跳转后出现 `CRYPT_E_REVOCATION_OFFLINE`，PowerShell默认HEAD返回200并实际完整下载；这不代表原Node直接联网恢复，也尚不能替代完整SDK打包/运行结果。

第二轮旧SDK生成目录已由[独立归档脚本](../../scripts/archive-latest-sdk-failed-products.ps1)核对归属、旧构建退出及实际绝对路径后在项目内改名保留，未删除或覆盖。归档exe为326913536字节，SHA-256 `72829c67de90f6537d632ecf8e3154f9d477ce0cdeb1f920081e3bae63410198`，移动前后保持；[归档报告](../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-2-failed-products-archive.json)记录两个完整目录的新位置，原失败报告及日志保留。

为源码applying专项重新准备同一36文件候选，首轮完整构建177.848秒后在原DevTools生成目录rename处EPERM退出1、无超时；[失败日志](../../artifacts/latest-runtime-check/latest-live-source-applying-cold-patched-build.log)和[排他失败租约快照](../../artifacts/latest-runtime-check/latest-live-source-applying-cold-failed-lease.json)保留。管理脚本新增明确的 `--scope=applying-cold` 日志名称及严格限定该失败的retry入口，未改构建命令或原DevTools源码；同一完整构建重试222.511秒退出0。这不证明Windows rename故障已修复。

SOURCE第三轮[实际手机applying冷恢复](../../../dsh-mobile/docs/integration/latest-install-recovery.md#source-补验与失败边界)完整通过：原操作39c4e02f-f8a6-4f5b-a39b-f21f547e7c82、原helper实际模块/PID9196及85秒gate均核对，先结束App6597再从外部只结束核心9196，恢复Host20152/App12296后未知提醒和目标文件保留。原管理页清理、三配置字节/原分页投影/主聊天空草稿/workspace-write及management=false恢复；首轮过晚结束核心与第二轮gate缺失均保留为失败，未改生产或APK。源码单跳与返回发布载体的审计保持12会话/2106原事件、原消息前缀/地址/绑定，新增恢复标记0；正常RELEASE Host14292保留，MuMu实际设备窗口已置前。

SDK第三轮使用已核验缓存，388.090秒后退出1：[报告](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-3.json)和[日志](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-3.log)显示postject在向Windows exe注入SEA blob时 `Couldn't write executable`，尚未完成主运行时打包。根因未确认；生成目录与旧失败证据保留，不能将部分exe或缓存下载通过记作完整SDK打包、实际SEA运行通过。

本轮36原文件/根启动字节已恢复，首次原完整构建因pnpm的非TTY依赖清理提示退出1；[失败日志](../../artifacts/latest-runtime-check/latest-live-source-applying-cold-restored-build.log)和[失败租约快照](../../artifacts/latest-runtime-check/latest-live-source-applying-cold-restore-failed-lease.json)保留。使用本检出pnpm11.7.0、原锁文件、offline/frozen-lockfile/ignore-scripts/prod=false明确恢复依赖已退出0；同一原完整构建重试352.172秒退出0、无超时，[日志](../../artifacts/latest-runtime-check/latest-live-source-applying-cold-restored-build-retry-2.log)保留。36原源码/根启动字节、Git干净及355原资源精确核对通过，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-applying-final.json)。管理脚本的 `retry-restore` 只允许该scope、该实际非TTY失败且原字节已经恢复的租约，不覆盖旧失败记录；没有改原源码或原构建命令。

[官方SDK打包脚本](../../scripts/build-latest-sdk-sea.mjs)只在固定隔离检出和专属临时目录运行。首轮缺少Windows pnpm JavaScript入口，在部署前终止；第二轮补充实际pnpm11.7.0入口，723.015秒后退出1：SEA exe及Office/ripgrep副件已生成，但原官方打包器下载GitHub主运行时配件时连接超时。[第二轮报告](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-2.json)和[日志](../../artifacts/latest-runtime-check/latest-sdk-sea-build-attempt-2.log)保留。生成exe不等于完整打包成功，也没有取得实际SEA运行链路通过证据；重跑前需核对并归档已有生成目录，不能覆盖失败产物。

前一轮36个原源码与根启动字节已经恢复，Git干净；首次原构建因pnpm的非TTY依赖清理提示退出1，[失败日志](../../artifacts/latest-runtime-check/latest-live-source-restored-build-after-sdk-failed.log)保存。使用本检出pnpm11.7.0、原锁文件、offline/frozen-lockfile/ignore-scripts/prod=false明确恢复依赖后，同一租约原构建重试336.774秒退出0，无超时；36原文件/根启动字节、Git干净及355原前端资源精确核对通过，已[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-repair-cold-final.json)。旧`package-range-cold-final`完整归档仍保留，不覆盖失败日志或旧轮次。

前一轮正常RELEASE Host20064/App19498的[恢复截图](../../artifacts/latest-runtime-check/latest-live-source-profile-resolution-restored.png)保留。只读临时探针打印核对通过后仍保有Playwright句柄，专门结束其PID64360释放探针资源，没有结束App、Host或子树；这不算该临时命令自然退出0。本轮正常RELEASE Host51112/App16572保留，手机主聊天/空草稿/workspace-write恢复，MuMu实际窗口再次核对并置前。新36租约原完整构建364.712秒退出0、无超时，36原文件/根启动字节、Git干净及355原资源精确核验后[排他归档](../../artifacts/latest-runtime-check/latest-live-source-lease-package-range-profile-final.json)。当前发布plan核对新五文件均patched，旧载荷/失败/租约保留。修复冷恢复通过不代替applying阶段、实际SEA/Electron/TTY、18项最终去留、交付/旧版回归及原完整标准。
