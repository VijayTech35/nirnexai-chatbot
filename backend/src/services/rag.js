import { config } from "../config.js";
import { getStore } from "../vector/index.js";
import { embed } from "./openrouter.js";
import { hashEmbed } from "../utils/vectors.js";
import { sha1 } from "../utils/hash.js";
import { crawl } from "./crawler.js";
import { seedDocs } from "../knowledge/site.js";

const BATCH = 16;

function embedTexts(texts) {
  if (config.mock) return texts.map((t) => hashEmbed(t, config.embeddingDimensions));
  return embed(texts);
}

async function embedBatch(texts) {
  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const vecs = await embedTexts(slice);
    out.push(...vecs);
  }
  return out;
}

function changedDocs(store, docs) {
  return docs.filter((d) => !store.has(d.id) || store.hashOf(d.id) !== sha1(d.text));
}

/**
 * Migrates the persisted store forward: whenever the seed KB or crawled page
 * content changes, only the drifted documents are re-embedded on the next boot
 * (no-op re-embedding is skipped — costs stay proportional to real changes).
 */
export async function ensureIndexed() {
  const store = getStore();
  const seed = config.useSeedKb ? seedDocs() : [];
  let refreshed = 0;

  if (store.size > 0) {
    if (!config.autoIndexRefresh || store.supportsHashes === false) {
      return { skipped: true, size: store.size };
    }
    const seedChanged = changedDocs(store, seed);
    if (seedChanged.length) {
      await indexDocs(seedChanged);
      refreshed += seedChanged.length;
      console.log(`[index] refreshed ${seedChanged.length} seed docs (drift) -> total ${store.size}`);
    }
    if (config.autoIndex && config.scrapeUrls.length) {
      const crawled = await crawl(config.scrapeUrls);
      const drifted = changedDocs(store, crawled);
      if (drifted.length) {
        await indexDocs(drifted);
        refreshed += drifted.length;
        console.log(`[index] refreshed ${drifted.length} crawled docs (drift) -> total ${store.size}`);
      }
    }
    return { skipped: refreshed === 0, refreshed, size: store.size };
  }

  await indexDocs(seed);
  console.log(`[index] seeded ${store.size} docs`);

  if (config.autoIndex && config.scrapeUrls.length) {
    const crawled = await crawl(config.scrapeUrls);
    await indexDocs(crawled);
    console.log(`[index] crawled ${crawled.length} docs -> total ${store.size}`);
  }
  return { seededDocs: seed.length, total: store.size };
}

/** Embed + upsert documents. Returns count added. */
export async function indexDocs(docs) {
  if (!docs.length) return 0;
  const store = getStore();
  const texts = docs.map((d) => d.text);
  const vectors = await embedBatch(texts);
  return store.upsert(docs, vectors);
}

/** Clear and rebuild from seed + (optionally) crawled URLs. */
export async function reindex({ urls, clear = false, seed = true } = {}) {
  const store = getStore();
  if (clear) await store.clear();
  let count = 0;
  if (seed && config.useSeedKb) count += await indexDocs(seedDocs());
  if (urls && urls.length) count += await indexDocs(await crawl(urls));
  return { added: count, total: store.size };
}

/** Semantic retrieval: embed the query and return top-k documents. */
export async function retrieve(query, { topK = config.topK } = {}) {
  const store = getStore();
  const [qVec] = await embedTexts([query]);
  const hits = await store.search(qVec, topK);
  return hits;
}

export async function storeSize() {
  return getStore().size;
}