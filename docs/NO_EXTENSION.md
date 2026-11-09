# 不下载、不安装扩展：Chrome 自带设置方案

这个方案直接实现：

**地址栏输入问题 → Enter → 当前标签页打开 ChatGPT → 自动提交并显示回答。**

只需设置一次，不需要 Chrome Web Store 开发者账号、注册费、API key 或任何扩展安装包。

## 一次设置

1. 将下面的地址复制到 Chrome 地址栏并打开：

~~~text
chrome://settings/searchEngines
~~~

2. 在“网站搜索”旁点击“添加”，填写：

| 字段 | 内容 |
| --- | --- |
| 名称 | ChatGPT |
| 快捷字词 | gpt |
| 以 %s 代替查询字词的网址 | https://chatgpt.com/?q=%s |

3. 保存后，点击 ChatGPT 条目旁的三个点，选择“设为默认”。

完成后，直接在地址栏输入普通问题并按 Enter 即可，不需要输入 gpt、不需要按 Tab，也不需要在 ChatGPT 页面再次输入或点击发送。

## 与网页搜索的区别

这个设置只是让 Chrome 把地址栏问题交给 ChatGPT。地址只包含 q 参数，没有 hints=search，不会强制开启 ChatGPT 的“搜索网页”工具。ChatGPT 仍可能根据提问自行决定是否使用工具。

如果输入看起来像一个完整网址，Chrome 仍可能直接打开该网址。登录、模型、地区可用性与使用限额由 ChatGPT 决定。

## 真实验证

[无扩展验证报告](verification/browser-results-no-extension.json)记录了一个没有加载本项目扩展的新浏览器配置，通过 Chrome 自带设置完成上述配置后，仅使用原生地址栏输入一次问题并按 Enter 的结果。

- [设置截图](verification/no-extension-settings.png)
- [ChatGPT 自动回答截图](verification/no-extension-chatgpt.png)

完整可重复验证脚本是 scripts/browser-no-extension-e2e.cjs。它只在显式启用 RUN_LIVE_CHATGPT=1 时发送真实测试问题。

## 为什么不能发一个网页链接直接替你设置？

普通网页不能静默安装 Chrome 扩展或任意更改浏览器默认搜索引擎。通过 Chrome 商店安装也仍需要点击“添加至 Chrome”并确认。

本项目目前没有 Chrome 商店安装页。关于商店发布条件和现有版本的限制，见[安装链接与商店状态](DISTRIBUTION.md)。
