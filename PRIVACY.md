# Privacy policy — Ask ChatGPT Now

Effective November 9, 2026. Applies to version 3.0.0 of both GitHub preview builds.

## What the extension handles

- **Your address-bar prompt:** carried in a ChatGPT URL fragment, then filled into the ChatGPT composer and submitted once.
- **Navigation metadata:** the ChatGPT destination, transition type, tab ID, and document ID, used to verify that an eligible search came from the address bar.
- **Composer state:** the current draft, editor readiness, and Send-button state, used to avoid overwriting an unrelated draft or sending twice.

The extension does not collect these items for the publisher. It has no analytics, telemetry, remote code, advertising, or publisher-operated server. It does not request cookies, account tokens, passwords, or an OpenAI API key. It does not persist prompts in extension storage or sync them.

## Where data goes

The extension fills and sends your question through the ChatGPT website. OpenAI processes it under [OpenAI's privacy policy](https://openai.com/policies/privacy-policy/) and your applicable ChatGPT settings. The extension does not call the public OpenAI developer API.

The prompt is initially carried in a URL fragment. Fragments are not included in the HTTP request URL, but can be read by scripts on the destination page and can appear in browser history, the address bar, or synced history. The extension removes the handoff flag and fragment before sending; it does not promise to erase browser or third-party records.

Chrome's existing search-suggestion feature may send address-bar text to your configured search provider. The keep-default build redirects Google.com/Bing.com search navigations and cannot guarantee that your provider receives no search data. It also redirects searches started on those supported websites, although only eligible address-bar searches are authorized to auto-send.

## Retention

Pending handoffs are held in service-worker memory, with a maximum claim age of 60 seconds. They are discarded when claimed, replaced by a later ChatGPT navigation in that tab, when the tab closes, or when the worker stops. Expired claims are rejected and removed when checked; there is no persistent prompt database. The content script holds the current handoff while handling the page.

Uninstalling removes the extension. Existing ChatGPT conversations, browser history, and search-provider records are controlled by their respective services and browser settings.

## Permissions

| Permission or setting | Purpose |
| --- | --- |
| `webNavigation` | Use Chrome's navigation metadata to authorize address-bar requests and reject links, reloads, Back, and subframes. The listener is filtered to HTTPS `chatgpt.com`. |
| Access to `https://chatgpt.com/*` | Run the local content script, fill the prompt, inspect composer readiness, and click Send once. The script is present on matching ChatGPT pages but acts only on an approved handoff. |
| Search-provider override — main build | Route ordinary address-bar searches to the ChatGPT handoff URL. |
| `declarativeNetRequestWithHostAccess` and Google.com/Bing.com host access — keep-default build | Apply the bundled search-redirect rules while retaining the existing default-provider setting. No content script runs on Google or Bing. |

## Questions and updates

Use [GitHub Issues](https://github.com/liush2yuxjtu/ask-chatgpt-now/issues) for privacy questions; do not post private prompts or account credentials. Future changes to data handling will be reflected here. This policy describes the current extension, not a future Chrome Web Store version or relay service.
