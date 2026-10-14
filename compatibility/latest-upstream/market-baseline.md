# 插件市场基线与 alpha.2 双版本兼容

- 状态：以下核心场景本地通过；[插件公开 Release](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.84-latest.0)与[新版 APK](https://github.com/KKUCODES/deepseek-harness-mobile/releases/tag/v0.1.0-preview.2)已发布，云端构建和匿名下载校验通过。
- 维护角色：DSHM 插件与手机端维护者；核验日期：2026-10-14。
- 来源：[版本白名单](../../src/profile-dsh-version.ts)、[共同安装包构建](../../scripts/build-github-package.mjs)、[实际安装验证器](../../scripts/verify-github-install.mjs)、[真实 Remote 验证器](../../scripts/verify-remote-baseline.mjs)、[Android 驱动](../../../dsh-mobile/tests/support/market-baseline-android.mjs)。

## 交付方式

只修改 DSHM 插件、DSHM 手机端及各自构建和测试。不修改 DSH 本体、官方安装文件或核心依赖，不编译 DSH、SDK 或 Electron。测试通过官方 npm 发布包启动正常 CLI Web，使用独立 DSH_HOME；没有变更日常 DSH 或原手机 App。

共同 Git 包 `0.1.84-latest.0` 明确支持两套离散组合：

| 官方 DSH | Cordis | Schemastery | 默认 Git 包 |
| --- | --- | --- | --- |
| `0.2.0-rc.2` | `4.0.4` | `3.18.4` | 支持 |
| `0.2.1-alpha.2` | `4.0.5-alpha.1` | `3.18.5-alpha.1` | 支持 |

运行 peer 用 `||` 枚举这些确切版本，不使用 `*`、`^` 或整个预发布范围。alpha.1 保留自己的精确版本 `.tgz`，不包含在共同 Git 包中。构建先用两套 SDK 分别生成类型，再生成一份运行代码；三版 CI 归档仍各自精确声明宿主版本。

rc.2 的 171 个官方 Remote 声明、alpha.2 的 173 个声明已只读核对，当前策略使用的全部公开端点均可对应。`$events` 属于官方 Gateway 事件协议，`settings/openAgentPresetDirectory` 使用已有公开 profile 服务适配。定时目录 `schedule/list` 保持仅在 alpha.2 宣告并放行；不把所有 alpha.2 能力无差别开放给 rc.2。

## 实际验收

| 用户入口或路径 | rc.2 | alpha.2 |
| --- | --- | --- |
| 官方 `dsh plugin --profile web add`，独立 Git 载荷安装，74 个文件逐项核对 | 通过 | 通过 |
| 正常官方 Web 启动、实际插件列表与设置页、官方卸载 | 通过 | 通过 |
| 生产中转、真实配对，批准前拒绝，链接重复领取拒绝 | 通过 | 通过 |
| 电脑登记测试工作区，Remote 新建/列出/改名会话 | 通过 | 通过 |
| Remote 切换两个真实模型，电脑投影同步 | 通过 | 通过 |
| Remote 发送、真实 DeepSeek 回复、流式消息、电脑与 Remote 历史逐项一致 | 通过 | 通过 |
| 官方 write 等待审批，Remote 允许一次后磁盘实际写入、拒绝后文件保持 | 通过 | 通过 |
| 新票据重连，完整历史保持；撤销后原凭据申请票据返回 401 | 通过 | 通过 |
| 同一 Android APK 原生配对、自有 Remote 页面、历史读取、手机发送与真实回复 | 通过 | 通过 |
| 原生独立通知连接完成版本协商并请求 `remote.taskFollow` | 通过 | 通过 |

官方设置页证据：[rc.2 报告](../../artifacts/github-install/run-EH2IjA/report.json)、[alpha.2 报告](../../artifacts/github-install/run-6hOq0M/report.json)。当时协议测试已关闭临时中转，因此截图中的设备列表读取失败是预期的测试收尾状态，只据此证明页面实际加载，不声明网络列表成功。

完整协议与 Android 两轮：[rc.2](../../artifacts/github-install/run-lMWhdI/report.json)、[rc.2 核心细项](../../artifacts/github-install/run-lMWhdI/remote.json)、[alpha.2](../../artifacts/github-install/run-dc06AU/report.json)、[alpha.2 核心细项](../../artifacts/github-install/run-dc06AU/remote.json)。两轮均 `passed=true`、`cleanupCompleted=true`，手机报告无 page error。实际生产网关使用本地 PostgreSQL WASM 测试引擎；认证、DPoP、票据和转发不使用假实现。

Android 使用已存在的独立 MuMu 设备 3、`127.0.0.1:16480`，本轮新建 `.baselinetest` 测试 UID。两版使用同一 APK，SHA256 `f80db3275e54aa6e8e18017bffba4ec276e0da3289c9886d9689f0ee9860b52b`。实际界面：[rc.2](../../../dsh-mobile/artifacts/market-baseline/run-lMWhdI/remote.png)、[alpha.2](../../../dsh-mobile/artifacts/market-baseline/run-dc06AU/remote.png)。没有覆盖原 App 或读取其 Key、绑定和聊天。

## 手机配套要求

旧版 DSHM 的 JS 聊天传输与 Kotlin 原生通知连接都只接受 SDK 完全相同的宿主。仅升级电脑插件无法让旧 APK 连接 rc.2。

本次两个入口均显式允许 alpha.2 SDK 连接 rc.2 / alpha.2，并为 rc.2 选择已核验的文件和 profile 契约；旧 SDK 仍保持原版本边界。手机 `0.1.0-preview.2`、versionCode 4 已公开发布，保留原签名。旧 preview.1 仍仅连接 alpha.2，连接 rc.2 需安装新版 APK；既有 Release 保持不变。

## 重复验证与边界

先通过 `prepare:ci` 准备 rc.2 和 alpha.2 的固定 SDK，再运行 `npm run test:github`、`npm run test:compat`、`npm run build:github -- --check`。端点测试从所选 SDK 读取官方运行依赖，默认使用 alpha.2。设置 `DSHM_DSH_VERSION` 为三版之一后，`prepare:ci` 和 `build:ci` 生成对应精确归档；两版共同安装目标可执行 `npm run verify:github`，只验证正常安装/Web/卸载，默认不使用模型。

可选真实协议检查需要先构建相邻后端，设置 `DSHM_REMOTE_PROBE=1`。真实模型额外通过 `DSHM_TEST_CREDENTIALS_FILE` 明确指定已有专用测试凭据；脚本只取 `refs.DEEPSEEK_API_KEY`，不复制原浏览器或电脑身份，不输出凭据。Android 专项还需独立 `.baselinetest` 包、`DSHM_ANDROID_PROBE=1`、`DSHM_ANDROID_SERIAL=127.0.0.1:16480` 与实际 ADB 路径，不能在用户正式 UID 清数据。

工作流已增加 rc.2 构建及 rc.2/alpha.2 的真实官方 CLI 安装/Web检查；[版本发布 Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/38529805413)全部成功。公开九个插件附件均匿名 GET 200，摘要与发行元数据和校验文件一致；三份归档分别核对精确宿主 peer。手机[版本发布 Actions](https://github.com/KKUCODES/deepseek-harness-mobile/actions/runs/38529805782)完成构建、签名与公开发行，APK及三个校验附件匿名下载与身份/证书/版本检查通过。市场需要重新扫描包含此更新的提交；公开发行不等于市场标签已经变化。

另已只读核对市场的 [compatibility.ts](https://github.com/0326/dsh-plugin-market/blob/main/src/worker/scanner/compatibility.ts) 和 [semver.ts](https://github.com/0326/dsh-plugin-market/blob/main/src/worker/scanner/semver.ts)，用其原函数离线检查当前 package.json 与 rc.2 / Cordis 4.0.4 基线，实际结果为 `COMPATIBLE`。[本机判断记录](../../artifacts/github-install/market-compatibility.json)含两份源码摘要；这不等于已更改线上扫描结果。

插件类型检查、6 项 Git 包回归、16 项契约/启动/端点回归和共同产物重新编译比较通过；手机全量 495 项 Node 回归通过。正常应用身份的本地测试 APK `0.1.0-preview.2`（versionCode 4）已构建并核对签名证书与原公开候选一致；两版 Android 功能实测使用前述独立测试 UID，不把正式包身份的构建核对描述成另一次运行验收。

本轮不是所有 R01–R16 扩展能力、所有第三方插件、Electron、物理手机或公网性能的全量重验；原完整 alpha.2 矩阵保留在[支持清单](./official-support.md)。本轮工具审批通过真实协议连接处理，Android 专项验证原生配对与核心聊天；不能把它说成在手机上重做了全部审批界面验收。

## 保留的失败与修正

- 首轮只装了 SDK 开发依赖，官方 CLI 缺少 `cordis-plugin-group` peer，在插件加载前退出。rc.2 / alpha.2 测试锁文件补齐官方声明的 peer，按正常 npm 安装，不改本体。
- 验证器曾给无正文的票据请求添加 JSON Content-Type、把标题当作列表顶层字段、误将撤销状态期望为 403。分别按真实 HTTP 和官方声明/生产存储契约修正，失败报告保留。
- 首次 write 已获 `allowed-once`，但测试提示词未先 read，官方返回 `FS_NOT_OBSERVED`。修正提示词为先 read、再请求 write；不绕过官方保护。修正后的两版真实允许与拒绝均通过。
- Windows Gradle 命令第一次未引用包含点号的 `-P` 参数而失败，引用后成功。以上测试驱动或环境失败不记作通过，也不据此修改 DSH。
- 首次云端 alpha.2 构建在启动回归中缺少开发依赖 `dsh-session`；干净本地安装复现。开发清单补齐 `dsh-session` 和其 `dsh-scope` peer，端点测试改为从固定官方 SDK 加载运行依赖，不依靠本机残留包。官方安装、生产 peer 范围与运行代码保持原样；后续云端结果以实际 Actions 为准。
