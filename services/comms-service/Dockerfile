# ── Stage 1: install & generate ───────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --workspace=@pms/comms-service --include-workspace-root

COPY shared/ ./shared/
COPY services/comms-service/ ./services/comms-service/
RUN npx prisma generate --schema=./services/comms-service/prisma/schema.prisma && \
    npm prune --omit=dev

# ── Stage 2: lean runtime image ────────────────────────────────────────────
FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder --chown=appuser:appgroup /app ./

USER appuser
WORKDIR /app/services/comms-service
EXPOSE 4007
CMD ["node", "index.js"]
