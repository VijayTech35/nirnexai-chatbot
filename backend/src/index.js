import express from "express";
import cors from "cors";
import fs from "fs";
import { config } from "./config.js";
import chatRouter from "./routes/chat.js";
import analyticsRouter from "./routes/analytics.js";
import adminRouter from "./routes/admin.js";
import { ensureIndexed, storeSize } from "./services/rag.js";
import { loadKb } from "./knowledge/site.js";

// Ensure the KB is registered in this process.
loadKb();

const app = express();
// Trust the X-Forwarded-For header (set by the Caddy/nginx reverse proxy) so
// per-IP rate limiting and logging see the real client IP, not the proxy.
app.set("trust proxy", config.trustProxy);
const corsOrigin = config.corsOrigin;
const corsOpts =
  corsOrigin.length === 1 && corsOrigin[0] === "*"
    ? { origin: true }
    : { origin: corsOrigin, credentials: true };
app.use(cors(corsOpts));
app.use(express.json({ limit: "1mb" }));

// Security headers (lightweight helmet-equivalent).
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  if (config.mock) res.setHeader("X-Server-Env", "mock");
  next();
});

// ---------- simple request log (2 entries for the admin surface) ----------
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nirnexai-backend", mock: config.mock, time: new Date().toISOString() });
});

app.use("/api/chat", chatRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/admin", adminRouter);

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: "not found" }));
app.use((err, _req, res, _next) => {
  // Log the full detail server-side, but never leak internals to the client.
  console.error("[server] error:", err.message, err.stack || "");
  res.status(err.status || 500).json({ error: "Internal server error" });
});

// ---------- boot ----------
fs.mkdirSync(config.dataDir, { recursive: true });

const server = app.listen(config.port, () => {
  console.log(`\n[server] NirnexAI backend listening on http://localhost:${config.port}`);
  console.log(`[server] mock: ${config.mock} | provider: ${config.provider} | LLM: ${config.provider === "groq" ? config.groqModel : config.llmModel}`);
  console.log(`[server] embeddings: ${config.provider === "groq" ? config.groqEmbeddingModel : config.embeddingModel} | vector store: ${config.vectorStore}`);
  if (!config.mock && !config.hasLlm) {
    console.warn("[server] WARNING: no LLM provider key. Chat will 503 until you add GROQ_API_KEY or OPENROUTER_API_KEY (or set MOCK=true).");
  }
});

const boot = (async () => {
  try {
    await ensureIndexed();
    console.log(`[index] ready — ${await storeSize()} documents in the vector store`);
  } catch (e) {
    console.warn("[index] startup indexing skipped:", e.message);
  }
})();

async function shutdown() {
  console.log("\n[server] shutting down...");
  server.close();
  await boot.catch(() => {});
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);