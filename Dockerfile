# ── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace manifest + API package manifests for deterministic cache
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/

RUN npm ci --workspace @healthsphere/api --workspace @healthsphere/contracts --ignore-scripts

# Copy source
COPY apps/api ./apps/api
COPY packages/contracts ./packages/contracts

# ── Stage 2: production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
LABEL org.opencontainers.image.source="https://github.com/mahak867/health1"
LABEL org.opencontainers.image.description="HealthSphere API"

# Least-privilege runtime user
RUN addgroup -S healthsphere && adduser -S healthsphere -G healthsphere

WORKDIR /app

# Copy only the production node_modules + sources from the builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/contracts ./packages/contracts
COPY --from=builder /app/package.json ./package.json

USER healthsphere

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/healthz || exit 1

CMD ["node", "apps/api/src/server.js"]
