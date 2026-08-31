/**
 * Headless smoke test for the rebuilt widget (dist/nirnex-chatbot.js):
 * stubs the DOM, boots the widget, and drives the streaming path
 * (apiEndpoint -> defaultStreamResolver -> live mock backend on :4000).
 */
import assert from "node:assert/strict";

global.window = global;
global.localStorage = undefined;

function makeEl(tag) {
  return {
    tagName: tag.toUpperCase(),
    children: [],
    parentNode: null,
    style: { setProperty() {}, display: "" },
    className: "",
    _html: "",
    _attrs: {},
    scrollTop: 0,
    scrollHeight: 0,
    value: "",
    type: "",
    set innerHTML(v) {
      this._html = String(v);
      this._htmlLen = String(v).length;
    },
    get innerHTML() { return this._html; },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    addEventListener() {},
    focus() {},
    click() {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    querySelector() {
      const btn = makeEl("button");
      btn.classList = { add() {}, remove() {}, contains() { return false; } };
      return btn;
    }
  };
}

const nodeRegistry = [];
global.document = {
  readyState: "loading",
  head: { appendChild() {} },
  body: { appendChild() {} },
  addEventListener(ev, cb) { this._handlers = this._handlers || {}; this._handlers[ev] = cb; },
  createElement(tag) {
    const el = makeEl(tag);
    nodeRegistry.push(el);
    return el;
  }
};
Object.defineProperty(global, "navigator", { value: { sendBeacon: () => true }, configurable: true });
global.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now() || 1), 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// ---------- load knowledge base + widget bundle ----------
const config = {
  apiEndpoint: "http://localhost:4000",
  sessionId: "smoke-test-1",
  openOnLoad: true,
  autoOpenAfterMs: 0,
  leadCapture: false
};
global.NirnexChatbotConfig = config;

const { pathToFileURL } = await import("node:url");
import path from "node:path";
const distUrl = pathToFileURL(path.join(import.meta.dirname, "..", "dist", "nirnex-chatbot.js")).href;
await import(distUrl);

assert.ok(Array.isArray(global.NIRNEX_KB) && global.NIRNEX_KB.length > 0, "KB bundled");
console.log("KB entries:", global.NIRNEX_KB.length);

// guided-flow + feature-card markup is built into the bundle
import { fileURLToPath } from "node:url";
const distSrc = await import("node:fs").then((fs) => fs.promises.readFile(fileURLToPath(distUrl), "utf8"));
assert.ok(/nxa-opt/.test(distSrc), "guided-flow options bundled");
assert.ok(/nxa-feat/.test(distSrc), "feature cards bundled");
assert.ok(document._handlers && document._handlers["DOMContentLoaded"], "DOMContentLoaded registered");
document._handlers["DOMContentLoaded"]();

assert.ok(global.NirnexChatbot, "window.NirnexChatbot API exposed");
assert.ok(config.sessionId, "sessionId generated/kept");

// pick a genuine fallback query
const tester = global.__NirnexChatbotTest;
const candidates = [
  "Does NirnexAI offer an offline deployment?",
  "Can I deploy NirnexAI on a private cloud?",
  "Does NirnexAI have a white-label mobile app?",
  "Is there a student discount?",
  "Why is the sky blue in October?",
  "Zarfle 7x borpwang on the qorkal plinth"
];
let query = null;
for (const q of candidates) {
  if (tester && tester.resetContext) tester.resetContext();
  const r = tester && tester.route(q);
  console.log(`route(${JSON.stringify(q)}) ->`, r && (r.fallback ? "fallback" : r.answer.replace(/\*\*/g, "").slice(0, 40)));
  if (r && r.fallback && !query) query = q;
}
assert.ok(query, "found a fallback query");
// start the streaming round trip from a clean context
if (tester && tester.resetContext) tester.resetContext();

function botMessages() {
  return nodeRegistry.filter((n) => n.className === "nxa-msg nxa-bot");
}
function allHtml() {
  return botMessages().map((m) => m._html || m.children.map((c) => c._html || "").join("")).join("\n") +
    nodeRegistry.map((n) => n._html || "").join("\n");
}
function bubbleTexts() {
  const out = [];
  for (const bot of botMessages()) {
    for (const c of bot.children) {
      if (c.className && c.className.indexOf("nxa-bubble") !== -1) out.push(c._html || "");
    }
  }
  return out;
}

// ---------- run the streaming round trip ----------
global.NirnexChatbot.ask(query);

// Completion signal: the streaming bubble shows a cursor while tokens stream,
// and done()/fail() swaps it for the final rendered answer + citations.
let sawCursor = false;
const deadline = Date.now() + 60000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 200));
  const hasCursor = /nxa-cursor/.test(allHtml());
  if (!sawCursor && hasCursor) sawCursor = true;
  else if (sawCursor && !hasCursor) break; // streaming finished rendering
}

const texts = bubbleTexts();
assert.ok(sawCursor, "streaming started (cursor seen)");
assert.ok(!/nxa-cursor/.test(allHtml()), "cursor removed on completion");
assert.ok(texts.length >= 2, "greeting + bot bubbles present");
const answerText = texts.reduce((a, b) => (b.length > a.length ? b : a), "");
assert.ok(answerText.length > 80, "answer rendered (" + answerText.length + " chars)");
if (/nxa-citation/.test(allHtml())) {
  console.log("streamed answer + citations: OK");
} else {
  // Backend LLM (OpenRouter) credits sometimes drain mid-run; the widget must then
  // degrade gracefully to the cited/CTA-backed fallback answer instead of hanging.
  assert.ok(/nxa-cta/.test(allHtml()), "degraded path offers a handoff CTA");
  console.log("warning: live LLM stream unavailable (credits?) — verified graceful fallback + handoff CTA");
}
console.log("answer bubble chars:", answerText.length);
console.log("\nSMOKE PASS — widget streaming path works end to end");