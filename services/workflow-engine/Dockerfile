# ── Stage 1: install & generate ───────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/workflow-engine/ ./services/workflow-engine/
RUN npm ci --workspace=@pms/workflow-engine --include-workspace-root
RUN npx prisma generate --schema=./services/workflow-engine/prisma/schema.prisma && \
    npm prune --omit=dev

# ── Stage 2: lean runtime image ────────────────────────────────────────────
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app ./

USER appuser
WORKDIR /app/services/workflow-engine
EXPOSE 4006
CMD ["node", "index.js"]
