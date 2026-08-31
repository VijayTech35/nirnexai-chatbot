/**
 * Headless test for the guided flows + recommendation of dist/nirnex-chatbot.js.
 * Boots the bundle in isolated vm contexts:
 *   A) leadCapture on, no visitor -> sequential lead flow (name/email/company/
 *      role/goal), personalised greeting "Hi John!", product recommendation +
 *      feature cards; ask() is guarded while the flow is open.
 *   B) visitor known -> demo booking flow end to end.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const src = await readFile(
  fileURLToPath(new URL("../dist/nirnex-chatbot.js", import.meta.url)),
  "utf8"
);

function makeEl() {
  return {
    tagName: "DIV",
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
    textContent: "",
    set innerHTML(v) { this._html = String(v); },
    get innerHTML() { return this._html; },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    addEventListener() {},
    focus() {},
    click() {},
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    querySelector() { const b = makeEl(); b.tagName = "BUTTON"; return b; }
  };
}

function boot(cfgOverride) {
  const registry = [];
  const sandbox = {
    console,
    Math,
    JSON,
    Date,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (cb) => setTimeout(() => cb(1), 0),
    cancelAnimationFrame: clearTimeout,
    performance: { now: () => 1 },
    navigator: { sendBeacon: () => true },
    localStorage: cfgOverride.localStorage,
    document: {
      readyState: "loading",
      head: { appendChild() {} },
      body: { appendChild() {} },
      addEventListener(ev, cb) { this._handlers = this._handlers || {}; this._handlers[ev] = cb; },
      createElement(tag) { const el = makeEl(); el.tagName = String(tag).toUpperCase(); registry.push(el); return el; }
    }
  };
  sandbox.window = sandbox;
  sandbox.NirnexChatbotConfig = Object.assign({
    apiEndpoint: "http://localhost:4000",
    sessionId: "flow-test",
    autoOpenAfterMs: 0,
    openOnLoad: false,
    typingDelayMin: 10,
    typingDelayMax: 15,
    leadCapture: true
  }, cfgOverride.config || {});
  vm.runInNewContext(src, sandbox, { filename: "nirnex-chatbot.js" });
  sandbox.document._handlers["DOMContentLoaded"]();
  const byClass = (cn) => registry.find((e) => e.className === cn);
  const htmlOf = (el) =>
    el._html + el.children.map((c) => c._html + (c.children ? htmlOf(c) : "")).join("");
  return {
    w: sandbox,
    insight: sandbox.NirnexChatbot,
    test: sandbox.window.__NirnexChatbotTest,
    msgsHtml: () => htmlOf(byClass("nxa-msgs") || { _html: "", children: [] }),
    featsCount: () => (byClass("nxa-feats") || { children: [] }).children.length,
    userBubbles: () =>
      (byClass("nxa-msgs") || { children: [] }).children.filter((c) => (c.className || "").indexOf("nxa-user") !== -1).length
  };
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ---- Boot A: sequential lead capture + recommendation ----
const A = boot({ localStorage: undefined });
A.insight.open();
await delay(700); // typing + intro + first prompt
assert.ok(A.msgsHtml().indexOf("may I know your name?") !== -1, "lead step 1 (name) prompt shown");
assert.ok(A.test.isFlowActive(), "lead flow active");
const before = A.userBubbles();
A.insight.ask("hello"); // public ask guarded mid-flow
await delay(20);
assert.equal(A.userBubbles(), before, "ask() guarded while lead flow open");

A.test.flowInput("John Wick");
await delay(50);
assert.ok(A.msgsHtml().indexOf("Thanks, John!") !== -1, "lead step 2 (email) prompt shown");
A.test.flowInput("john@acme.com");
await delay(50);
assert.ok(A.msgsHtml().indexOf("Which company are you from?") !== -1, "lead step 3 (company) prompt shown");
A.test.flowInput("Acme Corp");
await delay(50);
assert.ok(A.msgsHtml().indexOf("your role?") !== -1, "lead step 4 (role) prompt with options");
assert.ok(A.msgsHtml().indexOf("Founder") !== -1, "role options rendered");
A.test.flowInput("Founder");
await delay(50);
assert.ok(A.msgsHtml().indexOf("what are you looking for today?") !== -1, "lead step 5 (goal) prompt");
A.test.flowInput("Pricing");
await delay(400); // finishLead -> personalised greeting + recommendation + feats

assert.equal(A.test.isFlowActive(), false, "lead flow completed");
assert.ok(A.msgsHtml().indexOf("Hi John!") !== -1, "personalised greeting after lead");
assert.ok(A.msgsHtml().indexOf("would be most relevant") !== -1, "product recommendation shown");
assert.equal(A.featsCount(), 6, "six feature cards rendered");
console.log("lead flow -> greeting + recommendation + feats OK");

// ---- Boot B: demo booking flow for a known visitor ----
const B = boot({
  localStorage: {
    getItem: (k) => k === "nirnex_visitor" ? JSON.stringify({ firstName: "Jane", lastName: "Doe", email: "jane@acme.com" }) : null,
    setItem() {}
  }
});
B.insight.open();
await delay(400);
assert.ok(B.msgsHtml().indexOf("Hi Jane!") !== -1, "returning visitor greeting personalises");
await delay(50);
B.insight.ask("I'd like to book a demo");
await delay(600);
assert.ok(B.test.isFlowActive(), "demo flow active");
assert.ok(B.msgsHtml().indexOf("could you share your name?") !== -1, "demo step 1 (name) prompt shown");
B.test.flowInput("Jane Doe");
B.test.flowInput("Acme Corp");
await delay(30);
B.test.flowInput("jane@acme.com");
B.test.flowInput("next Tuesday");
B.test.flowInput("10:00 AM");
await delay(400);
assert.equal(B.test.isFlowActive(), false, "demo flow completed");
assert.ok(B.msgsHtml().indexOf("booked in, Jane Doe!") !== -1, "demo confirmation shown");
console.log("demo booking flow OK");

console.log("FLOW SMOKE PASS");
process.exit(0);