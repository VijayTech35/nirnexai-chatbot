import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bool = (v, d = false) => (v == null ? d : String(v).toLowerCase() === "true");

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),

  openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "openai/gpt-4.1",
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || "0.3"),
  llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || "700", 10),
  embeddingModel: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-large",
  embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || "1024", 10),

  topK: parseInt(process.env.TOP_K || "5", 10),
  maxContextChars: parseInt(process.env.MAX_CONTEXT_CHARS || "16000", 10),

  // confidence gate — when the top retrieval score is below this cosine
  // threshold we mark the answer as uncertain and tell the LLM not to guess.
  minConfidence: parseFloat(process.env.MIN_CONFIDENCE || "0.45"),
  useConfidenceGate: bool(process.env.CONFIDENCE_GATE, !bool(process.env.MOCK, false)),
  // overall budget for one chat turn before the SSE stream is aborted
  chatTimeoutMs: parseInt(process.env.CHAT_TIMEOUT_MS || "90000", 10),
  // per-IP chat requests allowed in a 15-minute rolling window
  chatRateMax: parseInt(process.env.CHAT_RATE_MAX || "30", 10),

  vectorStore: (process.env.VECTOR_STORE || "memory").toLowerCase(),
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || "",
    index: process.env.PINECONE_INDEX || "",
    environment: process.env.PINECONE_ENVIRONMENT || ""
  },

  siteRoot: process.env.SITE_ROOT || "https://nirnexai.com",
  scrapeUrls: (process.env.SCRAPE_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  autoIndex: bool(process.env.AUTO_INDEX, true),
  // on boot, re-embed only index entries whose content hash changed vs. the
  // persisted store (drift refresh). Never re-embeds unchanged docs.
  autoIndexRefresh: bool(process.env.AUTO_INDEX_REFRESH, true),
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY || "",

  useSeedKb: bool(process.env.USE_SEED_KB, true),
  mock: bool(process.env.MOCK, false),

  adminToken: process.env.ADMIN_TOKEN || "change-me-to-a-secret",
  adminUser: process.env.ADMIN_USER || "admin",
  adminPass: process.env.ADMIN_PASS || "",
  dataDir: path.resolve(__dirname, "..", process.env.DATA_DIR || "./data"),

  // CORS: comma-separated allow-list of origins. Semicolon-safe when empty.
  corsOrigin: (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Express "trust proxy" value. "1" = trust the first X-Forwarded-For hop
  // (the Caddy/nginx reverse proxy). 0 disables (direct exposure).
  trustProxy: process.env.TRUST_PROXY == null ? 1 : parseInt(process.env.TRUST_PROXY, 10)
};