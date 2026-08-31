# ---------- stage 1: deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---------- stage 2: runtime ----------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Run as a non-root user for security
RUN addgroup -S app && adduser -S app -G app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app src ./src
COPY --chown=app:app .env.example ./

# Runtime data dir (vector store, conversations, analytics, uploads)
RUN mkdir -p /app/data && chown -R app:app /app/data
VOLUME /app/data

USER app

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1

CMD ["node", "src/index.js"]
