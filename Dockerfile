# ---------- stage 1: backend deps ----------
FROM node:22-slim AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ---------- stage 2: frontend deps + build ----------
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- stage 3: runtime (single origin) ----------
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app

# backend
COPY --from=backend-deps /app/backend/node_modules /app/backend/node_modules
COPY backend/package.json /app/backend/package.json
COPY backend/src /app/backend/src
# legacy seed KB (loaded by backend/src/knowledge/site.js)
COPY legacy /app/legacy

# frontend standalone runtime
COPY --from=frontend-build /app/frontend/.next/standalone /app/frontend/.next/standalone
COPY --from=frontend-build /app/frontend/.next/static /app/frontend/.next/standalone/.next/static

# supervisor
COPY render-server.js /app/render-server.js

# writable data dir (conversations, analytics, vectors)
RUN mkdir -p /app/backend/data && chmod -R 777 /app/backend/data
WORKDIR /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Render sets PORT; supervisor runs backend on the internal port that the
# Next rewrites are baked to (127.0.0.1:4000).
CMD ["node", "render-server.js"]
