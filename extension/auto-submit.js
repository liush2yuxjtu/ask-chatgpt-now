(() => {
  if (window.top !== window || globalThis.__askChatGPTNowV3) return;
  globalThis.__askChatGPTNowV3 = true;
  const KEY = "ask-chatgpt-now";
  const EDITOR = '#prompt-textarea, #mobile-composer-prompt, [data-mobile-composer-prompt], [data-testid="composer-text-input"]';
  const SEND = 'button[data-testid="send-button"], button[data-testid="composer-send-button"], button#composer-submit-button, button[aria-label="Send prompt"], button[aria-label="Send message"], button[aria-label="Send"], button[aria-label="发送消息"], button[aria-label="发送提示"], button[aria-label="傳送訊息"]';
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const visible = element => element && element.getClientRects().length > 0 && !element.hidden;
  const read = element => ("value" in element ? element.value : element.innerText || element.textContent || "").replace(/\r\n/g, "\n").trim();
  let run;

  function status(value, message) {
    if (document.documentElement) document.documentElement.dataset.askChatgptNow = value;
    if (!message || !document.body) return;
    let notice = document.getElementById("ask-chatgpt-now-status");
    if (!notice) {
      notice = document.createElement("p");
      notice.id = "ask-chatgpt-now-status";
      notice.setAttribute("role", "status");
      notice.style.cssText = "position:fixed;bottom:12px;left:12px;z-index:2147483647;max-width:360px;padding:12px;border-radius:8px;background:#fff4e5;color:#663c00;font:14px/1.5 sans-serif;box-shadow:0 2px 12px #0002";
      document.body.append(notice);
    }
    notice.textContent = "Ask ChatGPT Now：" + message;
  }

  function fill(editor, prompt) {
    editor.focus();
    if (editor.tagName === "TEXTAREA" || editor.tagName === "INPUT") {
      const prototype = editor.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(editor, prompt);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const range = document.createRange();
      range.selectNodeContents(editor);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      if (!document.execCommand("insertText", false, prompt)) {
        editor.textContent = prompt;
        editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: prompt }));
      }
    }
  }

  async function handle() {
    const url = new URL(location.href);
    const prompt = new URLSearchParams(url.hash.slice(1)).get(KEY);
    if (url.pathname !== "/" || url.searchParams.get("ask_chatgpt_now") !== "1" || !prompt?.trim()) return;
    if (run?.source === url.href && !run.finished) return;
    if (run) run.cancelled = true;
    const current = run = { source: url.href, cancelled: false, clicked: false, manualSend: false, finished: false };
    let granted;
    for (let i = 0; i < 50 && !current.cancelled; i++) {
      try { granted = await chrome.runtime.sendMessage({ type: "ASK_CHATGPT_NOW_CLAIM", prompt }); }
      catch { return; }
      if (granted?.status === "ok") break;
      if (granted?.status !== "waiting") return;
      await delay(100);
    }
    if (granted?.status !== "ok" || current.cancelled) return;
    // Remove the handoff before sending so reload/back cannot replay it.
    url.searchParams.delete("ask_chatgpt_now");
    history.replaceState(history.state, "", url.pathname + url.search);
    status("waiting-for-composer");
    const manualClick = event => {
      if (event.isTrusted && event.target.closest?.(SEND)) current.manualSend = true;
    };
    const manualEnter = event => {
      if (event.isTrusted && event.key === "Enter" && !event.shiftKey && event.target.closest?.(EDITOR)) current.manualSend = true;
    };
    document.addEventListener("click", manualClick, true);
    document.addEventListener("keydown", manualEnter, true);
    try {
      let filledEditor;
      const started = Date.now();
      while (Date.now() - started < 45000 && !current.cancelled) {
        if (current.manualSend) { status("user-sent"); return; }
        const editor = [...document.querySelectorAll(EDITOR)].find(visible);
        if (!editor || editor.disabled || editor.getAttribute("aria-disabled") === "true") { await delay(100); continue; }
        if (editor !== filledEditor) {
          const existing = read(editor);
          if (existing && existing !== granted.prompt.trim()) {
            status("draft-conflict", "发现已有草稿，已停止自动发送，以免覆盖内容。");
            return;
          }
          fill(editor, granted.prompt);
          filledEditor = editor;
          await delay(200);
          continue;
        }
        if (read(editor) !== granted.prompt.trim()) {
          status("draft-changed", "草稿内容已变化，已停止自动发送。");
          return;
        }
        const form = editor.form || editor.closest("form");
        const button = (form && [...form.querySelectorAll(SEND + ', button[type="submit"]')].find(visible)) ||
          [...document.querySelectorAll(SEND)].find(visible);
        if (!button || button.disabled || button.getAttribute("aria-disabled") === "true" ||
            document.querySelector('[data-testid="stop-button"]')) { await delay(100); continue; }
        if (current.manualSend || current.clicked || current.cancelled) return;
        current.clicked = true;
        status("sending");
        button.click(); // Exactly one Send click; never retry a possibly accepted send.
        status("sent");
        return;
      }
      if (!current.cancelled) status("not-ready", "ChatGPT 尚未就绪或需要登录；未发送问题。请登录后从地址栏重试。");
    } catch (error) {
      status("error", "未能自动发送：" + error.message);
    } finally {
      current.finished = true;
      document.removeEventListener("click", manualClick, true);
      document.removeEventListener("keydown", manualEnter, true);
    }
  }
  window.addEventListener("hashchange", () => { void handle(); });
  void handle();
})();
