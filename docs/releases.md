# 插件下载与 GitHub Actions

[返回首页](../README.md) · [使用指南](./usage.md)

## 下载插件

官方 DSH `0.2.0-rc.2` / `0.2.1-alpha.2` / `0.2.1-rc.2` 可共用 GitHub 默认安装包，运行 `dsh plugin --profile web add github:KKUCODES/dshm-plugin`，无需下载归档或在用户电脑上编译。[GitHub 安装与固定提交](./github-install.md)说明当前版本、源码启动前缀和市场投稿方式。

从 [0.1.87 Release](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.87-latest.0) 下载与电脑 DSH 版本一致的 `.tgz`，无需登录 GitHub。首页提供四版[直接下载链接](../README.md#安装插件并配对手机)。本次兼容修复配套使用 [DSHM 0.1.0-preview.7](https://github.com/KKUCODES/deepseek-harness-mobile/releases/tag/v0.1.0-preview.7)，自建中转也需升级到包含协议提交 `94183d0` 的版本，大响应能力需要三端配套。

开发构建也可从 [Build plugin packages](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) 的成功构建中下载 Artifacts；此入口需要登录 GitHub，产物保留 30 天。

每轮分别生成官方 DSH `0.2.0-rc.2`、`0.2.1-alpha.1`、`0.2.1-alpha.2` 和 `0.2.1-rc.2` 的 `.tgz`、SHA-256 与兼容元数据；alpha.1 保留独立 peer，其余采用兼容范围；仍按对应版本选择归档。构建通过不代表所有手机、模型和插件已兼容。

工作流创建未发布草稿，维护者检查后再公开发布；草稿不对普通用户开放。历史 `0.1.84-latest.0` 的三个插件包、校验文件与兼容信息保持，不覆盖旧附件。

## 运行与发版

- 普通 `main` 提交与 PR 自动打包，不创建 Release。
- GitHub 默认安装从 `main` 的 `lib/` 读取预编译产物；源码或发布输入变化后运行 `npm run build:github` 并一起提交。alpha.2 构建作业会重新编译、逐文件比较，拒绝源码与安装产物不一致。
- Actions → Build plugin packages → Run workflow 手动打包；勾选 `release_draft` 时创建预发布草稿。
- 发版前同步 [ci/release.json](../ci/release.json)、包清单与锁文件的版本，并提供 `ci/release-notes/<版本>.md`。工作流按该提交读取发行说明；先推送主分支，再推送对应 `v<version>` 标签，标签必须与配置一致。
- 已公开的 Release 不覆盖；同一提交的草稿可以重跑更新。下一次版本使用新版本号。

## 构建来源

GitHub 托管的 Ubuntu 24.04 + Node.js 24。后端协议从固定提交取得并只构建协议，四个官方 SDK 由本仓库的锁文件安装；使用 `npm ci --ignore-scripts`，不构建或修改 DSH 本体和 SDK。0.2.0-rc.2、alpha.2 和 0.2.1-rc.2 的锁文件包含官方 CLI 声明的 peer，供实际 Web 启动验证使用；alpha.1 保持历史类型构建环境。

本地已有环境与历史候选入口保持。CI 入口为 `npm run prepare:ci` 和 `npm run build:ci`，分别准备隔离 SDK 和生成归档；工作流还会先准备相邻 `backend/`。归档位于被忽略的 `artifacts/ci/`，SDK 配置与锁文件位于 `ci/sdk/`。`npm run build:github` 单独生成需提交的 `lib/`，不覆盖历史 `dist/` 开发输出。

维护来源：[工作流](../.github/workflows/plugin-build.yml)、[SDK 准备](../scripts/prepare-ci.mjs)、[打包入口](../scripts/build-ci-package.mjs)。

## 已核验范围

2026-10-23 的[Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/39971220661)完成0.1.87四版构建、81文件GitHub载荷可重复检查，以及三版原官方DSH安装/Web启动/卸载；源码固定 `d4a47cbe709b5dd961a97edfaa8a7affd9d0870d`，协议固定 `94183d08ccbb8752d14c819608d79fe3870a9a60`。复用成功产物公开[Release](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.87-latest.0)，没有二次打包。12个附件均已匿名下载并核对SHA-256、GitHub摘要、对应peer、许可证与安装入口；无旧插件适配分支扩展声明。配套App preview.7；公共中转升级尚待登录信息，大响应能力仍需三端同步升级。证据在本机手机项目忽略目录 `artifacts/chunks-release/plugin/public-verification.json`；本轮发行核验不代替[分块功能验证](../compatibility/latest-upstream/response-chunks.md)或任意真机/第三方插件验收。

2026-10-23 的[Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/39936382707)完成0.1.86四版构建、79文件GitHub载荷可重复检查及三版原官方DSH安装/Web启动/卸载，源码固定 `b6cb1ea2edb9ad0f9f8a6f05e85cf65171a9bf4c`。复用该次成功资产创建并公开[Release](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.86-latest.0)，没有再次打包。12个附件均已匿名GET200并核对SHA-256和GitHub资产摘要；四份归档各68文件，插件版本、MIT许可证、对应peer和入口均匹配，无旧插件适配分支的扩展声明。首轮rc.2因CI锁文件平台包嵌套失败，纠正位置后真实启动通过；[原因与边界](../compatibility/latest-upstream/dsh-rc21-compatibility.md)。配套App preview.6，中转无需升级。本机证据在手机项目忽略目录 `artifacts/release-tools/plugin/public-verification.json`；不扩大为全功能或真机验收。

2026-10-15 的[版本发布 Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/38718058015)完成 `0.1.85-latest.0` 三版构建、GitHub 预编译载荷一致性以及 rc.2 / alpha.2 官方安装、Web 启动与卸载检查。固定源码为 `80c1fa30056582dfd4b90280ea0fb01b3c0761e8`，共享协议为 `056bf6f19527c58f456ee5f7eec55e715f401ab5`。草稿已公开发布；九个附件均匿名下载并核对 GitHub 资产摘要及校验文件。三份归档各有 66 个文件，版本、MIT 许可证和对应 DSH 依赖均匹配，没有修改 DSH 或构建 SDK。新缓存运行范围见[专项记录](../compatibility/latest-upstream/remote-cache.md)，不以打包通过代替真机或公网验收。

`0.1.84-latest.0` 的三版归档、共同 Git 包两套 SDK 编译、官方安装/Web/卸载和真实核心协议通过本地验证。[双版本记录](../compatibility/latest-upstream/market-baseline.md)。[版本发布 Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/38529805413)三版构建、产物一致性与 rc.2 / alpha.2 实际安装启动检查通过；公开发行的九个附件均已匿名 GET 200 并核对 SHA-256。

2026-10-13 的[实际云端构建](https://github.com/KKUCODES/dshm-plugin/actions/runs/38369260384)已生成两个 `0.1.82-latest.0` 归档。下载后核对各自 DSH 依赖版本、63 个归档文件与 SHA-256。此记录只证明干净环境可打包，不代表该新包已安装或完成全部 Remote 功能复验。
