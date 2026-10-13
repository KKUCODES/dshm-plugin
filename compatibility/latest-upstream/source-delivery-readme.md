# DSHM 新版源码兼容候选

此目录是独立补丁候选，面向 DSH `0.2.1-alpha.1` 的源码检出，固定 commit 为 `5badb15009ae1756c3afe0ae0cef1faafc290ccc`。它包含全部 38 个源码变更、原文件副本和两个启动载荷，不需要 DSHM 开发目录、开发依赖或调研产物。

尚未发布完整新版支持声明。本包不包含手机 App、公网网关、DSHM 插件安装包或 DSH 依赖，也不适用于直接覆盖官方 Electron/SDK 可执行文件。

准备 Node.js 24 和 Git，先停止目标 DSH。将本目录放在目标源码目录之外，使用显式绝对路径：

```powershell
node install.mjs plan 'D:\DSH-source'
node install.mjs apply 'D:\DSH-source'
```

安装器先检查固定 Git commit、包版本、38 个文件及启动契约。未知修改、越界链接或篡改载荷会在写入前拒绝；中途写入失败会回滚本次修改，外部并发改动会保留并明确报错。已安装时重复执行不再写入。支持固定基线的 LF/CRLF 源码，保留每个文件原换行。

安装后在目标 DSH 目录执行官方命令更新依赖并完整构建，再以原命令启动：

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dsh web
```

安装器不运行依赖脚本、不替用户构建或重启，也不读取凭据和聊天。编译产物需与安装的源码保持一致。

回滚前停止 DSH，再执行：

```powershell
node install.mjs restore 'D:\DSH-source'
```

回滚恢复全部原源码和 `dsh` 启动命令，移除两个已知启动载荷，保留其他配置和未知文件。若你修改过补丁文件，先保留自己的改动；安装器不会强制覆盖。随后重新执行官方依赖安装与完整构建，不能沿用候选编译产物。

`build-report.json` 给出清单和安装器的 SHA-256；这属于产物核对信息，不是发布签名或完整 Remote 验收证明。
