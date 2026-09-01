import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bool = (v, d = false) => (v == null ? d : String(v).toLowerCase() === "true");

// Parse an integer env var with a safe fallback and a finite check. A bad
// value (NaN) fails fast rather than silently breaking downstream code.
const int = (v, d, { min = -Infinity, max = Infinity } = {}) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n < min || n > max) {
    throw new Error(`Invalid numeric config: expected ${v} to be an integer in [${min}, ${max}]`);
  }
  return Math.max(min, Math.min(max, n));
};

const float = (v, d, { min = -Infinity, max = Infinity } = {}) => {
  const n = parseFloat(v);
  if (Number.isNaN(n) || n < min || n > max) {
    throw new Error(`Invalid numeric config: expected ${v} to be numeric within [${min}, ${max}]`);
  }
  return Math.max(min, Math.min(max, n));
};

export const isProd = process.env.NODE_ENV === "production";

export const config = {
  port: int(process.env.PORT || "4000", 4000, { min: 1, max: 65535 }),

  openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
  groqApiKey: process.env.GROQ_API_KEY || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "openai/gpt-4.1",
  groqModel: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
  llmTemperature: float(process.env.LLM_TEMPERATURE || "0.3", 0.3, { min: 0, max: 2 }),
  llmMaxTokens: int(process.env.LLM_MAX_TOKENS || "1024", 1024, { min: 1 }),
  embeddingModel: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-large",
  groqEmbeddingModel: process.env.GROQ_EMBEDDING_MODEL || "nomic-embed-text-v1.5",
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2",
  embeddingDimensions: int(process.env.EMBEDDING_DIMENSIONS || "1024", 1024, { min: 1 }),

  // Provider precedence for CHAT: Gemini (free, high quality) > Groq (free) >
  // OpenRouter. Embeddings: Gemini when available, else OpenRouter with free
  // hash fallback when its credits are exhausted.
  provider: process.env.GEMINI_API_KEY
    ? "gemini"
    : process.env.GROQ_API_KEY
      ? "groq"
      : "openrouter",
  hasLlm: !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY),

  topK: int(process.env.TOP_K || "5", 5, { min: 1, max: 50 }),
  maxContextChars: int(process.env.MAX_CONTEXT_CHARS || "16000", 16000, { min: 0 }),

  // confidence gate — when the top retrieval score is below this cosine
  // threshold we mark the answer as uncertain and tell the LLM not to guess.
  minConfidence: float(process.env.MIN_CONFIDENCE || "0.45", 0.45, { min: 0, max: 1 }),
  useConfidenceGate: bool(process.env.CONFIDENCE_GATE, !bool(process.env.MOCK, false)),
  // overall budget for one chat turn before the SSE stream is aborted
  chatTimeoutMs: int(process.env.CHAT_TIMEOUT_MS || "90000", 90000, { min: 1000 }),
  // per-IP chat requests allowed in a 15-minute rolling window
  chatRateMax: int(process.env.CHAT_RATE_MAX || "30", 30, { min: 1 }),

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

  adminToken: process.env.ADMIN_TOKEN || "",
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
  trustProxy:
    process.env.TRUST_PROXY == null ? 1 : int(process.env.TRUST_PROXY, 1, { min: 0, max: 10 })
};

// ---------- startup validation ----------
// Fail loudly on an insecure or incomplete production configuration instead of
// silently serving with weak defaults.

function warn(msg) {
  console.warn(`[config] ${msg}`);
}

// 1. Never fall back to the literal "change-me-to-a-secret" admin token.
if (!config.adminToken) {
  warn("ADMIN_TOKEN is not set; legacy x-admin-token header auth is disabled. Use the username/password sign-in.");
}

// 2. Admin panel must have a (non-default) password.
if (config.adminPass === "change-me") {
  throw new Error("ADMIN_PASS is still the insecure default 'change-me'. Set a real password in backend/.env.");
}
if (!config.adminPass) {
  if (!config.mock) {
    warn("ADMIN_PASS is not set; the admin panel will reject all sign-ins. Set it in backend/.env.");
  }
} else if (!config.mock && config.adminPass.length < 6) {
  warn("ADMIN_PASS is very short (<6 chars). Use a longer password in production.");
}

// 3. In production, require an explicit CORS origin (no wildcard) and an API key.
if (isProd) {
  // Never allow MOCK mode in production: it bypasses admin auth entirely
  // (auth.js and the admin login both short-circuit on config.mock).
  if (config.mock) {
    throw new Error("MOCK=true cannot be used in production — it disables admin authentication.");
  }
  if (!config.corsOrigin.length || (config.corsOrigin.length === 1 && config.corsOrigin[0] === "*")) {
    throw new Error("CORS_ORIGIN must be an explicit origin list in production (no '*').");
  }
  if (!config.hasLlm) {
    throw new Error("An LLM provider key is required in production (set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY).");
  }
}
