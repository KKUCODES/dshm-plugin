# README 图片说明

[返回项目首页](../../README.md)

由 DSHM 插件维护者维护，最近核对日期：2026-10-10。首页横幅是角色插画，设置页图片是软件的真实界面。

## 项目 Logo

首页标题的 [logo.png](./logo.png) 为用户于 2026-10-13 确认的统一 DSHM 标志：完整 DeepSeek 鲸鱼与手机、电脑双向连接。采用带透明背景的 1254 × 1254 PNG，以 128 像素展示，与手机端及后端副本逐字节一致。它是项目 Logo，不是软件截图，也不表示 DeepSeek 官方出品或背书；现有横幅与以下截图保持原来源。

## 插件设置页

[desktop-pairing.png](./desktop-pairing.png) 展示“书房电脑”已连接、“我的手机”等待批准，以及指纹核对和批准入口。尺寸 800 × 625。

拍摄环境是未修改的官方 DSH `0.2.1-alpha.2` Web 和地址修改候选插件 `0.1.81-latest.0`。使用独立 DSH 数据目录、现有生产网关代码和本地 PGlite 数据库；由独立协议客户端实际领取一次性配对链接，生成待批准设备。截图没有使用用户原来的会话、凭据或设备授权，也没有发起模型请求。

截图直接从真实页面截取插件设置区域，并保留周围 20 像素留白；没有重绘、替换文字或修改页面样式。图中只有本机服务地址和设备公钥指纹，不含 Key、电脑登录令牌、配对链接或密钥。HTTP 提示保留实际显示。

同次拍摄的 [change-server.png](./change-server.png) 展示真实“修改服务地址”表单，尺寸 800 × 745；选择同一后端换地址，不含注册密钥。

拍摄后撤销演示设备、收回临时管理授权、关闭独立远程连接，并停止独立 DSH 和网关。来源与验证信息保留在本机忽略目录 `artifacts/gateway-settings-1791624238735/`。这些图片展示电脑设置页，不代替 Android 配对或完整兼容验收。此前首页截图的原始记录仍保留在 `artifacts/readme-restructure-1791623570801/`。

## 角色横幅

[hero.png](./hero.png) 延续手机仓库的配色和角色形象，改为在电脑前连接手机的场景。尺寸 1983 × 793。它仅作插画，不是软件界面，也不表示官方背书。

使用内置 `imagegen` 编辑模式，参考用户提供的蓝发鲸尾角色三视图，以及 DSHM 手机仓库已有横幅。原始三视图保留在用户提供位置，不随本仓库发布；本目录只保存生成的插画。

<details>
<summary>生成提示词</summary>

```text
Create one finished wide 5:2 GitHub README hero banner for the DSHM desktop plugin. Reference image 1 is the existing DSHM mobile banner: match its restrained white and pale blue setting, navy typography, soft anime lighting and spacious composition so the two repositories feel like one product. Reference image 2 is the character identity sheet: preserve the same fully clothed friendly chibi girl with blue hair, curled top tuft, blue eyes, white frilly headband, navy blue and white dress, bows, and blue whale tail. Make a NEW scene on the right third: the character is comfortably seated at a clean desk using a laptop, smiling as she connects the computer to a small smartphone standing nearby. An understated blue dotted connection and two tiny abstract chat bubbles communicate bringing computer conversations to the phone. Show a simple abstract connector motif, never actual software UI or fake screenshots. Laptop and phone screens contain no text. Keep the left half open for clean readable text. Render the text EXACTLY: large dark navy 'DSHM 插件', then underneath smaller simplified Chinese '把电脑上的工作，连接到手机。'. No other captions, version labels, badges, watermark, or official endorsement. Crisp coherent hands and clothing, tasteful warm expression. Do not make a character sheet, marketing collage or poster full of icons. Single polished landscape banner, all important content readable at 900px display width.
```

</details>

## 更新约定

替换软件截图时，先准备自然的演示内容，再核对实际版本和可见信息，同时更新本页。角色插画与软件截图分开维护，不用生成图片替代真实操作界面。
