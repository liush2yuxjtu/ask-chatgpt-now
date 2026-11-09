import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildChatUrl, promptFromUrl, isAddressBarNavigation, createHandoffBroker } from "../extension/core.js";

test("empty prompts open home; question payload stays in the fragment, without native q auto-send", () => {
  for (const input of [undefined, null, "", " \n\t"]) assert.equal(buildChatUrl(input), "https://chatgpt.com/");
  for (const prompt of ["What is 19 + 23?", "C++ & C# ? # + 100%", "用繁體中文說明 🦉 café", "line 1\nline 2", "<script>alert(1)</script>", "a".repeat(10000)]) {
    const url = new URL(buildChatUrl(prompt));
    assert.equal(url.origin, "https://chatgpt.com");
    assert.equal(url.search, "?ask_chatgpt_now=1");
    assert.equal(promptFromUrl(url.href), prompt);
  }
});

test("handoffs reject foreign origins, unrelated ChatGPT paths, duplicate payloads and empty inputs", () => {
  for (const input of ["not a URL", "http://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now=hi", "https://evil.example/?ask_chatgpt_now=1#ask-chatgpt-now=hi", "https://chatgpt.com/c/123?ask_chatgpt_now=1#ask-chatgpt-now=hi", "https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now=a&ask-chatgpt-now=b", "https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now=", "https://chatgpt.com/?ask_chatgpt_now=0#ask-chatgpt-now=hi", "https://chatgpt.com/?ask_chatgpt_now=1&q=native#ask-chatgpt-now=hi", "https://chatgpt.com/?ask_chatgpt_now=1&hints=search#ask-chatgpt-now=hi"]) {
    assert.equal(promptFromUrl(input), null, input);
  }
});

const navigation = (overrides = {}) => ({
  tabId: 12, frameId: 0, documentId: "document-1",
  url: buildChatUrl("my question"), transitionType: "generated",
  transitionQualifiers: ["from_address_bar"], ...overrides
});
const sender = (overrides = {}) => ({
  tab: { id: 12 }, frameId: 0, documentId: "document-1",
  url: buildChatUrl("my question"), ...overrides
});

test("only explicit address-bar navigations authorize sending, not pages, reload or back", () => {
  assert.equal(isAddressBarNavigation(navigation()), true);
  for (const overrides of [
    { transitionType: "link", transitionQualifiers: [] },
    { transitionType: "typed" },
    { transitionType: "reload" },
    { transitionQualifiers: ["from_address_bar", "forward_back"] },
    { frameId: 7 }, { documentId: undefined }
  ]) assert.equal(isAddressBarNavigation(navigation(overrides)), false);
});

test("a handoff is consumed exactly once for its originating tab and document", () => {
  const broker = createHandoffBroker();
  broker.note(navigation());
  assert.equal(broker.claim(sender({ tab: { id: 13 } }), "my question").status, "waiting");
  assert.equal(broker.claim(sender({ documentId: "other-document" }), "my question").status, "denied");
  assert.equal(broker.claim(sender({ frameId: 2 }), "my question").status, "denied");
  assert.equal(broker.claim(sender({ url: "https://evil.example/" }), "my question").status, "denied");
  assert.equal(broker.claim(sender(), "different question").status, "denied");
  const granted = broker.claim(sender(), "my question");
  assert.equal(granted.status, "ok");
  assert.equal(granted.prompt, "my question");
  assert.equal(typeof granted.requestId, "string");
  assert.equal(broker.claim(sender(), "my question").status, "waiting");
});

test("link navigations and expired handoffs cannot submit", () => {
  let now = 0;
  const broker = createHandoffBroker(() => now);
  broker.note(navigation({ transitionType: "link", transitionQualifiers: [] }));
  assert.equal(broker.claim(sender(), "my question").status, "waiting");
  broker.note(navigation());
  now = 60001;
  assert.equal(broker.claim(sender(), "my question").status, "expired");
  assert.equal(broker.claim(sender(), "my question").status, "waiting");
});

test("new navigation or tab closure invalidates an old handoff", () => {
  const broker = createHandoffBroker();
  broker.note(navigation());
  broker.clear(12);
  assert.equal(broker.claim(sender(), "my question").status, "waiting");
  broker.note(navigation());
  broker.note(navigation({ url: "https://chatgpt.com/" }));
  assert.equal(broker.claim(sender(), "my question").status, "waiting");
});

test("manifest grants only scoped auto-send capabilities and has no popup or forced web search", () => {
  const root = new URL("../extension/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root)));
  assert.equal(manifest.version, "3.0.0");
  assert.deepEqual(manifest.permissions, ["webNavigation"]);
  assert.deepEqual(manifest.host_permissions, ["https://chatgpt.com/*"]);
  assert.equal(manifest.chrome_settings_overrides.search_provider.search_url, "https://chatgpt.com/?ask_chatgpt_now=1#ask-chatgpt-now={searchTerms}");
  assert.equal(manifest.chrome_settings_overrides.search_provider.is_default, true);
  assert.equal("action" in manifest, false);
  assert.equal("commands" in manifest, false);
  assert.equal("externally_connectable" in manifest, false);
  assert.equal("web_accessible_resources" in manifest, false);
  assert.equal(manifest.content_scripts[0].run_at, "document_start");
  assert.deepEqual(manifest.content_scripts[0].matches, ["https://chatgpt.com/*"]);
  for (const file of manifest.content_scripts[0].js) assert.ok(existsSync(new URL(file, root)));
  for (const file of Object.values(manifest.icons)) assert.ok(existsSync(new URL(file, root)));
});
