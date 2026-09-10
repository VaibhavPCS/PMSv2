# Next.js 15 (App Router) — standalone runtime. Build context = repo root.
# ── Stage 1: build ─────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/ ./shared/
COPY services/frontend/ ./services/frontend/
RUN npm ci --workspace=frontend --include-workspace-root

# NEXT_PUBLIC_* are inlined at build time; override at build with --build-arg.
ARG NEXT_PUBLIC_API_URL=https://dev.pms.upda.co.in
ARG NEXT_PUBLIC_API_BASE_URL=https://dev.pms.upda.co.in
ARG NEXT_PUBLIC_AUTH_URL=https://dev.pms.upda.co.in
ARG NEXT_PUBLIC_SOCKET_URL=https://dev.pms.upda.co.in
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/services/frontend
RUN npm run build

# ── Stage 2: runtime ───────────────────────────────────────────────────────
FROM node:20-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
WORKDIR /app
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Standalone server + static assets + public dir.
COPY --from=builder --chown=appuser:appgroup /app/services/frontend/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/services/frontend/.next/static ./services/frontend/.next/static
COPY --from=builder --chown=appuser:appgroup /app/services/frontend/public ./services/frontend/public

USER appuser
EXPOSE 3000
CMD ["node", "services/frontend/server.js"]
