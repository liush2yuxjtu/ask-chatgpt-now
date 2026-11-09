# v2 verification

**Local checks and both live ChatGPT website E2E flows: PASS.**

- [Default-provider report](verification/browser-results.json)
- [Keep-default report](verification/browser-results-keep-default.json)

Both runs used Chrome for Testing 151.0.7922.34, Playwright 1.62.1, an isolated Linux X11 display, and a fresh signed-out browser profile.

## What actually happened

The test typed a freshly generated arithmetic prompt **only into Chrome's native address bar**, then pressed **Enter once**. It did not type ask, press Tab, interact with ChatGPT's composer, click Send, or submit a second prompt. ChatGPT automatically returned the exact random marker followed by the correct answer, **42**, in the original tab.

| Check | Default-provider build | Keep-default build |
| --- | --- | --- |
| Native plain prompt + one Enter submits the exact prompt | PASS | PASS |
| ChatGPT produces a real answer without composer interaction | PASS | PASS |
| Website conversation POST returns HTTP 200 | PASS | PASS |
| Query has only q; no forced web-search/model parameter | PASS | PASS |
| Original active tab is retained | PASS | PASS |
| New tabs / extra windows / popups during submission | 0 / 0 / 0 | 0 / 0 / 0 |
| No toolbar popup action or popup shortcut in manifest | PASS | PASS |
| No extension service worker errors | PASS | PASS |
| Original Google default provider remains unchanged | Not applicable | PASS, compared before and after |

All **7 unit tests**, JavaScript syntax checks, and both installable ZIP integrity checks passed. The ZIP contents are checked against the SHA-256 hashes of the files loaded for the live runs.

The real website made requests including:

~~~text
POST https://chatgpt.com/unauth-mweb/conversation/prepare → 200
POST https://chatgpt.com/unauth-mweb/conversation/updates → 200
~~~

The updates response used application/vnd.openai.conversation-source+ndjson. Only status, path, content type, and the non-sensitive test prompt/reply were retained. No credentials, cookies, request headers, private browser profiles, or full network captures are included.

## Screenshots

- [Main build: actual answer](verification/live-chatgpt.png)
- [Main build: Linux one-time search-provider setup](verification/search-provider-settings.png)
- [Keep-default build: actual answer](verification/live-chatgpt-keep-default.png)

## Additional no-extension verification

Chrome's built-in search-provider configuration also passed a separate live run with no project extension loaded. After one configuration through the real settings UI, one native address-bar prompt plus one Enter produced the expected real ChatGPT reply, a conversation HTTP 200, and no additional tab, popup, or composer interaction.

See the [no-extension report](verification/browser-results-no-extension.json), [settings screenshot](verification/no-extension-settings.png), [answer screenshot](verification/no-extension-chatgpt.png), and [zero-download setup guide](NO_EXTENSION.md). The reproducible harness is scripts/browser-no-extension-e2e.cjs and uses the same RUN_LIVE_CHATGPT=1 opt-in as the other live tests.

## Setup and coverage limits

Chrome's [settings-override documentation](https://developer.chrome.com/docs/extensions/reference/manifest/chrome-settings-override) lists Windows and macOS for automatic extension search-provider overrides. On the Linux test browser, the main build's ChatGPT provider was added and made default once through Chrome's **real settings UI**, before the address-bar flow was tested. This is not evidence that the main extension automatically changes the default provider on Linux or that its Windows/macOS override was tested.

The keep-default build needed no search-provider change. The browser's initial Google provider was inspected before the live prompt and compared again afterward. Its rule also targets Bing.com, with query encoding, parameter order, and rule scope covered by unit tests; a Bing-default browser was not separately exercised live. Other search engines, Google country domains, and browsers were not tested.

No specific ChatGPT model was forced or identified. This verifies the real ChatGPT website's API request and response, not api.openai.com. Normal account, login, regional availability, and usage limits apply.

“Does not force web search” means the destination has only the q parameter, without hints=search. ChatGPT can still choose tools based on the question.

## Repeat

Local checks and packaging need only Node.js 20+ and Python 3:

~~~sh
npm run check
npm test
npm run package
~~~

For optional live verification, install Playwright separately and use a dedicated Linux test display with libX11 and libXtst. On a machine with xvfb-run:

~~~sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
RUN_LIVE_CHATGPT=1 xvfb-run -a node scripts/browser-e2e.cjs
RUN_LIVE_CHATGPT=1 TEST_VARIANT=keep-default xvfb-run -a node scripts/browser-e2e.cjs
~~~

The keep-default package must be built first. The harness extracts that trusted local ZIP into an isolated directory. Profiles and temporary extracted files are removed after testing. GitHub Actions runs syntax, unit, and packaging checks; it does not submit ChatGPT prompts.

The request-redirection option uses Chrome's stable [declarativeNetRequest redirect API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest). It does not rely on the developer-channel omnibox.directInput experiment. See the README for the difference in permissions and the effect on Google/Bing site searches.
