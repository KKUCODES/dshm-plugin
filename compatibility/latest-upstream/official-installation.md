# 纯插件候选的本地安装与使用

- 状态：供当前本地兼容验收使用，候选未发布；不表示全部扩展已兼容。
- 维护角色：DSHM 插件维护者；最近核验：2026-10-10。
- 来源：[交付审查](./official-delivery-audit.md)、[本轮归档复核](../../artifacts/official-plugin-only/delivery-audit-c22f43ba-2bec-4893-a492-89b54dc10a19.json)、[功能矩阵](./official-feature-matrix.md)、[当前构建凭据](../../../dsh-mobile/artifacts/official-alpha2-android-build/official-app.json)、[官方安装目录声明](../../artifacts/official-dsh-alpha2/package.json)、[后端配置](../../../backend/.env.example)、[电脑配对页](../../src/client/index.tsx)。

## 准备哪些软件

新增设置页地址修改使用插件 `0.1.81-latest.0`，对应版本的归档入口见[地址修改记录](./gateway-settings.md)，日常操作见[使用指南](../../docs/usage.md)。下文保留此前 `0.1.80-latest.0` 完整 Remote 的固定组合和安装证据。

电脑使用官方 DSH；安装我们的 DSHM 插件；手机安装 DSHM；手机和电脑连接同一个中转服务。电脑正常运行 `pnpm dsh web`，无需修改本体或安装 DSHM 专用启动器。普通聊天用手机自己保存的 DeepSeek Key，Remote 的任务和模型请求由电脑 DSH 执行。

| 部分 | 当前固定候选 |
| --- | --- |
| 官方 DSH | `0.2.1-alpha.2`；这是预发布版本。当前手机包与电脑版本必须完全一致，不能直接换成任意更新版本。 |
| 电脑插件 | [`dsh-mobile-plugin-0.1.80-latest.0.tgz`](../../artifacts/official-alpha2-sdk/candidate-package-check-Alpha2PublicOnly02/dsh-mobile-plugin-0.1.80-latest.0.tgz)，234144字节；SHA256 `781f92efff24ef4343f388e89615cd96ad3f5032d4510a01d6f5c91f6a382ed7`。 |
| Android App | [当前 APK](../../../dsh-mobile/artifacts/official-alpha2-android-build/outputs/apk/debug/app-debug.apk)，13360612字节；SHA256 `41a15686de80c4c431f3b50e551d40a4de3345d1ae0afe399a1a0135ec85e773`。独立测试包名 `dev.dshmobile.validation.officialtest`，与原 App 并存。 |
| 中转后端 | 本项目 `backend/packages/gateway` 和配套共享协议。兼容验收复用生产连接、鉴权和转发实现，本地运行；公网部署、带宽与官方 Electron 不在当前通过结论内。 |

插件归档不包含 DSH、本体补丁或凭据。[实际归档安装](../../artifacts/official-plugin-only/archive-install-61435351-e4be-4e0f-9e2e-b62ee2517789.json)已通过官方命令将 `.tgz` 安装到独立 profile，63 个文件与归档逐项相同，正常 `pnpm dsh web` 重启后插件加载成功，配置保持。[安装后审查](../../artifacts/official-plugin-only/delivery-audit-1f1bd91c-9c5c-4e70-a956-f4d5b3f961e0.json)进一步核对源码对应关系；这项安装结果与手机功能结果分别记录。

## 启动中转

如果已经有可用中转地址，直接使用该地址。本机后端从 `backend` 目录启动已有产物：

```powershell
node --env-file=.env.local packages/gateway/dist/main.js
```

`.env.local` 需配置 `DATABASE_URL`、`PUBLIC_ORIGIN`、监听 `HOST` 和 `PORT`，具体字段见[配置样例](../../../backend/.env.example)。数据库使用 PostgreSQL，服务启动后 `/health` 检查数据库连接。

- `REGISTRATION_MODE=open`：电脑首次注册无需注册密钥。
- `REGISTRATION_MODE=private`：电脑首次注册需要与后端 `ENROLLMENT_TOKEN` 匹配的注册密钥。

这两个选项只决定是否允许电脑注册；手机仍需一次性配对并由电脑批准。HTTP 可以连接，界面和后端会提示连接未加密；支持 HTTPS。`PUBLIC_ORIGIN` 填手机、电脑都能访问的服务根地址，不含路径、查询参数或片段。物理手机上的 `127.0.0.1` 指向手机自身；MuMu 验收的 ADB 映射只是本机测试配置。

## 安装电脑插件

在当前官方 DSH 的项目目录，通过它原有的插件入口安装候选。官方 `dsh plugin --help` 确认命令把 `add` 等参数交给所选 profile 的 pnpm；安装到实际使用的 Web profile：

```powershell
pnpm dsh plugin --profile web add 'Q:\Tanxian\LToys\dsh-mobile\plugin\artifacts\official-alpha2-sdk\candidate-package-check-Alpha2PublicOnly02\dsh-mobile-plugin-0.1.80-latest.0.tgz'
pnpm dsh web
```

其他电脑需将归档路径换成自己的实际下载路径。如果 DSH 已运行且安装结果提示下次启动加载，先结束这个 DSH 进程，再按原命令 `pnpm dsh web` 启动，用新输出的登录链接打开页面。无需为插件重新构建 DSH。

在插件页打开 DSH Mobile，填写中转根地址和电脑名称，等待检测注册模式，再点击“注册这台电脑”。个人使用模式可在页面输入首次注册密钥；注册成功后会保存电脑自己的凭据。随后开启远程连接，状态应变为已连接。首次注册密钥不是手机普通聊天的 DeepSeek Key。

## 连接手机

1. 打开 DSHM 的 Remote，在电脑插件页点击“生成一次性配对链接”。当前电脑插件页提供链接。
2. 手机粘贴完整链接，再点击“继续配对”。如果已有该链接对应的二维码，也可使用扫描或“从图片识别”；识别只回填地址，不会自动批准设备。
3. 在电脑插件页核对手机公钥指纹并批准；手机点击“我已在电脑批准”。
4. 打开已有工作区的会话，或在该工作区创建新会话。手机和电脑共同参与同一个会话，手机发送、选模和处理审批会影响同一份电脑会话。

配对链接有效期为五分钟，领取一次即失效。注册模式为开放使用也不会跳过设备批准；管理电脑插件、工作区和设置仍需电脑授予额外管理权限。电脑和 DSH 需保持运行。App 进程结束后不继续推送，重新打开后尝试重连。

## 当前能力边界

真实 Android 已覆盖核心聊天、选模、审批/提问/计划、已有工作区新建、执行结果、重连，以及矩阵注明的文件、通知、局部插件和管理入口。详细通过与未验范围以[功能矩阵](./official-feature-matrix.md)为准；任意第三方插件、任意模型提供方和所有生命周期不能从单个专项推导为兼容。

手机不创建新的电脑工作区，不提供电脑 localhost 网站转发或手机命令输入。缺少公开接口的预设归档复制/删除、指定应用与图标、汇总待处理通知、未保存地址强制模型探测、精确前台实时字节输出和旧动态运行器不提供；[缺口清单](./official-delivery-audit.md#已取消能力与上游缺口)记录恢复它们需要的上游接口。
