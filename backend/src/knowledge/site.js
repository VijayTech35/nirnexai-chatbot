import { createRequire } from "module";
import { chunkText } from "../utils/text.js";
import { config } from "../config.js";

const require = createRequire(import.meta.url);

/** The curated site KB (knowledge-base.js) loaded in a Node environment. */
export function loadKb() {
  if (typeof globalThis.NIRNEX_KB === "undefined" || !globalThis.NIRNEX_KB.length) {
    try {
      globalThis.NIRNEX_KB = require("../../../knowledge-base.js");
    } catch (e) {
      console.warn("[seed] knowledge-base.js not found:", e.message);
      globalThis.NIRNEX_KB = [];
    }
  }
  return globalThis.NIRNEX_KB;
}

/**
 * Seed documents from the curated KB so the chatbot is informative even
 * before crawling, and every entry contributes to retrieval.
 */
export function seedDocs() {
  const kb = loadKb();
  const PAGE_HINTS = {
    Platform: "https://nirnexai.com/",
    Features: "https://nirnexai.com/#modules",
    "Use Cases": "https://nirnexai.com/#use-cases",
    Security: "https://nirnexai.com/pricing",
    Pricing: "https://nirnexai.com/pricing",
    Contact: "https://nirnexai.com/contact",
    Company: "https://nirnexai.com/about",
    Other: "https://nirnexai.com/"
  };
  const docs = [];
  kb.forEach((entry, eIdx) => {
    const page = PAGE_HINTS[entry.cat] || "https://nirnexai.com/";
    const chunks = chunkText(`# ${entry.q}\n\n${entry.a}`);
    chunks.forEach((c, i) => {
      docs.push({
        id: `seed-${entry.id || eIdx}-${i}`,
        text: c.text,
        meta: {
          url: page,
          title: entry.q,
          source: `${entry.cat}`,
          chunk: i,
          seed: true,
          indexedAt: new Date().toISOString()
        }
      });
    });
  });
  return docs;
}

/** Flat keyword index for keyword fallback when vectors aren't available. */
export function keywordIndex() {
  return loadKb().map((e) => ({
    id: e.id,
    cat: e.cat,
    q: e.q,
    kw: e.kw || [],
    a: e.a,
    cta: e.cta
  }));
}

/** Best-guess page hint for a KB category (mirrors the seed mapping). */
export function pageUrl(cat) {
  const PAGE_HINTS = {
    Platform: "https://nirnexai.com/",
    Features: "https://nirnexai.com/#modules",
    "Use Cases": "https://nirnexai.com/#use-cases",
    Security: "https://nirnexai.com/pricing",
    Pricing: "https://nirnexai.com/pricing",
    Contact: "https://nirnexai.com/contact",
    Company: "https://nirnexai.com/about",
    Other: "https://nirnexai.com/"
  };
  return PAGE_HINTS[cat] || "https://nirnexai.com/";
}

/**
 * Deterministic keyword lookup used by MOCK mode (offline dev/demo) so answers
 * are exact KB entries instead of hash-vector noise. Matches keywords against
 * the query, else partial question overlap. Returns null when nothing matches.
 */
export function keywordRetrieve(query) {
  const q = query.toLowerCase();
  const idx = keywordIndex();

  // best match = longest keyword the query contains
  let best = null;
  let bestLen = 0;
  for (const e of idx) {
    for (const k of e.kw || []) {
      const kk = k.toLowerCase();
      if (kk && kk.length > bestLen && q.includes(kk)) {
        best = e;
        bestLen = kk.length;
      }
    }
  }

  // exact question overlap beats a weak keyword substring ("nirnexai" fits everywhere)
  let exact = null;
  let exactLen = 0;
  for (const e of idx) {
    const tq = e.q.toLowerCase();
    if (tq.includes(q) && q.length >= Math.min(12, tq.length)) {
      if (q.length > exactLen) {
        exact = e;
        exactLen = q.length;
      }
    }
  }
  if (exact) return exact;
  if (best) return best;

  // fallback: closest question overlap
  let bestQ = null;
  let bestQScore = 0;
  for (const e of idx) {
    const tq = e.q.toLowerCase();
    const s = q.includes(tq) ? tq.length : 0;
    if (s > bestQScore) {
      bestQ = e;
      bestQScore = s;
    }
  }
  return bestQ || null;
}

export function siteKbReady() {
  return !!(globalThis.NIRNEX_KB && globalThis.NIRNEX_KB.length);
}

void config;