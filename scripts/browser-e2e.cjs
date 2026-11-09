const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const keepDefault = process.env.TEST_VARIANT === 'keep-default';
const fixtureType = process.env.TEST_PREFILL_FIXTURE;
const warmTab = process.env.TEST_WARM_TAB === '1';
if (process.env.RUN_LIVE_CHATGPT !== '1') {
  console.error('This test submits a real prompt to chatgpt.com. Run with RUN_LIVE_CHATGPT=1.');
  process.exit(2);
}
const scratch = path.join(root, 'work');
fs.mkdirSync(scratch, { recursive: true });
const profile = fs.mkdtempSync(path.join(scratch, 'browser-profile-'));
const extensionRoot = keepDefault ? fs.mkdtempSync(path.join(scratch, 'redirect-extension-')) : path.join(root, 'extension');
if (keepDefault) execFileSync('python3', ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(root, 'dist', 'ask-chatgpt-now-keep-default-v3.0.0.zip'), extensionRoot]);
const artifacts = path.join(root, 'docs', 'verification');
fs.mkdirSync(artifacts, { recursive: true });
const report = { checkedAt: new Date().toISOString(), version: '3.0.0', variant: keepDefault ? 'keep-default' : 'default-provider', browser: null, tests: [], network: [] };
report.environment = fixtureType ? 'controlled-prefilled-fixture-' + fixtureType : 'real-signed-out-chatgpt';
const native = actions => execFileSync('python3', [path.join(__dirname, 'native-x11.py'), JSON.stringify({ actions })], { env: process.env });
const pass = (name, details = {}) => {
  report.tests.push({ name, status: 'PASS', ...details });
  console.log('PASS', name, JSON.stringify(details));
};
let context;
async function prepareLinuxSearchProvider(page) {
  // Chrome documents automatic extension search-provider overrides for Windows/macOS.
  // On Linux, test the one-time manual setup through Chrome's real settings UI.
  await page.goto('chrome://settings/searchEngines');
  await page.locator('#addSearchEngine').click();
  const dialog = page.locator('settings-search-engine-edit-dialog');
  const fields = dialog.locator('cr-input input');
  await fields.nth(0).fill('ChatGPT');
  await fields.nth(1).fill('chatgpt.com');
  await fields.nth(2).fill('https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now=%s');
  await dialog.getByText('Add', { exact: true }).click();
  const entry = page.locator('settings-search-engine-entry').filter({ hasText: 'ChatGPT' });
  await entry.locator('cr-icon-button').last().click();
  await page.getByText('Make default', { exact: true }).filter({ visible: true }).click();
  report.providerSetup = { platform: process.platform, method: 'One-time Chrome settings UI: add ChatGPT and choose Make default', automaticExtensionOverrideVerified: false, reason: 'Chrome documents automatic search-provider overrides for Windows and macOS only.' };
  await page.screenshot({ path: path.join(artifacts, 'search-provider-settings.png') });
}
async function readDefaultSearchProvider(page) {
  await page.goto('chrome://settings/searchEngines');
  await page.locator('settings-search-engine-entry').first().waitFor();
  const provider = await page.locator('settings-search-engine-entry').evaluateAll(rows => rows.map(row => row.engine).find(engine => engine?.default));
  if (!provider) throw Error('Could not inspect Chrome default search provider');
  return { name: provider.name, keyword: provider.keyword, url: provider.url };
}
(async () => {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: false, viewport: null,
    args: ['--disable-extensions-except=' + extensionRoot, '--load-extension=' + extensionRoot]
  });
  report.browser = context.browser().version();
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  if (manifest.version !== report.version) throw Error('Unexpected extension version');
  if (manifest.action || manifest.commands) throw Error('Popup/toolbar action must be absent');
  if (keepDefault) {
    if (manifest.chrome_settings_overrides) throw Error('Redirect variant must preserve search settings');
    const rulesets = await worker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
    if (!rulesets.includes('search_redirects')) throw Error('Redirect rules are not enabled');
  } else {
    const provider = manifest.chrome_settings_overrides.search_provider;
    if (!provider.is_default || provider.search_url !== 'https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now={searchTerms}') throw Error('Incorrect extension handoff provider');
  }
  pass('Auto-submit extension loads with no popup action');
  await worker.evaluate(() => {
    globalThis.__e2eNavigations = [];
    const record = details => {
      if (details.frameId === 0) globalThis.__e2eNavigations.push(details);
    };
    chrome.webNavigation.onCommitted.addListener(record, { url: [{ hostEquals: 'chatgpt.com' }] });
    chrome.webNavigation.onReferenceFragmentUpdated.addListener(record, { url: [{ hostEquals: 'chatgpt.com' }] });
  });
  const errors = [];
  worker.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const page = context.pages()[0];
  await page.addInitScript(() => {
    window.__askSendStats = { clicks: 0, manualClicks: 0 };
    document.addEventListener('click', event => {
      const button = event.target.closest?.('button');
      if (button && (/^send(?: |$)|^发送|^傳送/i.test(button.getAttribute('aria-label') || '') || /^(?:composer-)?send-button$/.test(button.getAttribute('data-testid') || ''))) {
        window.__askSendStats.clicks++;
        if (event.isTrusted) window.__askSendStats.manualClicks++;
      }
    }, true);
  });
  await page.goto('about:blank');
  const cdp = await context.newCDPSession(page);
  const initialWindow = await cdp.send('Browser.getWindowForTarget');
  await cdp.send('Browser.setWindowBounds', { windowId: initialWindow.windowId, bounds: { left: 10, top: 10, width: 1200, height: 900 } });
  let defaultBefore;
  if (keepDefault) {
    defaultBefore = await readDefaultSearchProvider(page);
    report.providerSetup = { platform: process.platform, method: 'No search settings changed; original Google default retained', originalDefault: defaultBefore };
    if (!defaultBefore.keyword.includes('google.com')) throw Error('Expected fresh profile with Google as default');
  } else if (process.platform === 'linux') await prepareLinuxSearchProvider(page);
  else report.providerSetup = { platform: process.platform, method: 'Extension search-provider override; routing verified below' };
  await page.goto('about:blank');
  await page.bringToFront();
  if (warmTab) {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
    await page.locator('#prompt-textarea, #mobile-composer-prompt').first().waitFor({ state: 'visible' });
  }
  const initialTabs = await worker.evaluate(() => chrome.tabs.query({ active: true, currentWindow: true }));
  const initialWindows = await worker.evaluate(() => chrome.windows.getAll());
  let newPages = 0;
  context.on('page', () => { newPages++; });
  const nonce = crypto.randomBytes(5).toString('hex').toUpperCase();
  const expected = 'ASK_CHATGPT_NOW_V3_' + nonce + '_42';
  const prompt = 'Calculate 19 plus 23. Reply with exactly ASK_CHATGPT_NOW_V3_' + nonce + '_ followed by the answer, with no spaces.';
  if (fixtureType) {
    const fixture = require('./prefill-fixture.cjs')(prompt, expected, fixtureType);
    await context.route('https://chatgpt.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: fixture }));
  }
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.hostname === 'chatgpt.com' && /\/(?:backend-api|backend-anon|unauth-mweb)\/conversation(?:\/|$)/.test(url.pathname)) {
      report.network.push({ method: response.request().method(), path: url.pathname, status: response.status(), contentType: response.headers()['content-type'] });
      console.log('NETWORK', response.request().method(), url.pathname, response.status());
    }
  });
  // One typed prompt and one Enter: no keyword, Tab, composer input or second send.
  native([{ keys: ['Control_L', 'l'] }, { text: prompt }, { keys: ['Return'] }]);
  await page.waitForURL(url => url.origin === 'https://chatgpt.com', { timeout: 45000, waitUntil: 'domcontentloaded' });
  let navigation;
  for (let attempt = 0; attempt < 200; attempt++) {
    navigation = await worker.evaluate(prompt => globalThis.__e2eNavigations?.find(details => new URLSearchParams(new URL(details.url).hash.slice(1)).get('ask-chatgpt-now') === prompt), prompt);
    if (navigation) break;
    await page.waitForTimeout(50);
  }
  if (!navigation || new URLSearchParams(new URL(navigation.url).hash.slice(1)).get('ask-chatgpt-now') !== prompt) throw Error('Native handoff did not preserve the prompt');
  const url = new URL(navigation.url);
  if (url.searchParams.get('ask_chatgpt_now') !== '1' || [...url.searchParams.keys()].some(key => key !== 'ask_chatgpt_now')) throw Error('Native q auto-send or search/model parameter is present');
  pass('Plain address-bar prompt plus one Enter creates a browser-authorized handoff', { prompt, submittedUrl: navigation.url, transitionType: navigation.transitionType, transitionQualifiers: navigation.transitionQualifiers, keywordUsed: false, tabKeyUsed: false });
  pass('Fragment handoff avoids native q auto-send and forced web search', { queryParameters: ['ask_chatgpt_now'], flagCarriesPrompt: false });
  await page.getByText(expected, { exact: true }).waitFor({ timeout: 60000 });
  const reply = await page.getByText(expected, { exact: true }).innerText();
  if (reply.trim() !== expected) throw Error('Unexpected live reply: ' + reply);
  if (!fixtureType && !report.network.some(request => request.method === 'POST' && request.status === 200 && /conversation(?:\/updates)?\/?$/.test(request.path))) throw Error('No successful live conversation POST observed');
  const send = await page.evaluate(() => window.__askSendStats);
  if (send.clicks !== 1 || send.manualClicks !== 0) throw Error('Expected exactly one extension Send click: ' + JSON.stringify(send));
  if (fixtureType) {
    const submissions = await page.evaluate(() => window.fixtureSends);
    if (submissions !== 1) throw Error('Expected one fixture submission');
    pass('Prefilled composer is sent once after hydration without manual Send', { editor: fixtureType, submissions, extensionSendClicks: send.clicks, manualSendClicks: send.manualClicks, realChatGPTAPI: false });
  } else pass('Extension clicks Send once and a real ChatGPT conversation returns the answer', { expected, reply, extensionSendClicks: send.clicks, manualSendClicks: send.manualClicks, harnessComposerInteractions: 0, signedIn: false, publicOpenAIAPI: false });
  const finalTabs = await worker.evaluate(() => chrome.tabs.query({ active: true, currentWindow: true }));
  const finalWindows = await worker.evaluate(() => chrome.windows.getAll());
  if (finalTabs[0].id !== initialTabs[0].id || newPages !== 0) throw Error('The input opened another tab');
  if (finalWindows.length !== initialWindows.length || finalWindows.some(window => window.type === 'popup')) throw Error('The input opened a popup or additional window');
  pass('Answer stays in the original tab with no popup or additional window', { tabId: finalTabs[0].id, newTabs: newPages, windows: finalWindows.length });
  await page.screenshot({ path: path.join(artifacts, fixtureType ? 'prefill-fixture-' + fixtureType + '.png' : keepDefault ? 'live-chatgpt-keep-default.png' : 'live-chatgpt.png') });
  if (fixtureType) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    if (await page.evaluate(() => window.fixtureSends) !== 0) throw Error('Reload replayed the prompt');
    pass('Reload does not send the prefilled draft again');
  }
  if (keepDefault) {
    const defaultAfter = await readDefaultSearchProvider(page);
    if (JSON.stringify(defaultBefore) !== JSON.stringify(defaultAfter)) throw Error('The browser default search provider changed');
    pass('Original Google search provider is unchanged before and after the live prompt', { before: defaultBefore, after: defaultAfter });
  }
  if (errors.length) throw Error('Extension errors: ' + errors.join('; '));
  pass('No extension service worker errors');
  report.status = 'PASS';
  report.note = 'Real signed-out ChatGPT UI: the extension, not native q behavior, fills the composer and clicks Send. The harness only types in the address bar. This does not verify the user signed-in session. Linux main-provider setup is manual; Windows/macOS automatic overrides were not tested.';
  if (fixtureType) report.note = 'Controlled browser fixture for prefilled-but-unsent textarea/contenteditable state. It is not an authenticated ChatGPT session and makes no real ChatGPT API call. Live website evidence is in the separate non-fixture reports.';
  report.extensionFilesSha256 = Object.fromEntries(fs.readdirSync(extensionRoot, { recursive: true })
    .filter(file => !file.startsWith('_metadata' + path.sep) && fs.statSync(path.join(extensionRoot, file)).isFile()).sort()
    .map(file => [file.split(path.sep).join('/'), crypto.createHash('sha256').update(fs.readFileSync(path.join(extensionRoot, file))).digest('hex')]));
  if (warmTab) report.warmTab = true;
  fs.writeFileSync(path.join(artifacts, fixtureType ? 'browser-results-prefill-' + fixtureType + '.json' : keepDefault ? 'browser-results-keep-default.json' : warmTab ? 'browser-results-warm-tab.json' : 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('E2E PASS');
})().catch(async error => {
  report.status = 'FAIL';
  report.error = error.message;
  console.error('E2E FAIL:', error.message);
  fs.writeFileSync(path.join(scratch, 'e2e-failure.json'), JSON.stringify(report, null, 2));
  for (const [i, page] of (context?.pages() || []).entries()) {
    try {
      console.error('PAGE', i, page.url(), (await page.locator('body').innerText()).slice(0, 3000));
      console.error('AUTO-SUBMIT STATUS', await page.evaluate(() => document.documentElement.dataset.askChatgptNow));
      await page.screenshot({ path: path.join(scratch, 'failure-' + i + '.png') });
    } catch {}
  }
  process.exitCode = 1;
}).finally(async () => { if (context) await context.close(); fs.rmSync(profile, { recursive: true, force: true }); if (keepDefault) fs.rmSync(extensionRoot, { recursive: true, force: true }); });
