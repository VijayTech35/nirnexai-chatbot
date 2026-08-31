import fs from "fs";
import path from "path";
import { config } from "../config.js";
import { cosine } from "../utils/vectors.js";
import { sha1 } from "../utils/hash.js";

/**
 * Vector store abstraction.
 *
 * A Document is: { id, text, meta: { url, title, source, chunk, indexedAt } }
 *
 * Implementations:
 *   - MemoryStore: persistence to a local JSON file in data/ (default).
 *   - PineconeStore: talks to Pinecone when credentials are configured.
 *   - Qdrant/Weaviate can be added by implementing the same interface.
 */
class MemoryStore {
  constructor() {
    this.file = path.join(config.dataDir, "vectors.json");
    this.docs = [];
    this.vecs = [];
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(this.file)) return;
      const raw = JSON.parse(fs.readFileSync(this.file, "utf8"));
      const docs = Array.isArray(raw.docs) ? raw.docs : [];
      const vecs = Array.isArray(raw.vecs) ? raw.vecs : [];
      if (docs.length !== vecs.length) throw new Error("docs/vecs length mismatch");
      for (const d of docs) {
        if (!d?.id || typeof d?.text !== "string") throw new Error("malformed doc");
        if (!d.meta) d.meta = {};
        // backfill missing content hashes locally (no embedding/API call)
        if (!d.meta.hash) {
          d.meta.hash = sha1(d.text);
          this._backfilled = true;
        }
      }
      this.docs = docs;
      this.vecs = vecs;
      if (this._backfilled) this.persist();
    } catch (e) {
      console.warn("[vector] store file invalid, starting empty (will reseed):", e.message);
      this.docs = [];
      this.vecs = [];
    }
  }

  persist() {
    // atomic write: temp file + rename, so a crash mid-write never corrupts the store
    const tmp = `${this.file}.tmp`;
    try {
      fs.mkdirSync(config.dataDir, { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify({ docs: this.docs, vecs: this.vecs }));
      fs.renameSync(tmp, this.file);
    } catch (e) {
      try {
        fs.rmSync(tmp, { force: true });
      } catch {}
      console.warn("[vector] could not persist data file:", e.message);
    }
  }

  get size() {
    return this.docs.length;
  }

  /** Whether per-document content hashes are available for drift detection. */
  get supportsHashes() {
    return true;
  }

  has(id) {
    return this.docs.some((d) => d.id === id);
  }

  hashOf(id) {
    const d = this.docs.find((x) => x.id === id);
    return d?.meta?.hash ?? null;
  }

  async upsert(docs, vectors) {
    docs.forEach((doc, i) => {
      if (!doc.meta) doc.meta = {};
      doc.meta.hash = sha1(doc.text);
    });
    const existing = new Map(this.docs.map((d, i) => [d.id, i]));
    docs.forEach((doc, i) => {
      const idx = existing.get(doc.id);
      if (idx !== undefined) {
        this.docs[idx] = doc;
        this.vecs[idx] = vectors[i];
      } else {
        existing.set(doc.id, this.docs.length);
        this.docs.push(doc);
        this.vecs.push(vectors[i]);
      }
    });
    this.persist();
    return docs.length;
  }

  async clear() {
    this.docs = [];
    this.vecs = [];
    this.persist();
  }

  async search(vector, topK) {
    const scored = this.vecs
      .map((v, i) => ({ score: cosine(vector, v), doc: this.docs[i] }))
      .filter((s) => Number.isFinite(s.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored;
  }
}

class PineconeStore {
  constructor() {
    const { apiKey, index, environment } = config.pinecone;
    if (!apiKey || !index) throw new Error("Pinecone API key and index are required");
    this.apiKey = apiKey;
    this.index = index;
    this.base = `https://${index}-${environment ? `${environment}—` : ""}svc.${environment || "us-east1-gcp"}.pinecone.io`.replace(
      /\u2014/g,
      "-"
    );
    this.namespace = "nirnexai";
  }

  /** Pinecone has no stored text hashes -> back to full-upsert on refresh. */
  get supportsHashes() {
    return false;
  }

  has() {
    return false;
  }

  hashOf() {
    return null;
  }

  async request(pathname, opts = {}) {
    const res = await fetch(`${this.base}${pathname}`, {
      method: opts.method || "GET",
      headers: {
        "Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok) throw new Error(`Pinecone ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
  }

  async upsert(docs, vectors) {
    const vectorsPc = docs.map((d, i) => ({
      id: d.id,
      values: vectors[i],
      metadata: { text: d.text.slice(0, 6000), url: d.meta.url || "", title: d.meta.title || "" }
    }));
    await this.request(`/vectors/upsert`, { method: "POST", body: { vectors: vectorsPc, namespace: this.namespace } });
    return vectorsPc.length;
  }

  async clear() {
    await this.request(`/vectors/delete`, { method: "POST", body: { deleteAll: true, namespace: this.namespace } });
  }

  async search(vector, topK) {
    const json = await this.request(`/query`, {
      method: "POST",
      body: {
        vector,
        topK,
        namespace: this.namespace,
        includeMetadata: true
      }
    });
    return (json.matches || [])
      .map((m) => ({
        score: m.score,
        doc: { id: m.id, text: m.metadata?.text || "", meta: { url: m.metadata?.url, title: m.metadata?.title } }
      }))
      .filter((r) => r.doc.text);
  }
}

let store;
export function getStore() {
  if (store) return store;
  if (config.vectorStore === "pinecone") {
    store = new PineconeStore();
  } else {
    store = new MemoryStore();
  }
  return store;
}

export function resetStore() {
  store = null;
}