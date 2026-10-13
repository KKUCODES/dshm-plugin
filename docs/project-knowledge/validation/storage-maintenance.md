# 构建与测试产物的空间维护

- 状态：已核验的废弃构建清理；此前 SDK 压缩与运行结果仅保留为历史，不代表当前交付。
- 维护角色：DSH Mobile 项目维护者。
- 最近核验：2026-10-12。
- 来源：[固定范围清理脚本](../../../scripts/cleanup-failed-sdk-products.ps1)、[本次删除清单与实际空间变化](../../../artifacts/latest-runtime-check/storage-cleanup-cf28b1fe-46c9-4d94-ae32-490bf395fc8a/report.json)、[保留文件完整性检查](../../../artifacts/latest-runtime-check/storage-integrity-20261007-1791349781033/protected-files-check.json)。

## 废弃本体改造路线的清理（2026-10-12）

用户明确授权清理此前 DSH 本体改造路线留下的大型产物。当前交付遵守[纯插件决定](../../../../docs/project-knowledge/knowledge/decisions/2026-10-09-official-dsh-plugin-only.md)，不再以重建 DSH、SDK 或 Electron 作为 DSHM 的开发步骤。

本轮固定清理 79 个目标：SDK 第 7–11 轮归档中的 `dist-exe`、`runtime` 共 10 个目录；废弃隔离检出 `latest-source-check/node_modules`；独立源码安装器测试夹具中的 68 个 `.git` 副本。测试夹具正文、隔离源码及其正式 `.git`、恢复备份、候选包、根 SDK 产品元数据、原日志与报告、真实测试 home、当前官方运行环境和手机构建工具均保留。五轮 SDK 根目录增加 `CLEANED.txt`，明确原二进制已不存在，不能再运行针对它们的历史压缩或复验入口。旧安装器夹具也不再是可重新运行的 Git 检出；不为恢复废弃测试而重新编译 DSH。

删除前核对具体绝对路径、祖先链接、进程消费者与插件 Git 跟踪；79 个目标均未被插件跟踪，未发现运行中的 DSH/Node 消费者。逐文件清单先保存，再移除目标；依赖中的 4,109 个链接只删除链接本身，不遍历其目标。删除 298,703 个普通文件，逻辑体积约 14.42 GiB。Q 盘实际可用空间从 1,581,297,664 字节增至 10,005,954,560 字节，观察增量 8,424,656,896 字节，约 7.85 GiB；实际余量约 9.32 GiB。压缩、硬链接与并行写入使逻辑体积不等于可用空间增量。

79 个目标均已不存在，29,807 个保留文件的 SHA-256 一致，手机端和插件的 HEAD 与原工作区状态保持。补充本说明前，文档检查通过 177 份 Markdown、11,088 个本地链接。没有停止服务、操作模拟器、读取凭据内容或重建任何产品。

