module.exports = function prefillFixture(prompt, expected, kind) {
  const escaped = prompt.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const editor = kind === "rich" ?
    '<div id="prompt-textarea" contenteditable="true" role="textbox" style="min-height:60px;border:1px solid #888"><p>' + escaped + '</p></div>' :
    '<textarea id="prompt-textarea" name="prompt" rows="4" cols="80">' + escaped + '</textarea>';
  const script = [
    "window.fixtureSends = 0;",
    "const form = document.querySelector('form');",
    "const editor = document.getElementById('prompt-textarea');",
    "const button = document.querySelector('[data-testid=\"send-button\"]');",
    "setTimeout(() => { button.disabled = false; }, 700);",
    "form.addEventListener('submit', event => {",
    "  event.preventDefault();",
    "  window.fixtureSends++;",
    "  const text = 'value' in editor ? editor.value : editor.innerText;",
    "  window.fixtureLastPrompt = text.trim();",
    "  if (text.trim() !== " + JSON.stringify(prompt) + ") throw Error('Wrong fixture prompt');",
    "  if ('value' in editor) editor.value = ''; else editor.textContent = '';",
    "  const answer = document.createElement('p');",
    "  answer.textContent = " + JSON.stringify(expected) + ";",
    "  document.body.append(answer);",
    "});"
  ].join("\n");
  return '<!doctype html><html><head><title>Controlled prefilled fixture</title></head><body><h1>Controlled test fixture — not a real signed-in account</h1><p>Prompt is prefilled; native URL auto-submit is absent. Send enables after hydration.</p><form>' +
    editor + '<button type="submit" data-testid="send-button" aria-label="Send prompt" disabled>Send</button></form><script>' + script + '</script></body></html>';
};
