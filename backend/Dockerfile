# ---------- stage 1: deps ----------
FROM node:22-alpine AS deps
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ---------- stage 2: runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Run as a non-root user for security
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/backend/node_modules /app/backend/node_modules
COPY --chown=app:app backend/package.json /app/backend/package.json
COPY --chown=app:app backend/src /app/backend/src
COPY --chown=app:app backend/.env.example /app/backend/.env.example
# Bundle the curated seed KB (loaded by src/knowledge/site.js).
COPY --chown=app:app legacy /app/legacy

# Runtime data dir (vector store, conversations, analytics, uploads)
RUN mkdir -p /app/backend/data && chown -R app:app /app/backend/data
VOLUME /app/backend/data

USER app

WORKDIR /app/backend

EXPOSE 4000

# Node is guaranteed present; use it (not wget) for the health probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
