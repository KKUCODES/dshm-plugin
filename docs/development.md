# 插件开发指南

本仓库维护可以安装到官方 DSH 的独立插件。手机界面在相邻的 DSHM 项目，中转服务与共享协议在相邻的后端项目。

不修改或重新打包 DSH 本体，不用专用启动器替换核心行为。官方插件接口无法提供的能力不纳入交付。

公开自动构建从[GitHub Actions 与下载说明](./releases.md)进入；下文保留原本地候选环境的构建方法。CI 自动准备固定后端协议与已发布 SDK，不需要本机验收材料。

## 目录与依赖

```text
src/                  Host 入口、会话适配、各项能力与 client/ 配置页
tests/                单元测试、回归和夹具
scripts/              候选构建、接口与交付审查
docs/                 使用指南、开发说明、知识库与首页图片
compatibility/        当前支持清单和历史兼容记录
artifacts/            本地产物与验收证据，不提交 Git
```

- Node.js 开发环境与依赖版本以 `package.json`、锁文件和候选构建脚本为准；当前候选构建目标为 Node 22。
- 共享协议通过 `file:../backend/packages/protocol` 开发依赖引用。先在后端构建协议，再构建插件；运行时协议代码打包进插件，不要求用户安装这个私有开发包。
- Cordis 与 DSH 包是宿主接口。当前新版候选使用单独准备的固定版本 SDK；不能混用旧版依赖或任意未来版本。
- `src/client/` 是电脑上的插件配置页，不是手机客户端。客户端聊天布局、原生能力和 Remote 页面属于 [DeepSeek Harness Mobile（DSHM）](https://github.com/KKUCODES/deepseek-harness-mobile)。

当前目录仍采用多仓库相邻布局，单独克隆本仓库不能一键生成当前候选。相邻项目和隔离 SDK 尚未收敛成独立公开构建流程。

## 先区分两套构建

| 入口 | 用途与边界 |
| --- | --- |
| 根目录 `package.json` | 插件版本 `0.1.75`，DSH `0.1.6-alpha.2` 旧版开发基线。普通 `build` / `pack:local` 不生成当前 alpha.2 候选。 |
| `scripts/build-official-plugin-only.mjs` | 当前官方 DSH `0.2.1-alpha.2` 的纯插件候选入口，生成 `0.1.80-latest.0`。依赖已准备的隔离 SDK，使用固定产物目录。 |
| `scripts/build-official-gateway-settings.mjs` | 地址修改候选 `0.1.81-latest.0`。默认针对官方 `0.2.1-alpha.2`，传入 `--alpha1` 针对 `0.2.1-alpha.1`；两个归档的宿主版本精确固定，不能混装。 |

新版候选生成时，从同一份隔离源码生成声明和运行入口，并核对宿主接口的精确版本。当前固定脚本还有只允许首次创建的审查报告，不能当作可反复覆盖的日常构建命令；新迭代应分配新的候选版本、独立输出和证据，再进行安装验证。

脚本只构建我们自己的插件，不构建 DSH、SDK 或 Android。当前源码未变化时，无需为了文档、截图或联调重新打包。

相关入口：

- [纯插件候选构建](../scripts/build-official-plugin-only.mjs)
- [地址修改候选构建](../scripts/build-official-gateway-settings.mjs)及[验证范围](../compatibility/latest-upstream/gateway-settings.md)
- [隔离候选生成逻辑](../scripts/build-latest-candidate.mjs)
- [源码与接口审查](../compatibility/latest-upstream/official-interface-audit.md)
- [当前交付审查](../compatibility/latest-upstream/official-delivery-audit.md)

## 旧版基线的安装与回归

以下命令用于根目录旧版开发基线，不代表新版候选或 Android 已通过验收。

先在相邻 `backend/` 中执行：

```powershell
npm ci --ignore-scripts
npm run build
```

再从本插件目录执行：

```powershell
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test
```

需要旧版归档时，确保 `artifacts/` 目录存在后执行：

```powershell
npm run pack:local
```

默认包清单主要包含运行产物、入口声明、插件补丁声明与 README；`cordis.patch.yml` 是官方插件装配声明，不是修改 DSH 本体的兼容补丁。新版候选的实际包清单以生成的 manifest 和交付审查为准。

## 验证原则

修改插件后，按实际影响运行类型检查和相关回归。涉及连接、会话、模型或审批时，还需在未修改的官方 DSH 中安装插件，使用手机的实际入口验证；单元测试通过不等于 Android 或第三方插件兼容。

`audit:official` 与 `audit:interfaces` 用于当前交付和接口审查，依赖本机候选及验收环境，不是独立克隆即可运行的通用检查。历史脚本可能包含旧版补丁或环境恢复流程，只作为当时的证据，不沿用为当前交付方式。

当前已验证、已取消和仍待验证的能力见[支持清单](../compatibility/latest-upstream/official-support.md)，专项资料从[知识库](./project-knowledge/catalog.md)进入。

## Git 仓库边界

本目录是独立 Git 仓库，手机端、后端和上游参考不包含在这个仓库内。源码与可复用文档纳入版本管理，`node_modules/`、`dist/`、`artifacts/`、环境配置及 `.tgz` 产物由 `.gitignore` 排除。

不要把真实 Key、电脑凭据、配对链接、个人会话或本机验收产物提交到公开仓库。首页插画和软件截图的来源记录在[图片说明](./images/README.md)中。

[返回首页](../README.md)
