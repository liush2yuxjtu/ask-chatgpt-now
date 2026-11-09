/** A fixed destination prevents a prompt from becoming an arbitrary URL. */
export function buildChatUrl(text = "") {
  const prompt = String(text ?? "").trim();
  const url = new URL("https://chatgpt.com/");
  if (prompt) url.searchParams.set("q", prompt);
  return url.href;
}

export function popupOptions(tab) {
  return {
    url: buildChatUrl(),
    type: "popup",
    width: 520,
    height: 760,
    focused: true,
    ...(tab?.incognito ? { incognito: true } : {})
  };
}

/** Respect Enter, Alt+Enter, and middle-click's requested destination. */
export async function openPrompt(tabs, text, disposition = "currentTab") {
  const url = buildChatUrl(text);
  if (disposition === "newForegroundTab" || disposition === "newBackgroundTab") {
    return tabs.create({ url, active: disposition === "newForegroundTab" });
  }
  return tabs.update({ url });
}
