# 草稿模型发现目标限制

## 端点探测增量（2026-10-02，已安装）

原内置provider优先返回目录，会掩盖草稿地址的真实结果。[增量](./endpoint.mjs)将专用命名空间升级为`dshm.pi-ai-endpoint-v2`，固定`catalog:false`且保留`redirect:error`；只跳过目录捷径，仍用原协议解析和Host保存认证。默认`llm-pi-ai`入口不变。Host探测引擎已改用v2，不回退到v1或原入口。

增量按上一补丁三个文件的固定哈希生成，复用安装器和共享安装锁；[5项结果](../../artifacts/model-probe-endpoint-tests.log)覆盖安装/恢复/失败回滚/只读保护，以及原Context挂载编译插件后，内置openai实际访问本机端点、原目录入口不访问端点、新接口拒绝跳转及卸载清理。Adapter/引擎42项回归与类型检查通过。测试仅使用本机服务及虚构Key。

```text
node compatibility/model-discovery/endpoint.mjs prepare "F:/Program Files/deepseek-harness"
node compatibility/model-discovery/endpoint.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/model-discovery/endpoint.mjs apply "F:/Program Files/deepseek-harness" --stopped
node compatibility/model-discovery/endpoint.mjs restore "F:/Program Files/deepseek-harness" --stopped
```

运行安装/恢复测试时设置`DSHM_ENDPOINT_TEST=1`以选择增量；省略时测试第一版。恢复整个补丁必须先restore增量，再restore第一版，不可直接用第一版覆盖增量。prepare只针对未安装增量的既定基线，不重新采纳未知修改。

已停止确认身份的58624进程、安装三文件增量并按原参数启动50360。3080与原管理状态接口恢复，日常设备active、management=false；未改模型配置或Key。本次只是电脑兼容能力安装，配套新网关/插件操作与Android仍未部署，手机草稿探测未完成。以下为第一版安装记录。

- 状态：补丁已安装本机DSH；发现器、实际编译插件注册及安装恢复通过，尚未接入手机草稿入口。
- 维护角色：项目协作Agent；最近核验：2026-10-02。
- 来源：[原发现器](../../../deepseek-harness/packages/llm/llm-pi-ai/src/discovery.ts)、[补丁转换](./changes.mjs)、[回归](../../tests/provider-model-discovery.test.ts)、[实际结果](../../artifacts/model-draft-discovery-protected.log)。

原fetch默认跟随重定向，Anthropic认证头可随跨源跳转发送。候选保留默认原行为，并注册独立`dshm.pi-ai-draft`发现命名空间，固定使用`redirect: error`。原解析器、请求取消和结果去重继续复用。旧Host不存在该命名空间时应明确失败，不允许回退到默认发现。

新增命名空间不是任意远程调用授权；后续网关和插件仍需固定管理通道、目标/协议/认证来源确认、配置版本核对及原生临时Key。当前没有开放这些生产入口。

在plugin目录运行：

```text
node compatibility/model-discovery/prepare.mjs "F:/Program Files/deepseek-harness"
node node_modules/vitest/vitest.mjs run tests/provider-model-discovery.test.ts
```

prepare固定校验两个源码与一个编译入口的SHA256，将候选写到本项目artifacts，保留原换行且拒绝未知基线；不修改安装目录。当前安装目录与参考源码基线匹配，三个候选生成成功，编译候选通过node语法检查。

8项测试通过，包含原基线、取消/过期错误处理、临时认证来源、原跨源跳转，以及受限OpenAI/Anthropic跳转拒绝、正常解析。受限HTTP测试使用转换后的原发现器与原LlmRuntime。

## 安装、恢复与实际注册验证

[安装器](./install.mjs)复用已有路径检查与原子替换，固定三个文件、全量预检、互斥锁与失败回滚，拒绝未知修改及参考检出写入。[4项测试](../../artifacts/model-draft-discovery-install.log)覆盖幂等安装/精确恢复、未知文件拒绝、第三次写入失败回滚及只读检出保护。测试临时目录保留在本补丁artifacts下。

[实际编译插件测试](./runtime.test.mjs)通过原Context挂载候选pi-ai插件与原LlmRuntime，真实本机HTTP核对新命名空间拒绝跳转、正常解析、旧入口保留默认行为；卸载插件后两个入口均不存在。[结果](../../artifacts/model-draft-discovery-runtime.log)通过，不是手工注册替身。

```text
node --test compatibility/model-discovery/install.test.mjs
node --test compatibility/model-discovery/runtime.test.mjs
node compatibility/model-discovery/install.mjs plan "F:/Program Files/deepseek-harness"
node compatibility/model-discovery/install.mjs apply "F:/Program Files/deepseek-harness" --stopped
node compatibility/model-discovery/install.mjs restore "F:/Program Files/deepseek-harness" --stopped
```

apply/restore前必须停止DSH。2026-10-02已确认原进程70388身份后停止，apply写入3个文件，按原source bootstrap参数启动PID58624；3080监听和原管理状态接口正常，日常设备仍active且management=false。再次plan为patched=3。没有修改Key或模型配置，没有更换APK。运行中Remote尚未提供草稿调用/协商，不能把底层安装等同手机端到端验收完成。
