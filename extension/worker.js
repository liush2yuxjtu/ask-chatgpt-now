import { openPrompt } from "./core.js";

// Register listeners at the top level so Chrome can wake the service worker.
chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "<match>Ask ChatGPT</match><dim> — press Enter to submit in this tab</dim>"
  });
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  openPrompt(chrome.tabs, text, disposition).catch((error) => {
    console.error("Could not open your ChatGPT prompt:", error.message);
  });
});
