# 插件下载与 GitHub Actions

[返回首页](../README.md) · [使用指南](./usage.md)

## 下载插件

官方 DSH `0.2.1-alpha.2` 可直接运行 `dsh plugin --profile web add github:KKUCODES/dshm-plugin`，无需下载归档或在用户电脑上编译。[GitHub 安装与固定提交](./github-install.md)说明当前版本、源码启动前缀和市场投稿方式。

打开 [Build plugin packages](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml)，选择成功的构建，在 Artifacts 下载与电脑 DSH 版本一致的包。Actions 产物下载需要登录 GitHub，保留 30 天。

每轮分别生成官方 DSH `0.2.1-alpha.1` 和 `0.2.1-alpha.2` 的 `.tgz`、SHA-256 与兼容元数据；不能混装。构建通过证明能生成安装包，不代表所有手机、模型和插件已兼容。

公开发行包从 [Releases](https://github.com/KKUCODES/dshm-plugin/releases) 下载。工作流只创建未发布草稿，维护者检查后再发布；草稿不对普通用户开放。

## 运行与发版

- 普通 `main` 提交与 PR 自动打包，不创建 Release。
- GitHub 默认安装从 `main` 的 `lib/` 读取预编译产物；源码或发布输入变化后运行 `npm run build:github` 并一起提交。alpha.2 构建作业会重新编译、逐文件比较，拒绝源码与安装产物不一致。
- Actions → Build plugin packages → Run workflow 手动打包；勾选 `release_draft` 时创建预发布草稿。
- 发版前修改 [ci/release.json](../ci/release.json) 的版本，再推送对应 `v<version>` 标签。标签必须与配置一致。
- 已公开的 Release 不覆盖；同一提交的草稿可以重跑更新。下一次版本使用新版本号。

## 构建来源

GitHub 托管的 Ubuntu 24.04 + Node.js 24。后端协议从固定提交取得并只构建协议，两个官方 SDK 由本仓库的锁文件安装；使用 `npm ci --ignore-scripts`，不构建或修改 DSH 本体和 SDK。

本地已有环境与历史候选入口保持。CI 入口为 `npm run prepare:ci` 和 `npm run build:ci`，分别准备隔离 SDK 和生成归档；工作流还会先准备相邻 `backend/`。归档位于被忽略的 `artifacts/ci/`，SDK 配置与锁文件位于 `ci/sdk/`。`npm run build:github` 单独生成需提交的 `lib/`，不覆盖历史 `dist/` 开发输出。

维护来源：[工作流](../.github/workflows/plugin-build.yml)、[SDK 准备](../scripts/prepare-ci.mjs)、[打包入口](../scripts/build-ci-package.mjs)。

## 已核验范围

2026-10-13 的[实际云端构建](https://github.com/KKUCODES/dshm-plugin/actions/runs/38369260384)已生成两个 `0.1.82-latest.0` 归档。下载后核对各自 DSH 依赖版本、63 个归档文件与 SHA-256。此记录只证明干净环境可打包，不代表该新包已安装或完成全部 Remote 功能复验。
