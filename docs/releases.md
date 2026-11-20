# 插件下载与 GitHub Actions

[返回首页](../README.md) · [使用指南](./usage.md)

## 下载插件

[DSHM 插件 0.1.88-latest.0](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.88-latest.0) 是公开预发布版，本次运行验收覆盖官方 DSH **`0.2.2-rc.3`**。可按[固定提交安装](./github-install.md)，也可直接下载下列发行附件。

| 附件 | 用途 |
| --- | --- |
| [插件包（.tgz）](https://github.com/KKUCODES/dshm-plugin/releases/download/v0.1.88-latest.0/dshm-plugin-0.1.88-latest.0-dsh-0.2.2-rc.3.tgz) | 下载后按[使用指南](./usage.md)用绝对路径安装。 |
| [SHA-256 校验文件](https://github.com/KKUCODES/dshm-plugin/releases/download/v0.1.88-latest.0/dshm-plugin-0.1.88-latest.0-dsh-0.2.2-rc.3.tgz.sha256) | 安装前核对下载文件的摘要。 |
| [兼容清单（JSON）](https://github.com/KKUCODES/dshm-plugin/releases/download/v0.1.88-latest.0/compatibility-0.2.2-rc.3.json) | 核对插件版本和 DSH 目标版本。 |

手机端可使用 [DSHM preview.22](https://github.com/KKUCODES/deepseek-harness-mobile/releases/tag/v0.1.0-preview.22)。旧版 DSH `0.2.0-rc.2`、`0.2.1-alpha.1`、`0.2.1-alpha.2` 和 `0.2.1-rc.2` 的独立归档见[历史发行 0.1.87](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.87-latest.0)，按文件名中的完整宿主版本选择。

开发构建也可从 [Build plugin packages](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) 的成功构建中下载 Artifacts；此入口需要登录 GitHub，产物保留 30 天。

本版 CI 仅构建 `0.2.2-rc.3` 的归档。工作流可以创建预发布草稿，维护者核对后公开。

## 运行与发版

- 发往 `main` 的 PR 触发构建。在 `main` 上推送源码或工作流列出的发行输入时触发构建，仅修改文档的推送会跳过。
- GitHub 安装使用已提交的 `lib/`。CI 按固定 SDK 重新构建比对，并通过官方安装器分别验证 Git 载荷和 `.tgz` 归档。
- Actions → Build plugin packages → Run workflow 手动打包；勾选 `release_draft` 时创建预发布草稿。
- 发版前同步 [ci/release.json](../ci/release.json)、包清单、锁文件和 `ci/release-notes/<版本>.md`，将对应的 `v<version>` 标签指向发行提交。
- 已公开的 Release 不覆盖；同一提交的草稿可以重跑更新。下一次版本使用新版本号。

## 构建来源

GitHub 托管环境为 Ubuntu 24.04 和 Node.js 24。工作流从[发行配置](../ci/release.json)读取后端提交，构建共享协议，然后按 [rc.3 SDK 锁文件](../ci/sdk/rc3/package-lock.json)安装官方依赖。

本地已有环境与历史候选入口保持。CI 入口为 `npm run prepare:ci` 和 `npm run build:ci`，分别准备隔离 SDK 和生成归档；工作流还会先准备相邻 `backend/`。归档位于被忽略的 `artifacts/ci/`，SDK 配置与锁文件位于 `ci/sdk/`。`npm run build:github` 单独生成需提交的 `lib/`，不覆盖历史 `dist/` 开发输出。

维护来源：[工作流](../.github/workflows/plugin-build.yml)、[SDK 准备](../scripts/prepare-ci.mjs)、[打包入口](../scripts/build-ci-package.mjs)。

## 已核验范围

`0.1.88-latest.0` 对应提交 `5fb3f8e56ff3f839875d07e3cf2601754eea01d4`。公开归档的 SHA-256 为 `d7144a7a45fc26a21c1ec79804972938ec1f4843048651f62855481493cab309`。已核对发行校验文件，并在官方 DSH `0.2.2-rc.3` 安装公开归档、加载 Web 插件和卸载。[构建与安装检查](https://github.com/KKUCODES/dshm-plugin/actions/runs/44661018293) · [运行兼容范围](../compatibility/latest-upstream/official-support.md)

### 历史发行验证

2026-10-23 的[Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/39971220661)完成0.1.87四版构建、81文件GitHub载荷可重复检查，以及三版原官方DSH安装/Web启动/卸载；源码固定 `d4a47cbe709b5dd961a97edfaa8a7affd9d0870d`，协议固定 `94183d08ccbb8752d14c819608d79fe3870a9a60`。复用成功产物公开[Release](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.87-latest.0)，没有二次打包。12个附件均已匿名下载并核对SHA-256、GitHub摘要、对应peer、许可证与安装入口；无旧插件适配分支扩展声明。配套App preview.7；公共中转后续已升级并完成2.60MB分块、重连及旧端通信核验，见[公网升级记录](https://github.com/KKUCODES/dshm-relay/blob/main/deploy/public-server.md)，自建中转也需同步升级。证据在本机手机项目忽略目录 `artifacts/chunks-release/plugin/public-verification.json`；本轮发行与合成公网传输核验不代替[分块功能验证](../compatibility/latest-upstream/response-chunks.md)或任意真机/第三方插件验收。

2026-10-23 的[Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/39936382707)完成0.1.86四版构建、79文件GitHub载荷可重复检查及三版原官方DSH安装/Web启动/卸载，源码固定 `b6cb1ea2edb9ad0f9f8a6f05e85cf65171a9bf4c`。复用该次成功资产创建并公开[Release](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.86-latest.0)，没有再次打包。12个附件均已匿名GET200并核对SHA-256和GitHub资产摘要；四份归档各68文件，插件版本、MIT许可证、对应peer和入口均匹配，无旧插件适配分支的扩展声明。首轮rc.2因CI锁文件平台包嵌套失败，纠正位置后真实启动通过；[原因与边界](../compatibility/latest-upstream/dsh-rc21-compatibility.md)。配套App preview.6，中转无需升级。本机证据在手机项目忽略目录 `artifacts/release-tools/plugin/public-verification.json`；不扩大为全功能或真机验收。

2026-10-15 的[版本发布 Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/38718058015)完成 `0.1.85-latest.0` 三版构建、GitHub 预编译载荷一致性以及 rc.2 / alpha.2 官方安装、Web 启动与卸载检查。固定源码为 `80c1fa30056582dfd4b90280ea0fb01b3c0761e8`，共享协议为 `056bf6f19527c58f456ee5f7eec55e715f401ab5`。草稿已公开发布；九个附件均匿名下载并核对 GitHub 资产摘要及校验文件。三份归档各有 66 个文件，版本、MIT 许可证和对应 DSH 依赖均匹配，没有修改 DSH 或构建 SDK。新缓存运行范围见[专项记录](../compatibility/latest-upstream/remote-cache.md)，不以打包通过代替真机或公网验收。

`0.1.84-latest.0` 的三版归档、共同 Git 包两套 SDK 编译、官方安装/Web/卸载和真实核心协议通过本地验证。[双版本记录](../compatibility/latest-upstream/market-baseline.md)。[版本发布 Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/38529805413)三版构建、产物一致性与 rc.2 / alpha.2 实际安装启动检查通过；公开发行的九个附件均已匿名 GET 200 并核对 SHA-256。

2026-10-13 的[实际云端构建](https://github.com/KKUCODES/dshm-plugin/actions/runs/38369260384)已生成两个 `0.1.82-latest.0` 归档。下载后核对各自 DSH 依赖版本、63 个归档文件与 SHA-256。此记录只证明干净环境可打包，不代表该新包已安装或完成全部 Remote 功能复验。
