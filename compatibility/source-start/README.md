# 源码启动模块身份修复

- 状态：已交付固定基线的安装/恢复器，并应用到本机 DSH；`pnpm dsh web` 启动及 MuMu 后台独立输出、模型后续读取通过。完整 Remote 仍在实施。
- 维护角色：DSH Mobile 项目协作 Agent；最近核验：2026-09-25。
- 基线：DSH `0.1.6-alpha.2` / `ddefc45fbc7f8e46dd73185e68295696d1297887`；实际安装 `F:/Program Files/deepseek-harness`，Node `24.11.0`，随该安装 tsx 使用的 get-tsconfig `5.0.0-beta.5`。
- 上游参考检出只读；与[后台输出源码补丁](../background-output/README.md)分开，不能用本项测试代替后台输出源码链路验收。

## 原因与方案取舍

原根脚本 `node --import tsx/esm apps/cli/src/bin.ts` 在早期加载时通过 tsconfig 路径映射取得源码模块；原 profile resolver 将配置中的模块解析到安装包的 `lib`。外部插件位于 `node_modules`，tsx 又明确跳过这类 importer 的路径映射。因此同进程出现两份 tools 的类和唯一 Symbol，原调度器访问另一份服务的 `prepare` 时为 undefined。

[最小重现](./identity-worker.mjs)采用真实安装中的 `createProfileResolutionGeneration`、`installProfileResolution`、Cordis、SystemPrompt 和 ToolRuntime。专用 profile、ESM/CJS 插件及固定依赖版本均创建在本插件 artifacts 内；它们是解析边界夹具，不是用户插件或认证替身。注册一个只返回固定字符串的测试工具，通过原 prepare/dispatch/finalize/finish 路径调用，不连接模型、不修改用户会话。

| 对照 | 结果与取舍 |
| --- | --- |
| 原源码入口 | 连续两次同样报 `Cannot read properties of undefined (reading 'prepare')`，类/Symbol/子路径不同 |
| 指定同一 TSX_TSCONFIG_PATH | 仍然混用，不能修复 |
| 改为原 link 模式 | 内置模块一致，但外部 ESM/CJS 仍不同；实现便宜但不满足插件兼容，未采用 |
| 全编译入口 | 类、Symbol、子路径、外部 ESM/CJS 都一致，真实工具返回固定值；保留为对照和恢复路径 |
| 源码解析补充器 | 保留原 runtime profile resolver 的版本选择，再将**同一安装、同一包**的 lib 入口映射到该安装 tsconfig 的源码入口；各入口一致，工具执行成功，插件自己的另一版本保持不变 |

[register.mjs](./register.mjs)通过 Node 同步 resolve hook 调用原解析，再核对实际所选文件的 package 目录和包名；仅处理当前安装的 lib 文件。插件自己的依赖版本、安装目录外的文件和带查询参数的地址不转换。沿用当前 tsx 的配置解析器，不复制通配符匹配规则。ESM 与 CJS 分别使用其接受的路径形式。未来 Node/tsx 变化仍须重新验证；不替换原 resolver，不新增远程授权。

Node 24.11.0 下继承 CLI preload 的 Worker 首次复现 `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`：该版 tsx 在非主 Worker 没有注册对应转换器。正式引导器在非内部 Worker 使用安装内的 `tsx/esm/api` 注册转换，再启用同一解析补充器。测试覆盖原 profile Worker bootstrap、外部插件类/Symbol 身份，以及真实 DSHM 编译模块导入；不等于所有第三方 Worker 或插件生命周期都已验收。

## 安装与恢复

先停止目标 DSH，在插件目录执行；后台输出源码补丁与启动修复是两个独立步骤：

```text
node compatibility/background-output/install-source.mjs apply "F:/Program Files/deepseek-harness"
node compatibility/source-start/install.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/source-start/install.mjs apply "F:/Program Files/deepseek-harness"
```

