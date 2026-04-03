# ── Stage 1: install & generate ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/file-services/ ./services/file-services/
RUN npm ci --workspace=@pms/file-service --include-workspace-root
RUN npx prisma generate --schema=./services/file-services/prisma/schema.prisma && \
    npm prune --omit=dev

# ── Stage 2: lean runtime image ────────────────────────────────────────────
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app ./

USER appuser
WORKDIR /app/services/file-services
EXPOSE 4008
CMD ["node", "index.js"]
