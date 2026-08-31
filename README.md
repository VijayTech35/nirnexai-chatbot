# NirnexAI Chatbot — RAG Stack

Production knowledge-base chatbot for [nirnexai.com](https://nirnexai.com).

Three layers share one knowledge base (`knowledge-base.js`, 54 curated Q&A entries):

| Layer | What it is | When it answers |
| --- | --- | --- |
| `dist/nirnex-chatbot.js` | Zero-dependency browser widget (KB + CSS bundled) | Instant KB hits, intents, multi-turn, lead routing — works offline |
| `backend/` | Express + OpenRouter RAG server (crawler, embeddings, vector store, streaming chat, analytics, admin) | Questions the KB can't answer stream from here with source citations |
| `frontend/` | Next.js chat UI + admin panel consuming the backend | Production chat experience / ops |

## Quick start

### 1. Backend

```powershell
cd backend
Copy-Item .env.example .env   # then edit .env
npm install
npm run dev                   # -> http://localhost:4000
```

Minimum config in `backend/.env`:

```
OPENROUTER_API_KEY=sk-or-...   # required for real AI answers
ADMIN_TOKEN=change-me          # protects /api/admin/*
MOCK=true                      # dev without a key (streams canned answers, hashed embeddings)
AUTO_INDEX=true                # crawl SCRAPE_URLS + seed KB on first boot
```

Start with `MOCK=true` to try it without spending anything:

```powershell
npm run dev
# http://localhost:4000/health
```

### 2. Frontend (optional UI + admin)

```powershell
cd frontend
Copy-Item .env.local.example .env.local   # NEXT_PUBLIC_API_URL defaults to http://localhost:4000
npm install
npm run dev -p 3002
```

- Chat UI: `http://localhost:3002/`
- Admin panel: `http://localhost:3002/admin` (paste `ADMIN_TOKEN`, then Load → reindex, analytics, status)

### 3. Widget embed (drop-in for any site)

```html
<script>
  window.NirnexChatbotConfig = {
    apiEndpoint: "https://your-backend.example.com",   // optional LLM/RAG layer
    analyticsEndpoint: "https://your-backend.example.com/api/analytics"
  };
</script>
<script src="dist/nirnex-chatbot.js"></script>
```

The widget still answers purely from the KB when no backend is configured. With
`apiEndpoint`, KB misses **stream** from the backend with clickable source citations.

## API

| Method + route | Auth | Description |
| --- | --- | --- |
| `GET /health` | — | Liveness + mock flag |
| `POST /api/chat` | — | Streaming SSE chat. Body `{ messages, sessionId }`. Events: `meta`, `delta`, `citations`, `done`, `error` |
| `POST /api/analytics` | — | Beacon `{ type, q, ... }` → `data/analytics.jsonl` |
| `GET /api/analytics/summary` | `x-admin-token` | Top questions, fallbacks, feedback |
| `GET /api/admin/status` | `x-admin-token` | Store size, models, mock flag |
| `POST /api/admin/reindex` | `x-admin-token` | Rebuild index (seed KB + crawl) `{ clear?, urls? }` |
| `POST /api/admin/warmup` | `x-admin-token` | Ensure index exists |

## Configuration (`backend/.env`)

| Var | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `OPENROUTER_API_KEY` | — | OpenRouter key; chat 503s without it unless `MOCK=true` |
| `LLM_MODEL` | `openai/gpt-4.1` | Any OpenRouter model id |
| `LLM_TEMPERATURE` | `0.3` | Sampling temperature — keep low for grounded answers |
| `LLM_MAX_TOKENS` | `700` | Cap per chat answer (also bounds credit usage) |
| `EMBEDDING_MODEL` | `openai/text-embedding-3-large` | OpenRouter `/embeddings` |
| `EMBEDDING_DIMENSIONS` | `1024` | Matches the model's output size |
| `TOP_K` | `5` | Retrieved chunks per query |
| `VECTOR_STORE` | `memory` | `memory` (JSON file) or `pinecone` |
| `SCRAPE_URLS` | nirnexai.com pages | Comma-separated URLs to crawl |
| `AUTO_INDEX` | `true` | Crawl + embed on first boot |
| `FIRECRAWL_API_KEY` | — | Use Firecrawl for JS-rendered pages |
| `USE_SEED_KB` | `true` | Seed the store from `knowledge-base.js` |
| `MOCK` | `false` | Hash embeddings + canned streamed answers |
| `ADMIN_TOKEN` | — | Bearer-style header `x-admin-token` |
| `DATA_DIR` | `./data` | `vectors.json` + `analytics.jsonl` |
| `CORS_ORIGIN` | `*` | |

## How retrieval works

1. On boot, the server embeds the 54 seed KB entries and (optionally) crawls
   `SCRAPE_URLS`, chunks each page (~1,400 chars), embeds and upserts — all into
   `data/vectors.json` (MemoryStore) or Pinecone.
2. `POST /api/chat` embeds the user's question (OpenRouter `/embeddings`, or a
   deterministic hash in mock mode) and returns the `topK` nearest chunks.
3. The system prompt instructs the model to **answer only from those chunks and
   cite each source**; the reply streams back over SSE with `event: citations`.
4. The bot still honors the hard rules: no invented facts, injection guard,
   out-of-scope reply, and buy-intent → `https://cal.com/nirnexai` /
   `info@nirnexai.com`.

## Deployment notes

- **Vector store**: start with `memory`; move to Pinecone for scale
  (`VECTOR_STORE=pinecone` + `PINECONE_API_KEY` / `PINECONE_INDEX`, via `.env`).
- **Crawling**: built-in fetch+regex works for Next.js SSR pages; set
  `FIRECRAWL_API_KEY` for heavy JS sites. FAQ accordions that render client-side
  are absent from static HTML — don't invent those answers.
- **Frontend**: `frontend` uses `output: "standalone"`; run the production build
  with `node .next/standalone/server.js`. Any Next.js page must call the backend
  over HTTPS for production.
- **Widget**: `build.ps1` regenerates the one-file `dist/nirnex-chatbot.js`.

## Tests

```powershell
cd backend
node test_sse.js     # SSE parser unit tests (8)
node e2e_chat.js     # streamChat client -> live mock backend (5)
node ..\backend\smoke_ui.js   # widget streaming path, headless DOM stub
```

## Notes

- `knowledge-base.js` doubles as a browser script (`window.NIRNEX_KB`) and a
  CommonJS module for Node/seed indexing.
- Retarget `SCRAPE_URLS` and the site constants (`https://cal.com/nirnexai` demo
  link, `info@nirnexai.com`, contact page) per site.