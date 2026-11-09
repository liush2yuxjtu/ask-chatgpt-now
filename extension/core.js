export const HANDOFF_KEY = "ask-chatgpt-now";

export function buildChatUrl(text = "") {
  const prompt = String(text ?? "").trim();
  const url = new URL("https://chatgpt.com/");
  if (prompt) {
    url.searchParams.set("ask_chatgpt_now", "1");
    url.hash = new URLSearchParams({ [HANDOFF_KEY]: prompt }).toString();
  }
  return url.href;
}

export function promptFromUrl(input) {
  try {
    const url = new URL(input);
    if (url.origin !== "https://chatgpt.com" || url.pathname !== "/") return null;
    if (url.searchParams.getAll("ask_chatgpt_now").length !== 1 || url.searchParams.get("ask_chatgpt_now") !== "1" || url.searchParams.has("q") || url.searchParams.has("hints")) return null;
    const parameters = new URLSearchParams(url.hash.slice(1));
    if (parameters.getAll(HANDOFF_KEY).length !== 1) return null;
    const prompt = parameters.get(HANDOFF_KEY);
    return prompt?.trim() ? prompt : null;
  } catch { return null; }
}

export function isAddressBarNavigation(details) {
  if (details.frameId !== 0 || !details.documentId) return false;
  const qualifiers = details.transitionQualifiers || [];
  if (qualifiers.includes("forward_back") || details.transitionType === "reload") return false;
  return qualifiers.includes("from_address_bar") &&
    ["generated", "keyword", "keyword_generated"].includes(details.transitionType);
}

export function createHandoffBroker(now = Date.now) {
  const pending = new Map();
  return {
    note(details) {
      if (details.frameId !== 0) return;
      pending.delete(details.tabId);
      const prompt = promptFromUrl(details.url);
      if (!prompt || !isAddressBarNavigation(details)) return;
      pending.set(details.tabId, {
        prompt, documentId: details.documentId, createdAt: now(),
        requestId: crypto.randomUUID()
      });
    },
    claim(sender, prompt) {
      if (sender.frameId !== 0 || !sender.tab || !sender.documentId) return { status: "denied" };
      if (new URL(sender.url || "about:blank").origin !== "https://chatgpt.com") return { status: "denied" };
      const request = pending.get(sender.tab.id);
      if (!request) return { status: "waiting" };
      if (now() - request.createdAt > 60000) {
        pending.delete(sender.tab.id);
        return { status: "expired" };
      }
      if (request.documentId !== sender.documentId || request.prompt !== prompt) return { status: "denied" };
      // Synchronous consumption prevents two content-script claims from sending twice.
      pending.delete(sender.tab.id);
      return { status: "ok", prompt: request.prompt, requestId: request.requestId };
    },
    clear(tabId) { pending.delete(tabId); }
  };
}
