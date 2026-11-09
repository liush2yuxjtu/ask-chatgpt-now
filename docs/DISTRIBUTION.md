# 安装链接与 Chrome 商店状态

本项目目前发布在 GitHub，尚未发布到 Chrome Web Store，也没有商店安装链接。

GitHub 中的 ZIP 是开发者模式安装包。功能、真实 ChatGPT 网站回复和打包校验通过，不表示已经通过 Chrome 商店审核或获得商店签名。

## 直接安装链接的前提

Google 官方说明，普通 Chrome 用户可直接安装的扩展应由 Chrome Web Store 托管并签名。普通网页不能静默安装本项目，GitHub ZIP/CRX 下载链接也不能代替商店安装页。企业管理和 Linux 的特殊分发方式不是普通用户的一键网页安装方案。

商店版本的用户流程是：打开正式商店详情页 → 添加至 Chrome → 确认安装。必要的用户确认仍然存在。

## 当前版本不能不加修改就承诺上架

| 版本 | 发布前需要处理的问题 |
| --- | --- |
| 主版本 | 设置覆盖把默认搜索目的地设为 chatgpt.com。Chrome 要求发布者控制并验证设置中的站点；不能假设第三方发布者拥有 OpenAI 的域名。需要先设计、托管并验证发布者可控制的中转站点，或获得适用的官方分发授权，再检查商店要求。 |
| 保留默认引擎重定向版 | 稳定版 DNR API 能完成功能，但商店政策要求改变默认搜索体验应使用 Settings Overrides API。当前重定向版不应作为可直接上架的商店版本提交。 |

尚未向商店提交这两个包，也没有收到商店审核结论。以上是根据公开政策识别出的发布前问题，不是声称已被 Google 实际拒审。

## 正式发布所需工作

1. 使用发布者的 Google 账号注册 Chrome Web Store 开发者；Google 要求一次性注册费。
2. 解决上面的域名控制和支持 API 问题，确认发布设计。
3. 准备最终 ZIP、隐私说明、权限理由、截图、商店描述和测试指引；如果增加中转站点，应明确披露问题会经过该站点及其托管服务。
4. 通过已授权的开发者账号上传并提交审核。
5. 通过审核并发布后，才会得到用户可使用的正式安装链接。审核通过和时间不能预先保证。

提交审核需要发布者授权的账号。不要在聊天或仓库中提供 Google 密码、发布令牌或客户端密钥。

## 不想注册或下载？

仅配置问题 URL 可能只预填草稿，并不能保证自动发送，尤其不能用匿名测试代替已登录会话验证。v3 的可靠性改进依赖扩展本身完成填入和发送；见 [URL-only 方案更正](NO_EXTENSION.md)。

## 官方来源

- [Chrome 扩展分发方式](https://developer.chrome.com/docs/extensions/how-to/distribute)
- [Chrome 设置覆盖及站点验证](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override)
- [商店搜索设置政策 FAQ](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines-faq)
- [注册开发者账号](https://developer.chrome.com/docs/webstore/register)
- [发布与审核流程](https://developer.chrome.com/docs/webstore/publish)
- [开发者控制台](https://chrome.google.com/webstore/devconsole/)
