# 从 GitHub 安装与插件市场投稿

[返回首页](../README.md) · [配对与使用](./usage.md) · [构建与下载](./releases.md)

## 安装

官方 DSH `0.2.2-rc.3` 是插件 `0.1.88-latest.0` 本次运行回归的目标。准备 Git、pnpm 和 Node.js 24，在电脑上执行以下命令，安装固定到发行提交的插件。

```sh
dsh plugin --profile web add github:KKUCODES/dshm-plugin#5fb3f8e56ff3f839875d07e3cf2601754eea01d4
dsh web
```

从 DSH 源码目录运行时，使用项目的 `pnpm dsh` 入口。

```sh
pnpm dsh plugin --profile web add github:KKUCODES/dshm-plugin#5fb3f8e56ff3f839875d07e3cf2601754eea01d4
pnpm dsh web
```

如果 DSH 正在运行并提示下次启动加载，请重启原 DSH 进程。接下来在插件设置页连接中转、生成配对链接并批准手机，步骤见[使用指南](./usage.md)。

仓库已经包含 `lib/` 编译产物和标准 `dsh.bundle.patch` 声明。Git 安装不会运行 `prepare`、`install` 或 `postinstall`，不需要额外批准构建脚本，也不依赖用户电脑上的相邻后端目录。共享协议已经打包在运行代码中；`devDependencies` 的相邻协议引用只用于维护者开发，不参与此安装路径。

## 固定到已扫描的提交

上面的命令固定到 `5fb3f8e56ff3f839875d07e3cf2601754eea01d4`，对应[公开发行标签](https://github.com/KKUCODES/dshm-plugin/releases/tag/v0.1.88-latest.0)。省略 `#提交号` 会安装默认分支当时的内容。使用市场提供的安装命令时，先核对其提交号、版本与电脑 DSH 是否匹配。

本版只对官方 DSH `0.2.2-rc.3` 做运行回归，旧版为尽力兼容。匹配旧版 DSH 的归档见[插件下载](./releases.md)，验证范围见[支持清单](../compatibility/latest-upstream/official-support.md)。

## 投稿

在 [DSH Plugin Market 投稿页](https://dsh-plugin.market/submit)填写：

```text
https://github.com/KKUCODES/dshm-plugin
```

市场是社区项目，只接收仓库地址，扫描默认分支的特定提交，并生成固定提交安装命令。默认分支中必须存在包声明、其引用的 Cordis 补丁和可运行入口。源码、编译产物与说明一起保留，方便市场静态检查与使用者审阅。

仓库已添加 `dsh-plugin` GitHub topic，供采用标签发现机制的社区市场收录；各站点按自己的周期同步。项目原创代码采用 [MIT 许可证](../LICENSE)，包声明为 `MIT`，GitHub 安装包与后续 CI 归档均携带 `LICENSE`。第三方内容仍遵循原有许可；已发布历史归档保持原文件与校验和，不覆盖重发。

市场读取 [package.json](../package.json) 中的 `peerDependencies` 范围来判断依赖能否匹配。运行回归的 DSH 版本单独记录在[发行配置](../ci/release.json)和[支持清单](../compatibility/latest-upstream/official-support.md)中。

本次适配不代用户提交投稿，是否收录和网站最终扫描结果由市场决定。

## 验证范围

`0.1.88-latest.0` 的 GitHub 安装载荷及发行归档已在官方 DSH `0.2.2-rc.3` 通过安装、Web 加载与卸载检查。[默认分支 CI](https://github.com/KKUCODES/dshm-plugin/actions/runs/44661018293) · [发行说明](../ci/release-notes/0.1.88-latest.0.md)

### 历史安装验证

`0.1.84-latest.0` 已在两版未修改的官方 DSH 中分别通过同一 Git 包的安装、74 个文件摘要、正常 Web 启动、真实设置页与卸载。实际生产中转、配对批准、真实模型、流式历史、模型同步、写入允许/拒绝及重连/撤权也已验证，详见[双版本记录](../compatibility/latest-upstream/market-baseline.md)。手机还需安装包含本次兼容更新的版本，公开 preview.1 不能连接 rc.2。

以下保留上一版 GitHub 安装专项的历史证据：

`0.1.83-latest.0` 已通过独立本地 Git 仓库的官方 alpha.2 命令安装、74 个运行/声明文件摘要核对、正常 Web 启动、实际浏览器配置页加载、官方卸载及自有测试服务退出。不使用相邻后端目录、不添加构建许可、不修改 DSH 本体。详细证据见[Git 安装验证记录](../compatibility/latest-upstream/github-install.md)。

公开 GitHub 提交 `a2c267902f4df1429057e7f26c6b3ce92ff13402` 另通过同一官方命令的实际远端下载、安装、加载与卸载；[云端 Actions](https://github.com/KKUCODES/dshm-plugin/actions/runs/38505653655)的两版打包与 alpha.2 产物一致性检查成功。

以上历史检查分别对应所列版本。各版本 Remote 和 Android 运行验收的范围见[支持清单](../compatibility/latest-upstream/official-support.md)。

## 维护者更新

GitHub 安装使用仓库中的 `lib/`。更新发行输入时，先按[构建说明](./releases.md)准备已编译的共享协议和 `ci/sdk/rc3` 锁定的官方 SDK，再执行以下命令。

```sh
npm run build:github
npm run test:github
npm run build:github -- --check
```

提交源码与生成的 `lib/`。CI 重新编译并逐文件比较，源码与产物不同会失败；`.gitattributes` 固定 `lib/` 为 LF，避免 Windows Git 转换换行后破坏摘要。生成文件不得包含本机凭据、配对链接或用户会话。

安装验证默认读取 `artifacts/ci/sdk/rc3` 中的官方 CLI，也可用 `DSHM_OFFICIAL_DSH_ROOT` 指向同版官方安装。验证器使用隔离的 profile 和临时 Git 仓库。

```sh
npm run verify:github
```

远端安装时可在同一入口传入 `github:KKUCODES/dshm-plugin#<完整提交号>`；仅接受本仓库的完整 SHA。验证器只测试安装、加载与卸载，不注册电脑、不配对手机、不调用模型。

可选 `DSHM_REMOTE_PROBE=1` 使用相邻后端已编译的真实网关与内存 PostgreSQL 测试引擎，补验配对、会话和撤权。设置 `DSHM_TEST_CREDENTIALS_FILE` 后仅从明确指定的专用测试凭据中取 DeepSeek Key，追加真实模型与审批；不复制旧电脑身份或设备凭据，不输出 Key。`DSHM_ANDROID_PROBE=1` 还需本轮独立 Android 测试包及指定 MuMu。该扩展入口的配置和边界见[双版本验证记录](../compatibility/latest-upstream/market-baseline.md)，不作为普通用户安装前置。
