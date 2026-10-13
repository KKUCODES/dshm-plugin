# 新版候选插件包与原安装入口

- 状态：候选真实归档、解包、类型入口、官方版本检查及原发布 CLI 安装/加载已通过；完整 Remote 兼容未交付。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-10-07。
- 固定目标：DSH `0.2.1-alpha.1`，commit `5badb15009ae1756c3afe0ae0cef1faafc290ccc`；候选 `0.1.76-latest.0`。官方发布仍为 Pre-release。
- 来源：[候选构建器](../../scripts/build-latest-candidate.mjs)、[归档验证器](../../scripts/verify-latest-review-package.mjs)、[原安装验证器](../../scripts/verify-latest-review-install.mjs)、[真实 Host 验证器](../../scripts/verify-latest-review-host.mjs)、下方实际报告及 [KKC-24](https://linear.app/kkcodes/issue/KKC-24)。

## 发现与修正

持续联调的六文件候选能运行，但真实 `pnpm pack --dry-run --json` 证明缺少已声明的 `README.md`、`dist/index.d.ts`、`dist/config.d.ts`、`dist/client/index.d.ts`。Host bundle 还实际引用 `@deepseek-ai/dsh-session`，候选没有声明这个运行依赖。这属于交付缺口，不能用既有 Remote 运行结果代替检查。

构建器现在从同一份隔离源码同时生成 Host、客户端 bundle 和完整类型声明，放入[候选专用说明](./candidate-README.md)。候选增加固定版本的 Session peer，所有实际外部依赖逐项核对，所有 DSH peers 保持精确版本。日常 `package.json` 仍为 `0.1.75`；没有覆盖持续运行的六文件候选、App、用户配置或凭据。

## 真实归档和消费入口

[通过报告](../../artifacts/latest-runtime-check/candidate-package-check-yas33N/report.json)对应实际的 [tgz](../../artifacts/latest-runtime-check/candidate-package-check-yas33N/dsh-mobile-plugin-0.1.76-latest.0.tgz)，共 **61 文件**，SHA-256 为 `f9c521aaa60af7aaacb8ab13b6c16ebd7bc027e463150ce7efe04c4091ffbc0c`。

验证器实际调用原工程 pnpm 生成归档，再由系统 tar 解包到独立消费目录。清单与全部归档路径完全一致；除 pnpm 重新序列化的 `package.json` 外，所有解包文件与生成载荷逐字节相同。Manifest 比较全部解析字段，并另记归档内原始字节摘要，不忽略依赖、导出或版本。

运行验证从真实包名 `@dsh-mobile/plugin` 导入并核对解析入口。严格 NodeNext TypeScript 消费者同时导入 Host 和 `@dsh-mobile/plugin/client`，`skipLibCheck: false` 编译通过。原官方 `evaluatePluginCompatibility` 对精确 `0.2.1-alpha.1` 通过；旧基线、下一个预发行版、`0.2.1` 稳定版及 `0.3.0` 均拒绝，没有使用豁免。

两个原验证器失败报告保留：[首轮绝对文件名断言](../../artifacts/latest-runtime-check/candidate-package-check-Vi8u9X/report.json)、[第二轮 JSON 原字节断言](../../artifacts/latest-runtime-check/candidate-package-check-tSfXsh/report.json)。前者是 pnpm 返回绝对归档路径，后者是 pnpm 格式化/重排 Manifest；完整解析配置实际一致。修正验证器后新目录通过，不覆盖原失败，也不将其误报为 DSH 运行失败。

## 子会话生命周期候选（2026-10-07）

新增只读 Host 生命周期流后，重新生成独立[候选包](../../artifacts/latest-runtime-check/candidate-package-check-M1dGpM/report.json)：62文件，归档 SHA-256 `57bb0f617a92a8d69ef130901f475de134af0987237d12999d950f26e4a80476`。真实解包、包入口导入、严格Host/Client类型消费及官方精确版本检查通过；新声明文件随包交付。未覆盖此前归档或主运行候选。

该包另通过[实际 MuMu 发布入口](../../../backend/.test-data/latest-child-unload-99RNvd/report.json)主聊天/旁栏的在途服务卸载与恢复四分支；相同手机和共享协议在实际源码入口亦通过。无模型Key，不代替完整推理、原安装器重新安装或全量新版兼容，详细范围见[子会话专项](../../../dsh-mobile/docs/integration/latest-child-model.md#服务卸载在途与重新读取2026-10-07)。

## 原安装与正常启动

| 入口 | 实际证据 | 覆盖范围 |
| --- | --- | --- |
| 解包目录加载 | [Host 报告](../../artifacts/latest-runtime-check/candidate-package-check-yas33N/host-report.json) | 原发布 `dsh web --patch` 指向解包入口；独立空 home 的页面、插件设置与 Session 列表通过。 |
| 原插件管理器安装 | [安装报告](../../artifacts/latest-runtime-check/candidate-package-check-yas33N/install-report.json) | 原 `dsh plugin --profile web add <tgz> --ignore-scripts` 退出 0，使用默认 peer 行为；实际安装 Manifest 和关键文件与归档一致，原管理记录正常清理。 |
| 安装后原启动 | [安装后 Host 报告](../../artifacts/latest-runtime-check/candidate-package-check-yas33N/installed-host-report.json) | 同一真实安装 profile 执行正常 `dsh web --host 127.0.0.1 --port 0 --no-open`；没有传入 `--patch`，页面、插件设置接口与独立空历史通过。 |

测试启动的进程均已按自身 PID 停止。安装时启用 `--ignore-scripts`，不能据此证明任意第三方生命周期脚本兼容。测试包没有接入用户 Key、日常历史或实际手机配对；这项结果证明归档与真实安装/加载入口，不替代已绑定 Android 的模型、审批、输出和管理验收。

## 安装包到中转的实际协议链路

后端的[独立测试](../../../backend/tests/latest-review-package.test.ts)从上述同一真实安装 profile 正常启动原 `dsh web`，没有入口覆盖、额外测试插件或 Key。使用生产网关与 Store、PGlite 数据库、现有真实 ES256/DPoP 测试身份及 WebSocket 协议，不伪造 Host 或认证结果；仅数据库载体属于隔离测试环境。

[本轮报告](../../../backend/.test-data/latest-review-relay-cTtFAT/report.json)通过，测试体用时9.633秒，Vitest整体11.45秒；覆盖未批准403、批准后协商/只读访问、已有工作区创建会话、实际模型选择快照、流首帧/取消/历史重入、消息与电脑原历史同步，以及撤销连接/票据401。手机创建工作区及未授管理权限的设置读取仍拒绝。原 Host 因无 Key 返回实际 `MISSING_CREDENTIAL`，报告明确 `inferenceVerified:false`、`androidVerified:false`，不能宣称本轮真实推理或 MuMu 通过。

该专项复用原安装报告证明的归档入口，所有会话和自动生成的配对仅属于这个隔离安装 home；结束撤销测试设备、停止拥有的Host并关闭网关/数据库。持续模型联调环境与前台 MuMu 未操作。在后端目录执行 `node scripts/verify-latest-review-relay.mjs candidate-package-check-<本轮目录后缀>`；必须使用完成原安装/正常Host检查的全新目录，脚本以排他标记拒绝重复消费已使用 home，原记录保持。

加强断言后的第二轮也使用新目录：[新归档检查](../../artifacts/latest-runtime-check/candidate-package-check-yr3WGO/report.json)、[原安装](../../artifacts/latest-runtime-check/candidate-package-check-yr3WGO/install-report.json)、[正常启动](../../artifacts/latest-runtime-check/candidate-package-check-yr3WGO/installed-host-report.json)和[真实协议报告](../../../backend/.test-data/latest-review-relay-HZeDSS/report.json)全部通过。新归档仍61文件，SHA-256 `3823bc99e1b31e35a966e32e0ffe776a027d7c1686ef026b6f8a600bcc4097cc`，不覆盖第一轮归档。选模后另从电脑原会话列表核对同一模型，结束后系统明确返回原启动PID不存在（ESRCH），报告记录启动PID与 `launcherStopped:true`。测试体9.265秒、整体10.70秒；生产类型检查通过。两轮均无Key/Android，不扩大上述范围。

## 重现与交付边界

### 当前完整插件源码对应的安装包（2026-10-07）

现行候选为 [1xqe3A 的真实归档](../../artifacts/latest-runtime-check/candidate-package-check-1xqe3A/report.json)，**62 文件**，SHA-256 `16835594509559deb424e7d747ee7c64dfdabcf2d4f82bb7323a30f30daba0aa`。它包含子会话 Host 生命周期流及停止后输出保留修复；[源码完整性核对](../../scripts/verify-latest-package-source.mjs)确认当前 `src/` 全部 **55 文件**与构建快照逐路径、逐摘要一致，实际安装目录的全部载荷与归档消费目录一致。因此复用原归档，不重新打包或覆盖旧证据。

| 实际入口 | 证据与结果 |
| --- | --- |
| 原插件管理器 | [安装报告](../../artifacts/latest-runtime-check/candidate-package-check-1xqe3A/install-report.json)：原 `dsh plugin --profile web add <tgz> --ignore-scripts`，默认 peer 行为，退出 0，安装后无活动操作记录。 |
| 同 profile 正常启动 | [Host 报告](../../artifacts/latest-runtime-check/candidate-package-check-1xqe3A/installed-host-report.json)：正常 `dsh web`，不带 `--patch`；页面、插件设置、空隔离历史通过，拥有的 Host 已停止。 |
| 生产中转协议 | [协议报告](../../../backend/.test-data/latest-review-relay-CcLerk/report.json)：同一安装 profile 的会话、选模/电脑同步、消息持久化、流取消、管理拒绝及撤销拒绝全部通过；测试体 10.113 秒，整体 11.81 秒，启动 PID47308 已不存在。 |
| 全部源码和安装字节 | [受限只读复核](../../artifacts/latest-runtime-check/candidate-package-check-1xqe3A/source-integrity-recheck.json)：55源码文件、原归档摘要及全部安装载荷一致；不再安装、启动或重复消费此 home。 |

首轮源码核对的[失败报告](../../artifacts/latest-runtime-check/candidate-package-check-1xqe3A/source-integrity-report.json)保留。验证器错误期待 `installed-host-report.json` 含 `launcherStopped`，该字段实际只出现在包装器输出；原报告保存的是 `stopped.code/signal`。修正后读取同一退出记录，并向系统核对原 PID5888 不存在，再验证原安装字节。`--recheck` 必须匹配这一特定原失败，拒绝覆盖失败或复核报告；它不是重试安装或放宽运行门槛。

这轮使用真实网关、Store、PGlite、ES256/DPoP及WebSocket。无模型 Key，原 Host 返回 `MISSING_CREDENTIAL`，报告的 `inferenceVerified:false`、`androidVerified:false` 保持；不能将其他轮次手机和模型通过结果写成此安装轮次的结果。结束撤销独立设备，关闭拥有的 Host/网关/数据库，持续联调 App、Key、配对与历史未操作。源码完整性仍明确 `fullAcceptancePassed:false`。

同一当前源码另以原 `0.1.6-alpha.2` 依赖执行 `node node_modules/vitest/vitest.mjs run`，41文件/218项全部通过（12.59秒）；`node node_modules/typescript/bin/tsc -p tsconfig.check.json` 退出0。后端 `node --test tests/latest-live-resume.test.mjs` 七项启动/恢复门槛通过。它们证明当前源码在旧依赖下的回归与类型兼容，不替代旧版日常安装的端到端组合验收。核对正常联调控制器仍在线，未触碰日常电脑环境或手机数据。

在插件目录执行：

```text
node scripts/verify-latest-review-package.mjs
node scripts/verify-latest-review-host.mjs candidate-package-check-<本轮目录后缀>
node scripts/verify-latest-review-install.mjs candidate-package-check-<本轮目录后缀>
```

后两条必须使用第一条实际返回的目录，脚本拒绝覆盖已有 home 或报告。运行依赖已经准备好的固定源码、原锁 pnpm 与独立发布 runtime；它不是新克隆仓库的一键构建命令。归档、依赖和详细报告都在项目 `artifacts/` 内，不随 Git 分发。

插件 tgz 不包含 DSH 兼容补丁、App、中转后端和[人工权限工具](./acl-repair.md)。[18 项当前去留](./patch-matrix.md#当前载荷核对2026-10-06)已逐项核对，但全部有效能力实际验收、SDK/Electron 载体、最终组合和旧版回归仍须完成；SDK 打包的磁盘限制见[源码运行器与打包](./source-runner-profile-resolution.md#sdk-打包与源码恢复)。Linear 当前七项总标准保持未勾选，不能仅凭本页发布新版支持声明。
