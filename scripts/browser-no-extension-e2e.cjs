const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
if (process.env.RUN_LIVE_CHATGPT !== '1') {
  console.error('Run with RUN_LIVE_CHATGPT=1 to submit a real ChatGPT website prompt.');
  process.exit(2);
}
const root = path.resolve(__dirname, '..');
const work = path.join(root, 'work');
const artifacts = path.join(root, 'docs', 'verification');
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(artifacts, { recursive: true });
const profile = fs.mkdtempSync(path.join(work, 'no-extension-profile-'));
const report = { checkedAt: new Date().toISOString(), browser: null, extensionLoaded: false, tests: [], network: [] };
const pass = (name, details = {}) => { report.tests.push({ name, status: 'PASS', ...details }); console.log('PASS', name); };
let context;
(async () => {
  context = await chromium.launchPersistentContext(profile, { channel: 'chromium', headless: false, viewport: null });
  report.browser = context.browser().version();
  if (context.serviceWorkers().length) throw Error('Unexpected service worker in fresh browser');
  const page = context.pages()[0];
  await page.goto('about:blank');
  const cdp = await context.newCDPSession(page);
  const originalWindow = await cdp.send('Browser.getWindowForTarget');
  await cdp.send('Browser.setWindowBounds', { windowId: originalWindow.windowId, bounds: { left: 10, top: 10, width: 1200, height: 900 } });
  await page.goto('chrome://settings/searchEngines');
  await page.locator('#addSearchEngine').click();
  const dialog = page.locator('settings-search-engine-edit-dialog');
  const fields = dialog.locator('cr-input input');
  await fields.nth(0).fill('ChatGPT');
  await fields.nth(1).fill('gpt');
  await fields.nth(2).fill('https://chatgpt.com/?q=%s');
  await dialog.getByText('Add', { exact: true }).click();
  const entry = page.locator('settings-search-engine-entry').filter({ hasText: 'ChatGPT' });
  await entry.locator('cr-icon-button').last().click();
  await page.getByText('Make default', { exact: true }).filter({ visible: true }).click();
  const provider = await page.locator('settings-search-engine-entry').evaluateAll(rows => rows.map(row => row.engine).find(engine => engine?.default));
  if (provider.name !== 'ChatGPT' || provider.url !== 'https://chatgpt.com/?q=%s') throw Error('Incorrect browser default search configuration');
  pass('Chrome built-in provider configured once, without installing an extension', { name: provider.name, keyword: provider.keyword, url: provider.url });
  await page.screenshot({ path: path.join(artifacts, 'no-extension-settings.png') });
  await page.goto('about:blank');
  await page.bringToFront();
  let newPages = 0;
  context.on('page', () => { newPages++; });
  const nonce = crypto.randomBytes(5).toString('hex').toUpperCase();
  const expected = 'NO_EXTENSION_' + nonce + '_42';
  const prompt = 'Calculate 19 plus 23. Reply with exactly NO_EXTENSION_' + nonce + '_ followed by the answer, without spaces.';
  let submittedUrl;
  page.on('request', request => {
    const url = new URL(request.url());
    if (request.isNavigationRequest() && url.hostname === 'chatgpt.com' && url.searchParams.has('q')) submittedUrl = url.href;
  });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.hostname === 'chatgpt.com' && /\/(?:backend-api|backend-anon|unauth-mweb)\/conversation(?:\/|$)/.test(url.pathname)) {
      report.network.push({ method: response.request().method(), path: url.pathname, status: response.status() });
    }
  });
  execFileSync('python3', [path.join(__dirname, 'native-x11.py'), JSON.stringify({ actions: [{ keys: ['Control_L', 'l'] }, { text: prompt }, { keys: ['Return'] }] })], { env: process.env });
  await page.waitForURL(url => url.origin === 'https://chatgpt.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const url = new URL(submittedUrl);
  if (url.searchParams.get('q') !== prompt || [...url.searchParams.keys()].some(key => key !== 'q')) throw Error('Prompt changed or search mode was forced');
  pass('One native address-bar prompt plus one Enter opens normal ChatGPT chat', { prompt, submittedUrl, webSearchForced: false });
  await page.getByText(expected, { exact: true }).waitFor({ timeout: 60000 });
  const reply = await page.getByText(expected, { exact: true }).innerText();
  if (reply.trim() !== expected) throw Error('Incorrect real reply');
  if (!report.network.some(request => request.method === 'POST' && request.status === 200 && /conversation(?:\/updates)?\/?$/.test(request.path))) throw Error('No successful real conversation request');
  pass('ChatGPT automatically answers the prompt with a real HTTP 200 conversation response', { reply, composerInteractions: 0, publicOpenAIAPI: false });
  const finalWindow = await cdp.send('Browser.getWindowForTarget');
  if (newPages !== 0 || context.pages().length !== 1 || finalWindow.windowId !== originalWindow.windowId) throw Error('Unexpected new tab or window');
  pass('Same tab and window, with no popup or additional prompt', { newTabs: newPages, windows: 1 });
  await page.screenshot({ path: path.join(artifacts, 'no-extension-chatgpt.png') });
  report.status = 'PASS';
  fs.writeFileSync(path.join(artifacts, 'browser-results-no-extension.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('NO-EXTENSION E2E PASS');
})().catch(async error => {
  console.error(error.message);
  if (context?.pages()[0]) await context.pages()[0].screenshot({ path: path.join(work, 'no-extension-failure.png') }).catch(() => {});
  process.exitCode = 1;
}).finally(async () => { if (context) await context.close(); fs.rmSync(profile, { recursive: true, force: true }); });
