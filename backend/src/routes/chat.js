import { Router } from "express";
import { config } from "../config.js";
import { retrieve } from "../services/rag.js";
import { buildMessages, mockAnswer } from "../services/prompts.js";
import { streamChat } from "../services/openrouter.js";
import { rateLimit } from "../utils/rate-limit.js";
import { keywordRetrieve, pageUrl } from "../knowledge/site.js";

const router = Router();

const HEARTBEAT_MS = 15000;
const chatLimiter = rateLimit({ windowMs: 15 * 60_000, max: config.chatRateMax });
const sessionLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: config.chatRateMax * 2,
  keyFn: (req) => {
    const raw = req.body?.sessionId;
    const sid =
      typeof raw === "string"
        ? raw.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64)
        : "default";
    return `sess:${sid}`;
  },
  name: "session"
});

// ---------- helpers ----------
function sse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// ---------- persisted conversation store ----------
import fs from "fs";
import path from "path";

// Conversations live in the configured data dir (dataDir), not a hardcoded path.
const CONVO_FILE = path.resolve(config.dataDir, "conversations.json");
const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 50;

function loadConversations() {
  try {
    if (!fs.existsSync(CONVO_FILE)) return new Map();
    const raw = JSON.parse(fs.readFileSync(CONVO_FILE, "utf8"));
    const map = new Map();
    for (const [id, data] of Object.entries(raw)) {
      map.set(id, {
        id,
        messages: Array.isArray(data.messages) ? data.messages : [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

function persistConversations(map) {
  try {
    fs.mkdirSync(path.dirname(CONVO_FILE), { recursive: true });
    const out = {};
    for (const [id, data] of map.entries()) {
      out[id] = {
        messages: data.messages,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
    }
    const tmp = CONVO_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2), "utf8");
    fs.renameSync(tmp, CONVO_FILE);
  } catch (e) {
    console.error("[chat] failed to persist conversations:", e.message);
  }
}

const conversations = loadConversations();

/** Shared accessor for other modules (e.g. admin) to read persisted sessions. */
export function listConversations() {
  return [...conversations.entries()]
    .map(([id, data]) => ({
      sessionId: id,
      messages: data.messages,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function getConversation(id) {
  const cid = id || "default";
  if (!conversations.has(cid)) {
    conversations.set(cid, { id: cid, messages: [], createdAt: Date.now(), updatedAt: Date.now() });
    // trim oldest sessions to bound memory
    if (conversations.size > MAX_SESSIONS) {
      const oldest = [...conversations.entries()].sort(
        (a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0)
      )[0];
      if (oldest) conversations.delete(oldest[0]);
    }
    persistConversations(conversations);
  }
  return conversations.get(cid);
}

// ---------- GET /api/chat/history (list recent persisted sessions) ----------
router.get("/history", (req, res) => {
  const { sessionId } = req.query;
  if (sessionId) {
    const data = conversations.get(String(sessionId));
    return res.json({ sessionId, messages: data ? data.messages : [] });
  }
  const list = [...conversations.entries()]
    .map(([id, data]) => ({
      sessionId: id,
      messageCount: data.messages.length,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      preview: data.messages.find((m) => m.role === "user")?.content?.slice(0, 120) || ""
    }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 50);
  res.json({ sessions: list });
});

// ---------- POST /api/chat ----------
router.post("/", chatLimiter, sessionLimiter, async (req, res) => {
  const { messages = [], sessionId } = req.body || {};
  const userMsg = [...messages].reverse().find((m) => m.role === "user");

  if (!Array.isArray(messages) || messages.length > 50) {
    return res.status(400).json({ error: "messages must be an array of at most 50 entries" });
  }
  if (!userMsg || typeof userMsg.content !== "string") {
    return res.status(400).json({ error: "messages must include a user message" });
  }
  if (userMsg.content.length > 4000) {
    return res.status(400).json({ error: "message content is too long" });
  }
  if (typeof sessionId === "string" && sessionId.length > 128) {
    return res.status(400).json({ error: "sessionId is too long" });
  }

  if (!config.mock && !config.openrouterApiKey) {
    return res.status(503).json({
      error: "LLM not configured. Set OPENROUTER_API_KEY in backend/.env (or MOCK=true for offline dev)."
    });
  }

  const safeSessionId =
    typeof sessionId === "string"
      ? sessionId.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64)
      : "";
  const conversation = getConversation(safeSessionId);

  // persist the incoming history (sanitized roles)
  const sanitized = messages
    .map((m) => {
      const role = m.role === "assistant" || m.role === "system" ? "assistant" : "user";
      return { role, content: String(m.content || "").slice(0, 4000) };
    })
    .filter((m) => m.content.trim())
    .slice(-12);
  conversation.messages.push(...sanitized);
  conversation.messages = conversation.messages.slice(-MAX_MESSAGES_PER_SESSION);
  conversation.updatedAt = Date.now();
  persistConversations(conversations);

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  // Detect client disconnect via the response; do NOT end it from a req 'close' listener.
  let clientAborted = false;
  res.on("close", () => {
    clientAborted = true;
  });

  // Hard budget for one turn + SSE heartbeat so proxies don't kill idle streams.
  const controller = new AbortController();
  const bailTimer = setTimeout(() => controller.abort(), config.chatTimeoutMs);
  const heartbeat = setInterval(() => {
    if (!clientAborted && !res.destroyed) res.write(": ping\n\n");
  }, HEARTBEAT_MS);

  try {
    const query = userMsg.content;

    // MOCK mode streams exact KB entries (deterministic, no key needed);
    // LIVE mode retrieves semantically then streams a grounded LLM answer.
    const kw = config.mock ? keywordRetrieve(query) : null;
    let hits;
    if (config.mock) {
      hits = kw
        ? [
            {
              score: 1,
              doc: {
                id: kw.id,
                text: `${kw.q}\n\n${kw.a}`,
                meta: { url: pageUrl(kw.cat), title: kw.q, source: kw.cat, seed: true }
              }
            }
          ]
        : [];
    } else {
      hits = await retrieve(query);
    }
    const topScore = hits[0]?.score ?? 0;
    const uncertain = config.useConfidenceGate && topScore < config.minConfidence;

    sse(res, "meta", {
      query,
      sources: hits.map((h) => ({ title: h.doc.meta.title, url: h.doc.meta.url })),
      sessionId: conversation.id,
      confidence: Math.round(topScore * 10000) / 10000,
      uncertain
    });

    const citations = hits
      .filter((h) => h.doc.meta.url)
      .map((h) => ({ title: h.doc.meta.title || h.doc.meta.source, url: h.doc.meta.url }));
    const startedAt = Date.now();

    // 2) stream the answer
    if (config.mock) {
      const chunks = mockAnswer(query, hits);
      for (const c of chunks) {
        if (clientAborted || res.destroyed) return;
        sse(res, "delta", { text: c });
        await new Promise((r) => setTimeout(r, 15));
      }
    } else {
      const llmMessages = buildMessages(sanitized, hits, { uncertain });
      await streamChat({
        messages: llmMessages,
        onDelta: (text) => {
          if (!clientAborted && !res.destroyed) sse(res, "delta", { text });
        },
        signal: controller.signal
      });
    }

    sse(res, "citations", { citations, latencyMs: Date.now() - startedAt });
    sse(res, "done", { ok: true });
    res.end();
  } catch (err) {
    const aborted = err && (err.name === "AbortError" || controller.signal.aborted);
    const msg = aborted
      ? "Timed out generating an answer. Please try again."
      : err.message || "Unexpected error";
    if (!res.destroyed) {
      console.error("[chat] error:", msg);
      sse(res, "error", { message: msg });
      res.end();
    }
  } finally {
    clearTimeout(bailTimer);
    clearInterval(heartbeat);
  }
});

export default router;