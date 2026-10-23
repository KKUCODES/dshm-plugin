# 通用大响应分块

状态：2026-10-23，本地验收完成，准备发行0.1.87并配套App preview.7及新版中转。实现：[KKC-75](https://linear.app/kkcodes/issue/KKC-75)；发行：[KKC-76](https://linear.app/kkcodes/issue/KKC-76)。独立 `fix/remote-response-chunks` 分支不混入插件适配分支，不修改 DSH。

`ResponseWriter` 包住原 Relay 响应：最终帧不超过2 MiB时保持原样；已协商的大 `result/event` 把完整 `value` 序列化为UTF-8，64 KiB分块，四块确认窗口。原适配器等待发送完成后再读取下一项，保持顺序与背压；所有块确认后才发逻辑结束。超限、超时、取消及断线清理窗口、队列与原官方订阅。

插件用可被旧网关忽略的 `x-dshm-response-chunks: 1` 请求头及 `remote.negotiate.responseChunksVersion: 1` 宣告能力。只在原请求带 `responseChunks: 1` 时启用；旧手机/中转继续原通信，大响应仍明确失败。DSH兼容范围与既有能力检查不变。

每条最多32 MiB、连接待发送字节最多64 MiB、最多4条同时分块。完整协议、权限隔离、手机重组规则及发布顺序见[后端专题](../../../backend/docs/response-chunks.md)。不能仅升级插件就声称长聊天问题已解决。

验证使用现有单测、GitHub安装包构建，以及生产HTTP/WS中转和实际手机传输入口的跨仓库测试。原官方rc.2隔离CLI和Android测试UID另验合成大历史；不调用模型、不使用用户原聊天，不把替身数据描述为真实模型输出。

0.1.87固定新版协议提交 `94183d08ccbb8752d14c819608d79fe3870a9a60`，`lib/`与发布回执随源代码一起重建。旧发行0.1.86不覆盖。

本轮261项单测及81文件GitHub包生成/校验通过；适用后端114项与新增分块专项5项通过，Android12模拟器在原官方rc.2上完成2.55MB首次快照、2.52MB历史页和重新打开后的大快照。没有真实模型调用；设备授权已撤销、临时服务关闭。Office用例的一次并行超时及后续通过、夹具/驱动失败和实际边界见[三端结果](../../../backend/docs/response-chunks.md#本轮结果)。
