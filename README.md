# Ask ChatGPT Now — v2

**在 Chrome 地址栏输入问题 → 按 Enter → 当前标签页进入 ChatGPT，自动发送问题并显示回答。**

问题只输入一次。新版没有弹窗入口，不需要在 ChatGPT 页面再次输入或点击发送。使用普通聊天链接，不强制启用 ChatGPT 的“搜索网页”工具。

## 不想下载？可以完全不安装扩展

Chrome 自带的搜索引擎设置就能实现相同功能，只需设置一次。无需开发者账号或注册费，见[不下载扩展的设置方法](docs/NO_EXTENSION.md)。

本项目目前没有 Chrome 商店安装页。GitHub 下载链接不能直接安装扩展；现有版本还需处理商店发布要求，见[安装链接与商店状态](docs/DISTRIBUTION.md)。

## 两个版本，选择一个安装

| 版本 | 浏览器默认搜索引擎 | 适用方式 |
| --- | --- | --- |
| [主版本 ZIP](https://raw.githubusercontent.com/liush2yuxjtu/ask-chatgpt-now/main/downloads/ask-chatgpt-now-v2.0.0.zip) | 将地址栏搜索交给 ChatGPT | 你选的方案；不请求网站访问权限 |
| [保留默认引擎版 ZIP](https://raw.githubusercontent.com/liush2yuxjtu/ask-chatgpt-now/main/downloads/ask-chatgpt-now-keep-default-v2.0.0.zip) | 保持原设置 | 将 Google.com/Bing.com 搜索页导航重定向到 ChatGPT；需要这些站点的访问权限 |

两个版本的聊天地址都只使用 q 参数，不包含 hints=search，不选择特定模型。ChatGPT 仍可能根据问题内容自行决定是否使用搜索等工具。

“浏览器默认搜索引擎”和“ChatGPT 搜索网页工具”是两件事。选择主版本不会自动开启后者。

## 安装或升级

1. 已安装 1.0 版：先移除旧版，或用新版替换原文件夹后点“重新加载”。只保留一个版本启用。
2. 下载所选 ZIP，解压到一个固定文件夹。
3. 打开 chrome://extensions，启用“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择包含 manifest.json 的文件夹。
5. 主版本如出现搜索引擎确认，确认使用 ChatGPT。然后在地址栏输入一句普通问题并按 Enter。

新版无需固定工具栏图标，也没有 Alt+Shift+G 弹窗快捷键。

### 主版本：Windows / macOS / Linux

Chrome 的官方扩展设置覆盖接口支持 Windows 和 macOS。这里的 Linux 测试环境通过下面的一次设置验证了完整流程；Windows/macOS 的自动覆盖没有在此环境实测。

如果安装后普通地址栏问题仍交给原搜索引擎，或使用 Linux：

1. 打开 chrome://settings/searchEngines。
2. 在“网站搜索”中点“添加”。
3. 名称填 ChatGPT，快捷方式填 chatgpt.com，查询 URL 填：

~~~text
https://chatgpt.com/?q=%s
~~~

4. 保存后，在 ChatGPT 条目的菜单中选择“设为默认”。

这只需配置一次；以后输入问题再按 Enter 即可。地址栏中看起来像网址的内容仍可能由 Chrome 当作网址正常打开。

### 保留默认引擎版的边界

这个版本不修改默认搜索引擎设置，使用 Chrome 稳定版的 declarativeNetRequest 规则。它只匹配 Google.com/Bing.com 的 HTTPS 搜索页导航，并保留原问题的编码。

这是开发者模式版本，不能据此认为它适合直接提交 Chrome 商店；商店对修改默认搜索体验另有 API 要求，详见[发布限制](docs/DISTRIBUTION.md)。

它也会重定向从这些搜索网站页面发起的搜索，不限于地址栏；保留的搜索引擎仍可能接收原有的搜索建议请求。其他国家域名或其他搜索引擎没有覆盖。只希望地址栏交给 ChatGPT、又不希望网站搜索被重定向时，选主版本。

## 不改默认搜索引擎还有其他办法吗？

- 完整问题链接可以直接打开，例如 https://chatgpt.com/?q=Explain%20closures。需要自己提供网址前缀和正确编码。
- 关键词模式仍可用：ask → Tab → 问题 → Enter。这需要额外的关键词操作。
- 新的 omnibox.directInput 接口仍受开发版和 ExperimentalOmniboxLabs 实验功能限制，不适合作为稳定版承诺。稳定版的搜索请求重定向是本项目提供的可选替代方案。

来源：[Chrome 设置覆盖](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)、[DNR 重定向与权限](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)、[Chromium directInput 权限定义](https://github.com/chromium/chromium/blob/main/extensions/common/api/_permission_features.json)。

## 真实验证与使用范围

[验证报告、网络状态和截图](docs/VERIFICATION.md)记录了真实的 ChatGPT 网站回复、原标签页不变、无弹窗、没有页面输入框操作，以及可选版本的默认搜索引擎前后比较。

不需要 OpenAI API key。本项目使用真实 ChatGPT 网站，不调用 api.openai.com。登录、地区、账户功能、模型和使用限额由 ChatGPT 决定；不保证 GPT-6 Luna。网页搜索功能没有被默认强制开启。

## 隐私与开发

主版本没有权限列表、网站访问权限、内容脚本或分析统计。可选版本仅增加声明式重定向权限及上述搜索站点权限；没有读取聊天、Cookie 或账户凭据的代码。问题出现在目标 URL 中，可能进入浏览器历史记录与同步。ChatGPT 按 [OpenAI 隐私政策](https://openai.com/policies/privacy-policy/)处理问题。

需要 Node.js 20+ 和 Python 3。普通检查与打包没有 npm 依赖：

~~~sh
npm run check
npm test
npm run package
~~~

打包生成主版本和保留默认引擎版两个 ZIP，manifest.json 均在压缩包根目录。[downloads/](downloads/) 中提供经过验证的发布副本和 [SHA-256 校验值](downloads/SHA256SUMS.txt)。

MIT licensed. Independent project; not affiliated with or endorsed by OpenAI.
