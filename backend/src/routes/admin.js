import { Router } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config, isProd } from "../config.js";
import { reindex, storeSize, ensureIndexed, indexDocs } from "../services/rag.js";
import { getStore, resetStore } from "../vector/index.js";
import { activeModel, activeEmbeddingModel } from "../services/llm.js";
import { listConversations } from "./chat.js";
import { extractTextFromFile, isSupported } from "../services/upload.js";
import { chunkText } from "../utils/text.js";
import { sha1 } from "../utils/hash.js";
import { loadKb, invalidateKb, seedDocs } from "../knowledge/site.js";
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
  const okUser = !!username && username === config.adminUser;
  // Compare SHA-256 digests in constant time to blunt timing side channels on
  // the password check. (Full per-user salted hashing lands with the DB move.)
  const passOk = typeof password === "string" && config.adminPass &&
    crypto.timingSafeEqual(
      crypto.createHash("sha256").update(password, "utf8").digest(),
      crypto.createHash("sha256").update(String(config.adminPass), "utf8").digest()
    );
  if (!okUser || !passOk) {
    // do NOT reveal which part was wrong
    return res.status(401).json({ error: "invalid username or password" });
  }
  const token = createSession();
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; HttpOnly; ${isProd ? "Secure; " : ""}Path=/; SameSite=Strict; Max-Age=${12 * 60 * 60}`);
  res.json({ ok: true, expiresIn: 12 * 60 * 60 });
});

/** POST /api/admin/logout — clear the session cookie. */
router.post("/logout", (req, res) => {
  destroySession(cookieValue(req.headers.cookie, SESSION_COOKIE));
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; ${isProd ? "Secure; " : ""}Path=/; SameSite=Strict; Max-Age=0`);
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

const KB_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../legacy/knowledge-base.js");

/** Best-effort slug for a KB entry id from its question. */
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `entry-${Date.now()}`;
}

/**
 * Insert entries into the KB file right before the closing `];` of the array,
 * leaving every existing line byte-identical (comments, formatting, order).
 * Only entries whose id isn't already present are appended. Returns the ids
 * actually written.
 */
function appendKbEntries(upserted) {
  const src = fs.readFileSync(KB_FILE, "utf8");
  const start = src.indexOf("var KB = [");
  if (start === -1) throw new Error("knowledge-base.js is missing the KB array");
  const close = src.lastIndexOf("];");
  if (close === -1 || close < start) throw new Error("knowledge-base.js KB array is malformed");

  const existing = new Set(loadKb().map((e) => e.id));
  const fresh = upserted.filter((e) => !existing.has(e.id));
  if (!fresh.length) return [];

  // The last entry in the array usually has no trailing comma (valid JS, wrong
  // for appending), so ensure a comma sits before the new block.
  const head = src.slice(0, close).trimEnd();
  const sep = head.endsWith(",") ? "" : ",";
  const block = fresh.map((e) => `\n\n    ${JSON.stringify(e, null, 2).replace(/\n/g, "\n    ")}`).join(",");
  const out = `${head}${sep}${block}\n  ${src.slice(close).trimStart()}`;
  fs.writeFileSync(KB_FILE, out, "utf8");
  invalidateKb();
  return fresh.map((e) => e.id);
}

/** GET /api/admin/kb — list curated KB entries. */
router.get("/kb", auth, (req, res) => {
  res.json({
    entries: loadKb().map((e) => ({ id: e.id, cat: e.cat, q: e.q, a: e.a, kw: e.kw || [] })),
    total: loadKb().length
  });
});

/**
 * POST /api/admin/kb — upsert curated KB entries then embed the new/changed
 * ones so chat retrieval sees them immediately.
 * Body: { entries: [{ cat, q, a, kw?, cta? }] }
 */
router.post("/kb", auth, uploadLimiter, async (req, res) => {
  const { entries } = req.body || {};
  if (!Array.isArray(entries) || !entries.length) {
    return res.status(400).json({ error: "entries must be a non-empty array of { cat, q, a }" });
  }

  const cleaned = [];
  for (const raw of entries) {
    const cat = String(raw.cat || "Other").trim();
    const q = String(raw.q || "").trim();
    const a = String(raw.a || "").trim();
    if (!q || !a) {
      return res.status(400).json({ error: "each entry needs a non-empty q and a" });
    }
    const id = String(raw.id || "").trim() || slugify(q);
    const kw = Array.isArray(raw.kw)
      ? raw.kw.map((k) => String(k).trim()).filter(Boolean)
      : [q.toLowerCase()];
    cleaned.push({ id, cat, q, a, kw, ...(raw.cta ? { cta: String(raw.cta).trim() } : {}) });
  }

  let written = [];
  try {
    written = appendKbEntries(cleaned);
  } catch (e) {
    return res.status(500).json({ error: `Could not update knowledge-base.js: ${e.message}` });
  }

  // Embed only the freshly appended docs (store dedups by id).
  let added = 0;
  try {
    const store = getStore();
    const fresh = seedDocs().filter((d) => !store.has(d.id));
    added = await indexDocs(fresh);
  } catch (e) {
    console.warn("[admin] KB re-embed failed:", e.message);
  }

  res.json({
    ok: true,
    added: written.length,
    alreadyExists: cleaned.length - written.length,
    total: loadKb().length,
    embedded: added
  });
});

/** GET /api/admin/status — store size + config sanity. */
router.get("/status", auth, async (req, res) => {
  res.json({
    store: config.vectorStore,
    storeSize: await storeSize().catch(() => -1),
    provider: config.provider,
    llm: activeModel,
    embeddings: activeEmbeddingModel,
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