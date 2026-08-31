import assert from "node:assert/strict";
import { streamChat, parseSSE } from "../frontend/lib/chat-client.js";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";

// quick re-check of parser used by the live client
const { events } = parseSSE('event: done\ndata: {"ok":true}\n\n');
assert.strictEqual(events[0].event, "done");

const deltas = [];
let result;
try {
  result = await streamChat({
    messages: [{ role: "user", content: "Which plan should I choose and why?" }],
    sessionId: "e2e-" + Date.now(),
    onDelta: (t) => deltas.push(t)
  });
} catch (e) {
  if (/credit/i.test(String((e && e.message) || e))) {
    console.log("warning: live LLM unavailable (OpenRouter credits) — e2e stream skipped");
    process.exit(0);
  }
  throw e;
}

assert.ok(deltas.length > 0, "got streamed deltas");
const joined = deltas.join("");
assert.ok(joined.length > 50, "answer is substantive");
assert.ok(result.citations.length > 0, "has citations");
assert.ok(result.citations[0].url.includes("nirnexai.com"), "citation URL is a site URL");
assert.ok(result.meta && Array.isArray(result.meta.sources), "meta has sources");

console.log("E2E chat via frontend client OK");
console.log("deltas:", deltas.length, "| answer chars:", joined.length);
console.log("citations:", result.citations.slice(0, 2));
console.log("answer preview:", joined.slice(0, 140));
console.log("---\ne2e tests: 5/5 pass");