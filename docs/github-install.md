# 从 GitHub 安装与插件市场投稿

[返回首页](../README.md) · [配对与使用](./usage.md) · [构建与下载](./releases.md)

## 安装

当前仓库默认分支的插件版本为 `0.1.83-latest.0`，面向官方 DSH **`0.2.1-alpha.2`**。准备 Git、pnpm 和 Node.js 24；先确认电脑 DSH 版本，再运行：

```sh
dsh plugin --profile web add github:KKUCODES/dshm-plugin
dsh web
```

`dsh plugin` 是 DSH 官方的插件管理命令，不是市场提供的安装器。如果你通常在 DSH 源码目录运行 `pnpm dsh web`，对应命令为：

```sh
pnpm dsh plugin --profile web add github:KKUCODES/dshm-plugin
pnpm dsh web
```

如果 DSH 正在运行并提示下次启动加载，请重启原 DSH 进程。接下来在插件设置页连接中转、生成配对链接并批准手机，步骤见[使用指南](./usage.md)。

仓库已经包含 `lib/` 编译产物和标准 `dsh.bundle.patch` 声明。Git 安装不会运行 `prepare`、`install` 或 `postinstall`，不需要额外批准构建脚本，也不依赖用户电脑上的相邻后端目录。共享协议已经打包在运行代码中；`devDependencies` 的相邻协议引用只用于维护者开发，不参与此安装路径。

## 固定到已扫描的提交

无 `#` 的命令会取仓库当前默认分支。正式使用建议直接复制市场详情页生成的命令，其中 `#` 后是已扫描的完整提交号：

```text
dsh plugin --profile web add github:KKUCODES/dshm-plugin#<市场给出的完整提交号>
```

上面的占位符不是可直接运行的命令。完整提交号固定安装内容；检查该提交的 README 与 DSH 版本说明，不把之后的默认分支内容当作历史提交的兼容保证。

alpha.1 继续使用对应的 `.tgz` 归档，不能安装当前默认 GitHub 包。DSH 版本不匹配时不要绕过官方兼容检查；升级或降级电脑 DSH、选择已验证包是不同决定，按[支持清单](../compatibility/latest-upstream/official-support.md)核对。

## 投稿

在 [DSH Plugin Market 投稿页](https://dsh-plugin.market/submit)填写：

```text
https://github.com/KKUCODES/dshm-plugin
```

市场是社区项目，只接收仓库地址，扫描默认分支的特定提交，并生成固定提交安装命令。默认分支中必须存在包声明、其引用的 Cordis 补丁和可运行入口。源码、编译产物与说明一起保留，方便市场静态检查与使用者审阅。

市场扫描结果不代替实际安装、手机功能或安全审查。市场当前示例的 DSH/Cordis 基线与本插件的 alpha.2 目标不同，可能显示版本不匹配或待核对；不会为了获得“兼容”标签而放宽未经验证的宿主版本。

本次适配不代用户提交投稿，是否收录和网站最终扫描结果由市场决定。

## 验证范围

`0.1.83-latest.0` 已通过独立本地 Git 仓库的官方 alpha.2 命令安装、74 个运行/声明文件摘要核对、正常 Web 启动、实际浏览器配置页加载、官方卸载及自有测试服务退出。不使用相邻后端目录、不添加构建许可、不修改 DSH 本体。详细证据见[Git 安装验证记录](../compatibility/latest-upstream/github-install.md)。

安装专项不代表新包已经完成全量 Remote 或 Android 兼容回归。此前核心 Remote 的本地通过组合仍为 alpha.2＋插件 `0.1.80-latest.0`＋原配套 Android；公网、真机、Electron 与其他版本另验。

## 维护者更新

`lib/` 是正式 GitHub 安装入口，`dist/` 是历史开发输出，两者不能替换使用。修改源码或宿主版本后，更新 `package.json` 与 `ci/release.json` 的版本、准备 alpha.2 SDK 和共享协议，再执行：

```sh
npm run build:github
npm run test:github
npm run build:github -- --check
```

提交源码与生成的 `lib/`。CI 重新编译并逐文件比较，源码与产物不同会失败；`.gitattributes` 固定 `lib/` 为 LF，避免 Windows Git 转换换行后破坏摘要。生成文件不得包含本机凭据、配对链接或用户会话。

真实安装验证使用官方 alpha.2 npm 安装目录，默认路径见脚本，也可通过 `DSHM_OFFICIAL_DSH_ROOT` 指向已有的官方安装。它创建自己的 profile 和临时 Git 仓库，不操作日常 profile：

```sh
npm run verify:github
```

远端安装时可在同一入口传入 `github:KKUCODES/dshm-plugin#<完整提交号>`；仅接受本仓库的完整 SHA。验证器只测试安装、加载与卸载，不注册电脑、不配对手机、不调用模型。
