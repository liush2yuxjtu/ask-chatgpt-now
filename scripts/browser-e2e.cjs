const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
if (process.env.RUN_LIVE_CHATGPT !== '1') {
  console.error('This test submits a real prompt to chatgpt.com. Run with RUN_LIVE_CHATGPT=1.');
  process.exit(2);
}
const scratch = path.join(root, 'work');
fs.mkdirSync(scratch, { recursive: true });
const profile = fs.mkdtempSync(path.join(scratch, 'browser-profile-'));
const artifacts = path.join(root, 'docs', 'verification');
fs.mkdirSync(artifacts, { recursive: true });
const report = { checkedAt: new Date().toISOString(), browser: null, tests: [], network: [] };
const native = (actions, extra = {}) => execFileSync('python3', [path.join(__dirname, 'native-x11.py'), JSON.stringify({ actions, ...extra })], { env: process.env });
const pass = (name, details) => { report.tests.push({ name, status: 'PASS', ...details }); console.log('PASS', name, JSON.stringify(details || {})); };
let context;

(async () => {
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: false,
    viewport: null,
    args: [ `--disable-extensions-except=${root}/extension`, `--load-extension=${root}/extension`]
  });
  report.browser = context.browser().version();
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  if (manifest.name !== 'Ask ChatGPT Now') throw Error('Extension failed to load');
  pass('Manifest V3 extension loads in real Chromium', { extensionId: new URL(worker.url()).host });
  const errors = [];
  worker.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const page = context.pages()[0];
  await page.goto('about:blank');
  const browserCDP = await context.newCDPSession(page);
  const initialWindow = await browserCDP.send('Browser.getWindowForTarget');
  await browserCDP.send('Browser.setWindowBounds', {
    windowId: initialWindow.windowId,
    bounds: { left: 10, top: 10, width: 1200, height: 900 }
  });
  await page.bringToFront();
  const nonce = crypto.randomBytes(5).toString('hex').toUpperCase();
  const expected = `ASK_CHATGPT_NOW_${nonce}_42`;
  const prompt = `Calculate 19 plus 23. Reply with exactly ASK_CHATGPT_NOW_${nonce}_ followed by the answer, with no spaces.`;
  page.on('response', response => {
    const u = new URL(response.url());
    if (u.hostname === 'chatgpt.com' && /\/(?:backend-api|backend-anon|unauth-mweb)\/conversation(?:\/|$)/.test(u.pathname)) {
      report.network.push({ method: response.request().method(), path: u.pathname, status: response.status(), contentType: response.headers()['content-type'] });
      console.log('NETWORK', response.request().method(), u.pathname, response.status());
    }
  });
  native([{ keys: ['Control_L', 'l'] }, { text: 'ask' }, { keys: ['Tab'] }, { text: prompt }, { keys: ['Return'] }]);
  await page.waitForURL(url => url.origin === 'https://chatgpt.com', { timeout: 45000, waitUntil: 'domcontentloaded' });
  pass('Native ask + Tab + prompt + Enter opens chatgpt.com', { prompt });
  await page.getByText(expected, { exact: true }).waitFor({ timeout: 60000 });
  const reply = await page.getByText(expected, { exact: true }).innerText();
  if (reply.trim() !== expected) throw Error(`Unexpected live reply: ${reply}`);
  if (!report.network.some(request => request.method === 'POST' && request.status === 200 && /conversation(?:\/updates)?\/?$/.test(request.path))) throw Error('No successful live conversation POST observed');
  pass('Live ChatGPT website conversation POST returns a real assistant reply', { expected, reply, signedIn: false, publicOpenAIAPI: false });
  fs.mkdirSync(path.join(root, 'docs', 'verification'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'docs', 'verification', 'live-chatgpt.png') });
  const mainCDP = await context.newCDPSession(page);
  const mainWindow = await mainCDP.send('Browser.getWindowForTarget');
  await page.bringToFront();
  const popupPromise = context.waitForEvent('page', { timeout: 15000 });
  native([{ keys: ['Alt_L', 'Shift_L', 'g'] }]);
  const popup = await popupPromise;
  await popup.waitForURL('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  const cdp = await context.newCDPSession(popup);
  const target = await cdp.send('Target.getTargetInfo');
  const window = await cdp.send('Browser.getWindowForTarget', { targetId: target.targetInfo.targetId });
  if (window.windowId === mainWindow.windowId) throw Error('Popup reused the main browser window');
  const windows = await worker.evaluate(() => chrome.windows.getAll());
  if (!windows.some(w => w.type === 'popup' && w.width === 520 && w.height === 760)) throw Error('Expected a separate 520 by 760 popup');
  pass('Native toolbar action shortcut opens a separate ChatGPT popup window', { url: popup.url(), bounds: window.bounds });
  await popup.waitForTimeout(1500);
  await popup.screenshot({ path: path.join(root, 'docs', 'verification', 'popup-chatgpt.png') });
  if (process.env.VERIFY_MOUSE === '1') {
    await popup.close();
    await page.bringToFront();
    console.log('READY_FOR_NATIVE_MOUSE: click the extension action in the browser toolbar/extensions menu.');
    const mousePopup = await context.waitForEvent('page', { timeout: 120000 });
    await mousePopup.waitForURL('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    pass('Native mouse click on the extension action opens ChatGPT in a popup', { url: mousePopup.url() });
    await mousePopup.waitForTimeout(1500);
    await mousePopup.screenshot({ path: path.join(root, 'docs', 'verification', 'mouse-popup-chatgpt.png') });
  }
  if (errors.length) throw Error('Extension errors: ' + errors.join('; '));
  pass('No extension service worker errors', {});
  report.status = 'PASS';
  report.note = 'Tests use the actual ChatGPT website in a fresh signed-out browser profile, not the public OpenAI developer API. No model is forced or inferred from the reply.';
  fs.writeFileSync(path.join(root, 'docs', 'verification', 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('E2E PASS');
})().catch(async error => {
  report.status = 'FAIL';
  report.error = error.message;
  console.error('E2E FAIL:', error.message);
  fs.writeFileSync(path.join(scratch, 'e2e-failure.json'), JSON.stringify(report, null, 2));
  for (const [i, page] of (context?.pages() || []).entries()) {
    try { console.error('PAGE', i, page.url(), (await page.locator('body').innerText()).slice(0,5000)); await page.screenshot({path:path.join(scratch, `failure-${i}.png`)}); } catch {}
  }
  process.exitCode = 1;
}).finally(async () => { if (context) await context.close(); fs.rmSync(profile, { recursive: true, force: true }); });
