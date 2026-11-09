# Verification

**Local checks and live browser E2E: PASS.** See the timestamp, browser version, individual checks, and sanitized network evidence in [browser-results.json](verification/browser-results.json).

The extension was loaded in Google's Chrome for Testing 151.0.7922.34 through Playwright 1.62.1, using an isolated Linux X11 display and a signed-out browser profile. Native X11 input operated Chrome's actual address bar, shortcut, extensions menu, pin button, and toolbar icon. ChatGPT was not mocked, and there were no content scripts or injected prompt-submission scripts.

| Check | Result |
| --- | --- |
| JavaScript syntax checks | PASS |
| All 5 Node unit tests | PASS |
| Manifest V3 extension loads and service worker runs | PASS |
| `ask` → Tab → prompt → Enter navigates to ChatGPT | PASS |
| Real ChatGPT website conversation request returns HTTP 200 | PASS |
| Real assistant reply contains the unique marker and correct arithmetic answer | PASS |
| Alt+Shift+G opens a separate ChatGPT popup | PASS |
| Popup dimensions are 520 × 760 | PASS |
| Mouse click on the pinned extension icon opens ChatGPT | PASS |
| No extension service worker errors during the run | PASS |
| ZIP integrity and installable manifest at archive root | PASS |

The live test asked ChatGPT to calculate **19 plus 23** and return a freshly generated random marker followed by the answer. The reply matched the expected marker and **42** exactly. The website made these real requests:

```text
POST https://chatgpt.com/unauth-mweb/conversation/prepare  → 200
POST https://chatgpt.com/unauth-mweb/conversation/updates  → 200
```

The updates response used `application/vnd.openai.conversation-source+ndjson`. Only response status, path, content type, and the non-sensitive test prompt/reply were retained; cookies, credentials, request headers, browser profiles, and full network logs are not included.

- [Live ChatGPT answer screenshot](verification/live-chatgpt.png)
- [Popup screenshot](verification/popup-chatgpt.png)
- [Popup after an actual toolbar mouse click](verification/mouse-popup-chatgpt.png)

## Scope

This verifies a real **ChatGPT website conversation**, including its live network request. The extension does not call `api.openai.com`; a public OpenAI developer API call was neither required nor run. No specific model was forced, and a model name cannot be proven from the answer text. The test used signed-out access and does not establish model access for a particular paid or Free account.

Other browsers, managed Chrome policies, account-specific login gates, and every possible regional or usage-limit condition were not tested. The direct `?q=` link relies on ChatGPT's website behavior and may need updating if that behavior changes. A managed browser may block unpacked extensions; the original managed browser's policies were not changed for these tests.

## Repeat the checks

Local checks have no npm dependencies:

```sh
npm run check
npm test
npm run package
```

The optional live E2E harness uses Playwright, Python 3, and Linux X11 libraries (`libX11` and `libXtst`). Install the test tooling separately and use a dedicated test display. For a machine with `xvfb-run` available:

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
RUN_LIVE_CHATGPT=1 xvfb-run -a node scripts/browser-e2e.cjs
```

`RUN_LIVE_CHATGPT=1` explicitly enables submitting a real test prompt to ChatGPT. The script creates an isolated profile under the ignored `work/` directory and removes it after the run. It uses Playwright's Chromium channel as recommended in the [official extension testing guide](https://playwright.dev/docs/chrome-extensions).

For the additional mouse test, set `VERIFY_MOUSE=1`. The script prints `READY_FOR_NATIVE_MOUSE`; pin and click the extension in that dedicated test browser within two minutes. It then checks the newly opened popup and saves the result. The checked-in report includes this test.

GitHub Actions is configured for syntax, unit, and packaging checks. The live browser test is run separately and does not submit ChatGPT prompts from CI.
