# URL-only 方案的限制：不能保证自动发送

**先前把“仅设置 https://chatgpt.com/?q=%s 就无需再次发送”作为通用建议，是不准确的。**

本项目的旧匿名测试确实观察到了自动回复，但部分已登录会话只会预填问题，仍需要点击 Send。匿名成功不能推广为所有登录状态的保证。

因此，这个方案不再作为“无需二次发送”的可靠方案推荐。历史 [无扩展报告](verification/browser-results-no-extension.json)只记录当时的未登录测试，不是已登录账号验证。

## 当前修复

v3 使用扩展自己的片段交接，并由扩展填入问题、点击 Send 一次。升级并加载 v3 后，主版本的 Chrome 搜索引擎模板为：

~~~text
https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now=%s
~~~

这个模板需要 v3 扩展，不是普通免扩展链接。只应配置在 Chrome 搜索引擎设置中，不能把直接点击一个外部问题链接当作自动发送授权。

详见 [README](../README.md) 和 [v3 验证范围](VERIFICATION.md)。真实已登录账号的实站验证仍未完成，受控预填布局测试不代表真实登录测试。

## 安装状态

本项目仍没有 Chrome 商店安装页，需要开发者模式加载；正式商店发布的账号、域名验证及政策条件见 [DISTRIBUTION.md](DISTRIBUTION.md)。
