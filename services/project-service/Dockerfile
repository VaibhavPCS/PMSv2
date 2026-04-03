# ── Stage 1: install & generate ───────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/project-service/ ./services/project-service/
RUN npm ci --workspace=@pms/project-service --include-workspace-root
RUN npx prisma generate --schema=./services/project-service/prisma/schema.prisma && \
    npm prune --omit=dev

# ── Stage 2: lean runtime image ────────────────────────────────────────────
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder --chown=appuser:appgroup /app ./

USER appuser
WORKDIR /app/services/project-service
EXPOSE 4003
CMD ["node", "index.js"]
