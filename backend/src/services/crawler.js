import { config } from "../config.js";
import { stripHtml, chunkText } from "../utils/text.js";
import { sha1 } from "../utils/hash.js";

const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 15000;

function pageName(url, siteRoot) {
  let p = url.replace(/\/$/, "");
  if (p === siteRoot || p === `${siteRoot}/`) return "Home";
  const seg = p.split("/").pop().replace(/-/g, " ");
  return seg ? seg.replace(/\b\w/g, (c) => c.toUpperCase()) : "Home";
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

/** Firecrawl scrape (handles JS-rendered pages like the FAQ accordions). */
async function firecrawlScrape(url) {
  const res = await fetchWithRetry(
    "https://api.firecrawl.dev/v1/scrape",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.firecrawlApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 1500
      })
    }
  );
  if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
  const json = await res.json();
  const md = json?.data?.markdown || "";
  if (!md) throw new Error("Firecrawl returned no content");
  return { title: json?.data?.metadata?.title || pageName(url, config.siteRoot), markdown: md };
}

/** Built-in lightweight crawler fallback. */
async function fetchScrape(url) {
  const res = await fetchWithRetry(url, {
    headers: { "User-Agent": "NirnexAI-Bot/1.0 (+https://nirnexai.com)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const title =
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || pageName(url, config.siteRoot);
  const body = html.replace(/<(script|style|noscript)[^>]*[\s\S]*?<\/\1>/gi, " ");
  // Pick the <main> region when available, else the whole body
  const main = body.match(/<main[\s>][\s\S]*?<\/main>/i)?.[0] || body;
  const text = stripHtml(main).trim();
  return { title, text };
}

export async function scrapePage(url) {
  if (config.firecrawlApiKey) return firecrawlScrape(url);
  return fetchScrape(url);
}

/**
 * Crawls a list of URLs and returns documents (chunks with meta).
 */
export async function crawl(urls) {
  const results = [];
  for (const url of urls) {
    try {
      const { title, text, markdown } = await scrapePage(url);
      const content = markdown || text;
      if (!content || content.length < 40) {
        console.warn(`[crawler] skipped ${url} (no content)`);
        continue;
      }
      const chunks = chunkText(content);
      console.log(`[crawler] ${url} -> ${chunks.length} chunks (${approxChars(content)})`);
      chunks.forEach((c, i) => {
        results.push({
          id: `${sha1(url)}-${i}`,
          text: c.text,
          meta: {
            url,
            title: c.heading || title,
            source: title,
            chunk: i,
            indexedAt: new Date().toISOString()
          }
        });
      });
    } catch (e) {
      console.warn(`[crawler] failed ${url}: ${e.message}`);
    }
  }
  return results;
}

function approxChars(s) {
  return String(s).length;
}