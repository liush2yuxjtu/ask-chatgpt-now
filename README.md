# Ask ChatGPT Now

A tiny Chrome extension that opens **the real [ChatGPT website](https://chatgpt.com)**. No API key, subscription to the extension, backend, or build step.

- **Click the toolbar icon:** open ChatGPT in a separate compact window.
- **Use the address bar:** type `ask`, press **Tab**, type a prompt, then press **Enter**.
- **Keyboard shortcut:** **Alt+Shift+G** opens the same ChatGPT window. You can change this at `chrome://extensions/shortcuts`.

For example:

```text
ask [Tab] Explain closures in JavaScript [Enter]
```

ChatGPT receives the prompt through its `q` URL parameter and starts the conversation. Normal Enter uses the current tab. Alt+Enter requests a new foreground tab; a middle-click on the suggestion requests a background tab.

## Install in Chrome

1. [Download the extension ZIP](https://raw.githubusercontent.com/liush2yuxjtu/ask-chatgpt-now/main/downloads/ask-chatgpt-now-v1.0.0.zip) and extract it into a folder you will keep.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and choose the extracted folder containing `manifest.json`.
4. Open Chrome's extensions menu (the puzzle icon) and **pin Ask ChatGPT Now**.

If you clone this repository instead, select its **`extension/`** folder in step 3. Chrome does not directly install a downloaded ZIP by double-clicking it. Managed browsers may require an administrator to allow unpacked extensions.

The verified ZIP and its [SHA-256 checksum](downloads/SHA256SUMS.txt) are stored in [`downloads/`](downloads/).

## Use a prompt URL in another browser

No extension is required for a direct prompt link:

<https://chatgpt.com/?q=Explain%20closures%20in%20JavaScript>

Where your browser supports a custom search engine, use this URL template and assign a keyword such as `ask`:

```text
https://chatgpt.com/?q=%s
```

For Chrome, custom site searches are configured at `chrome://settings/searchEngines`. A direct URL can be opened in any browser supported by ChatGPT. This Manifest V3 extension is for desktop Chrome and compatible Chromium browsers; Firefox and Safari require their own extension packages. Other browsers were not individually tested.

## Free tier and models

The extension uses the ChatGPT website's available experience, including signed-out use where available and your existing account if you sign in. It does not choose or unlock a model. Normal ChatGPT availability, login requirements, and usage limits apply.

As checked on November 9, 2026, OpenAI's [Free tier FAQ](https://help.openai.com/en/articles/9275245-chatgpt-free-tier-faq) lists **GPT-5.6 Luna**. **GPT-6 Luna is not guaranteed by this extension.** Model names and availability can change. See also [OpenAI's current model guide](https://help.openai.com/en/articles/20001354-gpt-6-and-other-models-in-chatgpt).

This extension does not call the public OpenAI developer API and does not need an `OPENAI_API_KEY`. ChatGPT's website makes its own network requests. Website conversation verification and public developer API verification are different checks.

## Privacy

No extension permissions or website access permissions are requested. There are no content scripts, analytics, external scripts, or npm dependencies. The extension does not read chats, pages, cookies, or account credentials. It sends your prompt to ChatGPT only when you submit the address-bar command.

Prompts are included in the destination URL and may appear in browser history and history sync. ChatGPT processes them under [OpenAI's privacy policy](https://openai.com/policies/privacy-policy/).

## Development

Requires Node.js 20+ for tests and Python 3 for packaging. Installation of npm packages is unnecessary.

```sh
npm run check
npm test
npm run package
```

The ZIP is created in `dist/`, with `manifest.json` at its root. GitHub Actions runs the same checks and uploads the ZIP on pushes and pull requests.

See [verification evidence](docs/VERIFICATION.md) for the live browser results and their scope.

MIT licensed. Independent project; not affiliated with or endorsed by OpenAI.
