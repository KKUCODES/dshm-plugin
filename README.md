# DSHM 插件 · DeepSeek Harness 远程连接

简体中文 | [English](./README.en.md)

[DSHM 安卓客户端](https://github.com/KKUCODES/deepseek-harness-mobile) · **DSHM 电脑插件** · [DSHM 中转服务](https://github.com/KKUCODES/dshm-relay)

**DSHM 插件**安装在电脑的官方 [DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness) 中，将工作区、聊天会话、执行结果和审批同步到 [DSHM 安卓客户端](https://github.com/KKUCODES/deepseek-harness-mobile)。手机远程续聊与决策，电脑执行任务；无需修改或重建 DSH。

[GitHub 一条命令安装](#安装插件并配对手机) · [下载插件包（需登录 GitHub）](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) · [DSH 兼容清单](./compatibility/latest-upstream/official-support.md) · [常见问题](#常见问题)

<p align="center">
  <img src="./docs/images/logo.png" width="128" height="128" alt="DSHM Logo：DeepSeek 鲸鱼与手机、电脑双向连接">
</p>

![DSHM 插件：把电脑上的工作，连接到手机。](./docs/images/hero.png)

## 远程会话与设备管理功能

| 能力 | 内容 |
| --- | --- |
| 会话同步 | 查看工作区与历史、创建聊天、发送消息、切换模型、处理审批。 |
| 设备管理 | 五分钟有效的一次性配对链接；核对指纹、批准、拒绝与撤销。 |
| 访问控制 | 开关远程连接；电脑管理权限另行授予或收回。 |
| 扩展 | 通过允许的接口转发文件、工具结果与兼容插件局部界面。 |

![DeepSeek Harness 中的 DSHM 插件设置：电脑已连接，手机配对等待批准。](./docs/images/desktop-pairing.png)

[图片来源](./docs/images/README.md)。真实插件页面，使用演示设备。

## 安装插件并配对手机

[插件构建与下载](./docs/releases.md) · [GitHub Actions](https://github.com/KKUCODES/dshm-plugin/actions/workflows/plugin-build.yml) · [发行版本](https://github.com/KKUCODES/dshm-plugin/releases)

**官方 DSH `0.2.0-rc.2` / `0.2.1-alpha.2` 共用同一 GitHub 安装包：**

```sh
dsh plugin --profile web add github:KKUCODES/dshm-plugin
```

`dsh plugin` 是 DSH 官方命令。若你从 DSH 源码目录启动，使用 `pnpm dsh plugin --profile web add github:KKUCODES/dshm-plugin`。仓库包含预编译产物，安装时不需要编译器、相邻后端目录或额外构建许可；正式使用建议复制市场提供的 `#完整提交号` 命令，固定到已扫描版本。[GitHub 安装与版本说明](./docs/github-install.md)

仓库默认安装包 `0.1.84-latest.0` 支持上述两个明确版本。alpha.1 仍需使用对应的 `.tgz`，不能使用默认命令。Actions 按 [CI 版本配置](./ci/release.json)分别生成三个版本的归档；下载 Artifacts 需要登录 GitHub。Release 仍为未发布草稿。

rc.2 还需要包含本次兼容更新的 DSHM 手机端；已公开的 `0.1.0-preview.1` APK 仍只连接 alpha.2。[双版本验证与手机要求](./compatibility/latest-upstream/market-baseline.md) · [完整配对步骤](./docs/usage.md)

1. 安装匹配 DSH 版本的插件，运行 `pnpm dsh web`；提示下次启动加载时，重启 DSH。
2. 填写中转根地址、电脑名称，注册电脑并开启连接。
3. 手机领取配对链接，电脑核对指纹并批准。
4. 手机打开已有工作区，继续会话或创建新聊天。

**推荐[自建中转](https://github.com/KKUCODES/dshm-relay)**；也可填[公共服务](http://118.31.20.47:18787) `http://118.31.20.47:18787`。开放注册免密，设备仍需配对与批准，无需用户账号。

公共服务使用 HTTP，传输未加密。敏感内容建议自建 HTTPS。电脑和 DSH 必须保持运行。[完整安装步骤](./docs/usage.md)

## 更换中转服务地址

点击插件设置页 **“修改服务地址”**：

- **同一后端换地址：** 换域名、端口或 HTTPS，验证后保留电脑身份和授权。
- **更换后端：** 重新注册和配对；个人模式需新密钥，旧服务授权不会自动撤销。

![DSHM 电脑插件：修改中转服务地址并选择保留设备授权或重新配对。](./docs/images/change-server.png)

取消或验证失败保留原连接，保存成功保留启停状态。手机需新链接重新配对。[详细步骤](./docs/usage.md#5-修改服务地址)

## 当前状态

| 范围 | 版本与已验内容 |
| --- | --- |
| GitHub 安装 | `0.1.84-latest.0`，同一份预编译产物支持官方 DSH `0.2.0-rc.2` / `0.2.1-alpha.2`；两版均已通过实际官方安装、设置页与卸载。[双版本记录](./compatibility/latest-upstream/market-baseline.md) |
| Actions 下载构建 | rc.2、alpha.1、alpha.2 分别生成精确匹配的归档；已通过本地打包，下载时不能混用。[构建说明](./docs/releases.md) |
| 修改服务地址 | `0.1.81-latest.0` 的[独立设置页验证](./compatibility/latest-upstream/gateway-settings.md)，不代表完整 Remote 重验。 |
| 核心 Remote | 官方 DSH `0.2.1-alpha.2`＋插件 `0.1.80-latest.0`＋原配套 Android，在 Web + MuMu 完成本地验收。[支持清单](./compatibility/latest-upstream/official-support.md) |

插件尚未公开发布 Release。GitHub 安装与构建通过不等于已完成新包的全量手机兼容验收；Electron、真机、完整公网及其他版本、插件、模型需另验。

手机不创建电脑工作区、不输入命令、不转发电脑 localhost 网站。

## 常见问题

### 应该选择哪个 DSH 版本的插件包？

先查看电脑的 DSH 版本。GitHub 默认安装支持 `0.2.0-rc.2` 和 `0.2.1-alpha.2`；下载 `.tgz` 时，包名中的 `dsh-<版本>` 必须对应电脑版本，例如 `dshm-plugin-0.1.84-latest.0-dsh-0.2.0-rc.2.tgz`。alpha.1 使用自己的归档。升级 DSH 后重新核对[兼容清单](./compatibility/latest-upstream/official-support.md)，不要把未验版本默认视为兼容。

### 配对链接发给手机后就能访问电脑吗？

还需要电脑核对手机的公钥指纹并批准。链接五分钟内有效，领取后失效；已批准设备可以在电脑插件页撤销，电脑管理权限另行授予。

### 手机续聊必须获得电脑管理权限吗？

不需要。批准设备后即可使用聊天与任务操作；管理电脑工作区、插件和设置需要另行授予管理权限，也可以单独收回。操作入口见[管理访问](./docs/usage.md#4-管理访问)。

## 开发与文档

TypeScript + Cordis，React 配置页。GitHub Actions 自动准备固定后端协议与已发布 SDK，分别打包三个 DSH 版本，并核对提交的 GitHub 安装产物与源码一致。`lib/` 是安装入口，`dist/` 仅作旧开发输出，见[自动构建说明](./docs/releases.md)与开发指南。

```text
src/              电脑插件、会话适配与配置页
lib/              已编译 GitHub 安装入口，随源码提交并由 CI 复核
scripts/          构建与审查脚本
tests/            插件测试与夹具
docs/             使用、开发和技术文档
compatibility/    版本支持与兼容验证资料
```

- [安装与使用](./docs/usage.md)：连接、批准与撤销。
- [开发指南](./docs/development.md)：依赖、构建与版本。
- [下载与发版](./docs/releases.md)：Actions 插件包与发行草稿。
- [GitHub 安装与市场投稿](./docs/github-install.md)：官方命令、固定提交及版本要求。
- [支持清单](./compatibility/latest-upstream/official-support.md)：已验与未验范围。
- [知识库](./docs/project-knowledge/catalog.md)：架构、接口与验证资料。
