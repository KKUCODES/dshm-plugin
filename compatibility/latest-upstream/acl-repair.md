# Windows 已有文件权限修复工具

- 状态：固定 `DSH 0.2.1-alpha.1` 的独立人工工具已生成并验证；完整新版 Remote 支持仍在验收。
- 维护角色：项目协作 Agent；最近核验：2026-10-06。
- 来源：[生成器](./acl-repair.mjs)、[命令入口](../../scripts/prepare-latest-acl-repair.mjs)、[入口测试](../../tests/latest-acl-repair.test.mjs)及[实际手机与原生权限证据](../../../dsh-mobile/docs/integration/latest-ptc-files.md)。

## 适用问题与边界

Windows 上，已有文件即使能被当前用户修改，仍可能缺少原 DSH 沙箱设置安全标签需要的 `WRITE_OWNER`，使程序工具在工作区可写模式下报告 EPERM。本工具补齐明确指定的已有文件的这一权限前提；只读模式和工作区外的写入仍由原沙箱拒绝。原失败测试文件已在实际源码和 npm 发布入口、同一手机配对下验证修改、回读、历史同步及完整恢复。

比较过自动修改整个工作区和人工指定路径两种方案。本工具沿用官方显式诊断、备份、验证和恢复方式，避免在普通启动或 Remote 请求中自动改变用户项目权限。它不修改原沙箱、模型工具体、受限令牌、所有者或文件内容。

**修复命令会立即执行诊断及允许的权限修改，不能当作只读检查命令。** 官方目录修复和显式 AppContainer package ACE 清理行为仍保留，可能涉及 AllowRoot 内的检查链及原官方有界扫描；不是仅改最后一个文件的命令，也不向任意用户授予 FullControl。请先阅读原脚本的说明和实时操作日志，并将 AllowRoot 限定为实际授权的项目目录。

显式文件必须由当前用户所有、有有效 `WRITE_DAC` 且在 AllowRoot 内。路径经过 reparse point/junction、系统受管目录或原检查失败时拒绝。文件只添加当前用户的 TakeOwnership；.NET Allow ACE 同时包含 Synchronize。已验证布局的原权限已有 Synchronize，实际新增位只有 WRITE_OWNER。原目录修复仍使用当前用户的非继承 FullControl；文件不使用目录的 FullControl 规则，不递归为全部文件补权限。

## 准备工具

在 `plugin` 目录，传入实际安装的 `@deepseek-ai/dsh-sandbox-windows-acl` 包目录。源码安装的包位于 `packages/sandbox/sandbox-windows-acl`；npm 安装的包通常位于 `node_modules/@deepseek-ai/dsh-sandbox-windows-acl`。以下使用本项目已经核验的隔离 npm 包：

```text
node scripts/prepare-latest-acl-repair.mjs artifacts/latest-runtime-check/node_modules/@deepseek-ai/dsh-sandbox-windows-acl
```

入口只读取包并生成 `artifacts/latest-runtime-check/acl-repair-candidate/diagnose-windows-sandbox-acl.ps1`，不运行修复、不修改 DSH 安装或用户权限。包名称、版本和官方原资产 SHA256 必须完全匹配；未知版本、定制资产、包边界外的资产链接和冲突输出会拒绝。输出只能位于本项目 artifacts，并拒绝回写输入包或隔离参考源码；已有目录链接也会拒绝。一致输出可以重复复用，不覆盖未知文件。新克隆布局中没有 artifacts 或隔离源码产物时，也已通过从实际 npm 安装包生成的入口验证。

| 核对项 | SHA256 |
| --- | --- |
| 固定官方原脚本 | `adba89f3b10692302723d231d003cdf365311effaff996d32416f9531e3b63d9` |
| 本工具生成脚本 | `e6389ffbdcbc6e3a50206c198ab8a348c9957681de231d1fb920aa50d6239ce0` |

源代码和 npm 实际包经此 CLI 均生成同一候选，原资产保持相同字节。工具源码随插件仓库维护，生成产物需在本地重建；它不包含在当前插件 tgz 中，不自动装到电脑或手机，也不是完整新版兼容交付声明。

## 人工修复与恢复

1. 停止相关 DSH Host 和运行中的测试任务，保留文件原件与权限快照。避免在沙箱授权存续期间恢复 DACL；先让原沙箱释放其授权，保留原拒绝规则。
2. 为本次操作选择独立、可写且可信的备份目录，不把恢复材料放在临时插件提取目录或未知目录链接中。明确授权根目录和已存在的失败文件路径。
3. 执行下列命令，把示例绝对路径替换为自己的路径。多文件可以使用 PowerShell 的 `-Path` 数组；不要为方便扩大 AllowRoot 到磁盘根目录。

```text
pwsh -NoProfile -File artifacts/latest-runtime-check/acl-repair-candidate/diagnose-windows-sandbox-acl.ps1 -Path "C:/MyProject/existing.txt" -AllowRoot "C:/MyProject" -Out "C:/MyAclBackups/run-001"
```

4. 核对逐步日志和退出码：0 表示本次原验证通过，2 表示拒绝，1 表示失败。不能只凭退出码认定已可写；需要重启 DSH 后在原工作区验证实际修改/回读，以及只读仍拒绝。保留原失败历史，不用新工作区的成功替代旧路径验收。
5. 每次修改前，工具生成 `acl-backup-<id>.json` 和对应 `.json.ps1` 独立恢复脚本，日志给出该对象的完整 `ROLLBACK` 命令。验证失败时本次已尝试修改会按原逻辑逆序恢复；仍需检查实际 restore 日志，不能假定任意失败均恢复成功。
6. 如需手动恢复，先停止 DSH 并释放原沙箱授权，再按本次备份和对象路径逐项运行恢复命令；从子对象到祖先，对同一对象的多次备份按逆序恢复。恢复文件必须与 Path 相符，不能拿一个文件的记录恢复另一文件。示例：

```text
pwsh -NoProfile -File "C:/MyAclBackups/run-001/acl-backup-<id>.json.ps1" -Path "C:/MyProject/existing.txt" -AllowRoot "C:/MyProject" -Restore "C:/MyAclBackups/run-001/acl-backup-<id>.json"
```

恢复脚本还原备份 DACL，保留所有者及 SACL，不恢复文件正文；如测试写过文件，需另用原字节备份恢复内容。原工作区专项已独立核对全部8对象的 DACL、保护、所有者、安全标签及字节精确恢复，不能将这一结果扩大为任意用户目录均已验证。

## 已验证与限制

实际原生验证覆盖明确 TakeOwnership 拒绝后的自动回滚、缺有效 WRITE_DAC 的拒绝、非本人所有但实际有 WRITE_DAC 的拒绝、路径和 AllowRoot 本身经过 junction 的拒绝、越界路径及重复修复。拒绝场景均核对真实权限和文件字节，非本人所有负例只读检查现有公开许可证文件，未改变软件目录或权限。

运行入口测试：

```text
node --test tests/latest-acl-repair.test.mjs
```

当前 Windows 结果为10项通过、1项跳过：令牌不允许创建文件符号链接，因此该种输出链接的实际分支尚未验证；代码拒绝路径保留，目录 junction 已实际验证。不启用额外 Windows 权限来掩盖此限制。首次测试的 EPERM 失败记录保留，所有专用测试对象已清理。

此工具针对固定上游版本和已经核验的权限布局。最终31文件/355资源恢复、18项补丁最终去留和其他有效 Remote 验收仍未完成，不据本专项宣布完整新版支持。
