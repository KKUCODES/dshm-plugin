# GitHub 安装专项

- 状态：本地独立 Git、远端 GitHub 固定提交安装与云端 CI 均已验证；市场投稿尚未执行。
- 维护角色：DSHM 插件维护者；最近核验：2026-10-14。
- 来源：[官方命令实现](https://github.com/deepseek-ai/deepseek-harness/blob/main/apps/cli/src/plugin.ts)、[市场快照读取](https://github.com/0326/dsh-plugin-market/blob/main/src/worker/github/repository.ts)、[构建脚本](../../scripts/build-github-package.mjs)、[验收脚本](../../scripts/verify-github-install.mjs)、[云端构建与比较](https://github.com/KKUCODES/dshm-plugin/actions/runs/38505653655)。维护者本地证据：[配置页报告](../../artifacts/github-install/run-p9uLW7/report.json)、[截图](../../artifacts/github-install/run-p9uLW7/plugin-settings.png)和[GitHub 实际安装报告](../../artifacts/github-install/run-JxL9lU/report.json)；本地产物不随公开仓库发布。

## 交付方式

`main` 保留源码，并提供已编译 `lib/index.js`、客户端入口及类型声明。包版本 `0.1.83-latest.0` 精确匹配官方 DSH `0.2.1-alpha.2`；Cordis `4.0.5-alpha.1` 与 Schemastery `3.18.5-alpha.1` 来自该版本 SDK，不放宽宿主约束来迎合市场基线。

市场从仓库默认分支读取 `package.json`、`dsh.bundle.patch` 与 `main` 等文件，安装固定到扫描提交。单独的非默认发布分支不能完成该投稿路径；当前采用预编译产物随源码提交，避免 Git 安装时的 `prepare` 构建、依赖脚本批准和相邻仓库获取。

开发依赖中的相邻共享协议引用保留用于本地维护。实际 Git 安装不执行构建生命周期、不安装这项开发依赖；运行代码已包含协议。该结论来自独立 Git 仓库缺少 backend 目录时的官方安装，不从 manifest 字面推导。

## 本地实际验收

验收器将真实 npm 包解压到独立 Git 仓库，附加与本仓库一致的换行规则，固定到测试提交。使用现有官方 alpha.2 npm CLI、全新 `DSH_HOME`，运行原 `dsh plugin --profile web add git+file:...#<commit>`。没有额外 `--ignore-scripts`、构建许可或官方兼容豁免。

- 官方安装成功，profile 自动选中插件。
- 74 个编译入口和声明摘要与发布产物逐项相同；协议类型随包提供，不引用私有开发包。
- 正常 `dsh web` 加载插件，原鉴权后 `/api/dsh-mobile` 返回 200、未配置状态且无插件错误；未注册、配对或调用模型。
- 内置浏览器实际进入官方插件列表与 DSHM 配置页，版本正确、远程连接表单与运行中组件显示正常，浏览器错误为空。
- 测试 Host 自有进程树退出；官方 `dsh plugin remove` 清除依赖与 bundle 选择。日常 DSH/profile 未操作。

首轮验收脚本漏计 npm 自动包含的英文 README；第二轮临时 Git 仓库遗漏 `.gitattributes`，Windows 自动 CRLF 导致声明摘要不同。两轮失败报告保持，修正测试仓库与实际仓库的一致性后完整通过；真实发布仓库用 `lib/** text eol=lf` 保持安装字节。

## 构建与回归

发布输入包含源码、包声明、Cordis 声明、固定 SDK 配置及版本信息。生成收据保存输入摘要和逐文件摘要，新增的五项测试覆盖缺少相邻后端、换行一致性、源码或编译入口变更、安装脚本、本地运行依赖、未列入清单的文件与私有协议类型引用误入。

CI 在 alpha.2 分支重新编译并逐文件比较已提交 `lib/`，同时保留 alpha.1/alpha.2 独立 `.tgz` 构建。没有构建或改写 DSH/SDK。

本地两版 `.tgz` 均已生成。alpha.1 SDK 的反馈 inspection 联合类型不含新版反馈事件名，原声明编译因此失败；插件内改为等价字符串集合判断后两版通过，六项现有反馈回归通过。没有改变反馈事件的触发条件或修改 DSH 本体。

## 远端与云端复核

使用官方原命令实际安装 `github:KKUCODES/dshm-plugin#a2c267902f4df1429057e7f26c6b3ce92ff13402`，成功下载该公开提交、选中插件并核对全部74个编译与声明文件。正常 Web 加载返回200，随后关闭自有 Host 并通过原命令卸载。没有改用本地仓库替代这条远端安装、代理假响应或放宽版本检查。

首次远端测试出现 pnpm 的 codeload 下载错误 `(23)`，保留失败报告；换用较短的自有缓存路径重试后完整通过。此结果证明这次远端安装成功，不把首次失败原因归结为已经证实的网络或长路径问题。

GitHub Actions 的两版构建成功，alpha.2 同时通过五项包回归及重新构建、逐文件比较。该云端运行没有创建 Release，现有发行草稿保持。

本次仅安装与加载专项，不计作 Android、Remote 全量、Electron、真机或公网通过。市场收录和最终扫描尚未执行；使用方仍须核对电脑 DSH 与扫描提交版本。
