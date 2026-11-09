# Ask ChatGPT Now — v3

**修复“问题已填入，但还要手动点击发送”：v3 由扩展填入问题并点击 Send 一次，不再依赖 ChatGPT 的 q 链接是否自动发送。**

之前的 URL-only 建议说得过于笼统：匿名会话中观察到的自动回答，不能保证已登录会话同样自动发送。单独设置 https://chatgpt.com/?q=%s 可能只会预填草稿。

## 升级与使用

1. 移除旧版 v1/v2，或用 v3 文件替换原文件夹并在 chrome://extensions 重新加载。只启用一个版本。
2. 选择一个 [v3 主版本 ZIP](https://raw.githubusercontent.com/liush2yuxjtu/ask-chatgpt-now/main/downloads/ask-chatgpt-now-v3.0.0.zip) 或 [v3 保留默认引擎版 ZIP](https://raw.githubusercontent.com/liush2yuxjtu/ask-chatgpt-now/main/downloads/ask-chatgpt-now-keep-default-v3.0.0.zip)，解压，在 chrome://extensions 用“加载已解压的扩展程序”加载。
3. 新版需要 chatgpt.com 页面访问权限和 webNavigation 权限，用于确认地址栏请求并完成发送。
   加载或升级后，请先刷新已经打开的 ChatGPT 页面，让新内容脚本生效。
4. 主版本在 Windows/macOS 使用搜索引擎设置覆盖。在 Linux 或原先已经手动配置过 ChatGPT 搜索引擎时，检查“当前默认”条目的查询网址，改为：

~~~text
https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now=%s
~~~

5. 先登录 ChatGPT，再在 Chrome 地址栏输入普通问题并按 Enter。扩展等待输入框和发送按钮就绪后自动点击 Send。

这个网址是给 **Chrome 搜索引擎设置**使用的模板，需要 v3 扩展。它不是一个无需扩展就能自动发送的普通链接。为避免外部网页触发聊天，直接点击或粘贴问题链接不会获得自动发送授权。

如果使用保留默认引擎版，保持 Google.com 或 Bing.com 为默认；扩展会把对应搜索页导航转成同样的 v3 交接格式。它也会影响从这些搜索网站页面发起的搜索，但 v3 仅对地址栏发起的请求自动发送，网页内发起的跳转不会获得发送授权。

## 自动发送的边界

- 只接受 Chrome 标记为来自地址栏的搜索导航；普通网页链接、页面跳转、后退和刷新不会自动发送。
- 每次交接只能被对应标签页和文档消费一次；发送前移除交接片段，避免刷新重发。
- 确认输入框内容是当前问题后，仅点击一次 Send。若用户先自行发送，扩展停止。
- 如发现不相关草稿，扩展会显示提示并停止，避免覆盖已有内容。
- 如页面未就绪、需要登录或 ChatGPT 改变了页面结构，扩展会提示未发送；不会循环点击，也不会绕过登录或网站限制。

不会打开弹窗或新窗口，也不强制开启网页搜索。没有 OpenAI API key，没有调用 api.openai.com，没有指定或解锁模型。模型和限额由 ChatGPT 决定。

## 验证结果与明确限制

[完整验证记录](docs/VERIFICATION.md)分别记录：

- 真实匿名 ChatGPT：扩展实际点击 Send **1 次**，人工发送 **0 次**，收到真实对话 HTTP 200 和正确回复。
- 受控预填回归：textarea 和 contenteditable 两种已填入但未发送的布局，都等待就绪后发送一次；刷新不重复发送。
- 保留默认引擎版：同样获得真实回复，Google 默认设置前后不变。

**尚无真实已登录账号的实站验证。受控页面测试不等于登录账号验证；不能据此保证所有账号、模型和页面版本都成功。**

## 安装链接与旧方案

本项目尚未发布到 Chrome 商店，GitHub ZIP 仍需开发者模式加载。不能提供不存在的“一键安装”商店链接。[发布条件与政策限制](docs/DISTRIBUTION.md)仍适用。

旧的 [URL-only 方案说明](docs/NO_EXTENSION.md)已经更正，不再把它作为可靠的自动发送方案推荐。

## 隐私

问题使用专用片段参数交接，不依赖原生 q 自动发送。导航请求本身不携带片段，但问题可能短暂出现在地址栏或历史中。

扩展在浏览器内存中短暂保存待发送内容，匹配标签页和文档后立即消费；没有分析统计、遥测、远程脚本或聊天上传服务。页面访问权限只用于查找输入框、填入当前问题并点击发送。ChatGPT 按 [OpenAI 隐私政策](https://openai.com/policies/privacy-policy/)处理发送的内容。

保留默认版另外请求 Google.com/Bing.com 站点权限及声明式重定向权限。浏览器原有的搜索建议请求仍可能交给原搜索引擎。

## 开发

需要 Node.js 20+ 和 Python 3。普通检查与打包没有 npm 依赖：

~~~sh
npm run check
npm test
npm run package
~~~

打包生成两个 v3 ZIP，manifest.json 均位于根目录。[downloads/](downloads/) 提供发布副本和 [SHA-256 校验值](downloads/SHA256SUMS.txt)。

MIT licensed. Independent project; not affiliated with or endorsed by OpenAI.
