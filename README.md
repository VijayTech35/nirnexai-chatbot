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
- Admin panel: `http://localhost:3002/admin` (sign in with `ADMIN_USER` / `ADMIN_PASS`)

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
| `GET /api/analytics/summary` | session cookie | Top questions, fallbacks, feedback |
| `GET /api/admin/status` | session cookie | Store size, models, mock flag |
| `POST /api/admin/reindex` | session cookie | Rebuild index (seed KB + crawl) `{ clear?, urls? }` |
| `POST /api/admin/warmup` | session cookie | Ensure index exists |
| `POST /api/admin/login` | — | Username/password → HttpOnly session cookie |
| `POST /api/admin/logout` | session cookie | Destroy the session |
| `GET /api/admin/session` | — | Is there a valid session? |
| `GET /api/admin/docs` | session cookie | List uploaded documents |
| `POST /api/admin/upload` | session cookie | Ingest an uploaded file |
| `DELETE /api/admin/docs/:id` | session cookie | Remove an uploaded document |

> Admin endpoints accept the session cookie **or** the legacy `x-admin-token`
> header (`ADMIN_TOKEN`) as a fallback.

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
| `ADMIN_USER` | `admin` | Admin console username (sign-in cookie) |
| `ADMIN_PASS` | — | Admin console password (sign-in cookie) |
| `DATA_DIR` | `./data` | `vectors.json` + `analytics.jsonl` |
| `CORS_ORIGIN` | `*` | Comma-separated browser origins allowed (must be explicit for cookies) |

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

## Deployment

### Docker (recommended)

The stack ships with `docker-compose.yml` + `backend/Dockerfile` +
`frontend/Dockerfile` + `deploy/Caddyfile`. Caddy acts as a single reverse
proxy: the browser only talks to Caddy, which routes `/api/*` + `/health*` to
the backend and everything else to the Next.js frontend. API calls are
same-origin, so CORS is minimized and the admin session cookie flows cleanly.

```bash
# 1. Configure secrets (real values, not the examples)
cp backend/.env.example backend/.env        # OPENROUTER_API_KEY, ADMIN_USER, ADMIN_PASS
cp deploy/compose.env.example .env          # CADDY_DOMAIN (empty = plain HTTP :80)

# 2. Build + start
docker compose up -d --build
docker compose ps                            # all three: healthy

# 3. Visit
#   http://<server>/            (chat UI)
#   http://<server>/admin       (admin console)
```

Set `CADDY_DOMAIN=chat.yourdomain.com` (and `CADDY_EMAIL`) in `.env` and
rebuild to get automatic HTTPS via Let's Encrypt:

```bash
docker compose up -d --build --force-recreate caddy
```

Notes:

- Backend runs as a non-root user with a `/health` Docker healthcheck; only its
  internal ports are exposed on the `nirnex` bridge network. The persistent
  vector store / conversations live in the `backend-data` volume.
- The frontend uses Next.js `output: "standalone"` for a small runtime image.
- For scale: change `VECTOR_STORE=pinecone` in `backend/.env` and supply the
  Pinecone credentials. Admin sessions and rate-limits are currently in-memory
  (single-instance); move to Redis before running multiple backend replicas.

### Manual / without Docker

- **Vector store**: start with `memory`; move to Pinecone for scale
  (`VECTOR_STORE=pinecone` + `PINECONE_API_KEY` / `PINECONE_INDEX`, via `.env`).
- **Crawling**: built-in fetch+regex works for Next.js SSR pages; set
  `FIRECRAWL_API_KEY` for heavy JS sites. FAQ accordions that render client-side
  are absent from static HTML — don't invent those answers.
- **Frontend**: `frontend` uses `output: "standalone"`; run the production build
  with `node .next/standalone/server.js`. Any Next.js page must call the backend
  over HTTPS for production.
- Put `nginx`, `caddy`, or a load balancer in front serving TLS.

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