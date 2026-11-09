import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const rules = JSON.parse(readFileSync(new URL("../variants/keep-default/rules.json", import.meta.url)));
function redirect(input) {
  for (const rule of rules) {
    const match = new RegExp(rule.condition.regexFilter).exec(input);
    if (match) return rule.action.redirect.regexSubstitution.replace("\\1", match[1]);
  }
  return null;
}

test("optional search redirects preserve complete encoded prompts with reordered parameters", () => {
  const prompt = "Explain C++ & C#? 用中文 🦉 # + 100%";
  const query = new URLSearchParams({ q: prompt }).toString();
  for (const host of ["www.google.com", "google.com", "www.bing.com", "bing.com"]) {
    for (const parameters of [query, "source=chrome&" + query + "&ie=UTF-8"]) {
      const target = new URL(redirect("https://" + host + "/search?" + parameters));
      assert.equal(target.origin, "https://chatgpt.com");
      assert.equal(target.searchParams.get("q"), prompt);
      assert.deepEqual([...target.searchParams.keys()], ["q"]);
    }
  }
});

test("redirect rules are limited to Google.com/Bing.com search-page navigations", () => {
  for (const rule of rules) assert.deepEqual(rule.condition.resourceTypes, ["main_frame"]);
  for (const url of [
    "https://www.google.com/", "https://www.google.com/search?other=hello",
    "https://www.google.com/maps?q=hello", "https://example.com/search?q=hello",
    "https://www.google.com.evil.example/search?q=hello", "https://chatgpt.com/?q=hello"
  ]) assert.equal(redirect(url), null, url);
});
