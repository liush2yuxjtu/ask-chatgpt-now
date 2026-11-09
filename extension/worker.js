import { openPrompt, popupOptions } from "./core.js";

// Register listeners at the top level so Chrome can wake the service worker.
chrome.action.onClicked.addListener((tab) => {
  chrome.windows.create(popupOptions(tab)).catch((error) => {
    console.error("Could not open ChatGPT:", error.message);
  });
});

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "<match>Ask ChatGPT</match><dim> — type your prompt, then press Enter</dim>"
  });
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  openPrompt(chrome.tabs, text, disposition).catch((error) => {
    console.error("Could not open your ChatGPT prompt:", error.message);
  });
});
