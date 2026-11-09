import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { buildChatUrl, openPrompt, popupOptions } from "../extension/core.js";

test("empty prompts open the ChatGPT home page", () => {
  for (const input of [undefined, null, "", "  \n\t"]) {
    assert.equal(buildChatUrl(input), "https://chatgpt.com/");
  }
});

test("prompt text round-trips without changing query parameters or origin", () => {
  for (const prompt of [
    "What is 19 + 23?",
    "Explain C++ & C# / a=b? #hello + 100%",
    "用繁體中文說明 🦉 — café",
    "First line\nSecond line\n\tcode()",
    "https://example.com/?q=hello&model=other#fragment",
    "<script>alert('hello')</script>",
    "a".repeat(10000)
  ]) {
    const url = new URL(buildChatUrl(prompt));
    assert.equal(url.origin, "https://chatgpt.com");
    assert.equal(url.pathname, "/");
    assert.equal(url.searchParams.get("q"), prompt);
    assert.deepEqual([...url.searchParams.keys()], ["q"]);
    assert.equal(url.hash, "");
  }
});

test("popup opens a real website window and preserves incognito context", () => {
  const regular = popupOptions({ incognito: false });
  assert.equal(regular.url, "https://chatgpt.com/");
  assert.equal(regular.type, "popup");
  assert.equal(regular.focused, true);
  assert.equal("incognito" in regular, false);
  assert.equal(popupOptions({ incognito: true }).incognito, true);
});

test("omnibox respects current, foreground, and background destinations", async () => {
  const calls = [];
  const tabs = {
    update: async (options) => calls.push(["update", options]),
    create: async (options) => calls.push(["create", options])
  };
  await openPrompt(tabs, "Hello & goodbye");
  await openPrompt(tabs, "Hello & goodbye", "newForegroundTab");
  await openPrompt(tabs, "Hello & goodbye", "newBackgroundTab");
  const url = buildChatUrl("Hello & goodbye");
  assert.deepEqual(calls, [
    ["update", { url }],
    ["create", { url, active: true }],
    ["create", { url, active: false }]
  ]);
});

test("manifest has no site access, API keys, content scripts, or elevated permissions", () => {
  const root = new URL("../extension/", import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", root)));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.omnibox.keyword, "ask");
  for (const key of ["permissions", "host_permissions", "optional_permissions", "content_scripts", "externally_connectable"]) {
    assert.equal(key in manifest, false, key);
  }
  assert.equal(manifest.background.type, "module");
  assert.ok(existsSync(new URL(manifest.background.service_worker, root)));
  for (const path of Object.values(manifest.icons)) assert.ok(existsSync(new URL(path, root)));
  assert.equal("default_popup" in manifest.action, false);
});