之后在 DSH 安装目录正常执行 `pnpm dsh web`。正式 [bootstrap.mjs](./bootstrap.mjs) 不依赖验证环境变量。安装器只修改根 package.json 的 dsh 命令值并添加 `.dshm-source` 下两个引导文件；保留其余脚本和换行，核对六个关键源码 hash，未知修改或越界链接拒绝写入。回执位于 `artifacts/compatibility/source-start/install-receipt.json`。

恢复前停止 DSH，将上述两个 `apply` 改为 `restore`，先恢复启动引导再恢复源码。编译补丁可单独保留，使用 `node apps/cli/lib/bin.js web --no-open`。文件副本已验证逐字节恢复、重复操作零写入和未知修改拒绝；**尚未在实际 F 盘执行恢复，不称为现场回滚验收**。重新构建或升级 DSH 前先恢复并核对基线，不把补丁文件当成原始备份。

## 可重复验证

在插件目录执行：

```text
node compatibility/source-start/probe.mjs "F:/Program Files/deepseek-harness"
node --test compatibility/source-start/identity.test.mjs
node --test compatibility/source-start/install.test.mjs
node compatibility/source-start/startup-probe.mjs "F:/Program Files/deepseek-harness"
```

[5项回归](./identity.test.mjs)覆盖原错误、显式配置无效、link 对外部插件仍有缺口、实际 preload 修复及全编译对照。修复和编译对照都要求真实调度器返回 `DSHM_IDENTITY_OK`；所有模式验证外部插件自己选择的 `0.0.1` 夹具版本不被替换。报告 [identity-probes.json](../../artifacts/compatibility/source-start/identity-probes.json) 保存各路径和结果；初始两次原错误在 [identity-reproduction.json](../../artifacts/compatibility/source-start/identity-reproduction.json)。最初夹具误用 `ctx.dispose`，已按原 Cordis 生命周期改为 `ctx.fiber.dispose`；调度器测试按原返回联合类型传递 `outcome.result`，不把检查导出当作工具执行。

[完整源码启动探测](./startup-probe.mjs)创建独立 DSH_HOME，选择临时 loopback 端口，给**真实 `apps/cli/src/bin.ts web --no-open`**增加[验证 preload](./preload-probe.mjs)，收到原 Web ready 信号后退出自身。2026-09-24 20:59:10 UTC 开始的 [报告](../../artifacts/compatibility/source-start/startup-verification.json)为 ready=true、errors=[]。不打印启动登录链接，也未连接模型。验证 preload 依赖测试环境变量，不是正式交付引导器。

## 真实源码启动与手机验证

2026-09-24 21:12 UTC（本地09-25）前，现场安装十文件源码补丁及三文件启动补充，保持原九包二十二文件编译补丁；原 DSH24256 停止后，以 `pnpm dsh web --no-open` 启动为20288，网关38324未重启。原 profile、Key、地址、遥测、设备授权与 APK 未改。五项模块身份/工具/Worker回归和四项安装器回归通过。

通过[正式 Android 验证脚本](../../../dsh-mobile/scripts/verify-independent-job-output-android.mjs)的 `DSHM_OUTPUT_CASE=source-start`，只在 DSH-TEST 创建专用聊天“DSHM 独立输出联调 1790284335885”。一次原 pwsh 后台调用只打印中文 stdout/stderr、等待35秒和结束标记。运行中首段、错误输出、结束后完整独立历史及全屏通过；模型随后调用原 job_output 仍读到全部标记。21:15:48 UTC 已归档并回原联调聊天，三份报告 errors 均为空，运行中和完成截图已查看。

证据：[run](../../../dsh-mobile/artifacts/source-start-job-output-run-android.json)、[model-read](../../../dsh-mobile/artifacts/source-start-job-output-model-read-android.json)、[cleanup](../../../dsh-mobile/artifacts/source-start-job-output-cleanup-android.json)。源码启动已具备本机交付依据；任意第三方插件/Worker、核心服务热重载、真实在途撤销、Bash/系统沙箱、npm/Electron 安装仍待对应验收，不能从本机结果外推。完整 Remote R01–R16 保持实施中。
