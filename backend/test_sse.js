import { parseSSE } from "../frontend/lib/chat-client.js";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000";

// 1) basic parsing
const buf = [
  "event: meta\ndata: {\"query\":\"hi\",\"sources\":[]}\n\n",
  "event: delta\ndata: {\"text\":\"Hello \"}\n\n",
  "event: delta\ndata: {\"text\":\"world\"}\n\n",
  "event: citations\ndata: {\"citations\":[{\"title\":\"Pricing\",\"url\":\"https://nirnexai.com/pricing\"}]}\n\n",
  "event: done\ndata: {\"ok\":true}\n\n"
].join("");

const { events, rest } = parseSSE(buf);
assert.strictEqual(rest, "", "no leftover");
assert.strictEqual(events.length, 5, "5 events");
assert.strictEqual(events[0].event, "meta");
assert.strictEqual(events[0].data.query, "hi");
assert.strictEqual(events[2].data.text, "world");
assert.strictEqual(events[3].data.citations[0].url, "https://nirnexai.com/pricing");
assert.strictEqual(events[4].event, "done");

// 2) incremental: partial last block stays in rest
const partial = "event: delta\ndata: {\"text\":\"part";
const p2 = parseSSE(partial);
assert.strictEqual(p2.events.length, 0, "no full block yet");
assert.ok(p2.rest.includes("part"), "keeps remainder");

// 3) getApiBase trims trailing slashes
const { getApiBase } = await import("../frontend/lib/chat-client.js");
process.env.NEXT_PUBLIC_API_URL = "http://localhost:4000//";
assert.strictEqual(getApiBase(), "http://localhost:4000");

console.log("sse-parser tests: 8/8 pass");