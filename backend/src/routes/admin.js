import { Router } from "express";
import { config } from "../config.js";
import { reindex, storeSize, ensureIndexed, indexDocs } from "../services/rag.js";
import { getStore, resetStore } from "../vector/index.js";
import { listConversations } from "./chat.js";
import { extractTextFromFile, isSupported } from "../services/upload.js";
import { chunkText } from "../utils/text.js";
import { sha1 } from "../utils/hash.js";
import { rateLimit } from "../utils/rate-limit.js";
import {
  cookieValue,
  createSession,
  destroySession,
  isValidSession,
  SESSION_COOKIE
} from "../utils/session.js";

import { auth } from "../middleware/auth.js";

const router = Router();
const reindexLimiter = rateLimit({ windowMs: 60 * 60_000, max: 5 });
const uploadLimiter = rateLimit({ windowMs: 60 * 60_000, max: 40 });
const loginLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20 });

/**
 * POST /api/admin/login — credential sign-in. Sets an HttpOnly session cookie.
 * Body: { username, password }
 */
router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const okUser = config.mock || (username && username === config.adminUser);
  const okPass = config.mock || (password && config.adminPass && password === config.adminPass);
  if (!okUser || !okPass) {
    // do NOT reveal which part was wrong
    return res.status(401).json({ error: "invalid username or password" });
  }
  const token = createSession();
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${12 * 60 * 60}`);
  res.json({ ok: true, expiresIn: 12 * 60 * 60 });
});

/** POST /api/admin/logout — clear the session cookie. */
router.post("/logout", (req, res) => {
  destroySession(cookieValue(req.headers.cookie, SESSION_COOKIE));
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

/** GET /api/admin/session — is there a valid session? (used by the UI on boot) */
router.get("/session", (req, res) => {
  const cookieTok = cookieValue(req.headers.cookie, SESSION_COOKIE);
  const authed = config.mock || (cookieTok && isValidSession(cookieTok));
  res.json({
    authenticated: !!authed,
    cookieAuth: !!cookieTok && isValidSession(cookieTok)
  });
});

const UPLOAD_PREFIX = "upload:";

/** GET /api/admin/docs — list documents ingested via file upload. */
router.get("/docs", auth, (req, res) => {
  const store = getStore();
  const docs = store.docs
    .filter((d) => String(d.id || "").startsWith(UPLOAD_PREFIX))
    .map((d) => ({
      id: d.id,
      filename: d.meta?.filename || String(d.id).replace(UPLOAD_PREFIX, ""),
      title: d.meta?.title || d.meta?.filename || String(d.id).replace(UPLOAD_PREFIX, ""),
      chunks: d.meta?.chunkTotal || 1,
      chars: d.text.length,
      indexedAt: d.meta?.indexedAt || d.meta?.uploadedAt || null
    }))
    .sort((a, b) => (b.indexedAt || 0) - (a.indexedAt || 0));
  res.json({ documents: docs });
});

/** POST /api/admin/upload — ingest an uploaded file into the knowledge base. */
router.post("/upload", auth, uploadLimiter, async (req, res) => {
  const { filename, content } = req.body || {};
  if (!filename || typeof content !== "string") {
    return res.status(400).json({ error: "filename and base64 content are required" });
  }
  if (!isSupported(filename)) {
    return res.status(400).json({ error: "Unsupported file type. Use txt, md, csv, json, html, or a text-based PDF." });
  }
  let buffer;
  try {
    buffer = Buffer.from(content, "base64");
  } catch {
    return res.status(400).json({ error: "Invalid base64 content." });
  }

  let text;
  try {
    text = extractTextFromFile(filename, buffer);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!text.trim()) {
    return res.status(400).json({ error: "No readable text found in that file." });
  }

  const fileId = sha1((filename + "\0" + text.length).toString());
  const chunks = chunkText(text, 1400, 180);
  const docId = `${UPLOAD_PREFIX}${fileId}`;

  const docs = chunks.map((c, i) => ({
    id: `${docId}:${i}`,
    text: c.text,
    meta: {
      url: `upload://${filename}`,
      title: filename,
      source: "upload",
      filename,
      chunk: i + 1,
      chunkTotal: chunks.length,
      indexedAt: new Date().toISOString(),
      fileId
    }
  }));

  try {
    const added = await indexDocs(docs);
    const store = getStore();
    res.json({
      ok: true,
      added,
      chunks: chunks.length,
      filename,
      total: store.size
    });
  } catch (e) {
    res.status(500).json({ error: `Ingestion failed: ${e.message}` });
  }
});

/** DELETE /api/admin/docs/:id — remove an uploaded document's chunks. */
router.delete("/docs/:id", auth, async (req, res) => {
  const id = req.params.id;
  const store = getStore();
  const target = store.docs.find((d) => d.id === id);
  if (!target) return res.status(404).json({ error: "document not found" });

  const fileId = target.meta?.fileId;
  const matching = fileId
    ? store.docs.filter((d) => d.meta?.fileId === fileId).map((d) => d.id)
    : [id];

  // rebuild the store without the matching docs
  const keepDocs = [];
  const keepVecs = [];
  const removed = new Set(matching);
  for (let i = 0; i < store.docs.length; i++) {
    if (!removed.has(store.docs[i].id)) {
      keepDocs.push(store.docs[i]);
      keepVecs.push(store.vecs[i]);
    }
  }
  store.docs = keepDocs;
  store.vecs = keepVecs;
  store.persist();

  res.json({ ok: true, removed: matching.length, total: store.docs.length });
});

/** GET /api/admin/status — store size + config sanity. */
router.get("/status", auth, async (req, res) => {
  res.json({
    store: config.vectorStore,
    storeSize: await storeSize().catch(() => -1),
    llm: config.openrouterApiKey ? config.llmModel : null,
    embeddings: config.embeddingModel,
    mock: config.mock,
    firecrawl: !!config.firecrawlApiKey,
    autoIndex: config.autoIndex
  });
});

/** POST /api/admin/reindex — clear (optional) and re-crawl + embed. */
router.post("/reindex", auth, reindexLimiter, async (req, res) => {
  const { urls, clear = false, seed = config.useSeedKb } = req.body || {};
  const targets = (urls && urls.length ? urls : config.scrapeUrls).filter(Boolean);
  try {
    if (clear) {
      const store = getStore();
      await store.clear();
      resetStore();
    }
    const result = await reindex({ urls: targets, clear: false, seed });
    res.json({ ok: true, ...result, urls: targets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/admin/conversations — persisted chat transcripts. */
router.get("/conversations", auth, (req, res) => {
  res.json({ sessions: listConversations() });
});

/** POST /api/admin/warmup — ensure index is populated (used by the app at boot). */
router.post("/warmup", auth, async (req, res) => {
  try {
    const result = await ensureIndexed();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;