具体范围、逐文件 TSV 和结果位于集合内部的 [清理报告](../../../../docs/iteration-history/artifacts/storage-cleanup-20261012-1791776565114/report.json)、[完整性核对](../../../../docs/iteration-history/artifacts/storage-cleanup-20261012-1791776565114/integrity-after.json)及[固定清理脚本](../../../../docs/iteration-history/artifacts/storage-cleanup-20261012-1791776565114/cleanup.ps1)。任务：[KKC-32](https://linear.app/kkcodes/issue/KKC-32)。以下保留原日期的历史记录，其 SDK 构建和保留约定已由本节及纯插件决定取代，不要求继续重建旧载体。

## 早期清理与压缩记录

用户授权整理迭代产物，并要求不影响后续开发。先核对归属、失败记录、实际消费者、Git 跟踪和 reparse 路径，再清理 SDK 第 2、3、4、6 轮失败归档中的 `dist-exe` 与 `runtime-node`。八个目标合计 3,237,970,952 字节，108,741 个文件；原失败日志、报告、归档 EXE 摘要、压缩前后摘要清单全部保留，每个归档根目录留下 `CLEANED.txt`，说明原大文件已清理。清理报告旁的八份 TSV 保存原路径、文件大小和修改时间。

Q 盘实际可用空间由本轮清理前 136,814,592 字节增加至 954,134,528 字节，观察增量 817,319,936 字节（约 779 MiB）。大文件此前使用 NTFS 压缩，且依赖可能存在硬链接，不能把 3.02 GiB 文件体积当成实际释放空间。并行系统写入也可能影响可用空间读数。

本次没有清理：当前新版隔离源码/依赖/完整构建、发布运行时、候选插件归档、源码原件及恢复备份、所有测试报告、Android 安装包与构建、Gradle/npm 缓存、各个 Host 的历史/配对数据。`sdk-sea-temporary/dsh-primary-runtime-downloads` 是原 SDK 打包器复用的锁定下载缓存，必须保留，不把名字带 temporary 的目录整体删除。

另一个 136,114,148 字节的 `.tools/gradle-8.9-bin.zip` 已验证摘要及完整解压版本存在，但删除命令被自动审批拒绝，未执行；原包及摘要仍保留。本次不绕过该限制。

## 后续保留规则

第七、八轮完整载体另已按具体失败和消费者核验归档，不属于上方已删除的四轮。第八轮为后续对照保留整个runtime、dist-exe和产品记录；[固定压缩脚本](../../../scripts/compress-latest-sdk-failed-products.ps1)已支持显式 `-ArchiveAttempt 8`，[实际压缩报告](../../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-8-compression.json)通过45,176文件压缩前后全部字节摘要一致（`1261bf05f6d66043cfc3e76d39e67431461b46297af5b45bb98a79423f77e1bc`）。实际可用空间读数增加176,529,408字节；不是删除文件，原失败与完整SDK8载体都保留。第九轮产物由独立构建报告管理，不能被失败归档工具覆盖。

### 第九轮归档的压缩与硬链接长度核验（2026-10-08）

SDK9配置重载失败后，整个生成物已由[明确归属的归档器](../../../scripts/archive-latest-sdk-profile-failure.mjs)同卷移动，原失败与Python模块保持。压缩工具只增加显式SDK9范围：核对固定commit、失败类型和原EXE摘要，拒绝项目外路径及reparse。没有重试此前被拒绝的删除。

[首轮报告](../../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-9-compression.json)保留失败：compact退出0，45,179个文件中24个长度记录不同，全部路径和内容SHA-256一致。[独立诊断](../../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-9-compression-length-diagnostic.json)确认这24个文件均有真实硬链接；读取实际字节得到的长度与压缩后清单相同，摘要与前后两份清单均一致。原脚本把枚举时缓存的FileInfo长度与随后打开文件取得的摘要拼在一起，不能以此认定内容被压缩改变。

[摘要助手](../../../scripts/sdk-archive-file-digest.ps1)现从同一个只读文件句柄取得长度和SHA-256。[真实硬链接回归](../../../tests/latest-sdk-compression-manifest.test.ps1)覆盖旧FileInfo仍为3字节、共享文件实际已为6字节、真实内容改变及缺失文件拒绝，3项检查通过。[独立第二轮报告](../../../artifacts/latest-runtime-check/latest-sdk-sea-attempt-9-compression-attempt-2.json)通过全部45,179文件，前后规范摘要都是`2b4bad48590a0423ac4f2bd59eeed485d5c7d1ae5efe8811427683358a62e211`，未覆盖首轮失败。

两份完整SDK9 EXE摘要仍为`989222642e2e05a287e15fbe52a232a5b2ae810b2b82785858d88a6c80992803`，原Python `bundled_runtime_path()`再次通过。这里的整个文件清单只证明本轮压缩前后内容保持；`runtime/node`的pnpm暂存闭包存在指向源码依赖的硬链接，不能把它当作已与后续源码构建隔离的不可变归档。SDK9实际EXE内的SEA载荷和原失败事实保持。

首轮可用空间由1,224,478,720增至1,678,516,224字节，观察增量454,037,504字节（约433MiB）；第二轮后为1,662,586,880字节，并行系统写入可能影响读数。当时第十轮源码租约仍ready，未重新prepare、未开始SDK打包；余量不足以按此前完整SDK生成物和临时文件体积确认空间阻塞解除，等待已请求的项目外空间释放。2026-10-09实际余量6,089,474,048字节，原完整SDK10打包、原Python检查与实际Android管理组合通过，37原源码/启动及355资源已完整恢复归档，见[第十轮实测](../../../compatibility/latest-upstream/sdk-native.md#完整第十轮与-android-管理组合2026-10-09)。空间变化来源没有推断，被拒绝的删除未重试。

1. 源码、依赖、当前可运行包、锁定下载缓存和恢复备份保留，保证后续可继续开发及回滚。
2. 失败报告、日志、摘要和小型验证证据保留。失败生成的 EXE 与重复运行时不作为交付包，也不长期保留多套完整副本；定位完成、确认无消费者并保存文件清单后再清理。
3. 测试 home 可能保存后续复验所需的真实历史和配对，不能按创建时间或临时目录名批量删除。旧 Android 构建可能被验证脚本直接引用，同样先检查消费者。
4. 清理只能针对明确的项目内目标；先检查最终绝对路径、reparse 和 Git 跟踪，不能使用全盘缓存清理或跨项目批量删除。
5. 本脚本默认只预览：在 plugin 目录执行 `./scripts/cleanup-failed-sdk-products.ps1`。只有显式 `-Apply` 才删除已核验的固定四轮归档；不接受任意路径。它不是未来所有测试目录的自动清理器。
6. 重跑 SDK 时创建新的源码租约和构建报告，复用完整固定源码及锁定缓存。旧失败大文件已不存在，不能再直接运行旧归档压缩脚本或宣称还能检查其二进制内容；原摘要与原失败报告保留历史依据。

## 本次验证与限制

- 清理前后 3,363 个既有源码、配置、测试报告及根目录安装包文件的 SHA-256 一致；此核验发生在补充本说明和导航之前，新增文档是本次有意变更。
- 固定新版源码 Git 干净，commit 保持 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`；官方 `readClientBuildRecord` 重新核验 355 个实际客户端资源，摘要仍为 `517da690aabff313743f2be09dd93e06b218bacf579bebb87ca330d50702f107`。
- 当前 Host PID 17620 未停止；Gradle 8.9 的已解压入口 `--version --offline --no-daemon` 正常退出。未重装或操作 MuMu App，未读取 Key。
- 未运行 Android 完整构建或 SDK 重试；约 910 MiB 余量低于此前建议的至少 3 GiB，不能据此判定原完整兼容任务的空间阻塞已解除。

这里只维护产物和记录，不改变原功能验收结论，也不推进主线程任务。
