import { createHandoffBroker } from "./core.js";

const broker = createHandoffBroker();
const filter = { url: [{ schemes: ["https"], hostEquals: "chatgpt.com" }] };

// Chrome's navigation metadata, not a page-controlled event, authorizes sending.
chrome.webNavigation.onCommitted.addListener(details => broker.note(details), filter);
chrome.webNavigation.onReferenceFragmentUpdated.addListener(details => broker.note(details), filter);
chrome.tabs.onRemoved.addListener(tabId => broker.clear(tabId));

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== "ASK_CHATGPT_NOW_CLAIM") return false;
  respond(broker.claim(sender, message.prompt));
  return false;
});
