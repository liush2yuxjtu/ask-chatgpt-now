# v3 verification — actual Send action

v3 no longer depends on native ChatGPT q-query auto-submit. The extension receives a browser-authorized fragment handoff, fills the composer, and clicks Send once.

## Recorded verification of the public download

The [latest browser report](verification/browser-verification-latest.json) records a fresh headed-browser run of the publicly downloadable v3 ZIP, including its SHA-256. It starts with ChatGPT already open, uses native address-bar keystrokes and one Enter, observes one extension Send click and zero manual Send clicks, and receives the expected real reply with conversation HTTP 200.

- [Native Chrome recording (MP4)](verification/browser-verification.mp4)
- [Native Chrome screenshot](verification/browser-verification.png)

Login controls were observed both before and after this run. **The browser was signed out.** This recording is not signed-in-account evidence. The recording covers the actual address-bar submission and reply; there are no mocked responses in this run. It does not establish that the user's authenticated session has passed.

## Real website runs

- [Main build](verification/browser-results.json)
- [Keep-default build](verification/browser-results-keep-default.json)
- [Already-open ChatGPT tab](verification/browser-results-warm-tab.json)

Both runs used a fresh **signed-out** Chrome for Testing 151.0.7922.34 browser with the actual ChatGPT website. The harness typed only in Chrome's native address bar and pressed Enter once. It did not fill the ChatGPT composer or click Send.

| Check | Main | Keep-default |
| --- | --- | --- |
| Browser reports generated navigation from address bar | PASS | PASS |
| Handoff preserves prompt without native q auto-submit | PASS | PASS |
| Extension Send clicks observed in page | 1 | 1 |
| Trusted/manual Send clicks | 0 | 0 |
| Actual conversation POST | HTTP 200 | HTTP 200 |
| Unique marker plus correct 19 + 23 answer | PASS | PASS |
| Original tab retained; no popup or additional window | PASS | PASS |
| Original Google provider preserved | Not applicable | PASS |

The successful live endpoints included POST /unauth-mweb/conversation/prepare and POST /unauth-mweb/conversation/updates. These are ChatGPT website requests, not the public OpenAI developer API.

The already-open-tab run also passed with one extension Send click and a real reply. A constant ask_chatgpt_now=1 query flag forces a new document instead of letting an existing page's hash router consume the handoff. The extension removes that flag and the prompt fragment before sending. The flag contains no prompt, native q auto-submit is not used, and no hints=search parameter is present.

## Prefilled-but-unsent regression cases

These tests use **controlled browser fixtures, not a logged-in ChatGPT account and not real API responses**:

- [Prefilled textarea report](verification/browser-results-prefill-textarea.json)
- [Prefilled contenteditable report](verification/browser-results-prefill-rich.json)

Both layouts begin with the exact prompt already present and with native URL auto-submit absent. The Send button becomes enabled after hydration. Each case passed:

1. The extension waited until ready and clicked Send exactly once.
2. No manual Send click or second prompt entry occurred.
3. Reloading did not replay the pending prompt.
4. The original browser tab and window remained.

Fixtures are visibly labeled as controlled test pages in their screenshots. Their reports set realChatGPTAPI to false. They must not be cited as proof that an authenticated ChatGPT session was tested.

## Unit and package checks

All **9 unit tests** and syntax checks passed. Tests cover payload encoding, narrow origin/path parsing, rejecting links/typed URLs/reload/back/iframes, document and tab matching, single-use claims, expiry, and Google/Bing redirect query preservation.

Release archives are compared file-by-file with SHA-256 hashes from the corresponding real browser runs. Chrome-generated DNR index caches are not shipped or counted as source files.

## Screenshots

- [Real main-build answer](verification/live-chatgpt.png)
- [Real keep-default answer](verification/live-chatgpt-keep-default.png)
- [Controlled prefilled textarea](verification/prefill-fixture-textarea.png)
- [Controlled prefilled contenteditable](verification/prefill-fixture-rich.png)

## What remains unverified

No real signed-in account is available to this environment. These results do not establish that the reporting user's authenticated session, every account rollout, every model, or every ChatGPT UI version has passed.

The main build was exercised on Linux after a one-time custom search-provider setup through Chrome's real settings UI. Windows/macOS automatic extension search overrides were not tested. Bing redirect patterns have unit coverage; a Bing-default browser was not separately exercised live.

The previous no-extension and v2 evidence records historical signed-out behavior. It does not justify a universal no-second-click claim and is superseded by the v3 approach.

## Repeat

~~~sh
npm run check
npm test
npm run package
~~~

Install Playwright separately and use a dedicated test display with libX11/libXtst. The following commands require xvfb-run; another isolated X11 display can be used instead.

~~~sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
RUN_LIVE_CHATGPT=1 xvfb-run -a node scripts/browser-e2e.cjs
RUN_LIVE_CHATGPT=1 TEST_VARIANT=keep-default xvfb-run -a node scripts/browser-e2e.cjs
RUN_LIVE_CHATGPT=1 TEST_WARM_TAB=1 xvfb-run -a node scripts/browser-e2e.cjs
RUN_LIVE_CHATGPT=1 TEST_PREFILL_FIXTURE=textarea xvfb-run -a node scripts/browser-e2e.cjs
RUN_LIVE_CHATGPT=1 TEST_PREFILL_FIXTURE=rich xvfb-run -a node scripts/browser-e2e.cjs
~~~

The two fixture commands mock only the page for regression coverage and do not make real ChatGPT API calls. The two non-fixture commands use the live website. GitHub Actions checks syntax, units, and packaging without sending ChatGPT prompts.
